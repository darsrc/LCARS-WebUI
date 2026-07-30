import { describe, expect, it } from "vitest";
import { naturalHeight } from "./demand";

const rectWithHeight = (height: number): DOMRect =>
  ({ height, width: 100, top: 0, right: 100, bottom: height, left: 0, x: 0, y: 0 }) as DOMRect;

describe("naturalHeight", () => {
  it("measures the panel through a display-contents hint anchor", () => {
    const cell = document.createElement("div");
    cell.innerHTML = `
      <div class="lcars-hint-anchor">
        <section class="lcars-panel">
          <div class="lcars-panel-head">Telemetry</div>
          <div class="lcars-panel-body"><div>Rows</div></div>
        </section>
      </div>
    `;
    const head = cell.querySelector<HTMLElement>(".lcars-panel-head")!;
    const body = cell.querySelector<HTMLElement>(".lcars-panel-body")!;
    const row = body.firstElementChild as HTMLElement;
    head.getBoundingClientRect = () => rectWithHeight(30);
    row.getBoundingClientRect = () => rectWithHeight(50);
    Object.defineProperty(row, "scrollHeight", { value: 60 });
    Object.defineProperty(body, "offsetHeight", { value: 0 });
    Object.defineProperty(body, "clientHeight", { value: 0 });

    expect(naturalHeight(cell)).toBe(90);
  });
});
