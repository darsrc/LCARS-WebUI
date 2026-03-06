import { resolveColorToken, THEME_COLOR_HEX } from "./colorTokens";

describe("color token resolution", () => {
  test("resolves legacy aliases to css vars", () => {
    expect(resolveColorToken("orange")).toBe("var(--lcars-color-orange)");
    expect(resolveColorToken("blue")).toBe("var(--lcars-color-blue)");
  });

  test("resolves expanded LCARS named colors", () => {
    expect(resolveColorToken("pale-canary")).toBe("var(--lcars-color-pale-canary)");
    expect(resolveColorToken("atomic-tangerine")).toBe("var(--lcars-color-atomic-tangerine)");
    expect(resolveColorToken("dodger-soft")).toBe("var(--lcars-color-dodger-soft)");
  });

  test("passes through raw hex colors", () => {
    expect(resolveColorToken("#A1b2C3")).toBe("#a1b2c3");
  });

  test("theme lookup contains 30+ named entries", () => {
    expect(Object.keys(THEME_COLOR_HEX.galaxy).length).toBeGreaterThanOrEqual(37);
    expect(THEME_COLOR_HEX.tng.orange).toBe("#FF9933");
    expect(THEME_COLOR_HEX.nemesis.blue).toBe("#3366FF");
  });
});
