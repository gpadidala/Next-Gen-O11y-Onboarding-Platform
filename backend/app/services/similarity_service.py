"""Similarity search service using hybrid matching."""

from __future__ import annotations

from typing import Any

import structlog

from app.mcp.confluence_client import ConfluenceMCPClient

logger = structlog.get_logger(__name__)


class SimilarityMatchResult:
    """A single similarity match."""

    def __init__(
        self,
        rank: int,
        app_name: str,
        app_code: str,
        score: float,
        match_reasons: list[str],
        exporters: list[str],
        dashboards: list[str],
        alert_rules: list[str],
        playbooks: list[str],
        pitfalls: list[str],
    ) -> None:
        self.rank = rank
        self.app_name = app_name
        self.app_code = app_code
        self.score = score
        self.match_reasons = match_reasons
        self.exporters = exporters
        self.dashboards = dashboards
        self.alert_rules = alert_rules
        self.playbooks = playbooks
        self.pitfalls = pitfalls

    def to_dict(self) -> dict[str, Any]:
        return {
            "rank": self.rank,
            "appName": self.app_name,
            "appCode": self.app_code,
            "score": self.score,
            "matchReasons": self.match_reasons,
            "exporters": self.exporters,
            "dashboards": self.dashboards,
            "alertRules": self.alert_rules,
            "playbooks": self.playbooks,
            "pitfalls": self.pitfalls,
        }


# Pre-seeded historical patterns for structured matching
_HISTORICAL_PATTERNS: list[dict[str, Any]] = [
    {
        "app_name": "payment-service",
        "app_code": "APP-1234",
        "tech_stack": "JavaSpringBoot",
        "hosting_platform": "AKS",
        "telemetry": ["metrics", "logs", "traces", "grafanaDashboards"],
        "portfolio": "Financial Services",
        "exporters": ["otel-collector", "jmx-exporter", "postgres-exporter"],
        "dashboards": ["JVM Overview", "Spring Boot Metrics", "PostgreSQL"],
        "alert_rules": ["HighErrorRate", "PodRestarts", "LatencyP99"],
        "playbooks": ["https://confluence.example.com/pages/obs-java-playbook"],
        "pitfalls": ["High cardinality from request_uri label — use route grouping"],
    },
    {
        "app_name": "user-auth-api",
        "app_code": "APP-2001",
        "tech_stack": "DotNet",
        "hosting_platform": "VM",
        "telemetry": ["metrics", "logs"],
        "portfolio": "Identity & Access",
        "exporters": ["otel-collector", "windows-exporter"],
        "dashboards": [".NET Runtime", "IIS Overview"],
        "alert_rules": ["HighErrorRate", "MemoryPressure"],
        "playbooks": ["https://confluence.example.com/pages/obs-dotnet-playbook"],
        "pitfalls": ["Windows perf counters can produce high cardinality"],
    },
    {
        "app_name": "order-processor",
        "app_code": "APP-3045",
        "tech_stack": "JavaSpringBoot",
        "hosting_platform": "AKS",
        "telemetry": ["metrics", "logs", "traces"],
        "portfolio": "Commerce",
        "exporters": ["otel-collector", "jmx-exporter", "kafka-exporter"],
        "dashboards": ["JVM Overview", "Kafka Consumer Lag", "Spring Boot Metrics"],
        "alert_rules": ["HighErrorRate", "KafkaLag", "PodRestarts"],
        "playbooks": ["https://confluence.example.com/pages/obs-kafka-playbook"],
        "pitfalls": ["Kafka topic labels can explode cardinality — use allow-list"],
    },
    {
        "app_name": "notification-hub",
        "app_code": "APP-4100",
        "tech_stack": "NodeJS",
        "hosting_platform": "AKS",
        "telemetry": ["metrics", "logs", "traces", "rum"],
        "portfolio": "Customer Engagement",
        "exporters": ["otel-collector"],
        "dashboards": ["Node.js Runtime", "Express Metrics"],
        "alert_rules": ["HighErrorRate", "EventLoopLag"],
        "playbooks": ["https://confluence.example.com/pages/obs-node-playbook"],
        "pitfalls": ["Event loop lag metric can be noisy — set appropriate thresholds"],
    },
    {
        "app_name": "data-pipeline-etl",
        "app_code": "APP-5200",
        "tech_stack": "Python",
        "hosting_platform": "AKS",
        "telemetry": ["metrics", "logs"],
        "portfolio": "Data Engineering",
        "exporters": ["otel-collector", "statsd-exporter"],
        "dashboards": ["Python Runtime", "Celery Workers"],
        "alert_rules": ["TaskFailureRate", "QueueDepth"],
        "playbooks": ["https://confluence.example.com/pages/obs-python-playbook"],
        "pitfalls": ["StatsD cardinality — use tag allow-lists"],
    },
]


class SimilarityService:
    """Finds historically onboarded apps similar to the current request."""

    def __init__(self, confluence_client: ConfluenceMCPClient | None = None) -> None:
        self._confluence = confluence_client

    async def search(self, data: dict[str, Any]) -> dict[str, Any]:
        """Run hybrid similarity search and return ranked matches."""
        tech_stack = data.get("tech_stack", "")
        hosting_platform = data.get("hosting_platform", "")
        portfolio = data.get("portfolio", "")
        telemetry_scope: list[str] = data.get("telemetry_scope", [])

        scored: list[tuple[float, dict[str, Any]]] = []
        for pattern in _HISTORICAL_PATTERNS:
            score = 0.0
            reasons: list[str] = []

            if pattern["tech_stack"] == tech_stack:
                score += 30
                reasons.append(f"Same tech stack ({tech_stack})")
            if pattern["hosting_platform"] == hosting_platform:
                score += 25
                reasons.append(f"Same platform ({hosting_platform})")
            if pattern["portfolio"] == portfolio:
                score += 20
                reasons.append(f"Same portfolio ({portfolio})")

            overlap = set(telemetry_scope) & set(pattern["telemetry"])
            if overlap:
                score += len(overlap) * 5
                reasons.append(f"Overlapping telemetry: {', '.join(overlap)}")

            if score > 0:
                scored.append((score, {**pattern, "match_reasons": reasons}))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:5]

        max_score = max((s for s, _ in top), default=1.0)
        matches = [
            SimilarityMatchResult(
                rank=i + 1,
                app_name=m["app_name"],
                app_code=m["app_code"],
                score=round(s / max_score, 2),
                match_reasons=m["match_reasons"],
                exporters=m["exporters"],
                dashboards=m["dashboards"],
                alert_rules=m["alert_rules"],
                playbooks=m["playbooks"],
                pitfalls=m["pitfalls"],
            )
            for i, (s, m) in enumerate(top)
        ]

        logger.info("similarity_search_complete", total_matches=len(matches))

        return {
            "matches": [m.to_dict() for m in matches],
            "totalMatches": len(matches),
            "searchStrategy": "hybrid",
        }
