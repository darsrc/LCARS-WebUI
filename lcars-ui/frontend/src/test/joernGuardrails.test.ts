import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JOERN_RENDERER_ROOT = path.join(SRC_ROOT, "components", "strict");
const JOERN_STYLE_PATH = path.join(SRC_ROOT, "styles", "lcars", "joern-bridge.css");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

const FORBIDDEN_RASTER_TOKENS = [
  "<img",
  "drawImage(",
  "background-image",
  "mask-image",
  "image-set(",
  "data:image",
];

const FORBIDDEN_PARITY_ID_TOKENS = [
  "overview_sweep_",
  "overview_chart_",
  "systems_sweep_",
  "systems_chart_",
  "PARITY_SWEEP",
  "resolveParitySweepSpec",
  "isOverviewParitySweepId",
  "isSystemsParitySweepId",
];

const walkFiles = (directory: string): string[] => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
};

describe("deprecated joern strict renderer guardrails", () => {
  test("joern strict path contains no raster anti-cheat violations", () => {
    const files = [...walkFiles(JOERN_RENDERER_ROOT), JOERN_STYLE_PATH];
    const offenders: string[] = [];
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(SRC_ROOT, filePath);
      for (const token of FORBIDDEN_RASTER_TOKENS) {
        if (source.includes(token)) {
          offenders.push(`${relativePath} -> ${token}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  test("joern strict path has no parity-id coupling", () => {
    const files = walkFiles(JOERN_RENDERER_ROOT);
    const offenders: string[] = [];
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(SRC_ROOT, filePath);
      for (const token of FORBIDDEN_PARITY_ID_TOKENS) {
        if (source.includes(token)) {
          offenders.push(`${relativePath} -> ${token}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
