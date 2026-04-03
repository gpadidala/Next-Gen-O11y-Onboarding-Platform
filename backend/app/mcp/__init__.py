"""MCP integration clients for the Observability Onboarding Platform.

Public API
----------
* :class:`BaseMCPClient` -- abstract base with retry, circuit breaker, logging.
* :class:`GrafanaMCPClient` -- Grafana / LGTM stack usage & queries.
* :class:`ConfluenceMCPClient` -- Confluence documentation search.
* :class:`JiraMCPClient` -- Jira issue lifecycle management.
* :class:`ServiceNowMCPClient` -- ServiceNow change-request workflow.
* :class:`MCPError` -- structured error descriptor.
"""

from app.mcp.base_client import BaseMCPClient, MCPError
from app.mcp.confluence_client import ConfluenceMCPClient, ConfluencePage, PageContent
from app.mcp.grafana_client import (
    GrafanaMCPClient,
    IngestionLimits,
    LokiUsage,
    MimirUsage,
    PyroscopeUsage,
    QueryResult,
    QueryResultSample,
    RetentionConfig,
    TempoUsage,
)
from app.mcp.jira_client import JiraIssue, JiraMCPClient
from app.mcp.servicenow_client import ChangeRequest, ServiceNowMCPClient

__all__ = [
    # Base
    "BaseMCPClient",
    "MCPError",
    # Grafana
    "GrafanaMCPClient",
    "MimirUsage",
    "LokiUsage",
    "TempoUsage",
    "PyroscopeUsage",
    "QueryResult",
    "QueryResultSample",
    "RetentionConfig",
    "IngestionLimits",
    # Confluence
    "ConfluenceMCPClient",
    "ConfluencePage",
    "PageContent",
    # Jira
    "JiraMCPClient",
    "JiraIssue",
    # ServiceNow
    "ServiceNowMCPClient",
    "ChangeRequest",
]
