import { afterEach, describe, expect, it, vi } from "vitest";
import { loadScenePreferences, saveScenePreferences } from "./scenePreferences";
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("scene preferences", () => {
  it("saves, loads, and clears preferences", () => {
    saveScenePreferences("survey", { pins: ["notes"], stable: true });
    expect(loadScenePreferences("survey")).toEqual({ pins: ["notes"], stable: true });
    saveScenePreferences("survey", { pins: [], stable: false });
    expect(localStorage.getItem("lcars.scene.survey.pins")).toBeNull();
    expect(localStorage.getItem("lcars.scene.survey.stable")).toBeNull();
  });
  it("returns defaults for malformed storage", () => {
    localStorage.setItem("lcars.scene.survey.pins", "{");
    expect(loadScenePreferences("survey")).toEqual({ pins: [], stable: false });
    localStorage.setItem("lcars.scene.survey.pins", "[1]");
    expect(loadScenePreferences("survey")).toEqual({ pins: [], stable: false });
  });
  it("handles throwing storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(loadScenePreferences("survey")).toEqual({ pins: [], stable: false });
    expect(() => saveScenePreferences("survey", { pins: ["notes"], stable: true })).not.toThrow();
  });
});
