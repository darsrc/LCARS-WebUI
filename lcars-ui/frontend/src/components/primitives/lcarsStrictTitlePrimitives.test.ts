import {
  buildChartFrameSpec,
  buildFrameStartTitleSpec,
  buildReadoutFrameSpec,
} from "./lcarsStrictTitlePrimitives";

describe("lcarsStrictTitlePrimitives", () => {
  test("builds frame-start title specs from trimmed labels", () => {
    expect(
      buildFrameStartTitleSpec({
        label: "  WARP CURVE  ",
        className: "lcars-chart-frame-title",
        offsetX: 6,
        offsetY: -4,
      }),
    ).toEqual({
      label: "WARP CURVE",
      anchor: "frame-start",
      className: "lcars-chart-frame-title",
      offsetX: 6,
      offsetY: -4,
    });
    expect(buildFrameStartTitleSpec({ label: "   " })).toBeNull();
  });

  test("builds readout frame specs with shared title anchoring", () => {
    expect(buildReadoutFrameSpec({ label: "Core Output" })).toEqual({
      bodyPadding: "0.55rem 0.75rem 0.45rem",
      title: {
        label: "Core Output",
        anchor: "frame-start",
        className: "lcars-readout-frame-title",
        offsetX: 0,
        offsetY: 0,
      },
      titleReserve: "1.35rem",
    });
    expect(buildReadoutFrameSpec({ label: " " }).title).toBeNull();
    expect(buildReadoutFrameSpec({ label: " " }).titleReserve).toBe("0px");
  });

  test("builds chart frame specs with shared start anchoring and overrides", () => {
    expect(
      buildChartFrameSpec({
        label: "Plot 1",
        className: "lcars-histogram-title",
        titleReserve: "1.95rem",
        offsetX: 6,
      }),
    ).toEqual({
      bodyPadding: "0",
      title: {
        label: "Plot 1",
        anchor: "frame-start",
        className: "lcars-histogram-title",
        offsetX: 6,
        offsetY: 0,
      },
      titleReserve: "1.95rem",
    });
  });
});
