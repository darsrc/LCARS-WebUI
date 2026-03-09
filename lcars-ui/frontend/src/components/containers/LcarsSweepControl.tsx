import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";

import { LcarsElbow } from "../shell/LcarsElbow";
import { LcarsBar } from "../shapes/LcarsBar";
import type { LcarsSweepWidget, Widget } from "../../types/contract";
import { GEOMETRY_TOKENS } from "../../theme/geometryTokens";

interface LcarsSweepControlProps {
  widget: LcarsSweepWidget;
  renderWidget: (widget: Widget) => ReactNode;
}

interface OverviewParitySweepProps {
  widget: LcarsSweepWidget;
  title: string | null;
  subtitle: string | null;
  leftPanelChildren: Widget[];
  rightPanelChildren: Widget[];
  railChildren: Widget[];
  renderWidget: (widget: Widget) => ReactNode;
}

const armPercentForWidth = (widthPx: number): number => {
  if (widthPx <= 0) {
    return 24;
  }
  return Math.min(80, Math.max(14, (GEOMETRY_TOKENS.barHeight / widthPx) * 100));
};

const clampSweepRatio = (value: number | undefined): number => {
  if (!Number.isFinite(value)) {
    return 0.62;
  }
  return Math.min(0.8, Math.max(0.2, value as number));
};

const splitSweepContent = (content: Widget[], leftRatio: number): [Widget[], Widget[]] => {
  if (content.length <= 1) {
    return [content, []];
  }
  const splitAt = Math.max(1, Math.min(content.length - 1, Math.round(content.length * leftRatio)));
  return [content.slice(0, splitAt), content.slice(splitAt)];
};

const OverviewParitySweep = ({
  widget,
  title,
  subtitle,
  leftPanelChildren,
  rightPanelChildren,
  railChildren,
  renderWidget,
}: OverviewParitySweepProps) => {
  const isTopSweep = widget.id === "overview_sweep_top";
  return (
    <article
      className={clsx("lcars-overview-parity-sweep", {
        "lcars-overview-parity-sweep-top": isTopSweep,
        "lcars-overview-parity-sweep-bottom": !isTopSweep,
      })}
      data-widget-id={widget.id}
    >
      <div aria-hidden="true" className="lcars-overview-parity-mass">
        {isTopSweep ? (
          <>
            <div className="lcars-overview-mass-piece lcars-overview-top-vertical" />
            <div className="lcars-overview-mass-piece lcars-overview-top-header" />
            <div className="lcars-overview-mass-piece lcars-overview-top-footer" />
            <div className="lcars-overview-mass-piece lcars-overview-top-cap-left" />
            <div className="lcars-overview-mass-piece lcars-overview-top-cap-right" />
          </>
        ) : (
          <>
            <div className="lcars-overview-mass-piece lcars-overview-bottom-shoulder" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-vertical" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-header-left" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-base" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-bridge" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-turn" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-cap-left" />
            <div className="lcars-overview-mass-piece lcars-overview-bottom-cap-right" />
          </>
        )}
      </div>

      {isTopSweep ? (
        <>
          <div className="lcars-overview-parity-label lcars-overview-parity-title">{title}</div>
          <div className="lcars-overview-parity-label lcars-overview-parity-subtitle">{subtitle}</div>
        </>
      ) : (
        <>
          <div className="lcars-overview-parity-label lcars-overview-parity-title2">{title}</div>
          <div className="lcars-overview-parity-label lcars-overview-parity-subtitle2">{subtitle}</div>
        </>
      )}

      <section
        className={clsx("lcars-overview-parity-left", {
          "lcars-overview-parity-empty": leftPanelChildren.length === 0,
        })}
      >
        {leftPanelChildren.map((child) => (
          <div className="lcars-overview-parity-left-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </section>

      <section className="lcars-overview-parity-stack">
        {railChildren.map((child) => (
          <div className="lcars-overview-parity-stack-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </section>

      <aside
        className={clsx("lcars-overview-parity-right", {
          "lcars-overview-parity-empty": rightPanelChildren.length === 0,
        })}
      >
        {rightPanelChildren.map((child) => (
          <div className="lcars-overview-parity-right-child" key={child.id}>
            {renderWidget(child)}
          </div>
        ))}
      </aside>
    </article>
  );
};

export const LcarsSweepControl = ({ widget, renderWidget }: LcarsSweepControlProps) => {
  const verticalArm = armPercentForWidth(widget.width_sidebar);
  const leftRatio = clampSweepRatio(widget.left_width);
  const rightRatio = clampSweepRatio(1 - leftRatio);
  const title = widget.title ?? widget.label ?? null;
  const subtitle = widget.subtitle ?? null;
  const isOverviewParitySweep = widget.id === "overview_sweep_top" || widget.id === "overview_sweep_bottom";

  const headerChildren = widget.header_children ?? [];
  const railChildren = widget.column_inputs ?? widget.rail_children ?? [];

  let leftChildren = widget.left_children ?? [];
  let rightChildren = widget.right_children ?? [];
  if (!widget.left_children && !widget.right_children) {
    const content = widget.content_children ?? widget.children;
    [leftChildren, rightChildren] = splitSweepContent(content, leftRatio);
  }
  if (leftChildren.length === 0 && rightChildren.length > 0) {
    leftChildren = [rightChildren[0], ...leftChildren];
    rightChildren = rightChildren.slice(1);
  }

  const leftTopLabel = widget.reverse ? title : null;
  const leftBottomLabel = widget.reverse ? null : subtitle;
  const rightTopLabel = widget.reverse ? null : title;
  const rightBottomLabel = widget.reverse ? subtitle : null;

  const leftHeaderChildren = widget.reverse ? headerChildren : [];
  const rightHeaderChildren = widget.reverse ? [] : headerChildren;
  const leftPanelChildren = [...leftHeaderChildren, ...leftChildren];
  const rightPanelChildren = [...rightHeaderChildren, ...rightChildren];

  if (isOverviewParitySweep) {
    return (
      <OverviewParitySweep
        leftPanelChildren={leftPanelChildren}
        railChildren={railChildren}
        renderWidget={renderWidget}
        rightPanelChildren={rightPanelChildren}
        subtitle={subtitle}
        title={title}
        widget={widget}
      />
    );
  }

  return (
    <article
      className={clsx("lcars-sweep-control", {
        "lcars-sweep-reverse": widget.reverse,
        "lcars-sweep-overview-parity": isOverviewParitySweep,
      })}
      data-widget-id={widget.id}
      style={
        {
          "--lcars-sweep-sidebar-width": `${widget.width_sidebar}px`,
          "--lcars-sweep-left-fr": `${leftRatio}fr`,
          "--lcars-sweep-right-fr": `${rightRatio}fr`,
        } as CSSProperties
      }
    >
      <section className="lcars-sweep-panel lcars-sweep-panel-left">
        {leftTopLabel ? (
          <LcarsBar className="lcars-sweep-panel-bar lcars-sweep-panel-bar-top" color={widget.color} label={leftTopLabel} roundedStart />
        ) : null}
        <div
          className={clsx("lcars-sweep-content-main lcars-sweep-content-left", {
            "lcars-sweep-content-empty": leftPanelChildren.length === 0,
          })}
        >
          {leftPanelChildren.map((child) => (
            <div className="lcars-sweep-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </div>
        {leftBottomLabel ? (
          <LcarsBar className="lcars-sweep-panel-bar lcars-sweep-panel-bar-bottom" color={widget.color} label={leftBottomLabel} roundedStart />
        ) : null}
      </section>

      <section className="lcars-sweep-sidebar">
        <div className="lcars-sweep-top-corner">
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={verticalArm}
            color={widget.color}
            corner={widget.reverse ? "bottom-left" : "top-left"}
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        </div>
        <div className="lcars-sweep-center-column">
          <LcarsBar className="lcars-sweep-sidebar-rail" color={widget.color} orientation="vertical" roundedEnd />
          <div className="lcars-sweep-rail-controls">
            {railChildren.map((child) => (
              <div className="lcars-sweep-rail-child lcars-sweep-column-child" key={child.id}>
                {renderWidget(child)}
              </div>
            ))}
          </div>
        </div>
        <div className="lcars-sweep-bottom-corner">
          <LcarsElbow
            armHorizontal={GEOMETRY_TOKENS.elbowArmHorizontal}
            armVertical={verticalArm}
            color={widget.color}
            corner={widget.reverse ? "top-left" : "bottom-left"}
            innerRadius={GEOMETRY_TOKENS.elbowInnerRadius}
          />
        </div>
      </section>

      <section className="lcars-sweep-panel lcars-sweep-panel-right">
        {rightTopLabel ? (
          <LcarsBar
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-top"
            color={widget.color}
            label={rightTopLabel}
            roundedEnd
          />
        ) : null}
        <aside
          className={clsx("lcars-sweep-content-terminal lcars-sweep-content-right", {
            "lcars-sweep-content-empty": rightPanelChildren.length === 0,
          })}
        >
          {rightPanelChildren.map((child) => (
            <div className="lcars-sweep-content-terminal-child" key={child.id}>
              {renderWidget(child)}
            </div>
          ))}
        </aside>
        {rightBottomLabel ? (
          <LcarsBar
            className="lcars-sweep-panel-bar lcars-sweep-panel-bar-bottom"
            color={widget.color}
            label={rightBottomLabel}
            roundedEnd
          />
        ) : null}
      </section>
    </article>
  );
};
