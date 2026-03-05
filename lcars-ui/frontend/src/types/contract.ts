export type LcarsColor = "orange" | "red" | "blue" | "purple" | "white" | "yellow";

export interface Manifest {
  meta: {
    version: string;
    app_name: string;
    theme: string;
    lang: string;
    sound_enabled: boolean;
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

export interface SidebarItem {
  id: string;
  label: string;
  target_page: string;
  color?: LcarsColor | null;
}

export interface Page {
  id: string;
  title: string;
  rows: Row[];
}

export interface Row {
  id: string;
  height: string;
  columns: Column[];
}

export interface Column {
  id: string;
  width: string;
  widgets: Widget[];
}

export interface WidgetBase {
  id: string;
  type: string;
  label?: string | null;
  color?: LcarsColor | null;
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

export interface SelectWidget extends WidgetBase {
  type: "select";
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

export type FormChildWidget =
  | ToggleWidget
  | SelectWidget
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
  | SelectWidget
  | TextInputWidget
  | NumberInputWidget
  | FormWidget
  | TableWidget
  | LineChartWidget
  | SparklineWidget
  | GaugeWidget
  | LogViewerWidget
  | VideoHlsWidget
  | MicButtonWidget;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasString = (value: Record<string, unknown>, key: string): boolean =>
  typeof value[key] === "string";

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
  if (
    !hasString(meta, "version") ||
    !hasString(meta, "app_name") ||
    !hasString(meta, "theme") ||
    !hasString(meta, "lang") ||
    typeof meta.sound_enabled !== "boolean"
  ) {
    return false;
  }
  if (!isObject(layout.header) || !isObject(layout.sidebar)) {
    return false;
  }
  if (!hasString(layout.header, "title") || !Array.isArray(layout.sidebar.items)) {
    return false;
  }
  if (Object.keys(pages).length === 0) {
    return false;
  }
  return true;
};
