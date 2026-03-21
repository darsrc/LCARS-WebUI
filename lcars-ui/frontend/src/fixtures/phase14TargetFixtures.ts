import type { Manifest, SidebarItem, Widget } from "../types/contract";

interface Phase14TargetFixtureSpec {
  targetId: string;
  familyId: string;
  appName: string;
  headerTitle: string;
  headerSubtitle: string;
  pageTitle: string;
  accentColor: Manifest["layout"]["header"]["color"];
  navColor: SidebarItem["color"];
  narrative: string;
  primitiveTags: string[];
  emphasis: string;
}

const makeHeaderWidget = (id: string, text: string, color: Widget["color"]): Widget => ({
  id,
  type: "lcars_header",
  text,
  color: color ?? "orange",
  size: "h2",
  disabled: false,
  visible: true,
});

const makeTextWidget = (
  id: string,
  content: string,
  size: "h1" | "h2" | "body" | "mono",
  color: Widget["color"],
): Widget => ({
  id,
  type: "text",
  content,
  size,
  color: color ?? "orange",
  disabled: false,
  visible: true,
});

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

const makeChartWidget = (id: string, color: Widget["color"]): Widget => ({
  id,
  type: "line_chart",
  label: "Telemetry",
  x_labels: ["1", "2", "3", "4", "5", "6"],
  series: [
    {
      name: "S1",
      data: [1, 3, 5, 4, 6, 8],
      color: color ?? "anakiwa",
    },
  ],
  color: color ?? "anakiwa",
  disabled: false,
  visible: true,
});

const makeMetricWidget = (id: string, label: string, value: string, color: Widget["color"]): Widget => ({
  id,
  type: "status_tile",
  label,
  value,
  status: "ok",
  color: color ?? "orange",
  disabled: false,
  visible: true,
});

const makeSweepWidget = (spec: Phase14TargetFixtureSpec): Widget => ({
  id: `${spec.targetId}_sweep`,
  type: "lcars_sweep",
  title: spec.headerTitle,
  subtitle: spec.headerSubtitle,
  color: spec.accentColor ?? "orange",
  reverse: false,
  width_sidebar: 132,
  left_width: spec.familyId === "holodeck_programming" ? 0.48 : 0.62,
  column_inputs: [
    makeButtonWidget(`${spec.targetId}_rail_a`, "SYNC", spec.accentColor),
    makeButtonWidget(`${spec.targetId}_rail_b`, "SCAN", "anakiwa"),
  ],
  left_children: [
    makeHeaderWidget(`${spec.targetId}_header`, spec.pageTitle, spec.accentColor),
    makeMarkdownWidget(
      `${spec.targetId}_narrative`,
      `${spec.narrative}\n\nPRIMITIVES: ${spec.primitiveTags.join(", ")}`,
      "anakiwa",
    ),
  ],
  right_children: [
    makeChartWidget(`${spec.targetId}_chart`, "melrose"),
  ],
  children: [],
  disabled: false,
  visible: true,
});

const makeBoxWidget = (spec: Phase14TargetFixtureSpec): Widget => ({
  id: `${spec.targetId}_box`,
  type: "lcars_box",
  title: `${spec.pageTitle} NOTES`,
  subtitle: spec.emphasis,
  corners: [1, 2, 3, 4],
  sides: [1, 2, 3, 4],
  color: spec.accentColor ?? "orange",
  width_left: 96,
  width_right: 96,
  left_inputs: [
    makeButtonWidget(`${spec.targetId}_left_button`, "LOCK", spec.accentColor),
  ],
  right_inputs: [
    makeButtonWidget(`${spec.targetId}_right_button`, "TRACE", "golden-tanoi"),
  ],
  main_children: [
    makeTextWidget(`${spec.targetId}_emphasis`, spec.emphasis, "h2", spec.accentColor),
    makeMetricWidget(`${spec.targetId}_metric_a`, "FAMILY", spec.familyId.toUpperCase(), "blue"),
    makeMetricWidget(`${spec.targetId}_metric_b`, "TARGET", spec.targetId.toUpperCase(), "purple"),
  ],
  side_children: [
    makeMarkdownWidget(
      `${spec.targetId}_side_notes`,
      "PHASE 14 FIXTURE MODE\n\nThis scene is deterministic and intentionally transport-oriented, not the active acceptance renderer.",
      "golden-tanoi",
    ),
  ],
  children: [],
  disabled: false,
  visible: true,
});

const makePeriodicMatrixWidget = (spec: Phase14TargetFixtureSpec): Widget => ({
  id: `${spec.targetId}_matrix`,
  type: "table",
  label: spec.pageTitle,
  headers: ["A", "B", "C", "D"],
  rows: [
    { id: `${spec.targetId}_r1`, cells: ["H", "Li", "Na", "K"] },
    { id: `${spec.targetId}_r2`, cells: ["Be", "Mg", "Ca", "Sr"] },
    { id: `${spec.targetId}_r3`, cells: ["La", "Pa", "Sn", "Ra"] },
    { id: `${spec.targetId}_r4`, cells: ["Cd", "Dy", "Wy", "Ef"] },
  ],
  color: spec.accentColor ?? "orange",
  disabled: false,
  visible: true,
});

const FIXTURE_SPECS: readonly Phase14TargetFixtureSpec[] = [
  {
    targetId: "seismo_scan_a",
    familyId: "seismographic_scan",
    appName: "Phase 14 Target Fixture",
    headerTitle: "PENTHARA IV SEISMIC ACTIVITY MONITOR",
    headerSubtitle: "CANONICAL TARGET A",
    pageTitle: "SEISMOGRAPHIC SCAN A",
    accentColor: "pale-canary",
    navColor: "anakiwa",
    narrative:
      "Deterministic Phase 2 fixture for the Seismographic family. This fixture exists to prove the harness path, not target fidelity.",
    primitiveTags: [
      "title_bar",
      "left_numeric_rail",
      "continuous_horizontal_sweep_bars",
      "chart_frame",
      "asymmetric_content_split",
    ],
    emphasis: "FIRST FAMILY HARNESS TARGET",
  },
  {
    targetId: "seismo_scan_b",
    familyId: "seismographic_scan",
    appName: "Phase 14 Target Fixture",
    headerTitle: "PENTHARA IV SEISMIC ACTIVITY MONITOR",
    headerSubtitle: "CANONICAL TARGET B",
    pageTitle: "SEISMOGRAPHIC SCAN B",
    accentColor: "anakiwa",
    navColor: "pale-canary",
    narrative:
      "Second deterministic fixture for the Seismographic family. Payload wording differs so the harness can distinguish family state variants.",
    primitiveTags: [
      "title_bar",
      "left_numeric_rail",
      "continuous_horizontal_sweep_bars",
      "map_frame",
      "callout_connectors",
    ],
    emphasis: "SECOND STATE PROBE",
  },
  {
    targetId: "holodeck_programming_a",
    familyId: "holodeck_programming",
    appName: "Phase 14 Target Fixture",
    headerTitle: "HOLODECK PROGRAMMING",
    headerSubtitle: "CANONICAL TARGET A",
    pageTitle: "HOLODECK PROGRAMMING A",
    accentColor: "atomic-tangerine",
    navColor: "purple",
    narrative:
      "Deterministic Holodeck fixture proving the Phase 2 entrypoint can address a second family with a materially different layout grammar.",
    primitiveTags: [
      "large_header_elbow",
      "top_title_bar",
      "pill_controls",
      "side_gutters",
      "dense_command_grid",
    ],
    emphasis: "SECOND FAMILY ENTRYPOINT",
  },
  {
    targetId: "holodeck_programming_b",
    familyId: "holodeck_programming",
    appName: "Phase 14 Target Fixture",
    headerTitle: "HOLODECK PROGRAMMING",
    headerSubtitle: "CANONICAL TARGET B",
    pageTitle: "HOLODECK PROGRAMMING B",
    accentColor: "orange-peel",
    navColor: "golden-tanoi",
    narrative:
      "Second Holodeck fixture emphasizing deterministic list-style payload instead of the denser initial scene.",
    primitiveTags: [
      "large_header_elbow",
      "top_title_bar",
      "pill_controls",
      "name_list_layout",
      "bottom_frame_run",
    ],
    emphasis: "SECOND FAMILY STATE PROBE",
  },
  {
    targetId: "adge_intro_a",
    familyId: "adge_intro",
    appName: "Phase 14 Target Fixture",
    headerTitle: "AUXILIARY DISPLAY GRID ENGINE",
    headerSubtitle: "CANONICAL TARGET A",
    pageTitle: "ADGE INTRO A",
    accentColor: "purple",
    navColor: "golden-tanoi",
    narrative:
      "Deterministic ADGE fixture for the reopened Phase 16 family. This fixture stays transport-oriented while the acceptance path uses the shared family scene.",
    primitiveTags: [
      "top_macro_bands",
      "left_numeric_rail",
      "tabbed_shell",
      "right_action_column",
      "copy_driven_center_payload",
    ],
    emphasis: "REOPENED PHASE 16 TARGET",
  },
  {
    targetId: "adge_intro_b",
    familyId: "adge_intro",
    appName: "Phase 14 Target Fixture",
    headerTitle: "AUXILIARY DISPLAY GRID ENGINE",
    headerSubtitle: "CANONICAL TARGET B",
    pageTitle: "ADGE INTRO B",
    accentColor: "anakiwa",
    navColor: "purple",
    narrative:
      "Second deterministic ADGE fixture proving the family shell survives a payload shift from status grid copy to briefing-style copy.",
    primitiveTags: [
      "top_macro_bands",
      "left_numeric_rail",
      "tabbed_shell",
      "briefing_payload",
      "copy_driven_center_payload",
    ],
    emphasis: "SECOND ADGE STATE PROBE",
  },
  {
    targetId: "periodic_table_matrix",
    familyId: "periodic_table_matrix",
    appName: "Phase 14 Target Fixture",
    headerTitle: "TABLE OF ELEMENTS 99823",
    headerSubtitle: "CANONICAL TARGET",
    pageTitle: "PERIODIC TABLE MATRIX",
    accentColor: "orange-peel",
    navColor: "purple",
    narrative:
      "Deterministic dense-matrix fixture proving the Phase 14 harness can carry a non-sweep family through the same comparison flow.",
    primitiveTags: [
      "top_frame_run",
      "bottom_frame_run",
      "dense_pill_cells",
      "series_dividers",
      "high_count_repetition",
    ],
    emphasis: "DENSE REPETITION FALLBACK",
  },
] as const;

const FIXTURE_SPEC_BY_ID = new Map<string, Phase14TargetFixtureSpec>(
  FIXTURE_SPECS.map((spec) => [spec.targetId, spec]),
);

export const PHASE14_TARGET_FIXTURE_IDS = FIXTURE_SPECS.map((spec) => spec.targetId);

export const resolvePhase14FixtureFamilyId = (targetId: string): string | null => {
  return FIXTURE_SPEC_BY_ID.get(targetId)?.familyId ?? null;
};

export const isPhase14TargetFixtureId = (targetId: string): boolean => {
  return FIXTURE_SPEC_BY_ID.has(targetId);
};

export const buildPhase14FixtureManifest = (targetId: string): Manifest | null => {
  const spec = FIXTURE_SPEC_BY_ID.get(targetId);
  if (!spec) {
    return null;
  }

  const pageWidgets: Widget[] =
    spec.familyId === "periodic_table_matrix"
      ? [
          makeHeaderWidget(`${spec.targetId}_matrix_header`, spec.pageTitle, spec.accentColor),
          makePeriodicMatrixWidget(spec),
          makeBoxWidget(spec),
        ]
      : [
          makeSweepWidget(spec),
          makeBoxWidget(spec),
        ];

  return {
    meta: {
      version: "1.0.0",
      app_name: spec.appName,
      theme: "galaxy",
      lang: "en-US",
      sound_enabled: false,
      force_uppercase: true,
      label_uppercase: true,
      lcars_font_headers: true,
      lcars_font_labels: true,
      lcars_font_text: false,
      visual_language: "strict",
      strict_renderer: "legacy",
    },
    layout: {
      header: {
        title: spec.headerTitle,
        subtitle: spec.headerSubtitle,
        color: spec.accentColor ?? "orange",
      },
      sidebar: {
        position: "hidden",
        items: [
          {
            id: `${spec.targetId}_nav`,
            label: spec.pageTitle,
            target_page: "target",
            color: spec.navColor ?? spec.accentColor ?? "orange",
            segments: [
              { color: spec.navColor ?? spec.accentColor ?? "orange", label: spec.pageTitle },
              { color: spec.accentColor ?? "orange", label: spec.familyId.toUpperCase() },
            ],
          },
        ],
      },
    },
    pages: {
      target: {
        id: "target",
        title: spec.pageTitle,
        rows: [
          {
            id: `${spec.targetId}_row`,
            height: "auto",
            strict_band_role: "content",
            strict_lane_mode: "follow_columns",
            columns: [
              {
                id: `${spec.targetId}_column`,
                width: "1fr",
                strict_lane_role: "content",
                widgets: pageWidgets,
              },
            ],
          },
        ],
      },
    },
  };
};
