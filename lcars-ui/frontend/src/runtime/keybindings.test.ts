import { describe, expect, it } from "vitest";

import type { KeyBinding } from "../types/contract";
import {
  bindingChord,
  bindingsForScope,
  chordForEvent,
  chordsConflict,
  formatChord,
  matchesChord,
  resolveKeyBindingDefinitions,
} from "./keybindings";

const binding: KeyBinding = {
  id: "action.search",
  label: "Search",
  chord: "mod+k",
  action_id: "search",
  command: null,
  scope: "global",
  allow_in_inputs: false,
  prevent_default: true,
};

describe("key binding runtime", () => {
  it("captures and matches portable Mod chords on each platform", () => {
    const ctrlK = { altKey: false, ctrlKey: true, key: "k", metaKey: false, shiftKey: false };
    const commandK = { altKey: false, ctrlKey: false, key: "K", metaKey: true, shiftKey: false };

    expect(chordForEvent(ctrlK, false)).toBe("mod+k");
    expect(chordForEvent(commandK, true)).toBe("mod+k");
    expect(chordForEvent({ ...ctrlK, key: "+", shiftKey: true }, false)).toBe("mod+shift+plus");
    expect(matchesChord(ctrlK, "mod+k", false)).toBe(true);
    expect(matchesChord(commandK, "mod+k", true)).toBe(true);
    expect(matchesChord(ctrlK, "mod+shift+k", false)).toBe(false);
  });

  it("uses browser overrides, including an explicit disabled binding", () => {
    expect(bindingChord(binding, {})).toBe("mod+k");
    expect(bindingChord(binding, { "action.search": "alt+s" })).toBe("alt+s");
    expect(bindingChord(binding, { "action.search": null })).toBeNull();
    expect(bindingsForScope([binding], { "action.search": null }, "global")).toEqual([]);
  });

  it("detects portable conflicts on either primary-modifier platform", () => {
    expect(chordsConflict("mod+k", "ctrl+k")).toBe(true);
    expect(chordsConflict("mod+k", "meta+k")).toBe(true);
    expect(chordsConflict("mod+k", "alt+k")).toBe(false);
  });

  it("formats the same portable chord for Apple and non-Apple operators", () => {
    expect(formatChord("mod+shift+k", false)).toBe("Ctrl+Shift+K");
    expect(formatChord("mod+shift+k", true)).toBe("⌘⇧K");
  });

  it("preserves framework shortcuts for an older manifest without binding metadata", () => {
    const withOptions = resolveKeyBindingDefinitions(undefined, true);
    const withoutOptions = resolveKeyBindingDefinitions(undefined, false);

    expect(withOptions.find((item) => item.id === "graph.copy")?.chord).toBe("mod+c");
    expect(withOptions.find((item) => item.id === "interface.open_options")?.chord).toBe("mod+,");
    expect(withoutOptions.find((item) => item.id === "interface.open_options")).toBeUndefined();
  });
});
