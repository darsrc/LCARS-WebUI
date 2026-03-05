import type { LcarsColor, ManifestTheme } from "../types/contract";

/**
 * WHY: charts/SVG styles do not consume CSS classes directly, so components need a
 * shared utility to resolve manifest shorthand colors to CSS token references.
 */
export const DEFAULT_LCARS_COLOR: LcarsColor = "orange";

export const resolveColorName = (color?: LcarsColor | null): LcarsColor => {
  return color ?? DEFAULT_LCARS_COLOR;
};

export const resolveColorToken = (color?: LcarsColor | null): string => {
  return `var(--lcars-color-${resolveColorName(color)})`;
};

export const resolveAccentClass = (color?: LcarsColor | null): string => {
  return `lcars-accent-${resolveColorName(color)}`;
};

export const isTheme = (value: string): value is ManifestTheme => {
  return value === "galaxy" || value === "nemesis" || value === "tng";
};

/**
 * Useful for tests/docs where raw hex output is required.
 */
export const THEME_COLOR_HEX: Record<ManifestTheme, Record<LcarsColor, string>> = {
  galaxy: {
    orange: "#FF9900",
    red: "#CC6666",
    blue: "#3366CC",
    purple: "#CC6699",
    white: "#99CCFF",
    yellow: "#FF9966",
  },
  tng: {
    orange: "#FF9933",
    red: "#664466",
    blue: "#CC99CC",
    purple: "#CC99CC",
    white: "#FFFF99",
    yellow: "#FFCC66",
  },
  nemesis: {
    orange: "#BBAA55",
    red: "#BB4411",
    blue: "#3366FF",
    purple: "#000088",
    white: "#5599FF",
    yellow: "#BBAA55",
  },
};
