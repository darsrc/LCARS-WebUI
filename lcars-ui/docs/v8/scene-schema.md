# Scene schema proposal (v8.0)

PLAN.md step 0.3.1. **Proposal for owner sign-off, not implemented.** It narrows
`examples/adaptive-console.json` from spec 0.2.0 to what v8.0 builds. Decisions are cited
as V8-Dxx ([decisions.md](decisions.md)).

## 1. Shape on the wire

A scene page is `Page(archetype="scene", chrome="none")` whose `widgets` list holds exactly
**one** top-level `scene` container widget. This follows the precedent of
`authored_composition`, which is one top-level widget on an authored page.

```text
Page (archetype="scene")
└── scene                      SceneWidget: topology + modes + policy
    ├── scene_region "sample-a"     container; children = ordinary widgets (V8-D09)
    ├── scene_region "commands-a"
    └── …
```

### Pydantic models (sketch)

```python
RegionRole = Literal["instrument", "commands", "context", "data", "detail", "alert", "viewer"]
RelationKind = Literal["controls", "details", "compares", "feeds", "part_of", "recovers"]
Family = Literal["wrap", "branch", "fork", "contour", "focus"]
Fold = Literal["never", "summary", "terminal"]

class SceneRegion(BaseWidget):               # type: "scene_region"
    label: str                               # visible heading; also the accessible name
    role: RegionRole = "instrument"
    subject: str | None = None               # domain subject id (opaque to the library)
    fold: Fold = "summary"                   # what it may fold into when space is short
    summary: str | None = None               # text shown when folded to summary
    slot: str | None = None                  # explicit family-slot override (V8-D03)
    children: list[AnyWidget] = []

class SceneRelation(BaseModel):
    id: str
    kind: RelationKind
    source: str                              # region id   (`from` is a Python keyword)
    target: str                              # region id
    label: str | None = None                 # used for the accessible description and branch labels

class SceneMode(BaseModel):
    id: str
    label: str
    focal: list[str]                         # ≥1 region ids; each focal id is also required
    required: list[str]                      # always shown in this mode
    optional: list[str] = []                 # shown if they fit, otherwise folded
    families: list[Family] = ["wrap", "branch", "focus"]   # preference order (V8-D06)
    returns_to: str | None = None            # mode restored when this context ends

class ScenePolicy(BaseModel):
    quiet_window_ms: int = 750
    min_background_interval_ms: int = 5000
    preserve_locks: Literal[True] = True     # not switchable: D10 is a hard rule
    on_infeasible: Literal["focus-then-access"] = "focus-then-access"

class SceneWidget(BaseWidget):               # type: "scene"
    initial_mode: str
    regions: list[SceneRegion]
    relations: list[SceneRelation] = []
    modes: list[SceneMode]
    policy: ScenePolicy = ScenePolicy()
    context_terminal: bool = True            # auto-injected nav/title/mode/return band (V8-D10)
```

**Not in v8.0's contract:** pixel coordinates (V8-D01). Explicit ports: the compositor
derives one port per relation end, side chosen by the family. Spec `transitions`: these are
server-side only (§3). `fit_scenarios`: these become test fixtures, not manifest data.

### Relation direction

| kind | source → target | Family expression |
|---|---|---|
| `controls` | command region → subject | command bank attached to the subject's band terminal |
| `details` | detail region → subject | anchored branch off the subject |
| `compares` | subject A → subject B (symmetric) | fork pair plus difference bridge |
| `feeds` | data source → consumer | directed connector |
| `part_of` | member → group region | shared band/enclosure |
| `recovers` | alert/recovery region → source | reserved recovery branch tied to the source |

### Validation (Python, at manifest build; each rule gets a failing-case test)

1. Region ids are unique and don't collide with other widget ids on the page.
2. A relation's `source` and `target` exist and are distinct. Relation ids are unique.
3. `recovers.source` has `role="alert"`. `controls.source` has `role="commands"`.
4. A mode's `focal ⊆ required`. `required ∩ optional = ∅`. Every referenced region exists.
   `focal` is non-empty.
5. `initial_mode` and every `returns_to` name a declared mode. `families` is non-empty.
6. Every region appears in at least one mode. An orphan region is an error: it would
   silently never render.
7. A `compares` relation's two regions are both `focal` in at least one mode.

## 2. Runtime state and protocol

**Revised during M1 (step 1.2.3):** there's no new protocol event. The current mode is
state on the scene widget itself:

```python
class SceneWidget(BaseWidget):
    ...
    mode: str | None = None                  # current mode; None means initial_mode
    mode_subjects: dict[str, str] = {}       # region_id -> subject display label
    mode_reason: Literal["user", "server"] = "user"
    mode_seq: int = 0                        # increments on every change, so the frontend ignores stale updates
```

- `ctx.set_mode()` emits an ordinary **session-scoped `widget_update`** on the scene widget.
  The v7 projection already stores session-private overlays and replays them in
  `session_hydration`, so per-session persistence and reconnect restore come for free.
- `mode_reason` tells the frontend scheduler whether a commit is user-requested (commit
  promptly) or background (apply the quiet window and interval) (V8-D11). It's `"user"` when
  the change runs inside an action handler and `"server"` from live/background code.
- No new upstream messages. Mode changes arrive through ordinary `action`s handled server-side.

## 3. DSL (v7 style: `App`, `@app.page`, `ui.*`)

```python
from lcars_ui import ActionContext, App, ui

app = App()

@app.page("Survey", id="survey", layout="scene")          # implies chrome="none" (V8-D10)
def survey() -> None:
    with ui.scene(initial_mode="inspect") as scene:
        with scene.region("sample-a", label="SAMPLE A", subject="s-12"):
            ui.line_chart(...)
        with scene.region("sample-b", label="SAMPLE B", subject="s-19"):
            ui.line_chart(...)
        with scene.region("commands-a", label="SAMPLE COMMANDS", role="commands"):
            ui.button("COMPARE", id="compare")
            ui.button("EDIT", id="edit")
        with scene.region("notes-a", label="FIELD NOTES", role="detail"):
            ui.text_input("Note", id="note")
        with scene.region("fault", label="SENSOR FAULT", role="alert", fold="never"):
            ui.alert(...)
            ui.button("RECALIBRATE", id="recal")

        scene.controls("commands-a", "sample-a")
        scene.details("notes-a", "sample-a")
        scene.compares("sample-a", "sample-b")
        scene.recovers("fault", "sample-a")

        scene.mode("inspect", "INSPECT", focal=["sample-a"],
                   required=["sample-a", "commands-a"], optional=["notes-a"],
                   families=["wrap", "branch", "focus"])
        scene.mode("compare", "COMPARE", focal=["sample-a", "sample-b"],
                   required=["sample-a", "sample-b", "commands-a"],
                   families=["fork", "focus"], returns_to="inspect")
        scene.mode("edit", "EDIT NOTES", focal=["notes-a"],
                   required=["notes-a", "sample-a"],
                   families=["contour", "focus"], returns_to="inspect")
        scene.mode("fault", "FAULT", focal=["fault", "sample-a"],
                   required=["fault", "sample-a", "commands-a"],
                   families=["branch", "focus"], returns_to="inspect")

        scene.transition(on="compare", to="compare")       # server-side sugar (below)
        scene.transition(on="edit", to="edit")

@app.action("recal")
def recalibrate(ctx: ActionContext[None]) -> None:
    ...
    ctx.set_mode("inspect")                                # explicit, server-authoritative (V8-D07)
```

- `scene.transition(on=action_id, to=mode_id)` registers a server-side handler. It isn't
  contract data. It conflicts loudly with an `@app.action` for the same id; it never
  silently overrides it.
- `ctx.set_mode(mode_id, *, subjects=None)` validates the mode id against the page's scene
  and raises on an unknown id. It emits `scene_mode` and persists the mode in the session.
- `ctx.end_mode()` goes to the current mode's `returns_to`. It raises if there isn't one.

## 4. Owner decisions (2026-11-04)

1. **`ui.scene()`**: scenes live on `ui`, as the first-class API.
2. **Closed role list**: the seven roles above. New roles are added deliberately.
3. **Context terminal on by default**, with opt-out via `ui.scene(context_terminal=False)`.

Schema and decisions approved. M1 may start.
