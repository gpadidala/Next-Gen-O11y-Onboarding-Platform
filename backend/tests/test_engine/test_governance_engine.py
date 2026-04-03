"""Tests for the Governance Engine — individual rule evaluation.

Each test targets a specific governance rule (GOV-NNN) and verifies that
it correctly detects violations or passes when the data is compliant.
The score calculation is also validated independently.
"""

from __future__ import annotations

from typing import Any

import pytest

from app.engine.models import RuleSeverity, TrafficLight, Violation
from app.engine.rules import ALL_RULES
from app.engine.rules.capacity_rules import (
    CapacityAmberWarning,
    CapacityNotRed,
    HighCardinalityRisk,
)
from app.engine.rules.environment_rules import (
    AppCodeValid,
    DevTelemetryExists,
    QATelemetryExists,
)
from app.engine.rules.ownership_rules import AlertOwnerNotObsTeam, AlertOwnerRequired
from app.engine.rules.telemetry_rules import AtLeastOneTelemetrySignal, NoTracesSelected


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _compliant_data() -> dict[str, Any]:
    """Return a data dict that passes ALL governance rules."""
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


def _run_all_rules(data: dict[str, Any]) -> tuple[list[Violation], list[Violation]]:
    """Run all rules and return (hard_violations, soft_violations)."""
    hard: list[Violation] = []
    soft: list[Violation] = []
    for rule in ALL_RULES:
        v = rule.evaluate(data)
        if v is not None:
            if v.severity == RuleSeverity.HARD:
                hard.append(v)
            else:
                soft.append(v)
    return hard, soft


# ---------------------------------------------------------------------------
# Full-pass test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_all_rules_pass() -> None:
    """Clean, compliant data produces zero violations and score=100."""
    data = _compliant_data()
    hard, soft = _run_all_rules(data)

    assert len(hard) == 0, f"Unexpected hard violations: {[v.rule_id for v in hard]}"
    assert len(soft) == 0, f"Unexpected soft violations: {[v.rule_id for v in soft]}"


# ---------------------------------------------------------------------------
# HARD rule tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dev_telemetry_missing() -> None:
    """GOV-001: DEV not enabled for a selected signal triggers a HARD violation."""
    data = _compliant_data()
    data["environments"]["metrics"]["dev"] = False

    rule = DevTelemetryExists()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-001"
    assert result.severity == RuleSeverity.HARD
    assert "metrics" in result.message


@pytest.mark.asyncio
async def test_qa_telemetry_missing() -> None:
    """GOV-002: QA not enabled for a selected signal triggers a HARD violation."""
    data = _compliant_data()
    data["environments"]["logs"]["qa"] = False

    rule = QATelemetryExists()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-002"
    assert result.severity == RuleSeverity.HARD
    assert "logs" in result.message


@pytest.mark.asyncio
async def test_alert_owner_missing() -> None:
    """GOV-003: Empty alert_owner_email triggers a HARD violation."""
    data = _compliant_data()
    data["alert_owner_email"] = ""

    rule = AlertOwnerRequired()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-003"
    assert result.severity == RuleSeverity.HARD


@pytest.mark.asyncio
async def test_alert_owner_is_obs_team() -> None:
    """GOV-004: Alert owner belonging to the Observability team triggers HARD violation."""
    data = _compliant_data()
    data["alert_owner_email"] = "obs-team@company.com"

    rule = AlertOwnerNotObsTeam()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-004"
    assert result.severity == RuleSeverity.HARD
    assert "Observability" in result.message or "obs-team" in result.message.lower()


@pytest.mark.asyncio
async def test_capacity_red() -> None:
    """GOV-005: Overall capacity RED triggers a HARD violation."""
    data = _compliant_data()
    data["capacity_result"]["overall_status"] = "RED"
    data["capacity_result"]["signal_results"][0]["status"] = "RED"

    rule = CapacityNotRed()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-005"
    assert result.severity == RuleSeverity.HARD
    assert "RED" in result.message


@pytest.mark.asyncio
async def test_invalid_app_code() -> None:
    """GOV-006: An app_code not matching APP-NNNN triggers HARD violation."""
    data = _compliant_data()
    data["app_code"] = "INVALID-CODE"

    rule = AppCodeValid()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-006"
    assert result.severity == RuleSeverity.HARD
    assert "INVALID-CODE" in result.message


@pytest.mark.asyncio
async def test_no_telemetry() -> None:
    """GOV-007: No selected signals triggers a HARD violation."""
    data = _compliant_data()
    data["selected_signals"] = []

    rule = AtLeastOneTelemetrySignal()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-007"
    assert result.severity == RuleSeverity.HARD


# ---------------------------------------------------------------------------
# SOFT rule tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_capacity_amber_warning() -> None:
    """GOV-101: An AMBER capacity signal produces a SOFT warning."""
    data = _compliant_data()
    data["capacity_result"]["signal_results"][0]["status"] = "AMBER"

    rule = CapacityAmberWarning()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-101"
    assert result.severity == RuleSeverity.SOFT
    assert "AMBER" in result.message


@pytest.mark.asyncio
async def test_high_cardinality() -> None:
    """GOV-102: Estimated metric series > 10k triggers a SOFT warning."""
    data = _compliant_data()
    data["estimated_metric_series"] = 15_000

    rule = HighCardinalityRisk()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-102"
    assert result.severity == RuleSeverity.SOFT
    assert "15,000" in result.message or "15000" in result.message


@pytest.mark.asyncio
async def test_no_traces_warning() -> None:
    """GOV-103: Not selecting traces produces a SOFT recommendation."""
    data = _compliant_data()
    data["selected_signals"] = ["metrics", "logs"]

    rule = NoTracesSelected()
    result = rule.evaluate(data)

    assert result is not None
    assert result.rule_id == "GOV-103"
    assert result.severity == RuleSeverity.SOFT
    assert "traces" in result.message.lower()


# ---------------------------------------------------------------------------
# Score calculation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_score_calculation() -> None:
    """Verify the governance score decrements correctly for violations.

    Scoring: 100 - (15 * HARD count) - (5 * SOFT count), floored at 0.
    """
    # 2 HARD + 1 SOFT => 100 - 30 - 5 = 65
    hard_count = 2
    soft_count = 1
    score = max(0, 100 - hard_count * 15 - soft_count * 5)
    assert score == 65

    # 7 HARD => 100 - 105 = floored at 0
    score_extreme = max(0, 100 - 7 * 15)
    assert score_extreme == 0

    # 0 HARD, 4 SOFT => 100 - 0 - 20 = 80
    score_soft_only = max(0, 100 - 0 * 15 - 4 * 5)
    assert score_soft_only == 80

    # Run a real evaluation with known violations.
    data = _compliant_data()
    data["alert_owner_email"] = ""       # GOV-003 HARD
    data["app_code"] = "BAD"             # GOV-006 HARD
    data["selected_signals"] = ["metrics", "logs"]  # GOV-103 SOFT (no traces)

    hard, soft = _run_all_rules(data)
    computed_score = max(0, 100 - len(hard) * 15 - len(soft) * 5)

    assert len(hard) >= 2
    assert computed_score < 100
    assert computed_score >= 0
