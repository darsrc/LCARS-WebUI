import { elbow, hBand, scenePath, vBand } from "../geometry";
import type { FamilyInput, FamilyResult, Placement, Rect, ScenePath, Terminal } from "../types";
import { fitRegion, regionKind, stackVertically, withFoldedOptionals } from "./common";

/** Wrap a single focal region with commands and supporting regions. */
export function wrap(input: FamilyInput): FamilyResult {
  const { field, tokens, regions, measurer } = input;
  if (input.slots.focal.length !== 1)
    return { ok: false, reason: "Wrap requires one focal region" };
  return withFoldedOptionals(input.slots, (slots, foldedIds) => {
    const focal = slots.focal[0];
    if (!focal || !regions.has(focal)) return { ok: false, reason: "Missing focal region" };
    const portrait = field.w < field.h;
    const gap = tokens.gap;
    const band = tokens.band;
    const roles = new Map([...regions].map(([id, region]) => [id, region.role]));
    const terminals: Terminal[] = [];
    const terminalEntries = [
      { id: "context", label: input.modeLabel, kind: "context" as const },
      ...foldedIds.map((id) => ({
        id,
        label: regions.get(id)?.label ?? id,
        kind: "folded-region" as const,
      })),
    ];
    const terminalHeight = Math.max(tokens.target, tokens.terminalH);
    const columnWidth = Math.max(
      tokens.regionMinW,
      ...terminalEntries.map((entry) => entry.label.length * 9 + 24),
    );
    const columnIds = [...slots.commands, ...slots.alerts];
    const rowIds = [...slots.details, ...slots.context];
    const placements: Placement[] = [];
    const paths: ScenePath[] = [];
    let focalRect: Rect;
    if (!portrait) {
      let y = gap;
      for (const entry of terminalEntries) {
        terminals.push({
          id: `wrap-${entry.id}`,
          label: entry.label,
          kind: entry.kind,
          ...(entry.kind === "folded-region" ? { regionId: entry.id } : {}),
          rect: { x: gap, y, w: columnWidth, h: terminalHeight },
        });
        y += terminalHeight + gap;
      }
      const column = stackVertically(
        columnIds,
        { x: gap, y, w: columnWidth, h: field.h - y - gap },
        measurer,
        tokens,
        roles,
      );
      if (!column.ok) return column;
      placements.push(...column.placements);
      const bandX = columnWidth + 2 * gap;
      const rightX = bandX + band + gap;
      const rightWidth = field.w - rightX - gap;
      const rowWidth = (rightWidth - Math.max(0, rowIds.length - 1) * gap) / (rowIds.length || 1);
      const rowHeight = rowIds.length
        ? Math.max(
            ...rowIds.map((id) =>
              regionKind(roles.get(id)) === "growing"
                ? tokens.regionMinH
                : measurer.height(id, rowWidth),
            ),
          )
        : 0;
      const bandY = field.h - gap - rowHeight - (rowIds.length ? gap + band : 0);
      focalRect = { x: rightX, y: gap, w: rightWidth, h: bandY - gap - (rowIds.length ? gap : 0) };
      for (const [index, id] of rowIds.entries()) {
        const rect = {
          x: rightX + index * (rowWidth + gap),
          y: bandY + band + gap,
          w: rowWidth,
          h: rowHeight,
        };
        const fit = fitRegion(id, rect, measurer, tokens, roles.get(id));
        if (!fit.ok) return fit;
        placements.push({
          regionId: id,
          rect,
          visibility: "full",
          scroll: regionKind(roles.get(id)) === "growing",
        });
      }
      const vertical = vBand(bandX, 0, bandY + (rowIds.length ? band : 0), band);
      paths.push(scenePath("wrap-vertical", "band", vertical.d, "frame", vertical.bbox));
      if (rowIds.length) {
        const horizontal = hBand(bandX + band, bandY, field.w - bandX - band, band);
        paths.push(scenePath("wrap-horizontal", "band", horizontal.d, "frame", horizontal.bbox));
        const corner = elbow(
          { x: bandX, y: bandY, w: band, h: band },
          "bottom-left",
          band,
          band,
          tokens.elbowOuter,
          tokens.elbowOuter - band,
        );
        paths.push(scenePath("wrap-elbow", "elbow", corner.d, "frame", corner.bbox));
      }
    } else {
      const topWidth = field.w - 2 * gap;
      let y = gap;
      for (const entry of terminalEntries) {
        const width = Math.max(tokens.target, entry.label.length * 9 + 24);
        if (width > topWidth) return { ok: false, reason: `Terminal ${entry.label} does not fit` };
        terminals.push({
          id: `wrap-${entry.id}`,
          label: entry.label,
          kind: entry.kind,
          ...(entry.kind === "folded-region" ? { regionId: entry.id } : {}),
          rect: { x: gap, y, w: width, h: terminalHeight },
        });
        y += terminalHeight + gap;
      }
      const topHeight = columnIds.reduce(
        (sum, id) =>
          sum +
          (regionKind(roles.get(id)) === "growing"
            ? tokens.regionMinH
            : measurer.height(id, topWidth)) +
          gap,
        0,
      );
      const top = stackVertically(
        columnIds,
        { x: gap, y, w: topWidth, h: topHeight },
        measurer,
        tokens,
        roles,
      );
      if (!top.ok) return top;
      placements.push(...top.placements);
      const bandY = y + topHeight;
      const bodyY = bandY + band + gap;
      const bodyHeight = field.h - bodyY - gap;
      const sideWidth = rowIds.length ? tokens.regionMinW : 0;
      const bandX = field.w - gap - sideWidth - (rowIds.length ? gap + band : 0);
      focalRect = { x: gap, y: bodyY, w: bandX - gap - (rowIds.length ? gap : 0), h: bodyHeight };
      const side = stackVertically(
        rowIds,
        { x: bandX + band + gap, y: bodyY, w: sideWidth, h: bodyHeight },
        measurer,
        tokens,
        roles,
      );
      if (!side.ok) return side;
      placements.push(...side.placements);
      const horizontal = hBand(0, bandY, field.w, band);
      paths.push(scenePath("wrap-horizontal", "band", horizontal.d, "frame", horizontal.bbox));
      if (rowIds.length) {
        const vertical = vBand(bandX, bandY + band, field.h - bandY - band, band);
        paths.push(scenePath("wrap-vertical", "band", vertical.d, "frame", vertical.bbox));
        const corner = elbow(
          { x: bandX, y: bandY, w: band, h: band },
          "top-right",
          band,
          band,
          tokens.elbowOuter,
          tokens.elbowOuter - band,
        );
        paths.push(scenePath("wrap-elbow", "elbow", corner.d, "frame", corner.bbox));
      }
    }
    const fit = fitRegion(focal, focalRect, measurer, tokens, roles.get(focal));
    if (!fit.ok) return fit;
    placements.unshift({
      regionId: focal,
      rect: focalRect,
      visibility: "full",
      scroll: regionKind(roles.get(focal)) === "growing",
    });
    return {
      ok: true,
      candidate: {
        family: "wrap",
        orientation: portrait ? "portrait" : "landscape",
        placements,
        paths,
        terminals,
      },
    };
  });
}
