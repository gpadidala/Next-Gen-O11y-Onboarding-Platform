"""Jira MCP client for creating and managing onboarding issues."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

from app.mcp.base_client import BaseMCPClient, MCPError
from app.utils.exceptions import MCPClientError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


# ── Dataclasses ─────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class JiraIssue:
    """Typed representation of a Jira issue."""

    issue_id: str
    key: str
    self_url: str
    summary: str
    issue_type: str
    status: str
    project_key: str
    assignee: str | None = None
    reporter: str | None = None
    priority: str = "Medium"
    labels: list[str] = field(default_factory=list)
    parent_key: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


# ── Client ──────────────────────────────────────────────────────────────


class JiraMCPClient(BaseMCPClient):
    """Client for the Jira MCP server.

    Provides helpers for creating onboarding-related issues (epics, stories,
    tasks, sub-tasks), linking them, and managing transitions.
    """

    async def health_check(self) -> bool:
        """Check Jira API availability by fetching server info."""
        try:
            data = await self._get("/rest/api/2/serverInfo")
            return data.get("state") == "RUNNING" or "serverTitle" in data
        except MCPClientError:
            logger.warning("jira.health_check_failed")
            return False

    # ── Issue creation ──────────────────────────────────────────────────

    async def create_epic(self, payload: dict[str, Any]) -> JiraIssue:
        """Create a Jira Epic.

        Args:
            payload: Jira-compatible issue creation payload. The ``issuetype``
                field will be forced to ``"Epic"``.

        Returns:
            The created :class:`JiraIssue`.
        """
        payload = self._ensure_issue_type(payload, "Epic")
        return await self._create_issue(payload)

    async def create_story(self, payload: dict[str, Any]) -> JiraIssue:
        """Create a Jira Story.

        Args:
            payload: Jira-compatible issue creation payload.
        """
        payload = self._ensure_issue_type(payload, "Story")
        return await self._create_issue(payload)

    async def create_task(self, payload: dict[str, Any]) -> JiraIssue:
        """Create a Jira Task.

        Args:
            payload: Jira-compatible issue creation payload.
        """
        payload = self._ensure_issue_type(payload, "Task")
        return await self._create_issue(payload)

    async def create_subtask(self, payload: dict[str, Any]) -> JiraIssue:
        """Create a Jira Sub-task.

        Args:
            payload: Jira-compatible issue creation payload. Must include
                a ``parent`` field.
        """
        payload = self._ensure_issue_type(payload, "Sub-task")
        return await self._create_issue(payload)

    # ── Issue operations ────────────────────────────────────────────────

    async def link_issues(
        self,
        inward_key: str,
        outward_key: str,
        link_type: str = "Blocks",
    ) -> None:
        """Create a link between two Jira issues.

        Args:
            inward_key: The inward issue key (e.g. ``"OBS-10"``).
            outward_key: The outward issue key (e.g. ``"OBS-11"``).
            link_type: Jira link type name (e.g. ``"Blocks"``, ``"Relates"``).
        """
        await self._post(
            "/rest/api/2/issueLink",
            data={
                "type": {"name": link_type},
                "inwardIssue": {"key": inward_key},
                "outwardIssue": {"key": outward_key},
            },
        )
        logger.info(
            "jira.issues_linked",
            inward=inward_key,
            outward=outward_key,
            link_type=link_type,
        )

    async def transition_issue(
        self,
        issue_key: str,
        transition_id: str,
    ) -> None:
        """Transition an issue to a new status.

        Args:
            issue_key: Jira issue key (e.g. ``"OBS-42"``).
            transition_id: The numeric transition ID.
        """
        await self._post(
            f"/rest/api/2/issue/{issue_key}/transitions",
            data={
                "transition": {"id": transition_id},
            },
        )
        logger.info(
            "jira.issue_transitioned",
            issue_key=issue_key,
            transition_id=transition_id,
        )

    async def get_issue(self, issue_key: str) -> JiraIssue:
        """Fetch a single Jira issue by its key.

        Args:
            issue_key: Jira issue key (e.g. ``"OBS-42"``).

        Returns:
            A populated :class:`JiraIssue`.
        """
        data = await self._get(f"/rest/api/2/issue/{issue_key}")
        return self._parse_issue(data)

    # ── Internal helpers ────────────────────────────────────────────────

    async def _create_issue(self, payload: dict[str, Any]) -> JiraIssue:
        """Shared issue creation logic."""
        data = await self._post("/rest/api/2/issue", data=payload)

        # The create endpoint returns a minimal response: id, key, self.
        # Fetch the full issue to populate all fields.
        issue_key = data.get("key", "")
        if not issue_key:
            raise MCPClientError(
                f"Jira create response missing 'key': {data}",
                service_name="JiraMCPClient",
            )

        logger.info("jira.issue_created", key=issue_key, id=data.get("id"))
        return await self.get_issue(issue_key)

    @staticmethod
    def _ensure_issue_type(
        payload: dict[str, Any],
        issue_type: str,
    ) -> dict[str, Any]:
        """Ensure the payload has the correct issue type set in ``fields``."""
        payload = dict(payload)  # shallow copy to avoid mutating caller's data
        fields = dict(payload.get("fields", {}))
        fields["issuetype"] = {"name": issue_type}
        payload["fields"] = fields
        return payload

    @staticmethod
    def _parse_issue(data: dict[str, Any]) -> JiraIssue:
        """Parse a full Jira issue API response into a :class:`JiraIssue`."""
        fields: dict[str, Any] = data.get("fields", {})
        issue_type_raw = fields.get("issuetype", {})
        status_raw = fields.get("status", {})
        project_raw = fields.get("project", {})
        assignee_raw = fields.get("assignee") or {}
        reporter_raw = fields.get("reporter") or {}
        priority_raw = fields.get("priority") or {}
        parent_raw = fields.get("parent") or {}

        return JiraIssue(
            issue_id=str(data.get("id", "")),
            key=str(data.get("key", "")),
            self_url=str(data.get("self", "")),
            summary=str(fields.get("summary", "")),
            issue_type=str(issue_type_raw.get("name", "")),
            status=str(status_raw.get("name", "")),
            project_key=str(project_raw.get("key", "")),
            assignee=assignee_raw.get("displayName"),
            reporter=reporter_raw.get("displayName"),
            priority=str(priority_raw.get("name", "Medium")),
            labels=list(fields.get("labels", [])),
            parent_key=parent_raw.get("key"),
            raw=data,
        )
