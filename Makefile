.PHONY: help install-precommit scan-secrets scan-sast scan-config scan-vuln docker-build run clean

# Default shell
SHELL := /bin/bash

help:
	@echo "DevSecOps Automation targets:"
	@echo "  install-precommit  Install and set up local pre-commit hooks"
	@echo "  scan-secrets       Scan repository for credentials leaks using Gitleaks"
	@echo "  scan-sast          Scan code for security vulnerability patterns using Semgrep"
	@echo "  scan-config        Scan Dockerfiles and Compose configurations using Checkov"
	@echo "  scan-vuln          Scan dependencies and images using Trivy"
	@echo "  docker-build       Build web and api Docker images locally"
	@echo "  run                Launch the docker-compose stack locally"
	@echo "  clean              Clean up build caches and temporary docker resources"

install-precommit:
	pip install pre-commit
	pre-commit install

scan-secrets:
	@if command -v gitleaks >/dev/null 2>&1; then \
		gitleaks detect --verbose --redact; \
	else \
		echo "Gitleaks is not installed. Run 'brew install gitleaks' or 'docker run --rm -v $(PWD):/path zricethezav/gitleaks:latest detect --source=/path -v'"; \
	fi

scan-sast:
	@if command -v semgrep >/dev/null 2>&1; then \
		semgrep scan --config=auto; \
	else \
		echo "Semgrep is not installed. Run 'pip install semgrep' or 'npm install -g semgrep'"; \
	fi

scan-config:
	@if command -v checkov >/dev/null 2>&1; then \
		checkov -d . --compact; \
	else \
		echo "Checkov is not installed. Run 'pip install checkov'"; \
	fi

scan-vuln:
	@if command -v trivy >/dev/null 2>&1; then \
		trivy fs .; \
	else \
		echo "Trivy is not installed. Run 'brew install trivy'"; \
	fi

docker-build:
	docker compose build

run:
	docker compose --env-file .env.docker up -d

clean:
	docker compose down -v
	rm -rf .next node_modules venv
