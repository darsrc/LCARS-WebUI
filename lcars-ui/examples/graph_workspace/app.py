"""Generic authoring and density-navigation workspace.

Run:
    python examples/graph_workspace/app.py
"""

from __future__ import annotations

import lcars_ui as lcars
from lcars_ui import ActionContext, App

REVISION = lcars.GraphRevision(graph_id="sample-network", revision="r17")


def _template() -> lcars.NodeTemplate:
    return lcars.NodeTemplate(
        id="record",
        label="Record",
        color="anakiwa",
        inputs=[lcars.GraphPort(id="in", label="Input", type="link", capacity=120, shape="notch")],
        outputs=[lcars.GraphPort(id="out", label="Output", type="link", capacity=120, shape="tab")],
        fields=[],
    )


def _layers() -> list[lcars.GraphLayer]:
    return [
        lcars.GraphLayer(
            id="primary",
            label="Primary",
            token="P",
            color="atomic-tangerine",
            pattern="solid",
            marker="arrow_closed",
        ),
        lcars.GraphLayer(
            id="reference",
            label="Reference",
            token="R",
            color="lilac",
            pattern="dashed",
            marker="arrow_open",
        ),
    ]


def _canonical_projection() -> lcars.WorkspaceProjection:
    nodes = [
        lcars.GraphNode(
            id=f"node-{index}",
            template="record",
            label=f"Canonical {index + 1}",
            position=((index % 3) * 280, (index // 3) * 210),
            group="step-a" if index < 3 else "step-b",
        )
        for index in range(6)
    ]
    edges = [
        lcars.GraphEdge(
            id=f"canonical-edge-{index}",
            source=f"node-{index}",
            source_port="out",
            target=f"node-{index + 1}",
            target_port="in",
            layer="primary" if index % 2 == 0 else "reference",
            label="Connected record",
            relation="connected",
        )
        for index in range(5)
    ]
    return lcars.WorkspaceProjection(
        document=lcars.GraphDocument(
            version=2,
            layers=_layers(),
            templates=[_template()],
            nodes=nodes,
            edges=edges,
            groups=[
                lcars.GraphGroup(id="step-a", label="Step A", position=(-30, -30), size=(850, 210)),
                lcars.GraphGroup(id="step-b", label="Step B", position=(-30, 180), size=(850, 210)),
            ],
            viewport=lcars.GraphViewport(x=110, y=95, zoom=0.72),
        ),
        bindings=[
            lcars.WorkspaceProjectionBinding(
                element_kind="node",
                element_id=f"node-{index}",
                record_id=f"record-{index}",
                plane="canonical",
            )
            for index in range(6)
        ],
    )


def _proposal_projection() -> lcars.WorkspaceProjection:
    nodes = [
        lcars.GraphNode(id="draft-a", template="record", label="Draft A", position=(80, 180)),
        lcars.GraphNode(id="draft-b", template="record", label="Draft B", position=(520, 180)),
    ]
    edges = [
        lcars.GraphEdge(
            id=f"draft-edge-{index:03d}",
            source="draft-a",
            source_port="out",
            target="draft-b",
            target_port="in",
            layer="primary",
            label="Parallel proposal link",
            relation="parallel",
        )
        for index in range(36)
    ]
    return lcars.WorkspaceProjection(
        document=lcars.GraphDocument(
            version=2,
            layers=_layers(),
            templates=[_template()],
            nodes=nodes,
            edges=edges,
            viewport=lcars.GraphViewport(x=130, y=115, zoom=0.82),
        ),
        bindings=[
            lcars.WorkspaceProjectionBinding(
                element_kind="node",
                element_id=record_id,
                record_id=record_id,
                plane="proposal",
            )
            for record_id in ("draft-a", "draft-b")
        ],
    )


def workspace() -> lcars.GraphWorkspaceDocument:
    records = [
        lcars.WorkspaceRecord(
            id=f"record-{index}",
            kind="generic-record",
            label=f"Canonical {index + 1}",
            fields={"name": f"Canonical {index + 1}", "status": "ready"},
        )
        for index in range(6)
    ]
    drafts = [
        lcars.WorkspaceRecord(
            id=record_id,
            kind="generic-record",
            label=label,
            fields={"name": label, "status": "draft"},
            trees={
                "expression": lcars.WorkspaceTreeValue(
                    format="lcars-structured-value",
                    version=1,
                    schema="generic-expression",
                    root=lcars.WorkspaceTreeNode(
                        id=f"{record_id}-root",
                        part="container",
                        slots={
                            "content": [
                                lcars.WorkspaceTreeNode(
                                    id=f"{record_id}-value",
                                    part="value",
                                    fields={"text": label},
                                )
                            ]
                        },
                    ),
                )
            },
        )
        for record_id, label in (("draft-a", "Draft A"), ("draft-b", "Draft B"))
    ]
    return lcars.GraphWorkspaceDocument(
        format="lcars-graph-workspace",
        version=1,
        workspace_id="sample-workspace",
        record_schemas=[
            lcars.WorkspaceRecordSchema(
                kind="generic-record",
                label="Generic record",
                appearance=lcars.WorkspaceRecordAppearance(
                    shape="capsule", token="GR", color="anakiwa"
                ),
                fields=[
                    lcars.WorkspaceFieldSchema(
                        id="name", label="Name", value_kind="text", required=True
                    ),
                    lcars.WorkspaceFieldSchema(
                        id="status",
                        label="Status",
                        value_kind="choice",
                        choices=[
                            lcars.WorkspaceChoice(value="draft", label="Draft"),
                            lcars.WorkspaceChoice(value="ready", label="Ready"),
                        ],
                    ),
                    lcars.WorkspaceFieldSchema(
                        id="expression",
                        label="Structured value",
                        value_kind="tree",
                        tree_schema="generic-expression",
                    ),
                ],
                search_fields=[
                    lcars.WorkspaceSearchField(
                        id="name", label="Name", path="fields.name", match="text"
                    )
                ],
            )
        ],
        tree_schemas=[
            lcars.WorkspaceTreeSchema(
                id="generic-expression",
                label="Generic expression",
                root_parts=["container"],
                parts=[
                    lcars.WorkspaceTreePartSchema(
                        id="container",
                        label="Container",
                        token="GROUP",
                        shape="gate",
                        slots=[
                            lcars.WorkspaceTreeSlotSchema(
                                id="content",
                                label="Content",
                                accepts=["value"],
                                cardinality="many",
                                shape="well",
                            )
                        ],
                    ),
                    lcars.WorkspaceTreePartSchema(
                        id="value",
                        label="Value",
                        token="VALUE",
                        shape="value",
                        fields=[
                            lcars.WorkspaceFieldSchema(
                                id="text", label="Text", value_kind="text", required=True
                            )
                        ],
                    ),
                ],
            )
        ],
        validation_rules=[
            lcars.WorkspaceValidationRule(
                id="required-name",
                label="Name required",
                scope="field",
                evaluator="required",
                target_kinds=["generic-record"],
                field="name",
                message="Name is required.",
            )
        ],
        actions=[
            lcars.WorkspaceAction(
                id="submit-proposal",
                label="Submit proposal",
                scope="submission",
                command="submit",
            )
        ],
        canonical=lcars.CanonicalPlane(
            graph=REVISION,
            completeness=lcars.WorkspaceCompleteness(
                state="complete", loaded_records=6, known_records=6
            ),
            records=records,
            projection=_canonical_projection(),
        ),
        proposal=lcars.ProposalPlane(
            proposal_id="sample-proposal",
            title="Sample proposal",
            base=REVISION,
            revision=4,
            interaction_count=17,
            changes=[
                lcars.ProposalChange(
                    id=f"add-{record.id}",
                    operation="addition",
                    record_id=record.id,
                    record=record,
                )
                for record in drafts
            ],
            projection=_proposal_projection(),
        ),
        reader=lcars.WorkspaceReaderState(current_step="step-a"),
    )


WORKSPACE = workspace()



app = App()


def _register_pages() -> None:
    app.config(
        "Graph Proposal Workspace",
        subtitle="AUTHORING AND DENSITY NAVIGATION",
        theme="galaxy",
        settings_page=False,
    )
    @app.page("Workspace", id="workspace", layout="grid", fillers=False)
    def workspace() -> None:
        lcars.graph_workspace(
            WORKSPACE,
            title="Canonical and Proposal Workbench",
            options=lcars.GraphWorkspaceOptions(
                fan_page_size=20,
                virtual_row_height=36,
                autosave_key="lcars-example-proposal",
            ),
            span=(6, 6),
            weight=12,
            id="proposal-workbench",
        )




_register_pages()

if __name__ == "__main__":
    import uvicorn

    from lcars_ui.app import create_app

    uvicorn.run(create_app(manifest=app.build_manifest(), app=app), host="127.0.0.1", port=8000)
