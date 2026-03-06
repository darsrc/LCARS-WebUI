.PHONY: install dev test lint contracts-check contracts-update smoke clean docker-build \
	frontend-install frontend-test frontend-build frontend-bundle frontend-ci frontend-e2e security-audit ci

STATIC_DIR := src/lcars_ui/_static

install:
	pip install --no-build-isolation -e ".[dev]" || (echo "Restricted network fallback: installing package in editable mode without resolving deps." && pip install --no-build-isolation --no-deps -e .)

dev:
	python examples/bridge_ops/app.py

test:
	pytest tests/ -v --cov=lcars_ui --cov-fail-under=60

contracts-check:
	pytest tests/contracts/ --check-golden --no-cov

contracts-update:
	python scripts/generate_golden.py

smoke:
	python scripts/run_smoke_test.py

lint:
	ruff check src/ tests/
	mypy src/

clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache
	rm -rf $(STATIC_DIR)/assets $(STATIC_DIR)/index.html
	find . -not -path "./.venv/*" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

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
	cp frontend/dist/index.html $(STATIC_DIR)/index.html
	cp -r frontend/dist/assets/. $(STATIC_DIR)/assets/

frontend-ci: frontend-test frontend-build

frontend-e2e: frontend-install
	cd frontend && npx playwright install chromium
	cd frontend && npm run test:e2e

security-audit:
	LCARS_SECURITY_AUDIT_STRICT=1 python scripts/run_security_audit.py

ci: clean lint contracts-check test smoke security-audit frontend-ci frontend-bundle test
