import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import type { GraphWorkspaceDocument } from "../../types/workspace";
import { StructuredValueEditor } from "./StructuredValueEditor";

const initial = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace",
  tree_schemas: [{
    id: "tree",
    label: "Caller tree",
    root_parts: ["container"],
    parts: [
      { id: "container", label: "Container", token: "BOX", slots: [{ id: "child", label: "Child", accepts: ["item"], cardinality: "one" }] },
      { id: "item", label: "Item", token: "ITEM", fields: [{ id: "name", label: "Name", value_kind: "text", required: true }] },
    ],
  }],
  canonical: { graph: { graph_id: "graph", revision: "r1" } },
  proposal: {
    proposal_id: "proposal",
    title: "Draft",
    base: { graph_id: "graph", revision: "r1" },
    changes: [{ id: "change", operation: "addition", record_id: "record", record: { id: "record", kind: "generic" } }],
  },
});

function Harness() {
  const [workspace, setWorkspace] = useState(initial);
  const record = workspace.proposal!.changes![0].record!;
  return (
    <StructuredValueEditor
      fieldId="value"
      onCommit={(next) => setWorkspace(next)}
      recordId="record"
      schemaId="tree"
      tree={record.trees?.value}
      workspace={workspace}
    />
  );
}

test("keeps tree, part form, and generated preview synchronized", () => {
  render(<Harness />);

  fireEvent.click(screen.getByRole("button", { name: "START BOX" }));
  expect(screen.getByLabelText("Generated structural preview")).toHaveTextContent("BOX");
  fireEvent.click(screen.getByRole("button", { name: "+ ITEM" }));
  expect(screen.getByRole("list", { name: "Tree findings" })).toHaveTextContent("Name is required");
  fireEvent.change(screen.getByLabelText("Name · REQUIRED"), { target: { value: "alpha" } });
  fireEvent.blur(screen.getByLabelText("Name · REQUIRED"));

  expect(screen.getByLabelText("Generated structural preview")).toHaveTextContent("BOX ITEM alpha");
  expect(screen.getByText("STRUCTURE COMPLETE")).toBeInTheDocument();
});
