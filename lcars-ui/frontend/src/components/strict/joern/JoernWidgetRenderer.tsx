import { useMemo, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { marked } from "marked";

import type {
  ButtonWidget,
  LcarsBoxWidget,
  LcarsBracketWidget,
  LcarsHeaderWidget,
  LcarsSweepWidget,
  MarkdownWidget,
  Page,
  StatusTileWidget,
  TableWidget,
  TextWidget,
  Widget,
} from "../../../types/contract";
import { JoernLineChartWidget } from "./JoernLineChartWidget";
import { joernBgClass, joernColorClass, joernInlineBackground } from "./joernColors";

interface JoernWidgetRendererProps {
  page: Page;
  widget: Widget;
  onAction: (actionId: string, value: unknown) => void;
}

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

const JoernUnsupportedWidget = ({ page, widget }: { page: Page; widget: Widget }) => {
  return (
    <article
      className="lcars-joern-unsupported"
      data-lcars-joern-unsupported="widget"
      data-lcars-page={page.id}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
    >
      <strong>Unsupported Joern Widget</strong>
      <p>
        {widget.type} ({widget.id})
      </p>
    </article>
  );
};

const JoernTextWidget = ({ widget }: { widget: TextWidget }) => {
  const className =
    widget.size === "h1"
      ? "huge"
      : widget.size === "h2"
        ? "large"
        : widget.size === "mono"
          ? "bottom-right"
          : "right";
  return (
    <div className={clsx("joern-lcars-text-box", className, joernColorClass(widget.color))}>
      {widget.content}
    </div>
  );
};

const JoernMarkdownWidget = ({ widget }: { widget: MarkdownWidget }) => {
  const rendered = useMemo(() => {
    const parsed = marked.parse(widget.content);
    const html = typeof parsed === "string" ? parsed : "";
    return DOMPurify.sanitize(html);
  }, [widget.content]);

  return <div className="lcars-joern-markdown-body" dangerouslySetInnerHTML={{ __html: rendered }} />;
};

const JoernButtonWidget = ({
  widget,
  onAction,
}: {
  widget: ButtonWidget;
  onAction: (actionId: string, value: unknown) => void;
}) => {
  const label = (widget.label ?? "").trim().length > 0 ? widget.label : "\u00a0";
  return (
    <button
      className={clsx("joern-lcars-element", "button", joernBgClass(widget.color))}
      data-widget-id={widget.id}
      disabled={widget.disabled}
      onClick={() => onAction(widget.action_id, null)}
      style={joernInlineBackground(widget.color)}
      type="button"
    >
      <span className={clsx("joern-lcars-text-box", "centered", joernColorClass(widget.color))}>{label}</span>
    </button>
  );
};

const JoernStatusTileWidget = ({ widget }: { widget: StatusTileWidget }) => {
  return (
    <article className={clsx("lcars-status-tile", `lcars-status-${widget.status}`)} data-widget-id={widget.id}>
      <div className="lcars-status-line">
        <span aria-hidden="true" className="lcars-status-dot" />
        <strong>{widget.label ?? widget.id}</strong>
      </div>
      <div className="joern-lcars-text-box right">{widget.value}</div>
    </article>
  );
};

const JoernTableWidget = ({ widget }: { widget: TableWidget }) => {
  return (
    <div className="lcars-control-table" data-widget-id={widget.id}>
      <div className="lcars-control-table-surface">
        <table className="lcars-table joern-lcars-table standard-header">
          <thead>
            <tr>
              {widget.headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.id}-${index}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const JoernHeaderWidget = ({ widget }: { widget: LcarsHeaderWidget }) => {
  return (
    <header className="lcars-joern-header" data-widget-id={widget.id}>
      <div className={clsx("joern-lcars-text-box", "large", "right", joernColorClass(widget.color))}>
        {widget.text}
      </div>
    </header>
  );
};

const JoernBracketWidget = ({
  page,
  widget,
  onAction,
}: {
  page: Page;
  widget: LcarsBracketWidget;
  onAction: (actionId: string, value: unknown) => void;
}) => {
  return (
    <section className="lcars-joern-bracket" data-widget-id={widget.id}>
      <div className={clsx("joern-lcars-bracket", "left", joernBgClass(widget.color))} />
      <div className="lcars-joern-bracket-body">
        {widget.children.map((child) => (
          <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
        ))}
      </div>
      <div className={clsx("joern-lcars-bracket", "right", joernBgClass(widget.color))} />
    </section>
  );
};

const JoernBoxWidget = ({
  page,
  widget,
  onAction,
}: {
  page: Page;
  widget: LcarsBoxWidget;
  onAction: (actionId: string, value: unknown) => void;
}) => {
  const mainChildren = widget.main_children ?? widget.children;
  const leftInputs = widget.left_inputs ?? [];
  const rightInputs = widget.right_inputs ?? [];
  const sideChildren = widget.side_children ?? [];
  return (
    <section className="lcars-joern-box" data-widget-id={widget.id}>
      {widget.title ? (
        <div className={clsx("joern-lcars-text-box", "right", joernColorClass(widget.title_color ?? widget.color))}>
          {widget.title}
        </div>
      ) : null}
      <div className="lcars-joern-box-grid">
        <aside className="lcars-joern-box-inputs">
          {[...leftInputs, ...rightInputs].map((child) => (
            <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
          ))}
        </aside>
        <div className="lcars-joern-box-main">
          {mainChildren.map((child) => (
            <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
          ))}
        </div>
        <aside className="lcars-joern-box-side">
          {sideChildren.map((child) => (
            <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
          ))}
        </aside>
      </div>
    </section>
  );
};

const JoernSweepWidget = ({
  page,
  widget,
  onAction,
}: {
  page: Page;
  widget: LcarsSweepWidget;
  onAction: (actionId: string, value: unknown) => void;
}) => {
  const leftRatio = clampSweepRatio(widget.left_width);
  const title = widget.title ?? widget.label ?? page.title;
  const subtitle = widget.subtitle ?? null;
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
  const headerChildren = widget.header_children ?? [];
  const leftPanelChildren = widget.reverse ? [...headerChildren, ...leftChildren] : leftChildren;
  const rightPanelChildren = widget.reverse ? rightChildren : [...headerChildren, ...rightChildren];
  const bodyStyle: CSSProperties = {
    "--lcars-joern-sweep-left-fr": `${leftRatio}fr`,
    "--lcars-joern-sweep-right-fr": `${1 - leftRatio}fr`,
  } as CSSProperties;

  return (
    <article
      className={clsx("lcars-joern-sweep", { "lcars-joern-sweep-reverse": widget.reverse })}
      data-widget-id={widget.id}
    >
      <div className="lcars-joern-sweep-header-row">
        <div className={clsx("joern-lcars-elbow", "left-bottom", joernBgClass(widget.color))} />
        <div className={clsx("joern-lcars-bar", "horizontal", joernBgClass(widget.color))}>
          <div className={clsx("joern-lcars-title", "right", joernColorClass(widget.color))}>{title}</div>
        </div>
        <div className={clsx("joern-lcars-bar", "horizontal", "right-end", "decorated", joernBgClass(widget.color))} />
      </div>
      {subtitle ? (
        <div className={clsx("joern-lcars-text-box", "right", joernColorClass(widget.color))}>
          {subtitle}
        </div>
      ) : null}
      <div className="lcars-joern-sweep-body" style={bodyStyle}>
        <section className="lcars-joern-sweep-column lcars-joern-sweep-left">
          {leftPanelChildren.map((child) => (
            <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
          ))}
        </section>
        <aside className="lcars-joern-sweep-column lcars-joern-sweep-rail">
          {railChildren.map((child) => (
            <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
          ))}
        </aside>
        <section className="lcars-joern-sweep-column lcars-joern-sweep-right">
          {rightPanelChildren.map((child) => (
            <JoernWidgetRenderer key={child.id} onAction={onAction} page={page} widget={child} />
          ))}
        </section>
      </div>
    </article>
  );
};

export const JoernWidgetRenderer = ({ page, widget, onAction }: JoernWidgetRendererProps): ReactNode => {
  if (widget.visible === false) {
    return null;
  }
  switch (widget.type) {
    case "text":
      return <JoernTextWidget widget={widget} />;
    case "status_tile":
      return <JoernStatusTileWidget widget={widget} />;
    case "markdown":
      return <JoernMarkdownWidget widget={widget} />;
    case "button":
      return <JoernButtonWidget onAction={onAction} widget={widget} />;
    case "table":
      return <JoernTableWidget widget={widget} />;
    case "line_chart":
      return <JoernLineChartWidget widget={widget} />;
    case "lcars_header":
      return <JoernHeaderWidget widget={widget} />;
    case "lcars_bracket":
      return <JoernBracketWidget onAction={onAction} page={page} widget={widget} />;
    case "lcars_box":
      return <JoernBoxWidget onAction={onAction} page={page} widget={widget} />;
    case "lcars_sweep":
      return <JoernSweepWidget onAction={onAction} page={page} widget={widget} />;
    default:
      return <JoernUnsupportedWidget page={page} widget={widget} />;
  }
};
