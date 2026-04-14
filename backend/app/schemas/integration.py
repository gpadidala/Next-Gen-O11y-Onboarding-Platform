"""IntegrationConfig Pydantic schemas.

Tokens are NEVER returned in API responses — ``auth_token`` is omitted
and replaced with ``has_token: bool``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


INTEGRATION_TARGETS: list[str] = [
    "cmdb",
    "mimir",
    "loki",
    "tempo",
    "pyroscope",
    "faro",
    "grafana",
    "blackbox",
]


class IntegrationConfigRead(BaseModel):
    """Read projection — masks the stored token."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    target: str
    display_name: str
    description: str | None = None
    base_url: str
    auth_mode: str
    has_token: bool = False
    use_mock: bool
    is_enabled: bool
    extra_config: dict[str, Any] | None = None
    last_test_at: datetime | None = None
    last_test_status: str | None = None
    last_test_message: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_row(cls, row: Any) -> "IntegrationConfigRead":
        return cls(
            id=row.id,
            target=row.target,
            display_name=row.display_name,
            description=row.description,
            base_url=row.base_url,
            auth_mode=row.auth_mode,
            has_token=bool(row.auth_token),
            use_mock=row.use_mock,
            is_enabled=row.is_enabled,
            extra_config=row.extra_config,
            last_test_at=row.last_test_at,
            last_test_status=row.last_test_status,
            last_test_message=row.last_test_message,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )


class IntegrationConfigUpdate(BaseModel):
    """Partial update — only provided fields are written.

    Sending ``auth_token = ""`` explicitly clears the stored token.
    Omitting ``auth_token`` leaves the existing value untouched.
    """

    display_name: str | None = None
    description: str | None = None
    base_url: str | None = None
    auth_mode: str | None = None
    auth_token: str | None = None
    use_mock: bool | None = None
    is_enabled: bool | None = None
    extra_config: dict[str, Any] | None = None

    @field_validator("base_url")
    @classmethod
    def _strip_base_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("base_url must start with http:// or https://")
        return v.rstrip("/") or v


class IntegrationTestResult(BaseModel):
    target: str
    ok: bool
    status: str
    message: str
    tested_at: datetime
