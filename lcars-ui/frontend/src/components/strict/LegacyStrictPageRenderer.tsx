import { type CSSProperties, type ReactNode } from "react";

import {
  LcarsBarRunPrimitive,
  anchoredBarRunFromRecipe,
  barRunFromCapsuleSpec,
} from "../primitives/lcarsSharedScaffoldPrimitives";
import {
  composeStrictBandScaffold,
  partitionStrictLaneWidgets,
} from "../primitives/lcarsStrictBandScaffold";
import type { LcarsColor, Page, Widget } from "../../types/contract";

interface StrictLaneHeaderModel {
  segments: ReturnType<typeof anchoredBarRunFromRecipe>;
}

interface StrictLaneCapsuleModel {
  segments: ReturnType<typeof barRunFromCapsuleSpec>;
}

interface LegacyStrictPageRendererProps {
  page: Page;
  pageTitleColor: LcarsColor;
  renderWidget: (widget: Widget) => ReactNode;
}

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
  return {
    segments: anchoredBarRunFromRecipe({
      fill: accentColor,
      height: 30,
      widths: [
        isTitleBand ? 140 : hasTerminal ? 120 : 100,
        hasSecondary ? 60 : 40,
        isTitleBand ? 360 : hasTerminal ? 240 : 280,
        hasTerminal ? 50 : 36,
      ],
      gap: 12,
      label: isTitleBand ? pageTitle : null,
      labelAlign: "right",
      labelSegmentIndex: 2,
      roundedStart: true,
      roundedEnd: true,
    }),
  };
};

const composeLaneCapsuleModel = ({
  accentColor,
  label,
  count,
  width,
}: {
  accentColor: LcarsColor;
  label: string;
  count: number;
  width: number;
}): StrictLaneCapsuleModel => {
  return {
    segments: barRunFromCapsuleSpec({
      x: 0,
      y: 0,
      width,
      height: 32,
      fill: accentColor,
      label: `${label} ${count}`,
      textAnchor: "end",
      labelOffsetX: 16,
      labelOffsetY: 6,
    }),
  };
};

export const LegacyStrictPageRenderer = ({
  page,
  pageTitleColor,
  renderWidget,
}: LegacyStrictPageRendererProps) => {
  const strictBands = page.rows.map((row) => composeStrictBandScaffold(row, page.title));

  return (
    <div className="lcars-strict-page" data-lcars-page={page.id}>
      {strictBands.map((band, bandIndex) => {
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

        const sweepBars = !isTitleBand && bandIndex > 0
          ? [
              { color: pageTitleColor as LcarsColor, thickness: "thin" as const },
              { color: pageTitleColor as LcarsColor, thickness: "normal" as const },
              { color: pageTitleColor as LcarsColor, thickness: "thin" as const },
            ]
          : null;

        return (
          <section
            className={`lcars-strict-band${isTitleBand ? " lcars-strict-band-title" : ""}`}
            data-lcars-band={band.id}
            data-lcars-band-role={band.role}
            key={band.id}
            style={hasInlineBandStyle ? bandStyle : undefined}
          >
            {sweepBars ? (
              <div className="lcars-strict-band-sweep-bars">
                {sweepBars.map((bar, i) => (
                  <div
                    className={`lcars-sweep-bar lcars-sweep-bar-${bar.thickness}`}
                    key={`sweep-${bandIndex}-${i}`}
                    style={{ "--lcars-accent": `var(--lcars-color-${bar.color})` } as CSSProperties}
                  />
                ))}
              </div>
            ) : null}

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
                const terminalCap = hasRailTerminal
                  ? composeLaneCapsuleModel({
                      accentColor: laneAccent,
                      label: "TERMINAL",
                      count: railTerminalWidgets.length,
                      width: 176,
                    })
                  : null;
                const stripCap = stripTerminalWidgets.length > 0
                  ? composeLaneCapsuleModel({
                      accentColor: laneAccent,
                      label: "AUXILIARY",
                      count: stripTerminalWidgets.length,
                      width: 208,
                    })
                  : null;

                return (
                  <article
                    className={laneClass}
                    data-lcars-lane={lane.id}
                    data-lcars-lane-role={lane.role}
                    key={lane.id}
                  >
                    <div
                      className="lcars-strict-lane-header"
                      data-lcars-lane-header-rhythm="oracle-segment-run"
                    >
                      <LcarsBarRunPrimitive
                        className="lcars-strict-lane-header-bar"
                        primitive="segment-run"
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
                          {terminalCap ? (
                            <div
                              className="lcars-strict-lane-terminal-cap"
                              data-lcars-capsule-rhythm="oracle-capsule-bar"
                            >
                              <LcarsBarRunPrimitive
                                className="lcars-strict-lane-terminal-cap-bar"
                                primitive="capsule-bar"
                                segments={terminalCap.segments}
                              />
                            </div>
                          ) : null}
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
                        {stripCap ? (
                          <div
                            className="lcars-strict-lane-strip-cap"
                            data-lcars-capsule-rhythm="oracle-capsule-bar"
                          >
                            <LcarsBarRunPrimitive
                              className="lcars-strict-lane-strip-cap-bar"
                              primitive="capsule-bar"
                              segments={stripCap.segments}
                            />
                          </div>
                        ) : null}
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
