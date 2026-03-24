import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);
const FORBIDDEN_TARGET_BANK_TOKENS = [
  "targets/",
  "targets\\",
  "LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/",
  "LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames/",
  "LCARS_TNG_Rascals_Periodic_Table_of_Elements_frames/",
  "LCN adge intro2_frames/",
  "frame_000001.png",
  "frame_000118.png",
  "frame_000432.png",
];

const walkSourceFiles = (directory: string): string[] => {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
};

describe("target-bank frontend guardrails", () => {
  test("frontend runtime source does not reference target-bank assets or raw frame paths", () => {
    const offenders: string[] = [];

    for (const filePath of walkSourceFiles(SRC_ROOT)) {
      const relativePath = path.relative(SRC_ROOT, filePath);
      if (relativePath.startsWith("test/")) {
        continue;
      }

      const source = fs.readFileSync(filePath, "utf8");
      for (const token of FORBIDDEN_TARGET_BANK_TOKENS) {
        if (source.includes(token)) {
          offenders.push(`${relativePath} -> ${token}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
