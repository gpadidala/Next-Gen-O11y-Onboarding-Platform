"""Tests for the Onboarding API endpoints (/api/v1/onboardings).

Each test creates a fresh in-memory SQLite database so there is zero
cross-test contamination.  The ``client`` fixture provides an
``httpx.AsyncClient`` connected to the overridden FastAPI app.
"""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

_BASE = "/api/v1/onboardings"


def _unique_data(factory, **overrides: Any) -> dict[str, Any]:
    """Convenience wrapper: call the factory with optional overrides."""
    return factory(**overrides)


# ---------------------------------------------------------------------------
# POST /api/v1/onboardings  (Create)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_onboarding(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Creating an onboarding with valid data returns 201 and the new resource."""
    payload = _unique_data(sample_onboarding_data)
    resp = await client.post(_BASE, json=payload)

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["app_name"] == payload["app_name"]
    assert body["app_code"] == payload["app_code"]
    assert body["status"] in ("draft", "DRAFT")
    assert "id" in body


@pytest.mark.asyncio
async def test_create_onboarding_invalid(
    client: AsyncClient,
) -> None:
    """A request missing required fields returns 422 Unprocessable Entity."""
    payload = {"notes": "Incomplete request"}
    resp = await client.post(_BASE, json=payload)

    assert resp.status_code == 422, resp.text


# ---------------------------------------------------------------------------
# GET /api/v1/onboardings/{id}  (Retrieve)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_onboarding(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """A previously created onboarding can be retrieved by its UUID."""
    payload = _unique_data(sample_onboarding_data)
    create_resp = await client.post(_BASE, json=payload)
    assert create_resp.status_code == 201, create_resp.text

    ob_id = create_resp.json()["id"]
    get_resp = await client.get(f"{_BASE}/{ob_id}")

    assert get_resp.status_code == 200, get_resp.text
    body = get_resp.json()
    assert body["id"] == ob_id
    assert body["app_code"] == payload["app_code"]


@pytest.mark.asyncio
async def test_get_onboarding_not_found(client: AsyncClient) -> None:
    """Requesting a nonexistent UUID returns 404."""
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"{_BASE}/{fake_id}")

    assert resp.status_code == 404, resp.text


# ---------------------------------------------------------------------------
# GET /api/v1/onboardings  (List / paginate)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_onboardings(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Listing onboardings returns a paginated collection."""
    # Seed a couple of records.
    for _ in range(3):
        payload = _unique_data(sample_onboarding_data)
        create_resp = await client.post(_BASE, json=payload)
        assert create_resp.status_code == 201, create_resp.text

    resp = await client.get(_BASE)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    # Accept both top-level list and envelope with "items" key.
    items = body.get("items", body) if isinstance(body, dict) else body
    assert isinstance(items, list)
    assert len(items) >= 3


@pytest.mark.asyncio
async def test_list_onboardings_filter_status(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Filtering by status returns only matching records."""
    payload = _unique_data(sample_onboarding_data)
    create_resp = await client.post(_BASE, json=payload)
    assert create_resp.status_code == 201, create_resp.text

    resp = await client.get(_BASE, params={"status": "draft"})
    assert resp.status_code == 200, resp.text

    body = resp.json()
    items = body.get("items", body) if isinstance(body, dict) else body
    if isinstance(items, list):
        for item in items:
            assert item.get("status") in ("draft", "DRAFT")


# ---------------------------------------------------------------------------
# PUT /api/v1/onboardings/{id}  (Update)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_onboarding(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Updating a field on an existing onboarding reflects the new value."""
    payload = _unique_data(sample_onboarding_data)
    create_resp = await client.post(_BASE, json=payload)
    assert create_resp.status_code == 201, create_resp.text

    ob_id = create_resp.json()["id"]
    update_resp = await client.put(
        f"{_BASE}/{ob_id}",
        json={"app_name": "Updated Payment Gateway", "notes": "updated via test"},
    )

    assert update_resp.status_code == 200, update_resp.text
    body = update_resp.json()
    assert body["app_name"] == "Updated Payment Gateway"


# ---------------------------------------------------------------------------
# POST /api/v1/onboardings/{id}/submit  (Status transition)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_onboarding(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Submitting a draft onboarding transitions its status."""
    payload = _unique_data(sample_onboarding_data)
    create_resp = await client.post(_BASE, json=payload)
    assert create_resp.status_code == 201, create_resp.text

    ob_id = create_resp.json()["id"]
    submit_resp = await client.post(f"{_BASE}/{ob_id}/submit")

    # Accept 200 or 202 (depending on impl: sync vs. async).
    assert submit_resp.status_code in (200, 202), submit_resp.text
    body = submit_resp.json()
    # After submission, status should no longer be DRAFT.
    assert body.get("status", "").lower() != "draft"


# ---------------------------------------------------------------------------
# DELETE /api/v1/onboardings/{id}
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_draft(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Deleting a draft onboarding returns 204 No Content."""
    payload = _unique_data(sample_onboarding_data)
    create_resp = await client.post(_BASE, json=payload)
    assert create_resp.status_code == 201, create_resp.text

    ob_id = create_resp.json()["id"]
    delete_resp = await client.delete(f"{_BASE}/{ob_id}")

    assert delete_resp.status_code == 204, delete_resp.text

    # Confirm it is gone.
    get_resp = await client.get(f"{_BASE}/{ob_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_non_draft(
    client: AsyncClient,
    sample_onboarding_data,
) -> None:
    """Deleting a non-draft onboarding is rejected with 400 Bad Request."""
    payload = _unique_data(sample_onboarding_data)
    create_resp = await client.post(_BASE, json=payload)
    assert create_resp.status_code == 201, create_resp.text

    ob_id = create_resp.json()["id"]

    # Transition away from DRAFT first.
    submit_resp = await client.post(f"{_BASE}/{ob_id}/submit")
    assert submit_resp.status_code in (200, 202), submit_resp.text

    # Now attempt to delete the non-draft record.
    delete_resp = await client.delete(f"{_BASE}/{ob_id}")
    assert delete_resp.status_code == 400, delete_resp.text
