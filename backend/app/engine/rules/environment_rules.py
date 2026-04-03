"""Governance rules for environment and application-code validation.

Rules
-----
- **GOV-001 DevTelemetryExists** (HARD) — DEV must be checked for every selected signal.
- **GOV-002 QATelemetryExists** (HARD) — QA must be checked for every selected signal.
- **GOV-006 AppCodeValid** (HARD) — ``app_code`` must match ``APP-\\d{4,6}``.
- **GOV-105 MissingQA2Environment** (SOFT) — Recommend enabling QA2 if not checked.
"""

from __future__ import annotations

import re
from typing import Any

from app.engine.models import (
    RuleSeverity,
    Violation,
)
from app.engine.rules.base import BaseRule

_APP_CODE_PATTERN: re.Pattern[str] = re.compile(r"^APP-\d{4,6}$")


class DevTelemetryExists(BaseRule):
    """GOV-001 — DEV environment must be enabled for all selected signals.

    Rationale: Instrumentation should always be validated in a DEV
    environment before promoting to higher tiers.
    """

    rule_id: str = "GOV-001"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "DEV environment must be enabled for every selected telemetry signal."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        selected_signals: list[str] = data.get("selected_signals", [])
        environments: dict[str, Any] = data.get("environments", {})

        missing: list[str] = []
        for signal_value in selected_signals:
            env_sel = environments.get(signal_value)
            if env_sel is None:
                missing.append(signal_value)
                continue
            # Support both dict and EnvironmentSelection
            dev_checked: bool = (
                env_sel.get("dev", False)
                if isinstance(env_sel, dict)
                else getattr(env_sel, "dev", False)
            )
            if not dev_checked:
                missing.append(signal_value)

        if missing:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    f"DEV environment is not enabled for the following signals: "
                    f"{', '.join(missing)}."
                ),
                suggestion="Enable the DEV environment checkbox for all selected telemetry signals.",
                context={"missing_signals": missing},
            )
        return None


class QATelemetryExists(BaseRule):
    """GOV-002 — QA environment must be enabled for all selected signals.

    Rationale: Every signal must be tested in QA before production
    rollout to catch instrumentation issues early.
    """

    rule_id: str = "GOV-002"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "QA environment must be enabled for every selected telemetry signal."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        selected_signals: list[str] = data.get("selected_signals", [])
        environments: dict[str, Any] = data.get("environments", {})

        missing: list[str] = []
        for signal_value in selected_signals:
            env_sel = environments.get(signal_value)
            if env_sel is None:
                missing.append(signal_value)
                continue
            qa_checked: bool = (
                env_sel.get("qa", False)
                if isinstance(env_sel, dict)
                else getattr(env_sel, "qa", False)
            )
            if not qa_checked:
                missing.append(signal_value)

        if missing:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    f"QA environment is not enabled for the following signals: "
                    f"{', '.join(missing)}."
                ),
                suggestion="Enable the QA environment checkbox for all selected telemetry signals.",
                context={"missing_signals": missing},
            )
        return None


class AppCodeValid(BaseRule):
    """GOV-006 — ``app_code`` must conform to ``APP-\\d{4,6}``.

    Rationale: A valid CMDB application code is required to bind
    the onboarding request to a known asset in the enterprise portfolio.
    """

    rule_id: str = "GOV-006"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "Application code must match the pattern APP-NNNN (4-6 digits)."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        app_code: str = data.get("app_code", "")
        if not app_code or not _APP_CODE_PATTERN.match(app_code):
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=f"Invalid application code: {app_code!r}. Expected format APP-NNNN (4-6 digits).",
                suggestion=(
                    "Provide a valid CMDB application code matching the pattern APP-NNNN, "
                    "where NNNN is 4 to 6 digits (e.g. APP-1234, APP-567890)."
                ),
                context={"app_code": app_code},
            )
        return None


class MissingQA2Environment(BaseRule):
    """GOV-105 — Recommend enabling QA2 environment if not checked.

    QA2 is an optional but recommended pre-production environment that
    provides an additional validation gate.
    """

    rule_id: str = "GOV-105"
    severity: RuleSeverity = RuleSeverity.SOFT
    description: str = "Recommend enabling QA2 environment for additional validation."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        selected_signals: list[str] = data.get("selected_signals", [])
        environments: dict[str, Any] = data.get("environments", {})

        if not selected_signals:
            return None

        signals_missing_qa2: list[str] = []
        for signal_value in selected_signals:
            env_sel = environments.get(signal_value)
            if env_sel is None:
                signals_missing_qa2.append(signal_value)
                continue
            qa2_checked: bool = (
                env_sel.get("qa2", False)
                if isinstance(env_sel, dict)
                else getattr(env_sel, "qa2", False)
            )
            if not qa2_checked:
                signals_missing_qa2.append(signal_value)

        if signals_missing_qa2:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message=(
                    f"QA2 environment is not enabled for: {', '.join(signals_missing_qa2)}. "
                    "Consider adding QA2 as an additional validation gate."
                ),
                suggestion=(
                    "Enable the QA2 environment checkbox for a more robust "
                    "pre-production validation pipeline."
                ),
                context={"signals_missing_qa2": signals_missing_qa2},
            )
        return None
