import { type CSSProperties, type ReactNode } from "react";

import {
  segmentedBarRunFromRectSegments,
  type LcarsRectSegmentSpec,
} from "../primitives/lcarsGeometryPrimitives";
import { LcarsSegmentedBar } from "../shapes/LcarsSegmentedBar";
import type { LcarsColor, Page, Row, Widget } from "../../types/contract";

const STRICT_TERMINAL_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "button",
  "toggle",
  "lcars_checkbox",
  "select",
  "lcars_radio",
  "lcars_radio_toggle",
  "text_input",
  "number_input",
  "form",
  "mic_button",
]);

const STRICT_CONTAINER_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "lcars_box",
  "lcars_sweep",
  "lcars_bracket",
  "lcars_header",
]);

const STRICT_SECONDARY_WIDGET_TYPES: ReadonlySet<Widget["type"]> = new Set([
  "status_tile",
  "progress_bar",
  "gauge",
  "alert",
]);

interface StrictLanePartition {
  terminalWidgets: Widget[];
  primaryWidgets: Widget[];
  secondaryWidgets: Widget[];
}

interface StrictLaneModel {
  id: string;
  width: string;
  widgets: Widget[];
}

interface StrictBandModel {
  id: string;
  height: string;
  lanes: StrictLaneModel[];
  isTitleBand: boolean;
}

interface StrictLaneHeaderModel {
  segments: ReturnType<typeof segmentedBarRunFromRectSegments>;
  usesOracleSegmentRun: boolean;
}

interface LegacyStrictPageRendererProps {
  page: Page;
  pageTitleColor: LcarsColor;
  renderWidget: (widget: Widget) => ReactNode;
}

const partitionStrictLaneWidgets = (widgets: Widget[]): StrictLanePartition => {
  const terminalWidgets: Widget[] = [];
  const primaryWidgets: Widget[] = [];
  const secondaryWidgets: Widget[] = [];

  for (const widget of widgets) {
    if (STRICT_TERMINAL_WIDGET_TYPES.has(widget.type)) {
      terminalWidgets.push(widget);
      continue;
    }
    if (STRICT_CONTAINER_WIDGET_TYPES.has(widget.type)) {
      primaryWidgets.push(widget);
      continue;
    }
    if (STRICT_SECONDARY_WIDGET_TYPES.has(widget.type)) {
      secondaryWidgets.push(widget);
      continue;
    }
    primaryWidgets.push(widget);
  }

  if (primaryWidgets.length === 0 && secondaryWidgets.length > 0) {
    primaryWidgets.push(secondaryWidgets.shift() as Widget);
  }

  return {
    terminalWidgets,
    primaryWidgets,
    secondaryWidgets,
  };
};

const composeStrictLanes = (row: Row): StrictLaneModel[] => {
  const lanes: StrictLaneModel[] = row.columns.map((column) => ({
    id: column.id,
    width: column.width,
    widgets: column.widgets,
  }));

  if (lanes.length !== 1) {
    return lanes;
  }

  const [singleLane] = lanes;
  const partition = partitionStrictLaneWidgets(singleLane.widgets);
  const coreWidgets = [...partition.primaryWidgets];
  const supportWidgets = [...partition.terminalWidgets, ...partition.secondaryWidgets];

  if (coreWidgets.length === 0 || supportWidgets.length === 0) {
    return lanes;
  }
  if (coreWidgets.length + supportWidgets.length < 4) {
    return lanes;
  }

  return [
    {
      id: `${singleLane.id}-core`,
      width: "minmax(0, 1.58fr)",
      widgets: coreWidgets,
    },
    {
      id: `${singleLane.id}-support`,
      width: "minmax(0, 1fr)",
      widgets: supportWidgets,
    },
  ];
};

const composeStrictBands = (rows: Row[], pageTitle: string): StrictBandModel[] => {
  const isPageTitleSweep = (widget: Widget): boolean => {
    return (
      widget.type === "lcars_sweep" &&
      typeof widget.title === "string" &&
      widget.title === pageTitle
    );
  };
  return rows.map((row) => {
    const lanes = composeStrictLanes(row);
    return {
      id: row.id,
      height: row.height,
      lanes,
      isTitleBand: lanes.some((lane) => lane.widgets.some((widget) => isPageTitleSweep(widget))),
    };
  });
};

const composeLaneHeaderRectRun = ({
  accentColor,
  hasTerminal,
  hasSecondary,
  isTitleBand,
}: {
  accentColor: LcarsColor;
  hasTerminal: boolean;
  hasSecondary: boolean;
  isTitleBand: boolean;
}): LcarsRectSegmentSpec[] => {
  const segmentHeight = 36;
  const segmentGap = 12;
  const leadingCapWidth = isTitleBand ? 126 : hasTerminal ? 110 : 90;
  const bridgeWidth = hasSecondary ? 52 : 34;
  const titleBodyWidth = isTitleBand ? 328 : hasTerminal ? 214 : 256;
  const terminalCapWidth = hasTerminal ? 44 : 32;
  const widths = [leadingCapWidth, bridgeWidth, titleBodyWidth, terminalCapWidth];
  let x = 0;

  return widths.map((width, index) => {
    const segment: LcarsRectSegmentSpec = {
      x,
      y: 0,
      width,
      height: segmentHeight,
      fill: accentColor,
    };
    if (index === 0 || index === widths.length - 1) {
      segment.rx = segmentHeight / 2;
      segment.ry = segmentHeight / 2;
    }
    x += width + segmentGap;
    return segment;
  });
};

const composeLaneHeaderModel = ({
  accentColor,
  hasTerminal,
  hasSecondary,
  isTitleBand,
  pageTitle,
}: {
  accentColor: LcarsColor;
  hasTerminal: boolean;
  hasSecondary: boolean;
  isTitleBand: boolean;
  pageTitle: string;
}): StrictLaneHeaderModel => {
  const rectRun = composeLaneHeaderRectRun({
    accentColor,
    hasTerminal,
    hasSecondary,
    isTitleBand,
  });
  return {
    segments: segmentedBarRunFromRectSegments(rectRun, {
      label: isTitleBand ? pageTitle : null,
      labelAlign: "right",
      labelSegmentIndex: 2,
    }),
    usesOracleSegmentRun: true,
  };
};

export const LegacyStrictPageRenderer = ({
  page,
  pageTitleColor,
  renderWidget,
}: LegacyStrictPageRendererProps) => {
  const strictBands = composeStrictBands(page.rows, page.title);

  return (
    <div className="lcars-strict-page" data-lcars-page={page.id}>
      {strictBands.map((band) => {
        const bandStyle: CSSProperties = {};
        if (band.lanes.length > 1) {
          (bandStyle as CSSProperties & Record<string, string>)["--lcars-strict-band-columns"] =
            band.lanes.map((lane) => lane.width).join(" ");
        }
        if (band.height !== "auto") {
          bandStyle.minHeight = band.height;
        }
        const hasInlineBandStyle = Object.keys(bandStyle).length > 0;
        const isTitleBand = band.isTitleBand;
        return (
          <section
            className={`lcars-strict-band${isTitleBand ? " lcars-strict-band-title" : ""}`}
            data-lcars-band={band.id}
            key={band.id}
            style={hasInlineBandStyle ? bandStyle : undefined}
          >
            <div className="lcars-strict-band-grid">
              {band.lanes.map((lane) => {
                const lanePartition = partitionStrictLaneWidgets(lane.widgets);
                const laneAccent =
                  lane.widgets.find((widget) => typeof widget.color === "string")?.color ?? pageTitleColor;
                const hasRailTerminal = lanePartition.terminalWidgets.length > 0;
                const laneHeader = composeLaneHeaderModel({
                  accentColor: laneAccent,
                  hasTerminal: hasRailTerminal,
                  hasSecondary: lanePartition.secondaryWidgets.length > 0,
                  isTitleBand,
                  pageTitle: page.title,
                });
                const laneClass = [
                  "lcars-strict-lane",
                  "lcars-strict-lane-terminal-end",
                  hasRailTerminal
                    ? "lcars-strict-lane-has-terminal"
                    : "lcars-strict-lane-no-terminal",
                  lanePartition.secondaryWidgets.length > 0
                    ? "lcars-strict-lane-has-secondary"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const railTerminalWidgets = lanePartition.terminalWidgets.slice(0, 4);
                const stripTerminalWidgets = lanePartition.terminalWidgets.slice(4);

                return (
                  <article className={laneClass} data-lcars-lane={lane.id} key={lane.id}>
                    <div
                      className="lcars-strict-lane-header"
                      data-lcars-lane-header-rhythm={
                        laneHeader.usesOracleSegmentRun ? "oracle-segment-run" : "legacy-bar"
                      }
                    >
                      <LcarsSegmentedBar
                        className="lcars-strict-lane-header-bar"
                        segments={laneHeader.segments}
                      />
                    </div>

                    <div className="lcars-strict-lane-body">
                      <div className="lcars-strict-lane-core">
                        {lanePartition.primaryWidgets.length > 0 ? (
                          <div className="lcars-strict-lane-core-primary">
                            {lanePartition.primaryWidgets.map((widget) => (
                              <div className="lcars-strict-lane-core-item" key={widget.id}>
                                {renderWidget(widget)}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {lanePartition.secondaryWidgets.length > 0 ? (
                          <div className="lcars-strict-lane-core-secondary">
                            {lanePartition.secondaryWidgets.map((widget) => (
                              <div className="lcars-strict-lane-core-item" key={widget.id}>
                                {renderWidget(widget)}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {hasRailTerminal ? (
                        <aside className="lcars-strict-lane-terminal">
                          {railTerminalWidgets.map((widget) => (
                            <div className="lcars-strict-lane-terminal-item" key={widget.id}>
                              {renderWidget(widget)}
                            </div>
                          ))}
                        </aside>
                      ) : null}
                    </div>

                    {stripTerminalWidgets.length > 0 ? (
                      <div className="lcars-strict-lane-strip">
                        {stripTerminalWidgets.map((widget) => (
                          <div className="lcars-strict-lane-strip-item" key={widget.id}>
                            {renderWidget(widget)}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
