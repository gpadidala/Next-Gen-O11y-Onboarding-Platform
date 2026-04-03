"""Grafana MCP client for querying LGTM stack usage, limits, and retention."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

from app.mcp.base_client import BaseMCPClient, MCPError
from app.utils.exceptions import MCPClientError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


# ── Dataclasses ─────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class MimirUsage:
    """Mimir (metrics) usage snapshot for a tenant."""

    active_series: int
    ingestion_rate_samples_per_sec: float
    series_limit: int
    ingestion_limit: float


@dataclass(frozen=True, slots=True)
class LokiUsage:
    """Loki (logs) usage snapshot for a tenant."""

    ingestion_rate_bytes_per_sec: float
    stream_count: int
    ingestion_limit: float
    stream_limit: int


@dataclass(frozen=True, slots=True)
class TempoUsage:
    """Tempo (traces) usage snapshot for a tenant."""

    spans_per_sec: float
    storage_growth_rate: float
    spans_limit: float


@dataclass(frozen=True, slots=True)
class PyroscopeUsage:
    """Pyroscope (continuous profiling) usage snapshot for a tenant."""

    series_count: int
    ingestion_rate: float
    series_limit: int


@dataclass(frozen=True, slots=True)
class QueryResultSample:
    """A single sample from a Prometheus query result."""

    metric: dict[str, str]
    value: tuple[float, str]  # (timestamp, value)


@dataclass(frozen=True, slots=True)
class QueryResult:
    """Typed result for a PromQL query."""

    result_type: str  # "vector", "matrix", "scalar", "string"
    samples: list[QueryResultSample] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class RetentionConfig:
    """Retention configuration for a telemetry signal."""

    signal: str
    retention_period: str
    compaction_enabled: bool
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class IngestionLimits:
    """Aggregated ingestion limits across all signals for a tenant."""

    metrics_ingestion_rate: float
    metrics_series_limit: int
    logs_ingestion_rate: float
    logs_stream_limit: int
    traces_spans_limit: float
    profiles_series_limit: int
    raw: dict[str, Any] = field(default_factory=dict)


# ── Client ──────────────────────────────────────────────────────────────


class GrafanaMCPClient(BaseMCPClient):
    """Client for the Grafana MCP server exposing LGTM stack APIs.

    Provides helpers for querying per-tenant usage, ingestion limits,
    retention policies, and raw PromQL execution.
    """

    async def health_check(self) -> bool:
        """Ping ``/api/health`` and return ``True`` when the response is healthy."""
        try:
            data = await self._get("/api/health")
            # Grafana returns {"commit":"...","database":"ok","version":"..."} on success.
            return data.get("database") == "ok" or data.get("status") == "ok"
        except MCPClientError:
            logger.warning("grafana.health_check_failed")
            return False

    # ── Mimir (metrics) ─────────────────────────────────────────────────

    async def get_mimir_usage(self, tenant_id: str) -> MimirUsage:
        """Fetch current Mimir metrics usage for *tenant_id*.

        Returns:
            A populated :class:`MimirUsage` dataclass.

        Raises:
            MCPClientError: On upstream communication failure.
        """
        data = await self._get(
            "/api/v1/mimir/usage",
            params={"tenant_id": tenant_id},
        )
        try:
            return MimirUsage(
                active_series=int(data["active_series"]),
                ingestion_rate_samples_per_sec=float(data["ingestion_rate_samples_per_sec"]),
                series_limit=int(data["series_limit"]),
                ingestion_limit=float(data["ingestion_limit"]),
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed Mimir usage response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc

    # ── Loki (logs) ─────────────────────────────────────────────────────

    async def get_loki_usage(self, tenant_id: str) -> LokiUsage:
        """Fetch current Loki log usage for *tenant_id*."""
        data = await self._get(
            "/api/v1/loki/usage",
            params={"tenant_id": tenant_id},
        )
        try:
            return LokiUsage(
                ingestion_rate_bytes_per_sec=float(data["ingestion_rate_bytes_per_sec"]),
                stream_count=int(data["stream_count"]),
                ingestion_limit=float(data["ingestion_limit"]),
                stream_limit=int(data["stream_limit"]),
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed Loki usage response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc

    # ── Tempo (traces) ──────────────────────────────────────────────────

    async def get_tempo_usage(self, tenant_id: str) -> TempoUsage:
        """Fetch current Tempo trace usage for *tenant_id*."""
        data = await self._get(
            "/api/v1/tempo/usage",
            params={"tenant_id": tenant_id},
        )
        try:
            return TempoUsage(
                spans_per_sec=float(data["spans_per_sec"]),
                storage_growth_rate=float(data["storage_growth_rate"]),
                spans_limit=float(data["spans_limit"]),
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed Tempo usage response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc

    # ── Pyroscope (profiles) ────────────────────────────────────────────

    async def get_pyroscope_usage(self, tenant_id: str) -> PyroscopeUsage:
        """Fetch current Pyroscope profiling usage for *tenant_id*."""
        data = await self._get(
            "/api/v1/pyroscope/usage",
            params={"tenant_id": tenant_id},
        )
        try:
            return PyroscopeUsage(
                series_count=int(data["series_count"]),
                ingestion_rate=float(data["ingestion_rate"]),
                series_limit=int(data["series_limit"]),
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed Pyroscope usage response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc

    # ── PromQL ──────────────────────────────────────────────────────────

    async def query_prometheus(
        self,
        query: str,
        time: str | None = None,
    ) -> QueryResult:
        """Execute a PromQL instant query.

        Args:
            query: PromQL expression string.
            time: Optional evaluation timestamp (RFC-3339 or Unix epoch).

        Returns:
            A typed :class:`QueryResult`.
        """
        params: dict[str, str] = {"query": query}
        if time is not None:
            params["time"] = time

        data = await self._get("/api/v1/query", params=params)

        try:
            result_data: dict[str, Any] = data.get("data", data)
            result_type = str(result_data.get("resultType", "unknown"))
            raw_results: list[dict[str, Any]] = result_data.get("result", [])

            samples: list[QueryResultSample] = []
            for entry in raw_results:
                raw_value = entry.get("value", [0.0, "0"])
                samples.append(
                    QueryResultSample(
                        metric=entry.get("metric", {}),
                        value=(float(raw_value[0]), str(raw_value[1])),
                    )
                )

            return QueryResult(
                result_type=result_type,
                samples=samples,
                raw=data,
            )
        except (KeyError, ValueError, TypeError, IndexError) as exc:
            raise MCPClientError(
                f"Malformed Prometheus query response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc

    # ── Retention ───────────────────────────────────────────────────────

    async def get_retention_config(self, signal: str) -> RetentionConfig:
        """Retrieve the retention configuration for a telemetry signal.

        Args:
            signal: One of ``"metrics"``, ``"logs"``, ``"traces"``, ``"profiles"``.
        """
        data = await self._get(
            "/api/v1/retention",
            params={"signal": signal},
        )
        try:
            return RetentionConfig(
                signal=signal,
                retention_period=str(data["retention_period"]),
                compaction_enabled=bool(data.get("compaction_enabled", False)),
                raw=data,
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed retention config response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc

    # ── Ingestion limits ────────────────────────────────────────────────

    async def get_ingestion_limits(self, tenant_id: str) -> IngestionLimits:
        """Retrieve aggregated ingestion limits for all signals."""
        data = await self._get(
            "/api/v1/limits",
            params={"tenant_id": tenant_id},
        )
        try:
            return IngestionLimits(
                metrics_ingestion_rate=float(data["metrics_ingestion_rate"]),
                metrics_series_limit=int(data["metrics_series_limit"]),
                logs_ingestion_rate=float(data["logs_ingestion_rate"]),
                logs_stream_limit=int(data["logs_stream_limit"]),
                traces_spans_limit=float(data["traces_spans_limit"]),
                profiles_series_limit=int(data["profiles_series_limit"]),
                raw=data,
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed ingestion limits response: {exc}",
                service_name="GrafanaMCPClient",
            ) from exc
