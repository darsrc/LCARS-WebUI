import clsx from "clsx";
import type { CSSProperties } from "react";

import type { LcarsColor } from "../types/contract";
import { resolveAccentClass, resolveColorToken } from "../theme/colorTokens";

/**
 * WHY: keep color-to-class mapping centralized so all widgets/nav/header use the
 * exact same accent semantics and we avoid duplicated switch statements.
 */
export const accentClass = (color?: LcarsColor | null): string => {
  return resolveAccentClass(color);
};

export const accentStyle = (color?: LcarsColor | null): CSSProperties => {
  return {
    "--lcars-accent": resolveColorToken(color),
  } as CSSProperties;
};

export const widgetCardClass = (color?: LcarsColor | null, ...extra: string[]): string => {
  return clsx("lcars-widget", accentClass(color), extra);
};

export const pillButtonClass = (color?: LcarsColor | null, ...extra: string[]): string => {
  return clsx("lcars-pill-button", accentClass(color), extra);
};

export const hiddenStyle = (visible?: boolean): { display: "none" } | undefined => {
  if (visible === false) {
    return { display: "none" };
  }
  return undefined;
};
