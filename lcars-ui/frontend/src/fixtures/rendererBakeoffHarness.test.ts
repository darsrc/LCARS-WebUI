import {
  parseRendererBakeoffRequest,
  resolveRendererBakeoff,
} from "./rendererBakeoffHarness";
import {
  rendererBakeoffContenderProbeSummaries,
  rendererBakeoffSupportMatrix,
} from "./rendererBakeoffSupportMatrix";

const manifestMatrixEntry = ({
  familyId,
  probeId,
  probeKind,
  rendererId,
  strictRenderer,
}: {
  familyId: string | null;
  probeId: string;
  probeKind: "canonical" | "product_smoke";
  rendererId: "legacy_strict" | "joern_strict";
  strictRenderer: "legacy" | "joern";
}) => ({
  active_page_id: probeKind === "canonical" ? "target" : probeId,
  adapter_kind:
    probeKind === "canonical" ? "canonical_strict_fixture_manifest" : "product_smoke_manifest",
  entry_kind: "manifest",
  family_id: familyId,
  probe_id: probeId,
  probe_kind: probeKind,
  renderer_id: rendererId,
  status: "rendered",
  strict_renderer: strictRenderer,
});

const phase14SceneEntry = ({
  entryKind,
  familyId,
  probeId,
}: {
  entryKind: "seismographic_scene" | "holodeck_scene" | "periodic_table_scene";
  familyId: string;
  probeId: string;
}) => ({
  active_page_id: null,
  adapter_kind: "phase14_family_scene",
  entry_kind: entryKind,
  family_id: familyId,
  probe_id: probeId,
  probe_kind: "canonical" as const,
  renderer_id: "phase14_family" as const,
  status: "rendered" as const,
  strict_renderer: null,
});

const unsupportedEntry = (probeId: "overview" | "systems") => ({
  active_page_id: null,
  adapter_kind: "unsupported_boundary" as const,
  entry_kind: "unsupported",
  family_id: null,
  probe_id: probeId,
  probe_kind: "product_smoke" as const,
  renderer_id: "phase14_family" as const,
  status: "unsupported" as const,
  strict_renderer: null,
});

describe("renderer bake-off harness", () => {
  test("parses a valid renderer bake-off request", () => {
    const parsed = parseRendererBakeoffRequest(
      "?comparisonHarness=renderer-bakeoff&renderer_id=legacy_strict&probe_id=seismo_scan_a",
    );

    expect(parsed).toEqual({
      mode: "active",
      request: {
        rendererId: "legacy_strict",
        probeId: "seismo_scan_a",
      },
    });
  });

  test("rejects invalid renderer bake-off requests explicitly", () => {
    const parsed = parseRendererBakeoffRequest(
      "?comparisonHarness=renderer-bakeoff&renderer_id=missing&probe_id=seismo_scan_a",
    );

    expect(parsed.mode).toBe("error");
    expect(parsed.message).toContain("Unknown renderer bake-off renderer_id");
  });

  test("resolves legacy canonical probes through deterministic manifest fixtures", () => {
    const resolution = resolveRendererBakeoff({
      rendererId: "legacy_strict",
      probeId: "seismo_scan_a",
    });

    expect(resolution.entryKind).toBe("manifest");
    expect(resolution.status).toBe("rendered");
    if (resolution.entryKind !== "manifest") {
      throw new Error("Expected manifest resolution");
    }
    expect(resolution.activePageId).toBe("target");
    expect(resolution.manifest.meta.strict_renderer).toBe("legacy");
    expect(resolution.manifest.pages.target.id).toBe("target");
  });

  test("resolves joern canonical probes through its own strict path when the fixed-probe page is supported", () => {
    const resolution = resolveRendererBakeoff({
      rendererId: "joern_strict",
      probeId: "seismo_scan_a",
    });

    expect(resolution.entryKind).toBe("manifest");
    expect(resolution.status).toBe("rendered");
    if (resolution.entryKind !== "manifest") {
      throw new Error("Expected manifest resolution");
    }
    expect(resolution.manifest.meta.strict_renderer).toBe("joern");
    expect(resolution.activePageId).toBe("target");
  });

  test("resolves phase14 family canonical probes through family scenes", () => {
    const resolution = resolveRendererBakeoff({
      rendererId: "phase14_family",
      probeId: "holodeck_programming_a",
    });

    expect(resolution.entryKind).toBe("holodeck_scene");
    expect(resolution.status).toBe("rendered");
    expect(resolution.familyId).toBe("holodeck_programming");
  });

  test("resolves product-smoke probes without biasing toward phase14 family routing", () => {
    const joernOverview = resolveRendererBakeoff({
      rendererId: "joern_strict",
      probeId: "overview",
    });
    const joernSystems = resolveRendererBakeoff({
      rendererId: "joern_strict",
      probeId: "systems",
    });
    const phase14Overview = resolveRendererBakeoff({
      rendererId: "phase14_family",
      probeId: "overview",
    });

    expect(joernOverview.entryKind).toBe("manifest");
    expect(joernOverview.status).toBe("rendered");
    expect(joernSystems.entryKind).toBe("manifest");
    expect(joernSystems.status).toBe("rendered");
    expect(phase14Overview.entryKind).toBe("unsupported");
    expect(phase14Overview.status).toBe("unsupported");
  });

  test("freezes the real support matrix across the fixed probe set", () => {
    expect(rendererBakeoffSupportMatrix()).toEqual([
      manifestMatrixEntry({
        familyId: "seismographic_scan",
        probeId: "seismo_scan_a",
        probeKind: "canonical",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: "seismographic_scan",
        probeId: "seismo_scan_b",
        probeKind: "canonical",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: "holodeck_programming",
        probeId: "holodeck_programming_a",
        probeKind: "canonical",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: "periodic_table_matrix",
        probeId: "periodic_table_matrix",
        probeKind: "canonical",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: "holodeck_programming",
        probeId: "holodeck_programming_b",
        probeKind: "canonical",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: null,
        probeId: "overview",
        probeKind: "product_smoke",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: null,
        probeId: "systems",
        probeKind: "product_smoke",
        rendererId: "legacy_strict",
        strictRenderer: "legacy",
      }),
      manifestMatrixEntry({
        familyId: "seismographic_scan",
        probeId: "seismo_scan_a",
        probeKind: "canonical",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      manifestMatrixEntry({
        familyId: "seismographic_scan",
        probeId: "seismo_scan_b",
        probeKind: "canonical",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      manifestMatrixEntry({
        familyId: "holodeck_programming",
        probeId: "holodeck_programming_a",
        probeKind: "canonical",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      manifestMatrixEntry({
        familyId: "periodic_table_matrix",
        probeId: "periodic_table_matrix",
        probeKind: "canonical",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      manifestMatrixEntry({
        familyId: "holodeck_programming",
        probeId: "holodeck_programming_b",
        probeKind: "canonical",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      manifestMatrixEntry({
        familyId: null,
        probeId: "overview",
        probeKind: "product_smoke",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      manifestMatrixEntry({
        familyId: null,
        probeId: "systems",
        probeKind: "product_smoke",
        rendererId: "joern_strict",
        strictRenderer: "joern",
      }),
      phase14SceneEntry({
        entryKind: "seismographic_scene",
        familyId: "seismographic_scan",
        probeId: "seismo_scan_a",
      }),
      phase14SceneEntry({
        entryKind: "seismographic_scene",
        familyId: "seismographic_scan",
        probeId: "seismo_scan_b",
      }),
      phase14SceneEntry({
        entryKind: "holodeck_scene",
        familyId: "holodeck_programming",
        probeId: "holodeck_programming_a",
      }),
      phase14SceneEntry({
        entryKind: "periodic_table_scene",
        familyId: "periodic_table_matrix",
        probeId: "periodic_table_matrix",
      }),
      phase14SceneEntry({
        entryKind: "holodeck_scene",
        familyId: "holodeck_programming",
        probeId: "holodeck_programming_b",
      }),
      unsupportedEntry("overview"),
      unsupportedEntry("systems"),
    ]);
  });

  test("summarizes fixed-probe outcomes by contender", () => {
    expect(rendererBakeoffContenderProbeSummaries()).toEqual([
      {
        error: [],
        rendered: [
          "seismo_scan_a",
          "seismo_scan_b",
          "holodeck_programming_a",
          "periodic_table_matrix",
          "holodeck_programming_b",
          "overview",
          "systems",
        ],
        renderer_id: "legacy_strict",
        unsupported: [],
      },
      {
        error: [],
        rendered: [
          "seismo_scan_a",
          "seismo_scan_b",
          "holodeck_programming_a",
          "periodic_table_matrix",
          "holodeck_programming_b",
          "overview",
          "systems",
        ],
        renderer_id: "joern_strict",
        unsupported: [],
      },
      {
        error: [],
        rendered: [
          "seismo_scan_a",
          "seismo_scan_b",
          "holodeck_programming_a",
          "periodic_table_matrix",
          "holodeck_programming_b",
        ],
        renderer_id: "phase14_family",
        unsupported: ["overview", "systems"],
      },
    ]);
  });
});
