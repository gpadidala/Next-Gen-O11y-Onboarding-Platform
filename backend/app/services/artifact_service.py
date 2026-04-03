"""Artifact generation service — CR, Jira Epics, Stories, Tasks."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_SIGNAL_STORY_MAP: dict[str, str] = {
    "metrics": "Configure metrics collection for {app_name}",
    "logs": "Set up log ingestion pipeline for {app_name}",
    "traces": "Enable distributed tracing for {app_name}",
    "grafanaDashboards": "Create Grafana dashboards for {app_name}",
    "profiles": "Enable continuous profiling for {app_name}",
    "rum": "Set up Real User Monitoring for {app_name}",
    "faro": "Configure Grafana Faro for {app_name}",
    "dbPlugins": "Deploy database monitoring plugins for {app_name}",
}


class ArtifactService:
    """Generates Change Request and Jira work-item artifacts."""

    async def preview(self, onboarding: dict[str, Any]) -> dict[str, Any]:
        """Generate artifact previews without creating anything externally."""
        return self._build_artifacts(onboarding)

    async def generate(self, onboarding: dict[str, Any]) -> dict[str, Any]:
        """Generate artifacts and (in production) push to Jira/ServiceNow."""
        artifacts = self._build_artifacts(onboarding)
        logger.info(
            "artifacts_generated",
            app_code=onboarding.get("app_code"),
            artifact_count=len(artifacts["artifacts"]),
        )
        return artifacts

    def _build_artifacts(self, data: dict[str, Any]) -> dict[str, Any]:
        app_name = data.get("app_name", "unknown")
        app_code = data.get("app_code", "unknown")
        signals: list[str] = data.get("telemetry_scope", [])
        tech_stack = data.get("tech_stack", "")
        platform = data.get("hosting_platform", "")
        alert_owner = data.get("alert_owner_email", "")
        capacity_summary = data.get("capacity_summary", "Capacity assessment passed.")
        next_window = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")

        cr = {
            "type": "CHANGE_REQUEST",
            "title": f"Observability Onboarding: {app_name} ({app_code})",
            "priority": "Medium",
            "category": "Infrastructure",
            "subcategory": "Observability",
            "environment": "PROD",
            "summary": (
                f"Onboard {app_name} to the LGTM observability stack. "
                f"Signals: {', '.join(signals)}. Platform: {platform}. "
                f"Tech stack: {tech_stack}."
            ),
            "scope": {
                "signals": signals,
                "components": ["alloy-agent", "otel-collector", "grafana-dashboards"],
                "infrastructure_impact": capacity_summary,
            },
            "implementationPlan": (
                f"1. Deploy Alloy agent config for {app_name}\n"
                f"2. Configure exporters ({tech_stack})\n"
                "3. Create Grafana dashboards from templates\n"
                "4. Configure alert rules\n"
                "5. Validate telemetry in all environments"
            ),
            "rollbackPlan": (
                f"1. Remove agent config for {app_name}\n"
                "2. Revert Grafana dashboards\n"
                "3. Disable alert rules\n"
                "4. Verify no orphan resources"
            ),
            "validationSteps": (
                "1. Verify metrics visible in Grafana\n"
                "2. Check log ingestion in Loki\n"
                "3. Confirm traces in Tempo\n"
                "4. Validate alert rules fire correctly"
            ),
            "approvers": ["platform-lead", "capacity-owner"],
            "scheduledDate": next_window,
        }

        epic = {
            "type": "EPIC",
            "project": "OBS",
            "summary": f"Observability Onboarding: {app_name}",
            "description": (
                f"Full observability onboarding for {app_name} ({app_code}). "
                f"Tech stack: {tech_stack}, Platform: {platform}. "
                f"Signals: {', '.join(signals)}."
            ),
            "labels": ["obs-onboarding", tech_stack, platform],
            "components": ["observability-platform"],
        }

        stories: list[dict[str, Any]] = []
        for signal in signals:
            template = _SIGNAL_STORY_MAP.get(signal)
            if not template:
                continue
            story: dict[str, Any] = {
                "type": "STORY",
                "project": "OBS",
                "summary": template.format(app_name=app_name),
                "signal": signal,
                "tasks": [
                    {"summary": f"Agent configuration — {signal}", "assignee": "app-team"},
                    {"summary": f"Exporter deployment — {signal}", "assignee": "app-team"},
                    {"summary": f"Dashboard creation — {signal}", "assignee": "obs-team"},
                    {"summary": f"Alert rule setup — {signal}", "assignee": "app-team"},
                    {"summary": f"Validation — {signal}", "assignee": "app-team"},
                    {"summary": f"Playbook documentation — {signal}", "assignee": "app-team"},
                ],
            }
            stories.append(story)

        ctasks = [
            {
                "type": "CTASK",
                "summary": f"Capacity approval for {app_name}",
                "assignee": "capacity-owner",
            },
            {
                "type": "CTASK",
                "summary": f"Change approval for {app_name}",
                "assignee": "change-board",
            },
        ]

        artifacts = [cr, epic, *stories, *ctasks]
        return {
            "artifacts": artifacts,
            "summary": {
                "cr_count": 1,
                "epic_count": 1,
                "story_count": len(stories),
                "ctask_count": len(ctasks),
                "total": len(artifacts),
            },
        }
