import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "..");
const vendorCssPath = path.join(frontendRoot, "vendor", "joern", "lcars.css");
const outputCssPath = path.join(frontendRoot, "src", "styles", "generated", "joern-scoped.css");
const scopeSelector = '.lcars-ui[data-visual-language="strict"][data-strict-renderer="joern"]';

const readVendorCss = async () => {
  return fs.readFile(vendorCssPath, "utf8");
};

const renameLcarsClasses = (source) => {
  return source.replace(/\.lcars-/g, ".joern-lcars-");
};

const scopeSelectorText = (selector) => {
  const trimmed = selector.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  if (trimmed === "html" || trimmed === "body" || trimmed === "html body" || trimmed === "body html") {
    return scopeSelector;
  }
  if (trimmed.startsWith(scopeSelector)) {
    return trimmed;
  }
  if (trimmed.startsWith("html")) {
    return trimmed.replace(/^html\b/, scopeSelector);
  }
  if (trimmed.startsWith("body")) {
    return trimmed.replace(/^body\b/, scopeSelector);
  }
  return `${scopeSelector} ${trimmed}`;
};

const scopeRules = (cssText) => {
  const root = postcss.parse(cssText);
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name.toLowerCase().includes("keyframes")) {
      return;
    }
    rule.selectors = rule.selectors.map(scopeSelectorText);
  });
  return root.toString();
};

const main = async () => {
  const source = await readVendorCss();
  const renamed = renameLcarsClasses(source);
  const scoped = scopeRules(renamed);
  const banner = [
    "/*",
    " * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.",
    " * Source: frontend/vendor/joern/lcars.css",
    " * Generator: frontend/scripts/build-joern-css.mjs",
    " */",
    "",
  ].join("\n");
  await fs.mkdir(path.dirname(outputCssPath), { recursive: true });
  await fs.writeFile(outputCssPath, `${banner}${scoped}\n`, "utf8");
  console.log(`Generated ${path.relative(frontendRoot, outputCssPath)}`);
};

await main();
