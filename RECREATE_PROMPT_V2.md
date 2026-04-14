# Next-Gen O11y Onboarding & Coverage Platform — Advanced Prompt (v2)

> Paste everything below the `--- BEGIN PROMPT ---` line into another LLM (or hand it to an engineer) to regenerate this entire application from zero. This is a superset of v1 — it adds a **CMDB-driven source of truth**, live **LGTM coverage ingestion** (Mimir, Loki, Tempo, Pyroscope, Faro, Blackbox Synthetics, Grafana RBAC), and a new left-side module **"Coverage & Adoption"** that rolls up onboarding status per Portfolio → VP → Architect → App for leadership reporting. No LLMs, no embeddings, no AI — all intelligence is deterministic (rules, heuristics, SQL joins, scheduled pulls).

--- BEGIN PROMPT ---

You are building a production-grade web application called the **Next-Gen Observability Onboarding & Coverage Platform**. It has two faces:

1. **Self-service onboarding wizard** — walks application teams through onboarding a service to a Grafana LGTM stack (Loki, Grafana, Tempo, Mimir) plus Pyroscope, Faro RUM, and Blackbox synthetics.
2. **Coverage & Adoption cockpit** — reconciles the **Company CMDB** (source of truth for every app that *should* be observable) against what is **actually ingesting telemetry** in Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox, and surfaces the coverage gap per Portfolio, VP, Manager, Architect, and App. Includes Grafana RBAC usage analytics (active teams, active users).

Everything is **100% rules-based**. All intelligence comes from: a capacity heuristic matrix, a governance rule engine, a structured similarity scorer, template-driven artifact generation, and **deterministic reconciliation joins** between CMDB and LGTM ingestion metadata.

Build the full stack — backend, frontend, database, scheduled jobs, Docker compose — to the spec below. Do not deviate. Do not add LLM calls. Do not add features not listed.

---

## 1. STACK

**Backend**
- Python 3.12+, FastAPI 0.115.x, Uvicorn (with `--reload` in dev)
- SQLAlchemy 2.x async + asyncpg, Alembic migrations
- PostgreSQL 16 with the `pgvector` extension (image: `pgvector/pgvector:pg16`)
- Pydantic v2 + pydantic-settings for config
- structlog (JSON logs), prometheus-client (metrics), tenacity (retries), aiohttp (MCP HTTP clients), Jinja2 (artifact templates)
- **APScheduler 3.x** for periodic CMDB sync and LGTM coverage pulls
- Layout: `backend/app/{api/v1, engine, engine/rules, mcp, models, repositories, schemas, services, jobs, utils}` plus `main.py`, `config.py`, `database.py`

**Frontend**
- React 18 + TypeScript 5, Vite 5
- react-router-dom 6, react-hook-form 7 + Zod 3, zustand 4, axios 1.7, Tailwind CSS 3.4, lucide-react icons, **recharts** for coverage charts
- Vitest + React Testing Library
- Layout: `frontend/src/{api, components/{layout,shared,ui}, features/{onboarding/{steps,hooks,context}, dashboard, capacity, catalog, portfolios, coverage, admin}, hooks, store, types, utils}`

**Docker Compose** — three services on a shared network:
- `db`: pgvector/pgvector:pg16, env `POSTGRES_DB=obsplatform POSTGRES_USER=obsplatform POSTGRES_PASSWORD=obsplatform`, host port `5433:5432`, healthcheck `pg_isready -U obsplatform` every 5s, named volume `pgdata`
- `backend`: built from `./backend/Dockerfile`, env includes `DATABASE_URL`, `CORS_ORIGINS_STR`, all MCP URLs/tokens, `CMDB_*`, `GRAFANA_*`, port `8000:8000`, command `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`, depends_on db (healthy)
- `frontend`: built from `./frontend/Dockerfile` target `dev`, env `VITE_API_URL=http://backend:8000`, port `3002:3000`, depends_on backend

---

## 2. LEFT-NAV / SIDEBAR BREADCRUMBS

The left sidebar renders the following ordered sections. The **third entry (Coverage & Adoption) is new in v2**. Every icon is from `lucide-react`.

| Order | Label                   | Icon              | Route                | Description                                                             |
|-------|-------------------------|-------------------|----------------------|-------------------------------------------------------------------------|
| 1     | Dashboard               | `LayoutDashboard` | `/`                  | Recent onboardings, status counts, quick stats                          |
| 2     | Onboarding              | `Rocket`          | `/onboarding/new`    | 9-step wizard + list of in-flight requests                              |
| **3** | **Coverage & Adoption** | **`Target`**      | **`/coverage`**      | **CMDB vs LGTM reconciliation, per-Portfolio/VP rollups, leadership view** |
| 4     | Capacity                | `Gauge`           | `/capacity`          | LGTM stack utilisation                                                  |
| 5     | Service Catalog         | `BookOpen`        | `/catalog`           | CMDB-synced application catalog                                         |
| 6     | Portfolios              | `Briefcase`       | `/portfolios`        | Portfolio → VP → App drill-down                                         |
| 7     | Grafana Usage           | `Users`           | `/grafana-usage`     | RBAC: active teams, active users, org usage                             |
| 8     | Admin                   | `Settings`        | `/admin`             | Rule catalog, MCP health, CMDB sync trigger, audit logs                 |

`AppShell.tsx` renders the sidebar; highlight active route; collapse on < 1024 px.

---

## 3. EXTENDED DOMAIN MODEL (SQLAlchemy)

All tables use UUID PKs (`gen_random_uuid()`), `created_at`/`updated_at` timestamptz with server defaults. Cascade deletes from parent to child relationships.

### 3.1 v1 tables — carry over unchanged
`onboarding_requests`, `telemetry_scopes`, `technical_configs`, `environment_readiness`, `capacity_assessments`, `similarity_matches`, `artifacts`, `audit_logs`. Enum values from v1 are preserved verbatim.

### 3.2 `application_metadata` — CMDB-synced catalog (EXTENDED)

Represents the source of truth. One row per application registered in the company CMDB.

| Column                  | Type                 | Notes                                                             |
|-------------------------|----------------------|-------------------------------------------------------------------|
| `id`                    | UUID PK              |                                                                   |
| `app_name`              | String(255)          |                                                                   |
| `app_code`              | String(64) unique    | Indexed                                                           |
| `portfolio`             | String(128)          | Indexed                                                           |
| `sub_portfolio`         | String(128) null     |                                                                   |
| `description`           | Text                 |                                                                   |
| `business_criticality`  | String(32)           | `tier_1 \| tier_2 \| tier_3 \| tier_4`                            |
| `hosting_platform`      | String(64)           |                                                                   |
| `tech_stack`            | String(64)           |                                                                   |
| **`vp_name`**           | **String(255)**      | **VP owning the portfolio**                                       |
| **`vp_email`**          | **String(255)**      |                                                                   |
| **`director_name`**     | **String(255)**      |                                                                   |
| **`manager_name`**      | **String(255)**      |                                                                   |
| **`manager_email`**     | **String(255)**      |                                                                   |
| **`architect_name`**    | **String(255)**      |                                                                   |
| **`architect_email`**   | **String(255)**      |                                                                   |
| **`product_owner`**     | **String(255)**      |                                                                   |
| **`lob`**               | **String(128)**      | **Line of business**                                              |
| **`region`**            | **String(64)**       | `na \| emea \| apac \| latam`                                     |
| `owner_name` / `owner_email` / `owner_team` | String(255) | On-call team                                       |
| `cost_center`           | String(64)           |                                                                   |
| `environments`          | JSON                 | `["dev","qa","qa2","staging","prod"]`                             |
| `tags`                  | JSON                 |                                                                   |
| `cmdb_id`               | String(128)          |                                                                   |
| `cmdb_sync_source`      | String(64)           | `servicenow-cmdb \| bmc-helix \| manual`                          |
| `cmdb_last_synced_at`   | timestamptz          |                                                                   |
| `retired`               | Boolean              | default false                                                     |
| `latest_onboarding_id`  | UUID null            | Last submitted onboarding                                         |

### 3.3 `lgtm_app_coverage` — NEW, per-app ingestion snapshot

One row per `(app_code, signal)` pair, refreshed by the scheduled coverage job. This is the **materialized join** between CMDB and what LGTM is actually receiving.

| Column                     | Type              | Notes                                                               |
|----------------------------|-------------------|---------------------------------------------------------------------|
| `id`                       | UUID PK           |                                                                     |
| `app_code`                 | String(64)        | Indexed. FK-like soft reference to `application_metadata.app_code`  |
| `signal`                   | String(32)        | `metrics \| logs \| traces \| profiles \| faro \| synthetics`       |
| `is_onboarded`             | Boolean           | True if signal actively ingesting                                   |
| `tenant_id`                | String(128) null  | Grafana/Mimir tenant                                                |
| **`active_series_count`**  | **BigInt null**   | **Mimir** — only for `metrics`                                      |
| **`log_volume_bytes_per_day`** | **BigInt null** | **Loki** — only for `logs`                                         |
| **`span_rate_per_sec`**    | **Float null**    | **Tempo** — only for `traces`                                       |
| **`profile_rate_per_sec`** | **Float null**    | **Pyroscope** — only for `profiles`                                 |
| **`faro_sessions_per_day`**| **BigInt null**   | **Faro RUM** — only for `faro`                                      |
| **`synthetics_url_count`** | **Integer null**  | **Blackbox exporter** — only for `synthetics`                       |
| `last_sample_at`           | timestamptz null  | Most recent timestamp observed on this signal                       |
| `source_probe`             | String(128)       | How we determined it (`mimir_api \| loki_api \| tempo_api \| ...`)  |
| `collected_at`             | timestamptz       | When this snapshot was taken                                        |

Unique index on `(app_code, signal)`. Composite index on `(signal, is_onboarded)` for the coverage rollups.

### 3.4 `synthetic_urls` — NEW, per-URL blackbox registry

| Column            | Type          | Notes                                                             |
|-------------------|---------------|-------------------------------------------------------------------|
| `id`              | UUID PK       |                                                                   |
| `app_code`        | String(64)    | Indexed                                                           |
| `url`             | String(1024)  |                                                                   |
| `module`          | String(64)    | `http_2xx \| http_post_2xx \| tcp_connect \| icmp \| dns`         |
| `region`          | String(64)    | Where the probe runs                                              |
| `interval_seconds`| Integer       |                                                                   |
| `is_active`       | Boolean       |                                                                   |
| `last_success_at` | timestamptz   |                                                                   |
| `last_probe_at`   | timestamptz   |                                                                   |

Unique on `(app_code, url, module)`.

### 3.5 `grafana_rbac_usage` — NEW, Grafana RBAC activity

One row per team. User-level aggregates only (never PII bodies).

| Column                | Type          | Notes                                                       |
|-----------------------|---------------|-------------------------------------------------------------|
| `id`                  | UUID PK       |                                                             |
| `org_id`              | Integer       |                                                             |
| `team_id`             | Integer       |                                                             |
| `team_name`           | String(255)   |                                                             |
| `mapped_app_code`     | String(64) null | Best-effort mapping to `application_metadata.app_code`    |
| `mapped_portfolio`    | String(128) null |                                                          |
| `member_count`        | Integer       |                                                             |
| `active_users_30d`    | Integer       | Distinct users who signed in within 30 days                 |
| `dashboard_count`     | Integer       |                                                             |
| `dashboard_views_30d` | BigInt        |                                                             |
| `last_activity_at`    | timestamptz   |                                                             |
| `collected_at`        | timestamptz   |                                                             |

Unique on `(org_id, team_id)`.

### 3.6 `coverage_rollup_snapshots` — NEW, leadership rollup cache

Pre-aggregated daily snapshots for fast leadership dashboards.

| Column                     | Type          | Notes                                                            |
|----------------------------|---------------|------------------------------------------------------------------|
| `id`                       | UUID PK       |                                                                  |
| `snapshot_date`            | Date          | Indexed                                                          |
| `scope_type`               | String(32)    | `global \| portfolio \| vp \| manager \| architect \| lob`       |
| `scope_key`                | String(255)   | Portfolio name / VP email / etc. `__all__` when `scope_type=global` |
| `total_apps`               | Integer       | From CMDB                                                        |
| `apps_onboarded_any`       | Integer       | At least one signal                                              |
| `apps_onboarded_metrics`   | Integer       |                                                                  |
| `apps_onboarded_logs`      | Integer       |                                                                  |
| `apps_onboarded_traces`    | Integer       |                                                                  |
| `apps_onboarded_profiles`  | Integer       |                                                                  |
| `apps_onboarded_faro`      | Integer       |                                                                  |
| `apps_onboarded_synthetics`| Integer       |                                                                  |
| `coverage_pct_any`         | Float         | `100 * apps_onboarded_any / total_apps`                          |
| `coverage_pct_full_stack`  | Float         | Apps with metrics+logs+traces                                    |

Unique on `(snapshot_date, scope_type, scope_key)`.

### 3.7 `cmdb_sync_runs` — NEW, sync audit

| Column                | Type          | Notes                                         |
|-----------------------|---------------|-----------------------------------------------|
| `id`                  | UUID PK       |                                               |
| `started_at`          | timestamptz   |                                               |
| `finished_at`         | timestamptz   |                                               |
| `status`              | String(32)    | `running \| success \| partial \| failed`     |
| `apps_upserted`       | Integer       |                                               |
| `apps_retired`        | Integer       |                                               |
| `error_message`       | Text null     |                                               |

---

## 4. PYDANTIC SCHEMAS — ADDITIONS

All v1 schemas carry over. Add these in `backend/app/schemas/coverage.py`, `cmdb.py`, `grafana_usage.py`, `synthetics.py`.

**CMDB**
- `CMDBAppRecord`: mirror of `application_metadata` read-only projection
- `CMDBSyncRunResponse`: `{id, status, started_at, finished_at, apps_upserted, apps_retired, error_message}`
- `CMDBSyncTriggerResponse`: `{run_id, status, message}`

**Coverage**
- `SignalCoverage`: `{signal, total_apps, onboarded, coverage_pct, volume_metric_name, volume_metric_value}`
- `ScopeCoverage`: `{scope_type, scope_key, total_apps, apps_onboarded_any, coverage_pct_any, coverage_pct_full_stack, per_signal: SignalCoverage[]}`
- `PortfolioCoverage`: `{portfolio, vp_name, vp_email, total_apps, onboarded, gap, coverage_pct_any, per_signal: SignalCoverage[]}`
- `VpCoverage`: `{vp_name, vp_email, portfolios: string[], total_apps, onboarded, coverage_pct_any, per_signal: SignalCoverage[]}`
- `LeadershipCoverageResponse`: `{snapshot_date, global: ScopeCoverage, portfolios: PortfolioCoverage[], vps: VpCoverage[]}`
- `AppCoverageDetail`: `{app_code, app_name, portfolio, vp_name, manager_name, architect_name, per_signal: LgtmAppCoverageRecord[], onboarding_status: string}`

**Grafana RBAC**
- `GrafanaTeamUsage`: 1:1 with `grafana_rbac_usage` row
- `GrafanaUsageSummary`: `{total_orgs, total_teams, active_teams_30d, total_users, active_users_30d, total_dashboards, dashboards_viewed_30d, team_adoption_pct}`

**Synthetics**
- `SyntheticUrlRecord`: 1:1 with `synthetic_urls`
- `SyntheticsSummary`: `{total_urls, active_urls, apps_covered, success_rate_30d}`

---

## 5. API ENDPOINTS — ADDITIONS (all under `/api/v1`)

All v1 endpoints carry over. Add these.

**CMDB**
- `POST /cmdb/sync` → 202 `CMDBSyncTriggerResponse` — fires async background task (APScheduler job) to pull full CMDB snapshot
- `GET /cmdb/sync/runs` → `CMDBSyncRunResponse[]` — most recent 50
- `GET /cmdb/apps` → paginated `CMDBAppRecord[]` — filters `portfolio?`, `vp_email?`, `architect_email?`, `retired?` default false, `has_onboarding?`

**Coverage**
- `GET /coverage/summary` → `LeadershipCoverageResponse` — latest snapshot, global + portfolios + VPs
- `GET /coverage/by-portfolio` → `PortfolioCoverage[]` — sorted by `coverage_pct_any asc` (worst first)
- `GET /coverage/by-vp` → `VpCoverage[]`
- `GET /coverage/by-manager` → `ScopeCoverage[]`
- `GET /coverage/by-architect` → `ScopeCoverage[]`
- `GET /coverage/gaps` → `CMDBAppRecord[]` — apps in CMDB with **zero** onboarded signals; filterable by portfolio/vp
- `GET /coverage/app/{app_code}` → `AppCoverageDetail` — per-signal drill-down for a single app
- `POST /coverage/refresh` → 202 `{run_id}` — force re-pull from Mimir/Loki/Tempo/Pyroscope/Faro/Blackbox and rebuild `coverage_rollup_snapshots`
- `GET /coverage/trends` → `{snapshot_date, coverage_pct_any, coverage_pct_full_stack}[]` — last 90 days, for leadership trendline

**Grafana Usage (RBAC)**
- `GET /grafana-usage/summary` → `GrafanaUsageSummary`
- `GET /grafana-usage/teams` → paginated `GrafanaTeamUsage[]` — filters `org_id?`, `portfolio?`, `active_only?`
- `GET /grafana-usage/coverage` → `{total_cmdb_apps, apps_with_mapped_team, team_coverage_pct, unmapped_app_codes: string[]}`

**Synthetics (Blackbox)**
- `GET /synthetics/urls` → paginated `SyntheticUrlRecord[]` — filters `app_code?`, `module?`, `is_active?`
- `GET /synthetics/summary` → `SyntheticsSummary`

Mount all under `/api/v1` via `app.main`.

---

## 6. DATA SOURCE INTEGRATIONS

### 6.1 Company CMDB client — `backend/app/mcp/cmdb_client.py`

HTTP client with placeholder base URL (`CMDB_BASE_URL`) and bearer token (`CMDB_API_TOKEN` — SecretStr). Must expose:

- `list_applications(cursor=None, page_size=500) -> AsyncIterator[CMDBAppRecord]` — cursor-paginated
- `get_application(app_code) -> CMDBAppRecord | None`
- `list_portfolios() -> list[str]`
- `list_vps() -> list[{name, email, portfolios: string[]}]`
- `health_check() -> bool` — hits `/cmdb/v1/health`

All fields in §3.2 (`vp_name`, `vp_email`, `director_name`, `manager_name`, `manager_email`, `architect_name`, `architect_email`, `product_owner`, `lob`, `region`, `business_criticality`) must be populated from the CMDB response. Where the company CMDB schema is not known, **use placeholder field-name constants** in a module-level dict `CMDB_FIELD_MAP` so an integrator can re-map without touching logic:

```python
CMDB_FIELD_MAP = {
    "app_code": "u_application_code",          # PLACEHOLDER
    "app_name": "u_application_name",          # PLACEHOLDER
    "portfolio": "u_portfolio",                # PLACEHOLDER
    "vp_name": "u_vice_president",             # PLACEHOLDER
    "vp_email": "u_vp_email",                  # PLACEHOLDER
    "manager_name": "u_manager_display_name",  # PLACEHOLDER
    "architect_name": "u_solution_architect",  # PLACEHOLDER
    # ...etc — every field in §3.2
}
```

Retry, circuit-breaker, and logging rules follow the `BaseMCPClient` pattern from v1.

### 6.2 Mimir coverage probe — `backend/app/services/coverage/mimir_probe.py`

Calls the Grafana/Mimir admin API via `GrafanaMCPClient`:
- Pull the list of tenants, then for each tenant run `sum by (app_code) (count({__name__=~".+"}))` or equivalent label-values query on the `app_code` label to enumerate apps and their **active series count**.
- Per app_code: upsert `lgtm_app_coverage` where `signal='metrics'`, `is_onboarded=true`, `active_series_count=<value>`, `last_sample_at=now()`.

If the `app_code` label is absent, the probe must try these fallbacks in order: `service`, `service_name`, `k8s_deployment_name`. The tried label is stored in `source_probe`.

### 6.3 Loki coverage probe — `backend/app/services/coverage/loki_probe.py`

Uses Loki's `/loki/api/v1/label/app_code/values`, then per app_code runs `sum by (app_code) (rate({app_code="..."}[1d]))` to get **daily bytes ingested**. Upsert with `signal='logs'`, `log_volume_bytes_per_day=<bytes>`.

### 6.4 Tempo coverage probe — `backend/app/services/coverage/tempo_probe.py`

Uses Tempo's TraceQL `{ resource.service.name=~".+" }` aggregations or the `/api/search/tag/app_code/values` endpoint. Per app_code: **span rate per second** from the last 1h window. Upsert with `signal='traces'`, `span_rate_per_sec=<value>`.

### 6.5 Pyroscope coverage probe — `backend/app/services/coverage/pyroscope_probe.py`

Uses Pyroscope `/pyroscope/api/apps` (or `/api/apps` depending on version) to list onboarded apps and `/pyroscope/api/ingested` for ingestion rate. Upsert with `signal='profiles'`, `profile_rate_per_sec=<value>`.

### 6.6 Faro coverage probe — `backend/app/services/coverage/faro_probe.py`

Uses Grafana Faro collector API (or, when unavailable, Loki-backed Faro logs). Per app_code: **sessions per day**. Upsert with `signal='faro'`, `faro_sessions_per_day=<value>`.

### 6.7 Blackbox (synthetics) probe — `backend/app/services/coverage/blackbox_probe.py`

Reads `blackbox_exporter` targets from configured `BLACKBOX_CONFIG_URL` (file or HTTP). For each target:
- Parse `app_code` from labels (fallback: tag/annotation `app_code`).
- Upsert `synthetic_urls` rows.
- Per app_code aggregate: upsert `lgtm_app_coverage` with `signal='synthetics'`, `synthetics_url_count=<count>`.

### 6.8 Grafana RBAC probe — `backend/app/services/coverage/grafana_rbac_probe.py`

Uses the Grafana HTTP API with `GRAFANA_API_TOKEN`:
- `GET /api/orgs` → org list
- `GET /api/teams/search?perpage=1000` → teams
- `GET /api/teams/{id}/members` → member counts
- `GET /api/users/search?perpage=1000` → last-seen timestamps (for `active_users_30d`)
- `GET /api/search?type=dash-db&limit=5000` → dashboard inventory
- For `dashboard_views_30d` call `/api/usage-insights/user` or query `grafana_frontend_*` metrics in Mimir — pick whichever is configured (placeholder: `GRAFANA_USAGE_SOURCE = "api" | "mimir"`).

Mapping of `team_name` → `app_code` is via the optional config dict `GRAFANA_TEAM_APP_MAP_URL` (JSON file), or heuristic `team_name == app_code`. Store the mapping in `grafana_rbac_usage.mapped_app_code`.

---

## 7. SCHEDULED JOBS — `backend/app/jobs/`

Use APScheduler `AsyncIOScheduler` started from `app.main` on FastAPI startup. All jobs write an entry to `cmdb_sync_runs` (or an analog table) on start + finish.

| Job ID                        | Cron               | Module                          | Action                                                      |
|-------------------------------|--------------------|---------------------------------|-------------------------------------------------------------|
| `cmdb_full_sync`              | `0 */6 * * *`      | `jobs/cmdb_sync.py`             | Pull CMDB → upsert `application_metadata`, mark retired     |
| `coverage_metrics_pull`       | `*/15 * * * *`     | `jobs/coverage_metrics.py`      | Run Mimir probe, upsert `lgtm_app_coverage`                 |
| `coverage_logs_pull`          | `*/15 * * * *`     | `jobs/coverage_logs.py`         | Loki probe                                                  |
| `coverage_traces_pull`        | `*/15 * * * *`     | `jobs/coverage_traces.py`       | Tempo probe                                                 |
| `coverage_profiles_pull`      | `*/30 * * * *`     | `jobs/coverage_profiles.py`     | Pyroscope probe                                             |
| `coverage_faro_pull`          | `0 * * * *`        | `jobs/coverage_faro.py`         | Faro probe                                                  |
| `coverage_synthetics_pull`    | `0 */2 * * *`      | `jobs/coverage_synthetics.py`   | Blackbox probe                                              |
| `grafana_rbac_pull`           | `0 * * * *`        | `jobs/grafana_rbac.py`          | Grafana usage probe                                         |
| `coverage_rollup_build`       | `30 2 * * *`       | `jobs/coverage_rollup.py`       | Rebuild `coverage_rollup_snapshots` for scopes global/portfolio/vp/manager/architect/lob |

Rollup builder logic (SQL-backed):
```sql
-- global
INSERT INTO coverage_rollup_snapshots(snapshot_date, scope_type, scope_key, total_apps,
  apps_onboarded_any, apps_onboarded_metrics, ...)
SELECT CURRENT_DATE, 'global', '__all__', COUNT(*) AS total_apps,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM lgtm_app_coverage c
    WHERE c.app_code = am.app_code AND c.is_onboarded = true
  )) AS apps_onboarded_any,
  ...
FROM application_metadata am WHERE am.retired = false;
-- per portfolio: GROUP BY am.portfolio
-- per vp: GROUP BY am.vp_email
-- ...
```

All coverage percentages are computed at rollup time, never at read time.

---

## 8. COVERAGE ENGINE — `backend/app/engine/coverage_engine.py`

Deterministic reconciliation. Exposes:

- `compute_app_status(app_code) -> dict` — returns `{any, metrics, logs, traces, profiles, faro, synthetics}` booleans + `onboarding_status` from `onboarding_requests.status` (latest)
- `compute_portfolio_rollup(portfolio) -> PortfolioCoverage`
- `compute_vp_rollup(vp_email) -> VpCoverage`
- `list_gaps(filter) -> CMDBAppRecord[]` — returns CMDB apps with `is_onboarded=false` for every signal

**Business rules (hard-coded):**
- An app is considered **onboarded (any)** if at least one row in `lgtm_app_coverage` for that `app_code` has `is_onboarded=true` AND `last_sample_at > now() - 24h`.
- An app is considered **full-stack observable** if it has `is_onboarded=true` AND fresh samples for **all three** of `metrics`, `logs`, `traces`.
- Coverage % is always `100 * onboarded / total_apps` where `total_apps` excludes retired apps.
- VP rollup aggregates across every portfolio the VP owns per `application_metadata.vp_email`.

---

## 9. COVERAGE & ADOPTION FRONTEND (`features/coverage/`)

Route `/coverage` renders a 3-tab page.

### Tab 1 — Leadership Overview (default)
- Four large stat cards: **Total Apps**, **Onboarded (any signal)**, **Full-stack**, **Gap** (numeric + % trend arrow vs 7 days ago).
- Trendline chart (recharts `LineChart`) of `coverage_pct_any` vs `coverage_pct_full_stack` across the last 90 days (calls `/coverage/trends`).
- Signal-wise stacked bar: for each of `metrics/logs/traces/profiles/faro/synthetics`, the onboarded count vs gap.
- Region / LOB pivot (two side-by-side donut charts).
- "Export to PDF" button that prints the leadership view to a printable stylesheet (no backend export — browser print).

### Tab 2 — By Portfolio / VP / Manager / Architect
- Left-rail toggle between **Portfolio / VP / Manager / Architect / LOB** scope.
- Sortable `DataTable`: scope name, total apps, onboarded, gap, coverage %, per-signal mini-bars, "drill-in" action → opens modal with the list of apps in that scope + their per-signal status.
- Worst 10 highlighted at the top with red row stripe.

### Tab 3 — App-level Gap List
- Filter bar: portfolio, VP, criticality, region, signal (checkboxes).
- `DataTable` of apps that are **NOT** onboarded for at least one selected signal.
- Row-level action buttons: **"Start Onboarding"** (deep-link to `/onboarding/new?app_code=XYZ` and pre-fills Step 1 from CMDB), **"View CMDB Record"** (opens modal).

All tabs pull from:
- `GET /coverage/summary`
- `GET /coverage/by-portfolio`, `/coverage/by-vp`, `/coverage/by-manager`, `/coverage/by-architect`
- `GET /coverage/gaps`
- `GET /coverage/trends`

Loading state uses `Skeleton`. Errors show `Alert` with retry.

### State (`store/coverageStore.ts`)
```ts
type CoverageStore = {
  scope: 'portfolio' | 'vp' | 'manager' | 'architect' | 'lob';
  selectedSignals: Signal[];
  summary: LeadershipCoverageResponse | null;
  gaps: CMDBAppRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
};
```

---

## 10. GRAFANA USAGE FRONTEND (`features/grafana-usage/`)

Route `/grafana-usage`. Shows:
- Stat cards: **Total Orgs**, **Total Teams**, **Active Teams (30d)**, **Total Users**, **Active Users (30d)**, **Team Adoption %** (= `active_teams_30d / total_teams`).
- Usage coverage card: `app_code`-mapped teams vs CMDB apps → **"Grafana Adoption by App"** bar.
- Team list `DataTable`: team, mapped app_code, mapped portfolio, members, active 30d, dashboards, views 30d, last activity. Sort by any column.
- Filters: org, portfolio, active-only toggle.

Backend calls: `/grafana-usage/summary`, `/grafana-usage/teams`, `/grafana-usage/coverage`.

---

## 11. PRE-POPULATION FROM CMDB ON ONBOARDING

When a user navigates to `/onboarding/new?app_code=XYZ`:
- Frontend calls `GET /cmdb/apps?app_code=XYZ` and pre-fills Step 1 (`app_name`, `portfolio`, `alert_owner_email` from `owner_email`, `alert_owner_team` from `owner_team`) and Step 2 (`hosting_platform`, `tech_stack`) if present.
- Fields remain editable. A small `"sourced from CMDB"` chip appears next to pre-filled fields.

---

## 12. v1 CAPACITY / GOVERNANCE / SIMILARITY / ARTIFACTS — CARRY OVER UNCHANGED

All engines from v1 stay exactly as specified:

- Capacity Engine — tech-stack heuristic matrix, threshold matrix (0-50 GREEN / 50-60 GREEN-MONITOR / 60-70 AMBER / >70 RED), per-signal projection formula.
- Governance Rule Engine — 11 rules (GOV-001 through GOV-007 HARD, GOV-101/102/103/105 SOFT), scoring (100 − 20·HARD − 5·SOFT), pass iff zero HARD.
- Similarity Service — 5 seeded patterns, additive weights (+30 tech, +25 platform, +20 portfolio, +5 per overlapping signal), `search_strategy="keyword_fallback"`.
- Artifact Service — CR × 1, Epic × 1, Story per signal (with 6 subtasks each), Task × 2 (capacity approval, change approval), plus CTASK for ServiceNow multi-step. Jinja2 for bodies. Signal → summary template table preserved verbatim.

All v1 MCP clients (Grafana, Jira, ServiceNow, Confluence) preserved.

---

## 13. CONFIG — `backend/app/config.py` (EXTENDED)

Pydantic settings. All fields from v1 **plus**:

- `CMDB_BASE_URL: AnyHttpUrl`
- `CMDB_API_TOKEN: SecretStr`
- `CMDB_SYNC_PAGE_SIZE: int = 500`
- `CMDB_SYNC_ENABLED: bool = True`
- `GRAFANA_BASE_URL: AnyHttpUrl`
- `GRAFANA_API_TOKEN: SecretStr`
- `GRAFANA_USAGE_SOURCE: Literal["api","mimir"] = "api"`
- `GRAFANA_TEAM_APP_MAP_URL: AnyHttpUrl | None = None`
- `MIMIR_BASE_URL`, `LOKI_BASE_URL`, `TEMPO_BASE_URL`, `PYROSCOPE_BASE_URL`, `FARO_BASE_URL` (all `AnyHttpUrl`)
- `BLACKBOX_CONFIG_URL: AnyHttpUrl | FilePath`
- `COVERAGE_FRESHNESS_HOURS: int = 24` — defines "recent sample" threshold
- `SCHEDULER_ENABLED: bool = True`

All secrets loaded via pydantic-settings with `.env` fallback. Never log SecretStr values.

---

## 14. END-TO-END FLOWS — updated

**Coverage pull cycle (every 15 minutes for M/L/T)**
1. APScheduler fires `coverage_metrics_pull`
2. Job calls `MimirProbe.run()` → iterates tenants, aggregates active series per `app_code` label
3. Each app_code row upserted into `lgtm_app_coverage`
4. Rollup is NOT rebuilt on every pull — only at 02:30 daily via `coverage_rollup_build`
5. A `/coverage/refresh` endpoint exists for on-demand rebuild (triggered from the Admin UI)

**Leadership report load**
1. User opens `/coverage`
2. Frontend calls `GET /coverage/summary` → backend reads the latest `coverage_rollup_snapshots` row where `snapshot_date = CURRENT_DATE`
3. If no row exists for today (cron hasn't run yet), backend synthesises one on-the-fly from `application_metadata` ⨝ `lgtm_app_coverage` and caches it

**Onboarding submission pipeline** — v1 flow with one addition:
- After step (i) of v1 submission pipeline (Slack notification), enqueue a short `coverage_refresh_for(app_code)` task so the app appears in the next leadership view within minutes.

---

## 15. NON-FUNCTIONAL REQUIREMENTS (additions)

- Every scheduled job emits a Prometheus counter `obs_onboarding_job_runs_total{job_id,status}` and a histogram `obs_onboarding_job_duration_seconds{job_id}`.
- CMDB and coverage probe calls emit `obs_onboarding_mcp_request_total{target,result}`.
- All new endpoints covered by pytest-asyncio integration tests with faked MCP clients producing deterministic fixtures. Goal ≥ 80% line coverage on new modules.
- Every coverage API must respond under 500 ms p95 for 5k apps (read from the pre-aggregated snapshot table).

---

## 16. STRICT GUARDRAILS — DO NOT

- **Do not** add LLMs, embeddings, langchain, openai, anthropic, or any AI library. Coverage reconciliation is joins and rollups only.
- **Do not** expose PII (individual user activity) — only aggregates (counts, 30-day activity booleans).
- **Do not** invent CMDB field names. Route all field access through `CMDB_FIELD_MAP`.
- **Do not** bypass the rollup cache for leadership reads on paths known to be hot.
- **Do not** mutate `application_metadata` outside the `cmdb_full_sync` job (single writer).
- **Do not** persist Grafana auth tokens or CMDB secrets in the database.
- **Do not** add real auth / RBAC on the app itself — keep the v1 localStorage Bearer stub.

---

## 17. DELIVERABLES CHECKLIST (v2)

When done, the project must contain v1 deliverables **plus**:

- Six new tables: `lgtm_app_coverage`, `synthetic_urls`, `grafana_rbac_usage`, `coverage_rollup_snapshots`, `cmdb_sync_runs`, plus the extended `application_metadata` columns (vp_name, vp_email, manager_name, architect_name, product_owner, lob, region, director_name, …)
- Seven new probe/service modules: `mimir_probe`, `loki_probe`, `tempo_probe`, `pyroscope_probe`, `faro_probe`, `blackbox_probe`, `grafana_rbac_probe`
- Nine new scheduled jobs wired into APScheduler
- New routers: `cmdb.py`, `coverage.py`, `grafana_usage.py`, `synthetics.py`
- New frontend features: `coverage/` (3 tabs), `grafana-usage/`, CMDB pre-fill in `onboarding/new`
- Sidebar reordered to include **Coverage & Adoption** as the 3rd entry; **Grafana Usage** as the 7th
- README section "Coverage & Adoption" explaining the CMDB → LGTM reconciliation model and the daily rollup schedule

**Acceptance test v2:**
1. `make docker-up`
2. Hit `POST /cmdb/sync` — returns 202 and `cmdb_sync_runs` gets a `success` row within 60s (mock CMDB serving 3 portfolios × 20 apps each)
3. Hit `POST /coverage/refresh` — probes run, `lgtm_app_coverage` fills with ~120 rows (3 signals per app for ~40 apps), `coverage_rollup_snapshots` has 1 global row + 3 portfolio rows + 3 VP rows
4. Open `/coverage` — Leadership tab shows 60 total apps, ~40 onboarded (any), ~67% coverage, trendline rendered
5. Switch to "By Portfolio" tab — worst portfolio shown at top with red stripe
6. Switch to "App-level Gap" tab — list contains the ~20 apps with zero onboarded signals; "Start Onboarding" button deep-links to the wizard with Step 1 pre-filled from CMDB
7. Open `/grafana-usage` — summary + team table rendered from mock Grafana API
8. Submit a new onboarding for a gap app — within the next scheduler tick, `lgtm_app_coverage` updates, coverage % increases on refresh

--- END PROMPT ---
