import { accentVar } from "../rendererShared";

/** Resolve a contract colour name before assigning it to a CSS custom property.
 *
 * Delegates to the renderer's single COLOR_VAR table rather than keeping a
 * second one. This file used to carry its own 37-entry map covering every
 * Okuda-era name; v2 of the manifest contract narrowed `color=` to the
 * tokens that table resolves, so the extra entries became unreachable — and
 * two tables that could disagree is exactly how a token ends up rendering in
 * one surface and silently doing nothing in another. */
export const graphAccent = (color: string | null | undefined): string | undefined =>
  accentVar(color);
