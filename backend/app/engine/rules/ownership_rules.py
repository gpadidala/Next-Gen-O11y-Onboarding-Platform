"""Governance rules for alert ownership validation.

Rules
-----
- **GOV-003 AlertOwnerRequired** (HARD) — ``alert_owner_email`` must not be empty.
- **GOV-004 AlertOwnerNotObsTeam** (HARD) — ``alert_owner_email`` must *not* belong to the
  Observability / Platform-Monitoring team.

The Observability team should be an escalation path, not the primary
alert owner.  Application teams must own their own alerts.
"""

from __future__ import annotations

from typing import Any

from app.engine.models import RuleSeverity, Violation
from app.engine.rules.base import BaseRule

# Default prefixes that identify Observability / Platform team mailboxes.
# Can be overridden at construction time.
_DEFAULT_OBS_TEAM_PREFIXES: tuple[str, ...] = (
    "obs-team@",
    "observability@",
    "platform-monitoring@",
)


class AlertOwnerRequired(BaseRule):
    """GOV-003 — An alert owner email address must be provided.

    Rationale: Every onboarded application must have an identifiable
    human or team DL responsible for responding to alerts.
    """

    rule_id: str = "GOV-003"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "An alert owner email address is required."

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        alert_owner: str = (data.get("alert_owner_email") or "").strip()
        if not alert_owner:
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message="Alert owner email is missing or empty.",
                suggestion=(
                    "Provide a valid team or individual email address that will be "
                    "responsible for triaging and responding to alerts."
                ),
            )
        return None


class AlertOwnerNotObsTeam(BaseRule):
    """GOV-004 — Alert owner must *not* be a member of the Observability team.

    The Observability Platform team manages the infrastructure, not
    application-level alerting.  Application teams must self-serve.

    Parameters
    ----------
    obs_team_emails:
        Iterable of email prefixes (e.g. ``"obs-team@"``) that identify
        Observability team mailboxes.  Matching is case-insensitive
        prefix comparison.
    """

    rule_id: str = "GOV-004"
    severity: RuleSeverity = RuleSeverity.HARD
    description: str = "Alert owner must not be the Observability Platform team."

    def __init__(
        self,
        obs_team_emails: tuple[str, ...] | list[str] | None = None,
    ) -> None:
        self._obs_prefixes: tuple[str, ...] = tuple(
            prefix.lower()
            for prefix in (obs_team_emails or _DEFAULT_OBS_TEAM_PREFIXES)
        )

    def evaluate(self, data: dict[str, Any]) -> Violation | None:
        alert_owner: str = (data.get("alert_owner_email") or "").strip().lower()
        if not alert_owner:
            # GOV-003 already covers the empty case.
            return None

        for prefix in self._obs_prefixes:
            if alert_owner.startswith(prefix) or alert_owner == prefix.rstrip("@"):
                return Violation(
                    rule_id=self.rule_id,
                    severity=self.severity,
                    message=(
                        f"Alert owner email '{data.get('alert_owner_email', '')}' belongs to "
                        "the Observability Platform team. Application teams must own their alerts."
                    ),
                    suggestion=(
                        "Assign a team distribution list or individual within the "
                        "application team as the alert owner. The Observability team "
                        "should be an escalation path only."
                    ),
                    context={"matched_prefix": prefix},
                )
        return None
