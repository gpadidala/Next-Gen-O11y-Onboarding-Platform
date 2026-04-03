"""Capacity assessment service."""

from __future__ import annotations

from typing import Any

import structlog

from app.engine.capacity_engine import CapacityEngine
from app.engine.models import (
    CapacityCheckRequest,
    CapacityCheckResponse,
    HostingPlatform,
    TechStack,
    TelemetrySignal,
)
from app.mcp.grafana_client import GrafanaMCPClient
from app.services.notification_service import NotificationService

logger = structlog.get_logger(__name__)


class CapacityService:
    """Wraps the capacity engine and integrates with MCP + notifications."""

    def __init__(
        self,
        grafana_client: GrafanaMCPClient | None = None,
        notification_service: NotificationService | None = None,
    ) -> None:
        self._grafana = grafana_client
        self._notifications = notification_service or NotificationService()
        self._engine = CapacityEngine(grafana_client=grafana_client)

    async def check_capacity(self, data: dict[str, Any]) -> CapacityCheckResponse:
        """Evaluate capacity for a new onboarding request."""
        request = CapacityCheckRequest(
            tech_stack=TechStack(data["tech_stack"]),
            hosting_platform=HostingPlatform(data["hosting_platform"]),
            signals=[TelemetrySignal(s) for s in data.get("telemetry_scope", [])],
            tenant_id=data.get("tenant_id", "default"),
        )

        result = await self._engine.evaluate(request)

        logger.info(
            "capacity_check_complete",
            overall_status=result.overall_status.value,
            can_proceed=result.can_proceed,
        )

        if result.escalation_required:
            await self._notifications.notify_capacity_warning(
                app_name=data.get("app_name", "unknown"),
                app_code=data.get("app_code", "unknown"),
                overall_status=result.overall_status.value,
                details="; ".join(result.recommendations),
            )

        return result

    async def get_current_status(self) -> CapacityCheckResponse:
        """Return a high-level overview of current LGTM utilisation."""
        request = CapacityCheckRequest(
            tech_stack=TechStack.JAVA_SPRING_BOOT,
            hosting_platform=HostingPlatform.AKS,
            signals=[TelemetrySignal.METRICS, TelemetrySignal.LOGS, TelemetrySignal.TRACES],
            tenant_id="default",
        )
        return await self._engine.evaluate(request)
