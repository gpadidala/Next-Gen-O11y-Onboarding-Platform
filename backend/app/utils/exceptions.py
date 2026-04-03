"""Custom exception hierarchy for the Observability Onboarding Platform."""

from __future__ import annotations

from typing import Any


class AppException(Exception):
    """Base exception for all application-specific errors.

    Attributes:
        status_code: HTTP status code to return.
        detail: Human-readable error message.
        error_code: Machine-readable error code for clients.
        extra: Optional dict of additional context.
    """

    status_code: int = 500
    detail: str = "An unexpected error occurred."
    error_code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        detail: str | None = None,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> None:
        if detail is not None:
            self.detail = detail
        if status_code is not None:
            self.status_code = status_code
        if error_code is not None:
            self.error_code = error_code
        self.extra = extra or {}
        super().__init__(self.detail)


class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""

    status_code = 404
    detail = "Resource not found."
    error_code = "NOT_FOUND"


class ValidationError(AppException):
    """Raised when request data fails domain-level validation."""

    status_code = 422
    detail = "Validation failed."
    error_code = "VALIDATION_ERROR"


class CapacityExceededError(AppException):
    """Raised when the capacity check determines resources are exhausted."""

    status_code = 409
    detail = "Capacity limits exceeded."
    error_code = "CAPACITY_EXCEEDED"


class GovernanceViolationError(AppException):
    """Raised when governance rules are violated during submission."""

    status_code = 422
    detail = "Governance policy violation."
    error_code = "GOVERNANCE_VIOLATION"


class MCPClientError(AppException):
    """Raised when an upstream MCP service call fails."""

    status_code = 502
    detail = "MCP service communication failure."
    error_code = "MCP_CLIENT_ERROR"

    def __init__(
        self,
        detail: str | None = None,
        *,
        service_name: str = "unknown",
        upstream_status: int | None = None,
        **kwargs: Any,
    ) -> None:
        extra = kwargs.pop("extra", {}) or {}
        extra["service_name"] = service_name
        if upstream_status is not None:
            extra["upstream_status"] = upstream_status
        super().__init__(detail, extra=extra, **kwargs)
        self.service_name = service_name
        self.upstream_status = upstream_status
