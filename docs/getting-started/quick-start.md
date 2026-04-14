# Quick Start

**Goal**: boot the full stack, seed 60 apps, populate coverage data, see the leadership cockpit light up. **Time**: under 3 minutes.

## Prerequisites

- Docker Desktop 4.x (or Docker Engine + Compose v2)
- 4 GB free RAM
- Ports `3000`, `5432`, `8000` available (remap in `docker-compose.yml` if not)

## 1. Clone and boot

```bash
git clone https://github.com/<your-org>/next-gen-o11y-platform.git
cd next-gen-o11y-platform
make docker-up
```

This brings up:

| Service | Port | Details |
|---|---|---|
| `db` | 5432 | Postgres 16 + pgvector |
| `backend` | 8000 | FastAPI on Uvicorn, auto-runs `alembic upgrade head` and seeds 11 integration cards |
| `frontend` | 3000 | Vite dev server with HMR |

First boot takes ~90 seconds (Docker builds + `npm install`). Subsequent boots are instant.

## 2. Verify the stack

```bash
curl http://localhost:8000/api/v1/health
# {"status":"healthy","version":"1.0.0","timestamp":"2026-04-14T..."}

curl http://localhost:8000/api/v1/integrations/ | jq 'length'
# 11
```

Open the browser:

- **http://localhost:3000/** — Dashboard
- **http://localhost:3000/admin/integrations** — 11 integration cards in 3 groups
- **http://localhost:3000/coverage** — empty until you run probes (step 3)

## 3. Populate data in 3 clicks

On the Integrations page:

1. Click **Run probe** on the **CMDB** card → 60 mock apps seeded into `application_metadata` across 3 portfolios (Digital Banking, Payments Rails, Wealth Platform)
2. Click **Run probe** on **Mimir**, **Loki**, **Tempo** (or any of the 6 coverage probes) → per-app onboarding rows upserted into `lgtm_app_coverage`
3. Hit **http://localhost:3000/coverage** and click **Refresh coverage** → leadership rollups rebuild, the trendline renders, portfolios sort worst-first

You should now see **63% any-coverage / 30% full-stack** with **Payments Rails at 50%** as the worst portfolio. The **gaps list** on tab 3 contains ~22 apps with zero onboarded signals — that's your Monday-morning deck.

## 4. Walk the onboarding wizard

Click **Start onboarding** on any gap app → the wizard deep-links with `?app_code=APP-XXXX`. Step 1 auto-fills from CMDB:

- `app_name`, `portfolio`, `alert_owner_email`, `alert_owner_team`
- `hosting_platform`, `tech_stack`
- "Sourced from CMDB" chip on the pre-filled fields

Step through to Step 9 — governance validates, capacity projects, similarity scores 5 matches, artifacts preview.

## 5. Shut down

```bash
make docker-down          # stop containers, keep the Postgres volume
make docker-clean         # stop + remove volumes (fresh start next time)
```

---

## Next

- [Architecture overview](../architecture/overview.md) — the 30k-ft diagram + data flow
- [Integrations](../features/integrations.md) — configure real Mimir / Loki / Jira / ServiceNow endpoints
- [Coverage & Adoption](../features/coverage.md) — how the leadership rollups work
- [Troubleshooting](../guides/troubleshooting.md) — CORS, port conflicts, Docker Desktop file sharing
