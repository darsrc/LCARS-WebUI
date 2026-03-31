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
export type ManifestTheme = "galaxy" | "nemesis" | "tng";
export type VisualLanguage = "strict";
export type StrictRenderer = "legacy";
export type StrictWidgetRole = "primary" | "secondary" | "terminal";
export type StrictBandRole = "page_title" | "content";
export type StrictLaneMode = "follow_columns" | "split_single_column";
export type StrictLaneRole = "title" | "content" | "core" | "support";

export interface Manifest {
  meta: {
    version: string;
    app_name: string;
    theme: ManifestTheme;
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
      color?: LcarsColor | null;
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

export interface Page {
  id: string;
  title: string;
  rows: Row[];
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
  disabled?: boolean;
  visible?: boolean;
}

export interface TextWidget extends WidgetBase {
  type: "text";
  content: string;
  size: "h1" | "h2" | "body" | "mono";
}

export interface StatusTileWidget extends WidgetBase {
  type: "status_tile";
  status: "ok" | "warn" | "crit";
  value: string;
}

export interface AlertWidget extends WidgetBase {
  type: "alert";
  severity: "red" | "yellow";
  message: string;
  blink: boolean;
}

export interface ProgressBarWidget extends WidgetBase {
  type: "progress_bar";
  value: number;
  show_label: boolean;
}

export interface MarkdownWidget extends WidgetBase {
  type: "markdown";
  content: string;
}

export interface ButtonWidget extends WidgetBase {
  type: "button";
  action_id: string;
}

export interface ToggleWidget extends WidgetBase {
  type: "toggle";
  checked: boolean;
  action_id: string;
}

export interface CheckboxWidget extends WidgetBase {
  type: "lcars_checkbox";
  checked: boolean;
  action_id: string;
}

export interface SelectWidget extends WidgetBase {
  type: "select";
  options: SelectOption[];
  value: string;
  action_id: string;
}

export interface RadioWidget extends WidgetBase {
  type: "lcars_radio";
  options: SelectOption[];
  value: string;
  action_id: string;
}

export interface RadioToggleWidget extends WidgetBase {
  type: "lcars_radio_toggle";
  options: SelectOption[];
  value: string;
  action_id: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface TextInputWidget extends WidgetBase {
  type: "text_input";
  placeholder?: string | null;
  value: string;
  password: boolean;
  regex?: string | null;
}

export interface NumberInputWidget extends WidgetBase {
  type: "number_input";
  value: number;
  min?: number | null;
  max?: number | null;
  step: number;
  placeholder?: string | null;
}

export interface FormWidget extends WidgetBase {
  type: "form";
  submit_label: string;
  action_id: string;
  children: FormChildWidget[];
}

export interface TableWidget extends WidgetBase {
  type: "table";
  headers: string[];
  rows: TableRow[];
}

export interface TableRow {
  id: string;
  cells: string[];
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
}

export interface SparklineWidget extends WidgetBase {
  type: "sparkline";
  series: Series[];
  x_labels: string[];
}

export interface GaugeWidget extends WidgetBase {
  type: "gauge";
  value: number;
  min: number;
  max: number;
  unit?: string | null;
  warn_threshold?: number | null;
  crit_threshold?: number | null;
}

export interface LogViewerWidget extends WidgetBase {
  type: "log_viewer";
  stream_id: string;
  max_lines: number;
}

export interface VideoHlsWidget extends WidgetBase {
  type: "video_hls";
  src: string;
  autoplay: boolean;
  muted: boolean;
}

export interface MicButtonWidget extends WidgetBase {
  type: "mic_button";
  upload_url: string;
  action_id: string;
  timeout_ms: number;
}

export interface LcarsBoxWidget extends WidgetBase {
  type: "lcars_box";
  title?: string | null;
  subtitle?: string | null;
  corners: number[];
  sides: number[];
  color: LcarsColor;
  corner_colors?: LcarsColor[] | null;
  side_colors?: LcarsColor[] | null;
  title_color?: LcarsColor | null;
  subtitle_color?: LcarsColor | null;
  width_left: number;
  width_right: number;
  left_inputs?: Widget[] | null;
  right_inputs?: Widget[] | null;
  main_children?: Widget[] | null;
  side_children?: Widget[] | null;
  children: Widget[];
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
}

export interface LcarsBracketWidget extends WidgetBase {
  type: "lcars_bracket";
  color: LcarsColor;
  orientation: "left" | "right" | "both";
  children: Widget[];
}

export interface LcarsHeaderWidget extends WidgetBase {
  type: "lcars_header";
  text: string;
  color: LcarsColor;
  size: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
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
  | FormWidget
  | TableWidget
  | LineChartWidget
  | SparklineWidget
  | GaugeWidget
  | LogViewerWidget
  | VideoHlsWidget
  | MicButtonWidget
  | LcarsBoxWidget
  | LcarsSweepWidget
  | LcarsBracketWidget
  | LcarsHeaderWidget;

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

export const isManifest = (value: unknown): value is Manifest => {
  if (!isObject(value)) {
    return false;
  }
  if (!isObject(value.meta) || !isObject(value.layout) || !isObject(value.pages)) {
    return false;
  }
  const meta = value.meta;
  const layout = value.layout;
  const pages = value.pages;
  const validThemes = new Set(["galaxy", "nemesis", "tng"]);
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
