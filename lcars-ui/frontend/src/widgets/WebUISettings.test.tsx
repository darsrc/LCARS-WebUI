import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { KeyBinding } from "../types/contract";
import { WebUISettings } from "./WebUISettings";

const bindings: KeyBinding[] = [
  {
    id: "interface.open_options",
    label: "Open Options",
    chord: "mod+,",
    action_id: null,
    command: "open_options",
    scope: "global",
    allow_in_inputs: false,
    prevent_default: true,
  },
  {
    id: "action.search",
    label: "Search",
    chord: "mod+k",
    action_id: "search",
    command: null,
    scope: "global",
    allow_in_inputs: false,
    prevent_default: true,
  },
];

describe("WebUISettings", () => {
  it("surfaces theme, motion, sound, case, type, and reset controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(
      <WebUISettings
        bindings={bindings}
        onChange={onChange}
        onReset={onReset}
        preferences={{
          theme: "galaxy",
          soundEnabled: true,
          motion: "system",
          uppercase: true,
          lcarsFontText: false,
          keyBindings: {},
        }}
      />,
    );

    const theme = screen.getByRole("radiogroup", { name: "Theme" });
    const motion = screen.getByRole("radiogroup", { name: "Motion" });
    expect(theme).toHaveClass("lcars-option-stack");
    expect(motion).toHaveClass("lcars-segments");
    expect(screen.getByRole("radio", { name: "Galaxy / 2357" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Follow system" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Nemesis / 2379" }));
    await user.click(screen.getByRole("radio", { name: "Reduced motion" }));
    await user.click(screen.getByRole("button", { name: /Interface sound/i }));
    await user.click(screen.getByRole("button", { name: /LCARS body type/i }));
    await user.click(screen.getByRole("button", { name: /Restore all application defaults/i }));

    expect(onChange).toHaveBeenCalledWith({ theme: "nemesis" });
    expect(onChange).toHaveBeenCalledWith({ motion: "reduced" });
    expect(onChange).toHaveBeenCalledWith({ soundEnabled: false });
    expect(onChange).toHaveBeenCalledWith({ lcarsFontText: true });
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("supports expected arrow-key navigation inside preference radio groups", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <WebUISettings
        bindings={bindings}
        onChange={onChange}
        preferences={{
          theme: "galaxy",
          soundEnabled: true,
          motion: "system",
          uppercase: true,
          lcarsFontText: false,
          keyBindings: {},
        }}
      />,
    );

    screen.getByRole("radio", { name: "Galaxy / 2357" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith({ theme: "nemesis" });
    expect(screen.getByRole("radio", { name: "Nemesis / 2379" })).toHaveFocus();
  });

  it("captures, disables, resets, and resolves conflicting bindings", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <WebUISettings
        bindings={bindings}
        onChange={onChange}
        preferences={{
          theme: "galaxy",
          soundEnabled: true,
          motion: "system",
          uppercase: true,
          lcarsFontText: false,
          keyBindings: {},
        }}
      />,
    );

    const changeSearch = screen.getByRole("button", { name: "Change Search" });
    await user.click(changeSearch);
    fireEvent.keyDown(changeSearch, { key: ",", ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith({
      keyBindings: {
        "action.search": "mod+,",
        "interface.open_options": null,
      },
    });

    rerender(
      <WebUISettings
        bindings={bindings}
        onChange={onChange}
        preferences={{
          theme: "galaxy",
          soundEnabled: true,
          motion: "system",
          uppercase: true,
          lcarsFontText: false,
          keyBindings: { "action.search": "mod+k" },
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Disable Search" }));
    expect(onChange).toHaveBeenLastCalledWith({
      keyBindings: { "action.search": null },
    });
    await user.click(screen.getByRole("button", { name: "Reset Search" }));
    expect(onChange).toHaveBeenLastCalledWith({ keyBindings: {} });
  });
});
