import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

import type { GraphWorkspaceDocument } from "../../types/workspace";
import { StructuredValueEditor } from "./StructuredValueEditor";

const initial = (): GraphWorkspaceDocument => ({
  format: "lcars-graph-workspace",
  version: 1,
  workspace_id: "workspace",
  record_schemas: [{
    kind: "generic",
    label: "Generic",
    appearance: { shape: "card", token: "REC" },
    fields: [{ id: "value", label: "Value", value_kind: "tree", tree_schema: "tree" }],
  }],
  tree_schemas: [{
    id: "tree",
    label: "Caller tree",
    root_parts: ["container"],
    parts: [
      { id: "container", label: "Container", token: "BOX", shape: "gate", slots: [{ id: "child", label: "Child", accepts: ["item"], cardinality: "one", shape: "well" }] },
      { id: "item", label: "Item", token: "ITEM", shape: "value", fields: [{ id: "name", label: "Name", value_kind: "text", required: true }] },
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

function Harness({
  commitMode,
  onCommit = () => undefined,
}: {
  commitMode?: "group" | "incremental";
  onCommit?: (workspace: GraphWorkspaceDocument, event: string) => void;
}) {
  const [workspace, setWorkspace] = useState(initial);
  const record = workspace.proposal!.changes![0].record!;
  return (
    <>
      <output aria-label="Interaction count">{workspace.proposal?.interaction_count ?? 0}</output>
      <StructuredValueEditor
        commitMode={commitMode}
        fieldId="value"
        onCommit={(next, event) => {
          setWorkspace(next);
          onCommit(next, event);
        }}
        recordId="record"
        schemaId="tree"
        tree={record.trees?.value}
        workspace={workspace}
      />
    </>
  );
}

test("keeps tree, part form, and generated preview synchronized", () => {
  render(<Harness />);

  expect(screen.getByRole("button", { name: "× ITEM" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "START BOX" })).toHaveAttribute("data-shape", "gate");
  fireEvent.click(screen.getByRole("button", { name: "START BOX" }));
  expect(screen.getByLabelText("Generated structural preview")).toHaveTextContent("BOX");
  fireEvent.click(screen.getByRole("button", { name: "+ ITEM" }));
  expect(screen.getByText("ITEM").closest(".lcars-tree-part")).toHaveAttribute("data-shape", "value");
  expect(screen.getByRole("list", { name: "Tree findings" })).toHaveTextContent("Name is required");
  fireEvent.change(screen.getByLabelText("Name · REQUIRED"), { target: { value: "alpha" } });
  fireEvent.blur(screen.getByLabelText("Name · REQUIRED"));

  expect(screen.getByLabelText("Generated structural preview")).toHaveTextContent("BOX ITEM alpha");
  expect(screen.getByText("STRUCTURE COMPLETE")).toBeInTheDocument();
});

test("reports three interactions for the representative tree in compatibility mode", () => {
  const onCommit = vi.fn();
  render(<Harness commitMode="incremental" onCommit={onCommit} />);

  fireEvent.click(screen.getByRole("button", { name: "START BOX" }));
  fireEvent.click(screen.getByRole("button", { name: "+ ITEM" }));
  fireEvent.change(screen.getByLabelText("Name · REQUIRED"), { target: { value: "alpha" } });
  fireEvent.blur(screen.getByLabelText("Name · REQUIRED"));

  expect(screen.getByLabelText("Interaction count")).toHaveTextContent("3");
  expect(onCommit).toHaveBeenCalledTimes(3);
});

test("composes and reviews the same tree locally, then commits one group interaction", () => {
  const onCommit = vi.fn();
  render(<Harness commitMode="group" onCommit={onCommit} />);

  fireEvent.click(screen.getByRole("button", { name: "START BOX" }));
  fireEvent.click(screen.getByRole("button", { name: "+ ITEM" }));
  fireEvent.change(screen.getByLabelText("Name · REQUIRED"), { target: { value: "alpha" } });

  expect(screen.getByLabelText("Generated structural preview")).toHaveTextContent("BOX ITEM alpha");
  expect(screen.getByLabelText("Interaction count")).toHaveTextContent("0");
  expect(onCommit).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "REVIEW TREE" }));
  expect(screen.getByLabelText("Name · REQUIRED")).toBeDisabled();
  expect(screen.getByRole("button", { name: "COMMIT TREE" })).toBeEnabled();
  expect(screen.getByLabelText("Interaction count")).toHaveTextContent("0");

  fireEvent.click(screen.getByRole("button", { name: "COMMIT TREE" }));
  expect(screen.getByLabelText("Interaction count")).toHaveTextContent("1");
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit.mock.calls[0][1]).toBe("commit_tree");
  expect(screen.getByText(/COMPOSE · CURRENT/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "REVIEW TREE" })).toBeDisabled();
});

test("review and discard are zero-interaction working-tree operations", () => {
  const onCommit = vi.fn();
  render(<Harness commitMode="group" onCommit={onCommit} />);

  fireEvent.click(screen.getByRole("button", { name: "START BOX" }));
  fireEvent.click(screen.getByRole("button", { name: "REVIEW TREE" }));
  expect(screen.getByRole("button", { name: "COMMIT TREE" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "BACK TO COMPOSE" }));
  fireEvent.click(screen.getByRole("button", { name: "DISCARD CHANGES" }));

  expect(screen.getByLabelText("Interaction count")).toHaveTextContent("0");
  expect(onCommit).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "START BOX" })).toBeInTheDocument();
});
