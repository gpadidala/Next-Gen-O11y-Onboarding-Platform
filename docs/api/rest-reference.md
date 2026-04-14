# REST API Reference

All endpoints are mounted under `/api/v1` and documented by FastAPI. Open **http://localhost:8000/api/docs** for the interactive Swagger UI (requires `APP_DEBUG=true`).

## Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Liveness — always 200 if process is up |
| `GET` | `/api/v1/ready` | Readiness — 503 if DB / MCP dependencies degraded |

## Onboarding (v1)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/onboardings/` | Create draft onboarding |
| `GET` | `/api/v1/onboardings/` | Paginated list with `status?` + `portfolio?` filters |
| `GET` | `/api/v1/onboardings/{id}` | Full entity with nested relationships |
| `PUT` | `/api/v1/onboardings/{id}` | Partial update (draft only) |
| `DELETE` | `/api/v1/onboardings/{id}` | Delete draft |
| `POST` | `/api/v1/onboardings/{id}/submit` | Transition draft → in_progress + trigger pipeline |

## Capacity

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/capacity/check` | Per-signal capacity projection for a proposed onboarding |
| `GET` | `/api/v1/capacity/status` | Overall LGTM utilisation snapshot (legacy) |
| `GET` | **`/api/v1/capacity/stack`** | **NEW v2** — Live min/max/avg/current per component |

## Similarity

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/similarity/search` | Top-N weighted match against 5 seeded patterns |

## Artifacts

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/artifacts/generate` | Generate CR/Epic/Stories/Tasks + persist + sync externally |
| `POST` | `/api/v1/artifacts/preview` | Render payloads without persisting |
| `GET` | `/api/v1/artifacts/{onboarding_id}` | List artifacts for an onboarding |

## Governance

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/governance/validate` | Run all 11 rules against an onboarding, return scored result |
| `GET` | `/api/v1/governance/rules` | Public catalog — `[{rule_id, description, severity}]` |

## Lookup

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/lookup/portfolios` | Distinct portfolio names (from CMDB) |
| `GET` | `/api/v1/lookup/tech-stacks` | All TechStack enum values |
| `GET` | `/api/v1/lookup/platforms` | All HostingPlatform enum values |

---

## v2 — Coverage & Adoption

### CMDB

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/cmdb/sync` | Trigger CMDB sync (via resolver → mock or live) |
| `GET` | `/api/v1/cmdb/sync/runs` | Recent 50 sync run records |
| `GET` | `/api/v1/cmdb/apps` | Paginated CMDB apps with filters `portfolio?`, `vp_email?`, `architect_email?`, `app_code?`, `retired?` |

### Coverage

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/coverage/summary` | Leadership rollup — global + portfolios + vps |
| `GET` | `/api/v1/coverage/by-portfolio` | Sorted portfolio coverage |
| `GET` | `/api/v1/coverage/by-vp` | Sorted VP coverage |
| `GET` | `/api/v1/coverage/by-manager` | Sorted manager coverage |
| `GET` | `/api/v1/coverage/by-architect` | Sorted architect coverage |
| `GET` | `/api/v1/coverage/by-lob` | Sorted LOB coverage |
| `GET` | `/api/v1/coverage/gaps` | Apps with zero fresh coverage |
| `GET` | `/api/v1/coverage/app/{app_code}` | Per-app drill-down |
| `GET` | `/api/v1/coverage/trends?days=90` | Historical global coverage (last N days) |
| `POST` | `/api/v1/coverage/refresh` | Force probe run + rebuild rollups |

### Portfolios

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/portfolios/` | List all portfolios with nested apps + M/L/T/P/R/E pillars |
| `GET` | `/api/v1/portfolios/{id}` | Single portfolio by slug |

### Grafana usage

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/grafana-usage/summary` | Org / team / user / dashboard totals + adoption % |
| `GET` | `/api/v1/grafana-usage/teams` | Paginated team list with filters |
| `GET` | `/api/v1/grafana-usage/coverage` | Mapped-vs-unmapped CMDB coverage |

### Synthetics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/synthetics/urls` | Paginated blackbox URL targets |
| `GET` | `/api/v1/synthetics/summary` | Totals + success rate |

### Integrations admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/integrations/` | List all 11 targets (tokens masked) |
| `GET` | `/api/v1/integrations/{target}` | Fetch one |
| `PUT` | `/api/v1/integrations/{target}` | Partial update (base_url, token, mock, enabled, extra_config) |
| `POST` | `/api/v1/integrations/{target}/test` | Connectivity test via health path |
| `POST` | **`/api/v1/integrations/{target}/run`** | **Run probe** — dispatch to per-target runner, return categorised result |
| `POST` | `/api/v1/integrations/seed` | Idempotent seed of missing defaults |

## Metrics

| Method | Path | Description |
|---|---|---|
| `GET` | `/metrics` | Prometheus exposition format (mounted outside /api/v1) |

---

## Request / response contracts

All request bodies are Pydantic v2 models. All responses are strongly typed via FastAPI's `response_model`. Full schemas in the Swagger UI at `/api/docs`.

### Error envelope (RFC 7807)

```json
{
  "type": "urn:o11y:error:not_found",
  "title": "NOT_FOUND",
  "status": 404,
  "detail": "Integration 'jira' not found.",
  "instance": "http://localhost:8000/api/v1/integrations/jira"
}
```

### Token masking rule

**Any response body touching `integration_configs` never returns `auth_token`.** The `IntegrationConfigRead` Pydantic model exposes `has_token: bool` instead. This is tested in `test_v2_pipeline.py::test_integrations_seed_and_list`.
