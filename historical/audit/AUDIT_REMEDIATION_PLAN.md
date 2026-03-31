# LCARS WebUI — Audit Remediation Plan

> **Execution instruction for automated agents**: Apply every change in the exact order listed.
> After each numbered step, run the listed verification command(s) and abort if they fail.
> Do not skip, reorder, or summarise steps.

---

## Audit Findings

Six confirmed issues found by codebase audit against the project's stated claims:

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | CRITICAL | Pre-built frontend bundle missing — UI is inaccessible | `src/lcars_ui/_static/` (empty) |
| 2 | CRITICAL | Python package not installed — nothing runs | environment |
| 3 | HIGH | `app.py` advertises version `0.6.0-alpha` instead of `1.0.0b1` | `app.py:367` |
| 4 | HIGH | `README.md` "Current Repository Truth" section is Phase 18 state, not Beta 1.0 | `README.md:5–34` |
| 5 | HIGH | `core/models.py`, `_state.py`, `api.py` still accept removed values `classic` / `joern` | 3 source files + 2 test files + golden schema |
| 6 | MEDIUM | Stray root-level files should not be published | `test_hud.py`, `codex.resume` |

---

## Step 1 — Install the Python package

**Working directory**: `/home/user/LCARS-WebUI/lcars-ui`

```bash
pip install -e ".[dev]"
```

**Verify**:
```bash
python -c "import lcars_ui; print(lcars_ui.__version__)"
```
Expected output: `1.0.0-beta.1`

---

## Step 2 — Fix version string in `app.py`

**File**: `/home/user/LCARS-WebUI/lcars-ui/src/lcars_ui/app.py`

Find and replace (exact string match):
```
    app = FastAPI(title="lcars-ui", version="0.6.0-alpha", lifespan=lifespan)
```
Replace with:
```
    app = FastAPI(title="lcars-ui", version="1.0.0b1", lifespan=lifespan)
```

**Verify**: The string `0.6.0-alpha` must not appear anywhere in `src/lcars_ui/app.py` after this change.

---

## Step 3 — Update `README.md` "Current Repository Truth" section

**File**: `/home/user/LCARS-WebUI/README.md`

Find and replace this exact block (lines 5–34):
```markdown
## Current Repository Truth

- The repository is closed through Phase 18 in the current working tree.
- Active architecture is a two-role system:
  - `legacy_strict` renders live product pages
  - Oracle/acceptance infrastructure has been archived
  - `joern_strict` is a deprecated compatibility path only
- Current phase status:
  - Phase 15 is the complete baseline for primitive-boundary and strict-role closure
  - Phase 16 is complete / closed as the catalog-driven target-bank acceptance baseline
  - Phase 17 is complete / closed as the product-side scaffold/surface convergence and shared-primitive-promotion baseline
  - Phase 18 is complete / closed as the explicit strict-contract, compatibility-fence, and shared elbow-scaffold baseline
- Phase 18 actually accomplished:
  - explicit strict manifest contract metadata now ships through the active strict DSL path and golden/schema fixtures
  - compatibility repair for older implicit manifests is fenced to ingest, while explicit-manifest runtime heuristics stay retired
  - shared elbow-scaffold reuse is active across oracle and product paths without changing renderer roles or acceptance scope
  - repo-local build, visual, schema, HTTP, WebSocket, and guardrail validation remain active under the current toolchain
- Canonical LCARS-ready acceptance is the catalog-driven target-bank run:
  - 7 canonical targets
  - 4 blocking families
  - catalog-owned thresholds and family-state policy
  - default commands: `make ci`, `make canonical-acceptance`, `cd frontend && npm run test:visual`
- No implementation phase is opened in this publication wrap-up.
- Publication / closeout docs:
  - [CURRENT_STATE.md](CURRENT_STATE.md)
  - [RELEASE_NOTES.md](RELEASE_NOTES.md)
  - [lcars-ui/docs/RELEASE_READINESS_2026-03-23.md](lcars-ui/docs/RELEASE_READINESS_2026-03-23.md)
  - [lcars-ui/docs/PHASE18_CLOSEOUT.md](lcars-ui/docs/PHASE18_CLOSEOUT.md)
  - [GITHUB_PUBLICATION_CHECKLIST.md](GITHUB_PUBLICATION_CHECKLIST.md)
```

Replace with:
```markdown
## Current Repository Truth

- **Active release**: Beta 1.0 (`lcars-ui 1.0.0b1`)
- **Product renderer**: `legacy_strict` (only renderer in product)
- **Visual language**: `strict` only (`classic` removed in Beta 1.0)
- **Themes**: `galaxy` (default), `tng`, `nemesis`
- **Widget freeze**: 24 stable widgets (see [CURRENT_STATE.md](CURRENT_STATE.md))
- **Removed in Beta 1.0**: `joern_strict` renderer, oracle/acceptance infrastructure, `classic` visual language
- Publication docs:
  - [CURRENT_STATE.md](CURRENT_STATE.md)
  - [RELEASE_NOTES.md](RELEASE_NOTES.md)
  - [lcars-ui/docs/RELEASE_READINESS_2026-03-23.md](lcars-ui/docs/RELEASE_READINESS_2026-03-23.md)
  - [GITHUB_PUBLICATION_CHECKLIST.md](GITHUB_PUBLICATION_CHECKLIST.md)
```

**Verify**: The strings `joern_strict`, and `Phase 18 actually accomplished` must not appear in the "Current Repository Truth" section of `README.md` after this change.

---

## Step 4 — Remove deprecated `classic` / `joern` values from source

This step touches 3 source files. Apply all three changes before running any verification.

### 4a — `core/models.py`

**File**: `/home/user/LCARS-WebUI/lcars-ui/src/lcars_ui/core/models.py`

Find and replace:
```python
    visual_language: Literal["strict", "classic"] = Field(
        default="strict",
        description="Frontend LCARS visual mode: strict (default) or classic compatibility.",
    )
    strict_renderer: Literal["legacy", "joern"] = Field(
        default="legacy",
        description="Strict visual renderer family selector.",
    )
```
Replace with:
```python
    visual_language: Literal["strict"] = Field(
        default="strict",
        description="Frontend LCARS visual mode: strict.",
    )
    strict_renderer: Literal["legacy"] = Field(
        default="legacy",
        description="Strict visual renderer family selector.",
    )
```

### 4b — `dsl/_state.py`

**File**: `/home/user/LCARS-WebUI/lcars-ui/src/lcars_ui/dsl/_state.py`

Find and replace:
```python
    visual_language: Literal["strict", "classic"] = "strict"
    strict_renderer: Literal["legacy", "joern"] = "legacy"
```
Replace with:
```python
    visual_language: Literal["strict"] = "strict"
    strict_renderer: Literal["legacy"] = "legacy"
```

### 4c — `dsl/api.py`

**File**: `/home/user/LCARS-WebUI/lcars-ui/src/lcars_ui/dsl/api.py`

Find and replace:
```python
    visual_language: Literal["strict", "classic"] = "strict",
    strict_renderer: Literal["legacy", "joern"] = "legacy",
```
Replace with:
```python
    visual_language: Literal["strict"] = "strict",
    strict_renderer: Literal["legacy"] = "legacy",
```

---

## Step 5 — Update tests that used `classic` / `joern`

### 5a — `tests/integration/test_dsl_roundtrip.py`

**File**: `/home/user/LCARS-WebUI/lcars-ui/tests/integration/test_dsl_roundtrip.py`

Find and replace the entire `test_config_visual_language_is_preserved` function:
```python
def test_config_visual_language_is_preserved() -> None:
    """lcars.config(visual_language=...) should flow into manifest metadata."""
    import lcars_ui as lcars_mod

    lcars_mod.config("Visual Language Test", visual_language="classic")

    pre_config = get_ctx().config
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_config)
    set_ctx(build_ctx)

    def ui() -> None:
        pass

    ui()
    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    assert manifest.meta.visual_language == "classic"
    assert manifest.meta.strict_renderer == "legacy"
```
Replace with:
```python
def test_config_visual_language_is_preserved() -> None:
    """lcars.config(visual_language=...) should flow into manifest metadata."""
    import lcars_ui as lcars_mod

    lcars_mod.config("Visual Language Test", visual_language="strict")

    pre_config = get_ctx().config
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_config)
    set_ctx(build_ctx)

    def ui() -> None:
        pass

    ui()
    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    assert manifest.meta.visual_language == "strict"
    assert manifest.meta.strict_renderer == "legacy"
```

Find and replace the entire `test_config_strict_renderer_is_preserved` function:
```python
def test_config_strict_renderer_is_preserved() -> None:
    """lcars.config(strict_renderer=...) should flow into manifest metadata."""
    import lcars_ui as lcars_mod

    lcars_mod.config("Strict Renderer Test", strict_renderer="joern")

    pre_config = get_ctx().config
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_config)
    set_ctx(build_ctx)

    def ui() -> None:
        pass

    ui()
    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    assert manifest.meta.strict_renderer == "joern"
```
Replace with:
```python
def test_config_strict_renderer_is_preserved() -> None:
    """lcars.config(strict_renderer=...) should flow into manifest metadata."""
    import lcars_ui as lcars_mod

    lcars_mod.config("Strict Renderer Test", strict_renderer="legacy")

    pre_config = get_ctx().config
    build_ctx = _LCARSContext(mode=Mode.BUILD, builder=_ManifestBuilder(), config=pre_config)
    set_ctx(build_ctx)

    def ui() -> None:
        pass

    ui()
    assert build_ctx.builder is not None
    manifest = build_ctx.builder.build(build_ctx.config)

    assert manifest.meta.strict_renderer == "legacy"
```

### 5b — `tests/unit/test_dsl_builder.py`

**File**: `/home/user/LCARS-WebUI/lcars-ui/tests/unit/test_dsl_builder.py`

Find and replace the `test_build_meta_and_layout` function body:
```python
    cfg = _Config(
        name="My App",
        theme="nemesis",
        lang="fr-FR",
        header_color="blue",
        visual_language="classic",
    )
    manifest = b.build(cfg)
    assert manifest.meta.app_name == "My App"
    assert manifest.meta.theme == "nemesis"
    assert manifest.meta.lang == "fr-FR"
    assert manifest.meta.visual_language == "classic"
    assert manifest.meta.strict_renderer == "legacy"
```
Replace with:
```python
    cfg = _Config(
        name="My App",
        theme="nemesis",
        lang="fr-FR",
        header_color="blue",
        visual_language="strict",
    )
    manifest = b.build(cfg)
    assert manifest.meta.app_name == "My App"
    assert manifest.meta.theme == "nemesis"
    assert manifest.meta.lang == "fr-FR"
    assert manifest.meta.visual_language == "strict"
    assert manifest.meta.strict_renderer == "legacy"
```

---

## Step 6 — Regenerate golden schema fixture

**Working directory**: `/home/user/LCARS-WebUI/lcars-ui`

```bash
PYTHONPATH=src python scripts/generate_golden.py
```

**Verify**:
```bash
grep -c '"classic"' fixtures/golden/schema.v1.json
grep -c '"joern"' fixtures/golden/schema.v1.json
```
Both commands must output `0`.

Then run the contracts check:
```bash
make contracts-check
```
Must exit with code 0.

---

## Step 7 — Delete stray root-level files

**Working directory**: `/home/user/LCARS-WebUI`

```bash
rm test_hud.py
rm codex.resume
```

**Verify**:
```bash
ls test_hud.py codex.resume 2>&1
```
Expected: `ls: cannot access ...` (both files gone).

---

## Step 8 — Build and bundle the frontend

**Working directory**: `/home/user/LCARS-WebUI/lcars-ui`

```bash
make frontend-install
make frontend-bundle
```

`frontend-install` runs `npm ci` in `frontend/`.
`frontend-bundle` runs `npm run build` then copies `frontend/dist/` → `src/lcars_ui/_static/`.

**Verify**:
```bash
ls src/lcars_ui/_static/index.html
ls src/lcars_ui/_static/assets/
```
Both must exist. Also:
```bash
python -c "
from pathlib import Path
p = Path('src/lcars_ui/_static/index.html')
assert p.exists(), 'index.html missing'
assets = list((Path('src/lcars_ui/_static/assets')).glob('*.js'))
assert len(assets) > 0, 'no JS assets found'
print('_static OK — index.html and', len(assets), 'JS asset(s) present')
"
```

---

## Step 9 — Run full backend test suite

**Working directory**: `/home/user/LCARS-WebUI/lcars-ui`

```bash
make lint
make contracts-check
make test
```

All three must exit with code 0. `make test` requires ≥ 60% coverage.

---

## Step 10 — Smoke test the server

**Working directory**: `/home/user/LCARS-WebUI/lcars-ui`

```bash
timeout 10 python -c "
import subprocess, time, urllib.request, sys
proc = subprocess.Popen(['python', 'examples/lcars_console/app.py'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)
try:
    resp = urllib.request.urlopen('http://127.0.0.1:8000/', timeout=4)
    body = resp.read().decode()
    assert '<div id=\"root\">' in body, 'SPA root div not found — bundle not served'
    print('SMOKE PASS: LCARS SPA served at /')
finally:
    proc.terminate()
" || echo "SMOKE FAIL"
```

Expected output: `SMOKE PASS: LCARS SPA served at /`

---

## Step 11 — Commit and push

**Working directory**: `/home/user/LCARS-WebUI`

Stage all changes:
```bash
git add \
  lcars-ui/src/lcars_ui/app.py \
  lcars-ui/src/lcars_ui/core/models.py \
  lcars-ui/src/lcars_ui/dsl/_state.py \
  lcars-ui/src/lcars_ui/dsl/api.py \
  lcars-ui/tests/integration/test_dsl_roundtrip.py \
  lcars-ui/tests/unit/test_dsl_builder.py \
  lcars-ui/fixtures/golden/schema.v1.json \
  lcars-ui/src/lcars_ui/_static/ \
  README.md \
  AUDIT_REMEDIATION_PLAN.md
```

Commit:
```bash
git commit -m "$(cat <<'EOF'
fix: address all audit findings — bundle frontend, fix version, clean stale model values

- Build and commit frontend bundle into _static/ so the LCARS SPA is served
  at / without requiring a separate Vite dev server (fixes critical blocker
  where _STATIC_AVAILABLE was False and root served a plain status page)
- Fix FastAPI version string in app.py from 0.6.0-alpha to 1.0.0b1 to match
  pyproject.toml and __version__
- Update README Current Repository Truth section from stale Phase 18 state
  to accurate Beta 1.0 state (removes references to archived oracle infrastructure,
  joern_strict renderer, and classic visual language that were all removed)
- Tighten Literal types in core/models.py, dsl/_state.py, and dsl/api.py:
  visual_language now Literal["strict"], strict_renderer now Literal["legacy"]
- Update 2 test files to use valid values after model tightening
- Regenerate fixtures/golden/schema.v1.json to remove joern/classic enum values
- Delete stray root-level files: test_hud.py and codex.resume

https://claude.ai/code/session_01DR5NQSqsj8HGjft2Hno1qx
EOF
)"
```

Push:
```bash
git push -u origin claude/audit-lcars-webui-GQKNI
```

---

## What This Plan Does NOT Change

The following were verified correct during the audit and require no changes:

- Python DSL: all 44 public API functions fully implemented
- All 24 widget Pydantic models (inputs, data, containers, primitives, media)
- Frontend `WidgetRenderer.tsx`: all widget types handled, no stubs
- LCARS CSS: tokens, three themes (galaxy/tng/nemesis), animations, accessibility
- WebSocket + SSE transport with reconnect and exponential backoff
- Security middleware: CORS, auth scopes (READ/STREAM/WRITE), rate limiting, content-length
- Test suite structure: 70+ test files covering unit, integration, and contract layers
