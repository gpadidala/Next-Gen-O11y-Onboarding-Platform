# Recreate-From-Scratch Prompt — Next-Gen O11y Onboarding Platform

> Paste everything below the `--- BEGIN PROMPT ---` line into another LLM (or hand it to an engineer) to regenerate this entire application from zero. It is self-contained: no source code references, just the spec.

--- BEGIN PROMPT ---

You are building a production-grade web application called the **Next-Gen Observability Onboarding Platform**. It is a self-service portal that walks application teams through onboarding their service to a Grafana LGTM (Loki, Grafana, Tempo, Mimir) observability stack. The platform is **100% rules-based — no LLMs, no embeddings, no AI**. All intelligence comes from deterministic engines: a capacity heuristic matrix, a governance rule engine, a structured similarity scorer, and template-driven artifact generation.

Build the full stack — backend, frontend, database, Docker compose — to the spec below. Do not deviate. Do not add LLM calls. Do not add features not listed.

---

## 1. STACK

**Backend**
- Python 3.12+, FastAPI 0.115.x, Uvicorn (with `--reload` in dev)
- SQLAlchemy 2.x async + asyncpg, Alembic migrations
- PostgreSQL 16 with the `pgvector` extension (image: `pgvector/pgvector:pg16`)
- Pydantic v2 + pydantic-settings for config
- structlog (JSON logs), prometheus-client (metrics), tenacity (retries), aiohttp (MCP HTTP clients), Jinja2 (artifact templates)
- Layout: `backend/app/{api/v1, engine, engine/rules, mcp, models, repositories, schemas, services, utils}` plus `main.py`, `config.py`, `database.py`

**Frontend**
- React 18 + TypeScript 5, Vite 5
- react-router-dom 6, react-hook-form 7 + Zod 3, zustand 4, axios 1.7, Tailwind CSS 3.4, lucide-react icons
- Vitest + React Testing Library
- Layout: `frontend/src/{api, components/{layout,shared,ui}, features/{onboarding/{steps,hooks,context}, dashboard, capacity, catalog, portfolios, admin}, hooks, store, types, utils}`

**Docker Compose** — three services on a shared network:
- `db`: pgvector/pgvector:pg16, env `POSTGRES_DB=obsplatform POSTGRES_USER=obsplatform POSTGRES_PASSWORD=obsplatform`, host port `5433:5432`, healthcheck `pg_isready -U obsplatform` every 5s, named volume `pgdata`
- `backend`: built from `./backend/Dockerfile`, env `DATABASE_URL=postgresql+asyncpg://obsplatform:obsplatform@db:5432/obsplatform`, `CORS_ORIGINS_STR=http://localhost:3000,http://localhost:5173`, port `8000:8000`, command `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`, depends_on db (healthy)
- `frontend`: built from `./frontend/Dockerfile` target `dev`, env `VITE_API_URL=http://backend:8000`, port `3002:3000`, depends_on backend

---

## 2. DOMAIN MODEL (SQLAlchemy)

All tables use UUID PKs (`gen_random_uuid()`), `created_at`/`updated_at` timestamptz with server defaults. Cascade deletes from parent to child relationships.

### `application_metadata` — CMDB-synced reference catalog
- `app_name` String(255), `app_code` String(64) **unique indexed**, `portfolio` String(128) indexed, `sub_portfolio` String(128) nullable
- `description` Text, `business_criticality` String(32), `hosting_platform` String(64), `tech_stack` String(64)
- `owner_name` / `owner_email` / `owner_team` String(255), `cost_center` String(64)
- `environments` JSON, `tags` JSON, `cmdb_id` String(128), `cmdb_sync_source` String(64)
- `retired` Boolean default false, `latest_onboarding_id` UUID (no FK)

### `onboarding_requests` — central aggregate
- `app_name` String, `app_code` String unique indexed, `portfolio` String(128) indexed
- `hosting_platform` Enum `HostingPlatform`, `tech_stack` Enum `TechStack`
- `status` Enum `OnboardingStatus` indexed
- `alert_owner_email` String(255), `alert_owner_team` String(255), `created_by` String(255)
- `submitted_at` timestamptz nullable, `notes` Text nullable
- Relationships (selectin, cascade delete): `telemetry_scope` (1:1), `technical_config` (1:1), `capacity_assessment` (1:1), `similarity_matches` (1:N ordered by rank), `artifacts` (1:N), `environment_readiness` (1:N)

### `telemetry_scopes`
- `onboarding_request_id` UUID FK unique cascade
- `selected_signals` JSON — shape `{metrics:{enabled,details}, logs:{enabled,details}, traces:{enabled,details}, profiling:{enabled,details}}`
- `environment_matrix` JSON

### `technical_configs`
- `onboarding_request_id` UUID FK unique cascade
- `config_data` JSON, `generated_by` String(64), `config_version` String(32)

### `environment_readiness`
- `onboarding_request_id` UUID FK cascade
- `environment` String(64) — one of `dev|qa|qa2|staging|prod`
- `signal` String(64), `ready` Boolean default false, `notes` String(512)

### `capacity_assessments`
- `onboarding_request_id` UUID FK unique cascade
- `overall_status` Enum `CapacityStatus`, `signal_results` JSON, `recommendations` Text
- `can_proceed` Boolean default false, `escalation_required` Boolean default false
- `assessed_at` timestamptz server default

### `similarity_matches`
- `onboarding_request_id` UUID FK cascade
- `rank` Integer (1–5), `matched_app_name` String, `matched_app_code` String
- `score` Float in [0,1], `match_reasons` JSON (string array)
- `exporters`, `dashboards`, `alert_rules`, `playbooks`, `pitfalls` — each JSON arrays

### `artifacts`
- `onboarding_request_id` UUID FK cascade
- `artifact_type` Enum `ArtifactType`
- `external_id` String(128), `external_url` String(512)
- `payload` JSON (full CR/Jira body)
- `status` Enum `ArtifactStatus`, `error_message` Text

### `audit_logs` — append-only
- `entity_type` String(64) indexed, `entity_id` UUID indexed (composite with entity_type)
- `action` String(64), `actor` String(255) indexed, `changes` JSON
- `timestamp` timestamptz server default indexed

### Enums
- `HostingPlatform`: `eks, ecs, ec2, lambda, on_prem, azure_aks, gke`
- `TechStack`: `java_spring, java_quarkus, python_fastapi, python_django, nodejs_express, nodejs_nestjs, dotnet, go, rust`
- `OnboardingStatus`: `draft, in_progress, capacity_check, similarity_search, governance_review, artifacts_generated, submitted, approved, provisioning, completed, rejected, cancelled`
- `TelemetrySignal`: `metrics, logs, traces, profiling`
- `CapacityStatus`: `green, yellow, red, unknown` (use `green/yellow/red` — the engine sometimes calls yellow "amber"; treat as same value)
- `ArtifactType`: `cr, epic, story, task, ctask`
- `ArtifactStatus`: `draft, preview, submitted, synced, failed`
- `GovernanceSeverity`: `hard, soft, info`

---

## 3. PYDANTIC SCHEMAS (API contracts)

Use Pydantic v2. All schemas live in `backend/app/schemas/`. Mirror the field shapes below exactly — frontend and tests depend on these.

**Onboarding**
- `OnboardingCreate`: `app_name`, `app_code` (regex `^[A-Za-z0-9_-]+$`), `portfolio`, `hosting_platform`, `tech_stack`, `alert_owner_email` (EmailStr), `alert_owner_team`, `created_by`, `notes?`
- `OnboardingUpdate`: all of the above, all optional
- `OnboardingSubmit`: full payload — `telemetry_scope: TelemetryScopeData`, `technical_config: TechnicalConfigData`, `dependencies: DependencySpec[]`, `environment_readiness: EnvironmentReadinessData[]`
- `OnboardingResponse`: full entity + nested relationships (`telemetry_scope`, `technical_config`, `capacity_assessment`, `similarity_matches`, `artifacts`, `environment_readiness`)
- `OnboardingListResponse`: `items`, `total`, `page`, `page_size`, `total_pages`

**Capacity**
- `CapacityCheckRequest`: `onboarding_request_id`, `hosting_platform`, `signals` (min 1), `estimated_series_count`, `estimated_log_gb_per_day`, `estimated_spans_per_second`, `metadata`
- `SignalCapacity`: `signal`, `status` (CapacityStatus), `current_utilization_pct`, `projected_utilization_pct`, `headroom_pct`, `message`, `details`
- `CapacityCheckResponse`: `onboarding_request_id`, `overall_status`, `signals` (dict by signal name → SignalCapacity), `recommendations`, `can_proceed`, `escalation_required`

**Similarity**
- `SimilaritySearchRequest`: `onboarding_request_id`, `app_name`, `app_code`, `hosting_platform`, `tech_stack`, `signals`, `portfolio?`, `max_results` (1–20, default 5)
- `SimilarityMatchResult`: `rank`, `app_name`, `app_code`, `score`, `match_reasons`, `exporters`, `dashboards`, `alert_rules`, `playbooks`, `pitfalls`
- `SimilaritySearchResponse`: `onboarding_request_id`, `matches`, `total_matches`, `search_strategy` (one of `vector|hybrid|keyword_fallback`)

**Artifacts**
- `CRPayload`: `title`, `description`, `risk_level`, `change_type`, `implementation_plan`, `rollback_plan`, `test_plan`, `assigned_group`, `scheduled_start`, `scheduled_end`
- `EpicPayload`: `summary`, `description`, `project_key`, `labels`, `priority`, `components`, `custom_fields`
- `StoryPayload`: `summary`, `description`, `project_key`, `epic_key?`, `story_points` (1–21), `labels`, `priority`, `acceptance_criteria`, `assignee`
- `ArtifactGenerateRequest`: `onboarding_request_id`, `artifact_types` (min 1), `options`
- `ArtifactPreviewResponse`: `artifact_type`, `payload`, `rendered_summary`, `warnings`
- `ArtifactResponse`: full entity (id, onboarding_request_id, artifact_type, external_id, external_url, payload, status, error_message)

**Governance**
- `GovernanceValidateRequest`: `onboarding_request_id`, `dry_run: bool`
- `Violation`: `rule_id`, `severity`, `message`, `field` (dot-path), `suggestion`, `metadata`
- `GovernanceResult`: `onboarding_request_id`, `passed`, `score` (0–100), `hard_violations`, `soft_violations`, `info_notices`, `evaluated_rules_count`

---

## 4. API ENDPOINTS — all under `/api/v1`

**Health**
- `GET /health` → `{status, version, timestamp}` — always 200
- `GET /ready` → `{status, db: bool, mcp: {grafana, confluence, jira}}` — 503 if degraded

**Onboarding**
- `POST /onboardings/` ← `OnboardingCreate` → 201 `OnboardingResponse` | 409 duplicate `app_code`
- `GET /onboardings/` → `OnboardingListResponse` — query `skip` (0), `limit` (1–100, default 20), `status?`, `portfolio?`
- `GET /onboardings/{id}` → 200 `OnboardingResponse` | 404
- `PUT /onboardings/{id}` ← `OnboardingUpdate` → 200 | 400 (only draft is editable) | 404
- `DELETE /onboardings/{id}` → 204 | 400 (only draft is deletable) | 404
- `POST /onboardings/{id}/submit` → `{id, status, message, submitted_at}` — transitions `draft → in_progress` and triggers the validation pipeline

**Capacity**
- `POST /capacity/check` ← `CapacityCheckRequest` → `CapacityCheckResponse`
- `GET /capacity/status` → `{overall_status, signals, last_refreshed}` — current LGTM utilisation snapshot (no app projection)

**Similarity**
- `POST /similarity/search` ← `SimilaritySearchRequest` → `SimilaritySearchResponse`

**Artifacts**
- `POST /artifacts/generate` ← `ArtifactGenerateRequest` → 201 `ArtifactResponse[]` — persists + syncs externally
- `POST /artifacts/preview` ← `ArtifactGenerateRequest` → `ArtifactPreviewResponse[]` — no persistence, no external sync
- `GET /artifacts/{onboarding_id}` → `ArtifactResponse[]` — ordered by created_at

**Governance**
- `POST /governance/validate` ← `GovernanceValidateRequest` → `GovernanceResult`
- `GET /governance/rules` → `[{rule_id, description, severity}]` — public catalog

**Lookup**
- `GET /lookup/portfolios` → `{portfolios: string[]}` — distinct sorted
- `GET /lookup/tech-stacks` → `{items: [{value, label}]}`
- `GET /lookup/platforms` → `{items: [{value, label}]}`

Mount the v1 router with prefix `/api/v1` from `app.main`.

---

## 5. ENGINES (deterministic — NO LLMs)

### 5a. Capacity Engine — `backend/app/engine/capacity_engine.py`

**Signal → backend**: `metrics → Mimir (series)`, `logs → Loki (MB/s)`, `traces → Tempo (spans/sec)`, `profiles → Pyroscope (profiles/sec)`

**Tech-stack heuristic matrix** — per-instance estimated load:

| Tech Stack    | Metrics (series) | Logs (MB/s) | Traces (spans/s) | Profiles (pr/s) |
|---------------|-----------------:|------------:|-----------------:|----------------:|
| JAVA_SPRING   | 500              | 2.0         | 100              | 10              |
| DOTNET        | 300              | 1.0         | 50               | 5               |
| NODEJS        | 200              | 1.5         | 150              | 8               |
| PYTHON        | 150              | 1.0         | 80               | 6               |
| GO            | 100              | 0.5         | 200              | 12              |
| DEFAULT       | 250              | 1.0         | 100              | 8               |

**Threshold matrix** on projected post-onboarding utilisation:

| Range  | Status | Decision        | Action                                    |
|--------|--------|-----------------|-------------------------------------------|
| 0–50%  | GREEN  | ALLOW           | Proceed                                   |
| 50–60% | GREEN  | ALLOW_MONITOR   | Allow + add to watch list                 |
| 60–70% | AMBER  | ALLOW_NOTIFY    | Allow + notify platform team              |
| >70%   | RED    | BLOCK           | Reject; require platform team escalation  |

**Projection formula**:
`projected_pct = (current_used + estimated_new_load × headroom_factor) / total_capacity × 100`
- default `headroom_factor = 1.2`
- if MCP unavailable, fallback total capacities: metrics 100k series, logs 50 MB/s, traces 10k spans/s, profiles 1k pr/s

**Overall**: worst across signals (RED > AMBER > GREEN). Set `can_proceed = (overall != RED)` and `escalation_required = (overall == RED)`.

### 5b. Governance Rule Engine — `backend/app/engine/rules/`

Auto-discover and evaluate rules sequentially. Each rule returns `Violation | None`. Group rules in files: `capacity_rules.py`, `environment_rules.py`, `ownership_rules.py`, `telemetry_rules.py`. Base class in `base.py` (`Rule` with `rule_id`, `severity`, `description`, `evaluate(ctx) -> Violation | None`).

**Rules to implement** (all 11):

| ID       | Name                       | Severity | Check                                                                                              |
|----------|----------------------------|----------|----------------------------------------------------------------------------------------------------|
| GOV-001  | DevTelemetryExists         | HARD     | DEV environment must be enabled for every selected signal                                          |
| GOV-002  | QATelemetryExists          | HARD     | QA environment must be enabled for every selected signal                                           |
| GOV-003  | AlertOwnerRequired         | HARD     | `alert_owner_email` non-empty / non-whitespace                                                     |
| GOV-004  | AlertOwnerNotObsTeam       | HARD     | Reject emails matching `obs-team@`, `observability@`, `platform-monitoring@` (case-insensitive)    |
| GOV-005  | CapacityNotRed             | HARD     | `capacity_assessment.overall_status` must not be RED                                               |
| GOV-006  | AppCodeValid               | HARD     | `app_code` must match `APP-\d{4,6}`                                                                |
| GOV-007  | AtLeastOneTelemetrySignal  | HARD     | At least one signal selected                                                                       |
| GOV-101  | CapacityAmberWarning       | SOFT     | Warn if any signal is AMBER                                                                        |
| GOV-102  | HighCardinalityRisk        | SOFT     | Warn if `estimated_series_count > 10000`; suggest recording rules / label reduction                |
| GOV-103  | NoTracesSelected           | SOFT     | Suggest enabling traces if not selected                                                            |
| GOV-105  | MissingQA2Environment      | SOFT     | Recommend optional QA2 gate                                                                        |

**Scoring**: start at 100. `-20` per HARD, `-5` per SOFT, `-0` per INFO. `passed = (len(hard_violations) == 0)`. Final score `max(0, 100 - penalties)`.

### 5c. Similarity Service — `backend/app/services/similarity_service.py`

**No vector search.** Pre-seed 5 canonical historical patterns (in-process Python list), each with: `app_name`, `app_code`, `tech_stack`, `hosting_platform`, `portfolio`, `signals`, `exporters[]`, `dashboards[]`, `alert_rules[]`, `playbooks[]`, `pitfalls[]`. Pick representative apps spanning Java/Spring on EKS, Node/Express on ECS, Python/FastAPI on Lambda, Go on EKS, .NET on Azure AKS.

**Scoring weights** (additive):
- same `tech_stack`: **+30**
- same `hosting_platform`: **+25**
- same `portfolio`: **+20**
- per overlapping telemetry signal: **+5**

Rank desc, normalize to `[0,1]` against the max possible score, return top `max_results` (default 5). Populate `match_reasons` with human-readable strings explaining each contribution. Set `search_strategy = "keyword_fallback"`.

There is a placeholder comment indicating pgvector embeddings are *intended* but not implemented — leave that as a structured-scoring path only.

### 5d. Artifact Service — `backend/app/services/artifact_service.py`

Template-based, Jinja2 loaded but artifacts are built via Python f-strings/dict construction. No LLM.

**Artifacts generated per submission:**

1. **CR (ServiceNow)** — exactly 1 per request
   - Fields: `title`, `description`, `risk_level` (low/medium/high), `change_type` (standard/normal/emergency), `implementation_plan`, `rollback_plan`, `test_plan`, approvers (`platform-lead`, `capacity-owner`), `scheduled_date` = T+7 days
   - Scope: signals, components (`alloy-agent`, `otel-collector`, `grafana-dashboards`), `infrastructure_impact`

2. **EPIC (Jira)** — exactly 1 per request
   - `summary`, `description`, `project = OBS`, `labels = [obs-onboarding, <tech_stack>, <platform>]`, components

3. **STORY (Jira)** — 1 per selected telemetry signal
   - Each story has 6 subtasks: `agent-config`, `exporter-deployment`, `dashboard-creation`, `alert-rule-setup`, `validation`, `playbook-documentation`
   - Signal → summary template:
     - `metrics` → "Configure metrics collection for {app_name}"
     - `logs` → "Set up log ingestion pipeline for {app_name}"
     - `traces` → "Enable distributed tracing for {app_name}"
     - `grafanaDashboards` → "Create Grafana dashboards for {app_name}"
     - `profiles` → "Enable continuous profiling for {app_name}"
     - `rum` → "Set up Real User Monitoring for {app_name}"
     - `faro` → "Configure Grafana Faro for {app_name}"
     - `dbPlugins` → "Deploy database monitoring plugins for {app_name}"

4. **TASK (Jira)** — 2 per request: capacity approval (assignee `capacity-owner`), change approval (assignee `change-board`)

5. **CTASK (ServiceNow)** — same shape as TASK, used for ServiceNow's multi-step approval flow

**Summary formats**:
- CR: `Observability Onboarding: {app_name} ({app_code}) for {tech_stack} on {platform}`
- Epic: `Observability Onboarding: {app_name}`
- Story: `[{SIGNAL}] {template.format(app_name=app_name)}`
- Task: `Capacity approval for {app_name}` / `Change approval for {app_name}`

`generate` persists + syncs externally via MCP clients. `preview` returns rendered payloads only (no persistence, no external calls).

---

## 6. MCP CLIENTS — `backend/app/mcp/`

Build a `BaseMCPClient` (`base_client.py`) with: aiohttp ClientSession lifecycle (connect/close/async context manager), tenacity retry (exponential backoff, max 3 attempts), a per-instance circuit breaker that opens after 5 consecutive failures with 60s recovery, structured logging (NEVER log secrets), and a `MCPClientError` exception with a `retryable` flag.

### GrafanaMCPClient (`grafana_client.py`)
- `get_mimir_usage(tenant_id) -> {active_series, ingestion_rate_samples_per_sec, series_limit, ingestion_limit}`
- `get_loki_usage(tenant_id) -> {ingestion_rate_bytes_per_sec, stream_count, ingestion_limit, stream_limit}`
- `get_tempo_usage(tenant_id) -> {spans_per_sec, storage_growth_rate, spans_limit}`
- `get_pyroscope_usage(tenant_id) -> {series_count, ingestion_rate, series_limit}`
- `query_prometheus(query, time) -> {result_type, samples, raw}`
- `get_retention_config(signal) -> {signal, retention_period, compaction_enabled, raw}`
- `get_ingestion_limits(tenant_id) -> {<signal>_*: ...}`
- `health_check() -> bool` — hits `/api/health`

### JiraMCPClient (`jira_client.py`)
- `create_epic(payload)`, `create_story(payload)`, `create_task(payload)`, `create_subtask(payload)` → `JiraIssue {issue_id, key, self_url, summary, issue_type, status, project_key, assignee, priority, labels, parent_key}`
- `link_issues(inward_key, outward_key, link_type="Blocks")`
- `transition_issue(issue_key, transition_id)`
- `get_issue(issue_key) -> JiraIssue`
- `health_check() -> bool` — hits `/rest/api/2/serverInfo`

### ServiceNowMCPClient (`servicenow_client.py`)
- `create_change_request(payload) -> ChangeRequest {sys_id, number, short_description, state, approval, category, priority, assigned_to, opened_by, start_date, end_date, risk, impact}`
- `get_change_request(cr_id)`
- `add_work_notes(cr_id, notes)`
- `submit_for_approval(cr_id)` — sets `approval=requested`, `state=-4` (authorize)
- `get_approval_status(cr_id) -> str`
- `health_check() -> bool` — hits `/api/now/table/change_request?sysparm_limit=1`

### ConfluenceMCPClient (`confluence_client.py`)
- Used only for fetching playbook links / knowledge base patterns. Implement a `search(cql)` method and `health_check()`. Not on the critical path — similarity service falls back to seeded patterns.

All clients are construction-injected via FastAPI dependencies in `app/api/deps.py` so tests can replace them with fakes.

---

## 7. FRONTEND ONBOARDING WIZARD — 9 steps

Wizard lives at `/onboarding/new`. State held in an `OnboardingContext` provider plus `zustand` `onboardingStore`. Use `react-hook-form` + Zod validation per step. A `Stepper` component (in `components/ui`) renders the progress bar.

| Step | Title                  | Fields collected                                                                                                       | Backend call when leaving step |
|------|------------------------|------------------------------------------------------------------------------------------------------------------------|--------------------------------|
| 1    | App Identification     | `app_name`, `app_code` (regex), `portfolio`, `alert_owner_email`, `alert_owner_team`, `created_by`                     | none — local state             |
| 2    | Platform & Technology  | `hosting_platform` (from `/lookup/platforms`), `tech_stack` (from `/lookup/tech-stacks`)                               | none                           |
| 3    | Telemetry Scope        | per-signal `{enabled, details}` for `metrics`, `logs`, `traces`, `profiling`                                           | none                           |
| 4    | Technical Configuration| dynamic form per tech_stack + platform (exporters, scrape configs, pipeline defs)                                       | none                           |
| 5    | Dependencies           | upstream / downstream dependency list (`app_code`, `type`, `protocol`)                                                  | none                           |
| 6    | Environment Readiness  | grid: 4 envs (DEV, QA, QA2/Staging, PROD) × selected signals → ready boolean + notes. DEV+QA mandatory; PROD auto-checked; QA2 optional | none |
| 7    | Intelligence View      | displays top-5 similarity matches (cards: app name, code, score, reasons, exporters, dashboards, alert_rules, playbooks, pitfalls) | `POST /similarity/search` on enter |
| 8    | Capacity Status        | per-signal status (current %, projected %, headroom %), GREEN/AMBER/RED badges, recommendations                         | `POST /capacity/check` on enter |
| 9    | Review & Submit        | governance result (passed, score, violations by severity), artifact previews (CR + Epic + Stories + Tasks), full form recap | `POST /governance/validate`, `POST /artifacts/preview`, then on user click `POST /artifacts/generate` and `POST /onboardings/{id}/submit` |

The onboarding draft is created via `POST /onboardings/` after step 1 so subsequent steps have an `onboarding_request_id` to attach to. Steps 2–6 patch the draft via `PUT /onboardings/{id}`. Steps 7–9 are read-mostly and trigger the engines.

---

## 8. FRONTEND PAGES & ROUTES

| Path                  | Page                  | Purpose                                                                                       |
|-----------------------|-----------------------|-----------------------------------------------------------------------------------------------|
| `/`                   | Dashboard             | Recent onboardings, status counts, quick stats (apps, monthly onboards, headroom, gov score) |
| `/onboarding/new`     | Onboarding Wizard     | 9-step flow described above                                                                  |
| `/onboarding/:id`     | Onboarding Detail     | View existing; edit/delete only if draft; show all nested data                               |
| `/catalog`            | Service Catalog       | Browse `application_metadata`, filter by portfolio/tech/platform/retired                     |
| `/capacity`           | Capacity Dashboard    | LGTM stack utilisation gauges, per-signal trend, recommendations                             |
| `/portfolios`         | Portfolio List        | Cards per portfolio (app count, avg capacity, recent activity)                               |
| `/portfolios/:id`     | Portfolio Detail      | Apps grouped by portfolio, bulk export                                                       |
| `/admin`              | Admin Panel           | Governance rule catalog, CMDB sync trigger, MCP health, audit log viewer                     |

Shared UI primitives in `components/ui/`: `Alert`, `Badge`, `Button`, `Card`, `DataTable`, `Input`, `Modal`, `Select`, `Skeleton`, `StatusIndicator`, `Stepper`, `ThemeToggle`, `Tooltip`. Domain components in `components/shared/`: `ArtifactPreview`, `CapacityGauge`, `GovernanceAlert`, `SimilarityCard`, `TelemetrySelector`. Layout in `components/layout/`: `AppShell`, `Header`, `Sidebar`, `Footer`.

State stores (`zustand`): `onboardingStore`, `capacityStore`, `uiStore`. Hooks: `useApi`, `useAuth`, `useNotification`, `useTheme`. API client (`api/client.ts`) is an axios instance with request interceptor that attaches `Authorization: Bearer <token>` if `localStorage['obs_auth_token']` is set, and a 401 response interceptor that clears the token and redirects to `/login`.

---

## 9. AUTH

**Stub only.** No real auth provider wired. Token read from `localStorage['obs_auth_token']`, attached as Bearer header, 401 → clear and redirect. No RBAC. Backend trusts the caller. Assume an OIDC/SSO provider will be wired later.

---

## 10. NOTIFICATIONS — `backend/app/services/notification_service.py`

- `send_email(to, subject, body)` — placeholder, log only (plug in `aiosmtplib` later)
- `send_slack(channel, message)` — async POST to `SLACK_WEBHOOK_URL` from settings, payload `{channel, text}`, 10s timeout, log on failure
- `notify_capacity_warning(app_name, app_code, overall_status, details)` — Slack to `#obs-platform-alerts`, format `:warning: *Capacity {status}* for {app_name} ({app_code})\n{details}`
- `notify_submission(app_name, app_code, submitter)` — Slack to `#obs-onboarding`, format `:rocket: New observability onboarding submitted: {app_name} ({app_code}) by {submitter}`

Trigger points: capacity warning fires when overall_status is AMBER or RED; submission notification fires when status transitions to `submitted`.

---

## 11. CONFIG — `backend/app/config.py`

Pydantic settings with these fields (read from env / `.env`):
- `APP_ENV`, `APP_DEBUG`, `LOG_LEVEL`, `VERSION`
- `DATABASE_URL` (asyncpg DSN), `DATABASE_POOL_SIZE`
- `CORS_ORIGINS_STR` (comma-separated, parsed to list)
- `GRAFANA_MCP_URL`, `GRAFANA_MCP_TOKEN` (SecretStr)
- `JIRA_MCP_URL`, `JIRA_MCP_TOKEN` (SecretStr)
- `SERVICENOW_MCP_URL`, `SERVICENOW_MCP_TOKEN` (SecretStr)
- `CONFLUENCE_MCP_URL`, `CONFLUENCE_MCP_TOKEN` (SecretStr)
- `SLACK_WEBHOOK_URL` (SecretStr)
- `OPENAI_API_KEY` (SecretStr — declared for future, **not used anywhere**)
- `EMBEDDING_MODEL` default `text-embedding-3-small`, `EMBEDDING_DIMENSIONS` default 1536

Do not import or use OpenAI anywhere. Leave the fields as configuration placeholders only.

---

## 12. END-TO-END SUBMISSION PIPELINE

When a user clicks Submit on Step 9, the orchestration is:

1. Frontend calls `POST /onboardings/{id}/submit`
2. Backend `OnboardingService.submit()`:
   a. Verify status is `draft` or `in_progress` → set `in_progress`
   b. Run `CapacityEngine.evaluate()` → persist `capacity_assessments`; if RED, set status `rejected` and return early
   c. Run `SimilarityService.search()` → persist top-5 `similarity_matches`
   d. Run `GovernanceEngine.evaluate()`; if any HARD violation, set status `rejected` and return early with violations
   e. Run `ArtifactService.generate_all()` → persist `artifacts` (CR, Epic, Stories per signal, Tasks)
   f. Push CR via `ServiceNowMCPClient.create_change_request()`
   g. Push Epic + Stories + Tasks via `JiraMCPClient`
   h. Set status `submitted`, `submitted_at = now()`
   i. Fire `notify_submission()` to Slack
3. Every state change writes an `audit_logs` entry: `entity_type=onboarding_request`, `entity_id`, `action`, `actor=created_by`, `changes={before, after}`

If any MCP call fails:
- Mark the corresponding artifact `status = failed`, store error in `error_message`
- Do NOT roll back already-pushed artifacts
- Return 207 multi-status semantics inside the response body (not HTTP 207) — frontend shows partial success

---

## 13. NON-FUNCTIONAL REQUIREMENTS

- **Logging**: structlog JSON, every API request logs `{request_id, method, path, status, duration_ms}`
- **Metrics**: prometheus-client `/metrics` endpoint, counters for onboardings_created/submitted/rejected, histograms for engine durations
- **Tests**: pytest + pytest-asyncio, factory-boy + Faker for fixtures, aiosqlite for fast unit tests, real Postgres for integration tests. Frontend: Vitest + React Testing Library for components, contract tests against zod schemas
- **Lint**: ruff (backend), eslint + prettier (frontend), mypy `--strict`
- **Makefile** with targets: `install`, `build`, `test`, `lint`, `format`, `run-backend`, `run-frontend`, `dev`, `migrate`, `migrate-create msg=…`, `migrate-rollback`, `docker-up`, `docker-down`, `docker-logs`, `docker-clean`

---

## 14. STRICT GUARDRAILS — DO NOT

- **Do not** add LLMs, embeddings, langchain, openai, anthropic, or any AI library. Capacity, similarity, governance, and artifact generation are **all rules / templates**.
- **Do not** introduce additional API endpoints beyond those listed.
- **Do not** change the enum values — frontend dropdowns and DB enums depend on them verbatim.
- **Do not** add real auth / RBAC unless explicitly instructed — keep the localStorage Bearer token stub.
- **Do not** add error handling, validation, or fallbacks for scenarios not described above. Trust internal contracts; validate only at the API boundary.

---

## 15. DELIVERABLES CHECKLIST

When done, the project must contain:

- `backend/app/` with the layout in §1 — 9 SQLAlchemy models, 7 schema modules, 7 v1 routers, 4 engines/rule sets, 4 MCP clients, 6 service modules, repositories, alembic migrations
- `frontend/src/` with the layout in §1 — 9 wizard step components, 8 feature pages, 13 UI primitives, 5 shared domain components, layout chrome, axios client, zustand stores, hooks
- `docker-compose.yml` with the three services from §1
- `Makefile` with the targets from §13
- `backend/Dockerfile` (Python 3.12-slim, install from `pyproject.toml`, copy `app/`, run uvicorn)
- `frontend/Dockerfile` with a `dev` target that runs `vite --host 0.0.0.0 --port 3000`
- `README.md` with: prerequisites, `make docker-up`, URLs for backend (8000) and frontend (3000), and a one-paragraph description matching this spec
- Working end-to-end flow: create onboarding → fill 9 steps → submit → see governance + capacity + similarity + artifacts persisted in Postgres

The acceptance test: `make docker-up`, open the frontend, complete the wizard with a Java Spring service on EKS with metrics + logs + traces selected, click Submit, observe a CR + Epic + 3 Stories + 2 Tasks created in the artifacts table with `status=draft` (or `synced` if MCP endpoints are reachable), `capacity_assessments` populated, governance `passed=true`, `similarity_matches` showing 5 ranked rows.

--- END PROMPT ---
