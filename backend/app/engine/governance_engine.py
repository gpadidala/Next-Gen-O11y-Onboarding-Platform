"""Governance Engine — enforces organisational policies on onboarding requests.

The engine iterates over a registry of :class:`~app.engine.rules.base.BaseRule`
instances, separating HARD violations (which block submission) from SOFT
violations (which produce warnings and suggestions).

A governance health score is computed as:

    score = max(0, 100 - (20 * hard_count) - (5 * soft_count))
"""

from __future__ import annotations

import logging
from typing import Any

from app.engine.models import (
    CapacityCheckResponse,
    GovernanceResult,
    OnboardingData,
    RuleSeverity,
    Violation,
)
from app.engine.rules import ALL_RULES
from app.engine.rules.base import BaseRule

logger: logging.Logger = logging.getLogger(__name__)

# Scoring constants
_HARD_PENALTY: int = 20
_SOFT_PENALTY: int = 5
_MAX_SCORE: int = 100
_MIN_SCORE: int = 0


class GovernanceEngine:
    """Evaluates governance rules against an onboarding submission.

    Parameters
    ----------
    rules:
        Optional explicit list of rule instances to evaluate.  Defaults
        to the full :data:`~app.engine.rules.ALL_RULES` registry.
    """

    def __init__(self, rules: list[BaseRule] | None = None) -> None:
        self._rules: list[BaseRule] = rules if rules is not None else list(ALL_RULES)

    # ── Public API ──────────────────────────────────────────────────

    def evaluate(
        self,
        onboarding_data: OnboardingData,
        capacity_result: CapacityCheckResponse | None = None,
    ) -> GovernanceResult:
        """Run all governance rules and return an aggregate result.

        Args:
            onboarding_data: The onboarding form data to validate.
            capacity_result: Optional capacity evaluation result.  When
                provided, its contents are injected into the rule data
                dictionary so capacity-dependent rules (GOV-005, GOV-101,
                GOV-102) can function.

        Returns:
            A :class:`GovernanceResult` with pass/fail status, health
            score, and categorised violations.
        """
        data: dict[str, Any] = self._prepare_data(onboarding_data, capacity_result)

        hard_violations: list[Violation] = []
        soft_violations: list[Violation] = []
        total_evaluated: int = 0

        for rule in self._rules:
            total_evaluated += 1
            try:
                violation: Violation | None = rule.evaluate(data)
            except Exception:
                logger.exception(
                    "Rule %s (%s) raised an unexpected exception; treating as non-violation.",
                    rule.rule_id,
                    rule.__class__.__name__,
                )
                continue

            if violation is None:
                continue

            if violation.severity == RuleSeverity.HARD:
                hard_violations.append(violation)
                logger.info(
                    "HARD violation: %s — %s",
                    violation.rule_id,
                    violation.message,
                )
            else:
                soft_violations.append(violation)
                logger.info(
                    "SOFT violation: %s — %s",
                    violation.rule_id,
                    violation.message,
                )

        score: int = self._calculate_score(
            hard_count=len(hard_violations),
            soft_count=len(soft_violations),
        )
        passed: bool = len(hard_violations) == 0

        logger.info(
            "Governance evaluation complete: passed=%s score=%d hard=%d soft=%d rules=%d",
            passed,
            score,
            len(hard_violations),
            len(soft_violations),
            total_evaluated,
        )

        return GovernanceResult(
            passed=passed,
            score=score,
            hard_violations=hard_violations,
            soft_violations=soft_violations,
            total_rules_evaluated=total_evaluated,
        )

    # ── Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _prepare_data(
        onboarding_data: OnboardingData,
        capacity_result: CapacityCheckResponse | None,
    ) -> dict[str, Any]:
        """Flatten onboarding data and capacity result into a single dict.

        Rules receive a plain dictionary rather than typed models so they
        remain decoupled from specific Pydantic schema versions.

        The ``environments`` sub-dict is keyed by signal value string
        (e.g. ``"metrics"``) with plain dicts as values, ensuring rules
        can use simple ``dict.get`` lookups.
        """
        data: dict[str, Any] = onboarding_data.model_dump(mode="python")

        # Normalise selected_signals to plain strings for rule consumption.
        data["selected_signals"] = [
            s.value if hasattr(s, "value") else str(s)
            for s in onboarding_data.selected_signals
        ]

        # Normalise environments keys to plain signal-value strings.
        if onboarding_data.environments:
            normalised_envs: dict[str, dict[str, Any]] = {}
            for sig, env_sel in onboarding_data.environments.items():
                key: str = sig.value if hasattr(sig, "value") else str(sig)
                normalised_envs[key] = (
                    env_sel.model_dump(mode="python")
                    if hasattr(env_sel, "model_dump")
                    else dict(env_sel) if isinstance(env_sel, dict) else {"dev": False, "qa": False}
                )
            data["environments"] = normalised_envs

        # Inject capacity result if available.
        if capacity_result is not None:
            cap_dict: dict[str, Any] = capacity_result.model_dump(mode="python")
            # Normalise nested enums to their string values for rule consumption.
            cap_dict["overall_status"] = (
                capacity_result.overall_status.value
                if hasattr(capacity_result.overall_status, "value")
                else str(capacity_result.overall_status)
            )
            signal_results_normalised: list[dict[str, Any]] = []
            for sr in cap_dict.get("signal_results", []):
                if hasattr(sr.get("signal"), "value"):
                    sr["signal"] = sr["signal"].value
                if hasattr(sr.get("status"), "value"):
                    sr["status"] = sr["status"].value
                signal_results_normalised.append(sr)
            cap_dict["signal_results"] = signal_results_normalised
            data["capacity_result"] = cap_dict

        return data

    @staticmethod
    def _calculate_score(*, hard_count: int, soft_count: int) -> int:
        """Compute the governance health score.

        Formula::

            score = max(0, 100 - 20*hard_count - 5*soft_count)
        """
        raw: int = _MAX_SCORE - (_HARD_PENALTY * hard_count) - (_SOFT_PENALTY * soft_count)
        return max(_MIN_SCORE, min(_MAX_SCORE, raw))
