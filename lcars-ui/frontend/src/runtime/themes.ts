import type { CSSProperties } from "react";

import type { Manifest, ThemeColors, ThemeDefinition, ThemeFonts } from "../types/contract";

const COLOR_VARIABLES: Record<keyof ThemeColors, readonly `--${string}`[]> = {
  field: ["--theme-field"],
  surface: ["--theme-surface", "--theme-surface-deep"],
  surface_alt: ["--theme-surface-alt"],
  label: ["--theme-ink-label"],
  value: ["--theme-ink-value"],
  light: ["--theme-ink-light"],
  on_color: ["--theme-ink-dark"],
  frame: ["--theme-role-frame"],
  rail_a: ["--theme-role-rail-a"],
  rail_b: ["--theme-role-rail-b"],
  rail_c: ["--theme-role-rail-c"],
  rail_d: ["--theme-role-rail-d"],
  rail_e: ["--theme-role-rail-e"],
  rail_f: ["--theme-role-rail-f"],
  control: ["--theme-role-control"],
  readout: ["--theme-role-readout"],
  band: ["--theme-role-band"],
  alert: ["--theme-role-alert"],
  orange: ["--okuda-orange"],
  golden: ["--okuda-golden"],
  canary: ["--okuda-canary"],
  sunflower: ["--okuda-sunflower"],
  blue: ["--okuda-blue"],
  mariner: ["--okuda-mariner"],
  lilac: ["--okuda-lilac"],
  hopbush: ["--okuda-hopbush"],
  red: ["--okuda-red"],
  ice: ["--okuda-ice"],
  white: ["--okuda-white"],
};

const FONT_VARIABLES: Record<keyof ThemeFonts, `--${string}`> = {
  interface: "--theme-font-interface",
  display: "--theme-font-display",
  mono: "--theme-font-mono",
};

export type ThemeRootStyle = CSSProperties & Record<`--${string}`, string | undefined>;

export const availableThemeIds = (meta: Manifest["meta"]): Set<string> =>
  new Set(meta.theme_catalog.map((definition) => definition.id));

export const resolveThemeDefinition = (
  meta: Manifest["meta"],
  requested: string,
): ThemeDefinition => {
  return meta.theme_catalog.find((definition) => definition.id === requested)
    ?? meta.theme_catalog.find((definition) => definition.id === meta.theme)
    ?? meta.theme_catalog[0];
};

export const themeRootStyle = (definition: ThemeDefinition): ThemeRootStyle => {
  const style = {} as ThemeRootStyle;
  for (const [key, value] of Object.entries(definition.colors)) {
    const variables = COLOR_VARIABLES[key as keyof ThemeColors];
    if (typeof value === "string" && variables) {
      for (const variable of variables) {
        style[variable] = value;
      }
    }
  }
  for (const [key, value] of Object.entries(definition.fonts)) {
    const variable = FONT_VARIABLES[key as keyof ThemeFonts];
    if (typeof value === "string" && variable) {
      style[variable] = value;
    }
  }
  return style;
};
