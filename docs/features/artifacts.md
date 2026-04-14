# Artifact Generation

Template-driven (Jinja2 loaded but not yet used — current implementation builds payloads via Python dict construction). Generates the full work-item tree for a submitted onboarding.

## What gets generated

Per submission, the artifact service emits:

| Count | Type | Destination | Purpose |
|---|---|---|---|
| 1 | **CR** (Change Request) | ServiceNow | Top-level change ticket with risk_level, change_type, implementation_plan, rollback_plan, test_plan, approvers |
| 1 | **Epic** | Jira | Parent for all work, labelled `[obs-onboarding, <tech_stack>, <platform>]`, project `OBS` |
| N | **Story** | Jira | One per selected telemetry signal. Each story carries 6 subtasks: agent-config, exporter-deployment, dashboard-creation, alert-rule-setup, validation, playbook-documentation |
| 2 | **Task** | Jira | Capacity approval (assignee `capacity-owner`) + Change approval (assignee `change-board`) |
| 1 | **CTASK** | ServiceNow | Change Task follow-up for the CR |

For a submission with metrics + logs + traces selected: 1 CR + 1 Epic + 3 Stories + 2 Tasks + 1 CTASK = **8 artifacts**, and 3 × 6 = 18 subtasks inside Jira.

## Signal → Story template map

```python
metrics           → "Configure metrics collection for {app_name}"
logs              → "Set up log ingestion pipeline for {app_name}"
traces            → "Enable distributed tracing for {app_name}"
grafanaDashboards → "Create Grafana dashboards for {app_name}"
profiles          → "Enable continuous profiling for {app_name}"
rum               → "Set up Real User Monitoring for {app_name}"
faro              → "Configure Grafana Faro for {app_name}"
dbPlugins         → "Deploy database monitoring plugins for {app_name}"
```

## Summary formats

- **CR**: `Observability Onboarding: {app_name} ({app_code}) for {tech_stack} on {platform}`
- **Epic**: `Observability Onboarding: {app_name}`
- **Story**: `[{SIGNAL}] {template.format(app_name=app_name)}`
- **Task**: `Capacity approval for {app_name}` / `Change approval for {app_name}`

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/artifacts/generate` | Generate + persist to `artifacts` table + **push to external systems** (once v2.1 is done) |
| `POST` | `/api/v1/artifacts/preview` | Render payloads without persisting — used by Step 9 preview |
| `GET` | `/api/v1/artifacts/{onboarding_id}` | List artifacts for an onboarding request |

## Current push status

Today `/artifacts/generate` persists rows to the `artifacts` table but leaves `external_id` and `external_url` NULL — the actual HTTP push to Jira / Confluence / ServiceNow is not wired into the submission flow yet. That's the v2.1 follow-up.

The existing v1 MCP clients ([jira_client.py](../../backend/app/mcp/jira_client.py), [confluence_client.py](../../backend/app/mcp/confluence_client.py), [servicenow_client.py](../../backend/app/mcp/servicenow_client.py)) are ready and tested. Completing v2.1 is ~100 lines — instantiate each client via `resolve_integration(db, target)` and call `client.create_epic(payload)` etc. for each artifact, writing the returned key back into `external_id`.
