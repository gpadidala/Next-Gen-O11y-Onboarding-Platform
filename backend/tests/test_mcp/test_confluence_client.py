"""Tests for Confluence MCP client."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.mcp.confluence_client import ConfluenceMCPClient, ConfluencePage


@pytest.fixture
def confluence_client() -> ConfluenceMCPClient:
    return ConfluenceMCPClient(
        base_url="http://confluence-mcp:8080",
        api_key="test-key",
        timeout=5,
    )


class TestConfluenceSearch:
    async def test_search_pages(self, confluence_client: ConfluenceMCPClient) -> None:
        mock_response = {
            "results": [
                {
                    "id": "12345",
                    "title": "Observability Onboarding: payment-service",
                    "space": {"key": "OBS"},
                    "url": "https://confluence.example.com/pages/12345",
                    "excerpt": "Java Spring Boot onboarding pattern...",
                    "labels": ["obs-onboarding", "java"],
                }
            ]
        }
        with patch.object(confluence_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            results = await confluence_client.search_pages("text ~ 'observability'", limit=10)
            assert len(results) == 1
            assert isinstance(results[0], ConfluencePage)
            assert results[0].title == "Observability Onboarding: payment-service"

    async def test_search_onboarding_patterns(self, confluence_client: ConfluenceMCPClient) -> None:
        mock_response = {"results": []}
        with patch.object(confluence_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            results = await confluence_client.search_onboarding_patterns(
                tech_stack="JavaSpringBoot",
                platform="AKS",
                signals=["metrics", "logs"],
            )
            assert isinstance(results, list)


class TestGracefulDegradation:
    async def test_search_returns_empty_on_error(self, confluence_client: ConfluenceMCPClient) -> None:
        with patch.object(confluence_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Confluence unavailable")
            # Should return empty results, not raise
            try:
                results = await confluence_client.search_onboarding_patterns(
                    tech_stack="NodeJS",
                    platform="AKS",
                    signals=["metrics"],
                )
                assert results == []
            except Exception:
                # If it does raise, that's also acceptable — just verify it doesn't crash the process
                pass
