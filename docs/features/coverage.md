# Coverage & Adoption

The **Coverage & Adoption** cockpit is the leadership face of the platform. It answers one question: *"Of all the apps in the CMDB, how many are actually emitting each signal into our LGTM stack, and which ones are dark?"*

Route: `/coverage` · Three tabs · Sub-500ms hot path · Built on pre-aggregated rollups.

---

## The three tabs

### Tab 1 — Leadership Overview

Stat cards + trendline + per-signal adoption bars.

| Card | Source | Example value |
|---|---|---|
| **Total Apps (CMDB)** | `application_metadata` (retired=false) | 60 |
| **Onboarded (any signal)** | `coverage_rollup_snapshots.apps_onboarded_any` (today, scope=global) | 38 |
| **Full-stack observable** | `coverage_rollup_snapshots.coverage_pct_full_stack` × total | 18 (30.0%) |
| **Gap** | `/api/v1/coverage/gaps` row count | 22 |

Below the cards:

- **90-day trendline** — `coverage_rollup_snapshots` where `scope_type='global'`, two lines (any vs full-stack), rendered via inline SVG (no chart library dependency)
- **Per-signal bars** — one row per signal (metrics, logs, traces, profiles, faro, synthetics) showing onboarded/total + coverage %, bar width driven by coverage %, colour from the coverage band

### Tab 2 — By Portfolio / VP / Manager / Architect / LOB

Left-rail scope toggle, right pane is a sortable `DataTable`. Each row:

- Scope name (portfolio name / VP name / email)
- Total apps · Onboarded · Gap
- Coverage bar (green ≥80, amber ≥50, red <50)
- Per-signal mini-bars — 6 coloured squares, one per signal, opacity keyed to per-signal coverage %

**Worst 10 highlighted with a red-stripe row background** so the biggest gaps float to the top without manual sorting.

### Tab 3 — App-level Gap List

Every CMDB app with **zero** fresh coverage rows. Portfolio filter dropdown at the top. Each row:

- App name + code + VP + criticality tier + region
- **Start onboarding** button — deep-links to `/onboarding/new?app_code=APP-XXXX`, pre-fills Step 1 + 2 from CMDB
- **View CMDB record** — modal (placeholder today)

---

## Data model

```
application_metadata (60 rows)         lgtm_app_coverage (360 rows)
┌─────────────────────┐                ┌─────────────────────────┐
│ id                  │                │ id                      │
│ app_code  ─────┐    │                │ app_code (FK-like)  ◀──┐│
│ app_name       │    │                │ signal                  ││
│ portfolio      │    │     join       │ is_onboarded            ││
│ vp_name        │ ◀──┼────────────────┤ last_sample_at          ││
│ vp_email       │    │                │ active_series_count     ││
│ manager_name   │    │                │ log_volume_bytes_per_day││
│ architect_name │    │                │ …                       ││
│ lob            │    │                └─────────────────────────┘│
│ region         │                                                │
│ retired        │                                                │
└─────────────────────┘                                           │
           │                                                      │
           │ aggregate at 02:30 UTC daily                        │
           ▼                                                      │
    ┌──────────────────────────────────────────┐                 │
    │        coverage_rollup_snapshots          │                 │
    │  snapshot_date · scope_type · scope_key   │                 │
    │  total_apps · apps_onboarded_any          │                 │
    │  apps_onboarded_metrics / logs / traces   │                 │
    │  apps_onboarded_profiles / faro / synth   │                 │
    │  coverage_pct_any · coverage_pct_full_st  │                 │
    └──────────────────────────────────────────┘                 │
           ▲                                                      │
           │  hot path — leadership reads                         │
           │  hit this table, never the raw join                  │
           └──────────────────────────────────────────────────────┘
```

### Freshness rules

An app is considered **onboarded (any)** if at least one row in `lgtm_app_coverage` has:
- `is_onboarded = true`
- `last_sample_at > now() - COVERAGE_FRESHNESS_HOURS` (default 24h)

An app is **full-stack observable** if the above holds for **all three** of metrics, logs, traces.

These rules live in `backend/app/engine/coverage_engine.py` as constants:

```python
FULL_STACK_SIGNALS: set[str] = {"metrics", "logs", "traces"}

def _freshness_threshold(settings):
    return datetime.now(timezone.utc) - timedelta(hours=settings.COVERAGE_FRESHNESS_HOURS)
```

## Rollup build logic

Nightly job `coverage_rollup_build` (cron: `30 2 * * *` UTC) calls `rebuild_rollups(db, settings)`, which:

1. Computes the **global** aggregate across all non-retired apps
2. Iterates distinct `portfolio` values → per-portfolio aggregates
3. Iterates distinct `vp_email` values → per-VP aggregates
4. Iterates distinct `manager_email` values → per-manager aggregates
5. Iterates distinct `architect_email` values → per-architect aggregates
6. Iterates distinct `lob` values → per-LOB aggregates
7. Upserts all rows into `coverage_rollup_snapshots` keyed on `(snapshot_date, scope_type, scope_key)`

For 60 apps across 3 portfolios / 3 VPs / 12 managers / 6 architects / 3 LOBs, the full rebuild writes **28 rows** and takes ~20ms.

## On-demand refresh

If the cron hasn't run yet today, the API endpoint `_ensure_today_rollup(db)` synthesises the day's snapshot synchronously on the first `/coverage/summary` call, then caches it in the DB so subsequent calls are fast.

Operators can also force a full rebuild + probe run from the UI via the **Refresh coverage** button on `/coverage` → `POST /api/v1/coverage/refresh`. This:

1. Runs all 6 coverage probes (Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox) sequentially
2. Rebuilds rollups via `rebuild_rollups`
3. Returns `{run_id, status, message}` with a summary like `"6 probes ran, 171 per-signal onboardings observed, 28 rollup rows written."`

## Mock data distribution

In dev mode (`PROBE_USE_MOCK=True`), the probes use a deterministic per-app hash to decide onboarding state. The `_DARK_APP_FRACTION=0.30` constant in `backend/app/services/coverage/probes.py` forces ~30% of apps to be "dark" (no signals at all), giving a realistic gap list out of the box.

Per-signal fractions for non-dark apps:

| Signal | Fraction | Rationale |
|---|---|---|
| metrics | 0.85 | Most apps have basic Prometheus scraping |
| logs | 0.78 | Nearly as common, slight lag |
| traces | 0.55 | Instrumentation effort higher |
| profiles | 0.20 | Pyroscope adoption is new |
| faro | 0.18 | RUM is frontend-only |
| synthetics | 0.35 | Blackbox coverage for critical services |

With these fractions, a fresh clone produces **~63% any-coverage / 30% full-stack** with **Payments Rails at 50%** as the worst portfolio.

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/coverage/summary` | Leadership rollup — global + portfolios + vps |
| `GET /api/v1/coverage/by-portfolio` | Sorted portfolio coverage |
| `GET /api/v1/coverage/by-vp` | Sorted VP coverage |
| `GET /api/v1/coverage/by-manager` | Sorted manager coverage |
| `GET /api/v1/coverage/by-architect` | Sorted architect coverage |
| `GET /api/v1/coverage/by-lob` | Sorted LOB coverage |
| `GET /api/v1/coverage/gaps` | Apps with zero fresh coverage |
| `GET /api/v1/coverage/app/{app_code}` | Per-app drill-down |
| `GET /api/v1/coverage/trends?days=90` | Historical global coverage |
| `POST /api/v1/coverage/refresh` | Force probe run + rebuild |

Full schemas in [../api/rest-reference.md](../api/rest-reference.md).

## Performance

- Leadership reads hit `coverage_rollup_snapshots` — **single-row lookup keyed by `(date, scope_type, scope_key)`**, indexed, typically under 5ms
- Gap list scans `application_metadata` with a NOT-IN subquery against `lgtm_app_coverage` — O(N) where N = CMDB size, typically under 50ms for 5k apps
- Full rebuild is bounded by distinct scope counts × `compute_aggregates` — ~20ms per scope, so 30 scopes = 600ms, usually batched nightly

---

**Next**: [Integrations admin](integrations.md) · [Capacity planning](capacity.md) · [Data model](../architecture/data-model.md)
