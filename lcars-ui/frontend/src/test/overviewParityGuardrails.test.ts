import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const FORBIDDEN_REFERENCE_TOKENS = [
  "README-sweep",
  "overview-reference-parity",
  "overview-parity-search",
  "overview-literal-pass",
  "overview-iter",
];

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const walkSourceFiles = (directory: string): string[] => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(absolutePath));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
};

describe("overview parity anti-cheat guardrails", () => {
  test("frontend source does not reference overview screenshot assets", () => {
    const offenders: string[] = [];

    for (const filePath of walkSourceFiles(SOURCE_ROOT)) {
      const source = fs.readFileSync(filePath, "utf8");
      const relativePath = path.relative(SOURCE_ROOT, filePath);
      if (relativePath === "test/overviewParityGuardrails.test.ts") {
        continue;
      }
      for (const token of FORBIDDEN_REFERENCE_TOKENS) {
        if (source.includes(token)) {
          offenders.push(`${relativePath} -> ${token}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
