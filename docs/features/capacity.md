# Capacity Planning

Two things live under the Capacity Planning umbrella:

1. **Pre-submission capacity check** — the deterministic engine that runs during onboarding Step 8 to decide whether a new workload fits
2. **Live LGTM stack view** — the runtime dashboard at `/capacity` showing min / max / avg / current per component, routed through the Integration resolver

---

## 1. Capacity engine (pre-submission check)

The engine lives in [`backend/app/engine/capacity_engine.py`](../../backend/app/engine/capacity_engine.py) and is pure Python — no HTTP, no ML, no probabilistic anything. Every decision is a table lookup plus arithmetic.

### Signal → backend mapping

| Signal | Backend | Unit |
|---|---|---|
| `metrics` | Mimir | active series |
| `logs` | Loki | MB/s |
| `traces` | Tempo | spans/sec |
| `profiles` | Pyroscope | profiles/sec |

### Tech-stack heuristic matrix (per instance)

| Tech stack | Metrics (series) | Logs (MB/s) | Traces (spans/s) | Profiles (pr/s) |
|---|---:|---:|---:|---:|
| `java_spring` | 500 | 2.0 | 100 | 10 |
| `dotnet` | 300 | 1.0 | 50 | 5 |
| `nodejs_*` | 200 | 1.5 | 150 | 8 |
| `python_*` | 150 | 1.0 | 80 | 6 |
| `go` | 100 | 0.5 | 200 | 12 |
| _default_ | 250 | 1.0 | 100 | 8 |

Numbers come from internal averages across production deployments. They're order-of-magnitude rough, not precise.

### Projection formula

```
projected_pct = (current_used + estimated_new_load × headroom_factor) / total_capacity × 100
```

- `headroom_factor` defaults to `1.2` (20% buffer for burst and cardinality drift)
- `current_used` is read from the integration resolver (Mimir usage, Loki usage, etc.)
- If the upstream isn't reachable, fallback total capacities are used: metrics 100k series · logs 50 MB/s · traces 10k spans/s · profiles 1k pr/s

### Threshold bands

| Range | Status | Decision | Frontend colour |
|---|---|---|---|
| 0–50% | `green` | ALLOW | emerald |
| 50–60% | `green` | ALLOW_MONITOR | emerald (dimmer) |
| 60–70% | `amber` (aka `yellow`) | ALLOW_NOTIFY | amber |
| >70% | `red` | BLOCK | red |

The **overall** status is the worst across signals. If overall is `red`, `can_proceed = false` and `escalation_required = true`, which causes governance rule `GOV-005 CapacityNotRed` to fail with a HARD violation.

### API

```
POST /api/v1/capacity/check
body: CapacityCheckRequest
→ CapacityCheckResponse
```

Used by onboarding Step 8 and the `/capacity` dashboard's "What if?" modal.

---

## 2. Live LGTM stack view (`/capacity`)

Route: `/capacity` · Endpoint: `GET /api/v1/capacity/stack` · Service: [`backend/app/services/capacity_stack_service.py`](../../backend/app/services/capacity_stack_service.py)

This is the operator-facing dashboard. One section per component (Mimir, Loki, Tempo, Pyroscope), each containing a grid of metric cards. Every card shows:

- **Display name** + unit label
- **Current** (big number, tabular numerals)
- **Min / Avg / Max** over the last 1h window
- **Utilisation bar** (% of declared limit) coloured by band (≥85 red · ≥70 amber · else green)
- **Limit** footer

### Metrics per component

| Component | Metrics |
|---|---|
| **Mimir** | active_series · ingestion_rate · query_rate · distributor_cpu · ingester_memory · ruler_eval_lag |
| **Loki** | ingestion_rate · active_streams · query_rate · ingester_memory · compactor_lag · chunk_cache_hit |
| **Tempo** | spans_per_sec · active_traces · query_rate · storage_growth · ingester_memory |
| **Pyroscope** | profile_rate · active_series · query_rate · ingester_memory |

**21 metrics total** across 4 components.

### How the data flows

1. `GET /api/v1/capacity/stack` calls `build_capacity_stack(db)`
2. For each of 4 components, `_build_component` calls `resolve_integration(db, target)` to get the current config
3. If `use_mock = true` OR `base_url` is empty → `_mock_metric` generates each metric
4. If `use_mock = false` AND `base_url` is populated → attempt real HTTP (currently Mimir-only reachability stub; Loki/Tempo/Pyroscope fall back to mock)
5. Response labels each section with `source: "mock"` or `source: "live"` so the UI shows honestly which path was used

### Mock data characteristics

The mock generator is **stable-ish per minute** — it uses a wall-clock minute as a seed, so clicking Refresh within the same minute shows the same values, but the next minute produces fresh numbers. Each metric is:

- 60 samples generated as a noisy sine wave centred between the spec's `low` and `high` values
- `current` = last sample, `min/max/avg` computed over the 60-sample window
- `utilization_pct = 100 × current / limit`
- `status` derived from the utilisation band

This gives a **realistic-looking** dashboard on a fresh clone without needing real Mimir/Loki/Tempo running.

### Real-mode status

| Component | Real HTTP? | Notes |
|---|:---:|---|
| Mimir | ⚠️ partial | Reachability test via `/api/v1/query?query=up`. Falls back to mock metrics on success. |
| Loki | 🚧 | Stub only — always returns mock |
| Tempo | 🚧 | Stub only |
| Pyroscope | 🚧 | Stub only |

Wiring real PromQL / LogQL queries is v2.2. When you point real endpoints at the Integrations admin and flip `use_mock = false`, the UI correctly labels the section `live`, but the metrics are still synthetic until the transport is wired.

### Example response

```json
{
  "collected_at": "2026-04-14T05:23:10.123Z",
  "components": [
    {
      "component": "mimir",
      "display_name": "Grafana Mimir",
      "source": "mock",
      "base_url": "",
      "use_mock": true,
      "is_reachable": true,
      "error": null,
      "collected_at": "2026-04-14T05:23:10.123Z",
      "metrics": [
        {
          "name": "active_series",
          "display_name": "Active series",
          "unit": "series",
          "current": 558815.4,
          "min": 521399.0,
          "max": 805498.5,
          "avg": 662455.2,
          "limit": 1000000,
          "utilization_pct": 55.9,
          "status": "green"
        },
        …
      ]
    },
    …
  ]
}
```

---

**Next**: [Integrations admin](integrations.md) · [Coverage & Adoption](coverage.md) · [Governance rules](governance.md)
