# LCARS-WebUI 6.1.0

Version 6.1.0 makes the browser control language consistently LCARS-native and turns the
post-6.0 reliability work into a reproducible feature release.

## Highlights

- Select, checkbox, radio, and number inputs render as LCARS instruments instead of exposing
  host-browser dropdowns, checks, or spinner chrome.
- `lcars.command_input()` provides one cohesive command/chat composer with Enter submission,
  multiline Ctrl/Cmd+Enter submission, clearing, pending state, and attached secondary actions.
- The measured Pentharan seismic Surface recreation replaces the obsolete five-shape gallery;
  its browser output remains entirely code-rendered geometry and content.

## Reliability and maintenance

- Generated TypeScript contracts are guarded against silent schema drift.
- Every bundled example is built by the test suite, and `make ci` is completable in one run.
- Live documentation was separated from historical records and repaired against current code.
- The Surface, knowledge-graph, table, microphone, and chart families were extracted from the
  two largest implementation files without changing behavior.

## Compatibility and scope

This is an additive minor release with no intended public API break. `command_input()` is a
composer primitive, not a complete conversation thread or responsive chat-application pattern;
that product-level interaction work remains intentionally outside 6.1.0.

## Reproducibility

The release is gated by backend and frontend tests with coverage, Ruff, mypy, generated-contract
checks, example builds, smoke tests, strict Python/npm security audits, the production frontend
bundle, refreshed README/Wiki screenshots, and refreshed code-rendered canon comparisons.
