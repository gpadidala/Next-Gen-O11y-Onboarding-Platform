<h1 align="center">Next-Gen O11y Onboarding &amp; Coverage Platform</h1>

<p align="center"><em>The self-service portal + leadership cockpit for Grafana LGTM onboarding.<br>CMDB-driven · Runtime-configurable read paths · 100% rules-based · Zero LLMs.</em></p>

<p align="center">
  <img src="docs/assets/architecture.svg" alt="Architecture diagram — 6 layers: User · API · Domain · Integration · Data · Upstream Systems" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License">
  <img src="https://img.shields.io/badge/python-%3E%3D3.12-3776AB.svg?style=flat-square&logo=python&logoColor=white" alt="Python >=3.12">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009485.svg?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI 0.115">
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg?style=flat-square&logo=react&logoColor=white" alt="React 18">
  <img src="https://img.shields.io/badge/Postgres-16%20%2B%20pgvector-336791.svg?style=flat-square&logo=postgresql&logoColor=white" alt="Postgres 16">
  <img src="https://img.shields.io/badge/Grafana-LGTM-F46800.svg?style=flat-square&logo=grafana&logoColor=white" alt="Grafana LGTM">
  <img src="https://img.shields.io/badge/tests-67%20passing-brightgreen.svg?style=flat-square" alt="67 tests passing">
  <img src="https://img.shields.io/badge/LLMs-zero-000000.svg?style=flat-square" alt="Zero LLMs">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs welcome">
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="docs/getting-started/installation.md">Install</a> ·
  <a href="docs/architecture/overview.md">Architecture</a> ·
  <a href="docs/features/integrations.md">Integrations</a> ·
  <a href="docs/features/coverage.md">Coverage</a> ·
  <a href="docs/api/rest-reference.md">API Reference</a> ·
  <a href="docs/deployment/docker.md">Deploy</a>
</p>

---

## 🤔 Why this exists

Platform teams running Grafana LGTM at scale hit the same four walls every quarter:

1. **"Which apps are actually onboarded?"** — The CMDB says there are 600 services. Mimir sees series from 412 of them. Loki sees logs from 378. Nobody can tell the VP *which* 188 apps are dark.
2. **"How do I give app teams a self-service onramp?"** — Every new onboarding becomes a ticket, a Slack thread, and a 40-minute Zoom call about exporters. It doesn't scale.
3. **"How do I show leadership that this investment is working?"** — Without per-portfolio / per-VP rollups, you're stuck screenshotting Grafana panels into slides.
4. **"How do I know the LGTM stack is healthy right now?"** — Scrolling through 12 tabs of admin dashboards to find min/max/avg of ingestion rate is not observability.

**Before this platform**, teams built fragile Python scripts that queried Mimir directly, glued together a Streamlit dashboard, and hand-maintained a Confluence page about which apps had logs. Three sprints later the scripts broke, the dashboard rotted, and leadership asked for the gap list again.

**Next-Gen O11y is the maintained, opinionated alternative**: a FastAPI + React app with a **CMDB-backed source of truth**, **runtime-configurable read paths** to Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox / Grafana, **deterministic coverage reconciliation** with daily rollups, a **9-step self-service onboarding wizard**, a **leadership cockpit** with portfolio / VP / manager / architect views, and **zero LLMs** — every decision is a rule, a SQL join, or a heuristic matrix you can read and reason about.

Built for **SREs, Platform Engineers, and Observability Leads** who need to show "65% any-coverage, 30% full-stack, Payments Rails at 50%" to their VP on a Monday morning without pulling an all-nighter.

---

## ✨ Key Features

| | |
|---|---|
| 🎯 **Coverage & Adoption cockpit** | Reconciles CMDB ⋈ LGTM ingestion at 15-minute intervals. Three tabs: Leadership Overview, By Scope (Portfolio / VP / Manager / Architect / LOB), App-level Gaps |
| 🔌 **Runtime-configurable read paths** | 11 integration targets — CMDB, Mimir, Loki, Tempo, Pyroscope, Faro, Blackbox, Grafana, Jira, Confluence, ServiceNow — all editable from the Admin UI, persisted to local Postgres, effective on the next probe cycle |
| ▶️ **Run-probe button per target** | Click once, see categorised results inline: Mimir 35/60 apps (Digital Banking 60% · Payments Rails 50% · Wealth Platform 65%). No CLI, no kubectl |
| 📊 **Live LGTM stack capacity** | Per-component min / max / avg / current over a 1h window. Mimir / Loki / Tempo / Pyroscope. Colour-banded by utilisation (≥85% red, ≥70% amber) |
| 🧙 **9-step onboarding wizard** | Service identity → Platform → Telemetry scope → Technical config → Dependencies → Environment readiness → Intelligence view → Capacity status → Review & submit |
| 🛡️ **11 governance rules** | HARD rules (GOV-001..007) block bad submissions; SOFT rules (GOV-101..105) score & warn. Every rule is a plain-Python file you can read in 30 seconds |
| 🧮 **Deterministic capacity engine** | Per-tech-stack heuristic matrix + threshold bands. No ML, no "trust us, the model says ok" |
| 🔄 **Structured similarity scorer** | 5 seeded canonical patterns, additive weights (+30 tech / +25 platform / +20 portfolio / +5 per overlapping signal), normalised to [0,1]. pgvector stub included for future embedding upgrade |
| 📝 **Artifact generation** | CR + Epic + Stories per signal + Tasks + CTASK, Jinja2 templates, ready to push to Jira / ServiceNow via the configured integrations |
| ⏱️ **9 scheduled APScheduler jobs** | CMDB sync (6h), coverage probes (15m), Grafana RBAC pull (1h), nightly rollup rebuild at 02:30 UTC |
| 🎨 **Design-system UI** | Analytics Dashboard palette from [UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), Plus Jakarta Sans, brand-tinted shadows, theme-variable-driven so dark mode swap is one-line |
| 🏭 **Production hardening** | Structured logging (structlog JSON), Prometheus metrics endpoint, tenacity retry + circuit breaker on every MCP client, alembic migrations, 22 v2 integration tests |
| 🚫 **Zero LLMs, zero embeddings** | Every "intelligent" piece is a rule, a join, or a deterministic hash. Explicit guardrails in config, schema, and docstrings. Ship with confidence |

---

## 🚀 Quick Start

**One command, three containers, sixty apps, full pipeline.**

```bash
git clone https://github.com/<your-org>/next-gen-o11y-platform.git
cd next-gen-o11y-platform
make docker-up
```

The Makefile brings up a three-container stack:

| Container | Image | Port | Role |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | 5432 | Postgres with pgvector extension |
| `backend` | FastAPI 0.115 + Uvicorn | 8000 | API + scheduled jobs + migrations |
| `frontend` | Vite 5 + React 18 | 3000 | Dev server with HMR |

On first boot the backend:

1. Runs `alembic upgrade head` (4 migrations, 14 tables)
2. Seeds the 11 default integration cards keyed to env vars
3. Starts APScheduler with 9 cron jobs (CMDB sync, coverage probes, rollups)

Open **http://localhost:3000/admin/integrations**, click **Run probe** on the CMDB card (60 mock apps seeded), then Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox in turn. Within 10 seconds you'll have 360 coverage rows, 28 rollups, and a populated Coverage & Adoption cockpit at http://localhost:3000/coverage.

**Stop the stack:** `make docker-down`
**Tear down including volumes:** `make docker-clean`

> Hitting port conflicts? Edit [`docker-compose.yml`](docker-compose.yml) and remap 5432 / 8000 / 3000 to whatever's free. The CORS allowlist in the backend already covers 3000-3002 and 5173-5174.

---

## 🏗️ Architecture

```
                     ┌──────────────────────────────────────────┐
                     │              React 18 + Vite             │
                     │  /onboarding  /coverage  /capacity        │
                     │  /portfolios  /admin/integrations         │
                     └────────────────┬─────────────────────────┘
                                      │  axios · Plus Jakarta Sans
                                      ▼
                     ┌──────────────────────────────────────────┐
                     │           FastAPI 0.115 (Uvicorn)         │
                     │   /api/v1  · structlog · Prometheus       │
                     ├──────────────────────────────────────────┤
    ┌────────────┐   │  Routers: onboarding · capacity           │
    │ APScheduler│──▶│  · coverage · cmdb · integrations         │
    │  9 cron    │   │  · portfolios · grafana-usage · synthetics│
    │  jobs      │   │  · governance · similarity · artifacts    │
    └────────────┘   ├──────────────────────────────────────────┤
                     │  Engines: capacity · governance · coverage│
                     │  Services: cmdb_sync · integration_runner │
                     │             artifact · notification       │
                     ├──────────────────────────────────────────┤
                     │  Integration resolver → DB first,         │
                     │    env fallback → ResolvedIntegration     │
                     └────┬──────────┬──────────┬────────┬───────┘
                          │          │          │        │
                          ▼          ▼          ▼        ▼
                   ┌───────────┐ ┌───────┐ ┌───────┐ ┌─────────┐
                   │  Postgres │ │ Mimir │ │ Loki  │ │ Tempo   │
                   │  pg16 +   │ │ /api  │ │ /api  │ │ /api    │
                   │  pgvector │ └───────┘ └───────┘ └─────────┘
                   │           │
                   │ 14 tables │ ┌──────────┐ ┌──────┐ ┌─────────┐
                   │ ~60 apps  │ │Pyroscope │ │ Faro │ │ Grafana │
                   │ ~360 cov  │ │  /apps   │ │ /api │ │ /api    │
                   │ rows      │ └──────────┘ └──────┘ └─────────┘
                   └───────────┘
                                 ┌──────┐ ┌──────────┐ ┌──────────┐
                                 │ Jira │ │Confluence│ │ServiceNow│
                                 │ /rest│ │  /rest   │ │ /api/now │
                                 └──────┘ └──────────┘ └──────────┘
```

**Data flow (happy path)**:

1. Operator configures an integration card in `/admin/integrations` — base URL, token, `use_mock` toggle
2. `resolve_integration(db, target)` is called by every probe / sync / runner at invocation time — DB first, env fallback
3. The scheduled `cmdb_full_sync` job upserts `application_metadata` from the CMDB
4. 6 coverage probes (Mimir/Loki/Tempo/Pyroscope/Faro/Blackbox) upsert `lgtm_app_coverage` every 15 minutes
5. At 02:30 UTC, `coverage_rollup_build` rebuilds `coverage_rollup_snapshots` across global / portfolio / VP / manager / architect / LOB scopes
6. Leadership reads `/api/v1/coverage/summary` → hits the pre-aggregated snapshot table → sub-500ms response

See [docs/architecture/overview.md](docs/architecture/overview.md) for the detailed design and [docs/architecture/data-model.md](docs/architecture/data-model.md) for all 14 table schemas.

---

## 🧩 Core Modules

| Module | File | What it does |
|---|---|---|
| **Coverage engine** | [backend/app/engine/coverage_engine.py](backend/app/engine/coverage_engine.py) | Per-scope aggregation (global / portfolio / vp / manager / architect / lob) + rollup writer |
| **Capacity engine** | [backend/app/engine/capacity_engine.py](backend/app/engine/capacity_engine.py) | Tech-stack heuristic matrix, threshold bands (50/60/70), projection formula |
| **Governance engine** | [backend/app/engine/rules/](backend/app/engine/rules/) | 11 rules across capacity / environment / ownership / telemetry |
| **Similarity service** | [backend/app/services/similarity_service.py](backend/app/services/similarity_service.py) | 5 seeded patterns, additive weights, normalised scoring |
| **Artifact service** | [backend/app/services/artifact_service.py](backend/app/services/artifact_service.py) | CR + Epic + Stories per signal + Tasks + CTASK |
| **Integration resolver** | [backend/app/services/integration_service.py](backend/app/services/integration_service.py) | DB-first read-path config with env fallback, masked token serialisation, connectivity test |
| **Integration runner** | [backend/app/services/integration_runner.py](backend/app/services/integration_runner.py) | Dispatches Run button → per-target probe → categorised result |
| **Capacity stack service** | [backend/app/services/capacity_stack_service.py](backend/app/services/capacity_stack_service.py) | Live min/max/avg/current per LGTM component |
| **APScheduler jobs** | [backend/app/jobs/scheduler.py](backend/app/jobs/scheduler.py) | 9 cron jobs started from FastAPI lifespan |
| **Coverage probes** | [backend/app/services/coverage/probes.py](backend/app/services/coverage/probes.py) | Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox |

---

## 🔌 Integrations

11 read-path targets configurable at runtime, grouped into three semantic sections:

<table>
  <tr>
    <th>Source of truth</th>
    <th>Observability read path</th>
    <th>Work items &amp; ITSM</th>
  </tr>
  <tr>
    <td valign="top">
      🗄️ <b>CMDB</b><br>
      <sub>App catalog, VP hierarchy, owner emails</sub>
    </td>
    <td valign="top">
      📊 <b>Mimir</b> (metrics)<br>
      📜 <b>Loki</b> (logs)<br>
      🔍 <b>Tempo</b> (traces)<br>
      🔬 <b>Pyroscope</b> (profiles)<br>
      👁️ <b>Faro</b> (RUM)<br>
      🌐 <b>Blackbox</b> (synthetics)<br>
      👥 <b>Grafana</b> (RBAC)
    </td>
    <td valign="top">
      🐛 <b>Jira</b> (Epics, Stories, Tasks)<br>
      📖 <b>Confluence</b> (runbooks)<br>
      🎫 <b>ServiceNow</b> (change tickets)
    </td>
  </tr>
</table>

Every card has three actions:

- **Edit** — inline form: base URL, bearer token (show/hide), auth mode, `use_mock` toggle, `is_enabled` toggle
- **Test connection** — hits the target's health endpoint (`/api/v1/query?query=up` for Mimir, `/rest/api/2/serverInfo` for Jira, etc.), records result to the DB
- **Run probe** — runs the matching sync / probe / runner and returns a categorised result inline

See [docs/features/integrations.md](docs/features/integrations.md) for the full target matrix + field-level semantics.

---

## 📋 Feature Matrix

| Feature | Status | Docs |
|---|:---:|---|
| CMDB sync + 6h cron | ✅ | [features/cmdb-sync.md](docs/features/cmdb-sync.md) |
| 6 LGTM coverage probes (15m cron) | ✅ | [features/coverage.md](docs/features/coverage.md) |
| Grafana RBAC probe (1h cron) | ✅ | [features/grafana-usage.md](docs/features/grafana-usage.md) |
| Daily leadership rollup (02:30 UTC) | ✅ | [features/coverage.md](docs/features/coverage.md) |
| 9-step onboarding wizard | ✅ | [features/onboarding.md](docs/features/onboarding.md) |
| Capacity engine (heuristic matrix) | ✅ | [features/capacity.md](docs/features/capacity.md) |
| Governance engine (11 rules) | ✅ | [features/governance.md](docs/features/governance.md) |
| Similarity scorer (structured) | ✅ | [features/similarity.md](docs/features/similarity.md) |
| Artifact generation (CR/Epic/Story) | ✅ | [features/artifacts.md](docs/features/artifacts.md) |
| Retail Portfolios view (CMDB-backed) | ✅ | [features/portfolios.md](docs/features/portfolios.md) |
| Live LGTM capacity (min/max/avg/current) | ✅ | [features/capacity.md](docs/features/capacity.md) |
| Integrations admin (11 targets) | ✅ | [features/integrations.md](docs/features/integrations.md) |
| Jira / Confluence / ServiceNow runtime push | 🚧 | *Control plane done; submit-flow push is a follow-up* |
| Dark / Grafana / Midnight themes | ⚠️ partial | *Light theme uses new palette; dark themes still on v1 palette* |
| Real-mode LGTM HTTP transport | 🚧 | *Resolver + test path done; per-metric PromQL queries pending real endpoints* |

Legend: ✅ shipped · 🚧 in progress · ⚠️ partial

---

## 🧪 Tests

```bash
make test                    # full suite (backend + frontend)
make test-backend            # pytest backend/tests/
cd backend && python -m pytest tests/test_api/test_v2_pipeline.py -v
```

**Current baseline** (as of `main`):

- **67 passing** — includes **22 new v2 integration tests** exercising the full control plane (Integrations admin, CMDB sync, coverage probes, rollups, portfolios view, capacity stack, Grafana usage, per-target Run endpoints)
- **12 pre-existing v1 failures** in `test_onboarding.py` and `test_governance.py` — these are contract drift from before the current API surface shipped and are tracked separately. They do **not** exercise v2 code paths.
- **2 skipped** — optional flags-off tests.

The v2 tests use in-memory SQLite via `aiosqlite` for speed (~8s for the full v2 suite) and cover:

- Seed / list / update / test / run for all 11 integration targets
- Token masking (`auth_token` never appears in response bodies, `has_token` boolean only)
- CMDB sync produces exactly 60 apps across 3 portfolios
- Coverage refresh produces rollups with 0 < coverage_pct < 100 (sanity bound)
- Portfolios list returns 3 entries × 20 apps with binary M/L/T/P/R/E pillars
- Capacity stack returns 4 components with invariant `min ≤ avg ≤ max`
- Every per-target `/run` endpoint returns a valid `IntegrationRunResult`

See [docs/guides/testing.md](docs/guides/testing.md) for the full test map.

---

## 📚 Docs Tree

```
docs/
├── getting-started/
│   ├── installation.md       # Prereqs, clone, boot
│   ├── quick-start.md         # 60-second tour
│   └── first-run.md           # First login, first probe, first onboarding
├── architecture/
│   ├── overview.md            # 30k-ft system diagram + data flow
│   ├── data-model.md          # All 14 table schemas + relationships
│   └── integration-resolver.md # DB-first config with env fallback
├── features/
│   ├── coverage.md            # Coverage & Adoption cockpit
│   ├── integrations.md        # 11 targets, 3 groups, runtime config
│   ├── capacity.md            # Heuristic matrix + live stack view
│   ├── portfolios.md          # CMDB-backed Retail Portfolios
│   ├── onboarding.md          # 9-step wizard
│   ├── governance.md          # 11 rules catalog
│   ├── similarity.md          # Structured scorer
│   ├── artifacts.md           # CR / Epic / Story / Task / CTASK
│   ├── grafana-usage.md       # RBAC probe + adoption view
│   └── cmdb-sync.md           # Scheduled sync + field map
├── api/
│   └── rest-reference.md      # All 43+ /api/v1 endpoints
├── deployment/
│   └── docker.md              # Docker compose stack
└── guides/
    ├── testing.md             # pytest layout + v2 suite
    └── troubleshooting.md     # CORS, port conflicts, Docker Desktop file sharing
```

---

## 🛠️ Tech Stack

<table>
  <tr>
    <th>Backend</th>
    <th>Frontend</th>
    <th>Infra</th>
  </tr>
  <tr>
    <td valign="top">
      Python 3.12<br>
      FastAPI 0.115<br>
      SQLAlchemy 2.0 async<br>
      asyncpg + aiosqlite<br>
      Alembic 1.14<br>
      Pydantic v2<br>
      APScheduler 3.x<br>
      structlog 24<br>
      prometheus-client<br>
      tenacity · aiohttp<br>
      Jinja2
    </td>
    <td valign="top">
      React 18<br>
      TypeScript 5<br>
      Vite 5<br>
      React Router 6<br>
      Zustand 4<br>
      Tailwind CSS 3.4<br>
      lucide-react<br>
      axios 1.7<br>
      <b>Plus Jakarta Sans</b><br>
      <sub>(via UI UX Pro Max skill)</sub>
    </td>
    <td valign="top">
      Postgres 16<br>
      pgvector 0.3<br>
      Docker Compose<br>
      Uvicorn<br>
      Vitest + RTL<br>
      pytest-asyncio<br>
      ruff + mypy --strict<br>
      factory-boy<br>
      <sub>GitHub Actions-ready</sub>
    </td>
  </tr>
</table>

---

## 🔐 Security Notes

- **Tokens** for Jira / Confluence / ServiceNow / Grafana are stored in plaintext in `integration_configs.auth_token` for dev convenience. **Production deployments should front this with Vault or AWS Secrets Manager.** Tokens are *never* returned in API responses — the Pydantic read projection exposes only `has_token: bool`.
- **Auth** is a localStorage-Bearer stub — the axios interceptor attaches `Authorization: Bearer <token>` if `obs_auth_token` is set, and 401 redirects to `/login`. Wire an OIDC / SSO provider before exposing beyond a dev cluster.
- **CORS** default allowlist: `http://localhost:3000`, `3001`, `3002`, `5173`, `5174`. Override with the `CORS_ORIGINS_STR` env var.
- **PII** — the Grafana RBAC probe records team aggregates only (member_count, active_users_30d). Individual user activity is never stored.
- **Single writer** — `application_metadata` is only written by the `cmdb_full_sync` job. Every other module treats it as read-only. Enforced by convention, not DB grants (add row-level security before multi-tenant).

---

## 🚫 Zero-LLM Guardrails

This platform makes a hard commitment: **no LLMs, no embeddings, no prompt-based anything**. Every intelligent decision is a rule, a SQL join, or a deterministic hash. The commitments are enforced at three levels:

1. **Dependencies** — `pyproject.toml` pins no `openai`, `anthropic`, `langchain`, `transformers`, `sentence-transformers`. CI should fail on any PR that adds one.
2. **Config** — `OPENAI_API_KEY` exists in `Settings` as a placeholder for future embedding work, but no code imports it or uses it. Documented inline.
3. **Docstrings + docs** — Every engine module has a header calling out "deterministic — NO LLMs". The v2 prompt in [RECREATE_PROMPT_V2.md](RECREATE_PROMPT_V2.md) explicitly lists this as a strict guardrail.

When embedding / semantic features are needed (e.g. fuzzy similarity search for runbooks), the pgvector extension is already installed and the `similarity_matches` table has a vector column ready. The structured scorer stays as the default path.

---

## 🧭 Roadmap

- [x] v1 — Onboarding wizard + governance + capacity + artifact generation
- [x] **v2** — Coverage & Adoption cockpit + CMDB sync + 6 LGTM probes + Grafana RBAC + Portfolios CMDB wiring + Capacity live stack view + Integrations admin with 11 targets
- [ ] **v2.1** — Onboarding submit pipeline pushes artifacts to Jira / Confluence / ServiceNow via the integration resolver
- [ ] **v2.2** — Real-mode HTTP transport for coverage probes (PromQL, LogQL, TraceQL queries against real endpoints)
- [ ] **v2.3** — Dark / Grafana / Midnight theme parity with the new Analytics Dashboard palette
- [ ] **v3** — Optional pgvector-backed similarity search for runbooks (still no LLMs, embeddings only)
- [ ] **v3.1** — Helm chart + Kubernetes deployment guide

---

## 🙏 Credits

- **Design system** — [UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · Analytics Dashboard palette, Plus Jakarta Sans typography
- **Reference README structure** — [Bifröst](https://github.com/gpadidala/bifrost) · multi-transport MCP server for Grafana
- **LGTM stack** — [Grafana Labs](https://grafana.com) · Mimir, Loki, Tempo, Pyroscope, Faro, Blackbox exporter

---

## 📄 License

MIT. See [LICENSE](LICENSE).

---

<p align="center">
  <sub>Built for platform teams who are tired of screenshotting Grafana panels into Monday-morning slides.</sub>
</p>
