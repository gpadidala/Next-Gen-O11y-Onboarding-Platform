# MCP Integration Guide

## Overview

The platform integrates with four external systems via MCP (Model Context Protocol) server clients:

1. **Grafana** — LGTM stack usage data and PromQL queries
2. **Confluence** — Historical onboarding documentation search
3. **Jira** — Work item creation and lifecycle management
4. **ServiceNow** — Change Request creation and approval

## Base Client Pattern

All MCP clients extend `BaseMCPClient` which provides:

- **Retry logic**: 3 retries with exponential backoff (via tenacity)
- **Circuit breaker**: Opens after 5 consecutive failures, recovers after 60s
- **Structured logging**: All requests/responses logged (API keys sanitised)
- **Error typing**: `MCPError` with code, message, and retryable flag
- **Context manager**: `async with` support for session lifecycle

## Grafana MCP Client

Provides capacity data for the LGTM stack:

```python
async with GrafanaMCPClient(url, api_key) as client:
    mimir = await client.get_mimir_usage("default")
    loki = await client.get_loki_usage("default")
    result = await client.query_prometheus("sum(up)")
```

## Confluence MCP Client

Searches historical onboarding patterns:

```python
async with ConfluenceMCPClient(url, api_key) as client:
    patterns = await client.search_onboarding_patterns(
        tech_stack="JavaSpringBoot",
        platform="AKS",
        signals=["metrics", "logs"]
    )
```

## Jira MCP Client

Creates Epics, Stories, Tasks for the onboarding:

```python
async with JiraMCPClient(url, api_key) as client:
    epic = await client.create_epic(payload)
    story = await client.create_story(payload)
    await client.link_issues(epic.key, story.key, "Epic")
```

## ServiceNow MCP Client

Manages Change Requests:

```python
async with ServiceNowMCPClient(url, api_key) as client:
    cr = await client.create_change_request(payload)
    await client.submit_for_approval(cr.sys_id)
```

## Error Handling

All clients follow these patterns:
- **Transient errors** (503, timeout) → automatic retry
- **Circuit breaker** → fail-open after threshold
- **Graceful degradation** → Confluence down skips similarity, doesn't block
- **MCPError** returned with structured details for caller handling

## Configuration

All MCP URLs and API keys are configured via environment variables:

```env
GRAFANA_MCP_URL=http://grafana-mcp:8080
GRAFANA_MCP_API_KEY=...
CONFLUENCE_MCP_URL=http://confluence-mcp:8080
CONFLUENCE_MCP_API_KEY=...
JIRA_MCP_URL=http://jira-mcp:8080
JIRA_MCP_API_KEY=...
SERVICENOW_MCP_URL=http://servicenow-mcp:8080
SERVICENOW_MCP_API_KEY=...
```
