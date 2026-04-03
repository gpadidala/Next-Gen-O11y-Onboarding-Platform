"""Domain models for the capacity and governance engines.

All models are immutable Pydantic v2 schemas used as value objects
across the engine layer.  They are *not* ORM models — those live in
``app.models``.
"""

from __future__ import annotations

import enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enumerations ────────────────────────────────────────────────────────


class TrafficLight(str, enum.Enum):
    """Capacity status using a traffic-light metaphor."""

    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


class CapacityDecision(str, enum.Enum):
    """Action determined by the capacity engine."""

    ALLOW = "ALLOW"
    ALLOW_MONITOR = "ALLOW_MONITOR"
    ALLOW_NOTIFY = "ALLOW_NOTIFY"
    BLOCK = "BLOCK"


class RuleSeverity(str, enum.Enum):
    """Governance rule severity."""

    HARD = "HARD"
    SOFT = "SOFT"


class TelemetrySignal(str, enum.Enum):
    """Supported telemetry signals mapped to Grafana LGTM backends."""

    METRICS = "metrics"
    LOGS = "logs"
    TRACES = "traces"
    PROFILES = "profiles"


class TechStack(str, enum.Enum):
    """Known technology stacks with estimation heuristics."""

    JAVA_SPRING_BOOT = "JavaSpringBoot"
    DOTNET = "DotNet"
    NODEJS = "NodeJS"
    PYTHON = "Python"
    GO = "Go"


class HostingPlatform(str, enum.Enum):
    """Deployment hosting platform."""

    AKS = "AKS"
    VM = "VM"
    ECS = "ECS"
    ON_PREM = "OnPrem"


# ── Capacity Models ─────────────────────────────────────────────────────


class SignalUsage(BaseModel, frozen=True):
    """Current and projected usage for a single telemetry signal."""

    signal: TelemetrySignal
    backend: str = Field(description="Grafana backend name (e.g. Mimir, Loki)")
    current_usage_pct: float = Field(ge=0.0, le=100.0)
    projected_usage_pct: float = Field(ge=0.0)
    estimated_new_load: float = Field(
        ge=0.0, description="Estimated additional load from this onboarding"
    )
    total_capacity: float = Field(gt=0.0, description="Total capacity in native units")
    current_used: float = Field(ge=0.0, description="Currently used in native units")
    unit: str = Field(description="Native unit (e.g. series, MB/s, spans/sec)")
    status: TrafficLight
    decision: CapacityDecision
    recommendations: list[str] = Field(default_factory=list)


class CapacityCheckRequest(BaseModel, frozen=True):
    """Input payload for a capacity evaluation."""

    app_code: str
    tech_stack: TechStack
    hosting_platform: HostingPlatform
    selected_signals: list[TelemetrySignal]
    instance_count: int = Field(default=1, ge=1, description="Number of application instances")
    custom_overrides: dict[TelemetrySignal, float] | None = Field(
        default=None,
        description="Optional per-signal load overrides (native units)",
    )


class CapacityCheckResponse(BaseModel, frozen=True):
    """Output of a full capacity evaluation across all selected signals."""

    app_code: str
    overall_status: TrafficLight
    overall_decision: CapacityDecision
    signal_results: list[SignalUsage]
    recommendations: list[str] = Field(default_factory=list)
    headroom_factor: float = Field(default=1.2)
    evaluated_at: str = Field(description="ISO-8601 timestamp of evaluation")


# ── Governance Models ───────────────────────────────────────────────────


class Violation(BaseModel, frozen=True):
    """A single governance rule violation."""

    rule_id: str
    severity: RuleSeverity
    message: str
    suggestion: str = ""
    context: dict[str, Any] = Field(default_factory=dict)


class GovernanceResult(BaseModel, frozen=True):
    """Aggregate governance evaluation result."""

    passed: bool = Field(description="True when there are zero HARD violations")
    score: int = Field(ge=0, le=100, description="Governance health score 0-100")
    hard_violations: list[Violation] = Field(default_factory=list)
    soft_violations: list[Violation] = Field(default_factory=list)
    total_rules_evaluated: int = Field(ge=0)


# ── Onboarding Data Transfer Object ────────────────────────────────────


class EnvironmentSelection(BaseModel, frozen=True):
    """Per-signal environment checkboxes."""

    dev: bool = False
    qa: bool = False
    qa2: bool = False
    staging: bool = False
    production: bool = False


class OnboardingData(BaseModel, frozen=True):
    """Flattened view of an onboarding form submission used by the engines.

    This is intentionally decoupled from the API request schema so the
    engine layer remains independent of transport concerns.
    """

    app_code: str
    app_name: str = ""
    tech_stack: TechStack
    hosting_platform: HostingPlatform
    alert_owner_email: str = ""
    selected_signals: list[TelemetrySignal] = Field(default_factory=list)
    environments: dict[TelemetrySignal, EnvironmentSelection] = Field(default_factory=dict)
    instance_count: int = Field(default=1, ge=1)
    estimated_metric_series: int | None = None
    custom_overrides: dict[TelemetrySignal, float] | None = None
    extra: dict[str, Any] = Field(default_factory=dict)
