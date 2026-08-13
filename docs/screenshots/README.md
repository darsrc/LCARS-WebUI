# Documentation screenshots

These PNGs are captures of live, code-rendered LCARS-WebUI examples. They are
documentation assets only and are never loaded by parity UI paths.

From `lcars-ui/`, regenerate the current feature gallery with:

```bash
make docs-screenshots
```

The capture script starts the relevant local examples, including the focused layered
graph reader and graph proposal workspace, uses 1920×1080 for README images
and the established 1280×800 viewport for the older Wiki gallery, exercises representative
interactions, and refreshes every checked-in image in this directory and `wiki/images/`.
It requires the package development environment, frontend dependencies, and either
Playwright Chromium or a system Chromium executable. Override discovery with
`LCARS_CHROMIUM_PATH=/path/to/chromium` or `PLAYWRIGHT_CHROMIUM_PATH=...`.

Reference screenshots under `LCARS_TRUTH/` are never used by this process. They remain
measurement and validation inputs only.
