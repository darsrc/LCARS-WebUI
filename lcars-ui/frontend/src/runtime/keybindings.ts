import type { KeyBinding, KeyBindingCommand, KeyBindingScope } from "../types/contract";

export type KeyBindingOverrides = Record<string, string | null>;

export const DEFAULT_KEY_BINDINGS: KeyBinding[] = [
  { id: "interface.open_options", label: "Open Options", chord: "mod+,", action_id: null, command: "open_options", scope: "global", allow_in_inputs: true, prevent_default: true },
  { id: "graph.copy", label: "Copy graph selection", chord: "mod+c", action_id: null, command: "graph_copy", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
  { id: "graph.paste", label: "Paste graph selection", chord: "mod+v", action_id: null, command: "graph_paste", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
  { id: "graph.duplicate", label: "Duplicate graph selection", chord: "mod+d", action_id: null, command: "graph_duplicate", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
  { id: "graph.group", label: "Group graph selection", chord: "mod+g", action_id: null, command: "graph_group", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
  { id: "graph.undo", label: "Undo graph edit", chord: "mod+z", action_id: null, command: "graph_undo", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
  { id: "graph.redo", label: "Redo graph edit", chord: "mod+shift+z", action_id: null, command: "graph_redo", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
  { id: "graph.redo_alternate", label: "Redo graph edit (alternate)", chord: "mod+y", action_id: null, command: "graph_redo", scope: "graph_canvas", allow_in_inputs: false, prevent_default: true },
];

export const resolveKeyBindingDefinitions = (
  declared: KeyBinding[] | undefined,
  optionsPage: boolean,
): KeyBinding[] => {
  const resolved = new Map(DEFAULT_KEY_BINDINGS.map((binding) => [binding.id, binding]));
  for (const binding of declared ?? []) resolved.set(binding.id, binding);
  return [...resolved.values()].filter((binding) =>
    optionsPage || binding.command !== "open_options");
};

const MODIFIERS = ["mod", "ctrl", "meta", "alt", "shift"] as const;
const KEY_ALIASES: Record<string, string> = {
  " ": "space",
  "+": "plus",
  esc: "escape",
  return: "enter",
};

export const isApplePlatform = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

export const normalizeEventKey = (key: string): string =>
  KEY_ALIASES[key.toLowerCase()] ?? key.toLowerCase();

export const chordForEvent = (
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">,
  apple = isApplePlatform(),
): string | null => {
  const key = normalizeEventKey(event.key);
  if (["alt", "control", "meta", "shift"].includes(key)) return null;
  const parts: string[] = [];
  if ((apple && event.metaKey) || (!apple && event.ctrlKey)) parts.push("mod");
  if (event.ctrlKey && apple) parts.push("ctrl");
  if (event.metaKey && !apple) parts.push("meta");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  parts.push(key);
  return parts.join("+");
};

export const matchesChord = (
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">,
  chord: string | null | undefined,
  apple = isApplePlatform(),
): boolean => {
  if (!chord) return false;
  const parts = new Set(chord.toLowerCase().split("+"));
  const key = [...parts].find((part) => !MODIFIERS.includes(part as typeof MODIFIERS[number]));
  if (!key || normalizeEventKey(event.key) !== key) return false;
  const mod = parts.has("mod");
  const ctrl = parts.has("ctrl") || (mod && !apple);
  const meta = parts.has("meta") || (mod && apple);
  return event.ctrlKey === ctrl
    && event.metaKey === meta
    && event.altKey === parts.has("alt")
    && event.shiftKey === parts.has("shift");
};

export const bindingChord = (
  binding: KeyBinding,
  overrides: KeyBindingOverrides,
): string | null =>
  Object.prototype.hasOwnProperty.call(overrides, binding.id)
    ? overrides[binding.id] ?? null
    : binding.chord;

const chordSignature = (chord: string, apple: boolean): string => {
  const primary = apple ? "meta" : "ctrl";
  return [...new Set(chord.split("+").map((part) => part === "mod" ? primary : part))]
    .sort()
    .join("+");
};

export const chordsConflict = (left: string, right: string): boolean =>
  chordSignature(left, false) === chordSignature(right, false)
  || chordSignature(left, true) === chordSignature(right, true);

export const bindingsForScope = (
  bindings: KeyBinding[],
  overrides: KeyBindingOverrides,
  scope: KeyBindingScope,
): Array<KeyBinding & { effectiveChord: string }> =>
  bindings.flatMap((binding) => {
    const chord = binding.scope === scope ? bindingChord(binding, overrides) : null;
    return chord ? [{ ...binding, effectiveChord: chord }] : [];
  });

export const bindingForCommand = (
  bindings: KeyBinding[],
  overrides: KeyBindingOverrides,
  command: KeyBindingCommand,
): Array<KeyBinding & { effectiveChord: string }> =>
  bindingsForScope(bindings, overrides, "graph_canvas")
    .filter((binding) => binding.command === command);

export const eventTargetsEditableControl = (event: KeyboardEvent): boolean => {
  const target = event.target;
  return target instanceof Element
    && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
};

export const formatChord = (chord: string | null, apple = isApplePlatform()): string => {
  if (!chord) return "Unassigned";
  const labels: Record<string, string> = apple
    ? { mod: "⌘", ctrl: "⌃", meta: "⌘", alt: "⌥", shift: "⇧" }
    : { mod: "Ctrl", ctrl: "Ctrl", meta: "Meta", alt: "Alt", shift: "Shift" };
  return chord.split("+").map((part) => {
    if (labels[part]) return labels[part];
    if (part.startsWith("arrow")) return part.slice(5).replace(/^./, (value) => value.toUpperCase());
    return part.length === 1 ? part.toUpperCase() : part.replace(/^./, (value) => value.toUpperCase());
  }).join(apple ? "" : "+");
};
