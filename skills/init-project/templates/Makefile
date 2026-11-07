# {{PROJECT_NAME}} — one command per task. `make help` lists them.
.DEFAULT_GOAL := help
.PHONY: help install lint format test e2e ci up down api web migrate
SHELL := /bin/bash
BACKEND := cd backend &&
WEB := cd web &&
API_PORT ?= 8000
WEB_PORT ?= 3000

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------
install: ## Install repo tooling, backend (uv) and web (npm) dependencies
	npm install
	$(BACKEND) uv sync
	$(WEB) npm install

# --- run ---------------------------------------------------------------------
api: ## Run the API with reload on :$(API_PORT)
	$(BACKEND) uv run uvicorn app.main:app --reload --port $(API_PORT)

web: ## Run the web app in development on :$(WEB_PORT)
	$(WEB) npm run dev

up: ## Start local infrastructure (docker compose)
	docker compose up -d --wait

down: ## Stop local infrastructure
	docker compose down

migrate: ## Apply database migrations
	$(BACKEND) uv run alembic upgrade head

# --- quality -----------------------------------------------------------------
lint: ## Format check, lint and typecheck everything
	$(BACKEND) uv run ruff format --check . && uv run ruff check . && uv run mypy
	$(WEB) npm run lint && npm run typecheck
	npx prettier --check .

format: ## Format everything
	$(BACKEND) uv run ruff format . && uv run ruff check --fix .
	npx prettier --write .

test: ## Unit and API/component tests with coverage
	$(BACKEND) uv run pytest
	$(WEB) npm test

e2e: ## Browser journeys (Playwright) against the built app
	$(WEB) npx playwright test

ci: lint test ## Everything CI runs
