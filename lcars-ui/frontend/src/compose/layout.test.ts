import { describe, expect, it } from "vitest";

import type { Page, Widget } from "../types/contract";
import { collectOverlays, collectPanels } from "./layout";

const popup = {
  id: "quick-reference",
  type: "popup",
  title: "Quick Reference",
  children: [],
  open: true,
  modal: false,
  dismissible: true,
  draggable: true,
  resizable: true,
  width: 400,
  height: 240,
  color: "anakiwa",
} satisfies Widget;

const page: Page = {
  id: "main",
  title: "Main",
  archetype: "console",
  rows: [
    {
      id: "row",
      height: "auto",
      columns: [
        {
          id: "column",
          width: "1fr",
          widgets: [
            { id: "copy", type: "text", content: "Main deck", size: "body" },
            popup,
          ],
        },
      ],
    },
  ],
};

describe("overlay collection", () => {
  it("keeps popups out of the adaptive mosaic", () => {
    expect(collectPanels(page).map(({ widget }) => widget.id)).toEqual(["copy"]);
    expect(collectOverlays(page)).toEqual([popup]);
  });
});
