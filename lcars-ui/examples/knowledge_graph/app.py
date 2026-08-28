"""Knowledge-graph client widget showcase."""

import os

from lcars_ui import ActionContext, App, advanced

SUPPORT = {
    "node": "n07",
    "completeness": {"state": "complete"},
    "environments": [
        {
            "atoms": [
                {"id": "e01", "type": "empirical", "label": "HH 1952 voltage clamp"},
                {"id": "a04", "type": "assumption", "label": "space clamp"},
            ]
        },
        {
            "atoms": [
                {"id": "e09", "type": "empirical", "label": "Cole & Curtis 1939"},
                {"id": "f02", "type": "formal", "label": "GHK derivation"},
            ]
        },
    ],
}

FRONTIER = {
    "current": {"id": "n07", "label": "Na+ conductance"},
    "path": [
        {"id": "n01", "label": "action potential"},
        {"id": "n04", "label": "membrane current"},
    ],
    "frontier": [
        {
            "id": "n11",
            "label": "channel open probability",
            "edge": "JUSTIFICATION",
            "kind": "assertion",
            "terminal": False,
        },
        {
            "id": "e03",
            "label": "patch clamp 1981",
            "edge": "JUSTIFICATION",
            "kind": "anchor",
            "terminal": True,
        },
        {
            "id": "n19",
            "label": "depolarization",
            "edge": "DOMAIN",
            "kind": "assertion",
            "terminal": False,
        },
    ],
}

ASSERTION = {
    "id": "n07",
    "gloss": "Na+ conductance rises with membrane depolarization",
    "canonical": False,
    "framework": {"id": "hh_kinetics", "label": "Hodgkin-Huxley kinetics"},
    "context": [
        {"qualifier": "q0182", "label": "squid giant axon", "roles": ["SYSTEM_CLASS"]},
        {
            "qualifier": "q0433",
            "label": "classical regime",
            "roles": ["SEMANTIC_FRAMEWORK", "APPLICABILITY_DOMAIN"],
        },
    ],
    "status": ["established"],
}

ANCHOR = {
    "id": "e01",
    "type": "empirical",
    "label": "Voltage-clamp recordings, squid giant axon",
    "polarity": "SUPPORTS",
    "source": {"id": "s09", "citation": "Hodgkin & Huxley, J. Physiol., 1952"},
    "sibling_anchors": ["e02", "f07"],
    "inspectable": "published measurements; procedure re-run since",
    "status": [],
}

CONSTRAINT = {
    "quantity": {"id": "q_coupling", "label": "new force coupling", "unit": "1"},
    "representation": "INTERVAL",
    "excluded": {"min": 1e-5, "max": None},
    "confidence": "95% CL",
    "conditions": [{"quantity": "q_range", "min": 0.01, "max": 1.0, "unit": "m"}],
    "source": {"id": "s41", "citation": "torsion-balance null result"},
    "claims": [
        {"id": "t03", "label": "fifth force (ghost)", "position": None},
        {"id": "t08", "label": "light scalar", "position": 3e-6},
    ],
}

GAP = {
    "id": "g01",
    "type": "REDUCTION",
    "endpoints": [
        {"id": "n21", "label": "HH gating variables"},
        {"id": "n22", "label": "channel conformational states"},
    ],
    "known_dependency": "m³h reproduces macroscopic kinetics",
    "missing": "one-to-one mapping to modern channel-state models",
    "contenders": [{"id": "t11", "label": "allosteric gating model", "environments": 2}],
    "constraints": ["c07"],
}

COMMITMENTS = {
    "available": [
        {"id": "c00", "label": "none", "assumptions": []},
        {"id": "c02", "label": "HH formalism", "assumptions": ["a04", "a11"]},
    ],
    "active": "c02",
    "supported_under": ["n07", "n09"],
    "empirically_grounded": ["n07"],
    "conflict_set": ["n33"],
}



app = App()


def _register_pages() -> None:
    app.config(name="Knowledge Graph", subtitle="Knowledge Support Console", settings_page=False)

    @app.page("Evidence", id="evidence", layout="telemetry", fillers=False)
    def evidence() -> None:
        with advanced.support_panel("Alternative support", node="n07", id="support-n07"):
            advanced.environments(SUPPORT)
            advanced.atom_legend()

        advanced.frontier(
            FRONTIER,
            layer_filter=["JUSTIFICATION"],
            id="knowledge-frontier",
        )

        with advanced.assertion_card(ASSERTION, id="assertion-n07"):
            advanced.context_tags()
        advanced.anchor_card(ANCHOR)

    @app.page("Limits", id="limits", layout="console", fillers=False)
    def limits() -> None:
        advanced.tri_state(
            {
                "query": "supported_under",
                "subject": "n07",
                "commitment": "c02",
                "result": "UNKNOWN",
                "mode": "FAST",
                "reason": "label_truncated",
            },
            on_escalate="EXACT",
        )
        advanced.constraint_band(CONSTRAINT)
        with advanced.gap_panel(GAP):
            advanced.contender_list()

        advanced.commitment_selector(COMMITMENTS, id="knowledge-commitment")

    @app.action("knowledge-frontier")
    def navigate_frontier(ctx: ActionContext[str]) -> None:
        ctx.notify(f"Navigate to {ctx.value}", title="Frontier")

    @app.action("knowledge-commitment")
    def select_commitment(ctx: ActionContext[str]) -> None:
        ctx.notify(f"Reload under {ctx.value}", title="Commitment set")




_register_pages()

if __name__ == "__main__":

    app.serve(
        host=os.getenv("LCARS_HOST", "127.0.0.1"),
        port=int(os.getenv("LCARS_PORT", "8077")),
        open_browser=os.getenv("LCARS_OPEN_BROWSER", "1") != "0",
    )
