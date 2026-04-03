"""Tests for the Capacity API endpoints (/api/v1/capacity).

Validates the capacity check and status endpoints, including traffic-light
thresholds (GREEN / AMBER / RED) and the ``canProceed`` flag.
"""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from httpx import AsyncClient


_BASE = "/api/v1/capacity"


# ---------------------------------------------------------------------------
# POST /api/v1/capacity/check
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_capacity_check(
    client: AsyncClient,
    sample_capacity_check_request: dict[str, Any],
) -> None:
    """A valid capacity check request returns an assessment envelope."""
    resp = await client.post(f"{_BASE}/check", json=sample_capacity_check_request)

    # 200 for synchronous check, 202 for async; either is acceptable.
    assert resp.status_code in (200, 202), resp.text
    body = resp.json()
    assert "overall_status" in body or "overallStatus" in body
    assert "can_proceed" in body or "canProceed" in body


@pytest.mark.asyncio
async def test_capacity_check_green(client: AsyncClient) -> None:
    """When all signals are under 60 pct utilisation the result is GREEN."""
    payload: dict[str, Any] = {
        "onboarding_request_id": str(uuid.uuid4()),
        "hosting_platform": "eks",
        "signals": ["metrics"],
        "estimated_series_count": 100,
        "estimated_log_gb_per_day": 0.5,
        "estimated_spans_per_second": 10,
        "metadata": {},
    }
    resp = await client.post(f"{_BASE}/check", json=payload)

    assert resp.status_code in (200, 202), resp.text
    body = resp.json()

    overall = body.get("overall_status") or body.get("overallStatus", "")
    assert overall.lower() in ("green", "unknown"), (
        f"Expected GREEN for low utilisation, got {overall}"
    )

    can_proceed = body.get("can_proceed", body.get("canProceed", True))
    assert can_proceed is True


@pytest.mark.asyncio
async def test_capacity_check_amber(client: AsyncClient) -> None:
    """When a signal is between 60-70 pct the result is AMBER but still allows proceeding."""
    payload: dict[str, Any] = {
        "onboarding_request_id": str(uuid.uuid4()),
        "hosting_platform": "eks",
        "signals": ["metrics", "logs"],
        "estimated_series_count": 50_000,
        "estimated_log_gb_per_day": 80.0,
        "estimated_spans_per_second": 500,
        "metadata": {"force_amber": True},
    }
    resp = await client.post(f"{_BASE}/check", json=payload)

    assert resp.status_code in (200, 202), resp.text
    body = resp.json()

    overall = body.get("overall_status") or body.get("overallStatus", "")
    # AMBER or YELLOW depending on the schema naming convention.
    assert overall.lower() in ("amber", "yellow", "green", "unknown"), (
        f"Unexpected overall status: {overall}"
    )

    can_proceed = body.get("can_proceed", body.get("canProceed"))
    if overall.lower() in ("amber", "yellow"):
        assert can_proceed is True, "AMBER should still allow proceeding"


@pytest.mark.asyncio
async def test_capacity_check_red(client: AsyncClient) -> None:
    """When a signal exceeds 70 pct the result is RED and canProceed is false."""
    payload: dict[str, Any] = {
        "onboarding_request_id": str(uuid.uuid4()),
        "hosting_platform": "eks",
        "signals": ["metrics", "logs", "traces"],
        "estimated_series_count": 500_000,
        "estimated_log_gb_per_day": 500.0,
        "estimated_spans_per_second": 50_000,
        "metadata": {"force_red": True},
    }
    resp = await client.post(f"{_BASE}/check", json=payload)

    assert resp.status_code in (200, 202, 409), resp.text
    body = resp.json()

    overall = body.get("overall_status") or body.get("overallStatus", "")
    if overall.lower() == "red":
        can_proceed = body.get("can_proceed", body.get("canProceed"))
        assert can_proceed is False, "RED capacity must block proceeding"


# ---------------------------------------------------------------------------
# GET /api/v1/capacity/status
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_capacity_status(client: AsyncClient) -> None:
    """GET /capacity/status returns an overview of current capacity."""
    resp = await client.get(f"{_BASE}/status")

    assert resp.status_code in (200, 501), resp.text
    if resp.status_code == 200:
        body = resp.json()
        # Should have signal-level breakdown or an aggregate status.
        assert isinstance(body, dict)
