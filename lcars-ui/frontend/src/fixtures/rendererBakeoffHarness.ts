import type { Manifest, StrictRenderer, Widget } from "../types/contract";
import { buildPhase14FixtureManifest, resolvePhase14FixtureFamilyId } from "./phase14TargetFixtures";
import { getHolodeckSceneSpec } from "../components/phase14/holodeckFamilyData";
import { getPeriodicTableSceneSpec } from "../components/phase14/periodicTableFamilyData";
import { getSeismographicSceneSpec } from "../components/phase14/seismographicFamilyData";

export const RENDERER_BAKEOFF_MODE = "renderer-bakeoff-v1";
export const RENDERER_BAKEOFF_RENDERER_IDS = ["legacy_strict", "joern_strict", "phase14_family"] as const;
export const RENDERER_BAKEOFF_PRIMARY_CANONICAL_PROBE_IDS = [
  "seismo_scan_a",
  "seismo_scan_b",
  "holodeck_programming_a",
  "periodic_table_matrix",
] as const;
export const RENDERER_BAKEOFF_WITHHELD_AUDIT_PROBE_ID = "holodeck_programming_b" as const;
export const RENDERER_BAKEOFF_CANONICAL_PROBE_IDS = [
  ...RENDERER_BAKEOFF_PRIMARY_CANONICAL_PROBE_IDS,
  RENDERER_BAKEOFF_WITHHELD_AUDIT_PROBE_ID,
] as const;
export const RENDERER_BAKEOFF_PRODUCT_PROBE_IDS = ["overview", "systems"] as const;
export const RENDERER_BAKEOFF_PROBE_IDS = [
  ...RENDERER_BAKEOFF_CANONICAL_PROBE_IDS,
  ...RENDERER_BAKEOFF_PRODUCT_PROBE_IDS,
] as const;

export type RendererBakeoffRendererId = (typeof RENDERER_BAKEOFF_RENDERER_IDS)[number];
export type RendererBakeoffCanonicalProbeId = (typeof RENDERER_BAKEOFF_CANONICAL_PROBE_IDS)[number];
export type RendererBakeoffProductProbeId = (typeof RENDERER_BAKEOFF_PRODUCT_PROBE_IDS)[number];
export type RendererBakeoffProbeId = (typeof RENDERER_BAKEOFF_PROBE_IDS)[number];
export type RendererBakeoffProbeKind = "canonical" | "product_smoke";
export type RendererBakeoffStatus = "rendered" | "unsupported" | "error";

export interface RendererBakeoffRequest {
  rendererId: RendererBakeoffRendererId;
  probeId: RendererBakeoffProbeId;
}

export interface RendererBakeoffRequestParseResult {
  mode: "none" | "error" | "active";
  message?: string;
  request?: RendererBakeoffRequest;
}

interface RendererBakeoffBaseResolution {
  familyId: string | null;
  probeId: RendererBakeoffProbeId;
  probeKind: RendererBakeoffProbeKind;
  rendererId: RendererBakeoffRendererId;
  status: RendererBakeoffStatus;
}

export interface RendererBakeoffManifestResolution extends RendererBakeoffBaseResolution {
  activePageId: string;
  entryKind: "manifest";
  manifest: Manifest;
}

export interface RendererBakeoffSceneResolution extends RendererBakeoffBaseResolution {
  entryKind: "holodeck_scene" | "periodic_table_scene" | "seismographic_scene";
  scene:
    | NonNullable<ReturnType<typeof getHolodeckSceneSpec>>
    | NonNullable<ReturnType<typeof getPeriodicTableSceneSpec>>
    | NonNullable<ReturnType<typeof getSeismographicSceneSpec>>;
}

export interface RendererBakeoffStateResolution extends RendererBakeoffBaseResolution {
  entryKind: "error" | "unsupported";
  message: string;
}

export type RendererBakeoffResolution =
  | RendererBakeoffManifestResolution
  | RendererBakeoffSceneResolution
  | RendererBakeoffStateResolution;

const bakeoffRendererIds = new Set<string>(RENDERER_BAKEOFF_RENDERER_IDS);
const bakeoffProbeIds = new Set<string>(RENDERER_BAKEOFF_PROBE_IDS);
const canonicalProbeIds = new Set<string>(RENDERER_BAKEOFF_CANONICAL_PROBE_IDS);
const productProbeIds = new Set<string>(RENDERER_BAKEOFF_PRODUCT_PROBE_IDS);

const makeMarkdownWidget = (id: string, content: string, color: Widget["color"]): Widget => ({
  id,
  type: "markdown",
  content,
  color: color ?? "orange",
  disabled: false,
  visible: true,
});

const makeButtonWidget = (id: string, label: string, color: Widget["color"]): Widget => ({
  id,
  type: "button",
  action_id: `${id}_action`,
  label,
  color: color ?? "orange",
  disabled: false,
  visible: true,
});

const makeChartWidget = (id: string, color: Widget["color"], data: number[]): Widget => ({
  id,
  type: "line_chart",
  label: "",
  x_labels: data.map((_, index) => `${index + 1}`),
  series: [
    {
      name: "S1",
      data,
      color: color ?? "melrose",
    },
  ],
  color: color ?? "melrose",
  disabled: false,
  visible: true,
});

const makeSweepWidget = ({
  chartColor,
  chartData,
  color,
  id,
  leftText,
  railLabels,
  reverse,
  subtitle,
  title,
}: {
  chartColor: Widget["color"];
  chartData: number[];
  color: Widget["color"];
  id: string;
  leftText: string;
  railLabels: string[];
  reverse: boolean;
  subtitle: string;
  title: string;
}): Widget => ({
  id,
  type: "lcars_sweep",
  title,
  subtitle,
  color: color ?? "orange",
  reverse,
  width_sidebar: 150,
  left_width: 0.3,
  column_inputs: railLabels.map((label, index) =>
    makeButtonWidget(`${id}_rail_${index + 1}`, label, index === railLabels.length - 1 ? "orange" : color),
  ),
  left_children: [
    makeMarkdownWidget(`${id}_copy`, leftText, "anakiwa"),
  ],
  right_children: [
    makeChartWidget(`${id}_chart`, chartColor, chartData),
  ],
  children: [],
  disabled: false,
  visible: true,
});

const buildRendererBakeoffProductManifest = (strictRenderer: StrictRenderer): Manifest => {
  return {
    meta: {
      version: "1.0.0",
      app_name: "Renderer Bake-Off Product Fixture",
      theme: "galaxy",
      lang: "en-US",
      sound_enabled: false,
      force_uppercase: true,
      label_uppercase: true,
      lcars_font_headers: true,
      lcars_font_labels: true,
      lcars_font_text: false,
      visual_language: "strict",
      strict_renderer: strictRenderer,
    },
    layout: {
      header: {
        title: "LCARS Console",
        subtitle: "",
        color: "orange",
      },
      sidebar: {
        position: "hidden",
        items: [],
      },
    },
    pages: {
      overview: {
        id: "overview",
        title: "TITLE",
        rows: [
          {
            id: "overview_row",
            height: "auto",
            columns: [
              {
                id: "overview_column",
                width: "1fr",
                widgets: [
                  makeSweepWidget({
                    chartColor: "melrose",
                    chartData: [1, 0, 0, 1, 3, 7, 14, 27, 44, 52, 71, 72, 54, 52, 33, 30, 19, 11, 5, 1],
                    color: "pale-canary",
                    id: "overview_sweep_top",
                    leftText:
                      "NOTE: YOU CAN USE `expand` TO EXTEND THE NEGATIVE TOP OR BOTTOM MARGIN OF A LEFT OR RIGHT CONTENT PANEL, E.G., `expand = c(0, 350)`.\n\nTHIS EXPANDS THE AVAILABLE VERTICAL SPACE FOR THE LEFT AND RIGHT CONTENT BOXES, RESPECTIVELY, IN THE DIRECTION WHERE THERE IS NO SWEEP FORMATION.",
                    railLabels: ["BUTTON", " "],
                    reverse: false,
                    subtitle: "SUBTITLE",
                    title: "TITLE",
                  }),
                  makeSweepWidget({
                    chartColor: "golden-tanoi",
                    chartData: [1, 0, 0, 1, 3, 7, 14, 27, 44, 52, 73, 72, 54, 52, 33, 29, 19, 11, 5, 1],
                    color: "anakiwa",
                    id: "overview_sweep_bottom",
                    leftText:
                      "THIS IS USEFUL IF YOU WANT TO FILL THE ENTIRE PERCEPTUAL SPACE FORMED BY A STACKED SWEEP AND REVERSE SWEEP WITH A SINGLE CONTENT DIV RATHER THAN BE FORCED TO SPLIT CONTENT INTO TWO PIECES ALIGNED TO EACH SWEEP.\n\nSEE THE `lcarsSweep` EXAMPLE IN THE HELP DOCS.",
                    railLabels: ["BUTTON A", "BUTTON B", " "],
                    reverse: true,
                    subtitle: "SUBTITLE 2",
                    title: "TITLE 2",
                  }),
                ],
              },
            ],
          },
        ],
      },
      systems: {
        id: "systems",
        title: "SYSTEMS",
        rows: [
          {
            id: "systems_row",
            height: "auto",
            columns: [
              {
                id: "systems_column",
                width: "1fr",
                widgets: [
                  makeSweepWidget({
                    chartColor: "melrose",
                    chartData: [2, 1, 1, 2, 4, 8, 15, 24, 39, 48, 63, 68, 60, 51, 36, 28, 21, 13, 7, 3],
                    color: "pale-canary",
                    id: "systems_sweep_top",
                    leftText:
                      "PRIMARY SYSTEM BUS SUMMARY.\n\nWARP CORE FLOW IS STABLE.\nDEFLECTOR CONTROL LOOP IS PHASE-LOCKED.\nSHIELD MODULATION IS HOLDING NOMINAL TOLERANCE.",
                    railLabels: ["LINK", " "],
                    reverse: false,
                    subtitle: "PRIMARY ARRAY",
                    title: "SYSTEMS",
                  }),
                  makeSweepWidget({
                    chartColor: "golden-tanoi",
                    chartData: [3, 2, 1, 2, 5, 9, 16, 25, 38, 47, 61, 69, 58, 49, 34, 27, 18, 12, 8, 4],
                    color: "anakiwa",
                    id: "systems_sweep_bottom",
                    leftText:
                      "AUXILIARY SYSTEMS ARE BOUND TO THE SAME SWEEP GEOMETRY FAMILY.\n\nTHIS PAGE EXISTS TO PROVE REUSE OF THE PARITY PRIMITIVES,\nNOT TO TARGET A DIFFERENT SCREENSHOT SPECIMEN.",
                    railLabels: ["SCAN", "SYNC", " "],
                    reverse: true,
                    subtitle: "AUXILIARY ARRAY",
                    title: "SYSTEMS 2",
                  }),
                ],
              },
            ],
          },
        ],
      },
    },
  };
};

export const isRendererBakeoffRendererId = (value: string): value is RendererBakeoffRendererId => {
  return bakeoffRendererIds.has(value);
};

export const isRendererBakeoffProbeId = (value: string): value is RendererBakeoffProbeId => {
  return bakeoffProbeIds.has(value);
};

export const isRendererBakeoffCanonicalProbeId = (value: string): value is RendererBakeoffCanonicalProbeId => {
  return canonicalProbeIds.has(value);
};

export const isRendererBakeoffProductProbeId = (value: string): value is RendererBakeoffProductProbeId => {
  return productProbeIds.has(value);
};

export const rendererBakeoffProbeKind = (probeId: RendererBakeoffProbeId): RendererBakeoffProbeKind => {
  return canonicalProbeIds.has(probeId) ? "canonical" : "product_smoke";
};

export const buildRendererBakeoffSearch = (request: RendererBakeoffRequest): string => {
  const params = new URLSearchParams();
  params.set("comparisonHarness", "renderer-bakeoff");
  params.set("renderer_id", request.rendererId);
  params.set("probe_id", request.probeId);
  return params.toString();
};

export const parseRendererBakeoffRequest = (search: string): RendererBakeoffRequestParseResult => {
  const params = new URLSearchParams(search);
  if (params.get("comparisonHarness") !== "renderer-bakeoff") {
    return { mode: "none" };
  }

  const rendererId = params.get("renderer_id");
  const probeId = params.get("probe_id");
  if (!rendererId || !probeId) {
    return {
      mode: "error",
      message: 'Renderer bake-off mode requires both "renderer_id" and "probe_id".',
    };
  }
  if (!isRendererBakeoffRendererId(rendererId)) {
    return {
      mode: "error",
      message: `Unknown renderer bake-off renderer_id: ${rendererId}`,
    };
  }
  if (!isRendererBakeoffProbeId(probeId)) {
    return {
      mode: "error",
      message: `Unknown renderer bake-off probe_id: ${probeId}`,
    };
  }

  return {
    mode: "active",
    request: {
      rendererId,
      probeId,
    },
  };
};

const strictRendererForBakeoff = (rendererId: RendererBakeoffRendererId): StrictRenderer | null => {
  if (rendererId === "legacy_strict") {
    return "legacy";
  }
  if (rendererId === "joern_strict") {
    return "joern";
  }
  return null;
};

const overrideManifestStrictRenderer = (manifest: Manifest, strictRenderer: StrictRenderer): Manifest => {
  return {
    ...manifest,
    meta: {
      ...manifest.meta,
      strict_renderer: strictRenderer,
    },
  };
};

const canonicalResolution = (request: RendererBakeoffRequest): RendererBakeoffResolution => {
  const familyId = resolvePhase14FixtureFamilyId(request.probeId);

  if (request.rendererId === "phase14_family") {
    const seismographicScene = getSeismographicSceneSpec(request.probeId);
    if (seismographicScene) {
      return {
        entryKind: "seismographic_scene",
        familyId,
        probeId: request.probeId,
        probeKind: "canonical",
        rendererId: request.rendererId,
        scene: seismographicScene,
        status: "rendered",
      };
    }
    const holodeckScene = getHolodeckSceneSpec(request.probeId);
    if (holodeckScene) {
      return {
        entryKind: "holodeck_scene",
        familyId,
        probeId: request.probeId,
        probeKind: "canonical",
        rendererId: request.rendererId,
        scene: holodeckScene,
        status: "rendered",
      };
    }
    const periodicScene = getPeriodicTableSceneSpec(request.probeId);
    if (periodicScene) {
      return {
        entryKind: "periodic_table_scene",
        familyId,
        probeId: request.probeId,
        probeKind: "canonical",
        rendererId: request.rendererId,
        scene: periodicScene,
        status: "rendered",
      };
    }
    return {
      entryKind: "error",
      familyId,
      message: `Canonical probe "${request.probeId}" has no Phase 14 family-scene entry.`,
      probeId: request.probeId,
      probeKind: "canonical",
      rendererId: request.rendererId,
      status: "error",
    };
  }

  const strictRenderer = strictRendererForBakeoff(request.rendererId);
  const baseManifest = buildPhase14FixtureManifest(request.probeId);
  const manifest = strictRenderer && baseManifest ? overrideManifestStrictRenderer(baseManifest, strictRenderer) : null;
  if (!manifest) {
    return {
      entryKind: "error",
      familyId,
      message: `Canonical probe "${request.probeId}" has no deterministic strict fixture manifest.`,
      probeId: request.probeId,
      probeKind: "canonical",
      rendererId: request.rendererId,
      status: "error",
    };
  }

  return {
    activePageId: "target",
    entryKind: "manifest",
    familyId,
    manifest,
    probeId: request.probeId,
    probeKind: "canonical",
    rendererId: request.rendererId,
    status: request.rendererId === "legacy_strict" ? "rendered" : "unsupported",
  };
};

const productResolution = (request: RendererBakeoffRequest): RendererBakeoffResolution => {
  if (request.rendererId === "phase14_family") {
    return {
      entryKind: "unsupported",
      familyId: null,
      message: `Renderer "${request.rendererId}" has no product-smoke route for probe "${request.probeId}".`,
      probeId: request.probeId,
      probeKind: "product_smoke",
      rendererId: request.rendererId,
      status: "unsupported",
    };
  }

  const strictRenderer = strictRendererForBakeoff(request.rendererId);
  const manifest = strictRenderer ? buildRendererBakeoffProductManifest(strictRenderer) : null;
  if (!manifest) {
    return {
      entryKind: "error",
      familyId: null,
      message: `Renderer "${request.rendererId}" has no strict-renderer mapping for product-smoke probe "${request.probeId}".`,
      probeId: request.probeId,
      probeKind: "product_smoke",
      rendererId: request.rendererId,
      status: "error",
    };
  }

  return {
    activePageId: request.probeId,
    entryKind: "manifest",
    familyId: null,
    manifest,
    probeId: request.probeId,
    probeKind: "product_smoke",
    rendererId: request.rendererId,
    status: request.rendererId === "joern_strict" && request.probeId === "systems" ? "unsupported" : "rendered",
  };
};

export const resolveRendererBakeoff = (request: RendererBakeoffRequest): RendererBakeoffResolution => {
  if (isRendererBakeoffCanonicalProbeId(request.probeId)) {
    return canonicalResolution(request);
  }
  return productResolution(request);
};
