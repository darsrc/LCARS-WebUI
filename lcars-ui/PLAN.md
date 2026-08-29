# PLAN

Forward-looking. Finished work moves to [`docs/history/`](docs/history/README.md) rather than
accumulating here — if an item below is done, archive it instead of marking it done.

STATUS: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` paused

**Where things stand.** v7.0.0 is the current release: the rerun is gone, `App` owns the
runtime, the flat namespace is replaced by `ui`/`advanced`, sessions are private and
reconnects hydrate current state. Record:
[`docs/history/release-v7.0.0.md`](docs/history/release-v7.0.0.md). The AUD-01…AUD-13 audit
items from 2026-08-26 are closed or superseded; the knowledge-graph question they raised was
answered by measurement — TheWeb used three of twelve functions, so eight were removed and
the survivors moved to `advanced`.

---

## Now

### [ ] Cover the SSE bootstrap end to end
The SSE hydration path mirrors the WebSocket one and is exercised only by shared
`ConnectionManager` unit tests, because Starlette's synchronous `TestClient` deadlocks on a
never-terminating stream. It needs a real browser or an async client. Until then, SSE
reconnect behaviour is inference rather than demonstration.

### [ ] Decide whether the colour palette should grow back
v7 narrowed the `color=` enum to the 15 tokens the renderer actually resolves, because the
other ~22 validated and rendered untinted. Several are real LCARS palette names and could be
given themed accents instead — that is truth-sampling work against `LCARS_TRUTH/`, not a
code change. Adding tokens back is non-breaking whenever it happens.

### [ ] `NumberInput.value` cannot express "unset"
It is a non-nullable float, so an `Optional[float]` model field renders as `0` and submits
`0.0` until touched. Fixing it means `float | None` in the contract, which ripples into the
renderer's stepper and the goldens.

### [ ] Interaction patterns, extracted rather than invented
Unchanged in intent from v6, and now with evidence behind it. Chat was deliberately left
out of v7: only one downstream application had built one, and what it actually needed was
reconnect hydration, which shipped. Extract a pattern when two real applications assemble
the same thing twice — that bar was applied and it held.

---

## Standing constraints

- Port 8000 is reserved for the owner's own application. Use 8077/8078.
- `LCARS_TRUTH/` is untracked reference material — never `git clean` it, never bundle it.
- `contract.ts` may be narrower than the generated schema, never wider. When the guard
  fires, run `make contracts-update` and narrow `contract.ts`; never widen the generated side.
- LCARS has no dropdown, no OS spinner, no default checkbox. New controls render as LCARS
  geometry. See [`docs/lcars_language.md`](docs/lcars_language.md).
- `make ci` must stay completable in one run.
- A thing that silently does nothing is worse than a thing that fails loudly. v7 removed
  four such cases; do not add a fifth.
