# Knowledge-graph instruments

LCARS-WebUI introduced eight native instruments in 4.5.0 for versioned knowledge-graph
payloads. An audit found that six of them — `frontier`, `assertion_card` + `context_tags`,
`anchor_card`, `constraint_band`, `gap_panel` + `contender_list`, and `commitment_selector` —
had exactly one downstream consumer and were removed. `support_panel` and `tri_state` remain:
they are the two instruments with a real reuse case beyond their origin application. See
[`docs/knowledge-graph-audit.md`](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/knowledge-graph-audit.md)
for the full audit.

Each widget accepts a dictionary in the documented shape or its exported Pydantic type:
`SupportData` and `TriStateData`.

## Support environments

`support_panel` establishes a node's evidentiary context: alternative support environments,
each a set of typed atoms. It renders the environments and the atom-type legend in one call —
there is no separate mutator to populate or reveal either.

```python
support_data = {
    "node": "n07",
    "truncated": False,
    "environments": [
        {"atoms": [
            {"id": "e01", "type": "empirical", "label": "HH 1952 voltage clamp"},
            {"id": "a04", "type": "assumption", "label": "space clamp"},
        ]},
        {"atoms": [
            {"id": "e09", "type": "empirical", "label": "Cole & Curtis 1939"},
            {"id": "f02", "type": "formal", "label": "GHK derivation"},
        ]},
    ],
}

with advanced.support_panel(
    "Support",
    node="n07",
    data=support_data,
    show_environments=True,
    show_legend=True,
    id="support-n07",
):
    pass
```

Atom types are `empirical`, `formal`, and `assumption`.

Two empty-looking states mean different things:

- `"environments": []` means unsupported.
- `"environments": [{"atoms": []}]` means support-independent.

`truncated=True` (or the structured `completeness` field) tells the reader that the
environment set is incomplete. `show_environments=False` suppresses the environments block
entirely — useful when a panel should show only its header and legend. `show_legend=True`
renders the empirical/formal/assumption legend.

A panel may also nest ordinary child widgets, declared inside the `with` block, the same way
other container widgets do.

## Tri-state result

`tri_state` gives `YES`, `NO`, and `UNKNOWN` distinct neutral semantics — a general shape for
any indeterminate query with a FAST result and an optional EXACT escalation (policy checks,
test results, permission probes, and the like). UNKNOWN is not rendered as a warning. Like
every widget call, `tri_state(...)` itself just declares the widget — it does not return
whether a viewer escalated. When `on_escalate="EXACT"` and a viewer triggers the escalation,
the widget's own `id` fires an action; register a handler for it with `@app.action(...)` and
read the outcome from `ctx.value`:

```python
advanced.tri_state(
    {
        "query": "supported_under",
        "target": "n07",
        "scope": "c02",
        "result": "UNKNOWN",
        "mode": "FAST",
        "reason": "label_truncated",
    },
    on_escalate="EXACT",
    id="support-query-n07",
)


@app.action("support-query-n07")
def escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        run_exact_query()
```

`target` names the subject of the query; `scope` names the context it was evaluated under
(a commitment set, an environment, a principal — whatever "under what" means for the caller).
Results: `YES`, `NO`, `UNKNOWN`. Modes: `FAST`, `EXACT`. Reasons: `label_truncated`,
`no_compatible_environment`, `complete`.

## Composition example

```python
from lcars_ui import ActionContext, App, advanced

app = App()
app.config("Knowledge Graph", subtitle="Knowledge Support Console", settings_page=False)


@app.page("Evidence", id="evidence", layout="telemetry", fillers=False)
def evidence() -> None:
    with advanced.support_panel(
        "Alternative support", node="n07", data=support_data,
        show_environments=True, show_legend=True, id="support-n07",
    ):
        pass

    advanced.tri_state(result_data, on_escalate="EXACT", id="support-query-n07")


@app.action("support-query-n07")
def escalate(ctx: ActionContext[str]) -> None:
    if ctx.value == "EXACT":
        run_exact_query()
```

Both instruments support the common visibility, placement, color, and hint arguments.
`tri_state` validates its escalation action payload so an unknown browser-supplied mode is
not delivered to `ctx.value`.

---

**See also:** [Widgets](Widgets) · [Actions and State](Actions-and-State) ·
[Reference](Reference) · [4.5.0 release notes](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/history/release-v4.5.0.md) ·
[knowledge-graph audit](https://github.com/darsrc/LCARS-WebUI/blob/main/lcars-ui/docs/knowledge-graph-audit.md)
