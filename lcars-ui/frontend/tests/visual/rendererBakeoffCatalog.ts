import {
  RENDERER_BAKEOFF_CANONICAL_PROBE_IDS,
  RENDERER_BAKEOFF_PRODUCT_PROBE_IDS,
  type RendererBakeoffCanonicalProbeId,
  type RendererBakeoffProbeId,
  type RendererBakeoffProbeKind,
  type RendererBakeoffProductProbeId,
} from "../../src/fixtures/rendererBakeoffHarness";
import { canonicalPhase14Targets, phase14TargetAbsolutePath } from "./phase14TargetCatalog";

export interface RendererBakeoffProbeSpec {
  family_id: string | null;
  probe_id: RendererBakeoffProbeId;
  probe_kind: RendererBakeoffProbeKind;
  source_path: string | null;
  viewport: {
    width: number;
    height: number;
  };
}

const PRODUCT_SMOKE_VIEWPORT = {
  width: 1920,
  height: 1080,
} as const;

const canonicalTargetById = new Map(
  canonicalPhase14Targets().map((target) => [target.target_id, target] as const),
);

export const rendererBakeoffProbeSpecs = (): RendererBakeoffProbeSpec[] => {
  const canonicalSpecs = RENDERER_BAKEOFF_CANONICAL_PROBE_IDS.map((probeId) => {
    const target = canonicalTargetById.get(probeId);
    if (!target) {
      throw new Error(`Missing canonical bake-off target metadata for ${probeId}`);
    }
    return {
      family_id: target.family_id,
      probe_id: probeId as RendererBakeoffCanonicalProbeId,
      probe_kind: "canonical" as const,
      source_path: phase14TargetAbsolutePath(target.source_path),
      viewport: target.viewport,
    };
  });

  const productSpecs = RENDERER_BAKEOFF_PRODUCT_PROBE_IDS.map((probeId) => ({
    family_id: null,
    probe_id: probeId as RendererBakeoffProductProbeId,
    probe_kind: "product_smoke" as const,
    source_path: null,
    viewport: PRODUCT_SMOKE_VIEWPORT,
  }));

  return [...canonicalSpecs, ...productSpecs];
};
