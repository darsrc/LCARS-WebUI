import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WebUISettings } from "./WebUISettings";

describe("WebUISettings", () => {
  it("surfaces theme, motion, sound, case, type, and reset controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(
      <WebUISettings
        onChange={onChange}
        onReset={onReset}
        preferences={{
          theme: "galaxy",
          soundEnabled: true,
          motion: "system",
          uppercase: true,
          lcarsFontText: false,
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
    await user.click(screen.getByRole("button", { name: /Restore application defaults/i }));

    expect(onChange).toHaveBeenCalledWith({ theme: "nemesis" });
    expect(onChange).toHaveBeenCalledWith({ motion: "reduced" });
    expect(onChange).toHaveBeenCalledWith({ soundEnabled: false });
    expect(onChange).toHaveBeenCalledWith({ lcarsFontText: true });
    expect(onReset).toHaveBeenCalledOnce();
  });
});
