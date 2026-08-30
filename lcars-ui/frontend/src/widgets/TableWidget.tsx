import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import type {
  TableCell as TableCellValue,
  TableDetail,
  TableRow,
  TableState,
  ValueFormat,
  Widget,
} from "../types/contract";
import { useAnimatedPresence, useReducedMotion } from "../lcars/motion";
import {
  AUTO_SEGMENT_OPTION_LIMIT,
  CopyButton,
  CopyText,
  optionMaxHeight,
  safeHref,
  ScrollBox,
  tableCellDisplay,
  tableCellValue,
  type WidgetHandlers,
} from "./rendererShared";
import { preNegatedComparator, resolveSortRule, sortNumber, type SortValue } from "./tableSort";

/** Every value in one column, rows and their children, for sort-kind sniffing. */
function* columnSampleValues(rows: TableRow[], columnIndex: number): Generator<SortValue> {
  for (const row of rows) {
    yield tableCellValue(row.cells[columnIndex] ?? null);
    if (row.children?.length) yield* columnSampleValues(row.children, columnIndex);
  }
}

function TableCellContent({
  cell,
  format,
  handlers,
  disabled,
}: {
  cell: TableRow["cells"][number];
  format?: ValueFormat | null;
  handlers: WidgetHandlers;
  disabled?: boolean;
}) {
  const display = tableCellDisplay(cell, format);
  if (typeof cell !== "object" || cell === null) return <>{display}</>;
  const typedCell = cell as TableCellValue;
  const href = typedCell.link ? safeHref(typedCell.link.href) : null;
  const copyValue = typedCell.copy_value ?? String(tableCellValue(cell) ?? display);
  let body: ReactNode;
  if (href) {
    body = (
      <a
        href={href}
        rel={typedCell.link?.rel ?? (typedCell.link?.target === "_blank" ? "noopener noreferrer" : undefined)}
        target={typedCell.link?.target}
      >
        {typedCell.link?.label ?? display}
      </a>
    );
  } else if (typedCell.copy_on_click) {
    body = <CopyText value={copyValue} display={display} disabled={disabled} />;
  } else {
    body = display;
  }
  return (
    <span className="lcars-table-cell-content" data-status={typedCell.status ?? undefined} title={display || undefined}>
      <span className="lcars-table-cell-value">{body}</span>
      {typedCell.action ? (
        <button
          className="lcars-table-action"
          disabled={disabled}
          onClick={() => handlers.onAction(typedCell.action?.action_id ?? "", typedCell.action?.value)}
          type="button"
        >
          {typedCell.action.label}
        </button>
      ) : null}
      {typedCell.copyable ? <CopyButton value={copyValue} disabled={disabled} /> : null}
    </span>
  );
}

/** Full-width expanded detail content: a restricted, schema-validated widget set. */
function TableDetailContent({ details, handlers }: { details: TableDetail[]; handlers: WidgetHandlers }) {
  return (
    <div className="lcars-table-detail-content">
      {details.map((detail, index) => {
        switch (detail.kind) {
          case "text":
            return (
              <p className="lcars-table-detail-text" data-tone={detail.tone ?? "default"} key={index}>
                {detail.text}
              </p>
            );
          case "status":
            return (
              <span className="lcars-table-cell-content" data-status={detail.status} key={index}>
                {detail.label}
              </span>
            );
          case "link": {
            const href = safeHref(detail.href);
            return href ? (
              <a
                href={href}
                key={index}
                rel={detail.rel ?? (detail.target === "_blank" ? "noopener noreferrer" : undefined)}
                target={detail.target}
              >
                {detail.label ?? detail.href}
              </a>
            ) : (
              <span key={index}>{detail.label ?? detail.href}</span>
            );
          }
          case "action":
            return (
              <button
                className="lcars-table-action"
                key={index}
                onClick={() => handlers.onAction(detail.action_id, detail.value)}
                type="button"
              >
                {detail.label}
              </button>
            );
          case "table":
            return (
              <table className="lcars-table lcars-table--nested" key={index}>
                <thead>
                  <tr>
                    {detail.headers.map((header, headerIndex) => (
                      <th key={headerIndex}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.rows.map((row) => (
                    <tr key={row.id}>
                      {row.cells.map((nested, cellIndex) => (
                        <td key={cellIndex}>
                          <TableCellContent cell={nested} handlers={handlers} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

const EXPAND_EXIT_MS = 300;

const sameStrings = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

function collectRowIds(rows: TableRow[], into: Set<string>): void {
  for (const row of rows) {
    into.add(row.id);
    if (row.children && row.children.length > 0) collectRowIds(row.children, into);
  }
}

export function EnhancedTable({
  widget,
  handlers,
}: {
  widget: Extract<Widget, { type: "table" }>;
  handlers: WidgetHandlers;
}) {
  const options = widget.options!;
  const reduced = useReducedMotion();

  // ----- Where data operations run vs. whether state changes are emitted -----
  const serverData = options.data_mode === "server" || options.interaction?.mode === "server";
  const emit = options.emit_state_changes === true || serverData;
  const sortingRemoval =
    options.sort_cycle === "three-state" ||
    ((options.sort_cycle ?? "auto") === "auto" && !serverData);
  const actionId = options.interaction?.action_id ?? widget.id;
  const selectionMode = options.selection.mode;
  const selectionEnabled = selectionMode !== "none";

  // Every row id in the current dataset, for pruning stale selection/expansion.
  const rowIdSet = useMemo(() => {
    const ids = new Set<string>();
    collectRowIds(widget.rows, ids);
    return ids;
  }, [widget.rows]);

  const fromOptions = useCallback(
    (): TableState => ({
      sort: options.sort,
      filters: options.filters,
      page: options.pagination?.page ?? 1,
      page_size: options.pagination?.page_size ?? 25,
      selected_ids: options.selection.selected_ids.filter((id) => rowIdSet.has(id)),
      expanded_ids: options.expanded_ids.filter((id) => rowIdSet.has(id)),
      last_event: null,
    }),
    [options, rowIdSet],
  );

  // A fingerprint of the authoritative manifest baseline. When it changes, the
  // server has deliberately set state (e.g. selected/expanded a row) and we adopt
  // it; when it is unchanged, a plain data refresh must not erase user intent.
  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        sort: options.sort,
        filters: options.filters,
        page: options.pagination?.page ?? 1,
        page_size: options.pagination?.page_size ?? 25,
        selected: options.selection.selected_ids,
        expanded: options.expanded_ids,
      }),
    [options],
  );

  const stored = handlers.uiStateByWidget?.[widget.id] as TableState | undefined;
  const [fallbackState, setFallbackState] = useState<TableState>(() => stored ?? fromOptions());
  const state = stored ?? fallbackState;

  // Keep the latest notifier without making it an effect dependency.
  const notifyRef = useRef(handlers.onUiStateChange);
  notifyRef.current = handlers.onUiStateChange;

  // Seeded to the mount-time key so a remount (page navigation) does not clobber
  // restored state; only a genuine later change adopts a new baseline.
  const baselineKey = useRef(optionsKey);
  useEffect(() => {
    const current = stored ?? fallbackState;
    if (baselineKey.current !== optionsKey) {
      baselineKey.current = optionsKey;
      const next = fromOptions();
      const changed =
        !sameStrings(next.selected_ids, current.selected_ids) ||
        !sameStrings(next.expanded_ids, current.expanded_ids) ||
        JSON.stringify(next.sort) !== JSON.stringify(current.sort) ||
        JSON.stringify(next.filters) !== JSON.stringify(current.filters) ||
        next.page !== current.page ||
        next.page_size !== current.page_size;
      if (changed) {
        setFallbackState(next);
        notifyRef.current?.(widget.id, next);
      }
      return;
    }
    // Same baseline: prune only ids that no longer exist in the dataset.
    const prunedSelected = current.selected_ids.filter((id) => rowIdSet.has(id));
    const prunedExpanded = current.expanded_ids.filter((id) => rowIdSet.has(id));
    if (
      prunedSelected.length !== current.selected_ids.length ||
      prunedExpanded.length !== current.expanded_ids.length
    ) {
      const next = { ...current, selected_ids: prunedSelected, expanded_ids: prunedExpanded };
      setFallbackState(next);
      notifyRef.current?.(widget.id, next);
    }
  }, [optionsKey, rowIdSet, stored, fallbackState, fromOptions, widget.id]);

  const commit = useCallback(
    (kind: string, next: TableState) => {
      const committed = { ...next, last_event: kind };
      setFallbackState(committed);
      notifyRef.current?.(widget.id, committed);
      if (emit) handlers.onAction(actionId, { kind, state: committed }, widget.id);
    },
    [emit, handlers, actionId, widget.id],
  );

  const sorting = useMemo<SortingState>(
    () => state.sort.map((item) => ({ id: item.key, desc: item.direction === "desc" })),
    [state.sort],
  );
  const columnFilters = useMemo<ColumnFiltersState>(
    () => state.filters.map((item) => ({ id: item.key, value: item.value })),
    [state.filters],
  );
  const pagination: PaginationState = {
    pageIndex: Math.max(0, state.page - 1),
    pageSize: state.page_size,
  };

  const configuredColumns = options.columns ?? widget.headers.map((label, index) => ({
    key: `col_${index}`,
    label,
    value_type: "auto" as const,
    sortable: false,
    first_sort_direction: "asc" as const,
    filter: "none" as const,
    align: "start" as const,
    value_format: null,
  }));

  // How each column compares: explicit sort_as / value_type, else sniffed from
  // the column's own values so "735MB" sorts below "1.6GB".
  const sortRules = useMemo(
    () => configuredColumns.map((column, columnIndex) =>
      resolveSortRule(column, columnSampleValues(widget.rows, columnIndex))),
    [configuredColumns, widget.rows],
  );

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => configuredColumns.map((column, columnIndex) => ({
      id: column.key,
      accessorFn: (row) => tableCellValue(row.cells[columnIndex] ?? null),
      header: column.label ?? column.key,
      enableSorting: column.sortable,
      enableColumnFilter: column.filter !== "none",
      sortDescFirst: column.first_sort_direction === "desc",
      sortingFn: (rowA, rowB, id) => {
        const rule = sortRules[columnIndex];
        const desc = state.sort.some((item) => item.key === id && item.direction === "desc");
        return preNegatedComparator(rule, desc)(
          rowA.getValue<SortValue>(id),
          rowB.getValue<SortValue>(id),
        );
      },
      filterFn: (row, id, filterValue) => {
        const raw = row.getValue<unknown>(id);
        const filter = state.filters.find((item) => item.key === id);
        if (!filter || filterValue === "" || filterValue == null) return true;
        if (filter.operator === "equals") return String(raw) === String(filterValue);
        if (["gt", "gte", "lt", "lte"].includes(filter.operator)) {
          // Numeric comparisons read the column's own scale, so "1.6GB" > "735MB".
          const rule = sortRules[columnIndex];
          const left = sortNumber(raw as SortValue, rule.kind) ?? Number(raw);
          const right = sortNumber(filterValue as SortValue, rule.kind) ?? Number(filterValue);
          if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
          if (filter.operator === "gt") return left > right;
          if (filter.operator === "gte") return left >= right;
          if (filter.operator === "lt") return left < right;
          return left <= right;
        }
        return String(raw ?? "").toLocaleLowerCase().includes(String(filterValue).toLocaleLowerCase());
      },
      meta: { align: column.align, format: column.value_format },
    })),
    [configuredColumns, sortRules, state.filters, state.sort],
  );

  const table = useReactTable({
    columns,
    data: widget.rows,
    state: { sorting, columnFilters, pagination },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: serverData ? undefined : getSortedRowModel(),
    getFilteredRowModel: serverData ? undefined : getFilteredRowModel(),
    getPaginationRowModel: options.pagination && !serverData ? getPaginationRowModel() : undefined,
    getRowId: (row) => row.id,
    manualSorting: serverData,
    enableSortingRemoval: sortingRemoval,
    manualFiltering: serverData,
    manualPagination: serverData && options.pagination != null,
    pageCount:
      serverData && options.pagination?.total_rows != null
        ? Math.max(1, Math.ceil(options.pagination.total_rows / state.page_size))
        : undefined,
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
      commit("sort", {
        ...state,
        page: 1,
        sort: nextSorting.map((item) => ({ key: item.id, direction: item.desc ? "desc" : "asc" })),
      });
    },
    onColumnFiltersChange: (updater) => {
      const nextFilters = typeof updater === "function" ? updater(columnFilters) : updater;
      commit("filter", {
        ...state,
        page: 1,
        filters: nextFilters.map((item) => ({
          key: item.id,
          value: typeof item.value === "number" || typeof item.value === "boolean" ? item.value : String(item.value ?? ""),
          operator: state.filters.find((filter) => filter.key === item.id)?.operator ?? "contains",
        })),
      });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      commit("page", { ...state, page: next.pageIndex + 1, page_size: next.pageSize });
    },
  });

  // Ordered, sorted/filtered/paginated top-level rows; children rendered manually
  // so selection, expansion, detail rows and animation stay under our control.
  const orderedTop = table
    .getRowModel()
    .rows.filter((row) => row.depth === 0)
    .map((row) => row.original);
  const filteredTopIds = serverData
    ? widget.rows.map((row) => row.id)
    : table.getFilteredRowModel().rows.filter((row) => row.depth === 0).map((row) => row.id);

  // ----- selection + expansion held in state (client), emitted only when asked --
  const selectedSet = new Set(state.selected_ids);
  const expandedSet = new Set(state.expanded_ids);

  const toggleSelection = (id: string) => {
    if (!selectionEnabled) return;
    const has = selectedSet.has(id);
    const selected_ids =
      selectionMode === "single"
        ? has
          ? []
          : [id]
        : has
          ? state.selected_ids.filter((value) => value !== id)
          : [...state.selected_ids, id];
    commit("selection", { ...state, selected_ids });
  };

  const toggleAll = () => {
    const allSelected = filteredTopIds.length > 0 && filteredTopIds.every((id) => selectedSet.has(id));
    const selected_ids = allSelected
      ? state.selected_ids.filter((id) => !filteredTopIds.includes(id))
      : Array.from(new Set([...state.selected_ids, ...filteredTopIds]));
    commit("selection", { ...state, selected_ids });
  };

  const toggleExpansion = (id: string) => {
    const has = expandedSet.has(id);
    const expanded_ids = has
      ? state.expanded_ids.filter((value) => value !== id)
      : [...state.expanded_ids, id];
    commit("expansion", { ...state, expanded_ids });
  };

  // Re-emit the current expansion state (used by the inline error Retry control).
  const emitExpansion = () => {
    if (emit) handlers.onAction(actionId, { kind: "expansion", state }, widget.id);
  };

  const rowExpandable = (row: TableRow): boolean =>
    Boolean(
      (row.children && row.children.length > 0) ||
        (row.expanded_content && row.expanded_content.length > 0) ||
        row.loading ||
        row.error != null ||
        (options.expandable && emit),
    );

  // Keep an expansion's content mounted through its exit sweep on collapse.
  const motionMs = options.expansion_motion === "none" ? 0 : EXPAND_EXIT_MS;
  const presence = useAnimatedPresence(
    state.expanded_ids.filter((id) => rowIdSet.has(id)).map((id) => ({ id })),
    (entry) => entry.id,
    motionMs,
  );
  const exitingById = new Map(presence.map((entry) => [entry.key, entry.exiting]));

  const rowClickable = Boolean(options.row_click_select) && selectionEnabled;
  const onRowClick = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (!rowClickable || widget.disabled) return;
    if ((event.target as HTMLElement).closest("a, button, input, select, label")) return;
    toggleSelection(id);
  };

  const colSpan = configuredColumns.length + (selectionEnabled ? 1 : 0);

  const renderCells = (row: TableRow, depth: number): ReactNode =>
    configuredColumns.map((column, columnIndex) => (
      <td data-align={column.align} key={column.key} style={{ "--row-depth": depth } as CSSProperties}>
        {columnIndex === 0 && rowExpandable(row) ? (
          <button
            aria-label={`${expandedSet.has(row.id) ? "Collapse" : "Expand"} row ${row.id}`}
            className="lcars-table-icon"
            data-expanded={expandedSet.has(row.id) || undefined}
            disabled={widget.disabled}
            onClick={() => toggleExpansion(row.id)}
            title={expandedSet.has(row.id) ? "Collapse row" : "Expand row"}
            type="button"
          >
            <svg aria-hidden="true" height="12" viewBox="0 0 16 16" width="12">
              <path
                d="M6 3l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        ) : null}
        <TableCellContent
          cell={row.cells[columnIndex] ?? null}
          disabled={widget.disabled}
          format={column.value_format}
          handlers={handlers}
        />
      </td>
    ));

  const renderTree = (rows: TableRow[], depth: number, parentExiting: boolean): ReactNode[] => {
    const nodes: ReactNode[] = [];
    for (const row of rows) {
      const selected = selectedSet.has(row.id);
      nodes.push(
        <tr
          className={depth > 0 ? "lcars-table-child-row" : undefined}
          data-clickable={rowClickable || undefined}
          data-depth={depth}
          data-exiting={(depth > 0 && parentExiting) || undefined}
          data-selected={selected || undefined}
          key={row.id}
          onClick={(event) => onRowClick(event, row.id)}
        >
          {selectionEnabled ? (
            <td className="lcars-table-select">
              <button
                aria-checked={selected}
                aria-label={`Select row ${row.id}`}
                className="lcars-check"
                disabled={widget.disabled}
                onClick={() => toggleSelection(row.id)}
                role={selectionMode === "single" ? "radio" : "checkbox"}
                type="button"
              />
            </td>
          ) : null}
          {renderCells(row, depth)}
        </tr>,
      );
      if (exitingById.has(row.id)) {
        const exiting = parentExiting || (exitingById.get(row.id) ?? false);
        const hasDetail = Boolean(
          (row.expanded_content && row.expanded_content.length > 0) || row.loading || row.error,
        );
        if (hasDetail) {
          nodes.push(
            <tr className="lcars-table-detail-row" data-depth={depth + 1} key={`${row.id}__detail`}>
              <td colSpan={colSpan}>
                <div
                  className="lcars-table-expand-motion"
                  data-exiting={exiting || undefined}
                  data-reduced={reduced || undefined}
                >
                  {row.loading ? (
                    <div className="lcars-table-loading" role="status">
                      Loading…
                    </div>
                  ) : null}
                  {row.error ? (
                    <div className="lcars-table-error" role="alert">
                      <span>{row.error}</span>
                      <button className="lcars-table-action" onClick={emitExpansion} type="button">
                        Retry
                      </button>
                    </div>
                  ) : null}
                  {row.expanded_content && row.expanded_content.length > 0 ? (
                    <TableDetailContent details={row.expanded_content} handlers={handlers} />
                  ) : null}
                </div>
              </td>
            </tr>,
          );
        }
        if (row.children && row.children.length > 0) {
          nodes.push(...renderTree(row.children, depth + 1, exiting));
        }
      }
    }
    return nodes;
  };

  const bodyRows = renderTree(orderedTop, 0, false);
  return (
    <ScrollBox
      className="lcars-table-wrap"
      data-density={options.density}
      data-sticky={options.sticky_header || undefined}
      maxHeight={optionMaxHeight(widget)}
    >
      <table className="lcars-table lcars-table--enhanced">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {selectionEnabled ? (
                <th aria-label="Selection" className="lcars-table-select-head">
                  {selectionMode === "multiple" ? (
                    <button
                      aria-checked={filteredTopIds.length > 0 && filteredTopIds.every((id) => selectedSet.has(id))}
                      aria-label="Select all rows"
                      className="lcars-check"
                      disabled={widget.disabled}
                      onClick={toggleAll}
                      role="checkbox"
                      type="button"
                    />
                  ) : null}
                </th>
              ) : null}
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const definition = configuredColumns.find((column) => column.key === header.column.id);
                const filterValue = String(header.column.getFilterValue() ?? "");
                const filterValues = definition?.filter === "select"
                  ? Array.from(
                      new Set(
                        widget.rows.map((row) =>
                          tableCellDisplay(row.cells[header.index] ?? null),
                        ),
                      ),
                    )
                  : [];
                const compactSelectFilter = filterValues.length + 1 <= AUTO_SEGMENT_OPTION_LIMIT;
                return (
                  <th
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    data-align={(header.column.columnDef.meta as { align?: string } | undefined)?.align}
                    key={header.id}
                  >
                    {header.column.getCanSort() ? (
                      <button
                        aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                        className="lcars-table-sort"
                        disabled={widget.disabled}
                        onClick={header.column.getToggleSortingHandler()}
                        title={`Sort by ${String(header.column.columnDef.header)}`}
                        type="button"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true">{sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}</span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                    {header.column.getCanFilter() && definition?.filter === "select" ? (
                      <div
                        aria-label={`Filter ${String(header.column.columnDef.header)}`}
                        className={`lcars-table-filter-choice ${compactSelectFilter ? "lcars-segments" : "lcars-option-stack"}`}
                        role="radiogroup"
                      >
                        {["", ...filterValues].map((value, index) => {
                          const selected = filterValue === value;
                          return (
                            <button
                              aria-checked={selected}
                              className={compactSelectFilter ? "lcars-segment" : "lcars-option-stack__option"}
                              data-on={selected}
                              disabled={widget.disabled}
                              key={`${value}-${index}`}
                              onClick={() => header.column.setFilterValue(value)}
                              role="radio"
                              type="button"
                            >
                              {value || "All"}
                            </button>
                          );
                        })}
                      </div>
                    ) : header.column.getCanFilter() ? (
                      <input
                        aria-label={`Filter ${String(header.column.columnDef.header)}`}
                        className="lcars-table-filter"
                        disabled={widget.disabled}
                        onChange={(event) => header.column.setFilterValue(event.target.value)}
                        type={definition?.filter === "number" ? "number" : "search"}
                        value={filterValue}
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {orderedTop.length === 0 ? (
            <tr>
              <td className="lcars-table-empty" colSpan={colSpan}>
                {options.feedback?.message ?? "No data"}
              </td>
            </tr>
          ) : (
            bodyRows
          )}
        </tbody>
      </table>
      {options.pagination ? (
        <div className="lcars-table-pagination" aria-label="Table pagination">
          <button
            aria-label="Previous page"
            className="lcars-table-page-nav"
            disabled={widget.disabled || !table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            title="Previous page"
            type="button"
          >
            &lt;
          </button>
          <span>
            {state.page} / {Math.max(1, table.getPageCount())}
          </span>
          <div aria-label="Rows per page" className="lcars-segments lcars-table-page-size" role="radiogroup">
            {[10, 25, 50, 100].map((size) => {
              const selected = state.page_size === size;
              return (
                <button
                  aria-checked={selected}
                  className="lcars-segment"
                  data-on={selected}
                  disabled={widget.disabled}
                  key={size}
                  onClick={() => table.setPageSize(size)}
                  role="radio"
                  type="button"
                >
                  {size}
                </button>
              );
            })}
          </div>
          <button
            aria-label="Next page"
            className="lcars-table-page-nav"
            disabled={widget.disabled || !table.getCanNextPage()}
            onClick={() => table.nextPage()}
            title="Next page"
            type="button"
          >
            &gt;
          </button>
        </div>
      ) : null}
    </ScrollBox>
  );
}
