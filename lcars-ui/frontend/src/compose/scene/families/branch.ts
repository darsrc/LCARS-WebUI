import { connectorPath } from "../../../widgets/surfaceGeometry";
import { elbow, hBand, junction, scenePath, vBand } from "../geometry";
import type { FamilyInput, FamilyResult } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";
import { buildFrame, frameTerminals } from "./frame";

/** Split the frame aperture into a focal column and an anchored supporting branch. */
export function branch(input: FamilyInput): FamilyResult {
  const { field, tokens, regions, measurer } = input;
  if (!input.slots.focal.length) return { ok: false, reason: "Branch requires a focal region" };
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const focal =
      slots.focal.find((id) => !slots.alerts.includes(id) && regions.get(id)?.role !== "alert") ??
      slots.focal[0];
    if (!regions.has(focal)) return { ok: false, reason: "Missing focal region" };
    const portrait = field.w < field.h;
    const orientation = portrait ? "portrait" : "landscape";
    const frame = buildFrame({
      field,
      tokens,
      orientation,
      terminals: frameTerminals(input, foldedIds),
      armRun: { from: 0, to: (portrait ? field.h : field.w) - tokens.gap },
    });
    if (!frame.fits) return { ok: false, reason: "Frame terminals do not fit" };
    const area = frame.contentArea;
    const gap = tokens.gap;
    const band = tokens.band;
    const roles = new Map([...regions].map(([id, region]) => [id, region.role]));
    const branchIds = [
      ...new Set([
        ...slots.alerts,
        ...slots.focal.filter((id) => id !== focal),
        ...slots.details,
        ...slots.context,
      ]),
    ];
    for (const ratio of [0.62, 0.55, 0.7]) {
      const availableWidth = area.w - band - 2 * gap;
      const focalWidth = portrait ? area.w : availableWidth * ratio;
      const focalHeight = portrait ? (area.h - band - 2 * gap) * ratio : area.h;
      const commandHeight = slots.commands.reduce(
        (sum, id) =>
          sum +
          gap +
          (regionKind(roles.get(id)) === "growing"
            ? tokens.regionMinH
            : measurer.height(id, focalWidth)),
        0,
      );
      const focalRect = {
        x: area.x,
        y: area.y + commandHeight,
        w: focalWidth,
        h: focalHeight - commandHeight,
      };
      const commands = stackVertically(
        slots.commands,
        { x: area.x, y: area.y, w: focalWidth, h: commandHeight },
        measurer,
        tokens,
        roles,
      );
      if (!commands.ok) continue;
      const branchRect = portrait
        ? {
            x: area.x,
            y: area.y + focalHeight + band + 2 * gap,
            w: area.w,
            h: area.h - focalHeight - band - 2 * gap,
          }
        : {
            x: area.x + focalWidth + band + 2 * gap,
            y: area.y,
            w: availableWidth - focalWidth,
            h: area.h,
          };
      const fit = fitRegion(focal, focalRect, measurer, tokens, roles.get(focal));
      if (!fit.ok) continue;
      const stack = stackVertically(branchIds, branchRect, measurer, tokens, roles);
      if (!stack.ok) continue;
      const placements = [
        {
          regionId: focal,
          rect: focalRect,
          visibility: "full" as const,
          scroll: regionKind(roles.get(focal)) === "growing",
        },
        ...commands.placements,
        ...stack.placements,
      ];
      const paths = [...frame.paths];
      const dividerX = portrait ? 0 : area.x + focalWidth + gap;
      const dividerY = portrait ? area.y + focalHeight + gap : 0;
      const joint = junction(
        dividerX,
        dividerY,
        band,
        portrait ? ["up", "down", "right"] : ["left", "right", "down"],
      );
      paths.push(scenePath("branch-junction", "junction", joint.d, "frame", joint.bbox));
      const corner = elbow(
        portrait
          ? { x: 0, y: dividerY, w: 2 * band, h: 2 * band }
          : { x: dividerX - band, y: 0, w: 2 * band, h: 2 * band },
        portrait ? "top-left" : "top-right",
        band,
        band,
        tokens.elbowOuter,
        tokens.elbowOuter - band,
      );
      paths.push(scenePath("branch-elbow", "elbow", corner.d, "frame", corner.bbox));
      const divider = portrait
        ? hBand(2 * band, dividerY, field.w - gap - 2 * band, band, "end")
        : vBand(dividerX, 2 * band, field.h - gap - 2 * band, band, "end");
      paths.push(scenePath("branch-divider", "band", divider.d, "frame", divider.bbox));
      for (const relation of slots.relations.filter((item) => item.kind === "recovers")) {
        const source = placements.find((placement) => placement.regionId === relation.source);
        const target = placements.find((placement) => placement.regionId === relation.target);
        if (!source || !target) continue;
        const fromX = portrait ? source.rect.x + source.rect.w / 2 : source.rect.x;
        const fromY = portrait ? source.rect.y : source.rect.y + source.rect.h / 2;
        const toX = portrait ? target.rect.x + target.rect.w / 2 : target.rect.x + target.rect.w;
        const toY = portrait
          ? target.rect.y + target.rect.h
          : Math.max(target.rect.y, Math.min(fromY, target.rect.y + target.rect.h));
        paths.push(
          scenePath(
            `branch-alert-${relation.source}`,
            "connector",
            connectorPath(fromX, fromY, toX, toY, "elbow"),
            "alert",
            {
              x: Math.min(fromX, toX),
              y: Math.min(fromY, toY),
              w: Math.abs(fromX - toX),
              h: Math.abs(fromY - toY),
            },
            relation.id,
          ),
        );
      }
      return {
        ok: true,
        candidate: { family: "branch", orientation, placements, paths, terminals: frame.terminals },
      };
    }
    return { ok: false, reason: "Branch regions do not fit within the split range" };
  });
}
