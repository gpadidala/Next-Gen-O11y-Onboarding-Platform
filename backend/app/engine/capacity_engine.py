"""Capacity Engine — evaluates whether the Grafana LGTM stack can absorb
a new application onboarding request.

The engine queries current cluster utilisation via a
:class:`GrafanaMCPClient` dependency, estimates the additional load
based on tech-stack heuristics, and projects post-onboarding usage
against configurable headroom thresholds.

Decision Matrix
---------------
+-----------+--------+------------------------------------+
| Projected | Status | Decision                           |
+-----------+--------+------------------------------------+
| 0-50 %    | GREEN  | Allow                              |
| 50-60 %   | GREEN  | Allow + Add to monitoring watch    |
| 60-70 %   | AMBER  | Allow + Notify platform team       |
| >70 %     | RED    | BLOCK onboarding                   |
+-----------+--------+------------------------------------+
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol, runtime_checkable

from app.engine.models import (
    CapacityCheckRequest,
    CapacityCheckResponse,
    CapacityDecision,
    SignalUsage,
    TechStack,
    TelemetrySignal,
    TrafficLight,
)

logger: logging.Logger = logging.getLogger(__name__)

# ── GrafanaMCPClient Protocol ──────────────────────────────────────────


@runtime_checkable
class GrafanaMCPClient(Protocol):
    """Minimal contract the capacity engine requires from the MCP layer.

    Any object satisfying this protocol can be injected as the
    ``mcp_client`` dependency. The real implementation will live in
    ``app.mcp.grafana_client``.
    """

    async def get_cluster_usage(self, signal: TelemetrySignal) -> ClusterUsageInfo:
        """Return current utilisation for *signal*'s backend cluster."""
        ...


@dataclass(frozen=True)
class ClusterUsageInfo:
    """Snapshot of a backend cluster's current utilisation."""

    signal: TelemetrySignal
    backend: str
    current_used: float
    total_capacity: float
    unit: str

    @property
    def usage_pct(self) -> float:
        if self.total_capacity <= 0:
            return 100.0
        return (self.current_used / self.total_capacity) * 100.0


# ── Signal-to-Backend Mapping ──────────────────────────────────────────

SIGNAL_BACKEND_MAP: dict[TelemetrySignal, tuple[str, str]] = {
    TelemetrySignal.METRICS: ("Mimir", "series"),
    TelemetrySignal.LOGS: ("Loki", "MB/s"),
    TelemetrySignal.TRACES: ("Tempo", "spans/sec"),
    TelemetrySignal.PROFILES: ("Pyroscope", "profiles/sec"),
}

# ── Tech-Stack Estimation Heuristics ───────────────────────────────────
# Per-instance estimated load in native backend units.


@dataclass(frozen=True)
class _SignalEstimate:
    """Estimated per-instance load for a single signal."""

    value: float
    unit: str


# Keyed by (TechStack, TelemetrySignal).
_HEURISTICS: dict[tuple[TechStack, TelemetrySignal], _SignalEstimate] = {
    # JavaSpringBoot (typically on AKS)
    (TechStack.JAVA_SPRING_BOOT, TelemetrySignal.METRICS): _SignalEstimate(500.0, "series"),
    (TechStack.JAVA_SPRING_BOOT, TelemetrySignal.LOGS): _SignalEstimate(2.0, "MB/s"),
    (TechStack.JAVA_SPRING_BOOT, TelemetrySignal.TRACES): _SignalEstimate(100.0, "spans/sec"),
    (TechStack.JAVA_SPRING_BOOT, TelemetrySignal.PROFILES): _SignalEstimate(10.0, "profiles/sec"),
    # DotNet (typically on VM)
    (TechStack.DOTNET, TelemetrySignal.METRICS): _SignalEstimate(300.0, "series"),
    (TechStack.DOTNET, TelemetrySignal.LOGS): _SignalEstimate(1.0, "MB/s"),
    (TechStack.DOTNET, TelemetrySignal.TRACES): _SignalEstimate(50.0, "spans/sec"),
    (TechStack.DOTNET, TelemetrySignal.PROFILES): _SignalEstimate(5.0, "profiles/sec"),
    # NodeJS (typically on AKS)
    (TechStack.NODEJS, TelemetrySignal.METRICS): _SignalEstimate(200.0, "series"),
    (TechStack.NODEJS, TelemetrySignal.LOGS): _SignalEstimate(1.5, "MB/s"),
    (TechStack.NODEJS, TelemetrySignal.TRACES): _SignalEstimate(150.0, "spans/sec"),
    (TechStack.NODEJS, TelemetrySignal.PROFILES): _SignalEstimate(8.0, "profiles/sec"),
    # Python
    (TechStack.PYTHON, TelemetrySignal.METRICS): _SignalEstimate(150.0, "series"),
    (TechStack.PYTHON, TelemetrySignal.LOGS): _SignalEstimate(1.0, "MB/s"),
    (TechStack.PYTHON, TelemetrySignal.TRACES): _SignalEstimate(80.0, "spans/sec"),
    (TechStack.PYTHON, TelemetrySignal.PROFILES): _SignalEstimate(6.0, "profiles/sec"),
    # Go
    (TechStack.GO, TelemetrySignal.METRICS): _SignalEstimate(100.0, "series"),
    (TechStack.GO, TelemetrySignal.LOGS): _SignalEstimate(0.5, "MB/s"),
    (TechStack.GO, TelemetrySignal.TRACES): _SignalEstimate(200.0, "spans/sec"),
    (TechStack.GO, TelemetrySignal.PROFILES): _SignalEstimate(12.0, "profiles/sec"),
}

# Default fallback when tech-stack + signal combo is unknown.
_DEFAULT_ESTIMATES: dict[TelemetrySignal, _SignalEstimate] = {
    TelemetrySignal.METRICS: _SignalEstimate(250.0, "series"),
    TelemetrySignal.LOGS: _SignalEstimate(1.0, "MB/s"),
    TelemetrySignal.TRACES: _SignalEstimate(100.0, "spans/sec"),
    TelemetrySignal.PROFILES: _SignalEstimate(8.0, "profiles/sec"),
}


# ── Decision Logic ─────────────────────────────────────────────────────


def _classify(projected_pct: float) -> tuple[TrafficLight, CapacityDecision]:
    """Map a projected usage percentage to a traffic-light status and decision.

    Decision matrix:
        0-50%  -> GREEN,  ALLOW
        50-60% -> GREEN,  ALLOW_MONITOR
        60-70% -> AMBER,  ALLOW_NOTIFY
        >70%   -> RED,    BLOCK
    """
    if projected_pct <= 50.0:
        return TrafficLight.GREEN, CapacityDecision.ALLOW
    if projected_pct <= 60.0:
        return TrafficLight.GREEN, CapacityDecision.ALLOW_MONITOR
    if projected_pct <= 70.0:
        return TrafficLight.AMBER, CapacityDecision.ALLOW_NOTIFY
    return TrafficLight.RED, CapacityDecision.BLOCK


def project_post_onboarding(
    current_usage_pct: float,
    estimated_new_load: float,
    total_capacity: float,
    *,
    headroom_factor: float = 1.2,
) -> float:
    """Project the post-onboarding usage percentage.

    The *headroom_factor* (default 1.2 = 20 % buffer) inflates the
    estimated new load to account for burst traffic, metric cardinality
    drift, and other unknowns.

    Args:
        current_usage_pct: Current utilisation as a percentage (0-100).
        estimated_new_load: Additional load in native units.
        total_capacity: Total cluster capacity in native units.
        headroom_factor: Multiplier applied to ``estimated_new_load``.

    Returns:
        Projected utilisation as a percentage.
    """
    if total_capacity <= 0:
        return 100.0
    current_used: float = (current_usage_pct / 100.0) * total_capacity
    projected_used: float = current_used + (estimated_new_load * headroom_factor)
    return min((projected_used / total_capacity) * 100.0, 100.0)


# ── Capacity Engine ────────────────────────────────────────────────────


class CapacityEngine:
    """Evaluates whether the Grafana LGTM stack can absorb new telemetry load.

    Parameters
    ----------
    mcp_client:
        An object satisfying the :class:`GrafanaMCPClient` protocol that
        provides live cluster utilisation data.
    headroom_factor:
        Safety multiplier applied to estimated new load.  Default 1.2
        (i.e. 20 % headroom buffer).
    """

    def __init__(
        self,
        mcp_client: GrafanaMCPClient,
        *,
        headroom_factor: float = 1.2,
    ) -> None:
        self._mcp: GrafanaMCPClient = mcp_client
        self._headroom_factor: float = headroom_factor

    # ── Public API ──────────────────────────────────────────────────

    async def evaluate(self, request: CapacityCheckRequest) -> CapacityCheckResponse:
        """Run a full capacity evaluation across all selected signals.

        Args:
            request: The capacity-check request payload.

        Returns:
            A :class:`CapacityCheckResponse` containing per-signal
            results, an overall status, and actionable recommendations.
        """
        signal_results: list[SignalUsage] = []
        all_recommendations: list[str] = []

        for signal in request.selected_signals:
            result = await self._evaluate_signal(request, signal)
            signal_results.append(result)
            all_recommendations.extend(result.recommendations)

        overall_status, overall_decision = self._derive_overall(signal_results)

        # Add high-level recommendations based on overall status.
        all_recommendations.extend(
            self._generate_overall_recommendations(overall_status, overall_decision, signal_results)
        )

        return CapacityCheckResponse(
            app_code=request.app_code,
            overall_status=overall_status,
            overall_decision=overall_decision,
            signal_results=signal_results,
            recommendations=all_recommendations,
            headroom_factor=self._headroom_factor,
            evaluated_at=datetime.now(tz=timezone.utc).isoformat(),
        )

    # ── Signal-level Evaluation ─────────────────────────────────────

    async def _evaluate_signal(
        self,
        request: CapacityCheckRequest,
        signal: TelemetrySignal,
    ) -> SignalUsage:
        """Evaluate capacity for a single telemetry signal."""
        backend_name, unit = SIGNAL_BACKEND_MAP.get(signal, ("Unknown", "units"))

        # Fetch current cluster usage from MCP.
        try:
            cluster_info: ClusterUsageInfo = await self._mcp.get_cluster_usage(signal)
            current_usage_pct = cluster_info.usage_pct
            total_capacity = cluster_info.total_capacity
            current_used = cluster_info.current_used
        except Exception:
            logger.warning(
                "Failed to fetch cluster usage for %s from MCP; falling back to defaults.",
                signal.value,
                exc_info=True,
            )
            # Graceful degradation: assume moderate usage so evaluation can proceed.
            total_capacity = self._default_capacity(signal)
            current_used = total_capacity * 0.45  # Assume 45 % utilisation
            current_usage_pct = 45.0

        # Estimate new load.
        estimated_new_load: float = self._estimate_load(
            request.tech_stack,
            signal,
            request.instance_count,
            custom_override=(
                request.custom_overrides.get(signal)
                if request.custom_overrides
                else None
            ),
        )

        # Project post-onboarding utilisation.
        projected_pct: float = project_post_onboarding(
            current_usage_pct,
            estimated_new_load,
            total_capacity,
            headroom_factor=self._headroom_factor,
        )

        status, decision = _classify(projected_pct)

        # Per-signal recommendations.
        recommendations: list[str] = self._signal_recommendations(
            signal, status, decision, projected_pct, estimated_new_load,
        )

        return SignalUsage(
            signal=signal,
            backend=backend_name,
            current_usage_pct=round(current_usage_pct, 2),
            projected_usage_pct=round(projected_pct, 2),
            estimated_new_load=round(estimated_new_load, 2),
            total_capacity=total_capacity,
            current_used=round(current_used, 2),
            unit=unit,
            status=status,
            decision=decision,
            recommendations=recommendations,
        )

    # ── Estimation Heuristics ───────────────────────────────────────

    def _estimate_load(
        self,
        tech_stack: TechStack,
        signal: TelemetrySignal,
        instance_count: int,
        *,
        custom_override: float | None = None,
    ) -> float:
        """Estimate the additional load a new application will generate.

        If a ``custom_override`` is provided it takes precedence.
        Otherwise, the per-instance heuristic for ``(tech_stack, signal)``
        is looked up and multiplied by ``instance_count``.
        """
        if custom_override is not None and custom_override >= 0:
            return custom_override * instance_count

        estimate: _SignalEstimate = _HEURISTICS.get(
            (tech_stack, signal),
            _DEFAULT_ESTIMATES.get(signal, _SignalEstimate(100.0, "units")),
        )
        return estimate.value * instance_count

    @staticmethod
    def _default_capacity(signal: TelemetrySignal) -> float:
        """Return a sensible default total capacity when MCP is unavailable."""
        defaults: dict[TelemetrySignal, float] = {
            TelemetrySignal.METRICS: 100_000.0,   # 100k series
            TelemetrySignal.LOGS: 50.0,           # 50 MB/s
            TelemetrySignal.TRACES: 10_000.0,     # 10k spans/sec
            TelemetrySignal.PROFILES: 1_000.0,    # 1k profiles/sec
        }
        return defaults.get(signal, 10_000.0)

    # ── Overall Derivation ──────────────────────────────────────────

    @staticmethod
    def _derive_overall(
        signal_results: list[SignalUsage],
    ) -> tuple[TrafficLight, CapacityDecision]:
        """Derive the aggregate status from individual signal results.

        The overall status is the *worst* status across all signals.
        """
        if not signal_results:
            return TrafficLight.GREEN, CapacityDecision.ALLOW

        # Priority: RED > AMBER > GREEN
        status_priority: dict[TrafficLight, int] = {
            TrafficLight.GREEN: 0,
            TrafficLight.AMBER: 1,
            TrafficLight.RED: 2,
        }
        decision_priority: dict[CapacityDecision, int] = {
            CapacityDecision.ALLOW: 0,
            CapacityDecision.ALLOW_MONITOR: 1,
            CapacityDecision.ALLOW_NOTIFY: 2,
            CapacityDecision.BLOCK: 3,
        }

        worst_status: TrafficLight = max(
            (r.status for r in signal_results),
            key=lambda s: status_priority.get(s, 0),
        )
        worst_decision: CapacityDecision = max(
            (r.decision for r in signal_results),
            key=lambda d: decision_priority.get(d, 0),
        )
        return worst_status, worst_decision

    # ── Recommendation Generation ───────────────────────────────────

    @staticmethod
    def _signal_recommendations(
        signal: TelemetrySignal,
        status: TrafficLight,
        decision: CapacityDecision,
        projected_pct: float,
        estimated_new_load: float,
    ) -> list[str]:
        """Generate per-signal recommendations based on the evaluation."""
        recs: list[str] = []

        if decision == CapacityDecision.ALLOW_MONITOR:
            recs.append(
                f"[{signal.value}] Post-onboarding utilisation is projected at "
                f"{projected_pct:.1f}%. Adding to active monitoring watch list."
            )

        if decision == CapacityDecision.ALLOW_NOTIFY:
            recs.append(
                f"[{signal.value}] Projected utilisation ({projected_pct:.1f}%) is in the "
                f"AMBER zone. The platform team will be notified to track capacity."
            )

        if decision == CapacityDecision.BLOCK:
            recs.append(
                f"[{signal.value}] Projected utilisation ({projected_pct:.1f}%) exceeds "
                f"the RED threshold (>70%). Onboarding is BLOCKED for this signal."
            )
            if signal == TelemetrySignal.METRICS:
                recs.append(
                    "[metrics] Consider reducing metric cardinality or using recording "
                    "rules to aggregate high-volume series before onboarding."
                )
            elif signal == TelemetrySignal.LOGS:
                recs.append(
                    "[logs] Consider implementing log-level filtering (e.g. drop DEBUG "
                    "in production) or sampling to reduce ingestion volume."
                )
            elif signal == TelemetrySignal.TRACES:
                recs.append(
                    "[traces] Consider implementing tail-based sampling to reduce "
                    "trace volume while preserving error and latency outliers."
                )

        return recs

    @staticmethod
    def _generate_overall_recommendations(
        overall_status: TrafficLight,
        overall_decision: CapacityDecision,
        signal_results: list[SignalUsage],
    ) -> list[str]:
        """Generate high-level recommendations based on the aggregate result."""
        recs: list[str] = []

        if overall_decision == CapacityDecision.BLOCK:
            blocked_signals: list[str] = [
                r.signal.value for r in signal_results if r.decision == CapacityDecision.BLOCK
            ]
            recs.append(
                f"BLOCKED: Capacity is insufficient for signal(s): "
                f"{', '.join(blocked_signals)}. Contact the Observability Platform team "
                f"to request capacity expansion before re-submitting."
            )

        if overall_status == TrafficLight.AMBER:
            recs.append(
                "AMBER: One or more signals are approaching capacity limits. "
                "Post-onboarding monitoring has been automatically enabled."
            )

        if overall_decision == CapacityDecision.ALLOW and overall_status == TrafficLight.GREEN:
            recs.append(
                "All capacity checks passed. You are clear to proceed with onboarding."
            )

        return recs
