# v7.0.0 — the Python developer redesign

_Released 2026-08-29. Breaking._

v7 is a deliberate hard break. It removes the rerun, replaces the flat namespace, and
fixes three defects that were shipping in v6.

There is no compatibility layer. `lcars migrate PATH` enumerates the work statically and
exits non-zero while any remains; [`../migration.md`](../migration.md) is the guide.

## Why it broke

**The rerun was half-implemented.** v6 re-ran the whole `ui()` function on every action and
then discarded the manifest it rebuilt — `_dsl_action_handler` populated the builder and
never read it. The API looked Streamlit-shaped and behaved imperatively: nothing repainted
unless the author also hand-wrote `lcars.update()`. That is the trap a newcomer hit in the
first ten minutes.

Auto-diffing the rebuild was considered and rejected. Page functions in the real downstream
applications perform I/O, so re-running them per action per session scales badly, and
`auto_id` derives ids from labels with an order-dependent collision suffix — two widgets
sharing a label become `status` and `status-2`, and identity shifts the moment a
conditional branch drops one.

**Three defects were live in v6.1:**

- Every browser received every other browser's traffic. Upstream envelopes and
  acknowledgements went onto the broadcast bus, so two tabs shared form values and typed
  input.
- Every HTTP and SSE fallback client shared one bucket of widget state, keyed by the
  literal `"http_fallback"`.
- Reconnecting restored the build-time manifest. Every `update()` since boot was lost on
  refresh.

## What changed

| | |
|---|---|
| Application | `App` owns pages, actions, LIVE jobs, sessions, services and serving |
| Pages | `@app.page` declares once, at build time; page functions are not re-run |
| Actions | `@app.action` handlers receive a typed `ActionContext[T]`; effects are explicit |
| Namespaces | `lcars_ui.ui` (33 ordinary names), `lcars_ui.advanced` (27 specialist); the 196-name flat namespace is gone, as is `run()` and module-global `@lcars.live` |
| Sessions | one per tab, server-issued token, private by default, `audience="all"` to broadcast, 30-minute retention |
| Reconnect | current-state hydration from a shared projection plus a private overlay — not event replay |
| Protocol | 2.0, with `session_hydration` and replace-semantics `log_snapshot` |
| Manifest schema | v2; the frontend rejects a version mismatch instead of misrendering |
| Forms | `ui.form(Model, ...)` generates validated fields from a Pydantic model; `ctx.value` is the parsed instance |
| Testing | `app.test_client()` — sessions, typed actions, rendered widgets, captured effects |
| CLI | `lcars new / dev / check / run / migrate` |
| Knowledge graph | trimmed from twelve DSL functions to two; the schema lost 24 `$defs` |

## Silent failures made loud

A recurring theme, and the reason several small changes are in a major release:

- Colour tokens that validated but rendered untinted are no longer schema-legal. Only the
  15 the renderer resolves are accepted.
- A manifest version mismatch fails with both versions named.
- `POST /lcars/action`, `/input` and `/form` with a missing or unknown session token are
  rejected rather than silently minting a throwaway session and returning `ok`.
- Removing the rerun would itself have been silent — `if ui.button(...)` would simply never
  fire again — which is why `lcars migrate` exists and is report-only.

## Evidence

A zero-context agent was given the v6.1 wheel and the published documentation and asked to
build a two-page app with one action and one test. It built the app and could not test it,
resorting to intercepting `uvicorn.run` and reaching into `plugin_action_handlers["*"]`.
Verdict: not completable from published documentation.

The same task against the v7.0.0 release candidate: completable. `lcars new` scaffolds a
project whose test passes unedited, and `app.test_client()` worked first try. It found one
real gap — the HTTP routes were session-scoped and the required header was undocumented —
which is fixed, and one stale version string, also fixed.

`lcars migrate` scanned this repository's examples and three real applications and found
**113** rerun-dependent call sites against a hand-grep estimate of 76. The difference was
retained return values rather than `if` conditions. Expect to undercount by hand.

## Known limits

- Runtime state is single-process and in-memory. A restart drops every session.
- `NumberInput.value` is a non-nullable float, so an `Optional[float]` field shows `0`
  until touched.
- The SSE bootstrap shares the WebSocket hydration path but is not covered end to end,
  because Starlette's synchronous `TestClient` deadlocks on a never-terminating stream.
- Chat is deliberately absent. Only one downstream application had built one, and what it
  actually needed was reconnect hydration, which shipped here.
