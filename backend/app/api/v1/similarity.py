"""Similarity search endpoints.

Finds previously onboarded applications with matching tech stack, hosting
platform, and telemetry profile so that reusable exporters, dashboards,
alert rules, and playbooks can be recommended.
"""

from __future__ import annotations

import time
from typing import Any

import structlog
from fastapi import APIRouter, status

from app.api.deps import AppSettings, DbSession
from app.schemas.common import ErrorResponse
from app.schemas.similarity import (
    SimilarityMatchResult,
    SimilaritySearchRequest,
    SimilaritySearchResponse,
)
from app.utils.metrics import SIMILARITY_SEARCHES

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["similarity"])


# -- Endpoints ------------------------------------------------------------


@router.post(
    "/search",
    response_model=SimilaritySearchResponse,
    status_code=status.HTTP_200_OK,
    operation_id="searchSimilarOnboardings",
    summary="Find similar onboarded applications",
    description=(
        "Performs a vector-based (or hybrid) similarity search against the "
        "corpus of previously onboarded applications. Returns ranked matches "
        "with reusable observability artifacts (exporters, dashboards, alert "
        "rules, playbooks) and known pitfalls."
    ),
    responses={
        404: {
            "description": "Referenced onboarding request not found",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def search_similar(
    body: SimilaritySearchRequest,
    db: DbSession,
    settings: AppSettings,
) -> SimilaritySearchResponse:
    """Run a similarity search for the given onboarding request."""
    start = time.perf_counter()
    logger.info(
        "similarity_search_requested",
        onboarding_id=str(body.onboarding_request_id),
        app_code=body.app_code,
        tech_stack=body.tech_stack.value,
        hosting_platform=body.hosting_platform.value,
        max_results=body.max_results,
    )

    # ----- Service call placeholder -----
    # In the full implementation this delegates to SimilarityService which
    # queries pgvector embeddings and/or Confluence knowledge via MCP.
    # For now we return an empty but well-typed response.

    SIMILARITY_SEARCHES.inc()

    elapsed_ms = (time.perf_counter() - start) * 1000.0

    logger.info(
        "similarity_search_completed",
        onboarding_id=str(body.onboarding_request_id),
        matches_found=0,
        duration_ms=round(elapsed_ms, 2),
    )

    return SimilaritySearchResponse(
        onboarding_request_id=body.onboarding_request_id,
        matches=[],
        total_matches=0,
        search_strategy="vector",
    )
