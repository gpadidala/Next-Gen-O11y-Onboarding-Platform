"""Schemas for the live LGTM stack capacity view.

Returned by ``GET /api/v1/capacity/stack``. Each component (Mimir,
Loki, Tempo, Pyroscope) contributes a list of metrics, each metric
carrying min / max / avg / current values over a 1h window plus a
derived utilisation percentage when a limit is known.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ComponentMetric(BaseModel):
    """One measurable capacity metric inside a component."""

    name: str
    display_name: str
    unit: str  # "series", "samples/sec", "MB/s", "%", etc.
    current: float
    min: float
    max: float
    avg: float
    limit: float | None = None
    utilization_pct: float | None = None
    status: Literal["green", "amber", "red", "unknown"] = "green"


class ComponentStack(BaseModel):
    """A single upstream component (Mimir / Loki / Tempo / Pyroscope)."""

    component: str  # "mimir" | "loki" | "tempo" | "pyroscope"
    display_name: str
    source: str  # "mock" or "live"
    base_url: str  # empty string if unconfigured
    use_mock: bool
    is_reachable: bool
    error: str | None = None
    collected_at: datetime
    metrics: list[ComponentMetric] = Field(default_factory=list)


class CapacityStackResponse(BaseModel):
    collected_at: datetime
    components: list[ComponentStack] = Field(default_factory=list)
