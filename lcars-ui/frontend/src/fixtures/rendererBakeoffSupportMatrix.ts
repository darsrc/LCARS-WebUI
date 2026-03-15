import {
  resolveRendererBakeoff,
  RENDERER_BAKEOFF_PROBE_IDS,
  RENDERER_BAKEOFF_RENDERER_IDS,
  type RendererBakeoffProbeId,
  type RendererBakeoffProbeKind,
  type RendererBakeoffRendererId,
  type RendererBakeoffStatus,
} from "./rendererBakeoffHarness";
import type { StrictRenderer } from "../types/contract";

export type RendererBakeoffAdapterKind =
  | "canonical_strict_fixture_manifest"
  | "product_smoke_manifest"
  | "phase14_family_scene"
  | "unsupported_boundary"
  | "error_boundary";

export interface RendererBakeoffSupportMatrixEntry {
  active_page_id: string | null;
  adapter_kind: RendererBakeoffAdapterKind;
  entry_kind: string;
  family_id: string | null;
  probe_id: RendererBakeoffProbeId;
  probe_kind: RendererBakeoffProbeKind;
  renderer_id: RendererBakeoffRendererId;
  status: RendererBakeoffStatus;
  strict_renderer: StrictRenderer | null;
}

export interface RendererBakeoffContenderProbeSummary {
  error: RendererBakeoffProbeId[];
  rendered: RendererBakeoffProbeId[];
  renderer_id: RendererBakeoffRendererId;
  unsupported: RendererBakeoffProbeId[];
}

const adapterKindForResolution = (
  entryKind: string,
  probeKind: RendererBakeoffProbeKind,
): RendererBakeoffAdapterKind => {
  if (entryKind === "manifest") {
    return probeKind === "canonical"
      ? "canonical_strict_fixture_manifest"
      : "product_smoke_manifest";
  }
  if (entryKind === "unsupported") {
    return "unsupported_boundary";
  }
  if (entryKind === "error") {
    return "error_boundary";
  }
  return "phase14_family_scene";
};

export const rendererBakeoffSupportMatrix = (): RendererBakeoffSupportMatrixEntry[] => {
  return RENDERER_BAKEOFF_RENDERER_IDS.flatMap((rendererId) =>
    RENDERER_BAKEOFF_PROBE_IDS.map((probeId) => {
      const resolution = resolveRendererBakeoff({ probeId, rendererId });
      return {
        active_page_id: resolution.entryKind === "manifest" ? resolution.activePageId : null,
        adapter_kind: adapterKindForResolution(resolution.entryKind, resolution.probeKind),
        entry_kind: resolution.entryKind,
        family_id: resolution.familyId,
        probe_id: probeId,
        probe_kind: resolution.probeKind,
        renderer_id: rendererId,
        status: resolution.status,
        strict_renderer: resolution.entryKind === "manifest" ? resolution.manifest.meta.strict_renderer : null,
      };
    }),
  );
};

export const rendererBakeoffContenderProbeSummaries = (): RendererBakeoffContenderProbeSummary[] => {
  const matrix = rendererBakeoffSupportMatrix();
  return RENDERER_BAKEOFF_RENDERER_IDS.map((rendererId) => {
    const rows = matrix.filter((row) => row.renderer_id === rendererId);
    return {
      error: rows.filter((row) => row.status === "error").map((row) => row.probe_id),
      rendered: rows.filter((row) => row.status === "rendered").map((row) => row.probe_id),
      renderer_id: rendererId,
      unsupported: rows.filter((row) => row.status === "unsupported").map((row) => row.probe_id),
    };
  });
};
