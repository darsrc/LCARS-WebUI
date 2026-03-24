import type { CSSProperties } from "react";

import type { LcarsColor } from "../../../types/contract";

const NAMED_COLOR_MAP: Record<string, string> = {
  orange: "atomic-tangerine",
  red: "red-alert",
  blue: "blue",
  purple: "lilac",
  white: "white",
  yellow: "pale-canary",
  "pale-canary": "pale-canary",
  tanoi: "golden-tanoi",
  "golden-tanoi": "golden-tanoi",
  "neon-carrot": "neon-carrot",
  eggplant: "eggplant",
  lilac: "lilac",
  anakiwa: "anakiwa",
  mariner: "mariner",
  "bahama-blue": "bahama-blue",
  "blue-bell": "blue-bell",
  melrose: "melrose",
  hopbush: "hopbush",
  "chestnut-rose": "chestnut-rose",
  "orange-peel": "orange-peel",
  "atomic-tangerine": "atomic-tangerine",
  danub: "danub",
  indigo: "indigo",
  "lavender-purple": "lavender-purple",
  cosmic: "cosmic",
  "red-damask": "red-damask",
  "medium-carmine": "medium-carmine",
  bourbon: "bourbon",
  "sandy-brown": "sandy-brown",
  periwinkle: "periwinkle",
  "dodger-pale": "dodger-blue",
  "dodger-soft": "dodger-blue-alt",
  "near-blue": "dodger-blue",
  "navy-blue": "navy-blue",
  husk: "husk",
  rust: "rust",
  tamarillo: "tamarillo",
};

const isHexColor = (value: string): boolean => /^#[\da-f]{3,8}$/i.test(value);

const resolveName = (color: LcarsColor | null | undefined): string | null => {
  if (!color || typeof color !== "string") {
    return null;
  }
  if (isHexColor(color)) {
    return null;
  }
  return NAMED_COLOR_MAP[color] ?? "atomic-tangerine";
};

export const joernBgClass = (color: LcarsColor | null | undefined): string => {
  const resolved = resolveName(color);
  return resolved ? `joern-lcars-${resolved}-bg` : "joern-lcars-atomic-tangerine-bg";
};

export const joernColorClass = (color: LcarsColor | null | undefined): string => {
  const resolved = resolveName(color);
  return resolved ? `joern-lcars-${resolved}-color` : "joern-lcars-pale-canary-color";
};

export const joernInlineBackground = (color: LcarsColor | null | undefined): CSSProperties | undefined => {
  if (!color || typeof color !== "string" || !isHexColor(color)) {
    return undefined;
  }
  return { backgroundColor: color };
};
