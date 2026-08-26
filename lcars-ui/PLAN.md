# PLAN

Forward-looking. Finished work moves to [`docs/history/`](docs/history/README.md) rather than
accumulating here — if an item below is done, archive it instead of marking it done.

STATUS: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` paused

**Where things stand.** v6.0.1 is the last tag; `main` carries unreleased commits beyond it.
The Surface Engine is complete (record: [`docs/history/v6-surface-engine.md`](docs/history/v6-surface-engine.md)).
A codebase/docs/git audit on 2026-08-26 produced findings AUD-01…AUD-13; the structural ones are
closed. The rest are below.

---

## Now

### [ ] Cut a release for the unreleased work
Nineteen commits sit past `v6.0.1` with no tag: the LCARS control language (native `<select>`,
checkbox, radio and number-spinner chrome removed from every product surface), the contract guard,
a runnable gate, example coverage, and the documentation repair.

That is a feature release, not a patch. Bump all four version locations — `pyproject.toml`,
`src/lcars_ui/__init__.py`, `src/lcars_ui/app.py`, `frontend/package.json`; `test_version_consistency.py`
enforces agreement — then build the wheel and cut the GitHub release.

Clear `build/` first or the wheel bundles a stale `_static/`.

### [ ] AUD-13 — Lift the two coverage floors
`dsl/_adapters.py` (74%) and `dsl/_strict_contract.py` (67%) sit below the project's own bar;
everything else clears 80%. `_strict_contract.py` matters more than its size suggests — it is one of
the files that must change whenever a widget is added, the same seam the contract guard protects.

---

## Next

### [ ] Decide what the knowledge-graph family is
~1,200 lines and 15% of the golden schema serve one application's vocabulary. Full analysis, with a
keep / generalise / app-specific bucketing and a non-breaking extraction order, is in
[`docs/knowledge-graph-audit.md`](docs/knowledge-graph-audit.md).

The decision needed is a product one, not a technical one: is this library's scope "LCARS rendering"
or "LCARS rendering plus a knowledge-graph vocabulary"? The technical path follows from the answer.

### [ ] Interaction patterns, extracted rather than invented
The library supplies widgets and two layout regimes well. It supplies almost no complete interaction
*patterns* — there is no `confirm()`, no destructive-action guard, no stepper, no master-detail.
`command_input()` is the first genuine one; `popup()` is window chrome, not a flow.

Deliberately not a design-it-up-front project. Inventing patterns ahead of demand is exactly how the
knowledge-graph family got into core. Extract a pattern when two real applications assemble the same
thing twice — TrekBoard is a real second consumer, so watch what it builds by hand.

---

## Standing constraints

- Port 8000 is reserved for the owner's own application. Use 8077/8078.
- `LCARS_TRUTH/` is untracked reference material — never `git clean` it, never bundle it.
- `contract.ts` may be narrower than the generated schema, never wider. When the guard fires, run
  `make contracts-update` and narrow `contract.ts`; never widen the generated side.
- LCARS has no dropdown, no OS spinner, no default checkbox. New controls render as LCARS geometry.
  See [`docs/lcars_language.md`](docs/lcars_language.md).
- `make ci` must stay completable in one run. It was not, for weeks, and that is how 91 lint errors
  accumulated unnoticed.
