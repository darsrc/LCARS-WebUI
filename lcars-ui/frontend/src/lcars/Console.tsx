/*
 * The console — the whole adaptive LCARS surface for a page.
 *
 * Replaces the old fixed "top bar + left rail that scrolls" with a viewport-filling
 * bracket whose content field is composed by archetype (console / telemetry / grid /
 * menu). The layout brain assigns each panel a zone; the mosaic packer then lays
 * them all onto one grid cut to the shape of the field, with the zones acting as
 * region constraints. Nothing scrolls the whole page — overflow lives inside a cell.
 */
import { lazy, Suspense, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Manifest, Page } from "../types/contract";
import type { TransportStatus } from "../runtime/transport";
import { WidgetRenderer, type WidgetHandlers, accentVar } from "../widgets/WidgetRenderer";
import { planLayout, type PlacedPanel } from "../compose/layout";
import { packMosaic, type MosaicCell } from "../compose/mosaic";
import { useViewportProfile } from "../compose/viewport";
import { applyOverrides, clearOverride, overrideKey, readOverride, writeOverride } from "../compose/overrides";
import { useAnimatedPresence, type PresenceEntry } from "./motion";
import { Elbow } from "./Elbow";

const RearrangeLayer = lazy(() => import("./Rearrange"));

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
  const [arrange, setArrange] = useState(false);

  const { archetype } = useMemo(() => planLayout(page), [page]);

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
          <button
            className="lcars-rail-arrange"
            aria-pressed={arrange}
            data-active={arrange || undefined}
            onClick={() => setArrange((on) => !on)}
            type="button"
          >
            <span className="lcars-rail-label">Arrange</span>
            <span className="lcars-rail-beta">Beta</span>
          </button>
          <div className="lcars-rail-num">{transportStatus.mode.toUpperCase()}</div>
        </nav>
        {/* Keyed by page so a page switch remounts the deck: the new page's
            panels arm in rank by rank (the page-transition sweep) while the old
            one is cut, and within a page the deck persists so widget state and
            live updates are never lost. */}
        <Deck
          appName={manifest.meta.app_name}
          arrange={arrange}
          handlers={handlers}
          key={activePageId}
          page={page}
        />
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

const cellKey = (cell: MosaicCell) => cell.widget.id;
const panelKey = (panel: PlacedPanel) => panel.widget.id;
const staggerStyle = (index: number) => ({ ["--i"]: index }) as CSSProperties;

const cellStyle = (cell: MosaicCell, index: number): CSSProperties =>
  ({
    gridColumn: `${cell.col + 1} / span ${cell.colSpan}`,
    gridRow: `${cell.row + 1} / span ${cell.rowSpan}`,
    ["--i"]: index,
  }) as CSSProperties;

/* Escape hatch: `?layout=legacy` renders the pre-4.2 zoned deck. Kept for one
 * version so an app that regresses under the mosaic has a one-flag fallback
 * rather than a downgrade. Remove once 4.2 has settled. */
const useLegacyDeck = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get("layout") === "legacy";
  } catch {
    return false;
  }
};

/** The pre-4.2 deck: three intrinsically-sized flex columns. Deprecated. */
function LegacyDeck({ page, handlers }: { page: Page; handlers: WidgetHandlers }) {
  const { archetype, panels } = useMemo(() => planLayout(page), [page]);
  const isGrid = archetype === "grid";
  const inZone = (zone: PlacedPanel["zone"]) =>
    isGrid ? [] : panels.filter((panel) => panel.zone === zone);

  const gridP = useAnimatedPresence(isGrid ? panels : [], panelKey);
  const primaryP = useAnimatedPresence(inZone("primary"), panelKey);
  const sideP = useAnimatedPresence(inZone("side"), panelKey);
  const dockP = useAnimatedPresence(inZone("dock"), panelKey);

  const renderPanels = (entries: PresenceEntry<PlacedPanel>[]) =>
    entries.map((entry, index) => (
      <div className="lcars-anim" data-exit={entry.exiting || undefined} key={entry.key} style={staggerStyle(index)}>
        <WidgetRenderer widget={entry.item.widget} {...handlers} />
      </div>
    ));

  if (isGrid) {
    return (
      <div className="lcars-deck--grid" data-arch={archetype}>
        {gridP.map((entry, index) => (
          <div
            className="lcars-cell lcars-anim"
            data-exit={entry.exiting || undefined}
            key={entry.key}
            style={staggerStyle(index)}
          >
            <WidgetRenderer widget={entry.item.widget} {...handlers} />
          </div>
        ))}
      </div>
    );
  }

  const hasSide = sideP.length > 0;
  return (
    <div className="lcars-deck" data-arch={archetype} data-side={hasSide || undefined}>
      <div className="lcars-main">
        <div className="lcars-zone lcars-zone--primary">
          {primaryP.length > 0 ? renderPanels(primaryP) : <div className="lcars-empty">No data</div>}
        </div>
        {dockP.length > 0 ? <div className="lcars-zone lcars-zone--dock">{renderPanels(dockP)}</div> : null}
      </div>
      {hasSide ? <div className="lcars-zone lcars-zone--side">{renderPanels(sideP)}</div> : null}
    </div>
  );
}

/*
 * The content deck for one page. Extracted so it can be keyed by page in the
 * console and remount on navigation — that remount is the page-transition sweep.
 *
 * The zone plan from `planLayout` feeds the mosaic packer, which lays every
 * panel onto one grid sized to the actual field: zones survive as region
 * constraints rather than as separate scrolling columns, so a wide screen
 * tessellates instead of stacking. Cells flow through useAnimatedPresence so
 * adding or removing one live plays an enter/exit animation, and present cells
 * always carry their latest widget (the presence cache is live, so streaming
 * updates never lag).
 */
function Deck({
  appName,
  arrange,
  page,
  handlers,
}: {
  appName: string;
  arrange: boolean;
  page: Page;
  handlers: WidgetHandlers;
}) {
  const deckRef = useRef<HTMLDivElement>(null);
  const profile = useViewportProfile(deckRef);
  const legacy = useLegacyDeck();
  // Bumped on every write so the plan re-runs; the override itself lives in
  // localStorage, never in React state, so a reload replays it unchanged.
  const [revision, setRevision] = useState(0);

  const storeKey = overrideKey(appName, page.id, profile.density);
  const override = useMemo(
    () => readOverride(storeKey),
    // `revision` is the invalidation signal for the store read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeKey, revision],
  );

  const { archetype, mosaic } = useMemo(() => {
    const plan = planLayout(page);
    const panels = applyOverrides(plan.panels, override);
    return {
      archetype: plan.archetype,
      mosaic: packMosaic(panels, profile, {
        seed: page.id,
        fillers: page.fillers !== false,
        order: override ? "explicit" : "auto",
      }),
    };
  }, [page, profile, override]);

  const cells = useAnimatedPresence(mosaic.cells, cellKey);

  const handleReorder = (order: string[]) => {
    writeOverride(storeKey, { v: 1, order, spans: override?.spans ?? {} });
    setRevision((n) => n + 1);
  };

  const handleReset = () => {
    clearOverride(storeKey);
    setRevision((n) => n + 1);
  };

  if (legacy) return <LegacyDeck handlers={handlers} page={page} />;

  return (
    <div
      className="lcars-deck lcars-deck--mosaic"
      data-arch={archetype}
      data-arrange={arrange || undefined}
      data-density={profile.density}
      ref={deckRef}
      style={{ ["--cols"]: mosaic.cols, ["--row-unit"]: `${mosaic.rowUnit}px` } as CSSProperties}
    >
      {cells.map((entry, index) => (
        <div
          className="lcars-anim lcars-mcell"
          data-cap={entry.item.cap}
          data-edges={entry.item.edges || undefined}
          data-exit={entry.exiting || undefined}
          data-zone={entry.item.zone}
          key={entry.key}
          style={cellStyle(entry.item, index)}
        >
          <WidgetRenderer widget={entry.item.widget} {...handlers} />
        </div>
      ))}
      {mosaic.fillers.map((filler) => (
        <div
          aria-hidden="true"
          className="lcars-fill"
          data-k={filler.k}
          key={filler.key}
          style={{
            gridColumn: `${filler.col + 1} / span ${filler.colSpan}`,
            gridRow: `${filler.row + 1} / span ${filler.rowSpan}`,
          }}
        >
          {filler.code ? <span className="lcars-fill-code">{filler.code}</span> : null}
        </div>
      ))}
      {mosaic.cells.length === 0 ? <div className="lcars-empty">No data</div> : null}
      {/* Beta. Mounted only while arrange mode is on, so with the feature off
          the chunk is never fetched and no pointer listener is ever bound. */}
      {arrange ? (
        <Suspense fallback={null}>
          <RearrangeLayer cells={mosaic.cells} onReorder={handleReorder} />
          {override ? (
            <button className="lcars-arrange-reset" onClick={handleReset} type="button">
              Reset layout
            </button>
          ) : null}
        </Suspense>
      ) : null}
    </div>
  );
}
