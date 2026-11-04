import type { SceneWidget } from "../../types/contract";

/** Promote pinned optional regions to required regions in every scene mode. */
export function applyPins(scene: SceneWidget, pins: ReadonlySet<string>): SceneWidget {
  let changed = false;
  const modes = scene.modes.map((mode) => {
    const promoted = mode.optional?.filter((regionId) => pins.has(regionId)) ?? [];
    if (promoted.length === 0) return mode;
    changed = true;
    return {
      ...mode,
      required: [
        ...mode.required,
        ...promoted.filter((regionId) => !mode.required.includes(regionId)),
      ],
      optional: mode.optional?.filter((regionId) => !pins.has(regionId)),
    };
  });
  return changed ? { ...scene, modes } : scene;
}
