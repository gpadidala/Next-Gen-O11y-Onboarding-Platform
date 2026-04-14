# CMDB Sync

Pulls the enterprise application catalog from the company CMDB and upserts `application_metadata`. Runs on a 6-hour cron (`0 */6 * * *`) and can be triggered on-demand from the Admin UI or API.

## Cron schedule

| Job ID | Cron | Module |
|---|---|---|
| `cmdb_full_sync` | `0 */6 * * *` | [backend/app/jobs/scheduler.py](../../backend/app/jobs/scheduler.py) |

The scheduler starts from FastAPI lifespan, so jobs begin running as soon as the backend comes up.

## What gets synced

For each app in the CMDB, the sync upserts these columns in `application_metadata`:

```
app_code · app_name · portfolio · sub_portfolio
business_criticality · hosting_platform · tech_stack
vp_name · vp_email · director_name
manager_name · manager_email
architect_name · architect_email
product_owner · lob · region
owner_name · owner_email · owner_team · cost_center
environments · tags · cmdb_id
cmdb_sync_source · cmdb_last_synced_at
```

Apps present in a previous sync but missing from the current pull are marked `retired = true` (soft delete). The single writer invariant holds: only this job writes to `application_metadata`.

## Field mapping

The CMDB client uses a placeholder `CMDB_FIELD_MAP` dict to translate canonical field names → upstream CMDB column names:

```python
CMDB_FIELD_MAP = {
    "app_code":      "u_application_code",      # PLACEHOLDER
    "app_name":      "u_application_name",      # PLACEHOLDER
    "portfolio":     "u_portfolio",             # PLACEHOLDER
    "vp_name":       "u_vice_president",        # PLACEHOLDER
    "manager_name":  "u_manager_display_name",  # PLACEHOLDER
    "architect_name": "u_solution_architect",   # PLACEHOLDER
    # …etc
}
```

Integrators **re-map this dict** in [backend/app/mcp/cmdb_client.py](../../backend/app/mcp/cmdb_client.py) to match their upstream CMDB schema without touching business logic.

## Mock data

With `PROBE_USE_MOCK=True` (dev default), the client generates 60 deterministic apps:

- 3 portfolios × 20 apps each = 60 apps
- 3 VPs (Alice Chen / Maria Lopez / Ravi Shankar)
- 12 distinct manager emails
- 6 distinct architect emails
- 3 LOBs (Retail Banking / Wealth / Payments)
- 3 regions (na / emea / apac)
- Each app gets a random tier_1..tier_4, tech_stack, hosting_platform

Seed is `random.Random(42)` so every boot produces the same 60 apps — useful for testing.

## Real-mode implementation

When `use_mock = false`, the CMDB client's `list_applications()` method currently raises `NotImplementedError`. Integrators wire their upstream HTTP transport there — pagination, auth, field mapping — and the rest of the pipeline (upsert, retire detection, rollup) works unchanged.

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/cmdb/sync` | Trigger a sync synchronously, return `SyncRunResult` |
| `GET` | `/api/v1/cmdb/sync/runs` | List recent 50 runs with status / duration / counts |
| `GET` | `/api/v1/cmdb/apps` | Paginated app catalog, filterable by portfolio / vp_email / architect_email / app_code / retired |

## Audit trail

Every sync writes a row to `cmdb_sync_runs`:

```sql
started_at      timestamptz
finished_at     timestamptz
status          text       -- running | success | partial | failed
apps_upserted   int
apps_retired    int
error_message   text       -- populated only on failure
```

Readable from `/api/v1/cmdb/sync/runs` and from the Admin page's CMDB sync history view.
