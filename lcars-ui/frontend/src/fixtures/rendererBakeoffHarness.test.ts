import {
  parseRendererBakeoffRequest,
  resolveRendererBakeoff,
  RENDERER_BAKEOFF_MODE,
  type RendererBakeoffRequest,
} from "./rendererBakeoffHarness";

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

  test("resolves joern canonical probes honestly as unsupported manifest runs", () => {
    const resolution = resolveRendererBakeoff({
      rendererId: "joern_strict",
      probeId: "seismo_scan_a",
    });

    expect(resolution.entryKind).toBe("manifest");
    expect(resolution.status).toBe("unsupported");
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
    expect(joernSystems.status).toBe("unsupported");
    expect(phase14Overview.entryKind).toBe("unsupported");
    expect(phase14Overview.status).toBe("unsupported");
  });
});
