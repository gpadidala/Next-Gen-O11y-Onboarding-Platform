"""End-to-end integration tests for the v2 Coverage & Adoption pipeline.

Exercises the full control plane as a black box against the in-memory
SQLite fixture:

1. Integrations admin      → seed 11 defaults, GET list, PUT update,
                              run endpoint per target, test endpoint
2. CMDB sync               → POST /cmdb/sync creates app rows
3. Coverage probes         → POST /coverage/refresh fills coverage
                              rollups with realistic distributions
4. Coverage leadership     → GET /coverage/summary + /coverage/gaps
                              return the expected shape
5. Portfolios view         → GET /portfolios/ returns CMDB-backed
                              portfolios with per-signal pillar data
6. Capacity stack          → GET /capacity/stack returns 4 components
                              × min/max/avg/current metrics
7. Grafana usage           → GET /grafana-usage/summary returns totals

Failures here are real v2 regressions; the 12 pre-existing v1 API
failures in ``test_onboarding.py`` and ``test_governance.py`` are a
separate drift issue tracked outside this suite.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.services.integration_service import seed_defaults_if_empty

pytestmark = pytest.mark.asyncio


# ── Integrations control plane ────────────────────────────────────────


async def test_integrations_seed_and_list(
    client: AsyncClient, async_session
) -> None:
    """Seeding should produce 11 targets, listing should return them."""
    inserted = await seed_defaults_if_empty(async_session)
    await async_session.commit()
    assert inserted == 11

    r = await client.get("/api/v1/integrations/")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 11

    targets = sorted(row["target"] for row in rows)
    assert targets == [
        "blackbox",
        "cmdb",
        "confluence",
        "faro",
        "grafana",
        "jira",
        "loki",
        "mimir",
        "pyroscope",
        "servicenow",
        "tempo",
    ]

    # Tokens must never leak — has_token boolean only.
    for row in rows:
        assert "auth_token" not in row, "auth_token must not appear in responses"
        assert "has_token" in row


async def test_integrations_update_masks_token(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    r = await client.put(
        "/api/v1/integrations/cmdb",
        json={
            "base_url": "https://cmdb.example.com",
            "auth_token": "super-secret-bearer",
            "use_mock": False,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["base_url"] == "https://cmdb.example.com"
    assert body["use_mock"] is False
    assert body["has_token"] is True
    assert "auth_token" not in body

    # Clearing the token with an empty string.
    r = await client.put(
        "/api/v1/integrations/cmdb", json={"auth_token": ""}
    )
    assert r.status_code == 200
    assert r.json()["has_token"] is False


async def test_integration_test_endpoint_mock_short_circuits(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    r = await client.post("/api/v1/integrations/cmdb/test")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["status"] == "mock"
    assert "Mock mode" in body["message"]


# ── CMDB sync + coverage refresh ──────────────────────────────────────


async def test_cmdb_sync_populates_60_apps(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    r = await client.post("/api/v1/cmdb/sync")
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "success"
    assert "60" in body["message"]

    r = await client.get("/api/v1/cmdb/apps?page_size=200")
    assert r.status_code == 200
    payload = r.json()
    assert payload["total"] == 60
    assert len(payload["items"]) == 60

    portfolios = {item["portfolio"] for item in payload["items"]}
    assert portfolios == {"Digital Banking", "Payments Rails", "Wealth Platform"}


async def test_coverage_refresh_populates_rollups(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    # Prereq: CMDB sync first.
    r = await client.post("/api/v1/cmdb/sync")
    assert r.status_code == 202

    r = await client.post("/api/v1/coverage/refresh")
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "success"


async def test_coverage_summary_shape(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()
    await client.post("/api/v1/cmdb/sync")
    await client.post("/api/v1/coverage/refresh")

    r = await client.get("/api/v1/coverage/summary")
    assert r.status_code == 200
    body = r.json()
    assert "snapshot_date" in body
    assert "global" in body
    assert "portfolios" in body
    assert "vps" in body

    # Global must equal 60 apps.
    assert body["global"]["total_apps"] == 60
    assert body["global"]["coverage_pct_any"] > 0.0
    assert body["global"]["coverage_pct_any"] < 100.0

    # Per-signal list covers all 6 signals.
    signals = {s["signal"] for s in body["global"]["per_signal"]}
    assert signals == {"metrics", "logs", "traces", "profiles", "faro", "synthetics"}

    # Portfolios sorted worst-first.
    assert len(body["portfolios"]) == 3
    pcts = [p["coverage_pct_any"] for p in body["portfolios"]]
    assert pcts == sorted(pcts)


async def test_coverage_gaps_returns_unobserved_apps(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()
    await client.post("/api/v1/cmdb/sync")
    await client.post("/api/v1/coverage/refresh")

    r = await client.get("/api/v1/coverage/gaps")
    assert r.status_code == 200
    body = r.json()
    # With 30% dark-app fraction, expect roughly 15-25 gap apps out of 60.
    assert 10 <= body["total"] <= 30
    assert len(body["items"]) == body["total"]
    for item in body["items"]:
        assert item["portfolio"] in {
            "Digital Banking",
            "Payments Rails",
            "Wealth Platform",
        }


# ── Portfolios view (CMDB-backed) ─────────────────────────────────────


async def test_portfolios_list_returns_three_with_apps(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()
    await client.post("/api/v1/cmdb/sync")
    await client.post("/api/v1/coverage/refresh")

    r = await client.get("/api/v1/portfolios/")
    assert r.status_code == 200
    portfolios = r.json()
    assert len(portfolios) == 3

    for p in portfolios:
        assert p["id"] and p["name"] and p["owner"]
        assert len(p["apps"]) == 20
        for app in p["apps"]:
            assert app["id"].startswith("APP-")
            assert set(app["pillars"].keys()) == {"M", "L", "T", "P", "R", "E"}
            # Every pillar is 0 or 100 (binary projection from coverage rows).
            for v in app["pillars"].values():
                assert v in (0, 100)


async def test_portfolio_detail_by_slug(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()
    await client.post("/api/v1/cmdb/sync")

    r = await client.get("/api/v1/portfolios/digital-banking")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Digital Banking"
    assert len(body["apps"]) == 20
    # Owner should be one of the 3 mock VPs.
    assert body["owner"] in {"Alice Chen", "Maria Lopez", "Ravi Shankar"}


# ── Capacity stack ─────────────────────────────────────────────────────


async def test_capacity_stack_returns_four_components(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    r = await client.get("/api/v1/capacity/stack")
    assert r.status_code == 200
    body = r.json()
    assert "collected_at" in body
    assert "components" in body
    assert len(body["components"]) == 4

    component_keys = {c["component"] for c in body["components"]}
    assert component_keys == {"mimir", "loki", "tempo", "pyroscope"}

    for c in body["components"]:
        assert c["source"] in {"mock", "live"}
        assert len(c["metrics"]) >= 4
        for m in c["metrics"]:
            # min <= avg <= max, current within [min, max*1.1].
            assert m["min"] <= m["avg"] <= m["max"]
            assert m["min"] <= m["current"] <= m["max"] * 1.1 + 0.01
            assert m["status"] in {"green", "amber", "red", "unknown"}


# ── Grafana usage ─────────────────────────────────────────────────────


async def test_grafana_usage_summary_has_counts(
    client: AsyncClient, async_session
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()
    await client.post("/api/v1/cmdb/sync")
    await client.post("/api/v1/coverage/refresh")

    r = await client.get("/api/v1/grafana-usage/summary")
    assert r.status_code == 200
    body = r.json()
    # coverage_refresh does not run the grafana_rbac probe — verify shape only.
    assert "total_orgs" in body
    assert "total_teams" in body
    assert "team_adoption_pct" in body
    assert body["team_adoption_pct"] >= 0.0


# ── Integration runner per target ──────────────────────────────────────


@pytest.mark.parametrize(
    "target",
    ["cmdb", "mimir", "loki", "tempo", "pyroscope", "faro", "blackbox", "grafana"],
)
async def test_integration_run_observability_targets(
    client: AsyncClient, async_session, target: str
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()
    # CMDB must exist before any coverage probe can categorise.
    if target != "cmdb":
        await client.post("/api/v1/cmdb/sync")

    r = await client.post(f"/api/v1/integrations/{target}/run")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["target"] == target
    assert body["ok"] is True
    assert body["status"] in {"mock", "success"}
    assert "categories" in body
    assert body["items_processed"] >= 0


@pytest.mark.parametrize("target", ["jira", "confluence", "servicenow"])
async def test_integration_run_workitem_targets(
    client: AsyncClient, async_session, target: str
) -> None:
    await seed_defaults_if_empty(async_session)
    await async_session.commit()

    r = await client.post(f"/api/v1/integrations/{target}/run")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["target"] == target
    assert body["ok"] is True
    assert body["status"] in {"mock", "success"}
    assert isinstance(body["categories"], list)
    assert "message" in body
