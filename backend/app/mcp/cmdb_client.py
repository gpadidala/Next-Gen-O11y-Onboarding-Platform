"""Company CMDB client — pulls application catalog for sync jobs.

Uses a deterministic in-process mock data set when ``PROBE_USE_MOCK`` is
true (the default in development). In production, swap to real HTTP calls
against the configured ``CMDB_BASE_URL`` with ``CMDB_API_TOKEN``.

Re-map ``CMDB_FIELD_MAP`` to match your upstream CMDB schema without
touching business logic.
"""

from __future__ import annotations

import random
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime, timezone

import structlog

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


# Placeholder mapping from our canonical field names → upstream CMDB column
# names. Integrators should re-map this dict without touching logic.
CMDB_FIELD_MAP: dict[str, str] = {
    "app_code": "u_application_code",
    "app_name": "u_application_name",
    "portfolio": "u_portfolio",
    "sub_portfolio": "u_sub_portfolio",
    "business_criticality": "u_criticality",
    "hosting_platform": "u_hosting_platform",
    "tech_stack": "u_tech_stack",
    "vp_name": "u_vice_president",
    "vp_email": "u_vp_email",
    "director_name": "u_director",
    "manager_name": "u_manager_display_name",
    "manager_email": "u_manager_email",
    "architect_name": "u_solution_architect",
    "architect_email": "u_architect_email",
    "product_owner": "u_product_owner",
    "lob": "u_line_of_business",
    "region": "u_region",
    "owner_name": "u_oncall_name",
    "owner_email": "u_oncall_email",
    "owner_team": "u_oncall_team",
    "cost_center": "u_cost_center",
    "cmdb_id": "sys_id",
}


@dataclass
class CMDBAppPayload:
    """Normalised CMDB application record (what our upsert consumes)."""

    app_code: str
    app_name: str
    portfolio: str
    sub_portfolio: str | None = None
    description: str | None = None
    business_criticality: str | None = None
    hosting_platform: str | None = None
    tech_stack: str | None = None
    vp_name: str | None = None
    vp_email: str | None = None
    director_name: str | None = None
    manager_name: str | None = None
    manager_email: str | None = None
    architect_name: str | None = None
    architect_email: str | None = None
    product_owner: str | None = None
    lob: str | None = None
    region: str | None = None
    owner_name: str | None = None
    owner_email: str | None = None
    owner_team: str | None = None
    cost_center: str | None = None
    environments: list[str] = field(
        default_factory=lambda: ["dev", "qa", "staging", "prod"]
    )
    tags: dict | None = None
    cmdb_id: str | None = None
    cmdb_sync_source: str = "mock-cmdb"
    retired: bool = False


# ── Mock dataset ─────────────────────────────────────────────────────────
# 3 portfolios × 20 apps = 60 apps, spanning 3 VPs.

_PORTFOLIOS: list[tuple[str, str, str, str]] = [
    # (portfolio, vp_name, vp_email, lob)
    ("Digital Banking", "Alice Chen", "alice.chen@bank.com", "Retail Banking"),
    ("Wealth Platform", "Ravi Shankar", "ravi.shankar@bank.com", "Wealth"),
    ("Payments Rails", "Maria Lopez", "maria.lopez@bank.com", "Payments"),
]

_TECH_STACKS = [
    "java_spring",
    "python_fastapi",
    "nodejs_express",
    "go",
    "dotnet",
]
_PLATFORMS = ["eks", "ecs", "lambda", "azure_aks", "gke"]
_REGIONS = ["na", "emea", "apac"]
_CRITICALITY = ["tier_1", "tier_2", "tier_3", "tier_4"]


def _build_mock_dataset() -> list[CMDBAppPayload]:
    """Deterministic mock: 3 portfolios × 20 apps."""
    rng = random.Random(42)
    apps: list[CMDBAppPayload] = []
    app_counter = 1000
    for portfolio, vp_name, vp_email, lob in _PORTFOLIOS:
        for i in range(20):
            app_counter += 1
            code = f"APP-{app_counter}"
            name = f"{portfolio.split()[0]} Service {i + 1}"
            manager_idx = i // 5
            architect_idx = i // 10
            manager_name = f"Manager {portfolio[:3]}{manager_idx}"
            architect_name = f"Architect {portfolio[:3]}{architect_idx}"
            apps.append(
                CMDBAppPayload(
                    app_code=code,
                    app_name=name,
                    portfolio=portfolio,
                    sub_portfolio=f"{portfolio} / Squad {manager_idx + 1}",
                    description=f"{name} owned by {portfolio}.",
                    business_criticality=rng.choice(_CRITICALITY),
                    hosting_platform=rng.choice(_PLATFORMS),
                    tech_stack=rng.choice(_TECH_STACKS),
                    vp_name=vp_name,
                    vp_email=vp_email,
                    director_name=f"Director {portfolio.split()[0]}",
                    manager_name=manager_name,
                    manager_email=(
                        f"{manager_name.lower().replace(' ', '.')}@bank.com"
                    ),
                    architect_name=architect_name,
                    architect_email=(
                        f"{architect_name.lower().replace(' ', '.')}@bank.com"
                    ),
                    product_owner=f"PO-{code}",
                    lob=lob,
                    region=rng.choice(_REGIONS),
                    owner_name=f"Oncall {code}",
                    owner_email=f"oncall-{code.lower()}@bank.com",
                    owner_team=f"{portfolio.split()[0]}-oncall",
                    cost_center=f"CC-{100 + (app_counter % 50)}",
                    environments=["dev", "qa", "qa2", "staging", "prod"],
                    tags={"squad": f"squad-{manager_idx + 1}"},
                    cmdb_id=f"sys_{code}",
                    cmdb_sync_source="mock-cmdb",
                )
            )
    return apps


_MOCK_DATASET = _build_mock_dataset()


class CMDBClient:
    """Company CMDB HTTP client (with mock fallback)."""

    def __init__(self, base_url: str, api_token: str, *, use_mock: bool = True) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_token = api_token
        self._use_mock = use_mock
        self._log = logger.bind(mcp_client="CMDBClient", base_url=self._base_url)

    async def list_applications(
        self, cursor: int | None = None, page_size: int = 500
    ) -> AsyncIterator[CMDBAppPayload]:
        """Yield every application from the CMDB, one page at a time."""
        if self._use_mock:
            for payload in _MOCK_DATASET:
                yield payload
            return
        # Real HTTP flow would paginate /cmdb/v1/applications here.
        raise NotImplementedError("real CMDB transport not configured")

    async def get_application(self, app_code: str) -> CMDBAppPayload | None:
        if self._use_mock:
            for payload in _MOCK_DATASET:
                if payload.app_code == app_code:
                    return payload
            return None
        raise NotImplementedError("real CMDB transport not configured")

    async def list_portfolios(self) -> list[str]:
        if self._use_mock:
            return sorted({p.portfolio for p in _MOCK_DATASET})
        raise NotImplementedError("real CMDB transport not configured")

    async def list_vps(self) -> list[dict]:
        if self._use_mock:
            seen: dict[str, dict] = {}
            for app in _MOCK_DATASET:
                if not app.vp_email:
                    continue
                entry = seen.setdefault(
                    app.vp_email,
                    {"name": app.vp_name, "email": app.vp_email, "portfolios": set()},
                )
                entry["portfolios"].add(app.portfolio)
            return [
                {**e, "portfolios": sorted(e["portfolios"])} for e in seen.values()
            ]
        raise NotImplementedError("real CMDB transport not configured")

    async def health_check(self) -> bool:
        return True
