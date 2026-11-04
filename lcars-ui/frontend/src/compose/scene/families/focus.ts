import { hBand, scenePath } from "../geometry";
import { readingOrder } from "../slots";
import type { FamilyInput, FamilyResult, Terminal } from "../types";
import { fitRegion, regionKind } from "./common";

/** Place the first focal region beneath a band of navigation terminals. */
export function focus(input: FamilyInput): FamilyResult {
  const { slots, regions, field, tokens, measurer } = input;
  const focal = slots.focal[0];
  if (!focal || !regions.has(focal)) return { ok: false, reason: "Missing focal region" };
  const entries: { id: string; label: string; kind: "folded-region" | "return" }[] = readingOrder(
    slots,
  )
    .filter((id) => id !== focal)
    .map((id) => ({ id, label: regions.get(id)?.label ?? id, kind: "folded-region" as const }));
  if (input.hasReturn) entries.push({ id: "return", label: "RETURN", kind: "return" });
  const terminals: Terminal[] = [];
  let x = tokens.gap;
  let y = tokens.gap;
  const height = Math.max(tokens.target, tokens.terminalH);
  for (const entry of entries) {
    const width = Math.max(tokens.target, entry.label.length * 9 + 24);
    if (width + 2 * tokens.gap > field.w)
      return { ok: false, reason: `Terminal ${entry.label} does not fit` };
    if (x + width + tokens.gap > field.w) {
      x = tokens.gap;
      y += height + tokens.gap;
    }
    terminals.push({
      id: `focus-${entry.id}`,
      label: entry.label,
      kind: entry.kind,
      ...(entry.kind === "folded-region" ? { regionId: entry.id } : {}),
      rect: { x, y, w: width, h: height },
    });
    x += width + tokens.gap;
  }
  const bandHeight = y + height + tokens.gap;
  const rect = {
    x: tokens.gap,
    y: bandHeight + tokens.gap,
    w: field.w - 2 * tokens.gap,
    h: field.h - bandHeight - 2 * tokens.gap,
  };
  const fit = fitRegion(focal, rect, measurer, tokens, regions.get(focal)?.role);
  if (!fit.ok) return fit;
  const band = hBand(0, 0, field.w, bandHeight);
  return {
    ok: true,
    candidate: {
      family: "focus",
      orientation: field.w >= field.h ? "landscape" : "portrait",
      placements: [
        {
          regionId: focal,
          rect,
          visibility: "full",
          scroll: regionKind(regions.get(focal)?.role) === "growing",
        },
      ],
      paths: [scenePath("focus-band", "band", band.d, "frame", band.bbox)],
      terminals,
    },
  };
}
