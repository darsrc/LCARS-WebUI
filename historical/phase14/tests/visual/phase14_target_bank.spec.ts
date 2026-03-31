import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalPhase14Targets, phase14TargetAbsolutePath } from "./phase14TargetCatalog";

const FRONTEND_URL = "http://127.0.0.1:4173/";
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LCARS_UI_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const LCARS_UI_PYTHON = process.env.LCARS_UI_PYTHON ?? path.join(LCARS_UI_ROOT, ".venv", "bin", "python");
const DIFF_SCRIPT = path.join(LCARS_UI_ROOT, "scripts", "write_target_bank_artifacts.py");
const STABLE_ARTIFACT_ROOT = process.env.LCARS_PHASE14_ARTIFACT_DIR
  ? path.resolve(process.env.LCARS_PHASE14_ARTIFACT_DIR)
  : null;

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

test("phase14 canonical targets emit acceptance artifacts and stay under catalog thresholds", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const acceptedFamilyTargets = canonicalPhase14Targets();
  const acceptedTargetIds = acceptedFamilyTargets.map((target) => target.target_id);
  const stableArtifactRows: Array<Record<string, unknown>> = [];

  expect(acceptedTargetIds.length).toBeGreaterThan(0);
  expect(new Set(acceptedTargetIds).size).toBe(acceptedTargetIds.length);
  expect(acceptedFamilyTargets.every((target) => target.threshold > 0 && target.threshold <= 1)).toBe(true);

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

    const artifactDir = STABLE_ARTIFACT_ROOT
      ? path.join(STABLE_ARTIFACT_ROOT, target.target_id)
      : testInfo.outputPath(`phase14-artifacts-${target.target_id}`);
    fs.rmSync(artifactDir, { recursive: true, force: true });
    fs.mkdirSync(artifactDir, { recursive: true });

    const stdout = execFileSync(
      LCARS_UI_PYTHON,
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
    expect(summary.structural_mismatch_ratio).toBeLessThanOrEqual(target.threshold);

    if (STABLE_ARTIFACT_ROOT) {
      const metadataPath = path.join(summary.output_dir, "metadata.json");
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
      const stableRow = {
        ...metadata,
        family_id: target.family_id,
        source_path: target.source_path,
        target_threshold: target.threshold,
        tier: target.tier,
        viewport: target.viewport,
      };
      fs.writeFileSync(metadataPath, JSON.stringify(stableRow, null, 2), "utf8");
      stableArtifactRows.push(stableRow);
    }
  }

  if (STABLE_ARTIFACT_ROOT) {
    fs.mkdirSync(STABLE_ARTIFACT_ROOT, { recursive: true });
    fs.writeFileSync(
      path.join(STABLE_ARTIFACT_ROOT, "artifact_index.json"),
      JSON.stringify(stableArtifactRows, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(STABLE_ARTIFACT_ROOT, "canonical_targets.json"),
      JSON.stringify(acceptedFamilyTargets, null, 2),
      "utf8",
    );
  }
});
