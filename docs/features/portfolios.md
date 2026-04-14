# Retail Portfolios

Route: `/portfolios` (list) · `/portfolios/{slug}` (detail) · Endpoint: `GET /api/v1/portfolios/`

CMDB-backed view of every application grouped by portfolio, with per-app M/L/T/P/R/E pillar coverage joined from `lgtm_app_coverage` at request time.

## What it shows

- **List page** — 3 portfolio cards (Digital Banking / Payments Rails / Wealth Platform), each with:
  - Icon + short name + description + VP owner (from `vp_name`)
  - Overall coverage % (avg of per-app pillars)
  - Per-pillar mini-bars (M/L/T/P/R/E)
  - App count + complete/in-progress/pending dot summary
- **Detail page** — single portfolio, full app table:
  - Tier badge (derived from `business_criticality`)
  - App code + name + team + tech stack
  - Per-pillar `PctCell` with coverage bar
  - Overall % column
  - Status badge + "Start onboarding" / "Update" action

## Signal → pillar map

| Pillar | Source signal | Legend |
|---|---|---|
| M | `metrics` | Mimir |
| L | `logs` | Loki |
| T | `traces` | Tempo |
| P | `profiles` | Pyroscope |
| R | `faro` | Faro (RUM) |
| E | `synthetics` | Blackbox (Events — closest match from 6 signals) |

## Data flow

1. `GET /api/v1/portfolios/` calls `list_portfolios_view(db)` in [backend/app/api/v1/portfolios.py](../../backend/app/api/v1/portfolios.py)
2. Fetches all non-retired rows from `application_metadata`
3. Calls `_build_pillar_map(db, app_codes)` which issues one query against `lgtm_app_coverage` to build `{app_code: {M,L,T,P,R,E}}`
4. Binary projection: `100` if `is_onboarded=True`, else `0`
5. Groups apps by `portfolio`, attaches cosmetics from `_PORTFOLIO_COSMETICS` dict
6. Returns `List[PortfolioView]`

## Portfolio cosmetics

Edit [backend/app/api/v1/portfolios.py](../../backend/app/api/v1/portfolios.py) `_PORTFOLIO_COSMETICS` dict to change icons / accent colours / descriptions:

```python
_PORTFOLIO_COSMETICS = {
    "digital banking": {
        "icon": "🏦",
        "accent": "#6366f1",
        "short": "Digital",
        "description": "Customer-facing digital banking surfaces — …",
    },
    …
}
```

Unknown portfolios (i.e. any portfolio name not in the dict) fall back to `_DEFAULT_COSMETICS` with a neutral grey template.

## Empty state

When CMDB sync hasn't run, the list page shows an amber banner pointing at `/admin/integrations` with a "Run probe on the CMDB card" instruction.
