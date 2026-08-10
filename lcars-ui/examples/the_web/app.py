"""The Web v0.3 knowledge-client widget showcase."""

import lcars_ui as lcars

SUPPORT = {
    "node": "n07",
    "truncated": False,
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


def ui() -> None:
    lcars.config(name="The Web", subtitle="Knowledge Support Console", settings_page=False)
    lcars.nav("Evidence", page="evidence", color="golden-tanoi")
    lcars.nav("Limits", page="limits", color="hopbush")

    with lcars.page("Evidence", id="evidence", layout="telemetry", fillers=False):
        with lcars.support_panel("Alternative support", node="n07", id="support-n07"):
            lcars.environments(SUPPORT)
            lcars.atom_legend()

        clicked = lcars.frontier(FRONTIER, layer_filter=["JUSTIFICATION"])
        if clicked:
            lcars.notify(f"Navigate to {clicked}", title="Frontier")

        with lcars.assertion_card(ASSERTION, id="assertion-n07"):
            lcars.context_tags()
        lcars.anchor_card(ANCHOR)

    with lcars.page("Limits", id="limits", layout="console", fillers=False):
        lcars.tri_state(
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
        lcars.constraint_band(CONSTRAINT)
        with lcars.gap_panel(GAP):
            lcars.contender_list()

        chosen = lcars.commitment_selector(COMMITMENTS)
        if chosen:
            lcars.notify(f"Reload under {chosen}", title="Commitment set")


if __name__ == "__main__":
    lcars.run(ui)
