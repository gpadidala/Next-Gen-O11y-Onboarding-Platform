# Integrations Admin

The **Integrations** page (`/admin/integrations`) is the runtime control plane for every upstream system the platform reads from or writes to. Eleven targets, three semantic groups, one shared UX: **Edit · Test · Run**.

Every change you make here is persisted to the local `integration_configs` Postgres table and picked up by the next probe cycle — **no restart, no env var edit, no redeploy**.

---

## The 11 targets

<table>
  <tr>
    <th>Group</th>
    <th>Target</th>
    <th>What it feeds</th>
    <th>Default health path (test button)</th>
  </tr>
  <tr>
    <td rowspan="1"><b>Source of truth</b></td>
    <td><code>cmdb</code></td>
    <td>60 mock apps × 3 portfolios × 3 VPs. Drives every downstream view</td>
    <td><code>/cmdb/v1/health</code></td>
  </tr>
  <tr>
    <td rowspan="7"><b>Observability read path</b></td>
    <td><code>mimir</code></td>
    <td>Coverage probe (metrics) · Capacity stack view</td>
    <td><code>/api/v1/query?query=up</code></td>
  </tr>
  <tr>
    <td><code>loki</code></td>
    <td>Coverage probe (logs) · Capacity stack view</td>
    <td><code>/ready</code></td>
  </tr>
  <tr>
    <td><code>tempo</code></td>
    <td>Coverage probe (traces) · Capacity stack view</td>
    <td><code>/ready</code></td>
  </tr>
  <tr>
    <td><code>pyroscope</code></td>
    <td>Coverage probe (profiles) · Capacity stack view</td>
    <td><code>/api/apps</code></td>
  </tr>
  <tr>
    <td><code>faro</code></td>
    <td>Coverage probe (RUM sessions)</td>
    <td><code>/-/ready</code></td>
  </tr>
  <tr>
    <td><code>blackbox</code></td>
    <td>Coverage probe (synthetics URLs)</td>
    <td><code>/</code></td>
  </tr>
  <tr>
    <td><code>grafana</code></td>
    <td>RBAC probe — teams, users, dashboard views</td>
    <td><code>/api/health</code></td>
  </tr>
  <tr>
    <td rowspan="3"><b>Work items &amp; ITSM</b></td>
    <td><code>jira</code></td>
    <td>Destination for Epics / Stories / Tasks generated during submission</td>
    <td><code>/rest/api/2/serverInfo</code></td>
  </tr>
  <tr>
    <td><code>confluence</code></td>
    <td>Destination for auto-generated runbook pages per portfolio</td>
    <td><code>/rest/api/space?limit=1</code></td>
  </tr>
  <tr>
    <td><code>servicenow</code></td>
    <td>Destination for Change Requests + CTASKs on approved submissions</td>
    <td><code>/api/now/table/change_request?sysparm_limit=1</code></td>
  </tr>
</table>

---

## The card anatomy

Each card shows, top to bottom:

- **Icon + display name** — one `lucide-react` icon per target
- **Target key** (monospace) + description
- **Status chips** — `mock` / `live` · `enabled` / `disabled` · last-test status (`ok` / `mock` / `error`)
- **Base URL** (read mode) or inline form (edit mode)
- **Auth** — show/hide bearer token toggle, masked as `••••••••` on read
- **Mode** — "Mock (deterministic in-process data)" or "Live (real HTTP calls)"
- **Last test** — timestamp + message from the most recent connectivity probe
- **Action row** — `Edit` · `Test connection` · `Run probe`

---

## The three actions

### 1. Edit

Click **Edit** → the card flips to an inline form:

| Field | Behaviour |
|---|---|
| `base_url` | Must start with `http://` or `https://`. Trailing slash stripped. |
| `auth_token` | **Missing** key → untouched. **Empty string** → cleared. **Any string** → stored verbatim. Never returned in GET responses. |
| `use_mock` | Toggle. When true, the runner short-circuits real HTTP and uses the deterministic mock path. |
| `is_enabled` | Toggle. When false, the probe/runner skips this target entirely and logs `probe_skipped_disabled`. |

Save → `PUT /api/v1/integrations/{target}` → 200 with the updated row (token still masked).

### 2. Test connection

Click **Test connection** → `POST /api/v1/integrations/{target}/test`. The backend:

1. Short-circuits with `status: "mock"` if the card is in mock mode
2. Otherwise attempts a `GET` against the health path above with a 5-second timeout
3. Attaches `Authorization: Bearer {token}` if `auth_mode = "bearer"` and a token is stored
4. Considers any HTTP 2xx–4xx as "reachable" (auth failures still prove the host is up)
5. Records the result into `integration_configs.last_test_*` columns

Returns `{ok: bool, status: "ok"|"mock"|"error", message: str, tested_at: datetime}`.

### 3. Run probe

Click **Run probe** → `POST /api/v1/integrations/{target}/run`. This is the **meaningful** action — it actually runs the sync or probe for that target and returns a categorised result.

Per-target behaviour:

| Target | Action | Categorisation |
|---|---|---|
| `cmdb` | Runs a full `run_cmdb_sync` | per-portfolio app count |
| `mimir` / `loki` / `tempo` / `pyroscope` / `faro` / `blackbox` | Runs the matching signal probe, upserts `lgtm_app_coverage` rows | per-portfolio onboarded / total |
| `grafana` | Runs the RBAC probe | per-portfolio mapped teams + active count (+ "Unmapped" row for platform teams) |
| `jira` | Groups staged artifacts by type, reports pushed-count | EPIC / STORY / TASK |
| `confluence` | Groups onboarding requests by portfolio | runbook pages per portfolio |
| `servicenow` | Groups staged artifacts by CR/CTASK | CR / CTASK with pushed-count |

The result panel renders inline with:

- Total items processed / onboarded · duration (ms)
- Status badge (`mock` amber · `success` green · `failed` red)
- Message
- Per-category bar list — coloured by coverage threshold (≥80 green · ≥50 amber · else red)

---

## Runtime configuration flow

```
┌────────────────────┐   PUT /api/v1/integrations/mimir
│ /admin/integrations│ ─────────────────────────────────┐
│  (React form)      │                                  │
└────────────────────┘                                  ▼
                                        ┌────────────────────────┐
                                        │  integration_configs   │
                                        │  (Postgres)            │
                                        │  UPDATE … WHERE target │
                                        └──────────┬─────────────┘
                                                   │
                                                   ▼
                                         next probe cycle
                                                   │
                                                   ▼
                                      resolve_integration(db, 'mimir')
                                                   │
                                                   ▼
                                         ResolvedIntegration
                                         (base_url, token, use_mock, …)
                                                   │
                                                   ▼
                                            _run_signal_probe
                                                   │
                                                   ▼
                                    real HTTP  ← or →  mock path
```

## Seeding behaviour

On first boot, `seed_defaults_if_empty(session)` runs inside the FastAPI lifespan. It iterates `DEFAULT_INTEGRATIONS` (list of 11 dicts) and inserts any target that doesn't already exist, with:

- `base_url` ← pulled from `Settings.*_BASE_URL` env var (or empty string if unset)
- `auth_token` ← `Settings.*_API_TOKEN.get_secret_value()` (plaintext)
- `use_mock` ← `Settings.PROBE_USE_MOCK` (default `True`)
- `is_enabled` ← always `True`
- `extra_config` ← per-target defaults (e.g. Jira `project_key="OBS"`, ServiceNow `assignment_group="observability-platform"`)

The seed is idempotent — re-running it inserts only missing rows. Your edits survive restarts.

## Security

- Tokens are stored **plaintext** in `integration_configs.auth_token`. **Production should front this with Vault or AWS Secrets Manager.**
- Tokens are **never** returned in API responses. The `IntegrationConfigRead` Pydantic model exposes only `has_token: bool`.
- The `PUT` endpoint accepts an empty-string `auth_token` as "clear the stored token", and an absent key as "leave untouched".
- `CMDB_FIELD_MAP` in `backend/app/mcp/cmdb_client.py` is a placeholder dict — re-map it to your real CMDB schema without touching business logic.

## Known limitations

- Real-mode HTTP for coverage probes is a reachability stub only. Actual PromQL / LogQL / TraceQL queries for per-metric stats are a v2.2 follow-up — point real endpoints at us and we'll wire them.
- Jira / Confluence / ServiceNow are configurable and their Run probes return meaningful previews, but the onboarding submit pipeline does **not yet** push artifacts to them. That's a v2.1 follow-up — see the [roadmap](../../README.md#-roadmap).

---

**Next**: [Coverage & Adoption](coverage.md) · [Capacity planning](capacity.md) · [Architecture](../architecture/overview.md)
