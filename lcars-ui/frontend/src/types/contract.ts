import type { GraphWorkspaceDocument } from "./workspace";
import type { Manifest as GeneratedManifest } from "./contract.generated";
import validateManifest from "./manifestValidator.generated";

export type LcarsNamedColor =
  | "orange"
  | "red"
  | "blue"
  | "purple"
  | "white"
  | "yellow"
  | "pale-canary"
  | "tanoi"
  | "golden-tanoi"
  | "neon-carrot"
  | "eggplant"
  | "lilac"
  | "anakiwa"
  | "mariner"
  | "bahama-blue"
  | "blue-bell"
  | "melrose"
  | "hopbush"
  | "chestnut-rose"
  | "orange-peel"
  | "atomic-tangerine"
  | "danub"
  | "indigo"
  | "lavender-purple"
  | "cosmic"
  | "red-damask"
  | "medium-carmine"
  | "bourbon"
  | "sandy-brown"
  | "periwinkle"
  | "dodger-pale"
  | "dodger-soft"
  | "near-blue"
  | "navy-blue"
  | "husk"
  | "rust"
  | "tamarillo";

export type LcarsColor = LcarsNamedColor | `#${string}`;
export type ManifestTheme =
  | "galaxy"
  | "nemesis"
  | "tng"
  | "outpost"
  | "cardassian"
  | "klingon"
  | "romulan"
  | "ferengi"
  | "gruvbox";
export type AlertCondition = "normal" | "yellow" | "red";
export type VisualLanguage = "strict";
export type StrictRenderer = "legacy";
export type StrictWidgetRole = "primary" | "secondary" | "terminal";
export type StrictBandRole = "page_title" | "content";
export type StrictLaneMode = "follow_columns" | "split_single_column";
export type StrictLaneRole = "title" | "content" | "core" | "support";

export type BackendManifestContract = GeneratedManifest;

// contract.ts may be narrower than the generated schema, never wider. If this
// fires, run `make contracts-update`, then narrow contract.ts to match; never
// widen the generated side.
type AssertContractNotWider<T extends GeneratedManifest> = T;
export type ManifestContractGuard = AssertContractNotWider<Manifest>;

export interface Manifest {
  meta: {
    version: string;
    app_name: string;
    theme: ManifestTheme;
    alert_condition: AlertCondition;
    lang: string;
    sound_enabled: boolean;
    force_uppercase: boolean;
    label_uppercase: boolean;
    lcars_font_headers: boolean;
    lcars_font_labels: boolean;
    lcars_font_text: boolean;
    visual_language: VisualLanguage;
    strict_renderer: StrictRenderer;
  };
  layout: {
    header: {
      title: string;
      subtitle?: string | null;
      color?: LcarsColor;
    };
    sidebar: {
      position: "left" | "right" | "hidden";
      items: SidebarItem[];
    };
  };
  pages: Record<string, Page>;
}

export interface SidebarSegment {
  label?: string | null;
  color: LcarsColor;
}

export interface SidebarItem {
  id: string;
  label: string;
  target_page: string;
  color?: LcarsColor | null;
  segments?: SidebarSegment[] | null;
}

export type PageArchetype = "auto" | "console" | "telemetry" | "grid" | "menu" | "authored";

export type PanelAspect = "wide" | "tall" | "square" | "flex";
export type LayoutSizing = "fill" | "content";

export interface Page {
  id: string;
  title: string;
  archetype: PageArchetype;
  chrome?: "console" | "none";
  rows: Row[];
  /** Fill leftover mosaic cells with decorative Okudagram blocks. Default true. */
  fillers?: boolean;
  /** Default panel sizing policy. Default fill. */
  sizing?: LayoutSizing;
}

export interface Row {
  id: string;
  height: string;
  strict_band_role?: StrictBandRole | null;
  strict_lane_mode?: StrictLaneMode | null;
  columns: Column[];
}

export interface Column {
  id: string;
  width: string;
  strict_lane_role?: StrictLaneRole | null;
  widgets: Widget[];
}

export interface WidgetBase {
  id: string;
  type: string;
  label?: string | null;
  strict_title?: string | null;
  color?: LcarsColor | null;
  strict_role?: StrictWidgetRole | null;
  zone?: "primary" | "side" | "readout" | "dock" | "rail" | "full" | null;
  /** Explicit mosaic footprint as [columns, rows]. Overrides the derived size. */
  span?: [number, number] | null;
  /** 1..12 importance. Heavier panels anchor the mosaic and are sized up. */
  weight?: number | null;
  /** Overrides the intrinsic aspect the packer infers from content. */
  aspect?: PanelAspect | null;
  /** Cluster key — panels sharing one are packed adjacent to each other. */
  group?: string | null;
  /** Override the page's panel sizing policy. */
  sizing?: LayoutSizing | null;
  /** Floating hint shown on hover, focus, tap or on demand. */
  hint?: Hint | null;
  disabled?: boolean;
  visible?: boolean;
}

export type HintTrigger = "hover" | "focus" | "click" | "press" | "always" | "manual";
export type HintPlacement = "auto" | "top" | "bottom" | "left" | "right";

/** A floating surface attached to a widget: plain text, or a full widget subtree. */
export interface Hint {
  text?: string | null;
  title?: string | null;
  /** Widgets rendered inside the hint — a hint can hold anything a page can. */
  children?: Widget[];
  trigger?: HintTrigger[];
  placement?: HintPlacement;
  /** Hover open delay in ms. */
  delay_ms?: number;
  /** Grace period before closing so the pointer can travel into the hint. */
  hide_delay_ms?: number;
  max_width?: number | null;
  dismissible?: boolean;
  /** Manual open state for trigger="manual"; null leaves it renderer-controlled. */
  open?: boolean | null;
}

export type FeedbackState = "ready" | "loading" | "empty" | "error";
export type InteractionMode = "local" | "server";

export interface WidgetFeedback {
  state: FeedbackState;
  message?: string | null;
}

export interface InteractionOptions {
  mode: InteractionMode;
  action_id?: string | null;
}

export interface LinkSpec {
  href: string;
  label?: string | null;
  target: "_self" | "_blank";
  rel?: string | null;
}

export interface ActionSpec {
  label: string;
  action_id: string;
  value?: unknown;
}

export interface ValueFormat {
  precision?: number | null;
  prefix: string;
  suffix: string;
  thousands: boolean;
  compact: boolean;
}

export interface BaseOptions {
  description?: string | null;
  feedback?: WidgetFeedback | null;
}

export interface TextOptions extends BaseOptions {
  semantic: "div" | "p" | "span";
  wrap: "wrap" | "pre" | "nowrap";
  max_lines?: number | null;
  selectable: boolean;
  copyable: boolean;
  link?: LinkSpec | null;
}

export interface MarkdownOptions extends BaseOptions {
  link_target: "_self" | "_blank";
  max_height?: number | null;
  copy_code: boolean;
}

export interface HeaderOptions extends BaseOptions {
  subtitle?: string | null;
  anchor?: string | null;
  actions: ActionSpec[];
}

export interface MetricOptions extends BaseOptions {
  secondary_value?: string | null;
  trend?: "up" | "down" | "flat" | null;
  value_format?: ValueFormat | null;
}

export interface AlertOptions extends BaseOptions {
  dismissible: boolean;
  action?: ActionSpec | null;
  live: "polite" | "assertive";
  interaction?: InteractionOptions | null;
}

export interface MeterOptions extends BaseOptions {
  min: number;
  max: number;
  unit?: string | null;
  value_format?: ValueFormat | null;
  indeterminate: boolean;
  segments: number;
  ticks: boolean;
  warn_threshold?: number | null;
  crit_threshold?: number | null;
}

export interface ValidationOptions {
  required: boolean;
  min_length?: number | null;
  max_length?: number | null;
  pattern?: string | null;
  message?: string | null;
}

export interface ButtonOptions extends BaseOptions {
  payload?: unknown;
  confirm?: string | null;
  debounce_ms: number;
  busy_label?: string | null;
}

export interface ToggleOptions extends BaseOptions {
  on_label?: string | null;
  off_label?: string | null;
}

export interface ChoiceOptions extends BaseOptions {
  searchable: boolean;
  multiple: boolean;
  placeholder?: string | null;
  presentation: "auto" | "segments" | "stack";
}

export interface TextInputOptions extends BaseOptions {
  multiline: boolean;
  rows: number;
  input_type: "text" | "search" | "email" | "url" | "tel";
  commit: "blur" | "enter" | "change";
  debounce_ms: number;
  validation?: ValidationOptions | null;
}

export interface NumberInputOptions extends BaseOptions {
  precision?: number | null;
  prefix: string;
  suffix: string;
  commit: "blur" | "enter" | "change";
  debounce_ms: number;
  required: boolean;
}

export interface FormOptions extends BaseOptions {
  layout: "stack" | "row" | "grid";
  columns: number;
  reset_label?: string | null;
  cancel_action?: ActionSpec | null;
  actions: ActionSpec[];
  variant: "default" | "composer";
  clear_on_submit: boolean;
  coerce_values: boolean;
}

export interface ContainerOptions extends BaseOptions {
  density: "compact" | "normal";
  overflow: "visible" | "auto" | "hidden";
  collapsible: boolean;
  initial_collapsed: boolean;
  interaction?: InteractionOptions | null;
}

export interface TextWidget extends WidgetBase {
  type: "text";
  content: string;
  size: "display" | "h1" | "h2" | "body" | "label" | "micro" | "mono";
  align?: "start" | "center" | "end";
  options?: TextOptions | null;
}

export interface StatusTileWidget extends WidgetBase {
  type: "status_tile";
  status: "ok" | "warn" | "crit";
  value: string;
  options?: MetricOptions | null;
}

export interface AlertWidget extends WidgetBase {
  type: "alert";
  severity: "red" | "yellow" | "info" | "success";
  message: string;
  blink: boolean;
  options?: AlertOptions | null;
}

export interface ProgressBarWidget extends WidgetBase {
  type: "progress_bar";
  value: number;
  show_label: boolean;
  options?: MeterOptions | null;
}

export interface MarkdownWidget extends WidgetBase {
  type: "markdown";
  content: string;
  options?: MarkdownOptions | null;
}

export interface ButtonWidget extends WidgetBase {
  type: "button";
  action_id: string;
  presentation?: "button" | "data_tile";
  symbol?: string | null;
  detail?: string | null;
  glyph?: AtomGlyph | null;
  terminal?: "none" | "start" | "end" | "both";
  density?: "normal" | "compact" | "micro";
  options?: ButtonOptions | null;
}

export interface AtomGlyph {
  rings: number;
  electrons: number;
  spokes: number;
  rotation: number;
}

export interface ToggleWidget extends WidgetBase {
  type: "toggle";
  checked: boolean;
  action_id: string;
  options?: ToggleOptions | null;
}

export interface CheckboxWidget extends WidgetBase {
  type: "lcars_checkbox";
  checked: boolean;
  action_id: string;
  options?: ToggleOptions | null;
}

export interface SelectWidget extends WidgetBase {
  type: "select";
  options: SelectOption[];
  value: string | string[];
  action_id: string;
  settings?: ChoiceOptions | null;
}

export interface RadioWidget extends WidgetBase {
  type: "lcars_radio";
  options: SelectOption[];
  value: string;
  action_id: string;
  settings?: ChoiceOptions | null;
}

export interface RadioToggleWidget extends WidgetBase {
  type: "lcars_radio_toggle";
  options: SelectOption[];
  value: string;
  action_id: string;
  settings?: ChoiceOptions | null;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  description?: string | null;
  group?: string | null;
}

export interface TextInputWidget extends WidgetBase {
  type: "text_input";
  placeholder?: string | null;
  value: string;
  password: boolean;
  regex?: string | null;
  autocomplete: boolean;
  options?: TextInputOptions | null;
}

export interface NumberInputWidget extends WidgetBase {
  type: "number_input";
  value: number;
  min?: number | null;
  max?: number | null;
  step: number;
  placeholder?: string | null;
  options?: NumberInputOptions | null;
}

export interface FileUploadWidget extends WidgetBase {
  type: "file_upload";
  action_id: string;
  upload_url: string;
  accept: string[];
  multiple: boolean;
  max_files: number;
  max_bytes: number;
}

export interface FormWidget extends WidgetBase {
  type: "form";
  submit_label: string;
  action_id: string;
  children: FormChildWidget[];
  options?: FormOptions | null;
}

export interface TableWidget extends WidgetBase {
  type: "table";
  headers: string[];
  rows: TableRow[];
  options?: TableOptions | null;
}

export type ScalarValue = string | number | boolean | null;

export interface TableCell {
  value?: ScalarValue;
  display?: string | null;
  link?: LinkSpec | null;
  action?: ActionSpec | null;
  status?: "ok" | "warn" | "crit" | "muted" | null;
  copyable?: boolean;
  copy_value?: string | null;
  copy_on_click?: boolean;
}

export interface TableDetailText {
  kind: "text";
  text: string;
  tone?: "default" | "muted";
}

export interface TableDetailStatus {
  kind: "status";
  status: "ok" | "warn" | "crit" | "muted";
  label: string;
}

export interface TableDetailLink {
  kind: "link";
  href: string;
  label?: string | null;
  target?: "_self" | "_blank";
  rel?: string | null;
}

export interface TableDetailAction {
  kind: "action";
  label: string;
  action_id: string;
  value?: unknown;
}

export interface TableDetailTable {
  kind: "table";
  headers: string[];
  rows: TableRow[];
}

export type TableDetail =
  | TableDetailText
  | TableDetailStatus
  | TableDetailLink
  | TableDetailAction
  | TableDetailTable;

export interface TableRow {
  id: string;
  cells: Array<ScalarValue | TableCell>;
  children?: TableRow[];
  expanded_content?: TableDetail[];
  loading?: boolean;
  error?: string | null;
}

export type SortAs =
  | "auto"
  | "text"
  | "natural"
  | "number"
  | "bytes"
  | "percent"
  | "duration"
  | "currency"
  | "datetime"
  | "version"
  | "boolean";

export interface TableColumn {
  key: string;
  label?: string | null;
  value_type: "auto" | "text" | "number" | "date" | "boolean";
  sortable: boolean;
  first_sort_direction: "asc" | "desc";
  filter: "none" | "text" | "select" | "number";
  align: "start" | "center" | "end";
  value_format?: ValueFormat | null;
  sort_as?: SortAs;
  sort_order?: string[] | null;
  sort_nulls?: "last" | "first";
}

export interface TableSort {
  key: string;
  direction: "asc" | "desc";
}

export interface TableFilter {
  key: string;
  value: string | number | boolean;
  operator: "contains" | "equals" | "gt" | "gte" | "lt" | "lte";
}

export interface TablePagination {
  page: number;
  page_size: number;
  total_rows?: number | null;
}

export interface TableSelection {
  mode: "none" | "single" | "multiple";
  selected_ids: string[];
}

export interface TableOptions extends BaseOptions {
  columns?: TableColumn[] | null;
  row_key?: string | null;
  sort: TableSort[];
  filters: TableFilter[];
  pagination?: TablePagination | null;
  selection: TableSelection;
  expanded_ids: string[];
  expandable: boolean;
  sticky_header: boolean;
  density: "compact" | "normal";
  interaction?: InteractionOptions | null;
  data_mode?: "client" | "server";
  sort_cycle?: "auto" | "two-state" | "three-state";
  emit_state_changes?: boolean;
  row_click_select?: boolean;
  expansion_motion?: "auto" | "none";
}

export interface TableState {
  sort: TableSort[];
  filters: TableFilter[];
  page: number;
  page_size: number;
  selected_ids: string[];
  expanded_ids: string[];
  last_event?: string | null;
}

export interface Series {
  name: string;
  data: number[];
  color?: LcarsColor | null;
}

export interface LineChartWidget extends WidgetBase {
  type: "line_chart";
  series: Series[];
  x_labels: string[];
  options?: ChartOptions | null;
}

export interface SparklineWidget extends WidgetBase {
  type: "sparkline";
  series: Series[];
  x_labels: string[];
  options?: SparklineOptions | null;
}

export interface AxisOptions {
  show: boolean;
  label?: string | null;
  min?: number | null;
  max?: number | null;
}

export interface ReferenceLine {
  value: number;
  label?: string | null;
  color?: LcarsColor | null;
}

export interface ChartOptions extends BaseOptions {
  x_axis: AxisOptions;
  y_axis: AxisOptions;
  legend: boolean;
  tooltip: boolean;
  curve: "linear" | "step";
  reference_lines: ReferenceLine[];
  zoom: boolean;
  interaction?: InteractionOptions | null;
}

export interface SparklineOptions extends BaseOptions {
  tooltip: boolean;
  show_latest: boolean;
  min?: number | null;
  max?: number | null;
  reference_value?: number | null;
}

export interface FinancialChartOptions extends BaseOptions {
  show_volume: boolean;
  legend: boolean;
  tooltip: boolean;
  fit_content: boolean;
  price_precision?: number | null;
  interaction?: InteractionOptions | null;
}

export interface OhlcPoint {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
}

export interface ChartMarker {
  time: number | string;
  position: "above" | "below" | "in";
  shape: "arrow_up" | "arrow_down" | "circle" | "square";
  color?: LcarsColor | null;
  text?: string | null;
}

export interface CandlestickWidget extends WidgetBase {
  type: "candlestick";
  data: OhlcPoint[];
  markers: ChartMarker[];
  up_color?: LcarsColor | null;
  down_color?: LcarsColor | null;
  options?: FinancialChartOptions | null;
}

export interface RenkoWidget extends WidgetBase {
  type: "renko";
  data: OhlcPoint[];
  markers: ChartMarker[];
  up_color?: LcarsColor | null;
  down_color?: LcarsColor | null;
  options?: FinancialChartOptions | null;
}

export interface ShaderOptions extends BaseOptions {
  paused: boolean;
  fps_limit: number;
  honor_reduced_motion: boolean;
  fallback: string;
}

export interface ShaderWidget extends WidgetBase {
  type: "shader";
  fragment_shader: string;
  uniforms: Record<string, number | number[]>;
  aspect_ratio?: number | null;
  options?: ShaderOptions | null;
}

export interface GaugeWidget extends WidgetBase {
  type: "gauge";
  value: number;
  min: number;
  max: number;
  unit?: string | null;
  warn_threshold?: number | null;
  crit_threshold?: number | null;
  options?: MeterOptions | null;
}

export interface LogViewerWidget extends WidgetBase {
  type: "log_viewer";
  stream_id: string;
  max_lines: number;
  auto_scroll: boolean;
  options?: LogOptions | null;
}

export interface LogOptions extends BaseOptions {
  wrap: boolean;
  line_numbers: boolean;
  timestamps: boolean;
  search: boolean;
  levels: string[];
  toolbar: boolean;
  paused: boolean;
  interaction?: InteractionOptions | null;
}

export interface VideoHlsWidget extends WidgetBase {
  type: "video_hls";
  src: string;
  autoplay: boolean;
  muted: boolean;
  options?: VideoOptions | null;
}

export interface VideoOptions extends BaseOptions {
  controls: boolean;
  loop: boolean;
  preload: "none" | "metadata" | "auto";
  playback_rates: number[];
  show_source: boolean;
  interaction?: InteractionOptions | null;
}

export interface ThreeSceneWidget extends WidgetBase {
  type: "three_scene";
  module: string;
  props: Record<string, unknown>;
  aspect_ratio?: number | null;
  options?: ThreeSceneOptions | null;
}

export interface ThreeSceneCamera {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export interface ThreeSceneControls {
  enabled: boolean;
  orbit: boolean;
  pan: boolean;
  zoom: boolean;
  damping: boolean;
  auto_rotate: boolean;
  auto_rotate_speed: number;
  min_distance: number;
  max_distance: number;
}

export interface ThreeSceneOptions extends BaseOptions {
  camera: ThreeSceneCamera;
  controls: ThreeSceneControls;
  paused: boolean;
  fps_limit: number;
  honor_reduced_motion: boolean;
  max_pixel_ratio: number;
  transparent: boolean;
  fallback: string;
  interaction?: InteractionOptions | null;
}

/* ---- Node graph (lcars-node-graph v1) ---- */

export type GraphFieldKind = "text" | "number" | "boolean" | "select";
export type GraphStatus = "idle" | "queued" | "running" | "success" | "error" | "cancelled";

export interface GraphPort {
  id: string;
  label?: string | null;
  type: string;
  /** Max simultaneous connections; null means one for inputs, unlimited for outputs. */
  capacity?: number | null;
  shape?: "circle" | "square" | "diamond" | "tab" | "notch";
}

export interface GraphFieldOption {
  value: string;
  label?: string | null;
}

export interface GraphField {
  id: string;
  label?: string | null;
  kind: GraphFieldKind;
  default?: string | number | boolean | null;
  options: GraphFieldOption[];
  min?: number | null;
  max?: number | null;
  step?: number | null;
  placeholder?: string | null;
}

export interface NodeTemplate {
  id: string;
  label?: string | null;
  category?: string | null;
  color?: LcarsColor | null;
  inputs: GraphPort[];
  outputs: GraphPort[];
  fields: GraphField[];
}

export interface GraphNode {
  id: string;
  template: string;
  position: [number, number];
  label?: string | null;
  values: Record<string, string | number | boolean | null>;
  group?: string | null;
}

export type GraphLayerPattern = "solid" | "dashed" | "dotted" | "double";
export type GraphLayerMarker = "arrow_closed" | "arrow_open" | "none";

export interface GraphLayer {
  id: string;
  label?: string | null;
  token?: string | null;
  color?: LcarsColor | null;
  pattern: GraphLayerPattern;
  marker: GraphLayerMarker;
  default_visible: boolean;
  default_emphasized: boolean;
  label_zoom_threshold: number;
  description?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  source_port: string;
  target: string;
  target_port: string;
  layer?: string | null;
  label?: string | null;
  relation?: string | null;
  accessible_label?: string | null;
}

export interface GraphReroute {
  id: string;
  edge: string;
  position: [number, number];
}

export interface GraphGroup {
  id: string;
  label?: string | null;
  position: [number, number];
  size: [number, number];
  color?: LcarsColor | null;
}

export interface GraphComment {
  id: string;
  text: string;
  position: [number, number];
  size: [number, number];
}

export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface GraphDocument {
  format: "lcars-node-graph";
  version: 1 | 2;
  layers: GraphLayer[];
  templates: NodeTemplate[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  reroutes: GraphReroute[];
  groups: GraphGroup[];
  comments: GraphComment[];
  viewport: GraphViewport;
}

export interface GraphNodeExecution {
  status: GraphStatus;
  progress?: number | null;
  message?: string | null;
}

export interface GraphExecutionState {
  status: GraphStatus;
  nodes: Record<string, GraphNodeExecution>;
  message?: string | null;
}

export interface NodeCanvasOptions extends BaseOptions {
  editable: boolean;
  movable: boolean;
  interaction?: InteractionOptions | null;
  min_zoom: number;
  max_zoom: number;
  snap_to_grid: boolean;
  grid_size: number;
  minimap: boolean;
  allow_import_export: boolean;
  history_limit: number;
  show_palette: boolean;
  show_run: boolean;
  show_queue: boolean;
  show_cancel: boolean;
  visible_edge_ids?: string[] | null;
}

export interface NodeCanvasState {
  document: GraphDocument;
  selection: string[];
  layer_state: Record<string, { visible: boolean; emphasized: boolean }>;
  last_event?: string | null;
}

export interface NodeCanvasWidget extends WidgetBase {
  type: "node_canvas";
  document: GraphDocument;
  execution?: GraphExecutionState | null;
  options?: NodeCanvasOptions | null;
}

export interface GraphWorkspaceWidget extends WidgetBase {
  type: "graph_workspace";
  workspace: GraphWorkspaceDocument;
  options?: {
    interaction?: InteractionOptions | null;
    canonical_title?: string;
    proposal_title?: string;
    canonical_collapsed?: boolean;
    fan_page_size?: number;
    virtual_row_height?: number;
    autosave_key?: string | null;
    autosave_delay_ms?: number;
  } | null;
}

export interface MicButtonWidget extends WidgetBase {
  type: "mic_button";
  upload_url: string;
  action_id: string;
  timeout_ms: number;
  continuous: boolean;
  silence_ms: number;
  options?: MicOptions | null;
}

export interface MicOptions extends BaseOptions {
  device_id?: string | null;
  mime_types: string[];
  vad_threshold?: number | null;
  min_duration_ms: number;
  max_bytes?: number | null;
}

export interface LcarsBoxWidget extends WidgetBase {
  type: "lcars_box";
  title?: string | null;
  subtitle?: string | null;
  corners: number[];
  sides: number[];
  color: LcarsColor;
  corner_colors?: [LcarsColor, LcarsColor, LcarsColor, LcarsColor] | null;
  side_colors?: [LcarsColor, LcarsColor, LcarsColor, LcarsColor] | null;
  title_color?: LcarsColor | null;
  subtitle_color?: LcarsColor | null;
  width_left: number;
  width_right: number;
  left_inputs?: Widget[] | null;
  right_inputs?: Widget[] | null;
  main_children?: Widget[] | null;
  side_children?: Widget[] | null;
  children: Widget[];
  options?: ContainerOptions | null;
}

export interface LcarsSweepWidget extends WidgetBase {
  type: "lcars_sweep";
  title?: string | null;
  subtitle?: string | null;
  color: LcarsColor;
  reverse: boolean;
  width_sidebar: number;
  left_width: number;
  header_children?: Widget[] | null;
  column_inputs?: Widget[] | null;
  left_children?: Widget[] | null;
  right_children?: Widget[] | null;
  rail_children?: Widget[] | null;
  content_children?: Widget[] | null;
  children: Widget[];
  options?: ContainerOptions | null;
}

export interface LcarsBracketWidget extends WidgetBase {
  type: "lcars_bracket";
  color: LcarsColor;
  orientation: "left" | "right" | "both";
  children: Widget[];
  options?: ContainerOptions | null;
}

export interface LcarsHeaderWidget extends WidgetBase {
  type: "lcars_header";
  text: string;
  color: LcarsColor;
  size: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  options?: HeaderOptions | null;
}

export interface LcarsBarWidget extends WidgetBase {
  type: "lcars_bar";
  text?: string | null;
  color: LcarsColor;
  caps: "none" | "start" | "end" | "both";
  label_mode: "embedded" | "cutout";
  align: "start" | "center" | "end";
  thickness: number;
}

export interface CompositionAreaWidget extends WidgetBase {
  type: "composition_area";
  row: number;
  column: number;
  row_span: number;
  column_span: number;
  align: "start" | "center" | "end" | "stretch";
  justify: "start" | "center" | "end" | "stretch";
  layer: number;
  decorative: boolean;
  children: Widget[];
}

export interface AuthoredCompositionWidget extends WidgetBase {
  type: "authored_composition";
  columns: [string, ...string[]];
  rows: [string, ...string[]];
  column_gap: string;
  row_gap: string;
  design_width: number;
  design_height: number;
  min_width: number;
  narrow: "scroll" | "scale" | "adaptive";
  children: CompositionAreaWidget[];
}

export interface SurfaceWidget extends WidgetBase {
  type: "surface";
  design_width: number;
  design_height: number;
  min_width: number;
  narrow: "scroll" | "scale" | "fluid";
  // Present together only when narrow === "fluid" - the second design size every anchored
  // node's bounds were also resolved against (see narrow_x/y/w/h below).
  narrow_design_width?: number | null;
  narrow_design_height?: number | null;
  children: Widget[];
}

export interface SurfaceRegionWidget extends WidgetBase {
  type: "surface_region";
  x: number;
  y: number;
  w: number;
  h: number;
  // Resolved a second time against the surface's narrow_design_size, when narrow === "fluid".
  // A node with no anchors resolves to the same values in both passes.
  narrow_x?: number | null;
  narrow_y?: number | null;
  narrow_w?: number | null;
  narrow_h?: number | null;
  layer: "geometry" | "content" | "overlay" | "effects";
  children: Widget[];
}

export type SurfaceLayer = "geometry" | "content" | "overlay" | "effects";

export interface MirrorSpec {
  axis: "x" | "y" | "xy";
  axis_x?: number | null;
  axis_y?: number | null;
}

export interface RepeatRadialSpec {
  count: number;
  center_x: number;
  center_y: number;
  start_angle: number;
  end_angle: number;
}

export interface RepeatLinearSpec {
  count: number;
  dx: number;
  dy: number;
}

// Transforms are NOT expanded into repeated children here - the renderer expands this spec into
// per-copy SVG <g transform> wrappers (geometry) / repositioned overlays (regions) at render
// time. See widgets/surfaceTransforms.ts.
export interface SurfaceGroupWidget extends WidgetBase {
  type: "surface_group";
  mirror?: MirrorSpec | null;
  repeat_radial?: RepeatRadialSpec | null;
  repeat_linear?: RepeatLinearSpec | null;
  rotate?: number | null;
  rotate_pivot_x?: number | null;
  rotate_pivot_y?: number | null;
  children: Widget[];
}

export interface EffectNode extends WidgetBase {
  type: "effect";
  target: string;
  kind: "sweep" | "pulse" | "flow";
  period_ms: number;
  direction: "cw" | "ccw";
  from_angle?: number | null;
  to_angle?: number | null;
  pivot_x?: number | null;
  pivot_y?: number | null;
  colors?: [LcarsColor, LcarsColor] | null;
  layer: "effects";
}

export interface RectNode extends WidgetBase {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  narrow_x?: number | null;
  narrow_y?: number | null;
  narrow_w?: number | null;
  narrow_h?: number | null;
  layer?: SurfaceLayer;
}

export interface RoundedRectNode extends WidgetBase {
  type: "rounded_rect";
  x: number;
  y: number;
  w: number;
  h: number;
  narrow_x?: number | null;
  narrow_y?: number | null;
  narrow_w?: number | null;
  narrow_h?: number | null;
  radius: number;
  layer?: SurfaceLayer;
}

export interface CapsuleNode extends WidgetBase {
  type: "capsule";
  x: number;
  y: number;
  w: number;
  h: number;
  narrow_x?: number | null;
  narrow_y?: number | null;
  narrow_w?: number | null;
  narrow_h?: number | null;
  layer?: SurfaceLayer;
}

export interface CircleNode extends WidgetBase {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
  layer?: SurfaceLayer;
}

export interface EllipseNode extends WidgetBase {
  type: "ellipse";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  layer?: SurfaceLayer;
}

export interface ArcNode extends WidgetBase {
  type: "arc";
  center_x: number;
  center_y: number;
  radius: number;
  start_angle: number;
  end_angle: number;
  layer?: SurfaceLayer;
}

export interface RingNode extends WidgetBase {
  type: "ring";
  center_x: number;
  center_y: number;
  inner_radius: number;
  outer_radius: number;
  start_angle: number;
  end_angle: number;
  layer?: SurfaceLayer;
}

export interface WedgeNode extends WidgetBase {
  type: "wedge";
  center_x: number;
  center_y: number;
  inner_radius: number;
  outer_radius: number;
  start_angle: number;
  end_angle: number;
  layer?: SurfaceLayer;
}

export type ElbowCornerOrientation = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface ElbowNode extends WidgetBase {
  type: "elbow";
  x: number;
  y: number;
  w: number;
  h: number;
  arm_thickness_x: number;
  arm_thickness_y: number;
  corner: ElbowCornerOrientation;
  outer_radius: number;
  inner_radius: number;
  layer?: SurfaceLayer;
}

export interface PolygonNode extends WidgetBase {
  type: "polygon";
  points: { x: number; y: number }[];
  layer?: SurfaceLayer;
}

export type MoveCommand = { op: "move"; x: number; y: number };
export type LineCommand = { op: "line"; x: number; y: number };
export type ArcCommand = {
  op: "arc";
  rx: number;
  ry: number;
  rotation: number;
  large_arc: 0 | 1;
  sweep: 0 | 1;
  x: number;
  y: number;
};
export type CloseCommand = { op: "close" };
export type PathCommandSpec = MoveCommand | LineCommand | ArcCommand | CloseCommand;

export interface PathNode extends WidgetBase {
  type: "path";
  commands: PathCommandSpec[];
  filled: boolean;
  layer?: SurfaceLayer;
}

export type ConnectorStyleSpec = "straight" | "elbow" | "bezier";

export interface ConnectorNode extends WidgetBase {
  type: "connector";
  from_x: number;
  from_y: number;
  to_x: number;
  to_y: number;
  style: ConnectorStyleSpec;
  layer?: SurfaceLayer;
}

export interface TextPathNode extends WidgetBase {
  type: "text_path";
  path_ref: string;
  text: string;
  start_offset: number;
  layer?: SurfaceLayer;
}

export interface PopupWidget extends WidgetBase {
  type: "popup";
  title: string;
  children: Widget[];
  open: boolean;
  modal: boolean;
  dismissible: boolean;
  draggable: boolean;
  resizable: boolean;
  width: number;
  height: number;
  position?: [number, number] | null;
  close_action_id?: string | null;
  color: LcarsColor;
}

export interface WebUISettingsWidget extends WidgetBase {
  type: "webui_settings";
}

/* ---- Knowledge-graph client instruments ---- */

export type WebAtomType = "empirical" | "formal" | "assumption";

export interface WebRef {
  id: string;
  label: string;
}

export type WebCompletenessState = "complete" | "partial";

export interface SupportCompleteness {
  state: WebCompletenessState;
  returned?: number | null;
  total?: number | null;
  reason?: string | null;
}

export interface SupportData {
  node: string;
  truncated: boolean;
  completeness?: SupportCompleteness;
  environments: Array<{
    atoms: Array<WebRef & { type: WebAtomType }>;
  }>;
}

export interface SupportPanelWidget extends WidgetBase {
  type: "support_panel";
  title: string;
  data: SupportData;
  show_environments: boolean;
  show_legend: boolean;
  children: Widget[];
}

export interface TriStateData {
  query: string;
  target: string;
  scope: string;
  result: "YES" | "NO" | "UNKNOWN";
  mode: "FAST" | "EXACT";
  reason: "label_truncated" | "no_compatible_environment" | "complete";
}

export interface TriStateWidget extends WidgetBase {
  type: "tri_state";
  data: TriStateData;
  on_escalate?: "EXACT" | null;
}

export type FormChildWidget =
  | ToggleWidget
  | CheckboxWidget
  | SelectWidget
  | RadioWidget
  | RadioToggleWidget
  | TextInputWidget
  | NumberInputWidget
  | ButtonWidget;

export type Widget =
  | TextWidget
  | StatusTileWidget
  | AlertWidget
  | ProgressBarWidget
  | MarkdownWidget
  | ButtonWidget
  | ToggleWidget
  | CheckboxWidget
  | SelectWidget
  | RadioWidget
  | RadioToggleWidget
  | TextInputWidget
  | NumberInputWidget
  | FileUploadWidget
  | FormWidget
  | TableWidget
  | LineChartWidget
  | SparklineWidget
  | CandlestickWidget
  | RenkoWidget
  | ShaderWidget
  | GaugeWidget
  | LogViewerWidget
  | VideoHlsWidget
  | ThreeSceneWidget
  | NodeCanvasWidget
  | GraphWorkspaceWidget
  | MicButtonWidget
  | LcarsBoxWidget
  | LcarsSweepWidget
  | LcarsBracketWidget
  | LcarsHeaderWidget
  | LcarsBarWidget
  | CompositionAreaWidget
  | AuthoredCompositionWidget
  | SurfaceWidget
  | SurfaceRegionWidget
  | SurfaceGroupWidget
  | EffectNode
  | RectNode
  | RoundedRectNode
  | CapsuleNode
  | CircleNode
  | EllipseNode
  | ArcNode
  | RingNode
  | WedgeNode
  | ElbowNode
  | PolygonNode
  | PathNode
  | ConnectorNode
  | TextPathNode
  | PopupWidget
  | WebUISettingsWidget
  | SupportPanelWidget
  | TriStateWidget;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "string";

const hasBoolean = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "boolean";

const hasNullableString = (value: Record<string, unknown>, key: string): boolean => {
  return value[key] === undefined || value[key] === null || typeof value[key] === "string";
};

const isSidebarSegments = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((segment) => {
    if (!isObject(segment)) {
      return false;
    }
    return typeof segment.color === "string";
  });
};

const validStrictBandRoles = new Set<StrictBandRole>(["page_title", "content"]);
const validStrictLaneModes = new Set<StrictLaneMode>(["follow_columns", "split_single_column"]);
const validStrictLaneRoles = new Set<StrictLaneRole>(["title", "content", "core", "support"]);
const validStrictWidgetRoles = new Set<StrictWidgetRole>(["primary", "secondary", "terminal"]);

const isStrictBandRole = (value: unknown): boolean => {
  return value === undefined || value === null || (typeof value === "string" && validStrictBandRoles.has(value as StrictBandRole));
};

const isStrictLaneMode = (value: unknown): boolean => {
  return value === undefined || value === null || (typeof value === "string" && validStrictLaneModes.has(value as StrictLaneMode));
};

const isStrictLaneRole = (value: unknown): boolean => {
  return value === undefined || value === null || (typeof value === "string" && validStrictLaneRoles.has(value as StrictLaneRole));
};

const isStrictWidgetRole = (value: unknown): boolean => {
  return value === undefined || value === null || (typeof value === "string" && validStrictWidgetRoles.has(value as StrictWidgetRole));
};

const isWidgetLike = (value: unknown): boolean => {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasString(value, "id") &&
    hasString(value, "type") &&
    hasNullableString(value, "strict_title") &&
    isStrictWidgetRole(value.strict_role)
  );
};

const isColumn = (value: unknown): value is Column => {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasString(value, "id") &&
    hasString(value, "width") &&
    isStrictLaneRole(value.strict_lane_role) &&
    Array.isArray(value.widgets) &&
    value.widgets.every((widget) => isWidgetLike(widget))
  );
};

const isRow = (value: unknown): value is Row => {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasString(value, "id") &&
    hasString(value, "height") &&
    isStrictBandRole(value.strict_band_role) &&
    isStrictLaneMode(value.strict_lane_mode) &&
    Array.isArray(value.columns) &&
    value.columns.every((column) => isColumn(column))
  );
};

const isPage = (value: unknown): value is Page => {
  if (!isObject(value)) {
    return false;
  }

  return (
    hasString(value, "id") &&
    hasString(value, "title") &&
    Array.isArray(value.rows) &&
    value.rows.every((row) => isRow(row))
  );
};

const hasRuntimeShellShape = (value: unknown): value is Manifest => {
  if (!isObject(value)) {
    return false;
  }
  if (!isObject(value.meta) || !isObject(value.layout) || !isObject(value.pages)) {
    return false;
  }
  const meta = value.meta;
  const layout = value.layout;
  const pages = value.pages;
  const validThemes = new Set([
    "galaxy",
    "nemesis",
    "tng",
    "outpost",
    "cardassian",
    "klingon",
    "romulan",
    "ferengi",
    "gruvbox",
  ]);
  const validVisualLanguages = new Set(["strict"]);
  const validStrictRenderers = new Set(["legacy"]);
  const validSidebarPositions = new Set(["left", "right", "hidden"]);
  if (
    !hasString(meta, "version") ||
    !hasString(meta, "app_name") ||
    !hasString(meta, "theme") ||
    !validThemes.has(meta.theme as string) ||
    !hasString(meta, "lang") ||
    !hasBoolean(meta, "sound_enabled")
  ) {
    return false;
  }
  if (
    !hasBoolean(meta, "force_uppercase") ||
    !hasBoolean(meta, "label_uppercase") ||
    !hasBoolean(meta, "lcars_font_headers") ||
    !hasBoolean(meta, "lcars_font_labels") ||
    !hasBoolean(meta, "lcars_font_text") ||
    !hasString(meta, "visual_language") ||
    !validVisualLanguages.has(meta.visual_language as string) ||
    !hasString(meta, "strict_renderer") ||
    !validStrictRenderers.has(meta.strict_renderer as string)
  ) {
    return false;
  }
  if (!isObject(layout.header) || !isObject(layout.sidebar)) {
    return false;
  }
  if (
    !hasString(layout.header, "title") ||
    !Array.isArray(layout.sidebar.items) ||
    !hasString(layout.sidebar, "position") ||
    !validSidebarPositions.has(layout.sidebar.position as string)
  ) {
    return false;
  }
  if (
    !layout.sidebar.items.every((item) => {
      if (!isObject(item)) {
        return false;
      }
      return (
        hasString(item, "id") &&
        hasString(item, "label") &&
        hasString(item, "target_page") &&
        isSidebarSegments(item.segments)
      );
    })
  ) {
    return false;
  }
  if (Object.keys(pages).length === 0) {
    return false;
  }
  return Object.values(pages).every((page) => isPage(page));
};

export const isManifest = (value: unknown): value is Manifest =>
  Boolean(validateManifest(value)) && hasRuntimeShellShape(value);
