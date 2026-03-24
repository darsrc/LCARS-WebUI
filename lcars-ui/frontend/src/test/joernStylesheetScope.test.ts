import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_CSS_PATH = path.join(SRC_ROOT, "styles", "generated", "joern-scoped.css");
const EXPECTED_SCOPE = '.lcars-ui[data-visual-language="strict"][data-strict-renderer="joern"]';

describe("deprecated joern scoped stylesheet", () => {
  test("uses strict renderer scope prefix and renamed class namespace", () => {
    const css = fs.readFileSync(GENERATED_CSS_PATH, "utf8");
    const cssWithoutScopeClass = css.replaceAll(".lcars-ui", "");

    expect(css).toContain(EXPECTED_SCOPE);
    expect(cssWithoutScopeClass).not.toMatch(/(^|[^\w-])\.lcars-/);
    expect(css).toContain(".joern-lcars-");
  });
});
