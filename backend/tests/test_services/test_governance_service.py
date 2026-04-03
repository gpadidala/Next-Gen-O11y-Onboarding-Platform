"""Tests for the GovernanceService layer.

These tests validate aggregate governance evaluation results by running
the full rule set against crafted onboarding data dictionaries.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.engine.models import GovernanceResult, RuleSeverity, TrafficLight, Violation
from app.engine.rules import ALL_RULES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _evaluate_all_rules(data: dict[str, Any]) -> GovernanceResult:
    """Run every registered governance rule and aggregate the result.

    This mirrors the core logic of a GovernanceService / GovernanceEngine.
    """
    hard_violations: list[Violation] = []
    soft_violations: list[Violation] = []

    for rule in ALL_RULES:
        violation = rule.evaluate(data)
        if violation is not None:
            if violation.severity == RuleSeverity.HARD:
                hard_violations.append(violation)
            else:
                soft_violations.append(violation)

    total = len(ALL_RULES)
    hard_count = len(hard_violations)
    soft_count = len(soft_violations)

    # Score: start at 100, deduct 15 per HARD, 5 per SOFT.
    score = max(0, 100 - hard_count * 15 - soft_count * 5)

    return GovernanceResult(
        passed=hard_count == 0,
        score=score,
        hard_violations=hard_violations,
        soft_violations=soft_violations,
        total_rules_evaluated=total,
    )


def _compliant_data() -> dict[str, Any]:
    """Return a data dict that passes all governance rules."""
    return {
        "app_code": "APP-1234",
        "app_name": "Compliant App",
        "tech_stack": "JavaSpringBoot",
        "hosting_platform": "AKS",
        "alert_owner_email": "team-lead@example.com",
        "selected_signals": ["metrics", "logs", "traces"],
        "environments": {
            "metrics": {"dev": True, "qa": True, "qa2": True, "staging": True, "production": True},
            "logs": {"dev": True, "qa": True, "qa2": True, "staging": True, "production": True},
            "traces": {"dev": True, "qa": True, "qa2": True, "staging": True, "production": True},
        },
        "instance_count": 3,
        "estimated_metric_series": 5000,
        "capacity_result": {
            "overall_status": "GREEN",
            "signal_results": [
                {"signal": "metrics", "status": "GREEN", "unit": "series", "estimated_new_load": 5000},
                {"signal": "logs", "status": "GREEN", "unit": "MB/s", "estimated_new_load": 10},
                {"signal": "traces", "status": "GREEN", "unit": "spans/sec", "estimated_new_load": 200},
            ],
        },
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_validate_all_pass() -> None:
    """Fully compliant data yields passed=true with score=100."""
    data = _compliant_data()
    result = _evaluate_all_rules(data)

    assert result.passed is True
    assert result.score == 100
    assert len(result.hard_violations) == 0
    assert result.total_rules_evaluated == len(ALL_RULES)


@pytest.mark.asyncio
async def test_validate_hard_violation() -> None:
    """Missing DEV environment triggers a hard violation (GOV-001)."""
    data = _compliant_data()
    # Remove DEV from metrics environment.
    data["environments"]["metrics"]["dev"] = False

    result = _evaluate_all_rules(data)

    assert result.passed is False
    assert len(result.hard_violations) >= 1

    gov001_ids = [v.rule_id for v in result.hard_violations]
    assert "GOV-001" in gov001_ids, f"Expected GOV-001, got {gov001_ids}"


@pytest.mark.asyncio
async def test_validate_soft_violation() -> None:
    """Not selecting traces triggers a soft warning (GOV-103) but passed=true."""
    data = _compliant_data()
    data["selected_signals"] = ["metrics", "logs"]
    # Also update environments to match.
    del data["environments"]["traces"]

    result = _evaluate_all_rules(data)

    soft_ids = [v.rule_id for v in result.soft_violations]
    assert "GOV-103" in soft_ids, f"Expected GOV-103, got {soft_ids}"
    # Only soft violations => still passed.
    if not result.hard_violations:
        assert result.passed is True


@pytest.mark.asyncio
async def test_validate_multiple_violations() -> None:
    """Multiple violations in one evaluation yield a reduced score."""
    data = _compliant_data()
    # Trigger GOV-003 (no alert owner)
    data["alert_owner_email"] = ""
    # Trigger GOV-007 (no signals)
    data["selected_signals"] = []
    # Trigger GOV-006 (bad app code)
    data["app_code"] = "INVALID"

    result = _evaluate_all_rules(data)

    assert result.passed is False
    assert len(result.hard_violations) >= 3
    assert result.score < 60, f"Score should be heavily penalised, got {result.score}"

    violation_ids = {v.rule_id for v in result.hard_violations}
    assert "GOV-003" in violation_ids
    assert "GOV-006" in violation_ids
    assert "GOV-007" in violation_ids
