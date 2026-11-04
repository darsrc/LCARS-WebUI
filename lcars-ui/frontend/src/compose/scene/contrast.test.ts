// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

const stylesheet = readFileSync(new URL("../../styles/lcars.css", import.meta.url), "utf8");
// Default theme tokens live on .lcars-root so theme overrides inherit correctly.
const defaultTheme = stylesheet.match(/\.lcars-root\s*\{([^}]*)\}/)?.[1];
if (!defaultTheme) throw new Error("Default theme tokens not found");
const colors = Object.fromEntries(
  [...defaultTheme.matchAll(/(--[\w-]+):\s*(#[\da-f]{3}(?:[\da-f]{3})?)\s*;/gi)].map(
    ([, name, value]) => [name, value],
  ),
);
const color = (name: string) => {
  if (!colors[name]) throw new Error(`Missing default hex color ${name}`);
  return colors[name];
};

describe("WCAG contrast", () => {
  it("matches known reference pairs", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 2);
    expect(contrastRatio("#777", "#fff")).toBeCloseTo(4.48, 2);
  });

  it.each([
    ["region heading on field", "--okuda-orange", "--theme-field", 4.5],
    ["frame terminal on field", "--theme-field", "--okuda-orange", 4.5],
    ["relation terminal on field", "--theme-field", "--okuda-lilac", 4.5],
    ["commands terminal on field", "--theme-field", "--okuda-canary", 4.5],
    ["pending control", "--theme-field", "--okuda-canary", 4.5],
    ["toggle text", "--theme-field", "--okuda-lilac", 4.5],
    ["panel text", "--okuda-golden", "--theme-field", 4.5],
    ["frame band", "--okuda-orange", "--theme-field", 3],
    ["focal band", "--okuda-blue", "--theme-field", 3],
    ["commands band", "--okuda-canary", "--theme-field", 3],
    ["alert band", "--okuda-red", "--theme-field", 3],
    ["relation band", "--okuda-lilac", "--theme-field", 3],
  ])("%s meets contrast threshold", (_name, foreground, background, minimum) => {
    expect(contrastRatio(color(foreground), color(background))).toBeGreaterThanOrEqual(minimum);
  });
});
