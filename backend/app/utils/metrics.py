"""Prometheus metrics and ASGI middleware for request instrumentation."""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from prometheus_client import Counter, Gauge, Histogram
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── Metric Definitions ───────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

REQUESTS_IN_PROGRESS = Gauge(
    "http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["method"],
)

ONBOARDING_SUBMISSIONS = Counter(
    "onboarding_submissions_total",
    "Total onboarding form submissions",
    ["status"],
)

CAPACITY_CHECKS = Counter(
    "capacity_checks_total",
    "Total capacity-check evaluations",
    ["overall_status"],
)

SIMILARITY_SEARCHES = Counter(
    "similarity_searches_total",
    "Total similarity search requests",
)


# ── Middleware ────────────────────────────────────────────────────────────

class PrometheusMiddleware(BaseHTTPMiddleware):
    """Record per-request metrics for every HTTP call."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        method = request.method
        # Normalise path to avoid cardinality explosion on path params
        path = self._normalise_path(request.url.path)

        REQUESTS_IN_PROGRESS.labels(method=method).inc()
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            REQUEST_COUNT.labels(method=method, path=path, status="500").inc()
            raise
        finally:
            elapsed = time.perf_counter() - start
            REQUESTS_IN_PROGRESS.labels(method=method).dec()
            REQUEST_LATENCY.labels(method=method, path=path).observe(elapsed)

        REQUEST_COUNT.labels(method=method, path=path, status=str(response.status_code)).inc()
        return response

    @staticmethod
    def _normalise_path(path: str) -> str:
        """Replace UUID-like or numeric path segments with a placeholder."""
        segments: list[str] = []
        for segment in path.split("/"):
            if not segment:
                segments.append(segment)
                continue
            # Replace UUIDs (8-4-4-4-12 hex) and pure-numeric IDs
            if len(segment) == 36 and segment.count("-") == 4:
                segments.append("{id}")
            elif segment.isdigit():
                segments.append("{id}")
            else:
                segments.append(segment)
        return "/".join(segments)
