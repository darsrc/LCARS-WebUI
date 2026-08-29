# Knowledge-graph widget family — v7 audit outcome

_Audited 2026-08-26; reconciled with the v7 source on 2026-08-29._

## Outcome

The pre-v7 API exposed a large family of application-specific knowledge-graph widgets
through the flat package namespace. Downstream-use measurement did not justify keeping
that contract surface. v7 removed the one-consumer instruments and retained the two
general-purpose concepts with demonstrated reuse:

- `advanced.support_panel(...)` — alternative typed support environments, including
  the meaningful distinction between no support (`environments=[]`) and
  support-independent evidence (`environments=[{"atoms": []}]`).
- `advanced.tri_state(...)` — neutral `YES` / `NO` / `UNKNOWN` results with an optional
  `FAST` to `EXACT` escalation action.

The current package-root data exports are `SupportData`, `SupportCompleteness`, and
`TriStateData`. The declarations live in `lcars_ui.advanced`; they are not flat
`lcars_ui.*` widget calls.

## What was removed

The v7 trim removed `frontier`, `assertion_card`, `context_tags`, `anchor_card`,
`constraint_band`, `gap_panel`, `contender_list`, and `commitment_selector`. Their
domain-specific models and renderer branches were removed with them. They are migration
findings, not supported compatibility paths.

`support_panel` also absorbed its old one-boolean child mutators as
`show_environments=` and `show_legend=` arguments. `tri_state` now uses the general
`target` and `scope` field names.

## Current implementation and coverage

- Python declarations: `src/lcars_ui/dsl/_web_api.py`
- Pydantic models: `src/lcars_ui/widgets/web.py`
- Public namespace: `src/lcars_ui/advanced.py`
- Renderer: `frontend/src/widgets/WebWidgets.tsx` and the `WidgetRenderer.tsx` dispatch
- Backend coverage: `tests/unit/test_web_widgets.py`
- Frontend coverage: `frontend/src/widgets/WidgetRenderer.web.test.tsx`

The manifest schema contains only the two surviving widget types. The canonical
signatures and payload examples are in [`widgets.md`](widgets.md#knowledge-graph-widgets)
and the wiki's
[Knowledge Graph](https://github.com/darsrc/LCARS-WebUI/wiki/Knowledge-Graph) page.

## Reintroduction rule

Do not generalize or restore a removed domain instrument speculatively. Extract a new
core pattern only after another real application demonstrates the same semantic need.
`set_alert_condition` remains core LCARS behavior and was never part of this widget trim.
