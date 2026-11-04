# v7.2.1 — security patch

_Released 2026-11-03. No API or contract change._

v7.2.1 clears dependency advisories that were published after v7.2.0. It changes no
library behaviour; it exists because the v7.2.0 wheel bundled vulnerable frontend code
and its dependency range kept installs off a patched `anyio`.

## What changed

- **Bundled frontend** (shipped in the wheel's `_static/`): axios 1.18.1 → 1.21.0 and
  dompurify moved to a patched release (critical advisory), plus the other in-range fixes
  from `npm audit fix`. `npm audit` reports 0 vulnerabilities.
- **Frontend dev tooling**: vitest and `@vitest/coverage-v8` 4.1.10 → 4.1.12.
- **Python dependency range**: `anyio>=4.4,<4.12` → `anyio>=4.14.2,<5`. The old ceiling,
  added in June 2026, had no recorded reason; the full gate passes on anyio 4.16.0.

## Verification

`make ci` passes in one run: 670 Python tests, 554 frontend tests, the example guards, and
the security audit (`pip-audit` and `npm audit --audit-level=high`). GitHub CI is green on
`7d46d4e`.
