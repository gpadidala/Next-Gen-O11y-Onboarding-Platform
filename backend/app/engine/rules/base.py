"""Abstract base class for all governance rules.

Every concrete rule must subclass :class:`BaseRule` and implement the
``evaluate`` method.  Rules are auto-discovered by the governance engine
via the ``ALL_RULES`` registry exported from this package's ``__init__``.
"""

from __future__ import annotations

import abc
from typing import Any

from app.engine.models import RuleSeverity, Violation


class BaseRule(abc.ABC):
    """Contract that every governance rule must satisfy.

    Subclasses **must** set the class-level attributes ``rule_id`` and
    ``severity``, and implement :meth:`evaluate`.

    Attributes:
        rule_id: Unique identifier such as ``"GOV-001"``.
        severity: ``HARD`` (blocks submission) or ``SOFT`` (warning only).
        description: Human-readable explanation of the rule.
    """

    rule_id: str
    severity: RuleSeverity
    description: str = ""

    @abc.abstractmethod
    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        """Evaluate the rule against the supplied onboarding data.

        Args:
            data: A dictionary representation of
                :class:`~app.engine.models.OnboardingData` (plus any
                capacity results injected by the governance engine).

        Returns:
            A :class:`~app.engine.models.Violation` if the rule is
            violated, or ``None`` when the data passes the check.
        """

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} rule_id={self.rule_id!r} severity={self.severity.value}>"
