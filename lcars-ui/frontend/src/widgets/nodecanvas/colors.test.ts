import { graphAccent } from "./colors";

describe("graphAccent", () => {
  test("resolves named contract colours before assigning a CSS custom property", () => {
    expect(graphAccent("pale-canary")).toBe("var(--okuda-canary)");
    expect(graphAccent("anakiwa")).toBe("var(--okuda-blue)");
    expect(graphAccent("hopbush")).toBe("var(--okuda-hopbush)");
  });

  test("preserves caller-supplied hex and rejects unknown tokens", () => {
    expect(graphAccent("#12abef")).toBe("#12abef");
    expect(graphAccent("not-a-contract-colour")).toBeUndefined();
    expect(graphAccent(null)).toBeUndefined();
  });

  test("resolves from the one COLOR_VAR table, so retired tokens are dead here too", () => {
    // This surface used to keep a second, wider table: these tokens tinted a
    // node and nothing else. The v2 color enum rejects them, so there is one
    // table and one answer.
    for (const retired of ["purple", "chestnut-rose", "husk", "periwinkle", "rust"]) {
      expect(graphAccent(retired)).toBeUndefined();
    }
  });
});
