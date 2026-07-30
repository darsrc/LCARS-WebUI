import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PopupWidget } from "../types/contract";
import { PopupWindow } from "./PopupWindow";

const widget = (patch: Partial<PopupWidget> = {}): PopupWidget => ({
  id: "transfer-popup",
  type: "popup",
  title: "Transfer Details",
  children: [],
  open: true,
  modal: false,
  dismissible: true,
  draggable: true,
  resizable: true,
  width: 400,
  height: 240,
  position: [100, 100],
  close_action_id: "close-transfer",
  color: "anakiwa",
  ...patch,
});

describe("PopupWindow", () => {
  it("moves and resizes with keyboard-accessible controls", () => {
    const onUiStateChange = vi.fn();
    render(
      <PopupWindow
        accent={{}}
        onAction={vi.fn()}
        onUiStateChange={onUiStateChange}
        widget={widget()}
      >
        <p>Payload accepted.</p>
      </PopupWindow>,
    );

    const dialog = screen.getByRole("dialog", { name: "Transfer Details" });
    fireEvent.keyDown(screen.getByRole("button", { name: "Move Transfer Details" }), {
      key: "ArrowRight",
    });
    expect(dialog).toHaveStyle({ left: "112px" });

    fireEvent.keyDown(screen.getByRole("button", { name: /Resize Transfer Details/i }), {
      key: "ArrowDown",
    });
    expect(dialog).toHaveStyle({ height: "252px" });
    expect(onUiStateChange).toHaveBeenCalledWith(
      "transfer-popup",
      expect.objectContaining({ dismissed: false }),
    );
  });

  it("dismisses and emits the optional close action", () => {
    const onAction = vi.fn();
    render(
      <PopupWindow accent={{}} onAction={onAction} widget={widget()}>
        <p>Payload accepted.</p>
      </PopupWindow>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close Transfer Details" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onAction).toHaveBeenCalledWith(
      "close-transfer",
      { kind: "close" },
      "transfer-popup",
    );
  });
});
