import { describe, expect, it, vi } from "vitest";

import type { Manifest } from "../types/contract";
import { themeCatalog } from "../test/manifestFixture";
import {
  clearPreferences,
  defaultPreferences,
  loadPreferences,
  preferenceKey,
  savePreferences,
} from "./preferences";

const meta: Manifest["meta"] = {
  version: "2.0",
  app_name: "Test Console",
  theme: "galaxy",
  theme_catalog: themeCatalog,
  alert_condition: "normal",
  lang: "en-US",
  sound_enabled: true,
  force_uppercase: true,
  label_uppercase: true,
  lcars_font_headers: true,
  lcars_font_labels: true,
  lcars_font_text: false,
  key_bindings: [],
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
      keyBindings: {},
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
          keyBindings: { "graph.copy": "mod+shift+c", stale: 42 },
        }),
      ),
    };

    expect(loadPreferences(meta, storage)).toEqual({
      theme: "nemesis",
      soundEnabled: false,
      motion: "system",
      uppercase: false,
      lcarsFontText: true,
      keyBindings: { "graph.copy": "mod+shift+c" },
    });
    expect(storage.getItem).toHaveBeenCalledWith(preferenceKey("Test Console"));
  });

  it("accepts catalogued custom themes and repairs a deleted saved theme", () => {
    const customMeta: Manifest["meta"] = {
      ...meta,
      theme_catalog: [
        ...themeCatalog,
        { id: "bridge-night", label: "Bridge Night", base: "nemesis", colors: {}, fonts: {} },
      ],
    };
    expect(loadPreferences(customMeta, {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ theme: "bridge-night" })),
    }).theme).toBe("bridge-night");

    const setItem = vi.fn();
    const preferences = loadPreferences(meta, {
      getItem: vi.fn().mockReturnValue(JSON.stringify({ theme: "deleted-theme" })),
      setItem,
    });
    expect(preferences.theme).toBe("galaxy");
    expect(JSON.parse(setItem.mock.calls[0][1] as string)).toMatchObject({ theme: "galaxy" });
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
