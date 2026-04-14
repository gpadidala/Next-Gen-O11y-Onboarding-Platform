# Grafana Usage (RBAC)

Route: `/grafana-usage` · Endpoints: `/api/v1/grafana-usage/*` · Probe: `grafana_rbac_probe` (hourly cron)

Pulls Grafana team / user / dashboard metadata and reconciles against CMDB apps to show who's actually using Grafana.

## What's measured

Per team, the probe collects **counts only, no PII**:

- `member_count` — how many users are on the team
- `active_users_30d` — distinct users who signed in within 30 days
- `dashboard_count` — how many dashboards the team owns
- `dashboard_views_30d` — cumulative view count in last 30 days
- `last_activity_at` — timestamp of most recent member login

The probe also attempts to map each team to a CMDB `app_code` using an optional JSON map file (env var `GRAFANA_TEAM_APP_MAP_URL`) or the heuristic `team_name == app_code`. The result goes into `grafana_rbac_usage.mapped_app_code` / `mapped_portfolio`.

## UI

Route `/grafana-usage` shows:

1. **Stat cards** — Orgs · Teams · Active 30d · Users · Active users 30d · Team adoption %
2. **Adoption coverage bar** — mapped teams vs total CMDB apps
3. **Team table** — filterable by org / portfolio / active-only, sortable by any column

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/grafana-usage/summary` | Aggregate totals + `team_adoption_pct` |
| `GET` | `/api/v1/grafana-usage/teams` | Paginated team list with filters |
| `GET` | `/api/v1/grafana-usage/coverage` | Mapped-vs-unmapped CMDB coverage with unmapped app list |

## Mock data

In dev mode, `grafana_rbac_probe` generates one mapped team per CMDB app (60 teams) plus 10 "platform" teams not mapped to any app, giving a realistic 60/70 = ~86% team adoption metric.

## Real-mode wiring

When you flip `use_mock = false` on the Grafana card in `/admin/integrations`, the probe would (if implemented) hit:

- `GET /api/orgs` — org list
- `GET /api/teams/search?perpage=1000` — teams
- `GET /api/teams/{id}/members` — member counts
- `GET /api/users/search?perpage=1000` — last-seen timestamps
- `GET /api/search?type=dash-db&limit=5000` — dashboard inventory
- Either `GET /api/usage-insights/user` or a Mimir query for `grafana_frontend_*` metrics

The transport layer is stubbed today — real Grafana HTTP calls are v2.2.

## PII policy

**Never stored**: individual user names, emails, IP addresses, browser fingerprints. Only aggregated counts and boolean "active in 30d" flags. Enforce this at the schema level — `grafana_rbac_usage` has no column for individual user identifiers.
