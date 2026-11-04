import type { SceneWidget } from "../../types/contract";
import { branch } from "./families/branch";
import { contour } from "./families/contour";
import { focus } from "./families/focus";
import { fork } from "./families/fork";
import { wrap } from "./families/wrap";
import { deriveSlots, readingOrder } from "./slots";
import {
  DEFAULT_SCENE_TOKENS,
  type Family,
  type FamilyInput,
  type FamilyResult,
  type Field,
  type Measurer,
  type ResolvedScene,
  type SceneTokens,
} from "./types";

const familyFunctions: Record<Family, (input: FamilyInput) => FamilyResult> = {
  wrap,
  branch,
  fork,
  contour,
  focus,
};

/** Choose a feasible family while preserving a feasible previous layout in the same mode. */
export function chooseLayout(
  scene: SceneWidget,
  modeId: string,
  field: Field,
  measurer: Measurer,
  tokens: SceneTokens = DEFAULT_SCENE_TOKENS,
  previous?: ResolvedScene,
): ResolvedScene | null {
  const mode = scene.modes.find((item) => item.id === modeId);
  if (!mode) throw new Error(`Unknown scene mode: ${modeId}`);
  const families = [...(mode.families ?? ["wrap", "branch", "focus"])];
  if (!families.includes("focus")) families.push("focus");
  const slots = deriveSlots(scene, modeId);
  const input: FamilyInput = {
    slots,
    regions: new Map(scene.regions.map((region) => [region.id, region])),
    field,
    measurer,
    tokens,
    modeLabel: mode.label,
    hasReturn: !!mode.returns_to,
  };
  const results = new Map<string, FamilyResult>();
  for (const family of families) {
    const build = familyFunctions[family as Family];
    results.set(family, build ? build(input) : { ok: false, reason: "Unknown family" });
  }
  if (previous?.modeId === modeId && !results.has(previous.family)) {
    results.set(previous.family, familyFunctions[previous.family](input));
  }
  const previousResult = previous?.modeId === modeId ? results.get(previous.family) : undefined;
  const selected = previousResult?.ok
    ? previousResult
    : families.map((family) => results.get(family)).find((result) => result?.ok);
  if (!selected?.ok) return null;
  const foldedLabels = selected.candidate.terminals
    .filter((terminal) => terminal.kind === "folded-region")
    .map((terminal) => terminal.label);
  const rejected = [...results.entries()]
    .filter((entry): entry is [string, { ok: false; reason: string }] => !entry[1].ok)
    .map(([family, result]) => `${family}: ${result.reason}`);
  const explanation = [
    `${selected.candidate.family} (${selected.candidate.orientation}): mode ${mode.label}`,
    ...(foldedLabels.length ? [`folded ${foldedLabels.join(", ")}`] : []),
    ...rejected.map((reason) => `rejected ${reason}`),
  ].join("; ");
  return {
    ...selected.candidate,
    revision: (previous?.revision ?? 0) + 1,
    modeId,
    field,
    order: readingOrder(slots),
    explanation,
  };
}
