import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { useSceneLocks } from "./useSceneLocks";

function Fixture() {
  const rootRef = useRef<HTMLDivElement>(null);
  const locks = useSceneLocks(rootRef);
  return (
    <div ref={rootRef}>
      <form data-region-id="region" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="field" defaultValue="default" />
        <button>Submit</button>
      </form>
      <output>
        {[...locks.lockedRegionIds()].join(",")}:{locks.version}
      </output>
    </div>
  );
}
describe("useSceneLocks", () => {
  it("releases focus locks and increments version", () => {
    render(<Fixture />);
    const input = screen.getByLabelText("field");
    fireEvent.focusIn(input);
    fireEvent.focusOut(input);
    expect(screen.getByText(":1")).toBeTruthy();
  });
  it("releases pointer locks", () => {
    render(<Fixture />);
    const input = screen.getByLabelText("field");
    fireEvent.pointerDown(input);
    fireEvent.pointerUp(window);
    expect(screen.getByText(":1")).toBeTruthy();
  });
  it("releases composition locks", () => {
    render(<Fixture />);
    const input = screen.getByLabelText("field");
    fireEvent.compositionStart(input);
    fireEvent.compositionEnd(input);
    expect(screen.getByText(":1")).toBeTruthy();
  });
  it("clears dirty locks on submit", () => {
    render(<Fixture />);
    const input = screen.getByLabelText("field");
    fireEvent.input(input, { target: { value: "changed" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText(":1")).toBeTruthy();
  });
});
