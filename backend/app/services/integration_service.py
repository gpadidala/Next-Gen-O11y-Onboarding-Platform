"""IntegrationConfig resolver, seeder, and connectivity tester.

``resolve_integration(session, target)`` is the single entry point for
any code that needs to read an integration's effective base URL / token /
mock flag. It loads the row from ``integration_configs`` if present and
falls back to the static env-var ``Settings`` for targets that haven't
been saved through the Admin UI yet.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import aiohttp
import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.models.integration import IntegrationConfig

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


@dataclass
class ResolvedIntegration:
    """What probes / clients actually consume. Pure data, no ORM baggage."""

    target: str
    display_name: str
    base_url: str
    auth_token: str
    auth_mode: str
    use_mock: bool
    is_enabled: bool
    extra_config: dict[str, Any]


# ── Seed definitions — one row per upstream system ──────────────────────

DEFAULT_INTEGRATIONS: list[dict[str, Any]] = [
    {
        "target": "cmdb",
        "display_name": "Company CMDB",
        "description": (
            "Source-of-truth application catalog. Pulled by the "
            "cmdb_full_sync job every 6 hours."
        ),
        "settings_base_url": "CMDB_BASE_URL",
        "settings_token": "CMDB_API_TOKEN",
        "extra_config": {
            "page_size": 500,
            "field_map_note": "See app.mcp.cmdb_client.CMDB_FIELD_MAP",
        },
    },
    {
        "target": "mimir",
        "display_name": "Grafana Mimir (metrics)",
        "description": "Prometheus-compatible metrics backend.",
        "settings_base_url": "MIMIR_BASE_URL",
        "settings_token": "GRAFANA_API_TOKEN",
        "extra_config": {
            "label_fallbacks": ["app_code", "service", "service_name", "k8s_deployment_name"],
        },
    },
    {
        "target": "loki",
        "display_name": "Grafana Loki (logs)",
        "description": "Log aggregation backend.",
        "settings_base_url": "LOKI_BASE_URL",
        "settings_token": "GRAFANA_API_TOKEN",
        "extra_config": {},
    },
    {
        "target": "tempo",
        "display_name": "Grafana Tempo (traces)",
        "description": "Distributed tracing backend.",
        "settings_base_url": "TEMPO_BASE_URL",
        "settings_token": "GRAFANA_API_TOKEN",
        "extra_config": {},
    },
    {
        "target": "pyroscope",
        "display_name": "Grafana Pyroscope (profiles)",
        "description": "Continuous profiling backend.",
        "settings_base_url": "PYROSCOPE_BASE_URL",
        "settings_token": "GRAFANA_API_TOKEN",
        "extra_config": {},
    },
    {
        "target": "faro",
        "display_name": "Grafana Faro (RUM)",
        "description": "Real User Monitoring collector.",
        "settings_base_url": "FARO_BASE_URL",
        "settings_token": "GRAFANA_API_TOKEN",
        "extra_config": {},
    },
    {
        "target": "grafana",
        "display_name": "Grafana (RBAC / usage)",
        "description": (
            "Grafana HTTP API — used by the RBAC probe to list orgs, "
            "teams, and users."
        ),
        "settings_base_url": "GRAFANA_BASE_URL",
        "settings_token": "GRAFANA_API_TOKEN",
        "extra_config": {
            "usage_source": "api",
            "team_app_map_url": "",
        },
    },
    {
        "target": "blackbox",
        "display_name": "Blackbox exporter (synthetics)",
        "description": "Probes for synthetic URL checks.",
        "settings_base_url": "BLACKBOX_CONFIG_URL",
        "settings_token": None,
        "extra_config": {},
    },
]


# ── Seed / lookup ────────────────────────────────────────────────────────


async def seed_defaults_if_empty(session: AsyncSession) -> int:
    """Idempotent: insert any missing default rows. Returns # inserted.

    Called once on application startup from ``main.lifespan``. Existing
    rows are untouched so operator edits are preserved.
    """
    settings = get_settings()
    existing = {
        row[0]
        for row in (
            await session.execute(select(IntegrationConfig.target))
        ).all()
    }
    inserted = 0
    for spec in DEFAULT_INTEGRATIONS:
        target = spec["target"]
        if target in existing:
            continue
        base_url = getattr(settings, spec["settings_base_url"], "") or ""
        token_setting = spec.get("settings_token")
        token = ""
        if token_setting:
            secret = getattr(settings, token_setting, None)
            if secret is not None:
                token = secret.get_secret_value() if hasattr(secret, "get_secret_value") else str(secret)
        stmt = pg_insert(IntegrationConfig).values(
            target=target,
            display_name=spec["display_name"],
            description=spec.get("description"),
            base_url=base_url,
            auth_token=token or None,
            auth_mode="bearer",
            use_mock=settings.PROBE_USE_MOCK,
            is_enabled=True,
            extra_config=spec.get("extra_config"),
        ).on_conflict_do_nothing(index_elements=["target"])
        await session.execute(stmt)
        inserted += 1
    if inserted:
        logger.info("integration_configs_seeded", count=inserted)
    return inserted


async def _load_row(
    session: AsyncSession, target: str
) -> IntegrationConfig | None:
    return (
        await session.execute(
            select(IntegrationConfig).where(IntegrationConfig.target == target)
        )
    ).scalar_one_or_none()


async def resolve_integration(
    session: AsyncSession, target: str
) -> ResolvedIntegration:
    """Return the effective (base_url, token, use_mock, extra_config) tuple.

    Reads ``integration_configs`` row if present, otherwise materialises
    a ResolvedIntegration from the static env ``Settings``.
    """
    row = await _load_row(session, target)
    settings = get_settings()
    if row is not None:
        return ResolvedIntegration(
            target=row.target,
            display_name=row.display_name,
            base_url=row.base_url or "",
            auth_token=row.auth_token or "",
            auth_mode=row.auth_mode or "bearer",
            use_mock=row.use_mock,
            is_enabled=row.is_enabled,
            extra_config=row.extra_config or {},
        )

    # Fallback — build from env settings.
    spec = next(
        (s for s in DEFAULT_INTEGRATIONS if s["target"] == target), None
    )
    if spec is None:
        raise ValueError(f"Unknown integration target: {target!r}")
    base_url = getattr(settings, spec["settings_base_url"], "") or ""
    token = ""
    token_setting = spec.get("settings_token")
    if token_setting:
        secret = getattr(settings, token_setting, None)
        if secret is not None:
            token = (
                secret.get_secret_value()
                if hasattr(secret, "get_secret_value")
                else str(secret)
            )
    return ResolvedIntegration(
        target=target,
        display_name=spec["display_name"],
        base_url=base_url,
        auth_token=token,
        auth_mode="bearer",
        use_mock=settings.PROBE_USE_MOCK,
        is_enabled=True,
        extra_config=spec.get("extra_config") or {},
    )


# ── Update path ──────────────────────────────────────────────────────────


async def update_integration(
    session: AsyncSession,
    target: str,
    *,
    payload: dict[str, Any],
) -> IntegrationConfig:
    """Apply a partial update.

    ``auth_token`` semantics:
    - missing key → token untouched
    - ``None`` or ``""`` → token cleared
    - any other string → stored verbatim
    """
    row = await _load_row(session, target)
    if row is None:
        raise LookupError(f"Integration {target!r} not found.")
    for key in (
        "display_name",
        "description",
        "base_url",
        "auth_mode",
        "use_mock",
        "is_enabled",
        "extra_config",
    ):
        if key in payload and payload[key] is not None:
            setattr(row, key, payload[key])
    if "auth_token" in payload:
        tok = payload["auth_token"]
        row.auth_token = tok if tok else None
    await session.flush()
    # Refresh so the server-generated updated_at is loaded before the
    # response serialiser touches it (avoids MissingGreenlet on lazy read).
    await session.refresh(row)
    return row


# ── Connectivity test ────────────────────────────────────────────────────


async def test_integration(
    session: AsyncSession, target: str
) -> dict[str, Any]:
    """Attempt a lightweight HEAD/GET against the target and record result."""
    now = datetime.now(timezone.utc)
    row = await _load_row(session, target)
    if row is None:
        raise LookupError(f"Integration {target!r} not found.")

    if row.use_mock:
        row.last_test_at = now
        row.last_test_status = "mock"
        row.last_test_message = (
            "Mock mode enabled — no outbound HTTP call was made."
        )
        await session.flush()
        return {
            "target": target,
            "ok": True,
            "status": "mock",
            "message": row.last_test_message,
            "tested_at": now,
        }

    if not row.base_url:
        row.last_test_at = now
        row.last_test_status = "error"
        row.last_test_message = "base_url is empty"
        await session.flush()
        return {
            "target": target,
            "ok": False,
            "status": "error",
            "message": "base_url is empty",
            "tested_at": now,
        }

    path = _health_path_for(target)
    url = row.base_url.rstrip("/") + path
    headers: dict[str, str] = {}
    if row.auth_token and row.auth_mode == "bearer":
        headers["Authorization"] = f"Bearer {row.auth_token}"

    status_code: int | None = None
    ok = False
    message: str
    try:
        timeout = aiohttp.ClientTimeout(total=5)
        async with aiohttp.ClientSession(timeout=timeout) as http:
            async with http.get(url, headers=headers) as resp:
                status_code = resp.status
                ok = 200 <= resp.status < 500  # auth errors still prove reachability
                message = f"HTTP {resp.status} from {url}"
    except Exception as exc:  # noqa: BLE001
        ok = False
        message = f"{type(exc).__name__}: {exc}"

    row.last_test_at = now
    row.last_test_status = "ok" if ok else "error"
    row.last_test_message = message
    await session.flush()
    return {
        "target": target,
        "ok": ok,
        "status": row.last_test_status,
        "message": message,
        "tested_at": now,
    }


def _health_path_for(target: str) -> str:
    """Per-target health probe path."""
    return {
        "cmdb": "/cmdb/v1/health",
        "mimir": "/api/v1/query?query=up",
        "loki": "/ready",
        "tempo": "/ready",
        "pyroscope": "/api/apps",
        "faro": "/-/ready",
        "grafana": "/api/health",
        "blackbox": "/",
    }.get(target, "/")
