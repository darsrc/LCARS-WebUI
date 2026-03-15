import { render, screen } from "@testing-library/react";

import { SeismographicFamilyScene } from "./SeismographicFamilyScene";
import { getSeismographicSceneSpec } from "./seismographicFamilyData";

describe("SeismographicFamilyScene", () => {
  test("renders both canonical targets through the same family scene component", () => {
    const firstScene = getSeismographicSceneSpec("seismo_scan_a");
    const secondScene = getSeismographicSceneSpec("seismo_scan_b");

    expect(firstScene).not.toBeNull();
    expect(secondScene).not.toBeNull();

    const firstRender = render(<SeismographicFamilyScene scene={firstScene!} />);
    const firstRoot = screen.getByLabelText("Phase 14 seismo_scan_a");
    expect(firstRoot).toHaveAttribute("data-phase14-family-recipe", "seismographic_scan");
    expect(firstRoot).toHaveAttribute("data-phase14-target-id", "seismo_scan_a");
    expect(firstRoot.querySelector('[data-phase14-payload="waveform"]')).not.toBeNull();
    expect(firstRoot.querySelectorAll('[data-lcars-shared-primitive="chart-frame"]').length).toBe(1);
    expect(firstRoot.querySelectorAll('[data-lcars-shared-primitive="segment-run"]').length).toBeGreaterThan(0);
    expect(firstRoot.querySelectorAll('[data-lcars-shared-primitive="text-rows"]').length).toBeGreaterThan(0);
    expect(screen.getByText("PLANETARY SENSOR ARRAY ON LINE")).toBeInTheDocument();

    firstRender.unmount();

    render(<SeismographicFamilyScene scene={secondScene!} />);
    const secondRoot = screen.getByLabelText("Phase 14 seismo_scan_b");
    expect(secondRoot).toHaveAttribute("data-phase14-family-recipe", "seismographic_scan");
    expect(secondRoot).toHaveAttribute("data-phase14-target-id", "seismo_scan_b");
    expect(secondRoot.querySelector('[data-phase14-payload="eruption_map"]')).not.toBeNull();
    expect(secondRoot.querySelectorAll('[data-lcars-shared-primitive="chart-frame"]').length).toBe(1);
    expect(screen.getByText("ERUPTION SITES")).toBeInTheDocument();
  });
});
