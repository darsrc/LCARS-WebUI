import { bridge, elbow, hBand, junction, scenePath, vBand } from "../geometry";
import type { FamilyInput, FamilyResult, Terminal } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";

/** Arrange two focal regions around a shared origin and comparison bridge. */
export function fork(input: FamilyInput): FamilyResult {
  const { field, tokens, regions, measurer } = input;
  if (input.slots.focal.length !== 2)
    return { ok: false, reason: "Fork requires two focal regions" };
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const [first, second] = slots.focal;
    if (!regions.has(first) || !regions.has(second))
      return { ok: false, reason: "Missing focal region" };
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
    let terminalY = gap;
    const terminalHeight = Math.max(tokens.target, tokens.terminalH);
    const originWidth = Math.max(
      tokens.regionMinW,
      ...entries.map((entry) => entry.label.length * 9 + 24),
    );
    if (originWidth > field.w - 2 * gap) return { ok: false, reason: "Terminals do not fit" };
    for (const entry of entries) {
      terminals.push({
        id: `fork-${entry.id}`,
        label: entry.label,
        kind: entry.kind,
        ...(entry.kind === "folded-region" ? { regionId: entry.id } : {}),
        rect: { x: gap, y: terminalY, w: originWidth, h: terminalHeight },
      });
      terminalY += terminalHeight + gap;
    }
    const originIds = [...slots.commands, ...slots.alerts, ...slots.details, ...slots.context];
    const originHeight = originIds.reduce(
      (sum, id) =>
        sum +
        (regionKind(roles.get(id)) === "growing"
          ? tokens.regionMinH
          : measurer.height(id, originWidth)) +
        gap,
      0,
    );
    const originRect = {
      x: gap,
      y: terminalY,
      w: originWidth,
      h: portrait ? originHeight : field.h - terminalY - gap,
    };
    const origin = stackVertically(originIds, originRect, measurer, tokens, roles);
    if (!origin.ok) return origin;
    const divider = portrait ? terminalY + originHeight : gap + originWidth + gap;
    const bodyX = portrait ? gap : divider + band + gap;
    const bodyY = portrait ? divider + band + gap : band + gap;
    const bodyWidth = field.w - bodyX - gap;
    const bodyHeight = field.h - bodyY - gap;
    const gutter = 2 * gap + band;
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
    const separator = portrait
      ? hBand(0, divider, field.w, band)
      : vBand(divider, 0, field.h, band);
    const topBand = hBand(divider, 0, field.w - divider - gap, band);
    const firstElbow = elbow(
      { x: firstRect.x, y: 0, w: Math.max(2 * band, firstRect.w / 2), h: band + gap },
      "top-left",
      band,
      band,
      tokens.elbowOuter,
      tokens.elbowOuter - band,
    );
    const secondElbow = elbow(
      { x: secondRect.x, y: 0, w: Math.max(2 * band, secondRect.w / 2), h: band + gap },
      "top-left",
      band,
      band,
      tokens.elbowOuter,
      tokens.elbowOuter - band,
    );
    const joint = portrait
      ? junction(gap, divider, band, ["right", "down"])
      : junction(divider, gap, band, ["up", "down", "right"]);
    const connection = portrait
      ? vBand(bodyX + bodyWidth / 2 - band / 2, firstRect.y + firstRect.h, gutter, band)
      : bridge(firstRect, secondRect, band);
    const comparison = slots.relations.find(
      (relation) =>
        relation.kind === "compares" &&
        ((relation.source === first && relation.target === second) ||
          (relation.source === second && relation.target === first)),
    );
    return {
      ok: true,
      candidate: {
        family: "fork",
        orientation: portrait ? "portrait" : "landscape",
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
        paths: [
          scenePath("fork-origin", "band", separator.d, "frame", separator.bbox),
          scenePath("fork-junction", "junction", joint.d, "frame", joint.bbox),
          ...(!portrait
            ? [
                scenePath("fork-top", "band", topBand.d, "frame", topBand.bbox),
                scenePath("fork-elbow-a", "elbow", firstElbow.d, "frame", firstElbow.bbox),
                scenePath("fork-elbow-b", "elbow", secondElbow.d, "frame", secondElbow.bbox),
              ]
            : []),
          scenePath(
            "fork-bridge",
            "bridge",
            connection.d,
            "relation",
            connection.bbox,
            comparison?.id,
          ),
        ],
        terminals,
      },
    };
  });
}
