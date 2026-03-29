import type { StrictWidgetRole, Widget } from "../../types/contract";

/**
 * Resolves the strict role for a widget based on its type and configuration.
 * This function determines how widgets are placed in strict-mode lanes.
 */
export function resolveStrictWidgetRole(widget: Widget): StrictWidgetRole {
  // Explicit strict_role takes precedence
  if (widget.strict_role) {
    return widget.strict_role;
  }

  // Default roles based on widget type
  const terminalWidgetTypes = [
    "button",
    "toggle",
    "checkbox",
    "radio_toggle",
    "select",
    "text_input",
    "number_input",
    "form",
    "log_viewer",
  ];

  const secondaryWidgetTypes = [
    "status_tile",
    "progress",
    "gauge",
    "alert",
  ];

  if (terminalWidgetTypes.includes(widget.type)) {
    return "terminal";
  }

  if (secondaryWidgetTypes.includes(widget.type)) {
    return "secondary";
  }

  // Default to primary for display widgets
  return "primary";
}