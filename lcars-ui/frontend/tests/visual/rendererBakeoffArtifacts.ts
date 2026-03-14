import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RENDERER_BAKEOFF_MODE, type RendererBakeoffProbeKind, type RendererBakeoffStatus } from "../../src/fixtures/rendererBakeoffHarness";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const LCARS_UI_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const DIFF_SCRIPT = path.join(LCARS_UI_ROOT, "scripts", "write_target_bank_artifacts.py");

interface RendererBakeoffArtifactParams {
  familyId: string | null;
  outputDir: string;
  probeId: string;
  probeKind: RendererBakeoffProbeKind;
  renderedPath: string;
  rendererId: string;
  status: RendererBakeoffStatus;
  targetPath: string | null;
  viewport: {
    width: number;
    height: number;
  };
}

export const writeRendererBakeoffArtifacts = ({
  familyId,
  outputDir,
  probeId,
  probeKind,
  renderedPath,
  rendererId,
  status,
  targetPath,
  viewport,
}: RendererBakeoffArtifactParams): Record<string, unknown> => {
  fs.mkdirSync(outputDir, { recursive: true });

  if (probeKind === "canonical" && targetPath) {
    const stdout = execFileSync(
      "python",
      [
        DIFF_SCRIPT,
        "--rendered",
        renderedPath,
        "--target",
        targetPath,
        "--target-id",
        probeId,
        "--output-dir",
        outputDir,
      ],
      {
        cwd: LCARS_UI_ROOT,
        encoding: "utf8",
      },
    );

    const summary = JSON.parse(stdout) as Record<string, unknown>;
    const metadataPath = path.join(outputDir, "metadata.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
    const standardized = {
      ...metadata,
      ...summary,
      comparison_harness: RENDERER_BAKEOFF_MODE,
      family_id: familyId,
      probe_id: probeId,
      probe_kind: probeKind,
      renderer_id: rendererId,
      status,
      viewport,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(standardized, null, 2), "utf8");
    return standardized;
  }

  const renderedCopy = path.join(outputDir, "rendered.png");
  const metadataPath = path.join(outputDir, "metadata.json");
  fs.copyFileSync(renderedPath, renderedCopy);

  const metadata = {
    comparison_harness: RENDERER_BAKEOFF_MODE,
    diff_path: null,
    family_id: familyId,
    output_dir: outputDir,
    probe_id: probeId,
    probe_kind: probeKind,
    rendered_path: renderedCopy,
    renderer_id: rendererId,
    status,
    target_path: null,
    viewport,
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf8");
  return metadata;
};
