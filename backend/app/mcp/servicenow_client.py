"""ServiceNow MCP client for change-request lifecycle management."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

from app.mcp.base_client import BaseMCPClient, MCPError
from app.utils.exceptions import MCPClientError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


# ── Dataclasses ─────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ChangeRequest:
    """Typed representation of a ServiceNow Change Request."""

    sys_id: str
    number: str
    short_description: str
    state: str
    approval: str
    category: str
    priority: str
    assigned_to: str
    opened_by: str
    start_date: str
    end_date: str
    risk: str
    impact: str
    raw: dict[str, Any] = field(default_factory=dict)


# ── Approval state constants ────────────────────────────────────────────

APPROVAL_NOT_YET_REQUESTED = "not yet requested"
APPROVAL_REQUESTED = "requested"
APPROVAL_APPROVED = "approved"
APPROVAL_REJECTED = "rejected"


# ── Client ──────────────────────────────────────────────────────────────


class ServiceNowMCPClient(BaseMCPClient):
    """Client for the ServiceNow MCP server.

    Manages the change-request lifecycle required for production
    observability onboarding: creation, work-note updates, approval
    submission, and status tracking.
    """

    # ServiceNow Table API base path
    _TABLE_PATH = "/api/now/table/change_request"

    async def health_check(self) -> bool:
        """Verify ServiceNow API availability.

        Uses the Table API to fetch a single change request as a
        lightweight connectivity check.
        """
        try:
            data = await self._get(
                self._TABLE_PATH,
                params={"sysparm_limit": "1"},
            )
            return "result" in data
        except MCPClientError:
            logger.warning("servicenow.health_check_failed")
            return False

    # ── Change request CRUD ─────────────────────────────────────────────

    async def create_change_request(
        self,
        payload: dict[str, Any],
    ) -> ChangeRequest:
        """Create a new change request in ServiceNow.

        Args:
            payload: Dict of ServiceNow change-request fields.

        Returns:
            The created :class:`ChangeRequest`.
        """
        data = await self._post(self._TABLE_PATH, data=payload)
        result = data.get("result", data)

        logger.info(
            "servicenow.change_request_created",
            number=result.get("number"),
            sys_id=result.get("sys_id"),
        )
        return self._parse_change_request(result)

    async def get_change_request(self, cr_id: str) -> ChangeRequest:
        """Fetch a change request by its sys_id.

        Args:
            cr_id: The ServiceNow ``sys_id`` of the change request.

        Returns:
            A populated :class:`ChangeRequest`.
        """
        data = await self._get(f"{self._TABLE_PATH}/{cr_id}")
        result = data.get("result", data)
        return self._parse_change_request(result)

    # ── Work notes ──────────────────────────────────────────────────────

    async def add_work_notes(self, cr_id: str, notes: str) -> None:
        """Append work notes to an existing change request.

        Args:
            cr_id: The ServiceNow ``sys_id`` of the change request.
            notes: Free-text work note content to append.
        """
        await self._put(
            f"{self._TABLE_PATH}/{cr_id}",
            data={"work_notes": notes},
        )
        logger.info(
            "servicenow.work_notes_added",
            cr_id=cr_id,
            notes_length=len(notes),
        )

    # ── Approval workflow ───────────────────────────────────────────────

    async def submit_for_approval(self, cr_id: str) -> None:
        """Submit a change request for approval.

        Transitions the approval field to ``"requested"`` and updates
        the state appropriately.

        Args:
            cr_id: The ServiceNow ``sys_id`` of the change request.
        """
        await self._put(
            f"{self._TABLE_PATH}/{cr_id}",
            data={
                "approval": APPROVAL_REQUESTED,
                "state": "-4",  # ServiceNow "Authorize" state
            },
        )
        logger.info("servicenow.submitted_for_approval", cr_id=cr_id)

    async def get_approval_status(self, cr_id: str) -> str:
        """Return the current approval status string for a change request.

        Args:
            cr_id: The ServiceNow ``sys_id`` of the change request.

        Returns:
            Approval status string, e.g. ``"approved"``, ``"rejected"``,
            ``"requested"``, ``"not yet requested"``.
        """
        data = await self._get(
            f"{self._TABLE_PATH}/{cr_id}",
            params={"sysparm_fields": "approval"},
        )
        result = data.get("result", data)
        status = str(result.get("approval", "unknown"))
        logger.info(
            "servicenow.approval_status_fetched",
            cr_id=cr_id,
            approval=status,
        )
        return status

    # ── Internal helpers ────────────────────────────────────────────────

    @staticmethod
    def _parse_change_request(data: dict[str, Any]) -> ChangeRequest:
        """Parse a ServiceNow change-request record into a typed dataclass."""
        return ChangeRequest(
            sys_id=str(data.get("sys_id", "")),
            number=str(data.get("number", "")),
            short_description=str(data.get("short_description", "")),
            state=str(data.get("state", "")),
            approval=str(data.get("approval", "")),
            category=str(data.get("category", "")),
            priority=str(data.get("priority", "")),
            assigned_to=str(
                data.get("assigned_to", {}).get("display_value", "")
                if isinstance(data.get("assigned_to"), dict)
                else data.get("assigned_to", "")
            ),
            opened_by=str(
                data.get("opened_by", {}).get("display_value", "")
                if isinstance(data.get("opened_by"), dict)
                else data.get("opened_by", "")
            ),
            start_date=str(data.get("start_date", "")),
            end_date=str(data.get("end_date", "")),
            risk=str(data.get("risk", "")),
            impact=str(data.get("impact", "")),
            raw=data,
        )
