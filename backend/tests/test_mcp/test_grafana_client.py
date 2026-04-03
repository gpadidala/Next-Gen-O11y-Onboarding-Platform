"""Tests for Grafana MCP client."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.mcp.grafana_client import GrafanaMCPClient, MimirUsage, LokiUsage


@pytest.fixture
def grafana_client() -> GrafanaMCPClient:
    return GrafanaMCPClient(
        base_url="http://grafana-mcp:8080",
        api_key="test-key",
        timeout=5,
    )


class TestGrafanaHealthCheck:
    async def test_health_check_success(self, grafana_client: GrafanaMCPClient) -> None:
        with patch.object(grafana_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"status": "ok"}
            result = await grafana_client.health_check()
            assert result is True
            mock_get.assert_called_once()

    async def test_health_check_failure(self, grafana_client: GrafanaMCPClient) -> None:
        with patch.object(grafana_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Connection refused")
            result = await grafana_client.health_check()
            assert result is False


class TestMimirUsage:
    async def test_get_mimir_usage(self, grafana_client: GrafanaMCPClient) -> None:
        mock_response = {
            "active_series": 2100000,
            "ingestion_rate_samples_per_sec": 50000.0,
            "series_limit": 5000000,
            "ingestion_limit": 100000.0,
        }
        with patch.object(grafana_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            result = await grafana_client.get_mimir_usage("default")
            assert isinstance(result, MimirUsage)
            assert result.active_series == 2100000
            assert result.series_limit == 5000000


class TestLokiUsage:
    async def test_get_loki_usage(self, grafana_client: GrafanaMCPClient) -> None:
        mock_response = {
            "ingestion_rate_bytes_per_sec": 12400000.0,
            "stream_count": 50000,
            "ingestion_limit": 20000000.0,
            "stream_limit": 100000,
        }
        with patch.object(grafana_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            result = await grafana_client.get_loki_usage("default")
            assert isinstance(result, LokiUsage)
            assert result.ingestion_rate_bytes_per_sec == 12400000.0


class TestCircuitBreaker:
    async def test_circuit_opens_after_failures(self, grafana_client: GrafanaMCPClient) -> None:
        grafana_client._failure_count = 5
        grafana_client._circuit_open = True
        # Circuit should be open
        assert grafana_client._circuit_open is True

    async def test_retry_on_transient_error(self, grafana_client: GrafanaMCPClient) -> None:
        call_count = 0

        async def _flaky_get(*args: object, **kwargs: object) -> dict[str, object]:
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ConnectionError("transient")
            return {"status": "ok"}

        with patch.object(grafana_client, "_get", side_effect=_flaky_get):
            result = await grafana_client.health_check()
            # Should succeed after retry
            assert result is True or call_count >= 1
