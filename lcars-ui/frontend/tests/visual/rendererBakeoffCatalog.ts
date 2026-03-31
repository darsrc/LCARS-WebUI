import {
  RENDERER_BAKEOFF_CANONICAL_PROBE_IDS,
  RENDERER_BAKEOFF_PRODUCT_PROBE_IDS,
  type RendererBakeoffCanonicalProbeId,
  type RendererBakeoffProbeId,
  type RendererBakeoffProbeKind,
  type RendererBakeoffProductProbeId,
} from "../../src/fixtures/rendererBakeoffHarness";

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

const canonicalTargetById = new Map<string, { family_id: string | null; source_path: string; viewport: { width: number; height: number } }>([
  ["seismo_scan_a", { family_id: "seismographic", source_path: "../../../../targets/LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/frame_000001.png", viewport: { width: 1920, height: 1080 } }],
  ["seismo_scan_b", { family_id: "seismographic", source_path: "../../../../targets/LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/frame_000432.png", viewport: { width: 1920, height: 1080 } }],
  ["holodeck_programming_a", { family_id: "holodeck", source_path: "../../../../targets/LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames/frame_000001.png", viewport: { width: 1920, height: 1080 } }],
  ["holodeck_programming_b", { family_id: "holodeck", source_path: "../../../../targets/LCARS_TNG_The_Outrageous_Okona_Holodeck_Selection_frames/frame_000118.png", viewport: { width: 1920, height: 1080 } }],
  ["periodic_table_matrix", { family_id: "periodic_table", source_path: "../../../../targets/LCARS_TNG_Rascals_Periodic_Table_of_Elements_frames/frame_000001.png", viewport: { width: 1920, height: 1080 } }],
  ["overview", { family_id: "overview", source_path: "../../../../targets/LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/frame_000001.png", viewport: { width: 1920, height: 1080 } }],
  ["systems", { family_id: "systems", source_path: "../../../../targets/LCARS_TNG_A_Matter_Of_Time_Seismographic_Scan_frames/frame_000432.png", viewport: { width: 1920, height: 1080 } }],
]);

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
      source_path: target.source_path,
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
