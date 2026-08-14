import { graphAccent } from "./colors";

describe("graphAccent", () => {
  test("resolves named contract colours before assigning a CSS custom property", () => {
    expect(graphAccent("pale-canary")).toBe("var(--okuda-canary)");
    expect(graphAccent("anakiwa")).toBe("var(--okuda-blue)");
    expect(graphAccent("chestnut-rose")).toBe("var(--okuda-hopbush)");
  });

  test("preserves caller-supplied hex and rejects unknown tokens", () => {
    expect(graphAccent("#12abef")).toBe("#12abef");
    expect(graphAccent("not-a-contract-colour")).toBeUndefined();
    expect(graphAccent(null)).toBeUndefined();
  });
});
