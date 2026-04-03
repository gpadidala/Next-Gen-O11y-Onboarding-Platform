.PHONY: help install build test lint format run-backend run-frontend dev docker-up docker-down migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Install ──────────────────────────────────────────────
install: install-backend install-frontend ## Install all dependencies

install-backend: ## Install backend dependencies
	cd backend && pip install -e ".[dev]"

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

# ── Build ────────────────────────────────────────────────
build: build-backend build-frontend ## Build all

build-backend: ## Build backend (type check)
	cd backend && mypy app/ --strict

build-frontend: ## Build frontend
	cd frontend && npm run build

# ── Test ─────────────────────────────────────────────────
test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	cd backend && python -m pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

test-frontend: ## Run frontend tests
	cd frontend && npm run test -- --run

# ── Lint & Format ────────────────────────────────────────
lint: lint-backend lint-frontend ## Lint all

lint-backend: ## Lint backend
	cd backend && ruff check . && mypy app/ --strict

lint-frontend: ## Lint frontend
	cd frontend && npm run lint && npm run type-check

format: ## Format all code
	cd backend && ruff format .
	cd frontend && npx prettier --write "src/**/*.{ts,tsx}"

# ── Run ──────────────────────────────────────────────────
run-backend: ## Run backend dev server
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

run-frontend: ## Run frontend dev server
	cd frontend && npm run dev

dev: ## Run both backend and frontend (requires tmux or two terminals)
	@echo "Run 'make run-backend' and 'make run-frontend' in separate terminals"

# ── Database ─────────────────────────────────────────────
migrate: ## Run database migrations
	cd backend && alembic upgrade head

migrate-create: ## Create new migration (usage: make migrate-create msg="description")
	cd backend && alembic revision --autogenerate -m "$(msg)"

migrate-rollback: ## Rollback last migration
	cd backend && alembic downgrade -1

# ── Docker ───────────────────────────────────────────────
docker-up: ## Start all services via Docker Compose
	docker-compose up --build -d

docker-down: ## Stop all services
	docker-compose down

docker-logs: ## Follow Docker Compose logs
	docker-compose logs -f

docker-clean: ## Remove all containers and volumes
	docker-compose down -v --remove-orphans
