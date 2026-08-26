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
        {data.environments.length === 0 ? (
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
        )}
        {widget.show_atom_legend ? (
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

export function FrontierControl({
  widget,
  handlers,
}: {
  widget: Extract<Widget, { type: "frontier" }>;
  handlers: WidgetHandlers;
}) {
  const visible = widget.data.frontier.filter(
    (item) => !widget.layer_filter || widget.layer_filter.includes(item.edge),
  );
  return (
    <nav
      aria-label={`Frontier of ${widget.data.current.label}`}
      className="lcars-web-panel lcars-frontier"
      style={accentStyle(widget.color)}
    >
      <WebPanelHead
        code={widget.data.current.id}
        title={widget.data.current.label}
        meta={`${visible.length} adjacent`}
      />
      <div className="lcars-web-body">
        <ol className="lcars-frontier-path" aria-label="Traversal path">
          {widget.data.path.map((node) => <li key={node.id}><b>{node.id}</b>{node.label}</li>)}
          <li aria-current="page"><b>{widget.data.current.id}</b>{widget.data.current.label}</li>
        </ol>
        <div className="lcars-frontier-list">
          {visible.map((item) => (
            <button
              className="lcars-frontier-node"
              data-edge={item.edge}
              disabled={widget.disabled}
              key={item.id}
              onClick={() => handlers.onAction(widget.id, item.id, widget.id)}
              type="button"
            >
              <span className="lcars-frontier-edge">{item.edge}</span>
              <strong>{item.label}</strong>
              <span className="lcars-frontier-meta">{item.id} · {item.kind}{item.terminal ? " · terminal" : ""}</span>
            </button>
          ))}
          {visible.length === 0 ? <p className="lcars-web-empty">No neighbours in selected layers</p> : null}
        </div>
      </div>
    </nav>
  );
}

export function AssertionCardControl({
  widget,
  depth,
  handlers,
  Renderer,
}: {
  widget: Extract<Widget, { type: "assertion_card" }>;
  depth: number;
  handlers: WidgetHandlers;
  Renderer: WidgetRendererComponent;
}) {
  const { data } = widget;
  return (
    <article className="lcars-web-panel lcars-assertion" style={accentStyle(widget.color)}>
      <WebPanelHead
        code={data.id}
        title="Assertion"
        meta={<>{data.canonical ? "Canonical" : "Non-canonical"}{data.status.map((status) => <span className="lcars-web-flag" key={status}>{status}</span>)}</>}
      />
      <div className="lcars-web-body">
        <p className="lcars-assertion-gloss">{data.gloss}</p>
        <div className="lcars-framework"><span>Framework</span><strong>{data.framework.label}</strong><b>{data.framework.id}</b></div>
        {widget.show_context ? (
          <div className="lcars-context-list" aria-label="Context qualifiers">
            {data.context.length === 0 ? <p className="lcars-web-empty">No context qualifiers</p> : data.context.map((context) => (
              <section key={context.qualifier}>
                <span className="lcars-context-id">{context.qualifier}</span>
                <strong>{context.label}</strong>
                <div>{context.roles.map((role) => <span className="lcars-context-role" key={role}>{humanizeToken(role)}</span>)}</div>
              </section>
            ))}
          </div>
        ) : null}
        <WebChildren children={widget.children} depth={depth} handlers={handlers} Renderer={Renderer} />
      </div>
    </article>
  );
}

export function AnchorCardControl({ widget }: { widget: Extract<Widget, { type: "anchor_card" }> }) {
  const { data } = widget;
  return (
    <article className="lcars-web-panel lcars-anchor-card" data-polarity={data.polarity} style={accentStyle(widget.color)}>
      <WebPanelHead code={data.id} title={data.type === "formal" ? "Formal anchor" : "Empirical anchor"} meta={data.polarity} />
      <div className="lcars-web-body">
        <p className="lcars-anchor-label">{data.label}</p>
        <cite><b>{data.source.id}</b>{data.source.citation}</cite>
        <dl className="lcars-web-readouts">
          <div><dt>Inspectable</dt><dd>{data.inspectable}</dd></div>
          <div><dt>Sibling anchors</dt><dd>{data.sibling_anchors.length > 0 ? data.sibling_anchors.join(" · ") : "None"}</dd></div>
        </dl>
        {data.status.length > 0 ? <div className="lcars-anchor-status">{data.status.map((status) => <span key={status}>{status}</span>)}</div> : null}
      </div>
    </article>
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
      <WebPanelHead code={data.mode} title={humanizeToken(data.query)} meta={data.commitment} />
      <div className="lcars-tri-body">
        <output aria-label={`Result ${data.result}`}>{data.result}</output>
        <div><strong>{data.subject}</strong><span>{humanizeToken(data.reason)}</span></div>
        {widget.on_escalate && data.mode !== widget.on_escalate ? (
          <button disabled={widget.disabled} onClick={() => handlers.onAction(widget.id, widget.on_escalate, widget.id)} type="button">
            Evaluate exact
          </button>
        ) : null}
      </div>
    </section>
  );
}

const compactNumber = (value: number): string =>
  new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4, notation: "scientific" }).format(value);

function constraintGeometry(data: Extract<Widget, { type: "constraint_band" }>["data"]) {
  const values = [
    data.excluded.min,
    data.excluded.max,
    ...data.claims.map((claim) => claim.position),
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const rawMin = values.length > 0 ? Math.min(...values) : 0;
  const rawMax = values.length > 0 ? Math.max(...values) : 1;
  const spread = Math.max(Math.abs(rawMax - rawMin), Math.abs(rawMax || 1) * 0.25);
  const min = Math.min(
    rawMin - spread * 0.25,
    data.excluded.min == null ? rawMin - spread : data.excluded.min - spread * 0.25,
  );
  const max = Math.max(
    rawMax + spread * 0.25,
    data.excluded.max == null ? rawMax + spread : data.excluded.max + spread * 0.25,
  );
  const position = (value: number): number => Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100));
  const excludedStart = data.excluded.min == null ? 0 : position(data.excluded.min);
  const excludedEnd = data.excluded.max == null ? 100 : position(data.excluded.max);
  return { min, max, position, excludedStart, excludedEnd };
}

export function ConstraintBandControl({ widget }: { widget: Extract<Widget, { type: "constraint_band" }> }) {
  const { data } = widget;
  const geometry = constraintGeometry(data);
  const uncommitted = data.claims.filter((claim) => claim.position == null);
  return (
    <section className="lcars-web-panel lcars-constraint" style={accentStyle(widget.color)}>
      <WebPanelHead code={data.quantity.id} title={data.quantity.label} meta={`${data.confidence} · ${data.quantity.unit}`} />
      <div className="lcars-web-body">
        <div className="lcars-constraint-plot" role="img" aria-label={`Excluded interval for ${data.quantity.label}`}>
          <div className="lcars-constraint-axis">
            <span>{compactNumber(geometry.min)}</span><span>{compactNumber(geometry.max)}</span>
          </div>
          <div className="lcars-constraint-track">
            <span
              className="lcars-excluded-region"
              data-open-max={data.excluded.max == null || undefined}
              data-open-min={data.excluded.min == null || undefined}
              style={{ left: `${geometry.excludedStart}%`, width: `${geometry.excludedEnd - geometry.excludedStart}%` }}
            >Excluded</span>
            {data.claims.filter((claim) => claim.position != null).map((claim) => (
              <span className="lcars-claim-marker" key={claim.id} style={{ left: `${geometry.position(claim.position!)}%` }}>
                <i /> <b>{claim.label}</b><small>{compactNumber(claim.position!)}</small>
              </span>
            ))}
          </div>
        </div>
        <dl className="lcars-web-readouts">
          <div><dt>Source</dt><dd>{data.source.citation}</dd></div>
          <div><dt>Conditions</dt><dd>{data.conditions.length > 0 ? data.conditions.map((condition) => `${condition.quantity}: ${condition.min ?? "−∞"}–${condition.max ?? "+∞"} ${condition.unit}`).join(" · ") : "None"}</dd></div>
          {uncommitted.length > 0 ? <div><dt>No quantity commitment</dt><dd>{uncommitted.map((claim) => `${claim.id} ${claim.label}`).join(" · ")}</dd></div> : null}
        </dl>
      </div>
    </section>
  );
}

export function GapPanelControl({
  widget,
  depth,
  handlers,
  Renderer,
}: {
  widget: Extract<Widget, { type: "gap_panel" }>;
  depth: number;
  handlers: WidgetHandlers;
  Renderer: WidgetRendererComponent;
}) {
  const { data } = widget;
  return (
    <section className="lcars-web-panel lcars-gap" style={accentStyle(widget.color)}>
      <WebPanelHead code={data.id} title={`${data.type} gap`} meta={`${data.endpoints[0].id} ↔ ${data.endpoints[1].id}`} />
      <div className="lcars-web-body">
        <div className="lcars-gap-endpoints">
          {data.endpoints.map((endpoint) => <span key={endpoint.id}><b>{endpoint.id}</b>{endpoint.label}</span>)}
        </div>
        <dl className="lcars-web-readouts">
          <div><dt>Known dependency</dt><dd>{data.known_dependency}</dd></div>
          <div className="lcars-gap-missing"><dt>Missing bridge</dt><dd>{data.missing}</dd></div>
          <div><dt>Constraints</dt><dd>{data.constraints.length > 0 ? data.constraints.join(" · ") : "None"}</dd></div>
        </dl>
        {widget.show_contenders ? (
          <div className="lcars-contenders">
            <h4>Contenders</h4>
            {data.contenders.length === 0 ? <p className="lcars-web-empty">No contenders</p> : data.contenders.map((contender) => (
              <div key={contender.id}><b>{contender.id}</b><strong>{contender.label}</strong><span>{contender.environments} environments</span></div>
            ))}
          </div>
        ) : null}
        <WebChildren children={widget.children} depth={depth} handlers={handlers} Renderer={Renderer} />
      </div>
    </section>
  );
}

function IdSet({ title, values, tone }: { title: string; values: string[]; tone: string }) {
  return (
    <section className="lcars-commitment-set" data-tone={tone}>
      <h4>{title}<b>{values.length}</b></h4>
      <div>{values.length > 0 ? values.map((value) => <span key={value}>{value}</span>) : <em>None</em>}</div>
    </section>
  );
}

export function CommitmentSelectorControl({
  widget,
  handlers,
}: {
  widget: Extract<Widget, { type: "commitment_selector" }>;
  handlers: WidgetHandlers;
}) {
  const { data } = widget;
  return (
    <section className="lcars-web-panel lcars-commitment" style={accentStyle(widget.color)}>
      <WebPanelHead code="STANCE" title="Commitment set" meta={data.active} />
      <div className="lcars-web-body">
        <div className="lcars-commitment-options" role="radiogroup" aria-label="Commitment set">
          {data.available.map((option) => (
            <button
              aria-checked={option.id === data.active}
              aria-label={`${option.id} ${option.label}`}
              className="lcars-commitment-option"
              disabled={widget.disabled}
              key={option.id}
              onClick={() => handlers.onAction(widget.id, option.id, widget.id)}
              role="radio"
              type="button"
            >
              <b>{option.id}</b><strong>{option.label}</strong>
              <span>{option.assumptions.length > 0 ? option.assumptions.join(" · ") : "No assumptions"}</span>
            </button>
          ))}
        </div>
        <div className="lcars-commitment-results">
          <IdSet title="Supported under" values={data.supported_under} tone="supported" />
          <IdSet title="Empirically grounded" values={data.empirically_grounded} tone="empirical" />
          <IdSet title="Suspend" values={data.conflict_set} tone="conflict" />
        </div>
      </div>
    </section>
  );
}
