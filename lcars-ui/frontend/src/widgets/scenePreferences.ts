export interface ScenePreferences {
  pins: string[];
  stable: boolean;
}

/** Load a scene's saved layout preferences, falling back safely on invalid storage. */
export function loadScenePreferences(sceneId: string): ScenePreferences {
  try {
    const storedPins = localStorage.getItem(`lcars.scene.${sceneId}.pins`);
    const pins: unknown = storedPins === null ? [] : JSON.parse(storedPins);
    const stable = localStorage.getItem(`lcars.scene.${sceneId}.stable`) === "1";
    if (!Array.isArray(pins) || !pins.every((pin) => typeof pin === "string")) {
      return { pins: [], stable: false };
    }
    return { pins, stable };
  } catch {
    return { pins: [], stable: false };
  }
}

/** Save a scene's layout preferences when browser storage is available. */
export function saveScenePreferences(sceneId: string, preferences: ScenePreferences): void {
  try {
    const pinsKey = `lcars.scene.${sceneId}.pins`;
    const stableKey = `lcars.scene.${sceneId}.stable`;
    if (preferences.pins.length) localStorage.setItem(pinsKey, JSON.stringify(preferences.pins));
    else localStorage.removeItem(pinsKey);
    if (preferences.stable) localStorage.setItem(stableKey, "1");
    else localStorage.removeItem(stableKey);
  } catch {
    // Storage may be unavailable or disabled.
  }
}
