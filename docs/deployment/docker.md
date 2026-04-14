# Docker Compose Deployment

The project ships with a three-service `docker-compose.yml` that boots the full stack in one command. Use this for **dev**, **demo**, and **single-node staging**. For multi-node production, see the [Kubernetes guide](../../README.md#-roadmap) (v3.1 roadmap).

## Services

| Service | Image | Port (host:container) | Role |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | `5432:5432` | Postgres 16 with pgvector extension |
| `backend` | built from `./backend/Dockerfile` | `8000:8000` | FastAPI + Uvicorn + APScheduler |
| `frontend` | built from `./frontend/Dockerfile` (target `dev`) | `3000:3000` | Vite dev server with HMR |

All three run on the default compose network so the backend resolves `db` and the frontend resolves `backend` via DNS.

## Prerequisites

- Docker Desktop 4.x (macOS / Windows) or Docker Engine + Compose v2 (Linux)
- 4 GB free RAM
- Ports `3000`, `5432`, `8000` available — remap in `docker-compose.yml` if conflicting

## Boot

```bash
git clone https://github.com/<your-org>/next-gen-o11y-platform.git
cd next-gen-o11y-platform
make docker-up
```

First boot builds two images (backend ~250 MB, frontend ~300 MB with node_modules) and takes ~90 seconds. Subsequent boots are instant.

The Makefile target is a thin wrapper around `docker compose up --build -d`.

## What happens on first boot

1. **Postgres** initialises `obsplatform` database, creates `gen_random_uuid()` function
2. **Backend** container starts Uvicorn with `--reload`:
   - Waits for the `db` healthcheck (5s interval, 5 retries)
   - Runs `alembic upgrade head` (migrations 001 through 004)
   - FastAPI lifespan hook calls `seed_defaults_if_empty(session)` → inserts 11 integration cards
   - APScheduler starts with 9 cron jobs
3. **Frontend** container runs `npm install` then `vite --host 0.0.0.0 --port 3000`

You'll know it's ready when `curl http://localhost:8000/api/v1/health` returns `{"status":"healthy"}` and the Vite log shows `ready in 1234 ms`.

## Stop / reset

| Goal | Command |
|---|---|
| Stop containers, keep data | `make docker-down` |
| Stop + wipe Postgres volume + rebuild | `make docker-clean` |
| Tail combined logs | `make docker-logs` |
| Rebuild only backend | `docker compose up -d --build backend` |
| Rebuild only frontend | `docker compose up -d --build frontend` |

## Environment variables

Default values in `docker-compose.yml` → `services.backend.environment`:

```yaml
DATABASE_URL: postgresql+asyncpg://obsplatform:obsplatform@db:5432/obsplatform
CORS_ORIGINS_STR: http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://localhost:5174
LOG_LEVEL: INFO
APP_ENV: development
APP_DEBUG: "true"
```

All other env vars (Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox / Grafana / Jira / Confluence / ServiceNow) default to **empty strings**. Operators fill them in through the Integrations admin page at runtime — see [features/integrations.md](../features/integrations.md).

### Switching from mock to live LGTM

By default `PROBE_USE_MOCK=True` and every probe produces deterministic mock data, so the stack works end-to-end on a fresh clone with zero real upstreams.

To point at a real LGTM instance:

1. Open `/admin/integrations`
2. Click **Edit** on the Mimir card → paste your base URL → paste bearer token → flip **Mock** off → Save
3. Click **Test connection** → should return `ok` with the HTTP status line
4. Click **Run probe** → upserts real coverage rows into `lgtm_app_coverage`

Repeat for Loki, Tempo, etc. No backend restart required.

## Volumes

| Volume | Purpose | Retention |
|---|---|---|
| `pgdata` | Postgres data directory | Persists across `docker compose down`; wiped by `make docker-clean` |

No other volumes. The backend image has its code COPY'd in at build time (no host bind mount by default, so Docker Desktop file-sharing quirks don't affect it). The frontend uses the default Vite serving path and doesn't need a bind mount either.

## Health checks

- `db` healthcheck runs `pg_isready -U obsplatform` every 5 seconds, 5 retries
- `backend.depends_on.db.condition: service_healthy` ensures the backend only starts after Postgres is ready
- `GET /api/v1/health` returns `{"status":"healthy","version","timestamp"}` — wire this to your load balancer or Kubernetes liveness probe

## Port conflicts

If your machine already has something on 5432 / 8000 / 3000:

```yaml
# docker-compose.yml
services:
  db:
    ports:
      - "5433:5432"     # host 5433 → container 5432
  backend:
    ports:
      - "8001:8000"
  frontend:
    ports:
      - "3002:3000"
```

The backend's default `CORS_ORIGINS_STR` already covers `localhost:3000`, `3001`, `3002`, `5173`, `5174`. If you remap beyond that, add your port to the comma-separated list.

## Docker Desktop file-sharing

The backend Dockerfile copies `./backend/app` into `/app/app` at build time — **no bind mount is used**, so Docker Desktop's file-sharing list is irrelevant. If you want live hot-reload during development, uncomment the volume in `docker-compose.yml`:

```yaml
  backend:
    # volumes:
    #   - ./backend/app:/app/app
```

Then add your repo path to **Docker Desktop → Settings → Resources → File Sharing**.

## Production hardening checklist

Before taking this past staging:

- [ ] Change `SECRET_KEY` in `config.py` (loaded from env, default is a placeholder)
- [ ] Set `APP_ENV=production`, `APP_DEBUG=false`
- [ ] Rotate every default password (`POSTGRES_PASSWORD`, etc.)
- [ ] Front the backend with TLS (nginx / Traefik / AWS ALB)
- [ ] Store integration tokens in Vault or AWS Secrets Manager, not Postgres plaintext
- [ ] Configure real OIDC / SSO (replace the localStorage Bearer stub)
- [ ] Set up a Postgres backup strategy (WAL archiving or pg_dump cron)
- [ ] Replace the bundled Postgres with a managed service (RDS / Cloud SQL / Aurora)
- [ ] Wire `/metrics` to Prometheus scraping
- [ ] Ship `structlog` JSON logs to a log aggregator
- [ ] Enable row-level security if multi-tenant

---

**Next**: [Getting started](../getting-started/quick-start.md) · [Architecture](../architecture/overview.md) · [Troubleshooting](../guides/troubleshooting.md)
