"""Governance rule registry.

All concrete rule classes are instantiated once and collected into
:data:`ALL_RULES` so the :class:`~app.engine.governance_engine.GovernanceEngine`
can iterate over them without knowing the individual modules.

To add a new rule:
1. Create a class in the appropriate ``*_rules.py`` module.
2. Import it below and append an instance to :data:`ALL_RULES`.
"""

from __future__ import annotations

from app.engine.rules.base import BaseRule
from app.engine.rules.capacity_rules import (
    CapacityAmberWarning,
    CapacityNotRed,
    HighCardinalityRisk,
)
from app.engine.rules.environment_rules import (
    AppCodeValid,
    DevTelemetryExists,
    MissingQA2Environment,
    QATelemetryExists,
)
from app.engine.rules.ownership_rules import AlertOwnerNotObsTeam, AlertOwnerRequired
from app.engine.rules.telemetry_rules import AtLeastOneTelemetrySignal, NoTracesSelected

# ── Rule Registry ──────────────────────────────────────────────────────
# Ordering mirrors the GOV-NNN numbering scheme.
# HARD rules are evaluated first to enable fast-fail semantics.

ALL_RULES: list[BaseRule] = [
    # HARD rules (GOV-001 .. GOV-007)
    DevTelemetryExists(),          # GOV-001
    QATelemetryExists(),           # GOV-002
    AlertOwnerRequired(),          # GOV-003
    AlertOwnerNotObsTeam(),        # GOV-004
    CapacityNotRed(),              # GOV-005
    AppCodeValid(),                # GOV-006
    AtLeastOneTelemetrySignal(),   # GOV-007
    # SOFT rules (GOV-101 .. GOV-105)
    CapacityAmberWarning(),        # GOV-101
    HighCardinalityRisk(),         # GOV-102
    NoTracesSelected(),            # GOV-103
    MissingQA2Environment(),       # GOV-105
]

__all__: list[str] = [
    "ALL_RULES",
    "BaseRule",
    # Environment rules
    "DevTelemetryExists",
    "QATelemetryExists",
    "AppCodeValid",
    "MissingQA2Environment",
    # Ownership rules
    "AlertOwnerRequired",
    "AlertOwnerNotObsTeam",
    # Capacity rules
    "CapacityNotRed",
    "CapacityAmberWarning",
    "HighCardinalityRisk",
    # Telemetry rules
    "AtLeastOneTelemetrySignal",
    "NoTracesSelected",
]
