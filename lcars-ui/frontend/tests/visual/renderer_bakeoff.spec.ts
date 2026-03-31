import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import {
  buildRendererBakeoffSearch,
  RENDERER_BAKEOFF_MODE,
  RENDERER_BAKEOFF_RENDERER_IDS,
} from "../../src/fixtures/rendererBakeoffHarness";
import { rendererBakeoffProbeSpecs } from "./rendererBakeoffCatalog";
import { writeRendererBakeoffArtifacts } from "./rendererBakeoffArtifacts";

const FRONTEND_URL = "http://127.0.0.1:4173/";

for (const rendererId of RENDERER_BAKEOFF_RENDERER_IDS) {
  for (const probe of rendererBakeoffProbeSpecs()) {
    test(`renderer bake-off harness emits standardized artifacts for ${rendererId} / ${probe.probe_id}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(probe.viewport);
      await page.goto(
        `${FRONTEND_URL}?${buildRendererBakeoffSearch({
          rendererId,
          probeId: probe.probe_id,
        })}`,
      );

      const root = page.locator(".lcars-ui");
      await expect(root).toBeVisible();
      await expect(root).toHaveAttribute("data-comparison-harness", RENDERER_BAKEOFF_MODE);
      await expect(root).toHaveAttribute("data-comparison-renderer-id", rendererId);
      await expect(root).toHaveAttribute("data-comparison-probe-id", probe.probe_id);
      await expect(root).toHaveAttribute("data-comparison-probe-kind", probe.probe_kind);

      const status = await root.getAttribute("data-comparison-status");
      expect(status === "rendered" || status === "unsupported").toBe(true);

      if (status === "unsupported") {
        const unsupportedMarkers = page.locator(
          '[data-comparison-state="unsupported"], [data-lcars-joern-page-state="unsupported"]',
        );
        expect(await unsupportedMarkers.count()).toBeGreaterThan(0);
      } else {
        const renderMarkers = page.locator(
          '.lcars-shell-frame, .lcars-strict-page',
        );
        expect(await renderMarkers.count()).toBeGreaterThan(0);
      }

      const renderedPath = testInfo.outputPath(`${rendererId}-${probe.probe_id}-rendered.png`);
      await page.screenshot({ path: renderedPath });

      const artifactDir = testInfo.outputPath(`renderer-bakeoff-${rendererId}-${probe.probe_id}`);
      const metadata = writeRendererBakeoffArtifacts({
        familyId: probe.family_id,
        outputDir: artifactDir,
        probeId: probe.probe_id,
        probeKind: probe.probe_kind,
        renderedPath,
        rendererId,
        status: status as "rendered" | "unsupported",
        targetPath: probe.source_path,
        viewport: probe.viewport,
      });

      expect(fs.existsSync(path.join(artifactDir, "rendered.png"))).toBe(true);
      expect(fs.existsSync(path.join(artifactDir, "metadata.json"))).toBe(true);
      expect(metadata.renderer_id).toBe(rendererId);
      expect(metadata.probe_id).toBe(probe.probe_id);
      expect(metadata.probe_kind).toBe(probe.probe_kind);
      expect(metadata.status).toBe(status);

      if (probe.probe_kind === "canonical") {
        expect(fs.existsSync(path.join(artifactDir, "target.png"))).toBe(true);
        expect(fs.existsSync(path.join(artifactDir, "diff.png"))).toBe(true);
      } else {
        expect(fs.existsSync(path.join(artifactDir, "target.png"))).toBe(false);
        expect(fs.existsSync(path.join(artifactDir, "diff.png"))).toBe(false);
      }
    });
  }
}
