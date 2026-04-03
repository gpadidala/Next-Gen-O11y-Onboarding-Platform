"""Governance rules for telemetry signal selection.

Rules
-----
- **GOV-007 AtLeastOneTelemetrySignal** (HARD) — At least one signal must be selected.
- **GOV-103 NoTracesSelected** (SOFT) — Recommend enabling traces for better observability.
"""

from __future__ import annotations

from typing import Any

from app.engine.models import RuleSeverity, TelemetrySignal, Violation
from app.engine.rules.base import BaseRule


class AtLeastOneTelemetrySignal(BaseRule):
    """GOV-007 — At least one telemetry signal must be selected.

    An onboarding request with zero selected signals is invalid: there
    would be nothing to provision on the Grafana LGTM stack.
    """

    rule_id: str = "GOV-007"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "At least one telemetry signal must be selected."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        selected: list[str] = data.get("selected_signals", [])
        if not selected:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message="No telemetry signals are selected. At least one is required.",
                suggestion=(
                    "Select at least one telemetry signal (metrics, logs, traces, or profiles) "
                    "to proceed with onboarding."
                ),
            )
        return None


class NoTracesSelected(BaseRule):
    """GOV-103 — Recommend enabling traces for improved observability.

    Distributed tracing via Tempo is a key pillar of the observability
    stack.  If traces are not selected, we gently nudge the user.
    """

    rule_id: str = "GOV-103"
    severity: RuleSeverity = RuleSeverity.SOFT
    description: str = "Recommend enabling distributed traces for better observability."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        selected: list[str] = data.get("selected_signals", [])
        if not selected:
            # GOV-007 will catch the empty case.
            return None

        traces_value: str = TelemetrySignal.TRACES.value
        has_traces: bool = any(
            s == traces_value or s == TelemetrySignal.TRACES
            for s in selected
        )

        if not has_traces:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    "Distributed traces are not selected. Traces provide critical "
                    "end-to-end request visibility and are recommended for all applications."
                ),
                suggestion=(
                    "Consider enabling the 'traces' signal to instrument distributed "
                    "tracing via Grafana Tempo. This significantly improves root-cause "
                    "analysis and service dependency mapping."
                ),
                context={"selected_signals": selected},
            )
        return None
