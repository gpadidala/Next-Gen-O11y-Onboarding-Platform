# Observability Onboarding Platform

Enterprise-grade self-service platform for onboarding applications to the **Grafana LGTM Stack** (Loki, Grafana, Tempo, Mimir).

## What It Does

- **9-step guided onboarding wizard** for application teams
- **Capacity planning** — validates LGTM infrastructure headroom before approving
- **Similarity search** — reuses historical onboarding patterns via hybrid matching
- **Governance enforcement** — hard/soft rules prevent unsafe onboardings
- **Artifact generation** — auto-creates Change Requests and Jira work items
- **Alert ownership enforcement** — ensures app teams own their alerts, not the platform team

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  React SPA  │────▶│  FastAPI Backend  │────▶│  PostgreSQL + pgv │
│  (Vite/TS)  │     │  (Python 3.12+)  │     │  (pgvector)       │
└─────────────┘     └───────┬──────────┘     └───────────────────┘
                            │
                    ┌───────┴────────┐
                    │  MCP Clients   │
                    ├────────────────┤
                    │ Grafana LGTM   │
                    │ Confluence     │
                    │ Jira           │
                    │ ServiceNow     │
                    └────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for C4 diagrams.

## Quick Start

```bash
# Clone and start all services
docker-compose up --build -d

# Verify
curl http://localhost:8000/api/v1/health
open http://localhost:3000
```

## Development Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
# Start PostgreSQL with pgvector
docker-compose up db -d

# Run migrations
cd backend && alembic upgrade head
```

## API Documentation

- Interactive docs: http://localhost:8000/docs
- OpenAPI spec: http://localhost:8000/openapi.json
- [API Contracts](docs/API_CONTRACTS.md)

## Project Structure

```
├── backend/          # FastAPI + SQLAlchemy + Pydantic
│   ├── app/api/      # REST endpoints
│   ├── app/engine/   # Capacity + governance engines
│   ├── app/mcp/      # MCP server clients
│   └── app/services/ # Business logic
├── frontend/         # React + TypeScript + Tailwind
│   └── src/features/ # Onboarding wizard, dashboard, admin
├── infra/            # Kubernetes, Helm, Terraform
└── docs/             # Architecture, API contracts, guides
```

## Key Commands

```bash
make install          # Install all dependencies
make test             # Run all tests
make lint             # Lint backend + frontend
make docker-up        # Start full stack
make migrate          # Run database migrations
```

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | React 18, TypeScript, Vite, Tailwind   |
| Backend     | FastAPI, SQLAlchemy 2.0, Pydantic v2   |
| Database    | PostgreSQL 16 + pgvector               |
| State       | Zustand (frontend), Redis (planned)    |
| Testing     | pytest, Vitest, React Testing Library  |
| Infra       | Docker, Kubernetes, Helm, Terraform    |

## License

Apache 2.0 — see [LICENSE](LICENSE).
# Next-Gen-O11y-Onboarding-Platform
