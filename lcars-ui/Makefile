.PHONY: venv-check install dev test lint contracts-check contracts-update smoke clean distclean docker-build \
	frontend-install frontend-test frontend-build frontend-bundle frontend-ci frontend-e2e \
	docs-screenshots docs-check canon-screenshots security-audit docs-index map ci

STATIC_DIR := src/lcars_ui/_static
VERSION := $(shell sed -n 's/^version = "\(.*\)"/\1/p' pyproject.toml)
VENV_BIN := .venv/bin
PY := $(VENV_BIN)/python

venv-check:
	@test -x "$(PY)" || { echo "error: project virtual environment not found; create .venv before running this target" >&2; exit 1; }

install: venv-check
	$(PY) -m pip install --no-build-isolation -e ".[dev]" || (echo "Restricted network fallback: installing package in editable mode without resolving deps." && $(PY) -m pip install --no-build-isolation --no-deps -e .)

dev: venv-check
	$(PY) examples/bridge_ops/app.py

test: venv-check
	$(PY) -m pytest tests/ -v --cov=lcars_ui --cov-fail-under=60

contracts-check: venv-check
	$(PY) -m pytest tests/contracts/ --check-golden --no-cov
	cd frontend && npm run contracts:check

contracts-update: venv-check
	$(PY) scripts/generate_golden.py
	$(PY) scripts/generate_workspace_contract.py
	cd frontend && npm run contracts:generate

smoke: venv-check
	$(PY) scripts/run_smoke_test.py

lint: venv-check
	$(PY) -m ruff check src/ tests/
	$(PY) -m mypy src/

clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache
	find . \( -path "./.venv" -o -path "./$(STATIC_DIR)" \) -prune -o -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

distclean: clean
	rm -rf $(STATIC_DIR)/assets $(STATIC_DIR)/index.html

docker-build:
	@echo "Phase 0 scaffold: docker-build target reserved for later phases."

frontend-install:
	cd frontend && npm ci

frontend-test: frontend-install
	cd frontend && npm run test:coverage

frontend-build: frontend-install
	cd frontend && npm run build

frontend-bundle: frontend-build
	mkdir -p $(STATIC_DIR)/assets
	find $(STATIC_DIR)/assets -type f \( -name '*.js' -o -name '*.css' \) -delete
	cp frontend/dist/index.html $(STATIC_DIR)/index.html
	cp -r frontend/dist/assets/. $(STATIC_DIR)/assets/

frontend-ci: frontend-test frontend-build

frontend-e2e: frontend-install
	cd frontend && npx playwright install chromium
	cd frontend && npm run test:e2e

# Regenerate llms.txt, llms-full.txt and the agent docs bundle. The local
# indexing steps are best-effort: they run only where those tools are installed,
# so the target still works for contributors who do not use them.
KCTX := $(HOME)/.king-context/bin/kctx
DOCS_INDEX := $(PY) scripts/build_docs_index.py

docs-index: venv-check
	$(DOCS_INDEX)
	@if [ -x "$(KCTX)" ]; then \
		"$(KCTX)" index "$(HOME)/.king-context/data/lcars-ui.json"; \
	else \
		echo "skip: kctx not installed"; \
	fi
	@if command -v context >/dev/null 2>&1; then \
		context remove lcars-ui@$(VERSION) >/dev/null 2>&1 || true; \
		context add "$(CURDIR)/build/docs-bundle" --name lcars-ui --pkg-version $(VERSION); \
	else \
		echo "skip: context CLI not installed"; \
	fi

# Regenerate the on-demand codebase map when the personal generator is present
# one directory above this project. The packaged static bundle is deliberately
# excluded from source indexing.
map: venv-check
	@if [ -f "../codemap.py" ]; then \
		"$(PY)" ../codemap.py --root "$(CURDIR)" --output MAP.md --ignore _static; \
		sed -i 's|Re-run `python codemap.py` to refresh after code changes.|Re-run `make map` from `lcars-ui/` to refresh after code changes.|' MAP.md; \
	else \
		echo "skip: ../codemap.py not found; MAP.md was not refreshed"; \
	fi

docs-screenshots:
	node scripts/capture_docs_screenshots.mjs

docs-check: venv-check
	$(PY) -m py_compile scripts/build_docs_index.py
	$(PY) -m ruff check scripts/build_docs_index.py scripts/check_docs_screenshot_harness.py
	node --check scripts/capture_docs_screenshots.mjs
	$(PY) scripts/check_docs_screenshot_harness.py
	$(DOCS_INDEX) --check

canon-screenshots:
	node scripts/capture_canon_recreations.mjs

security-audit: venv-check
	LCARS_SECURITY_AUDIT_STRICT=1 $(PY) scripts/run_security_audit.py

ci: clean lint contracts-check test smoke security-audit docs-check frontend-ci frontend-bundle
