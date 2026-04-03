"""Abstract base MCP client with retry, circuit breaker, and structured logging."""

from __future__ import annotations

import abc
import time
from typing import Any

import aiohttp
import structlog
from tenacity import (
    RetryError,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.utils.exceptions import MCPClientError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


class MCPError:
    """Structured error returned by MCP clients on failure.

    Attributes:
        code: Machine-readable error code (e.g. ``"TIMEOUT"``, ``"CIRCUIT_OPEN"``).
        message: Human-readable description.
        retryable: Whether the caller should consider retrying.
    """

    __slots__ = ("code", "message", "retryable")

    def __init__(self, code: str, message: str, *, retryable: bool = False) -> None:
        self.code = code
        self.message = message
        self.retryable = retryable

    def __repr__(self) -> str:
        return f"MCPError(code={self.code!r}, message={self.message!r}, retryable={self.retryable})"

    def to_dict(self) -> dict[str, Any]:
        return {"code": self.code, "message": self.message, "retryable": self.retryable}


class BaseMCPClient(abc.ABC):
    """Abstract base class for all MCP integration clients.

    Provides:
    * ``aiohttp.ClientSession`` lifecycle management (connect / close / context manager).
    * Retry-aware HTTP helpers with exponential backoff via *tenacity*.
    * A simple circuit breaker that opens after consecutive failures.
    * Structured logging of every request and response (API keys are never logged).

    Subclasses **must** implement :meth:`health_check`.
    """

    # ── Circuit breaker defaults ────────────────────────────────────────
    _CB_FAILURE_THRESHOLD: int = 5
    _CB_RECOVERY_TIMEOUT: float = 60.0  # seconds

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: int = 30,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: aiohttp.ClientSession | None = None

        # Circuit breaker state
        self._failure_count: int = 0
        self._circuit_open: bool = False
        self._circuit_open_until: float = 0.0

        self._log = logger.bind(mcp_client=type(self).__name__, base_url=self._base_url)

    # ── Session lifecycle ───────────────────────────────────────────────

    async def connect(self) -> None:
        """Create the underlying ``aiohttp.ClientSession``."""
        if self._session is not None and not self._session.closed:
            return
        self._session = aiohttp.ClientSession(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=self._timeout,
        )
        self._log.info("mcp_client.session_created")

    async def close(self) -> None:
        """Gracefully close the HTTP session."""
        if self._session is not None and not self._session.closed:
            await self._session.close()
            self._log.info("mcp_client.session_closed")
        self._session = None

    async def __aenter__(self) -> "BaseMCPClient":
        await self.connect()
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> None:
        await self.close()

    # ── Circuit breaker helpers ─────────────────────────────────────────

    def _check_circuit(self) -> None:
        """Raise if the circuit is open and recovery timeout has not elapsed."""
        if not self._circuit_open:
            return
        if time.monotonic() >= self._circuit_open_until:
            # Half-open: allow one request through to test recovery.
            self._log.info(
                "mcp_client.circuit_half_open",
                failure_count=self._failure_count,
            )
            self._circuit_open = False
            self._failure_count = 0
            return
        raise MCPClientError(
            "Circuit breaker is open — upstream service considered unavailable",
            service_name=type(self).__name__,
        )

    def _record_success(self) -> None:
        """Reset failure counter on a successful request."""
        if self._failure_count > 0:
            self._log.info(
                "mcp_client.circuit_reset",
                previous_failures=self._failure_count,
            )
        self._failure_count = 0
        self._circuit_open = False

    def _record_failure(self) -> None:
        """Increment failure counter and trip the circuit if threshold is reached."""
        self._failure_count += 1
        self._log.warning(
            "mcp_client.request_failure",
            failure_count=self._failure_count,
            threshold=self._CB_FAILURE_THRESHOLD,
        )
        if self._failure_count >= self._CB_FAILURE_THRESHOLD:
            self._circuit_open = True
            self._circuit_open_until = time.monotonic() + self._CB_RECOVERY_TIMEOUT
            self._log.error(
                "mcp_client.circuit_opened",
                recovery_timeout_s=self._CB_RECOVERY_TIMEOUT,
            )

    # ── Core HTTP helpers ───────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Execute an HTTP request with retry and circuit breaker.

        Args:
            method: HTTP method (``GET``, ``POST``, ``PUT``, ``DELETE``, ...).
            path: URL path relative to *base_url*.
            **kwargs: Forwarded to ``aiohttp.ClientSession.request``.

        Returns:
            Decoded JSON response body as a dict.

        Raises:
            MCPClientError: On non-2xx responses, timeouts, or circuit-open state.
        """
        self._check_circuit()

        if self._session is None or self._session.closed:
            await self.connect()
        assert self._session is not None  # for type checkers  # noqa: S101

        bound_log = self._log.bind(method=method, path=path)
        bound_log.debug("mcp_client.request_start")

        try:
            response_data = await self._request_with_retry(method, path, **kwargs)
            self._record_success()
            bound_log.debug("mcp_client.request_success")
            return response_data
        except RetryError as exc:
            self._record_failure()
            original = exc.last_attempt.exception() if exc.last_attempt else None
            detail = f"Request failed after retries: {original}" if original else str(exc)
            bound_log.error("mcp_client.request_exhausted_retries", error=detail)
            raise MCPClientError(
                detail,
                service_name=type(self).__name__,
            ) from exc
        except MCPClientError:
            self._record_failure()
            raise
        except Exception as exc:  # noqa: BLE001
            self._record_failure()
            detail = f"Unexpected error: {exc}"
            bound_log.error("mcp_client.request_unexpected_error", error=detail)
            raise MCPClientError(
                detail,
                service_name=type(self).__name__,
            ) from exc

    @retry(
        retry=retry_if_exception_type((aiohttp.ClientError, TimeoutError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        reraise=True,
    )
    async def _request_with_retry(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Inner request method decorated with tenacity retry logic."""
        assert self._session is not None  # noqa: S101

        async with self._session.request(method, path, **kwargs) as resp:
            body = await resp.text()
            self._log.debug(
                "mcp_client.response_received",
                status=resp.status,
                path=path,
                body_length=len(body),
            )
            if resp.status >= 400:
                raise MCPClientError(
                    f"HTTP {resp.status}: {body[:500]}",
                    service_name=type(self).__name__,
                    upstream_status=resp.status,
                )
            return await resp.json(content_type=None)  # type: ignore[no-any-return]

    async def _get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Convenience wrapper for GET requests."""
        return await self._request("GET", path, params=params)

    async def _post(
        self,
        path: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Convenience wrapper for POST requests."""
        return await self._request("POST", path, json=data)

    async def _put(
        self,
        path: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Convenience wrapper for PUT requests."""
        return await self._request("PUT", path, json=data)

    async def _delete(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Convenience wrapper for DELETE requests."""
        return await self._request("DELETE", path, params=params)

    # ── Abstract interface ──────────────────────────────────────────────

    @abc.abstractmethod
    async def health_check(self) -> bool:
        """Return ``True`` if the upstream service is reachable and healthy."""
        ...
