# Testing Guide

## Baseline

As of `main`:

- **67 passing** — v1 baseline + 22 new v2 integration tests
- **12 pre-existing v1 failures** — contract drift in `test_onboarding.py` and `test_governance.py`, out of scope for the v2 effort
- **2 skipped** — optional flags-off tests

Run the full suite:

```bash
cd backend
python -m pytest tests/ -v
```

Run only the v2 pipeline suite:

```bash
python -m pytest tests/test_api/test_v2_pipeline.py -v
# 22 passed in ~8s
```

## Test layout

```
backend/tests/
├── conftest.py                       # Async SQLite fixture + FastAPI test app
├── test_api/
│   ├── test_capacity.py              # v1 capacity check endpoint
│   ├── test_governance.py            # v1 governance validate
│   ├── test_onboarding.py            # ⚠️ v1 contract drift (pre-existing failures)
│   └── test_v2_pipeline.py           # ✅ NEW — 22 integration tests for v2
├── test_engine/
│   ├── test_capacity_engine.py       # v1 engine unit tests
│   └── test_governance_engine.py     # v1 engine unit tests
├── test_mcp/
│   ├── test_confluence_client.py
│   └── test_grafana_client.py        # ⚠️ 2 pre-existing failures
└── test_services/
    ├── test_capacity_service.py
    ├── test_governance_service.py
    └── test_onboarding_service.py
```

## The v2 integration suite

File: `tests/test_api/test_v2_pipeline.py` · 22 tests, all passing.

What it covers:

| Scope | Tests |
|---|---|
| **Integrations seed/list/update/test** | 3 tests — seeds 11 defaults, verifies no token leaks, clears token via empty string, mock-mode test short-circuit |
| **CMDB sync** | 1 test — 60 apps across 3 portfolios |
| **Coverage refresh + rollups** | 1 test — refresh succeeds, rollups populate |
| **Coverage summary shape** | 1 test — global + portfolios + vps, per-signal covers all 6, sorted worst-first |
| **Gap list** | 1 test — 10-30 apps with zero coverage (depends on `_DARK_APP_FRACTION=0.30`) |
| **Portfolios list + detail** | 2 tests — 3 portfolios × 20 apps, binary M/L/T/P/R/E pillars, slug-based detail lookup |
| **Capacity stack** | 1 test — 4 components, invariant `min ≤ avg ≤ max`, current within bounds, status banding |
| **Grafana usage shape** | 1 test — summary endpoint shape |
| **Per-target runner** (observability) | 8 parametrized tests — cmdb, mimir, loki, tempo, pyroscope, faro, blackbox, grafana |
| **Per-target runner** (work items) | 3 parametrized tests — jira, confluence, servicenow |

All tests use the `async_session` + `client` fixtures from `conftest.py`, which spin up an in-memory SQLite DB per test and wire a FastAPI `TestClient` against it.

## Why in-memory SQLite?

- Fast: full v2 suite runs in ~8 seconds
- Isolated: every test gets a fresh schema
- No external deps: tests run in CI without Postgres

Caveats:

- SQLite doesn't support Postgres-specific types like `UUID` or `JSONB` natively — the models use generic types (`String(36)` for UUIDs in test mode, SQLAlchemy's `JSON` type) so they work on both backends
- Some Postgres-only features (ON CONFLICT DO UPDATE with `excluded.column`) behave slightly differently — the upsert logic in probes handles both paths

## Adding a new test

1. Create a new file under `tests/test_api/` or `tests/test_services/`
2. Add the `pytestmark = pytest.mark.asyncio` module marker
3. Request the `client: AsyncClient` and/or `async_session` fixtures
4. Call `await seed_defaults_if_empty(async_session)` + `await async_session.commit()` if your test needs the 11 integration rows to exist
5. Hit endpoints via `await client.get(...) / post(...) / put(...)`
6. Assert on response status + body shape

Example:

```python
import pytest
from httpx import AsyncClient

from app.services.integration_service import seed_defaults_if_empty

pytestmark = pytest.mark.asyncio


async def test_my_new_thing(client: AsyncClient, async_session) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    r = await client.get("/api/v1/integrations/")
    assert r.status_code == 200
    assert len(r.json()) == 11
```

## Linting

```bash
cd backend
ruff check app tests
mypy app --strict
```

Ruff config in `pyproject.toml` selects `E, F, I, N, W, UP, B, A, SIM, TCH`. Line length 100.

## Frontend tests

```bash
cd frontend
npm test
```

Vitest + React Testing Library. Currently minimal — the v2 UX upgrades didn't add unit tests for the new feature pages. Contributing a suite under `src/features/**/__tests__/` is welcome.

## CI

Not yet wired. A GitHub Actions workflow that runs `pytest` + `ruff` + `mypy` + `npm run build` is a straightforward follow-up.
