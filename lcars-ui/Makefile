.PHONY: install dev test lint contracts-check contracts-update smoke clean docker-build ci

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
	find . -name "__pycache__" -delete || true
	find . -type d -name "__pycache__" -prune -exec rm -rf {} + || true

docker-build:
	@echo "Phase 0 scaffold: docker-build target reserved for later phases."

ci: clean lint contracts-check test smoke
