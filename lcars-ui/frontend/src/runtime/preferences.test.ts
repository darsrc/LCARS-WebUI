import { describe, expect, it, vi } from "vitest";

import type { Manifest } from "../types/contract";
import {
  clearPreferences,
  defaultPreferences,
  loadPreferences,
  preferenceKey,
  savePreferences,
} from "./preferences";

const meta: Manifest["meta"] = {
  version: "1.0",
  app_name: "Test Console",
  theme: "galaxy",
  alert_condition: "normal",
  lang: "en-US",
  sound_enabled: true,
  force_uppercase: true,
  label_uppercase: true,
  lcars_font_headers: true,
  lcars_font_labels: true,
  lcars_font_text: false,
  visual_language: "strict",
  strict_renderer: "legacy",
};

describe("WebUI preferences", () => {
  it("derives browser defaults from manifest metadata", () => {
    expect(defaultPreferences(meta)).toEqual({
      theme: "galaxy",
      soundEnabled: true,
      motion: "system",
      uppercase: true,
      lcarsFontText: false,
    });
  });

  it("loads valid fields while rejecting stale values independently", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(
        JSON.stringify({
          theme: "nemesis",
          soundEnabled: false,
          motion: "warp-speed",
          uppercase: false,
          lcarsFontText: true,
        }),
      ),
    };

    expect(loadPreferences(meta, storage)).toEqual({
      theme: "nemesis",
      soundEnabled: false,
      motion: "system",
      uppercase: false,
      lcarsFontText: true,
    });
    expect(storage.getItem).toHaveBeenCalledWith(preferenceKey("Test Console"));
  });

  it("saves and clears the app-scoped record", () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    const preferences = defaultPreferences(meta);

    savePreferences(meta.app_name, preferences, { setItem });
    clearPreferences(meta.app_name, { removeItem });

    expect(setItem).toHaveBeenCalledWith(
      preferenceKey(meta.app_name),
      JSON.stringify(preferences),
    );
    expect(removeItem).toHaveBeenCalledWith(preferenceKey(meta.app_name));
  });
});
