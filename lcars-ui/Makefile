.PHONY: install dev test lint contracts-check contracts-update smoke clean docker-build \
	frontend-install frontend-test frontend-build frontend-ci frontend-e2e security-audit ci

install:
	pip install --no-build-isolation -e ".[dev]" || (echo "Restricted network fallback: installing package in editable mode without resolving deps." && pip install --no-build-isolation --no-deps -e .)

dev:
	uvicorn examples.bridge_ops.app:app --reload

test:
	pytest tests/ -v

contracts-check:
	pytest tests/contracts/ --check-golden

contracts-update:
	python scripts/generate_golden.py

smoke:
	python scripts/run_smoke_test.py

lint:
	ruff check src/ tests/
	mypy src/

clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache
	find . -not -path "./.venv/*" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

docker-build:
	@echo "Phase 0 scaffold: docker-build target reserved for later phases."

frontend-install:
	cd frontend && npm ci

frontend-test: frontend-install
	cd frontend && npm run test

frontend-build: frontend-install
	cd frontend && npm run build

frontend-ci: frontend-test frontend-build

frontend-e2e: frontend-install
	cd frontend && npx playwright install chromium
	cd frontend && npm run test:e2e

security-audit:
	LCARS_SECURITY_AUDIT_STRICT=1 python scripts/run_security_audit.py

ci: clean lint contracts-check test smoke security-audit frontend-ci
