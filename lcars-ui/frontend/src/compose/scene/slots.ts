import type { SceneRelation, SceneWidget } from "../../types/contract";

export interface Slots {
  focal: string[];
  commands: string[];
  details: string[];
  alerts: string[];
  context: string[];
  optional: Set<string>;
  foldable: Set<string>;
  relations: SceneRelation[];
}

/** Return region ids in semantic reading order. */
export function readingOrder(slots: Slots): string[] {
  return [...slots.focal, ...slots.alerts, ...slots.commands, ...slots.details, ...slots.context];
}

/** Derive the region slots and in-mode relations for a scene mode. */
export function deriveSlots(scene: SceneWidget, modeId: string): Slots {
  const mode = scene.modes.find((item) => item.id === modeId);
  if (!mode) throw new Error(`Unknown scene mode: ${modeId}`);

  const regionIds = [...new Set([...mode.focal, ...mode.required, ...(mode.optional ?? [])])];
  const includedRegionIds = new Set(regionIds);
  const optional = new Set(
    (mode.optional ?? []).filter((id) => !mode.required.includes(id) && !mode.focal.includes(id)),
  );
  const relations = (scene.relations ?? []).filter(
    (relation) => includedRegionIds.has(relation.source) && includedRegionIds.has(relation.target),
  );
  const slots: Slots = {
    focal: [],
    commands: [],
    details: [],
    alerts: [],
    context: [],
    optional,
    foldable: new Set(),
    relations,
  };

  for (const regionId of regionIds) {
    const region = scene.regions.find((item) => item.id === regionId);
    if (optional.has(regionId) && region?.fold !== "never") slots.foldable.add(regionId);
    if (mode.focal.includes(regionId)) {
      slots.focal.push(regionId);
      continue;
    }

    const explicitSlot = region?.slot;
    if (
      explicitSlot &&
      ["focal", "commands", "details", "alerts", "context"].includes(explicitSlot)
    ) {
      slots[explicitSlot as "focal" | "commands" | "details" | "alerts" | "context"].push(regionId);
      continue;
    }

    const relation = relations.find(
      (item) =>
        item.source === regionId &&
        mode.focal.includes(item.target) &&
        ["controls", "details", "recovers"].includes(item.kind),
    );
    const slot =
      relation?.kind === "controls"
        ? "commands"
        : relation?.kind === "details"
          ? "details"
          : relation?.kind === "recovers"
            ? "alerts"
            : "context";
    slots[slot].push(regionId);
  }

  return slots;
}
