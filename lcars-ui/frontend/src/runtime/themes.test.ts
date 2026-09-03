import { describe, expect, it } from "vitest";

import { isManifest, type Manifest, type ThemeDefinition } from "../types/contract";
import { manifestFixture, themeCatalog } from "../test/manifestFixture";
import { resolveThemeDefinition, themeRootStyle } from "./themes";

const customTheme: ThemeDefinition = {
  id: "bridge-night",
  label: "Bridge Night",
  base: "nemesis",
  colors: {
    field: "#010203",
    surface: "#111213",
    frame: "#212223",
    orange: "#313233",
    on_color: "#414243",
  },
  fonts: {
    interface: "Operator Sans, sans-serif",
    display: "Operator Display, sans-serif",
    mono: "Operator Mono, monospace",
  },
};

const meta: Manifest["meta"] = {
  version: "2.0",
  app_name: "Theme Test",
  theme: "galaxy",
  theme_catalog: [...themeCatalog, customTheme],
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

describe("manifest themes", () => {
  it("resolves the requested custom definition and its built-in base", () => {
    expect(resolveThemeDefinition(meta, "bridge-night")).toBe(customTheme);
    expect(resolveThemeDefinition(meta, "missing").id).toBe("galaxy");
  });

  it("maps safe overrides to theme inputs without overriding alert-state roles", () => {
    expect(themeRootStyle(customTheme)).toMatchObject({
      "--theme-field": "#010203",
      "--theme-surface": "#111213",
      "--theme-surface-deep": "#111213",
      "--theme-role-frame": "#212223",
      "--okuda-orange": "#313233",
      "--theme-ink-dark": "#414243",
      "--theme-font-interface": "Operator Sans, sans-serif",
      "--theme-font-display": "Operator Display, sans-serif",
      "--theme-font-mono": "Operator Mono, monospace",
    });
    expect(themeRootStyle(customTheme)).not.toHaveProperty("--role-frame");
  });

  it("ignores unknown override keys defensively", () => {
    const malformed = {
      ...customTheme,
      colors: { ...customTheme.colors, unexpected: "#ffffff" },
      fonts: { ...customTheme.fonts, unexpected: "serif" },
    } as ThemeDefinition;
    expect(() => themeRootStyle(malformed)).not.toThrow();
    expect(themeRootStyle(malformed)).not.toHaveProperty("undefined");
  });

  it("rejects catalog entries wider than the typed theme contract", () => {
    const withTheme = (definition: unknown): unknown => ({
      ...manifestFixture,
      meta: {
        ...manifestFixture.meta,
        theme_catalog: [...themeCatalog, definition],
      },
    });

    expect(isManifest(withTheme({
      ...customTheme,
      colors: { unexpected: "#ffffff" },
    }))).toBe(false);
    expect(isManifest(withTheme({
      ...customTheme,
      colors: { frame: "red" },
    }))).toBe(false);
    expect(isManifest(withTheme({
      ...customTheme,
      base: "unknown",
    }))).toBe(false);
    expect(isManifest(withTheme({
      ...customTheme,
      css: "body { display: none }",
    }))).toBe(false);
  });
});
