"""Read-only demonstration of caller-defined edge layers and routing.

Run:
    python examples/layered_graph/app.py
"""

import os

import lcars_ui as lcars
from lcars_ui import App, advanced, ui


def _document() -> lcars.GraphDocument:
    port = lcars.GraphPort
    template = lcars.NodeTemplate(
        id="stage",
        label="Stage",
        color="anakiwa",
        inputs=[port(id="in", label="In", type="link", capacity=12)],
        outputs=[port(id="out", label="Out", type="link", capacity=12)],
    )
    layers = [
        lcars.GraphLayer(
            id="layer-one",
            label="Layer One",
            token="L1",
            color="atomic-tangerine",
            pattern="solid",
            marker="arrow_closed",
            description="Solid, closed-arrow treatment supplied by the caller.",
        ),
        lcars.GraphLayer(
            id="layer-two",
            label="Layer Two",
            token="L2",
            color="anakiwa",
            pattern="dashed",
            marker="arrow_open",
            description="Dashed, open-arrow treatment supplied by the caller.",
        ),
        lcars.GraphLayer(
            id="layer-three",
            label="Layer Three",
            token="L3",
            color="lilac",
            pattern="dotted",
            marker="none",
            description="Dotted, unmarked treatment supplied by the caller.",
        ),
        lcars.GraphLayer(
            id="layer-four",
            label="Layer Four",
            token="L4",
            color="pale-canary",
            pattern="double",
            marker="arrow_closed",
            description="Double-rail treatment supplied by the caller.",
        ),
    ]

    edge_specs = [
        ("forward-one", "origin", "relay", "layer-one", "Primary path"),
        ("forward-two", "origin", "relay", "layer-two", "Secondary path"),
        ("forward-three", "origin", "relay", "layer-three", "Reference path"),
        ("forward-four", "origin", "relay", "layer-four", "Audit path"),
        ("reverse", "relay", "origin", "layer-two", "Return path"),
        ("outbound", "relay", "terminal", "layer-one", "Downstream path"),
        ("loop-one", "terminal", "terminal", "layer-three", "Inner loop"),
        ("loop-two", "terminal", "terminal", "layer-four", "Outer loop"),
    ]
    return lcars.GraphDocument(
        version=2,
        layers=layers,
        templates=[template],
        nodes=[
            lcars.GraphNode(id="origin", template="stage", label="Origin", position=(0, 220)),
            lcars.GraphNode(id="relay", template="stage", label="Relay", position=(420, 220)),
            lcars.GraphNode(id="terminal", template="stage", label="Terminal", position=(840, 220)),
        ],
        edges=[
            lcars.GraphEdge(
                id=edge_id,
                source=source,
                source_port="out",
                target=target,
                target_port="in",
                layer=layer,
                label=label,
                relation=label.upper().replace(" ", "_"),
            )
            for edge_id, source, target, layer, label in edge_specs
        ],
        viewport=lcars.GraphViewport(x=90, y=75, zoom=0.82),
    )


DOCUMENT = _document()



app = App()


def _register_pages() -> None:
    app.config(
        "Layered Graph Reader",
        subtitle="CALLER-DEFINED VISUAL GRAMMAR",
        theme="galaxy",
        header_color="atomic-tangerine",
    )

    @app.page("Graph", id="graph", layout="console")
    def graph() -> None:
        with ui.data_panel("Truthful Edge Layers", color="anakiwa"):
            advanced.node_canvas(
                DOCUMENT,
                title="Layered Routing",
                options=lcars.NodeCanvasOptions(
                    editable=False,
                    minimap=True,
                    show_palette=False,
                    show_run=False,
                    show_cancel=False,
                ),
                color="anakiwa",
                id="layered-routing",
            )




_register_pages()

if __name__ == "__main__":

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
