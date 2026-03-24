import { buildPhase14FixtureManifest, PHASE14_TARGET_FIXTURE_IDS, isPhase14TargetFixtureId } from "./phase14TargetFixtures";
import { isManifest } from "../types/contract";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(FIXTURE_DIR, "..", "..", "..", "..");

describe("phase14 target fixtures", () => {
  test("supports the canonical fixture ids", () => {
    expect(PHASE14_TARGET_FIXTURE_IDS).toEqual([
      "seismo_scan_a",
      "seismo_scan_b",
      "holodeck_programming_a",
      "holodeck_programming_b",
      "periodic_table_matrix",
    ]);
    expect(isPhase14TargetFixtureId("seismo_scan_a")).toBe(true);
    expect(isPhase14TargetFixtureId("missing_target")).toBe(false);
  });

  test("builds contract-valid deterministic manifests for every canonical target", () => {
    for (const targetId of PHASE14_TARGET_FIXTURE_IDS) {
      const manifest = buildPhase14FixtureManifest(targetId);
      expect(manifest).not.toBeNull();
      expect(isManifest(manifest)).toBe(true);
      expect(manifest?.pages.target.id).toBe("target");
      expect(Object.keys(manifest?.pages ?? {})).toEqual(["target"]);
      expect(manifest?.meta.strict_renderer).toBe("legacy");
      expect(manifest?.meta.visual_language).toBe("strict");
    }
  });

  test("stays aligned with the phase14 canonical target catalog ids", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "targets", "phase14_target_catalog.json"), "utf8"),
    ) as { targets: Array<{ target_id: string; tier: string }> };

    const canonicalIds = payload.targets
      .filter((target) => target.tier === "canonical")
      .map((target) => target.target_id)
      .sort();

    expect([...PHASE14_TARGET_FIXTURE_IDS].sort()).toEqual(canonicalIds);
  });
});
