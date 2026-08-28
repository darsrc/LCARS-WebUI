import type { ReactNode } from "react";

import type { Widget } from "../types/contract";
import {
  accentStyle,
  type WidgetHandlers,
  type WidgetRendererComponent,
} from "./rendererShared";

const humanizeToken = (value: string): string => value.replace(/_/g, " ");

function WebPanelHead({
  code,
  title,
  meta,
}: {
  code: string;
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="lcars-web-head">
      <span className="lcars-web-code">{code}</span>
      <strong>{title}</strong>
      {meta ? <span className="lcars-web-head-meta">{meta}</span> : null}
    </header>
  );
}

function WebChildren({
  children,
  depth,
  handlers,
  Renderer,
}: {
  children: Widget[];
  depth: number;
  handlers: WidgetHandlers;
  Renderer: WidgetRendererComponent;
}) {
  if (children.length === 0) return null;
  return (
    <div className="lcars-web-children">
      {children.map((child) => (
        <Renderer depth={depth + 1} key={child.id} widget={child} {...handlers} />
      ))}
    </div>
  );
}

export function SupportPanelControl({
  widget,
  depth,
  handlers,
  Renderer,
}: {
  widget: Extract<Widget, { type: "support_panel" }>;
  depth: number;
  handlers: WidgetHandlers;
  Renderer: WidgetRendererComponent;
}) {
  const { data } = widget;
  const independent = data.environments.length === 1 && data.environments[0].atoms.length === 0;
  const completeness = data.completeness;
  const partial = completeness ? completeness.state === "partial" : data.truncated;
  const countLabel =
    completeness && typeof completeness.returned === "number"
      ? `${completeness.returned}${typeof completeness.total === "number" ? `/${completeness.total}` : ""}`
      : null;
  return (
    <section className="lcars-web-panel lcars-support" style={accentStyle(widget.color)}>
      <WebPanelHead
        code={data.node}
        title={widget.title}
        meta={
          partial ? (
            <span className="lcars-web-flag" title={completeness?.reason ?? undefined}>
              {countLabel ? `Partial · ${countLabel}` : "Truncated"}
            </span>
          ) : null
        }
      />
      <div className="lcars-web-body">
        {widget.show_environments ? (
          data.environments.length === 0 ? (
            <p className="lcars-web-empty" data-state="unsupported">Unsupported</p>
          ) : independent ? (
            <p className="lcars-web-empty" data-state="independent">Support-independent</p>
          ) : (
            <ol className="lcars-environments" aria-label="Alternative support environments">
              {data.environments.map((environment, index) => (
                <li key={index}>
                  <span className="lcars-environment-index">Alternative {String(index + 1).padStart(2, "0")}</span>
                  <div className="lcars-atom-list">
                    {environment.atoms.map((atom) => (
                      <span className="lcars-atom" data-atom-type={atom.type} key={atom.id}>
                        <b>{atom.id}</b>
                        <span>{atom.label}</span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )
        ) : null}
        {widget.show_legend ? (
          <div className="lcars-atom-legend" aria-label="Support atom legend">
            {(["empirical", "formal", "assumption"] as const).map((type) => (
              <span data-atom-type={type} key={type}><i />{type}</span>
            ))}
          </div>
        ) : null}
        <WebChildren children={widget.children} depth={depth} handlers={handlers} Renderer={Renderer} />
      </div>
    </section>
  );
}

export function TriStateControl({
  widget,
  handlers,
}: {
  widget: Extract<Widget, { type: "tri_state" }>;
  handlers: WidgetHandlers;
}) {
  const { data } = widget;
  return (
    <section className="lcars-web-panel lcars-tri-state" data-result={data.result} style={accentStyle(widget.color)}>
      <WebPanelHead code={data.mode} title={humanizeToken(data.query)} meta={data.scope} />
      <div className="lcars-tri-body">
        <output aria-label={`Result ${data.result}`}>{data.result}</output>
        <div><strong>{data.target}</strong><span>{humanizeToken(data.reason)}</span></div>
        {widget.on_escalate && data.mode !== widget.on_escalate ? (
          <button disabled={widget.disabled} onClick={() => handlers.onAction(widget.id, widget.on_escalate, widget.id)} type="button">
            Evaluate exact
          </button>
        ) : null}
      </div>
    </section>
  );
}
