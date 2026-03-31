# Release Readiness 2026-03-23

## Status
Release-candidate closeout completed against the current Phase 18 baseline.

Active architecture for this report:
- product renderer: `legacy_strict`
- oracle / acceptance engine: `phase14_family` (archived)
- deprecated compatibility path: `joern_strict`

Canonical acceptance basis for the ship claim:
- catalog snapshot: `phase14-v3` (archived)
- catalog phase marker: `phase16-closeout`
- fixed scope: 7 canonical targets across 4 canonical families

## Validation Commands And Results
- `./.venv/bin/python -m mypy src`
  - PASS
- `./.venv/bin/python -m pytest -q tests/contracts/test_manifest_schema.py tests/contracts/test_protocol_schema.py tests/unit/test_phase13_normalize.py tests/unit/test_phase13_recipes.py --check-golden`
  - PASS (`51 passed`)
- `./.venv/bin/python scripts/run_smoke_test.py`
  - PASS
- `timeout 120s ./.venv/bin/python -m pytest -q tests/integration/test_api_endpoints.py tests/integration/test_streaming.py`
  - PASS outside sandbox after loopback-port restriction in the sandbox (`19 passed`)
- `npm run build`
  - PASS
- `npm run test -- src/runtime/manifest.test.ts src/types/contract.test.ts src/test/targetBankGuardrails.test.ts src/test/overviewParityGuardrails.test.ts src/test/joernGuardrails.test.ts src/test/parityRetirementGuardrails.test.ts src/test/strictRoleHeuristicGuardrails.test.ts src/test/phase15PrimitiveBoundaryGuardrails.test.ts src/test/phase16CatalogGuardrails.test.ts`
  - PASS (`31 passed`)
- `npm run test -- src/components/phase14/SeismographicFamilyScene.test.tsx` (archived path)
  - PASS
- `npm run test:visual`
  - PASS (`2 passed`)
- `PATH=/home/darius/Documents/Projects/LCARS-WebUI/lcars-ui/.venv/bin:$PATH npm run test:visual:legacy`
  - PASS as product smoke coverage (`1 passed`, `3 skipped` because those legacy visual baselines are intentionally paused)
- `PATH=/home/darius/Documents/Projects/LCARS-WebUI/lcars-ui/.venv/bin:$PATH LCARS_SECURITY_AUDIT_STRICT=1 ./.venv/bin/python scripts/run_security_audit.py`
  - FAIL
  - `pip-audit` reported `pip 25.3` vulnerable to `CVE-2026-1703` with fix version `26.0`
  - `npm audit` reported moderate `esbuild` advisories through the repo's `vite` toolchain

## Canonical Acceptance Bundle
Bundle publication:
- local-only working path: `lcars-ui/artifacts/release_readiness_2026-03-23/canonical_acceptance`
- published GitHub release asset: `LCARS-WebUI-v0.7.0-canonical_acceptance-2026-03-23.tar.gz`
- the bundle is intentionally kept out of git history and uploaded as the release evidence artifact instead

Bundle contents:
- `phase14_target_catalog.json` (archived)
- `canonical_targets.json`
- `bundle_manifest.json`
- `artifact_index.json`
- one artifact directory per canonical target with `rendered.png`, `target.png`, `diff.png`, and `metadata.json`

Per-target structural mismatch results:

| target_id | family_id | threshold | structural_mismatch_ratio | result |
| --- | --- | ---: | ---: | --- |
| `seismo_scan_a` | `seismographic_scan` | `0.37` | `0.3593428184` | PASS |
| `seismo_scan_b` | `seismographic_scan` | `0.50` | `0.4854105691` | PASS |
| `holodeck_programming_a` | `holodeck_programming` | `0.34` | `0.3281293361` | PASS |
| `holodeck_programming_b` | `holodeck_programming` | `0.29` | `0.2771807290` | PASS |
| `adge_intro_a` | `adge_intro` | `0.76` | `0.5279214559` | PASS |
| `adge_intro_b` | `adge_intro` | `0.78` | `0.5274419782` | PASS |
| `periodic_table_matrix` | `periodic_table_matrix` | `0.55` | `0.5425229600` | PASS |

## Honest Release Claim
The current worktree supports a truthful release claim as a Phase 18 deadline build with:
- `legacy_strict` as the active product renderer
- `phase14_family` (archived) as the fixed canonical oracle / acceptance engine
- canonical acceptance proven against the closed seven-target / four-family catalog recorded in the release bundle
- active anti-cheat and boundary guardrails still enforced in code and tests

This is not a claim of global LCARS accuracy beyond the closed canonical target bank, and it is not a claim that deprecated `joern_strict` is revived or ship-worthy.

## Caveats
- The strict security audit command is red on current tooling/advisory state even though the build, canonical acceptance, smoke checks, integration tests, and guardrails passed.
- The legacy visual smoke suite currently contains three intentionally skipped paused baselines; only the active console smoke is still enforced.
- WebSocket integration needed an unsandboxed rerun because the sandbox blocks loopback port binding; the passing result is from the real local environment, not a mocked bypass.

## Recommendation
Recommendation for a deadline / demoable release candidate: **ship yes, with the documented security-audit caveat**.

That recommendation is supported by the passing canonical acceptance bundle, passing build/type/integration/guardrail checks, and the fact that the remaining red item is limited to tooling/package advisories rather than a failed canonical renderer claim.
