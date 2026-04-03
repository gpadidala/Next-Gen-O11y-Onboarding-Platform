# Next-Gen Enterprise Observability Onboarding Platform

Enterprise-grade self-service platform for onboarding applications to the **Grafana LGTM Stack** (Loki · Grafana · Tempo · Mimir).

> Built for platform engineering teams managing large-scale observability onboarding with capacity governance, similarity-based recommendations, and automated artifact generation.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
- [Demo Data — 10 Real-World Use Cases](#demo-data--10-real-world-use-cases)
- [Creating a New Onboarding](#creating-a-new-onboarding)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Development Guide](#development-guide)

---

## What It Does

| Feature | Description |
|---------|-------------|
| **9-Step Wizard** | Guided UI: app identity → telemetry scope → tech config → capacity check → similarity search → governance → artifact review → submit |
| **Capacity Planning** | GREEN/AMBER/RED thresholds per signal (Mimir ≤60%/70%, Loki ≤60%/70%, Tempo ≤65%/75%) |
| **Similarity Search** | Hybrid matching — structured scoring (40%) + pgvector cosine (40%) + Confluence CQL (20%) |
| **Governance Engine** | HARD rules (block submission) + SOFT rules (warnings); 12 rules covering cardinality, naming, SLOs |
| **Artifact Generation** | Auto-creates ServiceNow CRs + Jira Epics/Stories/Tasks via MCP clients |
| **Alert Ownership** | Enforces app teams own their alerts — not the platform team |
| **Multi-Platform** | AKS, GKE, EKS, Lambda, VM, on-prem — each with tailored exporter configs |

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │         Browser / UI             │
                        │   React 18 + TypeScript + Vite   │
                        │   Tailwind CSS · Zustand · RHF   │
                        └───────────────┬─────────────────┘
                                        │ REST / JSON
                        ┌───────────────▼─────────────────┐
                        │       FastAPI Backend             │
                        │   Python 3.12 · Pydantic v2      │
                        │   SQLAlchemy 2.0 async           │
                        └──┬────────────┬──────────────────┘
                           │            │
              ┌────────────▼──┐   ┌────▼──────────────────┐
              │  PostgreSQL   │   │     MCP Clients         │
              │  16 + pgvect  │   ├────────────────────────┤
              │               │   │ Grafana  · Confluence   │
              │  10 tables    │   │ Jira     · ServiceNow   │
              │  vector index │   └────────────────────────┘
              └───────────────┘
```

**Engines (backend/app/engine/):**
- `capacity_engine.py` — multi-signal utilisation threshold checks
- `governance_engine.py` — HARD/SOFT rule evaluation (GOV-001 … GOV-105)
- `similarity_engine.py` — hybrid scoring (structured + vector + Confluence)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/gpadidala/Next-Gen-O11y-Onboarding-Platform.git
cd Next-Gen-O11y-Onboarding-Platform

# 2. Start all services
docker compose up --build -d

# 3. Run migrations
docker compose exec backend alembic upgrade head

# 4. Seed demo data (10 real-world scenarios)
docker compose cp backend/scripts/seed_demo_data.py backend:/app/seed_demo_data.py
docker compose exec backend python seed_demo_data.py

# 5. Open the app
open http://localhost:3000        # Frontend wizard
open http://localhost:8000/docs   # API Swagger UI
```

**Expected output after seeding:**
```
================================================================================
  Observability Onboarding Platform — Demo Data Seeder
================================================================================
  ✅ Seeded APP-1001   | payment-gateway-api          | java_spring  on azure_aks  | completed
  🔄 Seeded APP-1002   | identity-auth-service        | dotnet       on on_prem    | in_progress
  ⏳ Seeded APP-1003   | product-catalogue-api        | nodejs_express on azure_aks| governance_review
  👍 Seeded APP-1004   | recommendation-engine        | python_fastapi on azure_aks| approved
  ✅ Seeded APP-1005   | api-gateway-core             | go           on azure_aks  | completed
  ✅ Seeded APP-1006   | inventory-management-service | java_spring  on azure_aks  | completed
  🔄 Seeded APP-1007   | invoice-pdf-generator        | dotnet       on lambda     | in_progress
  📝 Seeded APP-1008   | customer-data-etl-pipeline   | python_fastapi on gke      | draft
  ✅ Seeded APP-1009   | customer-portal-bff          | nodejs_express on azure_aks| completed
  🚫 Seeded APP-1010   | partner-integration-api      | dotnet       on on_prem    | cancelled
  Done. Inserted: 10  |  Skipped (already exist): 0
================================================================================
```

---

## Step-by-Step Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Docker + Docker Compose | 24+ |
| Node.js | 20+ (for local frontend dev) |
| Python | 3.12+ (for local backend dev) |

### Step 1 — Clone and verify structure

```bash
git clone https://github.com/gpadidala/Next-Gen-O11y-Onboarding-Platform.git
cd Next-Gen-O11y-Onboarding-Platform
ls
# backend/  docker-compose.yml  docs/  frontend/  infra/  Makefile
```

### Step 2 — Start infrastructure

```bash
docker compose up --build -d

# Verify all containers are healthy
docker compose ps
```

```
NAME                              STATUS
o11y-onboarding-platform-db-1        Up (healthy)
o11y-onboarding-platform-backend-1   Up
o11y-onboarding-platform-frontend-1  Up
```

### Step 3 — Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

```
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial schema.
INFO  [alembic.runtime.migration] Running upgrade 001 -> 002, Align child table schemas with ORM models.
```

This creates **10 tables**:

| Table | Purpose |
|-------|---------|
| `onboarding_requests` | Central aggregate — wizard state |
| `telemetry_scopes` | Which signals (metrics/logs/traces/profiles) per env |
| `technical_configs` | Exporter configs, namespaces, sampling rates |
| `environment_readiness` | Per-env per-signal readiness (DEV/QA/PROD × signals) |
| `capacity_assessments` | GREEN/AMBER/RED check results |
| `similarity_matches` | Top-N matched historical apps with reuse artifacts |
| `artifacts` | Generated CRs, Epics, Stories, Tasks |
| `application_metadata` | CMDB mirror for app inventory |
| `audit_logs` | Full audit trail of all state changes |

### Step 4 — Seed demo data

```bash
docker compose cp backend/scripts/seed_demo_data.py backend:/app/seed_demo_data.py
docker compose exec backend python seed_demo_data.py
```

### Step 5 — Verify the API

```bash
curl -s http://localhost:8000/api/v1/health
```
```json
{"status": "ok", "version": "1.0.0", "environment": "development"}
```

```bash
curl -s "http://localhost:8000/api/v1/onboardings/?limit=5" | python3 -m json.tool
```

```json
{
  "items": [
    {
      "id": "f363c309-...",
      "app_name": "customer-data-etl-pipeline",
      "app_code": "APP-1008",
      "portfolio": "Data & AI Platform",
      "hosting_platform": "gke",
      "tech_stack": "python_fastapi",
      "status": "draft",
      "alert_owner_email": "data-platform@company.com",
      "alert_owner_team": "Data Platform Engineering",
      "created_at": "2026-04-01T14:00:00+00:00",
      "telemetry_scope": {
        "selected_signals": {"metrics": {"enabled": true}, "logs": {"enabled": true}},
        "environment_matrix": {"DEV": {...}, "QA": {...}, "PROD": {...}}
      },
      "capacity_assessment": {
        "overall_status": "green",
        "can_proceed": true,
        "signal_results": {
          "metrics": {"status": "GREEN", "currentUtilization": 47.2}
        }
      },
      "similarity_matches": [...],
      "artifacts": [...]
    }
  ],
  "pagination": {"total": 10, "page": 1, "page_size": 5, "total_pages": 2}
}
```

### Step 6 — Open the UI

- **Frontend**: http://localhost:3000 — 9-step onboarding wizard + dashboard
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Docs (ReDoc)**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/api/v1/health

---

## Demo Data — 10 Real-World Use Cases

The seed script (`backend/scripts/seed_demo_data.py`) loads 10 complete onboarding scenarios, each representing a different real-world pattern.

| App Code | App Name | Stack | Platform | Status | Use Case |
|----------|----------|-------|----------|--------|----------|
| **APP-1001** | payment-gateway-api | Java Spring Boot | AKS | ✅ completed | Full LGTM + JMX/OTEL exporters, 10% trace sampling, CHG raised |
| **APP-1002** | identity-auth-service | .NET | on-prem VM | 🔄 in_progress | Windows log paths, AMBER capacity (Loki 63.5%), OAuth2 service |
| **APP-1003** | product-catalogue-api | Node.js | AKS | ⏳ governance_review | GraphQL + RUM, 5% sampling, pending governance approval |
| **APP-1004** | recommendation-engine | Python | AKS | 👍 approved | ML custom metrics, Pyroscope profiling, AMBER Mimir (64.8%) |
| **APP-1005** | api-gateway-core | Go | AKS | ✅ completed | 1% trace sampling, all envs ready, goroutine leak alerts |
| **APP-1006** | inventory-management-service | Java Spring Boot | AKS | ✅ completed | PostgreSQL DB plugin, postgres-exporter, DB connection pool dashboards |
| **APP-1007** | invoice-pdf-generator | .NET | Azure Functions | 🔄 in_progress | Serverless cold start alerts, azure-monitor-exporter |
| **APP-1008** | customer-data-etl-pipeline | Python | GKE | 📝 draft | GCP Cloud Run, stackdriver-exporter, not yet submitted |
| **APP-1009** | customer-portal-bff | Node.js | AKS | ✅ completed | Full Faro + RUM, Core Web Vitals dashboards, LCP/CLS/FID alerts |
| **APP-1010** | partner-integration-api | .NET | APIM | 🚫 cancelled | RED capacity (Mimir 78.4%), 50-label cardinality violation, CR cancelled |

### Referencing Demo Data for a New Onboarding

Use the completed records (APP-1001, APP-1005, APP-1006, APP-1009) as reference patterns when creating your first onboarding.

**Example — query completed onboardings:**

```bash
curl -s "http://localhost:8000/api/v1/onboardings/?status=completed" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
    ts = item.get('telemetry_scope') or {}
    signals = list(ts.get('selected_signals', {}).keys())
    print(f\"{item['app_code']} | {item['app_name']:<35} | signals: {', '.join(signals)}\")
"
```

```
APP-1009 | customer-portal-bff                | signals: metrics, logs, traces, rum, faro, grafanaDashboards
APP-1001 | payment-gateway-api                | signals: metrics, logs, traces, grafanaDashboards
APP-1006 | inventory-management-service       | signals: metrics, logs, traces, grafanaDashboards
APP-1005 | api-gateway-core                   | signals: metrics, logs, traces
```

---

## Creating a New Onboarding

### Via API (curl)

**Step 1 — Create a draft onboarding:**

```bash
curl -s -X POST "http://localhost:8000/api/v1/onboardings/" \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "my-new-service",
    "app_code": "APP-2001",
    "portfolio": "Platform Engineering",
    "hosting_platform": "azure_aks",
    "tech_stack": "go",
    "alert_owner_email": "my-team@company.com",
    "alert_owner_team": "Platform SRE",
    "created_by": "john.doe@company.com",
    "notes": "New Go microservice for internal tooling"
  }' | python3 -m json.tool
```

```json
{
  "id": "abc12345-...",
  "app_code": "APP-2001",
  "status": "draft",
  "hosting_platform": "azure_aks",
  "tech_stack": "go",
  "created_at": "2026-04-02T10:00:00+00:00"
}
```

**Step 2 — Submit for processing:**

```bash
ONBOARDING_ID="abc12345-..."

curl -s -X POST "http://localhost:8000/api/v1/onboardings/$ONBOARDING_ID/submit" | python3 -m json.tool
```

```json
{
  "id": "abc12345-...",
  "status": "in_progress",
  "message": "Onboarding submitted successfully. Validation pipeline initiated.",
  "submitted_at": "2026-04-02T10:01:00+00:00"
}
```

**Step 3 — Filter onboardings by portfolio:**

```bash
curl -s "http://localhost:8000/api/v1/onboardings/?portfolio=Platform%20Engineering"
```

### Supported Enum Values

**hosting_platform:**
```
azure_aks  |  gke  |  eks  |  ecs  |  ec2  |  lambda  |  on_prem
```

**tech_stack:**
```
java_spring  |  java_quarkus  |  python_fastapi  |  python_django
nodejs_express  |  nodejs_nestjs  |  dotnet  |  go  |  rust
```

**status (lifecycle):**
```
draft → in_progress → capacity_check → similarity_search → governance_review
→ artifacts_generated → submitted → approved → provisioning → completed
             ↘ rejected  |  cancelled
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check with version info |
| `POST` | `/api/v1/onboardings/` | Create a new DRAFT onboarding |
| `GET` | `/api/v1/onboardings/` | List with `?status=&portfolio=&limit=&skip=` |
| `GET` | `/api/v1/onboardings/{id}` | Get full onboarding with all nested data |
| `PUT` | `/api/v1/onboardings/{id}` | Update (DRAFT only) |
| `DELETE` | `/api/v1/onboardings/{id}` | Delete (DRAFT only) |
| `POST` | `/api/v1/onboardings/{id}/submit` | Transition DRAFT → IN_PROGRESS |
| `GET` | `/api/v1/capacity/{id}/check` | Run capacity assessment |
| `GET` | `/api/v1/similarity/{id}/search` | Find similar historical onboardings |
| `GET` | `/api/v1/governance/{id}/evaluate` | Evaluate HARD/SOFT governance rules |
| `POST` | `/api/v1/artifacts/{id}/generate` | Generate CR + Jira artifacts |
| `GET` | `/api/v1/lookup/hosting-platforms` | Valid hosting platform values |
| `GET` | `/api/v1/lookup/tech-stacks` | Valid tech stack values |

Full interactive docs: **http://localhost:8000/docs**

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/          # REST endpoints (onboarding, capacity, similarity, ...)
│   │   ├── engine/          # Core engines
│   │   │   ├── capacity_engine.py     # GREEN/AMBER/RED threshold checks
│   │   │   ├── governance_engine.py   # HARD/SOFT rule evaluation
│   │   │   └── similarity_engine.py   # Hybrid similarity scoring
│   │   ├── mcp/             # MCP server clients (Grafana, Confluence, Jira, ServiceNow)
│   │   ├── models/          # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/         # Pydantic v2 request/response schemas
│   │   └── services/        # Business logic (artifact generation, notifications)
│   ├── alembic/versions/    # Database migrations (001_initial, 002_align_schema)
│   ├── scripts/
│   │   └── seed_demo_data.py  # 10 real-world demo scenarios
│   └── tests/
├── frontend/
│   └── src/
│       ├── features/
│       │   ├── onboarding/  # 9-step wizard components
│       │   ├── dashboard/   # Onboarding list + status view
│       │   └── admin/       # Platform admin panel
│       ├── components/      # Shared UI components
│       └── api/             # API client (Axios + React Query)
├── infra/
│   ├── helm/                # Helm chart for Kubernetes deployment
│   ├── k8s/                 # Raw Kubernetes manifests (HPA, PDB, Network Policies)
│   └── terraform/           # AKS + PostgreSQL Flexible Server on Azure
├── docs/
│   ├── ARCHITECTURE.md      # C4 context/container/component diagrams
│   └── API_CONTRACTS.md     # Full API contract reference
├── docker-compose.yml       # Full stack: db + backend + frontend
└── Makefile                 # Common dev commands
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 18 / 5.x |
| Build | Vite | 5.x |
| Styling | Tailwind CSS | 3.4 |
| State | Zustand | 4.x |
| Forms | React Hook Form + Zod | 7.x / 3.x |
| Backend | FastAPI | 0.115+ |
| ORM | SQLAlchemy (async) | 2.0.x |
| Validation | Pydantic v2 | 2.x |
| Database | PostgreSQL + pgvector | 16 |
| Migrations | Alembic | 1.13+ |
| Logging | structlog | 24.x |
| Metrics | prometheus-client | 0.21+ |
| Container | Docker + Docker Compose | 24+ |
| Orchestration | Kubernetes + Helm | 1.29+ / 3.x |
| IaC | Terraform | 1.8+ |

---

## Development Guide

### Backend Local Development

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Start DB only
docker compose up db -d

# Run with hot-reload
uvicorn app.main:app --reload --port 8000
```

### Frontend Local Development

```bash
cd frontend
npm install
npm run dev    # Starts at http://localhost:5173 with API proxy to :8000
```

### Running Tests

```bash
# Backend tests
cd backend && pytest tests/ -v

# Frontend tests
cd frontend && npm test
```

### Adding a Migration

```bash
cd backend
alembic revision --autogenerate -m "your_description"
alembic upgrade head
```

### Environment Variables

```bash
# backend/.env (copy from .env.example)
DATABASE_URL=postgresql+asyncpg://obsplatform:obsplatform@localhost:5432/obsplatform
CORS_ORIGINS_STR=http://localhost:3000,http://localhost:5173
APP_ENV=development
APP_DEBUG=true
LOG_LEVEL=INFO

# MCP integrations (optional for local dev)
GRAFANA_MCP_URL=http://localhost:8100
JIRA_MCP_URL=http://localhost:8102
SERVICENOW_MCP_URL=http://localhost:8103
CONFLUENCE_MCP_URL=http://localhost:8101
```

### Make Commands

```bash
make docker-up       # Start full Docker stack
make docker-down     # Stop stack
make migrate         # Run alembic upgrade head
make seed            # Seed demo data
make test            # Run all tests
make lint            # Lint backend + frontend
make logs            # Tail all container logs
```

---

## Governance Rules Reference

### HARD Rules (block submission)

| Rule | Description |
|------|-------------|
| GOV-001 | Alert owner must be the app team, not the platform team |
| GOV-002 | PROD environment must always be onboarded |
| GOV-003 | Cardinality limit — max 20 custom label dimensions |
| GOV-004 | Trace sampling rate must be between 0.001 and 1.0 |
| GOV-005 | Service name must match app_code pattern |
| GOV-006 | At minimum, metrics signal must be enabled |
| GOV-007 | SLO definition required for P1/P2 applications |

### SOFT Rules (warnings only)

| Rule | Description |
|------|-------------|
| GOV-101 | Recommend DEV environment onboarding |
| GOV-102 | Logs without structured JSON format lose search efficiency |
| GOV-103 | High sampling rate (>10%) may impact Tempo capacity |
| GOV-104 | Missing dashboard template for detected tech stack |
| GOV-105 | Alert rules not reviewed in last 90 days |

---

## Capacity Thresholds

| Signal | GREEN | AMBER | RED |
|--------|-------|-------|-----|
| Mimir (metrics) | ≤ 60% | 60–70% | > 70% |
| Loki (logs) | ≤ 60% | 60–70% | > 70% |
| Tempo (traces) | ≤ 65% | 65–75% | > 75% |
| Pyroscope (profiles) | ≤ 50% | 50–65% | > 65% |

RED capacity triggers automatic escalation notification to the platform team.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
