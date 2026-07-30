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

    const [theme, motion] = screen.getAllByRole("combobox");
    await user.selectOptions(theme, "nemesis");
    await user.selectOptions(motion, "reduced");
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
