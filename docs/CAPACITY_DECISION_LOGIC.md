# Capacity Decision Logic

## Decision Matrix

| Current Utilisation | Status | Decision | Action |
|--------------------|--------|----------|--------|
| 0–50% | GREEN | ALLOW | Onboarding proceeds normally |
| 50–60% | GREEN | ALLOW_MONITOR | Proceed + add to monitoring watchlist |
| 60–70% | AMBER | ALLOW_NOTIFY | Proceed + notify platform team |
| >70% | RED | BLOCK | Onboarding blocked until capacity freed |

## Per-Signal Checks

### Mimir (Metrics)
- **Query**: `sum(cortex_ingester_active_series)`
- **Limit check**: active series count vs tenant limit
- **Ingestion**: samples/sec vs ingestion rate limit
- **Cardinality**: projected new label combinations

### Loki (Logs)
- **Query**: `sum(rate(loki_distributor_bytes_received_total[5m]))`
- **Limit check**: ingestion rate (bytes/sec) vs limit
- **Streams**: stream count vs stream limit

### Tempo (Traces)
- **Query**: `sum(rate(tempo_distributor_spans_received_total[5m]))`
- **Limit check**: spans/sec vs ingestion limit
- **Storage**: growth rate impact

### Pyroscope (Profiles)
- **Series**: series count vs limit
- **Ingestion**: rate vs limit

## Projection Formula

```
projected_utilisation = current_usage + (estimated_new_load × headroom_factor)
headroom_factor = 1.2 (20% safety margin)
utilisation_percentage = (projected / limit) × 100
```

## Estimation Heuristics (by Tech Stack)

| Tech Stack | Metric Series | Log Rate | Spans/sec |
|-----------|--------------|----------|-----------|
| Java Spring Boot (AKS) | ~500 | ~2 MB/s | ~100 |
| .NET (VM) | ~300 | ~1 MB/s | ~50 |
| Node.js (AKS) | ~200 | ~1.5 MB/s | ~150 |
| Python | ~150 | ~1 MB/s | ~80 |
| Go | ~100 | ~0.5 MB/s | ~200 |

## Overall Status

The overall status is the **worst** status among all requested signals.

- `canProceed = false` if ANY signal is RED
- `escalationRequired = true` if RED
- Recommendations are generated for each AMBER/RED signal

## Graceful Degradation

If the Grafana MCP server is unavailable, the engine assumes 45% utilisation (GREEN) and logs a warning. This allows onboarding to proceed with a recommendation for manual capacity review.
