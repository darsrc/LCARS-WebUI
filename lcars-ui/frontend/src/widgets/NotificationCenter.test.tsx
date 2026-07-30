import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationCenter, type NotificationItem } from "./NotificationCenter";

const note: NotificationItem = {
  id: 1,
  level: "success",
  title: "Transfer",
  message: "Dataset received.",
  durationMs: 6000,
  dismissible: true,
  movable: true,
};

describe("NotificationCenter", () => {
  it("moves as a stack and exposes explicit dismissal", () => {
    const onDismiss = vi.fn();
    render(
      <NotificationCenter
        entries={[{ key: "1", item: note, exiting: false }]}
        onDismiss={onDismiss}
      />,
    );

    const center = screen.getByRole("region", { name: "Notifications" });
    const before = center.style.left;
    fireEvent.keyDown(screen.getByRole("button", { name: "Move notification center" }), {
      key: "ArrowLeft",
    });
    expect(center.style.left).not.toBe(before);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Transfer" }));
    expect(onDismiss).toHaveBeenCalledWith(1);
  });

  it("disables movement when every notification opts out", () => {
    render(
      <NotificationCenter
        entries={[{ key: "1", item: { ...note, movable: false }, exiting: false }]}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Move notification center" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Dock" })).not.toBeInTheDocument();
  });
});
