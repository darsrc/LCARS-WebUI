import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalPhase14Targets, phase14TargetAbsolutePath } from "./phase14TargetCatalog";

const FRONTEND_URL = "http://127.0.0.1:4173/";
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LCARS_UI_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const DIFF_SCRIPT = path.join(LCARS_UI_ROOT, "scripts", "write_target_bank_artifacts.py");
const FAMILY_ACCEPTANCE_THRESHOLDS: Record<string, number> = {
  seismo_scan_a: 0.37,
  seismo_scan_b: 0.5,
  holodeck_programming_a: 0.34,
  holodeck_programming_b: 0.29,
  periodic_table_matrix: 0.55,
};

test("phase14 fixture mode loads every canonical target using catalog viewports", async ({ page }) => {
  for (const target of canonicalPhase14Targets()) {
    await page.setViewportSize(target.viewport);
    await page.goto(`${FRONTEND_URL}?fixtureManifest=phase14&target=${encodeURIComponent(target.target_id)}`);
    await expect(page.locator(".lcars-ui")).toBeVisible();
    await expect(page.locator(".lcars-ui")).toHaveAttribute("data-fixture-manifest", "phase14");
    await expect(page.locator(".lcars-ui")).toHaveAttribute("data-phase14-target-id", target.target_id);
    await expect(page.locator(".lcars-ui")).toHaveAttribute("data-phase14-target-family", target.family_id);
    const familyScene = page.locator('[data-phase14-scene-root="true"]');
    if ((await familyScene.count()) > 0) {
      await expect(familyScene).toBeVisible();
    } else {
      await expect(page.locator(".lcars-strict-page")).toBeVisible();
    }
  }
});

test("phase14 accepted family targets emit acceptance artifacts and stay under family thresholds", async ({ page }, testInfo) => {
  const acceptedFamilyTargets = canonicalPhase14Targets().filter((target) =>
    ["seismographic_scan", "holodeck_programming", "periodic_table_matrix"].includes(target.family_id),
  );
  expect(acceptedFamilyTargets.map((target) => target.target_id).sort()).toEqual([
    "holodeck_programming_a",
    "holodeck_programming_b",
    "periodic_table_matrix",
    "seismo_scan_a",
    "seismo_scan_b",
  ]);

  for (const target of acceptedFamilyTargets) {
    await page.setViewportSize(target.viewport);
    await page.goto(`${FRONTEND_URL}?fixtureManifest=phase14&target=${encodeURIComponent(target.target_id)}`);
    await expect(page.locator(".lcars-ui")).toHaveAttribute("data-phase14-target-id", target.target_id);
    await expect(page.locator('[data-phase14-scene-root="true"]')).toHaveAttribute(
      "data-phase14-family-recipe",
      target.family_id,
    );

    const renderedPath = testInfo.outputPath(`${target.target_id}-rendered.png`);
    await page.screenshot({ path: renderedPath });

    const artifactDir = testInfo.outputPath(`phase14-artifacts-${target.target_id}`);
    fs.mkdirSync(artifactDir, { recursive: true });

    const stdout = execFileSync(
      "python",
      [
        DIFF_SCRIPT,
        "--rendered",
        renderedPath,
        "--target",
        phase14TargetAbsolutePath(target.source_path),
        "--target-id",
        target.target_id,
        "--output-dir",
        artifactDir,
      ],
      {
        cwd: LCARS_UI_ROOT,
        encoding: "utf8",
      },
    );

    const summary = JSON.parse(stdout) as {
      mismatch_pixels: number;
      mismatch_ratio: number;
      structural_mismatch_pixels: number;
      structural_mismatch_ratio: number;
      total_pixels: number;
      output_dir: string;
    };

    expect(fs.existsSync(path.join(summary.output_dir, "rendered.png"))).toBe(true);
    expect(fs.existsSync(path.join(summary.output_dir, "target.png"))).toBe(true);
    expect(fs.existsSync(path.join(summary.output_dir, "diff.png"))).toBe(true);
    expect(fs.existsSync(path.join(summary.output_dir, "metadata.json"))).toBe(true);
    expect(summary.total_pixels).toBeGreaterThan(0);
    expect(summary.structural_mismatch_pixels).toBeGreaterThan(0);
    expect(summary.structural_mismatch_ratio).toBeLessThanOrEqual(FAMILY_ACCEPTANCE_THRESHOLDS[target.target_id]);
  }
});
