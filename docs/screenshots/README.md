# Documentation screenshots

These PNGs are captures of live, code-rendered LCARS-WebUI examples. They are
documentation assets only and are never loaded by parity UI paths.

From `lcars-ui/`, regenerate the current feature gallery with:

```bash
make docs-screenshots
```

The capture script starts the relevant local examples, uses a 1920×1080 Chromium
viewport, exercises representative interactions, and writes matching files here and in
`wiki/images/`. It requires the package development environment, frontend dependencies,
and either Playwright Chromium or a system Chromium executable. Override discovery with
`LCARS_CHROMIUM_PATH=/path/to/chromium` or `PLAYWRIGHT_CHROMIUM_PATH=...`.

Reference screenshots under `LCARS_TRUTH/` are never used by this process. They remain
measurement and validation inputs only.
