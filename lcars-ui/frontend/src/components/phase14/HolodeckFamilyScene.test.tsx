import { render, screen } from "@testing-library/react";

import { HolodeckFamilyScene } from "./HolodeckFamilyScene";
import { getHolodeckSceneSpec } from "./holodeckFamilyData";

describe("HolodeckFamilyScene", () => {
  test("renders both canonical targets through the same family scene component", () => {
    const firstScene = getHolodeckSceneSpec("holodeck_programming_a");
    const secondScene = getHolodeckSceneSpec("holodeck_programming_b");

    expect(firstScene).not.toBeNull();
    expect(secondScene).not.toBeNull();

    const firstRender = render(<HolodeckFamilyScene scene={firstScene!} />);
    const firstRoot = screen.getByLabelText("Phase 14 holodeck_programming_a");
    expect(firstRoot).toHaveAttribute("data-phase14-family-recipe", "holodeck_programming");
    expect(firstRoot.querySelector('[data-phase14-payload="dense_console"]')).not.toBeNull();
    expect(firstRoot.querySelectorAll('[data-lcars-shared-primitive="pill"]').length).toBeGreaterThan(0);
    expect(firstRoot.querySelectorAll('[data-lcars-shared-primitive="text-rows"]').length).toBeGreaterThan(0);
    expect(screen.getByText("MR SRT")).toBeInTheDocument();

    firstRender.unmount();

    render(<HolodeckFamilyScene scene={secondScene!} />);
    const secondRoot = screen.getByLabelText("Phase 14 holodeck_programming_b");
    expect(secondRoot).toHaveAttribute("data-phase14-family-recipe", "holodeck_programming");
    expect(secondRoot.querySelector('[data-phase14-payload="roster"]')).not.toBeNull();
    expect(screen.getByText("DAVID LIVINGSTON")).toBeInTheDocument();
  });
});
