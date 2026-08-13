import type { GraphWorkspaceDocument } from "../../types/workspace";

export type GraphWorkspaceOptions = {
  interaction?: { mode: "local" | "server"; action_id?: string | null } | null;
  canonical_title?: string;
  proposal_title?: string;
  canonical_collapsed?: boolean;
  fan_page_size?: number;
  virtual_row_height?: number;
  autosave_key?: string | null;
  autosave_delay_ms?: number;
};

export type GraphWorkspaceWidget = {
  id: string;
  type: "graph_workspace";
  label?: string | null;
  workspace: GraphWorkspaceDocument;
  options?: GraphWorkspaceOptions | null;
  color?: string | null;
  disabled?: boolean;
  visible?: boolean;
};

export type WorkspaceWidgetHandlers = {
  onAction: (actionId: string, value: unknown, widgetId?: string) => void;
  onUiStateChange?: (widgetId: string, value: unknown) => void;
};
