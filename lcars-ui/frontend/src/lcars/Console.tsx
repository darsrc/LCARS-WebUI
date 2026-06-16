/*
 * The console — the whole adaptive LCARS surface for a page.
 *
 * Replaces the old fixed "top bar + left rail that scrolls" with a viewport-filling
 * bracket whose content field is composed by archetype (console / telemetry / grid /
 * menu). Panels are placed into zones (primary / side / dock, or grid cells) by the
 * layout brain; nothing scrolls the whole page — overflow lives inside a zone.
 */
import type { Manifest, Page } from "../types/contract";
import type { TransportStatus } from "../runtime/transport";
import { WidgetRenderer, type WidgetHandlers, accentVar } from "../widgets/WidgetRenderer";
import { planLayout, type PlacedPanel } from "../compose/layout";
import { Elbow } from "./Elbow";

type ConsoleProps = {
  manifest: Manifest;
  page: Page;
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  transportStatus: TransportStatus;
} & WidgetHandlers;

// Six deliberate heights — all ≥ 48px so every block carries an Okudagram code.
const RAIL_FILLER = [80, 52, 120, 64, 96, 48] as const;
// Okudagram reference codes (NN-NNNNNN), curated + deterministic — 47 and 1701 canon.
const RAIL_CODES = ["47-4601", "41-6702", "30-1701", "47-7050", "02-8850", "0-4077"] as const;
const FOOTER_PILLS = [0, 1, 2, 3, 4] as const;

const isLive = (mode: TransportStatus["mode"]) => mode === "ws" || mode === "sse";

export function Console({
  manifest,
  page,
  activePageId,
  onSelectPage,
  transportStatus,
  ...handlers
}: ConsoleProps) {
  const header = manifest.layout.header;
  const items = manifest.layout.sidebar.position === "hidden" ? [] : manifest.layout.sidebar.items;
  const live = isLive(transportStatus.mode);

  const { archetype, panels } = planLayout(page);
  const inZone = (zone: PlacedPanel["zone"]) => panels.filter((panel) => panel.zone === zone);
  const primary = inZone("primary");
  const side = inZone("side");
  const dock = inZone("dock");

  const renderPanels = (placed: PlacedPanel[]) =>
    placed.map(({ widget }) => <WidgetRenderer key={widget.id} widget={widget} {...handlers} />);

  const field =
    archetype === "grid" ? (
      <div className="lcars-deck--grid" data-arch={archetype}>
        {panels.map(({ widget }) => (
          <div className="lcars-cell" key={widget.id}>
            <WidgetRenderer widget={widget} {...handlers} />
          </div>
        ))}
      </div>
    ) : (
      <div className="lcars-deck" data-arch={archetype} data-side={side.length > 0 || undefined}>
        <div className="lcars-main">
          <div className="lcars-zone lcars-zone--primary">
            {primary.length > 0 ? renderPanels(primary) : <div className="lcars-empty">No data</div>}
          </div>
          {dock.length > 0 ? <div className="lcars-zone lcars-zone--dock">{renderPanels(dock)}</div> : null}
        </div>
        {side.length > 0 ? <div className="lcars-zone lcars-zone--side">{renderPanels(side)}</div> : null}
      </div>
    );

  const railFill = (
    <div className="lcars-rail-fill" aria-hidden="true">
      {RAIL_FILLER.map((height, index) => (
        <div
          className="lcars-rail-fill-block"
          data-k={index % 4}
          key={`${height}-${index}`}
          style={{ flexBasis: `${height}px` }}
        >
          {height >= 40 && RAIL_CODES[index] ? <span className="lcars-rail-code">{RAIL_CODES[index]}</span> : null}
        </div>
      ))}
    </div>
  );

  return (
    <div className="lcars-frame lcars-console" data-arch={archetype}>
      <div className="lcars-band lcars-band--top">
        <Elbow variant="top" />
        <div className="lcars-headwrap">
          <div className="lcars-headbar">
            {header.subtitle ? <span className="lcars-sub">{header.subtitle}</span> : null}
            <span className="lcars-title">{header.title}</span>
            <span className="lcars-headcap" aria-hidden="true" />
          </div>
          <div className="lcars-pagebar">
            <span className="lcars-pagebar-name">{page.title}</span>
            <span className="lcars-pagebar-arch">{archetype}</span>
          </div>
        </div>
      </div>

      <div className="lcars-band lcars-band--mid">
        <nav className="lcars-rail" aria-label="Sections">
          {items.length > 0 ? (
            <>
              {items.map((item, index) => (
                <button
                  key={item.id}
                  className="lcars-rail-btn"
                  aria-current={item.target_page === activePageId ? "page" : undefined}
                  data-active={item.target_page === activePageId}
                  data-k={index % 6}
                  onClick={() => onSelectPage(item.target_page)}
                  type="button"
                >
                  <span className="lcars-rail-row">
                    <span className="lcars-rail-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="lcars-rail-label">{item.label}</span>
                  </span>
                  {item.segments && item.segments.length > 0 ? (
                    <span className="lcars-rail-segs" aria-hidden="true">
                      {item.segments.map((seg, segIndex) => (
                        <span
                          className="lcars-rail-seg"
                          key={`${item.id}-seg-${segIndex}`}
                          style={{ background: accentVar(seg.color) ?? "var(--okuda-lilac)" }}
                        >
                          {seg.label}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              ))}
              {railFill}
            </>
          ) : (
            railFill
          )}
          <div className="lcars-rail-num">{transportStatus.mode.toUpperCase()}</div>
        </nav>
        {field}
      </div>

      <div className="lcars-band lcars-band--bot">
        <Elbow variant="bot" />
        <div className="lcars-footwrap">
          <div className="lcars-footbar">
            {FOOTER_PILLS.map((pill) => (
              <span className="lcars-foot-pill" data-k={pill % 4} key={pill} aria-hidden="true" />
            ))}
            <span className="lcars-foot-status">
              <span>{manifest.meta.app_name}</span>
              <span className="lcars-foot-sp">LINK {live ? "ESTABLISHED" : "STANDBY"}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
