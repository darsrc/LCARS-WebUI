import {
  resolveRendererBakeoff,
  RENDERER_BAKEOFF_PROBE_IDS,
  RENDERER_BAKEOFF_RENDERER_IDS,
  type RendererBakeoffProbeId,
  type RendererBakeoffProbeKind,
  type RendererBakeoffRendererId,
  type RendererBakeoffStatus,
} from "./rendererBakeoffHarness";

export interface RendererBakeoffSupportMatrixEntry {
  entry_kind: string;
  family_id: string | null;
  probe_id: RendererBakeoffProbeId;
  probe_kind: RendererBakeoffProbeKind;
  renderer_id: RendererBakeoffRendererId;
  status: RendererBakeoffStatus;
}

export const rendererBakeoffSupportMatrix = (): RendererBakeoffSupportMatrixEntry[] => {
  return RENDERER_BAKEOFF_RENDERER_IDS.flatMap((rendererId) =>
    RENDERER_BAKEOFF_PROBE_IDS.map((probeId) => {
      const resolution = resolveRendererBakeoff({ probeId, rendererId });
      return {
        entry_kind: resolution.entryKind,
        family_id: resolution.familyId,
        probe_id: probeId,
        probe_kind: resolution.probeKind,
        renderer_id: rendererId,
        status: resolution.status,
      };
    }),
  );
};
