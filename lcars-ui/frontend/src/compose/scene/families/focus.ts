import { readingOrder } from "../slots";
import type { FamilyInput, FamilyResult } from "../types";
import { fitRegion, regionKind } from "./common";
import { buildFrame, frameTerminals } from "./frame";

/** Fill the frame aperture with the first focal and fold all supporting regions. */
export function focus(input: FamilyInput): FamilyResult {
  const { slots, regions, field, tokens, measurer } = input;
  const focal = slots.focal[0];
  if (!focal || !regions.has(focal)) return { ok: false, reason: "Missing focal region" };
  const orientation = input.orientation ?? (field.w >= field.h ? "landscape" : "portrait");
  const frame = buildFrame({
    field,
    tokens,
    orientation,
    terminals: frameTerminals(
      input,
      readingOrder(slots).filter((id) => id !== focal),
    ),
    armRun: { from: 0, to: (orientation === "portrait" ? field.h : field.w) - tokens.gap },
  });
  if (!frame.fits) return { ok: false, reason: "Frame terminals do not fit" };
  const fit = fitRegion(focal, frame.contentArea, measurer, tokens, regions.get(focal)?.role);
  if (!fit.ok) return fit;
  return {
    ok: true,
    candidate: {
      family: "focus",
      orientation,
      placements: [
        {
          regionId: focal,
          rect: frame.contentArea,
          visibility: "full",
          scroll: regionKind(regions.get(focal)?.role) === "growing",
        },
      ],
      paths: frame.paths,
      terminals: frame.terminals,
    },
  };
}
