# Similarity Service

Deterministic weighted scorer. No vector search, no embeddings — just a structured sum over tech / platform / portfolio / signal matches.

## Algorithm

Weights (additive):

| Match | Points |
|---|---:|
| Same `tech_stack` | +30 |
| Same `hosting_platform` | +25 |
| Same `portfolio` | +20 |
| Per overlapping telemetry signal | +5 |

Max possible score = 30 + 25 + 20 + 5·6 = **105**. Returned scores are normalised to `[0, 1]` by dividing by the max.

## Seeded patterns

5 canonical historical patterns in [`backend/app/services/similarity_service.py`](../../backend/app/services/similarity_service.py):

1. **Java Spring on EKS** — Digital Banking portfolio
2. **Node.js Express on ECS** — E-Commerce portfolio
3. **Python FastAPI on Lambda** — Data Platform portfolio
4. **Go on EKS** — Infrastructure portfolio
5. **.NET on Azure AKS** — Enterprise portfolio

Each pattern carries:

- `exporters[]` — recommended exporter names
- `dashboards[]` — Grafana dashboard titles
- `alert_rules[]` — alert rule names
- `playbooks[]` — Confluence page links
- `pitfalls[]` — known issues / anti-patterns

## API

```
POST /api/v1/similarity/search
body: SimilaritySearchRequest
→ SimilaritySearchResponse {
  matches: SimilarityMatchResult[],
  total_matches: int,
  search_strategy: "keyword_fallback"
}
```

`search_strategy` is always `"keyword_fallback"` — the other enum values (`vector`, `hybrid`) are reserved for a future pgvector-backed upgrade.

## Why not vector search?

- **Determinism** — a weighted-sum scorer is reproducible and auditable
- **No dependencies** — no sentence-transformers, no OpenAI API, no vector DB setup
- **Zero-LLM guardrail** — see [README § Zero-LLM Guardrails](../../README.md#-zero-llm-guardrails)

The pgvector extension IS installed and `similarity_matches` table has a `vector` column ready. When the structured scorer becomes insufficient (e.g. you want fuzzy match against free-text runbook content), drop in sentence-transformers + `ivfflat` index — the schema is ready.
