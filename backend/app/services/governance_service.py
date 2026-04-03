"""Governance validation service."""

from __future__ import annotations

from typing import Any

import structlog

from app.engine.governance_engine import GovernanceEngine
from app.engine.models import GovernanceResult, OnboardingData, TrafficLight
from app.engine.rules import ALL_RULES

logger = structlog.get_logger(__name__)


class GovernanceService:
    """Validates onboarding requests against organisational governance rules."""

    def __init__(self) -> None:
        self._engine = GovernanceEngine(rules=ALL_RULES)

    async def validate(self, data: dict[str, Any]) -> GovernanceResult:
        """Run full governance validation on the supplied onboarding data."""
        onboarding = OnboardingData(**data)

        capacity_status: TrafficLight | None = None
        if "capacity_overall_status" in data:
            capacity_status = TrafficLight(data["capacity_overall_status"])

        result = self._engine.evaluate(onboarding, capacity_status=capacity_status)

        logger.info(
            "governance_validation_complete",
            passed=result.passed,
            score=result.score,
            hard_count=len(result.hard_violations),
            soft_count=len(result.soft_violations),
        )
        return result

    def list_rules(self) -> list[dict[str, str]]:
        """Return metadata for every registered governance rule."""
        return [
            {
                "rule_id": rule.rule_id,
                "description": rule.description,
                "severity": rule.severity.value,
            }
            for rule in ALL_RULES
        ]
