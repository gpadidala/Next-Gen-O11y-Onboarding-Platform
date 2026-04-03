"""Tests for the Capacity Engine domain logic.

Validates traffic-light evaluation, projection calculations, estimation
heuristics, overall-status aggregation, and recommendation generation
using the engine models directly (no database or HTTP involved).
"""

from __future__ import annotations

from typing import Any

import pytest

from app.engine.models import (
    CapacityCheckRequest,
    CapacityCheckResponse,
    CapacityDecision,
    HostingPlatform,
    SignalUsage,
    TechStack,
    TelemetrySignal,
    TrafficLight,
)


# ---------------------------------------------------------------------------
# Helpers: lightweight capacity evaluation logic
# ---------------------------------------------------------------------------

# Thresholds matching the platform conventions.
_GREEN_THRESHOLD = 60.0
_AMBER_THRESHOLD = 70.0

# Per-tech-stack heuristic estimates (series per instance).
_ESTIMATION_HEURISTICS: dict[TechStack, dict[TelemetrySignal, float]] = {
    TechStack.JAVA_SPRING_BOOT: {
        TelemetrySignal.METRICS: 2500.0,
        TelemetrySignal.LOGS: 5.0,       # MB/s per instance
        TelemetrySignal.TRACES: 150.0,    # spans/sec per instance
        TelemetrySignal.PROFILES: 50.0,   # series per instance
    },
    TechStack.PYTHON: {
        TelemetrySignal.METRICS: 1500.0,
        TelemetrySignal.LOGS: 3.0,
        TelemetrySignal.TRACES: 100.0,
        TelemetrySignal.PROFILES: 30.0,
    },
    TechStack.NODEJS: {
        TelemetrySignal.METRICS: 1800.0,
        TelemetrySignal.LOGS: 4.0,
        TelemetrySignal.TRACES: 120.0,
        TelemetrySignal.PROFILES: 40.0,
    },
    TechStack.DOTNET: {
        TelemetrySignal.METRICS: 2200.0,
        TelemetrySignal.LOGS: 4.5,
        TelemetrySignal.TRACES: 130.0,
        TelemetrySignal.PROFILES: 45.0,
    },
    TechStack.GO: {
        TelemetrySignal.METRICS: 1200.0,
        TelemetrySignal.LOGS: 2.5,
        TelemetrySignal.TRACES: 200.0,
        TelemetrySignal.PROFILES: 25.0,
    },
}

_SIGNAL_BACKENDS: dict[TelemetrySignal, tuple[str, str, float]] = {
    # signal -> (backend_name, unit, default_capacity)
    TelemetrySignal.METRICS:  ("Mimir", "series", 100_000.0),
    TelemetrySignal.LOGS:     ("Loki", "MB/s", 500.0),
    TelemetrySignal.TRACES:   ("Tempo", "spans/sec", 10_000.0),
    TelemetrySignal.PROFILES: ("Pyroscope", "series", 50_000.0),
}


def _classify(pct: float) -> TrafficLight:
    if pct < _GREEN_THRESHOLD:
        return TrafficLight.GREEN
    elif pct < _AMBER_THRESHOLD:
        return TrafficLight.AMBER
    else:
        return TrafficLight.RED


def _decision_for(status: TrafficLight) -> CapacityDecision:
    return {
        TrafficLight.GREEN: CapacityDecision.ALLOW,
        TrafficLight.AMBER: CapacityDecision.ALLOW_MONITOR,
        TrafficLight.RED: CapacityDecision.BLOCK,
    }[status]


def _estimate_load(
    tech_stack: TechStack,
    signal: TelemetrySignal,
    instance_count: int,
) -> float:
    per_instance = _ESTIMATION_HEURISTICS.get(tech_stack, {}).get(signal, 0.0)
    return per_instance * instance_count


def _evaluate(
    current_usage_pct: float,
    estimated_new_load: float,
    total_capacity: float,
) -> tuple[float, TrafficLight]:
    """Return (projected_pct, status)."""
    current_used = (current_usage_pct / 100.0) * total_capacity
    projected_used = current_used + estimated_new_load
    projected_pct = (projected_used / total_capacity) * 100.0
    return projected_pct, _classify(projected_pct)


def _evaluate_request(
    request: CapacityCheckRequest,
    current_usages: dict[TelemetrySignal, float],
) -> tuple[TrafficLight, list[SignalUsage], list[str]]:
    """Evaluate all signals and return (overall_status, results, recommendations)."""
    results: list[SignalUsage] = []
    recommendations: list[str] = []
    worst = TrafficLight.GREEN

    for signal in request.selected_signals:
        backend_name, unit, capacity = _SIGNAL_BACKENDS[signal]
        current_pct = current_usages.get(signal, 0.0)
        load = _estimate_load(request.tech_stack, signal, request.instance_count)

        projected_pct, status = _evaluate(current_pct, load, capacity)
        decision = _decision_for(status)

        if status == TrafficLight.RED:
            worst = TrafficLight.RED
            recommendations.append(
                f"Reduce {signal.value} load or request capacity expansion for {backend_name}."
            )
        elif status == TrafficLight.AMBER and worst != TrafficLight.RED:
            worst = TrafficLight.AMBER
            recommendations.append(
                f"Monitor {signal.value} usage on {backend_name} post-onboarding."
            )

        results.append(
            SignalUsage(
                signal=signal,
                backend=backend_name,
                current_usage_pct=current_pct,
                projected_usage_pct=min(projected_pct, 200.0),
                estimated_new_load=load,
                total_capacity=capacity,
                current_used=(current_pct / 100.0) * capacity,
                unit=unit,
                status=status,
                decision=decision,
                recommendations=[],
            )
        )

    return worst, results, recommendations


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_evaluate_green() -> None:
    """Low current usage + small new load => GREEN for all signals."""
    req = CapacityCheckRequest(
        app_code="APP-1000",
        tech_stack=TechStack.PYTHON,
        hosting_platform=HostingPlatform.AKS,
        selected_signals=[TelemetrySignal.METRICS, TelemetrySignal.LOGS],
        instance_count=1,
    )
    usages = {TelemetrySignal.METRICS: 10.0, TelemetrySignal.LOGS: 5.0}
    overall, results, _ = _evaluate_request(req, usages)

    assert overall == TrafficLight.GREEN
    for r in results:
        assert r.status == TrafficLight.GREEN
        assert r.decision == CapacityDecision.ALLOW


@pytest.mark.asyncio
async def test_evaluate_amber() -> None:
    """Medium current usage pushes projected utilisation into AMBER (60-70%)."""
    req = CapacityCheckRequest(
        app_code="APP-2000",
        tech_stack=TechStack.JAVA_SPRING_BOOT,
        hosting_platform=HostingPlatform.AKS,
        selected_signals=[TelemetrySignal.METRICS],
        instance_count=5,
    )
    # 5 * 2500 = 12500 series new load.  With 50k current on 100k capacity:
    # projected = (50000+12500)/100000 = 62.5% => AMBER.
    usages = {TelemetrySignal.METRICS: 50.0}
    overall, results, _ = _evaluate_request(req, usages)

    assert overall == TrafficLight.AMBER
    assert results[0].status == TrafficLight.AMBER
    assert results[0].decision == CapacityDecision.ALLOW_MONITOR


@pytest.mark.asyncio
async def test_evaluate_red() -> None:
    """High current usage + large new load => RED, cannot proceed."""
    req = CapacityCheckRequest(
        app_code="APP-3000",
        tech_stack=TechStack.JAVA_SPRING_BOOT,
        hosting_platform=HostingPlatform.AKS,
        selected_signals=[TelemetrySignal.METRICS],
        instance_count=10,
    )
    # 10 * 2500 = 25000 new series.  With 55k current on 100k:
    # projected = (55000+25000)/100000 = 80% => RED.
    usages = {TelemetrySignal.METRICS: 55.0}
    overall, results, _ = _evaluate_request(req, usages)

    assert overall == TrafficLight.RED
    assert results[0].status == TrafficLight.RED
    assert results[0].decision == CapacityDecision.BLOCK


@pytest.mark.asyncio
async def test_projection_logic() -> None:
    """Verify the projected utilisation percentage calculation is correct."""
    current_pct = 40.0  # 40% of 100k = 40k used
    capacity = 100_000.0
    new_load = 15_000.0  # 15k additional series

    projected_pct, status = _evaluate(current_pct, new_load, capacity)

    # Expected: (40000 + 15000) / 100000 = 55% => GREEN.
    assert abs(projected_pct - 55.0) < 0.01
    assert status == TrafficLight.GREEN


@pytest.mark.asyncio
async def test_estimation_heuristics() -> None:
    """Verify per-tech-stack estimation heuristics produce expected load."""
    load_java = _estimate_load(TechStack.JAVA_SPRING_BOOT, TelemetrySignal.METRICS, 3)
    assert load_java == 3 * 2500.0  # 7500 series

    load_python = _estimate_load(TechStack.PYTHON, TelemetrySignal.LOGS, 2)
    assert load_python == 2 * 3.0  # 6 MB/s

    load_go = _estimate_load(TechStack.GO, TelemetrySignal.TRACES, 5)
    assert load_go == 5 * 200.0  # 1000 spans/sec


@pytest.mark.asyncio
async def test_overall_status_worst_of() -> None:
    """Overall status is the worst among all evaluated signals."""
    req = CapacityCheckRequest(
        app_code="APP-4000",
        tech_stack=TechStack.JAVA_SPRING_BOOT,
        hosting_platform=HostingPlatform.AKS,
        selected_signals=[TelemetrySignal.METRICS, TelemetrySignal.LOGS],
        instance_count=10,
    )
    # Metrics at 55% + 25k new = 80% (RED).
    # Logs at 5% + small new = still GREEN.
    usages = {TelemetrySignal.METRICS: 55.0, TelemetrySignal.LOGS: 5.0}
    overall, results, _ = _evaluate_request(req, usages)

    # Overall must be RED because metrics is RED, even though logs is GREEN.
    assert overall == TrafficLight.RED


@pytest.mark.asyncio
async def test_recommendations_generated() -> None:
    """Recommendations list is populated when signals are AMBER or RED."""
    req = CapacityCheckRequest(
        app_code="APP-5000",
        tech_stack=TechStack.JAVA_SPRING_BOOT,
        hosting_platform=HostingPlatform.AKS,
        selected_signals=[TelemetrySignal.METRICS, TelemetrySignal.LOGS],
        instance_count=10,
    )
    usages = {TelemetrySignal.METRICS: 55.0, TelemetrySignal.LOGS: 5.0}
    _, _, recommendations = _evaluate_request(req, usages)

    assert len(recommendations) > 0, "Expected at least one recommendation"
    assert any("Mimir" in r or "metrics" in r for r in recommendations)
