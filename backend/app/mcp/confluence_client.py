"""Confluence MCP client for searching onboarding documentation and runbooks."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import structlog

from app.mcp.base_client import BaseMCPClient, MCPError
from app.utils.exceptions import MCPClientError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


# ── Dataclasses ─────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class ConfluencePage:
    """Lightweight representation of a Confluence page from search results."""

    page_id: str
    title: str
    space_key: str
    url: str
    last_modified: str
    labels: list[str] = field(default_factory=list)
    excerpt: str = ""


@dataclass(frozen=True, slots=True)
class PageContent:
    """Full content of a single Confluence page."""

    page_id: str
    title: str
    space_key: str
    url: str
    body_html: str
    body_plain: str
    version: int
    last_modified: str
    labels: list[str] = field(default_factory=list)


# ── Client ──────────────────────────────────────────────────────────────


class ConfluenceMCPClient(BaseMCPClient):
    """Client for the Confluence MCP server.

    Provides helpers for CQL-based page search, content retrieval,
    label-based filtering, and purpose-built onboarding-pattern lookups.
    """

    async def health_check(self) -> bool:
        """Check Confluence API availability."""
        try:
            data = await self._get("/wiki/rest/api/space", params={"limit": "1"})
            # A valid response with a ``results`` key indicates the API is up.
            return "results" in data
        except MCPClientError:
            logger.warning("confluence.health_check_failed")
            return False

    # ── Search ──────────────────────────────────────────────────────────

    async def search_pages(
        self,
        cql: str,
        limit: int = 10,
    ) -> list[ConfluencePage]:
        """Search Confluence using a CQL query.

        Args:
            cql: Confluence Query Language expression.
            limit: Maximum number of results to return.

        Returns:
            A list of :class:`ConfluencePage` instances.
        """
        data = await self._get(
            "/wiki/rest/api/content/search",
            params={
                "cql": cql,
                "limit": str(limit),
                "expand": "metadata.labels,space",
            },
        )
        return self._parse_search_results(data)

    async def search_by_label(
        self,
        labels: list[str],
    ) -> list[ConfluencePage]:
        """Search for pages matching **all** supplied labels.

        Args:
            labels: List of Confluence label strings.

        Returns:
            Matching pages.
        """
        label_clauses = " AND ".join(f'label = "{label}"' for label in labels)
        cql = f"type = page AND {label_clauses}"
        return await self.search_pages(cql)

    # ── Content retrieval ───────────────────────────────────────────────

    async def get_page_content(self, page_id: str) -> PageContent:
        """Fetch the full rendered and plain-text body of a page.

        Args:
            page_id: Confluence page ID.

        Returns:
            A :class:`PageContent` with both HTML and plain-text bodies.

        Raises:
            MCPClientError: On upstream failure or malformed response.
        """
        data = await self._get(
            f"/wiki/rest/api/content/{page_id}",
            params={
                "expand": "body.storage,body.view,metadata.labels,version,space",
            },
        )
        try:
            labels_raw: list[dict[str, Any]] = (
                data.get("metadata", {}).get("labels", {}).get("results", [])
            )
            return PageContent(
                page_id=str(data["id"]),
                title=str(data["title"]),
                space_key=str(data.get("space", {}).get("key", "")),
                url=self._build_page_url(data),
                body_html=str(
                    data.get("body", {}).get("view", {}).get("value", "")
                ),
                body_plain=str(
                    data.get("body", {}).get("storage", {}).get("value", "")
                ),
                version=int(data.get("version", {}).get("number", 0)),
                last_modified=str(
                    data.get("version", {}).get("when", "")
                ),
                labels=[str(lbl.get("name", "")) for lbl in labels_raw],
            )
        except (KeyError, ValueError, TypeError) as exc:
            raise MCPClientError(
                f"Malformed Confluence page response: {exc}",
                service_name="ConfluenceMCPClient",
            ) from exc

    # ── Onboarding-specific search ──────────────────────────────────────

    async def search_onboarding_patterns(
        self,
        tech_stack: str,
        platform: str,
        signals: list[str],
    ) -> list[ConfluencePage]:
        """Search for onboarding docs, runbooks, and playbooks.

        Builds a CQL query targeting pages that match the given technology
        stack, deployment platform, and observability signals.

        Args:
            tech_stack: Technology identifier (e.g. ``"java-spring"``).
            platform: Deployment platform (e.g. ``"kubernetes"``).
            signals: List of signal types (e.g. ``["metrics", "logs", "traces"]``).

        Returns:
            Relevant Confluence pages sorted by relevance.
        """
        # Build a composite CQL query combining labels and text matching.
        label_terms: list[str] = [
            f'label = "onboarding"',
            f'label = "{tech_stack}"',
            f'label = "{platform}"',
        ]
        for signal in signals:
            label_terms.append(f'label = "{signal}"')

        # Also match pages with relevant text for broader recall.
        text_keywords = " ".join([tech_stack, platform, *signals, "onboarding"])
        label_clause = " AND ".join(label_terms)

        # Try label-based search first (high precision).
        cql_precise = f"type = page AND {label_clause}"
        precise_results = await self.search_pages(cql_precise, limit=10)

        if len(precise_results) >= 3:
            return precise_results

        # Fall back to text-based search for broader recall.
        cql_broad = f'type = page AND text ~ "{text_keywords}"'
        broad_results = await self.search_pages(cql_broad, limit=10)

        # De-duplicate by page ID, preferring precise results.
        seen_ids: set[str] = {page.page_id for page in precise_results}
        combined = list(precise_results)
        for page in broad_results:
            if page.page_id not in seen_ids:
                combined.append(page)
                seen_ids.add(page.page_id)

        return combined

    # ── Internal helpers ────────────────────────────────────────────────

    def _parse_search_results(
        self,
        data: dict[str, Any],
    ) -> list[ConfluencePage]:
        """Parse the Confluence search API response into typed objects."""
        pages: list[ConfluencePage] = []
        results: list[dict[str, Any]] = data.get("results", [])

        for item in results:
            try:
                labels_raw: list[dict[str, Any]] = (
                    item.get("metadata", {}).get("labels", {}).get("results", [])
                )
                pages.append(
                    ConfluencePage(
                        page_id=str(item["id"]),
                        title=str(item.get("title", "")),
                        space_key=str(item.get("space", {}).get("key", "")),
                        url=self._build_page_url(item),
                        last_modified=str(
                            item.get("version", {}).get("when", "")
                        ),
                        labels=[str(lbl.get("name", "")) for lbl in labels_raw],
                        excerpt=str(item.get("excerpt", "")),
                    )
                )
            except (KeyError, ValueError, TypeError):
                logger.warning(
                    "confluence.skipping_malformed_result",
                    item_id=item.get("id"),
                )
                continue

        return pages

    def _build_page_url(self, item: dict[str, Any]) -> str:
        """Construct a full page URL from the ``_links`` section of a result."""
        links = item.get("_links", {})
        web_ui = links.get("webui", "")
        base = links.get("base", self._base_url)
        if web_ui:
            return f"{base}{web_ui}"
        return f"{base}/wiki/spaces/{item.get('space', {}).get('key', '')}/pages/{item.get('id', '')}"
