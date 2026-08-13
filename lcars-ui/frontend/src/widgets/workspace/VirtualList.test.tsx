import { fireEvent, render, screen } from "@testing-library/react";
import { VirtualList } from "./VirtualList";

test("renders a bounded window while preserving the complete accessible row count", () => {
  render(
    <VirtualList
      height={100}
      items={Array.from({ length: 428 }, (_, index) => `record-${index}`)}
      label="Complete records"
      overscan={1}
      renderRow={(item) => <span>{item}</span>}
      rowHeight={20}
    />,
  );
  const table = screen.getByRole("table", { name: "Complete records" });
  expect(table).toHaveAttribute("aria-rowcount", "428");
  expect(screen.getAllByRole("row").length).toBeLessThan(10);
  fireEvent.scroll(table, { target: { scrollTop: 4000 } });
  expect(screen.getByText("record-199")).toBeInTheDocument();
  expect(screen.queryByText("record-0")).not.toBeInTheDocument();
});
