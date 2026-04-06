import type { LcarsColor, LcarsNamedColor, ManifestTheme } from "../types/contract";

/**
 * WHY: charts/SVG styles do not consume CSS classes directly, so components need
 * a shared utility to resolve manifest colors to CSS token references.
 */
export const DEFAULT_LCARS_COLOR: LcarsNamedColor = "orange";

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const NAMED_COLOR_HEX: Record<LcarsNamedColor, string> = {
  orange: "#FFCC99",
  red: "#CC6666",
  blue: "#9999CC",
  purple: "#CC99CC",
  white: "#CCDDFF",
  yellow: "#FFCC66",
  "pale-canary": "#FFFF99",
  tanoi: "#FFCC99",
  "golden-tanoi": "#FFCC66",
  "neon-carrot": "#FF9933",
  eggplant: "#664466",
  lilac: "#CC99CC",
  anakiwa: "#99CCFF",
  mariner: "#3366CC",
  "bahama-blue": "#006699",
  "blue-bell": "#9999CC",
  melrose: "#9999FF",
  hopbush: "#CC6699",
  "chestnut-rose": "#CC6666",
  "orange-peel": "#FF9966",
  "atomic-tangerine": "#FF9900",
  danub: "#6688CC",
  indigo: "#4455BB",
  "lavender-purple": "#9977AA",
  cosmic: "#774466",
  "red-damask": "#DD6644",
  "medium-carmine": "#AA5533",
  bourbon: "#BB6622",
  "sandy-brown": "#EE9955",
  periwinkle: "#CCDDFF",
  "dodger-pale": "#5599FF",
  "dodger-soft": "#3366FF",
  "near-blue": "#0011EE",
  "navy-blue": "#000088",
  husk: "#BBAA55",
  rust: "#BB4411",
  tamarillo: "#882211",
};

const LEGACY_THEME_MAP: Record<
  ManifestTheme,
  Record<"orange" | "red" | "blue" | "purple" | "white" | "yellow", LcarsNamedColor>
> = {
  galaxy: {
    orange: "tanoi",
    red: "chestnut-rose",
    blue: "blue-bell",
    purple: "lilac",
    white: "periwinkle",
    yellow: "golden-tanoi",
  },
  tng: {
    orange: "neon-carrot",
    red: "eggplant",
    blue: "mariner",
    purple: "lilac",
    white: "pale-canary",
    yellow: "golden-tanoi",
  },
  nemesis: {
    orange: "husk",
    red: "rust",
    blue: "dodger-soft",
    purple: "navy-blue",
    white: "dodger-pale",
    yellow: "husk",
  },
};

export const isHexColor = (value: string): boolean => HEX_COLOR_PATTERN.test(value.trim());

export const resolveColorName = (color?: LcarsColor | null): string => {
  if (!color) {
    return DEFAULT_LCARS_COLOR;
  }
  const normalized = color.trim().toLowerCase();
  if (normalized.length === 0) {
    return DEFAULT_LCARS_COLOR;
  }
  return normalized;
};

export const resolveColorToken = (color?: LcarsColor | null): string => {
  const resolved = resolveColorName(color);
  if (isHexColor(resolved)) {
    return resolved;
  }
  return `var(--lcars-color-${resolved})`;
};

export const resolveAccentClass = (color?: LcarsColor | null): string => {
  const resolved = resolveColorName(color);
  if (isHexColor(resolved)) {
    return "lcars-accent-inline";
  }
  return `lcars-accent-${resolved}`;
};

export const isTheme = (value: string): value is ManifestTheme => {
  return value === "galaxy" || value === "nemesis" || value === "tng";
};

/**
 * Useful for tests/docs where raw hex output is required.
 */
export const THEME_COLOR_HEX: Record<ManifestTheme, Record<LcarsNamedColor, string>> = {
  galaxy: {
    ...NAMED_COLOR_HEX,
    orange: NAMED_COLOR_HEX[LEGACY_THEME_MAP.galaxy.orange],
    red: NAMED_COLOR_HEX[LEGACY_THEME_MAP.galaxy.red],
    blue: NAMED_COLOR_HEX[LEGACY_THEME_MAP.galaxy.blue],
    purple: NAMED_COLOR_HEX[LEGACY_THEME_MAP.galaxy.purple],
    white: NAMED_COLOR_HEX[LEGACY_THEME_MAP.galaxy.white],
    yellow: NAMED_COLOR_HEX[LEGACY_THEME_MAP.galaxy.yellow],
  },
  tng: {
    ...NAMED_COLOR_HEX,
    orange: NAMED_COLOR_HEX[LEGACY_THEME_MAP.tng.orange],
    red: NAMED_COLOR_HEX[LEGACY_THEME_MAP.tng.red],
    blue: NAMED_COLOR_HEX[LEGACY_THEME_MAP.tng.blue],
    purple: NAMED_COLOR_HEX[LEGACY_THEME_MAP.tng.purple],
    white: NAMED_COLOR_HEX[LEGACY_THEME_MAP.tng.white],
    yellow: NAMED_COLOR_HEX[LEGACY_THEME_MAP.tng.yellow],
  },
  nemesis: {
    ...NAMED_COLOR_HEX,
    orange: NAMED_COLOR_HEX[LEGACY_THEME_MAP.nemesis.orange],
    red: NAMED_COLOR_HEX[LEGACY_THEME_MAP.nemesis.red],
    blue: NAMED_COLOR_HEX[LEGACY_THEME_MAP.nemesis.blue],
    purple: NAMED_COLOR_HEX[LEGACY_THEME_MAP.nemesis.purple],
    white: NAMED_COLOR_HEX[LEGACY_THEME_MAP.nemesis.white],
    yellow: NAMED_COLOR_HEX[LEGACY_THEME_MAP.nemesis.yellow],
  },
};
