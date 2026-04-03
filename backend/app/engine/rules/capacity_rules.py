"""Governance rules that inspect capacity evaluation results.

Rules
-----
- **GOV-005 CapacityNotRed** (HARD) — Overall capacity must not be RED.
- **GOV-101 CapacityAmberWarning** (SOFT) — Warn if any signal is AMBER.
- **GOV-102 HighCardinalityRisk** (SOFT) — Warn if estimated metric series > 10 000.

These rules expect the governance engine to inject ``capacity_result``
into the data dictionary before evaluation.
"""

from __future__ import annotations

from typing import Any

from app.engine.models import RuleSeverity, TrafficLight, Violation
from app.engine.rules.base import BaseRule

_HIGH_CARDINALITY_THRESHOLD: int = 10_000


class CapacityNotRed(BaseRule):
    """GOV-005 — Onboarding is blocked when overall capacity status is RED.

    A RED capacity status means the Grafana LGTM backend would exceed
    its safe operating threshold if this application were onboarded.
    """

    rule_id: str = "GOV-005"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "Onboarding is blocked when overall capacity status is RED."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        capacity_result: dict[str, Any] | None = data.get("capacity_result")
        if capacity_result is None:
            # No capacity data available — cannot evaluate.
            return None

        overall_status: str = capacity_result.get("overall_status", "")
        if overall_status == TrafficLight.RED.value or overall_status == TrafficLight.RED:
            red_signals: list[str] = [
                sr.get("signal", "unknown")
                for sr in capacity_result.get("signal_results", [])
                if sr.get("status") in (TrafficLight.RED.value, TrafficLight.RED)
            ]
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    "Overall capacity status is RED. One or more backends "
                    "would exceed safe operating thresholds."
                ),
                suggestion=(
                    "Contact the Observability Platform team to discuss capacity expansion "
                    "before submitting this onboarding request. Consider reducing the number "
                    "of telemetry signals or application instances."
                ),
                context={
                    "overall_status": str(overall_status),
                    "red_signals": red_signals,
                },
            )
        return None


class CapacityAmberWarning(BaseRule):
    """GOV-101 — Warn when any individual signal has AMBER capacity status.

    AMBER means the backend is between 60-70% utilisation after
    projected onboarding.  The request is still allowed, but the
    platform team is notified.
    """

    rule_id: str = "GOV-101"
    severity: RuleSeverity = RuleSeverity.SOFT
    description: str = "Warn when any telemetry signal has AMBER capacity status."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        capacity_result: dict[str, Any] | None = data.get("capacity_result")
        if capacity_result is None:
            return None

        amber_signals: list[str] = [
            sr.get("signal", "unknown")
            for sr in capacity_result.get("signal_results", [])
            if sr.get("status") in (TrafficLight.AMBER.value, TrafficLight.AMBER)
        ]

        if amber_signals:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    f"The following signals have AMBER capacity status: "
                    f"{', '.join(amber_signals)}. The platform team will be notified."
                ),
                suggestion=(
                    "Review your telemetry volume estimates and consider whether "
                    "all selected signals are necessary. Monitor post-onboarding "
                    "usage closely."
                ),
                context={"amber_signals": amber_signals},
            )
        return None


class HighCardinalityRisk(BaseRule):
    """GOV-102 — Warn when estimated metric series exceeds threshold.

    High-cardinality metrics can destabilise Mimir and inflate storage
    costs.  The default threshold is 10 000 series.
    """

    rule_id: str = "GOV-102"
    severity: RuleSeverity = RuleSeverity.SOFT
    description: str = (
        f"Warn when estimated metric series exceeds {_HIGH_CARDINALITY_THRESHOLD:,}."
    )

    def __init__(self, threshold: int = _HIGH_CARDINALITY_THRESHOLD) -> None:
        self._threshold: int = threshold

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        estimated: int | None = data.get("estimated_metric_series")
        if estimated is None:
            # Try to extract from capacity result signal results.
            capacity_result: dict[str, Any] | None = data.get("capacity_result")
            if capacity_result:
                for sr in capacity_result.get("signal_results", []):
                    if sr.get("signal") == "metrics" and sr.get("unit") == "series":
                        estimated = int(sr.get("estimated_new_load", 0))
                        break

        if estimated is not None and estimated > self._threshold:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    f"Estimated metric series ({estimated:,}) exceeds the recommended "
                    f"threshold of {self._threshold:,}. High-cardinality metrics risk "
                    "destabilising Mimir."
                ),
                suggestion=(
                    "Review your metrics instrumentation plan. Consider using "
                    "recording rules, reducing label cardinality, or splitting "
                    "the onboarding into multiple phases."
                ),
                context={
                    "estimated_metric_series": estimated,
                    "threshold": self._threshold,
                },
            )
        return None
