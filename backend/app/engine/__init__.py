"""Engine layer — capacity evaluation and governance enforcement.

Public API
----------
- :class:`CapacityEngine` — evaluates LGTM stack capacity for a new onboarding.
- :class:`GovernanceEngine` — enforces organisational governance rules.
- :mod:`app.engine.models` — shared domain models (enums, DTOs, value objects).
- :mod:`app.engine.rules` — individual governance rule implementations.
"""

from __future__ import annotations

from app.engine.capacity_engine import CapacityEngine, ClusterUsageInfo, GrafanaMCPClient
from app.engine.governance_engine import GovernanceEngine
from app.engine.models import (
    CapacityCheckRequest,
    CapacityCheckResponse,
    CapacityDecision,
    EnvironmentSelection,
    GovernanceResult,
    HostingPlatform,
    OnboardingData,
    RuleSeverity,
    SignalUsage,
    TechStack,
    TelemetrySignal,
    TrafficLight,
    Violation,
)

__all__: list[str] = [
    # Engines
    "CapacityEngine",
    "GovernanceEngine",
    # Protocols / dataclasses
    "GrafanaMCPClient",
    "ClusterUsageInfo",
    # Models
    "CapacityCheckRequest",
    "CapacityCheckResponse",
    "CapacityDecision",
    "EnvironmentSelection",
    "GovernanceResult",
    "HostingPlatform",
    "OnboardingData",
    "RuleSeverity",
    "SignalUsage",
    "TechStack",
    "TelemetrySignal",
    "TrafficLight",
    "Violation",
]
