import { bridge, elbow, hBand, junction, scenePath, vBand } from "../geometry";
import type { FamilyInput, FamilyResult } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";
import { buildFrame, frameTerminals } from "./frame";

/** Hang two focal subjects from the frame and join their edges with a labelled bridge. */
export function fork(input: FamilyInput): FamilyResult {
  const { field, tokens, regions, measurer } = input;
  if (input.slots.focal.length !== 2)
    return { ok: false, reason: "Fork requires two focal regions" };
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const [first, second] = slots.focal;
    if (!regions.has(first) || !regions.has(second))
      return { ok: false, reason: "Missing focal region" };
    const orientation = input.orientation ?? (field.w < field.h ? "portrait" : "landscape");
    const portrait = orientation === "portrait";
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
    const originIds = [...slots.commands, ...slots.alerts, ...slots.details, ...slots.context];
    const originWidth = portrait ? area.w : tokens.regionMinW;
    const originHeight = originIds.reduce(
      (sum, id) =>
        sum +
        gap +
        (regionKind(roles.get(id)) === "growing"
          ? tokens.regionMinH
          : measurer.height(id, originWidth)),
      0,
    );
    const origin = stackVertically(
      originIds,
      { x: area.x, y: area.y, w: originWidth, h: portrait ? originHeight : area.h },
      measurer,
      tokens,
      roles,
    );
    if (!origin.ok) return origin;
    const bodyX = portrait || !originIds.length ? area.x : area.x + originWidth + gap;
    const bodyY = portrait ? area.y + originHeight : area.y;
    const bodyWidth = area.x + area.w - bodyX;
    const bodyHeight = area.y + area.h - bodyY;
    const gutter = Math.max(96, 2 * gap + band);
    const firstRect = portrait
      ? { x: bodyX, y: bodyY, w: bodyWidth, h: (bodyHeight - gutter) / 2 }
      : { x: bodyX, y: bodyY, w: (bodyWidth - gutter) / 2, h: bodyHeight };
    const secondRect = portrait
      ? { ...firstRect, y: bodyY + firstRect.h + gutter }
      : { ...firstRect, x: bodyX + firstRect.w + gutter };
    for (const [id, rect] of [
      [first, firstRect],
      [second, secondRect],
    ] as const) {
      const fit = fitRegion(id, rect, measurer, tokens, roles.get(id));
      if (!fit.ok) return fit;
    }
    const paths = [...frame.paths];
    const joint = junction(
      portrait ? 0 : bodyX + firstRect.w / 2,
      portrait ? bodyY : 0,
      band,
      portrait ? ["up", "down", "right"] : ["left", "right", "down"],
    );
    paths.push(scenePath("fork-junction", "junction", joint.d, "frame", joint.bbox));
    for (const [index, rect] of [firstRect, secondRect].entries()) {
      const corner = elbow(
        portrait
          ? { x: 0, y: rect.y, w: 2 * band, h: 2 * band }
          : { x: rect.x, y: 0, w: Math.max(2 * band, rect.w / 2), h: rect.y },
        "top-left",
        band,
        band,
        tokens.elbowOuter,
        tokens.elbowOuter - band,
      );
      paths.push(scenePath(`fork-elbow-${index}`, "elbow", corner.d, "frame", corner.bbox));
      if (portrait) {
        const landing = hBand(2 * band, rect.y, area.x - 2 * band, band);
        paths.push(scenePath(`fork-landing-${index}`, "band", landing.d, "frame", landing.bbox));
      }
    }
    const comparison = slots.relations.find(
      (relation) =>
        relation.kind === "compares" &&
        ((relation.source === first && relation.target === second) ||
          (relation.source === second && relation.target === first)),
    );
    const connection = portrait
      ? vBand(bodyX + bodyWidth / 2 - band / 2, firstRect.y + firstRect.h, gutter, band)
      : bridge(firstRect, secondRect, band);
    paths.push(
      scenePath("fork-bridge", "bridge", connection.d, "relation", connection.bbox, comparison?.id),
    );
    const labelRect = portrait
      ? {
          x: bodyX + bodyWidth / 2 - 48,
          y: firstRect.y + firstRect.h + (gutter - tokens.target) / 2,
          w: 96,
          h: tokens.target,
        }
      : {
          x: firstRect.x + firstRect.w + (gutter - 96) / 2,
          y: firstRect.y + firstRect.h / 2 - tokens.target / 2,
          w: 96,
          h: tokens.target,
        };
    return {
      ok: true,
      candidate: {
        family: "fork",
        orientation,
        placements: [
          {
            regionId: first,
            rect: firstRect,
            visibility: "full",
            scroll: regionKind(roles.get(first)) === "growing",
          },
          {
            regionId: second,
            rect: secondRect,
            visibility: "full",
            scroll: regionKind(roles.get(second)) === "growing",
          },
          ...origin.placements,
        ],
        paths,
        terminals: [
          ...frame.terminals,
          {
            id: "fork-bridge-label",
            label: comparison?.label ?? "COMPARE",
            kind: "bridge-label",
            rect: labelRect,
          },
        ],
      },
    };
  });
}
