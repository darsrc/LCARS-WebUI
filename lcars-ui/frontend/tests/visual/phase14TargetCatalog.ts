import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Phase14CatalogTarget {
  target_id: string;
  family_id: string;
  source_path: string;
  viewport: {
    width: number;
    height: number;
  };
  tier: "canonical" | "extended";
  sequence_group: string;
}

interface Phase14CatalogPayload {
  targets: Phase14CatalogTarget[];
}

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..", "..", "..");
const CATALOG_PATH = path.join(REPO_ROOT, "targets", "phase14_target_catalog.json");

export const loadPhase14Catalog = (): Phase14CatalogPayload => {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8")) as Phase14CatalogPayload;
};

export const canonicalPhase14Targets = (): Phase14CatalogTarget[] => {
  return loadPhase14Catalog().targets.filter((target) => target.tier === "canonical");
};

export const phase14TargetAbsolutePath = (relativePath: string): string => {
  return path.join(REPO_ROOT, relativePath);
};
