import { connectorPath } from "../../../widgets/surfaceGeometry";
import { elbow, hBand, junction, scenePath, vBand } from "../geometry";
import type { FamilyInput, FamilyResult, Placement, Terminal } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";

/** Place a non-alert focal on the spine and other focals in the branch column. */
export function branch(input: FamilyInput): FamilyResult {
  const { field, tokens, regions, measurer } = input;
  if (!input.slots.focal.length) return { ok: false, reason: "Branch requires a focal region" };
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const focal =
      slots.focal.find((id) => !slots.alerts.includes(id) && regions.get(id)?.role !== "alert") ??
      slots.focal[0];
    if (!regions.has(focal)) return { ok: false, reason: "Missing focal region" };
    const portrait = field.w < field.h;
    const gap = tokens.gap;
    const band = tokens.band;
    const roles = new Map([...regions].map(([id, region]) => [id, region.role]));
    const entries = [
      { id: "context", label: input.modeLabel, kind: "context" as const },
      ...foldedIds.map((id) => ({
        id,
        label: regions.get(id)?.label ?? id,
        kind: "folded-region" as const,
      })),
    ];
    const terminals: Terminal[] = [];
    let terminalX = gap;
    const terminalHeight = Math.max(tokens.target, tokens.terminalH);
    for (const entry of entries) {
      const width = Math.max(tokens.target, entry.label.length * 9 + 24);
      if (terminalX + width > field.w - gap) return { ok: false, reason: "Terminals do not fit" };
      terminals.push({
        id: `branch-${entry.id}`,
        label: entry.label,
        kind: entry.kind,
        ...(entry.kind === "folded-region" ? { regionId: entry.id } : {}),
        rect: { x: terminalX, y: gap, w: width, h: terminalHeight },
      });
      terminalX += width + gap;
    }
    const spineY = gap + terminalHeight + gap;
    const bodyY = spineY + band + gap;
    const bodyHeight = field.h - bodyY - gap;
    const branchIds = [
      ...new Set([
        ...slots.alerts,
        ...slots.focal.filter((id) => id !== focal && regions.get(id)?.role === "alert"),
        ...slots.focal.filter((id) => id !== focal),
      ]),
      ...slots.details,
      ...slots.context,
    ];
    const paths = [];
    const placements: Placement[] = [];
    const spine = portrait
      ? vBand(0, spineY, field.h - spineY, band)
      : hBand(0, spineY, field.w, band);
    paths.push(scenePath("branch-spine", "band", spine.d, "frame", spine.bbox));
    for (const ratio of [0.62, 0.55, 0.7]) {
      const availableWidth = field.w - 4 * gap - band;
      const focalWidth = portrait ? field.w - band - 2 * gap : availableWidth * ratio;
      const branchWidth = portrait ? focalWidth : availableWidth - focalWidth;
      const dividerX = gap + focalWidth + gap;
      const focalHeight = portrait ? (bodyHeight - band - 2 * gap) * ratio : bodyHeight;
      // Commands sit above the focal under the left spine, preserving its full split width.
      const commandWidth = focalWidth;
      const commandHeight = slots.commands.reduce((sum, id) => {
        const height =
          regionKind(roles.get(id)) === "growing"
            ? tokens.regionMinH
            : measurer.height(id, commandWidth);
        return sum + height + gap;
      }, 0);
      const focalRect = {
        x: portrait ? band + gap : gap,
        y: bodyY + commandHeight,
        w: focalWidth,
        h: focalHeight - commandHeight,
      };
      const commandStack = stackVertically(
        slots.commands,
        { x: focalRect.x, y: bodyY, w: commandWidth, h: commandHeight },
        measurer,
        tokens,
        roles,
      );
      if (!commandStack.ok) continue;
      const branchRect = portrait
        ? {
            x: band + gap,
            y: bodyY + focalHeight + gap + band + gap,
            w: branchWidth,
            h: bodyHeight - focalHeight - band - 2 * gap,
          }
        : { x: dividerX + band + gap, y: bodyY, w: branchWidth, h: bodyHeight };
      const focalFit = fitRegion(focal, focalRect, measurer, tokens, roles.get(focal));
      if (!focalFit.ok) continue;
      const branchStack = stackVertically(branchIds, branchRect, measurer, tokens, roles);
      if (!branchStack.ok) continue;
      placements.push(
        {
          regionId: focal,
          rect: focalRect,
          visibility: "full",
          scroll: regionKind(roles.get(focal)) === "growing",
        },
        ...commandStack.placements,
        ...branchStack.placements,
      );
      if (portrait) {
        const dividerY = bodyY + focalHeight + gap;
        const divider = hBand(band, dividerY, field.w - band, band);
        paths.push(scenePath("branch-divider", "band", divider.d, "frame", divider.bbox));
        const joint = junction(0, dividerY, band, ["up", "down", "right"]);
        paths.push(scenePath("branch-junction", "junction", joint.d, "frame", joint.bbox));
      } else {
        const elbowHeight = Math.min(tokens.elbowOuter, bodyHeight + band + gap);
        const bend = elbow(
          { x: dividerX - band, y: spineY, w: 2 * band, h: elbowHeight },
          "top-right",
          band,
          band,
          tokens.elbowOuter,
          tokens.elbowOuter - band,
        );
        paths.push(scenePath("branch-elbow", "elbow", bend.d, "frame", bend.bbox));
        const divider = vBand(
          dividerX,
          spineY + elbowHeight,
          field.h - spineY - elbowHeight - gap,
          band,
        );
        paths.push(scenePath("branch-divider", "band", divider.d, "frame", divider.bbox));
        const joint = junction(dividerX, spineY, band, ["left", "right", "down"]);
        paths.push(scenePath("branch-junction", "junction", joint.d, "frame", joint.bbox));
      }
      for (const relation of slots.relations.filter((item) => item.kind === "recovers")) {
        const source = placements.find((placement) => placement.regionId === relation.source);
        const target = placements.find((placement) => placement.regionId === relation.target);
        if (!source || !target || portrait) continue;
        const sourceIsLeft = source.rect.x < target.rect.x;
        const fromX = sourceIsLeft ? source.rect.x + source.rect.w : source.rect.x;
        const toX = sourceIsLeft ? target.rect.x : target.rect.x + target.rect.w;
        const fromY = source.rect.y + source.rect.h / 2;
        const toY = Math.max(target.rect.y, Math.min(fromY, target.rect.y + target.rect.h));
        const connector = connectorPath(fromX, fromY, toX, toY, "elbow");
        paths.push(
          scenePath(
            "branch-alert-" + relation.source,
            "connector",
            connector,
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
        candidate: {
          family: "branch",
          orientation: portrait ? "portrait" : "landscape",
          placements,
          paths,
          terminals,
        },
      };
    }
    return { ok: false, reason: "Branch regions do not fit within the split range" };
  });
}
