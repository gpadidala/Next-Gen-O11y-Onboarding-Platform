"""Lookup / reference-data endpoints.

Provides enumeration values and reference lists used by the frontend to
populate dropdowns and selection controls in the onboarding wizard.
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from sqlalchemy import distinct, select

from app.api.deps import DbSession
from app.models.application import ApplicationMetadata
from app.schemas.common import HostingPlatform, TechStack

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["lookup"])


# -- Response Schemas -----------------------------------------------------


class PortfolioListResponse(BaseModel):
    """List of unique portfolio names."""

    portfolios: list[str] = Field(
        default_factory=list,
        description="Distinct portfolio names from the application catalog.",
    )


class EnumListResponse(BaseModel):
    """Generic list of enum label/value pairs."""

    items: list[EnumItem] = Field(default_factory=list)


class EnumItem(BaseModel):
    """A single enum value for use in frontend dropdowns."""

    value: str = Field(description="Enum value (sent in API requests)")
    label: str = Field(description="Human-readable label for display")


# Rebuild model to resolve forward reference
EnumListResponse.model_rebuild()


# -- Endpoints ------------------------------------------------------------


@router.get(
    "/portfolios",
    response_model=PortfolioListResponse,
    status_code=status.HTTP_200_OK,
    operation_id="listPortfolios",
    summary="List portfolio names",
    description=(
        "Returns a deduplicated, alphabetically sorted list of portfolio "
        "names sourced from the application metadata catalog (CMDB sync)."
    ),
)
async def list_portfolios(db: DbSession) -> PortfolioListResponse:
    """Return distinct portfolio names from the application catalog."""
    logger.debug("list_portfolios")

    stmt = (
        select(distinct(ApplicationMetadata.portfolio))
        .where(ApplicationMetadata.retired == False)  # noqa: E712
        .order_by(ApplicationMetadata.portfolio)
    )
    result = await db.execute(stmt)
    portfolios = [row[0] for row in result.all() if row[0] is not None]

    logger.debug("portfolios_fetched", count=len(portfolios))
    return PortfolioListResponse(portfolios=portfolios)


@router.get(
    "/tech-stacks",
    response_model=EnumListResponse,
    status_code=status.HTTP_200_OK,
    operation_id="listTechStacks",
    summary="List supported technology stacks",
    description="Returns all supported TechStack enum values with labels.",
)
async def list_tech_stacks() -> EnumListResponse:
    """Return all TechStack enum values."""
    logger.debug("list_tech_stacks")
    items = [
        EnumItem(value=member.value, label=_enum_label(member.name))
        for member in TechStack
    ]
    return EnumListResponse(items=items)


@router.get(
    "/platforms",
    response_model=EnumListResponse,
    status_code=status.HTTP_200_OK,
    operation_id="listHostingPlatforms",
    summary="List supported hosting platforms",
    description="Returns all supported HostingPlatform enum values with labels.",
)
async def list_hosting_platforms() -> EnumListResponse:
    """Return all HostingPlatform enum values."""
    logger.debug("list_hosting_platforms")
    items = [
        EnumItem(value=member.value, label=_enum_label(member.name))
        for member in HostingPlatform
    ]
    return EnumListResponse(items=items)


# -- Internal Helpers -----------------------------------------------------


def _enum_label(name: str) -> str:
    """Convert an UPPER_SNAKE_CASE enum member name to Title Case.

    Examples:
        ``"JAVA_SPRING"``  -> ``"Java Spring"``
        ``"AZURE_AKS"``    -> ``"Azure Aks"``
        ``"ON_PREM"``      -> ``"On Prem"``
    """
    return name.replace("_", " ").title()
