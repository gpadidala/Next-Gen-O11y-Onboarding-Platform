# Onboarding Wizard

Route: `/onboarding/new` · 9 steps · Zustand state + react-hook-form + Zod validation.

## Steps

| # | Title | Fields | Backend call |
|---|---|---|---|
| 1 | **App Identification** | `app_name`, `app_code`, `portfolio`, `alert_owner_email`, `alert_owner_team`, `created_by`, `notes?` | `POST /onboardings/` creates draft on step transition |
| 2 | **Platform & Technology** | `hosting_platform`, `tech_stack` | `PUT /onboardings/{id}` |
| 3 | **Telemetry Scope** | per-signal `{enabled, details}` for metrics/logs/traces/profiling | `PUT /onboardings/{id}` |
| 4 | **Technical Configuration** | exporters, scrape configs, pipeline defs (dynamic per stack) | `PUT /onboardings/{id}` |
| 5 | **Dependencies** | upstream / downstream `DependencySpec[]` | `PUT /onboardings/{id}` |
| 6 | **Environment Readiness** | grid: 4 envs × selected signals, ready boolean + notes | `PUT /onboardings/{id}` |
| 7 | **Intelligence View** | top-5 similarity matches (read-only) | `POST /similarity/search` on enter |
| 8 | **Capacity Status** | per-signal current/projected/headroom + recommendations | `POST /capacity/check` on enter |
| 9 | **Review & Submit** | governance result + artifact preview + full recap | `POST /governance/validate` + `POST /artifacts/preview`, then `POST /artifacts/generate` + `POST /onboardings/{id}/submit` on user click |

## CMDB pre-fill

Deep-link: `/onboarding/new?app_code=APP-1001`

When `?app_code=` is present, the wizard:

1. Calls `GET /cmdb/apps?app_code=APP-1001&page_size=1`
2. If found, pre-fills Step 1 + Step 2 from the CMDB record:
   - `app_name` ← `app_name`
   - `portfolio` ← `portfolio`
   - `alert_owner_email` ← `owner_email`
   - `alert_owner_team` ← `owner_team`
   - `hosting_platform` ← `hosting_platform`
   - `tech_stack` ← `tech_stack`
3. Tracks which fields were pre-filled in `cmdbPrefilledFields: Set<string>`
4. Shows a "Sourced from CMDB" banner on Step 1 with the count

All pre-filled fields remain editable. The Coverage Gaps tab's "Start onboarding" button uses this deep-link.

## Governance gate (Step 9)

Before allowing submit, the wizard calls `POST /governance/validate`. The response contains:

- `passed: bool` — true iff zero HARD violations
- `score: int` — 100 − 20·HARD − 5·SOFT
- `hard_violations: Violation[]` — blocks submit
- `soft_violations: Violation[]` — warnings, do not block
- `info_notices: Violation[]` — advisory only

If `passed=false`, the submit button is disabled and the hard violations are rendered in a red alert banner. See [governance.md](governance.md) for the full rule catalog.

## Artifacts preview

Step 9 also calls `POST /artifacts/preview` which renders:

- 1 CR (ServiceNow Change Request)
- 1 Epic (Jira)
- 1 Story per selected telemetry signal (6 subtasks each)
- 2 Tasks (capacity approval + change approval)
- 1 CTASK (ServiceNow follow-up)

The preview does **not** persist or push externally. Only the user-initiated `POST /artifacts/generate` writes rows to the `artifacts` table.

## What submit does today

```python
async def submit_onboarding(db, request_id, actor):
    request = await self._onboarding_repo.submit(db, request_id)
    await self._audit_repo.log(db, entity_type="onboarding_request", …)
    await db.commit()
    return request
```

State transition + audit entry, nothing more. The v2.1 follow-up wires this to actually push the generated artifacts to Jira / Confluence / ServiceNow via the integration resolver.
