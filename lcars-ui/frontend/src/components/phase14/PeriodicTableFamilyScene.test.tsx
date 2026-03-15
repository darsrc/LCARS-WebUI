import { render, screen } from "@testing-library/react";

import { PeriodicTableFamilyScene } from "./PeriodicTableFamilyScene";
import { getPeriodicTableSceneSpec } from "./periodicTableFamilyData";

describe("PeriodicTableFamilyScene", () => {
  test("renders the canonical dense matrix through the Periodic family path", () => {
    const scene = getPeriodicTableSceneSpec("periodic_table_matrix");
    expect(scene).not.toBeNull();

    render(<PeriodicTableFamilyScene scene={scene!} />);

    const root = screen.getByLabelText("Phase 14 periodic_table_matrix");
    expect(root).toHaveAttribute("data-phase14-family-recipe", "periodic_table_matrix");
    expect(root).toHaveAttribute("data-phase14-target-id", "periodic_table_matrix");
    expect(root.querySelector('[data-phase14-payload="dense_matrix"]')).not.toBeNull();
    expect(root.querySelectorAll('[data-phase14-primitive="matrix_cell"]')).toHaveLength(scene!.cells.length);
    expect(root.querySelectorAll(".phase14-periodic-series-bar")).toHaveLength(scene!.series.length);
    expect(root.querySelectorAll(".phase14-periodic-footer-copy text")).toHaveLength(scene!.footerCopy[0].rows.length);
    expect(root.querySelectorAll('[data-lcars-shared-primitive="segment-run"]').length).toBeGreaterThan(0);
    expect(root.querySelectorAll('[data-lcars-shared-primitive="text-rows"]').length).toBeGreaterThan(0);
    expect(screen.getByText("TABLE OF ELEMENTS 99823")).toBeInTheDocument();
    expect(screen.getByText("HYPERSONIC SERIES")).toBeInTheDocument();
    expect(screen.getByText("META SERIES")).toBeInTheDocument();
    expect(screen.getByText("THIS TABLE LISTS THOSE ELEMENTS UTILISED BY THE")).toBeInTheDocument();
    expect(screen.getByText("Wy")).toBeInTheDocument();
  });

  test("rejects unknown targets instead of inventing a fallback dense family scene", () => {
    expect(getPeriodicTableSceneSpec("unknown_target")).toBeNull();
  });
});
