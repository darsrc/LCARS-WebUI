/*
 * The console — the whole adaptive LCARS surface for a page.
 *
 * Replaces the old fixed "top bar + left rail that scrolls" with a viewport-filling
 * bracket whose content field is composed by archetype (console / telemetry / grid /
 * menu). The layout brain assigns each panel a zone; the mosaic packer then lays
 * them all onto one grid cut to the shape of the field, with the zones acting as
 * region constraints. Nothing scrolls the whole page — overflow lives inside a cell.
 */
import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Manifest, Page } from "../types/contract";
import type { TransportStatus } from "../runtime/transport";
import {
  WidgetRenderer,
  type WidgetHandlers,
  accentVar,
} from "../widgets/WidgetRenderer";
import { collectOverlays, planLayout, type PlacedPanel } from "../compose/layout";
import { packMosaic, packMosaicFlow, type MosaicCell } from "../compose/mosaic";
import { trimCode } from "../compose/fillers";
import { useViewportProfile } from "../compose/viewport";
import { useContentDemand } from "../compose/demand";
import { rowTemplate } from "../compose/rows";
import {
  applyOverrides,
  clearOverride,
  overrideKey,
  panelsOf,
  readOverride,
  writeOverride,
} from "../compose/overrides";
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
const RAIL_CODES = [
  "47-4601",
  "41-6702",
  "30-1701",
  "47-7050",
  "02-8850",
  "0-4077",
] as const;
const FOOTER_PILLS = [0, 1, 2, 3, 4] as const;

const isLive = (mode: TransportStatus["mode"]) =>
  mode === "ws" || mode === "sse";

export function Console({
  manifest,
  page,
  activePageId,
  onSelectPage,
  transportStatus,
  ...handlers
}: ConsoleProps) {
  const header = manifest.layout.header;
  const items =
    manifest.layout.sidebar.position === "hidden"
      ? []
      : manifest.layout.sidebar.items;
  const live = isLive(transportStatus.mode);
  const [arrange, setArrange] = useState(false);

  const authored = page.archetype === "authored";
  const { archetype } = useMemo(
    () => authored ? { archetype: "grid" as const } : planLayout(page),
    [authored, page],
  );
  const overlays = useMemo(() => collectOverlays(page), [page]);
  const authoredWidgets = useMemo(
    () => page.rows.flatMap((row) => row.columns.flatMap((column) =>
      column.widgets.filter((widget) => widget.type !== "popup"),
    )),
    [page],
  );

  if (authored && page.chrome === "none") {
    return (
      <main className="lcars-authored-page">
        {authoredWidgets.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} {...handlers} />
        ))}
        {overlays.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} {...handlers} />
        ))}
      </main>
    );
  }

  const railFill = (
    <div className="lcars-rail-fill" aria-hidden="true">
      {RAIL_FILLER.map((height, index) => (
        <div
          className="lcars-rail-fill-block"
          data-k={index % 4}
          key={`${height}-${index}`}
          style={{ flexBasis: `${height}px` }}
        >
          {height >= 40 && RAIL_CODES[index] ? (
            <span className="lcars-rail-code">{RAIL_CODES[index]}</span>
          ) : null}
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
            {header.subtitle ? (
              <span className="lcars-sub">{header.subtitle}</span>
            ) : null}
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
          {/* The nav buttons scroll on their own so a long section list cannot
              push Arrange and the transport readout off the bottom of the rail. */}
          <div className="lcars-rail-scroll">
            {items.map((item, index) => (
              <button
                key={item.id}
                className="lcars-rail-btn"
                aria-current={
                  item.target_page === activePageId ? "page" : undefined
                }
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
                        style={{
                          background:
                            accentVar(seg.color) ?? "var(--okuda-lilac)",
                        }}
                      >
                        {seg.label}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            ))}
            {railFill}
          </div>
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
          <div className="lcars-rail-num">
            {transportStatus.mode.toUpperCase()}
          </div>
        </nav>
        {/* Keyed by page so a page switch remounts the deck: the new page's
            panels arm in rank by rank (the page-transition sweep) while the old
            one is cut, and within a page the deck persists so widget state and
            live updates are never lost. */}
        {authored ? (
          <div className="lcars-authored-shell-deck">
            {authoredWidgets.map((widget) => (
              <WidgetRenderer key={widget.id} widget={widget} {...handlers} />
            ))}
          </div>
        ) : (
          <Deck
            appName={manifest.meta.app_name}
            arrange={arrange}
            handlers={handlers}
            key={activePageId}
            page={page}
          />
        )}
        {overlays.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} {...handlers} />
        ))}
      </div>

      <div className="lcars-band lcars-band--bot">
        <Elbow variant="bot" />
        <div className="lcars-footwrap">
          <div className="lcars-footbar">
            {FOOTER_PILLS.map((pill) => (
              <span
                className="lcars-foot-pill"
                data-k={pill % 4}
                key={pill}
                aria-hidden="true"
              />
            ))}
            <span className="lcars-foot-status">
              <span>{manifest.meta.app_name}</span>
              <span className="lcars-foot-sp">
                LINK {live ? "ESTABLISHED" : "STANDBY"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* The leftover beneath a content-sized panel that a taller neighbour stretched.
 * Same treatment as the filler cells around it — a solid pigment block carrying
 * an Okudagram reference code — so the panel reads as cut to its content rather
 * than as a box someone forgot to fill. */
function TrimBlock({ height, id }: { height: number; id: string }) {
  const { k, code } = useMemo(() => trimCode(id), [id]);
  return (
    <div
      aria-hidden="true"
      className="lcars-fill lcars-fill--trim"
      data-k={k}
      style={{ height }}
    >
      <span className="lcars-fill-code">{code}</span>
    </div>
  );
}

function SpacerBlock({
  id,
  rect,
  visible,
}: {
  id: string;
  rect: { col: number; row: number; colSpan: number; rowSpan: number };
  visible: boolean;
}) {
  const { k, code } = trimCode(`spacer:${id}`);
  return (
    <div
      aria-hidden="true"
      className={visible ? "lcars-fill lcars-spacer" : "lcars-spacer"}
      data-k={visible ? k : undefined}
      style={{
        gridColumn: `${rect.col + 1} / span ${rect.colSpan}`,
        gridRow: `${rect.row + 1} / span ${rect.rowSpan}`,
      }}
    >
      {visible ? <span className="lcars-fill-code">{code}</span> : null}
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
    return (
      new URLSearchParams(window.location.search).get("layout") === "legacy"
    );
  } catch {
    return false;
  }
};

/** The pre-4.2 deck: three intrinsically-sized flex columns. Deprecated. */
function LegacyDeck({
  page,
  handlers,
}: {
  page: Page;
  handlers: WidgetHandlers;
}) {
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
      <div
        className="lcars-anim"
        data-exit={entry.exiting || undefined}
        key={entry.key}
        style={staggerStyle(index)}
      >
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
    <div
      className="lcars-deck"
      data-arch={archetype}
      data-side={hasSide || undefined}
    >
      <div className="lcars-main">
        <div className="lcars-zone lcars-zone--primary">
          {primaryP.length > 0 ? (
            renderPanels(primaryP)
          ) : (
            <div className="lcars-empty">No data</div>
          )}
        </div>
        {dockP.length > 0 ? (
          <div className="lcars-zone lcars-zone--dock">
            {renderPanels(dockP)}
          </div>
        ) : null}
      </div>
      {hasSide ? (
        <div className="lcars-zone lcars-zone--side">{renderPanels(sideP)}</div>
      ) : null}
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

  // The plan and the packing are separate memos: the plan settles the *shape* of
  // the deck, and only that shape decides which panels get measured. Folding the
  // measured demand back into one memo would make the measure list depend on the
  // measurement, which is how a layout loop starts.
  const { archetype, entries } = useMemo(() => {
    const plan = planLayout(page);
    return {
      archetype: plan.archetype,
      entries: applyOverrides(plan.panels, override),
    };
  }, [page, override]);

  const collapsed = useMemo(() => {
    const stateByWidget = handlers.uiStateByWidget ?? {};
    return Object.fromEntries(
      panelsOf(entries).map(({ widget }) => {
        const stored = stateByWidget[widget.id] as { collapsed?: unknown } | undefined;
        const initial = (widget as { options?: { initial_collapsed?: unknown } | null }).options
          ?.initial_collapsed;
        return [
          widget.id,
          typeof stored?.collapsed === "boolean" ? stored.collapsed : initial === true,
        ];
      }),
    );
  }, [entries, handlers.uiStateByWidget]);

  /* An arranged page is packed by the flow rules and an unarranged one by the
   * automatic tessellation. They are genuinely different jobs: tessellating
   * backfills holes, which is what makes an unattended deck look composed and
   * what would drag a hand-placed panel out from where it was dropped. */
  const pack = useMemo(() => {
    const options = {
      seed: page.id,
      fillers: page.fillers !== false,
      defaultSizing: page.sizing ?? "fill",
      collapsed,
      spacers: override?.spacers ?? {},
    };
    return (demand?: Readonly<Record<string, number>>) =>
      override
        ? packMosaicFlow(entries, profile, { ...options, demand })
        : packMosaic(panelsOf(entries), profile, { ...options, demand });
  }, [entries, profile, page.id, page.fillers, page.sizing, collapsed, override]);

  const shape = useMemo(() => pack(), [pack]);

  // Only content-sized panels are measured; a growing one states an appetite,
  // not a height. See compose/demand.ts.
  const measuredIds = useMemo(
    () =>
      shape.cells
        .filter((cell) => cell.measure.grow === 0)
        .map((cell) => cell.widget.id),
    [shape],
  );
  const demand = useContentDemand(deckRef, measuredIds, shape);

  const mosaic = useMemo(() => pack(demand), [pack, demand]);

  const cells = useAnimatedPresence(mosaic.cells, cellKey);

  const handleArrange = (
    order: string[],
    spans?: Record<string, [number, number]>,
    spacers?: Record<string, [number, number]>,
  ) => {
    writeOverride(storeKey, {
      v: 3,
      order,
      spans: spans ?? override?.spans ?? {},
      spacers: spacers ?? override?.spacers ?? {},
    });
    setRevision((n) => n + 1);
  };

  const handleReset = () => {
    clearOverride(storeKey);
    setRevision((n) => n + 1);
  };

  /* The list arrange mode edits. Before the page has ever been arranged there is
   * no stored order, so it is read back off the packed deck in reading order —
   * that way the very first drag rearranges the layout the user is looking at,
   * rather than the packer's internal weight-sorted sequence. */
  const currentOrder = useMemo(
    () => {
      if (!override) {
        return [...mosaic.cells]
          .sort((a, b) => a.row - b.row || a.col - b.col)
          .map((cell) => cell.widget.id);
      }

      // A newer manifest may contain panels the stored arrangement has never
      // seen. Replay appends them to the deck; append them to the editable order
      // as well so their first drag is not rejected as an unknown token.
      const panelIds = panelsOf(entries).map((panel) => panel.widget.id);
      const available = new Set(panelIds);
      const base = override.order.filter(
        (entry) => entry.startsWith("@") || available.has(entry),
      );
      const known = new Set(base.filter((entry) => !entry.startsWith("@")));
      return [...base, ...panelIds.filter((id) => !known.has(id))];
    },
    [override, mosaic.cells, entries],
  );

  if (legacy) return <LegacyDeck handlers={handlers} page={page} />;

  return (
    <div
      className="lcars-deck lcars-deck--mosaic"
      data-arch={archetype}
      data-arrange={arrange || undefined}
      data-density={profile.density}
      data-overflows={mosaic.overflows || undefined}
      ref={deckRef}
      style={
        {
          ["--cols"]: mosaic.cols,
          ["--row-unit"]: `${mosaic.rowUnit}px`,
          gridTemplateRows: rowTemplate(mosaic.rowHeights),
        } as CSSProperties
      }
    >
      {cells.map((entry, index) => (
        <div
          className="lcars-anim lcars-mcell"
          data-cap={entry.item.cap}
          data-edges={entry.item.edges || undefined}
          data-exit={entry.exiting || undefined}
          data-fixed={entry.item.measure.grow === 0 || undefined}
          data-widget={entry.item.widget.id}
          data-zone={entry.item.zone}
          data-trim={entry.item.trim > 0 || undefined}
          key={entry.key}
          style={cellStyle(entry.item, index)}
        >
          <WidgetRenderer widget={entry.item.widget} {...handlers} />
          {entry.item.trim > 0 && page.fillers !== false ? (
            <TrimBlock height={entry.item.trim} id={entry.item.widget.id} />
          ) : null}
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
          {filler.code ? (
            <span className="lcars-fill-code">{filler.code}</span>
          ) : null}
        </div>
      ))}
      {mosaic.sections.map((section) => (
        <div
          className="lcars-section-band"
          key={section.key}
          style={{
            gridColumn: `${section.col + 1} / span ${section.colSpan}`,
            gridRow: `${section.row + 1} / span ${section.rowSpan}`,
          }}
        >
          <span className="lcars-section-label">{section.label}</span>
          <span className="lcars-section-rule" aria-hidden="true" />
        </div>
      ))}
      {mosaic.slots.map((slot) => (
        <SpacerBlock
          id={slot.id}
          key={slot.id}
          rect={slot}
          visible={page.fillers !== false}
        />
      ))}
      {mosaic.cells.length === 0 && mosaic.sections.length === 0 ? (
        <div className="lcars-empty">No data</div>
      ) : null}
      {/* Beta. Mounted only while arrange mode is on, so with the feature off
          the chunk is never fetched and no pointer listener is ever bound. */}
      {arrange ? (
        <Suspense fallback={null}>
          <RearrangeLayer
            arranged={override !== null}
            cells={mosaic.cells}
            columns={mosaic.cols}
            onArrange={handleArrange}
            onReset={handleReset}
            order={currentOrder}
            sections={mosaic.sections}
            spacers={override?.spacers ?? {}}
            spans={override?.spans ?? {}}
            slots={mosaic.slots}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
