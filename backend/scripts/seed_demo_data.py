"""
Seed demo data for the Observability Onboarding Platform.

Covers 10 real-world onboarding use cases across every combination of:
  - Tech stack: JavaSpringBoot, DotNet, NodeJS, Python, Go
  - Platform:   AKS, VM, APIM, GCP, AzureFunctions
  - Status:     COMPLETED, IN_PROGRESS, PENDING_APPROVAL, APPROVED, DRAFT, BLOCKED

Run inside the backend container:
    python scripts/seed_demo_data.py

Or from docker compose:
    docker compose exec backend python scripts/seed_demo_data.py
"""

from __future__ import annotations

import asyncio
import json
import sys
import os
from datetime import datetime, timedelta, timezone
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import asyncpg

# ── Connection ──────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://obsplatform:obsplatform@db:5432/obsplatform",
).replace("postgresql+asyncpg://", "postgresql://")


# ── Helper ──────────────────────────────────────────────────────────────────

def ago(days: int = 0, hours: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)


def j(obj: Any) -> str:
    return json.dumps(obj)


# ── Demo Onboarding Use Cases ───────────────────────────────────────────────
#
# Each entry represents a distinct real-world onboarding scenario.
# Fields map directly to the DB columns.

ONBOARDINGS: list[dict[str, Any]] = [
    # ── 1. Java Spring Boot microservice on AKS (COMPLETED) ────────────────
    {
        "app_name": "payment-gateway-api",
        "app_code": "APP-1001",
        "portfolio": "Financial Services",
        "hosting_platform": "azure_aks",
        "tech_stack": "java_spring",
        "status": "completed",
        "alert_owner_email": "payments-sre@company.com",
        "alert_owner_team": "Payments Engineering",
        "created_by": "alice.chen@company.com",
        "notes": "Core payment processing service. High-volume, P1 criticality. Requires full LGTM stack.",
        "created_at": ago(days=45),
        "submitted_at": ago(days=44),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "grafanaDashboards"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "QA2":  {"metrics": True, "logs": True, "traces": False, "grafanaDashboards": False},
                "PROD": {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
            },
        },
        "technical_config": {
            "namespaces": ["finserv-prod", "finserv-staging"],
            "deploymentNames": ["payment-gateway-api", "payment-gateway-worker"],
            "exporters": ["otel-collector", "jmx-exporter", "postgres-exporter"],
            "samplingRate": 0.1,
            "serviceName": "payment-gateway-api",
            "logFormat": "json",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 42.3, "projectedUtilization": 43.5, "message": "Healthy headroom"},
                "logs":    {"status": "GREEN", "currentUtilization": 38.1, "projectedUtilization": 40.8, "message": "Healthy headroom"},
                "traces":  {"status": "GREEN", "currentUtilization": 29.7, "projectedUtilization": 31.2, "message": "Healthy headroom"},
            },
            "recommendations": ["Enable log sampling for /health and /metrics endpoints to reduce noise"],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "order-processor-api", "matched_app_code": "APP-0812",
             "score": 0.94, "match_reasons": ["Same tech stack (Java Spring Boot)", "Same platform (AKS)", "Same portfolio"],
             "exporters": ["otel-collector", "jmx-exporter"], "dashboards": ["JVM Overview", "Spring Boot Metrics"],
             "alert_rules": ["HighErrorRate", "PodRestarts", "LatencyP99"],
             "playbooks": ["https://confluence.company.com/obs/java-springboot-playbook"],
             "pitfalls": ["High cardinality from request_uri label — use route grouping via otel-collector processor"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0012345", "status": "synced",
             "payload": {"title": "Observability Onboarding: payment-gateway-api (APP-1001)", "environment": "PROD"}},
            {"artifact_type": "epic", "external_id": "OBS-2201", "status": "synced",
             "payload": {"summary": "Observability Onboarding: payment-gateway-api", "project": "OBS"}},
        ],
    },

    # ── 2. .NET API on VM (IN_PROGRESS) ────────────────────────────────────
    {
        "app_name": "identity-auth-service",
        "app_code": "APP-1002",
        "portfolio": "Identity & Access",
        "hosting_platform": "on_prem",
        "tech_stack": "dotnet",
        "status": "in_progress",
        "alert_owner_email": "iam-team@company.com",
        "alert_owner_team": "Identity & Access Management",
        "created_by": "bob.smith@company.com",
        "notes": "OAuth 2.0 / OIDC token service. Hosted on Windows VMs. Needs metrics + logs initially, traces in Q3.",
        "created_at": ago(days=12),
        "submitted_at": ago(days=11),
        "telemetry": {
            "signals": ["metrics", "logs", "grafanaDashboards"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "grafanaDashboards": True},
                "QA":   {"metrics": True, "logs": True, "grafanaDashboards": True},
                "QA2":  {"metrics": False, "logs": False, "grafanaDashboards": False},
                "PROD": {"metrics": True, "logs": True, "grafanaDashboards": True},
            },
        },
        "technical_config": {
            "logPaths": ["C:\\inetpub\\logs\\LogFiles\\W3SVC1\\*.log", "C:\\App\\identity-auth\\logs\\app.log"],
            "logFormat": "text",
            "exporters": ["alloy-agent", "windows-exporter"],
            "hostnames": ["iaas-iam-prod-01.company.com", "iaas-iam-prod-02.company.com"],
        },
        "capacity": {
            "overall_status": "yellow",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 44.1, "projectedUtilization": 45.8, "message": "Healthy"},
                "logs":    {"status": "AMBER", "currentUtilization": 63.5, "projectedUtilization": 65.1, "message": "Approaching threshold — consider log sampling"},
            },
            "recommendations": [
                "Loki ingestion at 63.5% — apply log filtering for IIS access logs before ingest",
                "Consider enabling log compression on the Alloy agent pipeline",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "sso-portal-backend", "matched_app_code": "APP-0634",
             "score": 0.88, "match_reasons": ["Same tech stack (.NET)", "Same platform (VM)"],
             "exporters": ["alloy-agent", "windows-exporter"],
             "dashboards": [".NET Runtime Metrics", "IIS Overview", "Windows Host Metrics"],
             "alert_rules": ["HighErrorRate", "IISRequestQueueLength", "WindowsMemoryPressure"],
             "playbooks": ["https://confluence.company.com/obs/dotnet-vm-playbook"],
             "pitfalls": ["Windows perf counters can produce high-cardinality label sets — use explicit allow-list"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0013102", "status": "submitted",
             "payload": {"title": "Observability Onboarding: identity-auth-service (APP-1002)", "environment": "PROD"}},
            {"artifact_type": "epic", "external_id": "OBS-2287", "status": "submitted",
             "payload": {"summary": "Observability Onboarding: identity-auth-service", "project": "OBS"}},
        ],
    },

    # ── 3. Node.js e-commerce API on AKS (PENDING_APPROVAL) ────────────────
    {
        "app_name": "product-catalogue-api",
        "app_code": "APP-1003",
        "portfolio": "Commerce Platform",
        "hosting_platform": "azure_aks",
        "tech_stack": "nodejs_express",
        "status": "governance_review",
        "alert_owner_email": "commerce-sre@company.com",
        "alert_owner_team": "Commerce Platform Engineering",
        "created_by": "carol.jones@company.com",
        "notes": "GraphQL product catalogue. High read traffic, Redis cache, ElasticSearch backend. Needs RUM for Core Web Vitals.",
        "created_at": ago(days=5),
        "submitted_at": ago(days=4),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "rum", "grafanaDashboards"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "rum": True, "grafanaDashboards": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "rum": True, "grafanaDashboards": True},
                "QA2":  {"metrics": True, "logs": True, "traces": False, "rum": False, "grafanaDashboards": False},
                "PROD": {"metrics": True, "logs": True, "traces": True, "rum": True, "grafanaDashboards": True},
            },
        },
        "technical_config": {
            "namespaces": ["commerce-prod", "commerce-staging"],
            "deploymentNames": ["product-catalogue-api", "product-catalogue-worker"],
            "exporters": ["otel-collector"],
            "samplingRate": 0.05,
            "serviceName": "product-catalogue-api",
            "rumAppName": "commerce-web",
            "rumEnvironment": "production",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 51.2, "projectedUtilization": 52.4, "message": "Monitor closely — approaching 60% threshold"},
                "logs":    {"status": "GREEN", "currentUtilization": 47.8, "projectedUtilization": 49.9, "message": "Healthy"},
                "traces":  {"status": "GREEN", "currentUtilization": 33.4, "projectedUtilization": 35.8, "message": "Healthy"},
                "rum":     {"status": "GREEN", "currentUtilization": 21.0, "projectedUtilization": 22.5, "message": "Healthy"},
            },
            "recommendations": [
                "Set sampling rate to 5% for high-volume GraphQL queries",
                "Use route-based grouping for trace service names — /graphql endpoint will create cardinality",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "search-suggestions-api", "matched_app_code": "APP-0741",
             "score": 0.91, "match_reasons": ["Same tech stack (Node.js)", "Same platform (AKS)", "Same portfolio"],
             "exporters": ["otel-collector"],
             "dashboards": ["Node.js Runtime", "Express.js Metrics", "Redis Cache", "Core Web Vitals"],
             "alert_rules": ["HighErrorRate", "EventLoopLag", "MemoryHeapUsage", "SlowGraphQLQueries"],
             "playbooks": ["https://confluence.company.com/obs/nodejs-aks-playbook"],
             "pitfalls": ["Event loop lag metric can be noisy during GC — use P95 threshold not average",
                          "GraphQL operation names must be set to avoid high-cardinality span names"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0013899", "status": "draft",
             "payload": {"title": "Observability Onboarding: product-catalogue-api (APP-1003)", "environment": "PROD"}},
        ],
    },

    # ── 4. Python ML inference service on AKS (APPROVED) ───────────────────
    {
        "app_name": "recommendation-engine",
        "app_code": "APP-1004",
        "portfolio": "Data & AI Platform",
        "hosting_platform": "azure_aks",
        "tech_stack": "python_fastapi",
        "status": "approved",
        "alert_owner_email": "ml-platform@company.com",
        "alert_owner_team": "ML Platform Engineering",
        "created_by": "dan.lee@company.com",
        "notes": "Real-time product recommendation inference. GPU-accelerated pods. Includes custom ML metrics (prediction latency, model drift).",
        "created_at": ago(days=8),
        "submitted_at": ago(days=7),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "profiles"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "profiles": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "profiles": True},
                "QA2":  {"metrics": True, "logs": True, "traces": False, "profiles": False},
                "PROD": {"metrics": True, "logs": True, "traces": True, "profiles": True},
            },
        },
        "technical_config": {
            "namespaces": ["ai-prod", "ai-staging"],
            "deploymentNames": ["recommendation-engine-api", "recommendation-engine-batch"],
            "exporters": ["otel-collector", "statsd-exporter"],
            "samplingRate": 0.2,
            "serviceName": "recommendation-engine",
            "customMetrics": ["ml_prediction_latency_seconds", "ml_model_drift_score", "ml_cache_hit_ratio"],
            "profilingTarget": "cpu,memory,goroutine",
        },
        "capacity": {
            "overall_status": "yellow",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "AMBER", "currentUtilization": 64.8, "projectedUtilization": 66.2, "message": "Platform team notified"},
                "logs":    {"status": "GREEN", "currentUtilization": 41.3, "projectedUtilization": 42.9, "message": "Healthy"},
                "traces":  {"status": "GREEN", "currentUtilization": 37.1, "projectedUtilization": 39.5, "message": "Healthy"},
                "profiles": {"status": "GREEN", "currentUtilization": 18.5, "projectedUtilization": 20.1, "message": "Healthy"},
            },
            "recommendations": [
                "Custom ML metrics add ~150 additional series — use cardinality-limited label sets",
                "Use statsd-exporter allow-list to restrict which metrics are forwarded to Mimir",
                "Platform team notified of AMBER capacity status for metrics",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "fraud-detection-service", "matched_app_code": "APP-0956",
             "score": 0.87, "match_reasons": ["Same tech stack (Python)", "Same platform (AKS)", "Similar telemetry (metrics, logs, traces, profiles)"],
             "exporters": ["otel-collector", "statsd-exporter"],
             "dashboards": ["Python Runtime", "Celery Task Queue", "GPU Utilisation", "Model Performance"],
             "alert_rules": ["HighErrorRate", "PredictionLatencyP99", "GPUMemoryPressure", "ModelDriftAlert"],
             "playbooks": ["https://confluence.company.com/obs/python-ml-playbook"],
             "pitfalls": ["StatsD counters accumulate — always use rate() in PromQL, not raw counter values",
                          "Pyroscope profiling adds ~5% CPU overhead on GPU pods — use sampling mode"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0014201", "status": "submitted",
             "payload": {"title": "Observability Onboarding: recommendation-engine (APP-1004)", "environment": "PROD"}},
            {"artifact_type": "epic", "external_id": "OBS-2341", "status": "draft",
             "payload": {"summary": "Observability Onboarding: recommendation-engine", "project": "OBS"}},
        ],
    },

    # ── 5. Go microservice on AKS (COMPLETED) ──────────────────────────────
    {
        "app_name": "api-gateway-core",
        "app_code": "APP-1005",
        "portfolio": "Platform Engineering",
        "hosting_platform": "azure_aks",
        "tech_stack": "go",
        "status": "completed",
        "alert_owner_email": "platform-eng@company.com",
        "alert_owner_team": "Platform Engineering",
        "created_by": "eve.wang@company.com",
        "notes": "Central API gateway. Routes all external traffic. Extremely low latency requirement (<5ms P99). Full tracing critical.",
        "created_at": ago(days=90),
        "submitted_at": ago(days=89),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "grafanaDashboards"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "QA2":  {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "PROD": {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
            },
        },
        "technical_config": {
            "namespaces": ["platform-prod", "platform-staging"],
            "deploymentNames": ["api-gateway-core"],
            "exporters": ["otel-collector"],
            "samplingRate": 0.01,
            "serviceName": "api-gateway-core",
            "logFormat": "json",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 33.1, "projectedUtilization": 33.7, "message": "Go services are very efficient"},
                "logs":    {"status": "GREEN", "currentUtilization": 28.4, "projectedUtilization": 29.1, "message": "Healthy"},
                "traces":  {"status": "GREEN", "currentUtilization": 25.0, "projectedUtilization": 27.1, "message": "Healthy"},
            },
            "recommendations": [
                "Use 1% sampling rate for traces — gateway handles millions of requests/day",
                "Enable exemplars in Prometheus metrics to link metrics to traces",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "edge-proxy-service", "matched_app_code": "APP-0312",
             "score": 0.96, "match_reasons": ["Same tech stack (Go)", "Same platform (AKS)", "Same portfolio"],
             "exporters": ["otel-collector"],
             "dashboards": ["Go Runtime", "HTTP Traffic Overview", "Gateway Routing"],
             "alert_rules": ["HighErrorRate", "LatencyP99", "GoroutineLeaks", "PanicRecoveryRate"],
             "playbooks": ["https://confluence.company.com/obs/go-aks-playbook"],
             "pitfalls": ["Go garbage collector pauses can spike P99 latency — alert on GC pause duration",
                          "pprof endpoint must be disabled in prod — use Pyroscope pull mode instead"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0009871", "status": "synced",
             "payload": {"title": "Observability Onboarding: api-gateway-core (APP-1005)", "environment": "PROD"}},
        ],
    },

    # ── 6. Java Spring Boot + PostgreSQL (DB Plugins use case) ─────────────
    {
        "app_name": "inventory-management-service",
        "app_code": "APP-1006",
        "portfolio": "Supply Chain",
        "hosting_platform": "azure_aks",
        "tech_stack": "java_spring",
        "status": "completed",
        "alert_owner_email": "supply-chain-eng@company.com",
        "alert_owner_team": "Supply Chain Engineering",
        "created_by": "frank.nguyen@company.com",
        "notes": "Inventory CRUD service with heavy PostgreSQL usage. DBA requested DB-level monitoring alongside app metrics.",
        "created_at": ago(days=60),
        "submitted_at": ago(days=59),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "grafanaDashboards", "dbPlugins"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True, "dbPlugins": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True, "dbPlugins": True},
                "QA2":  {"metrics": False, "logs": True, "traces": False, "grafanaDashboards": False, "dbPlugins": False},
                "PROD": {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True, "dbPlugins": True},
            },
        },
        "technical_config": {
            "namespaces": ["supplychain-prod"],
            "deploymentNames": ["inventory-management-service"],
            "exporters": ["otel-collector", "jmx-exporter", "postgres-exporter"],
            "samplingRate": 0.1,
            "serviceName": "inventory-management-service",
            "dbType": "PostgreSQL",
            "dbSchema": "inventory",
            "connectionAlias": "inventory-rw",
            "dbaContact": "dba-team@company.com",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 46.2, "projectedUtilization": 48.9, "message": "DB exporter adds ~120 metric series"},
                "logs":    {"status": "GREEN", "currentUtilization": 39.5, "projectedUtilization": 41.8, "message": "Healthy"},
                "traces":  {"status": "GREEN", "currentUtilization": 31.2, "projectedUtilization": 33.5, "message": "Healthy"},
            },
            "recommendations": [
                "postgres-exporter adds ~120 series per DB instance — limit to essential metrics via allow-list",
                "Enable slow query logging in PostgreSQL (log_min_duration_statement=1000ms) for log correlation",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "order-fulfilment-service", "matched_app_code": "APP-0892",
             "score": 0.93, "match_reasons": ["Same tech stack (Java Spring Boot)", "Same platform (AKS)", "Same portfolio", "Same DB type (PostgreSQL)"],
             "exporters": ["otel-collector", "jmx-exporter", "postgres-exporter"],
             "dashboards": ["JVM Overview", "Spring Boot Metrics", "PostgreSQL Database", "Database Connection Pool"],
             "alert_rules": ["HighErrorRate", "DBConnectionPoolExhausted", "SlowQueries", "LockWaitTimeout"],
             "playbooks": ["https://confluence.company.com/obs/java-postgres-playbook"],
             "pitfalls": ["HikariCP metrics expose per-pool labels — limit to one pool name to avoid cardinality",
                          "pg_stat_statements must be enabled in PostgreSQL for query-level metrics"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0011456", "status": "synced",
             "payload": {"title": "Observability Onboarding: inventory-management-service (APP-1006)"}},
        ],
    },

    # ── 7. Azure Functions (serverless) ────────────────────────────────────
    {
        "app_name": "invoice-pdf-generator",
        "app_code": "APP-1007",
        "portfolio": "Finance & Billing",
        "hosting_platform": "lambda",
        "tech_stack": "dotnet",
        "status": "in_progress",
        "alert_owner_email": "billing-team@company.com",
        "alert_owner_team": "Finance & Billing Engineering",
        "created_by": "grace.kim@company.com",
        "notes": "Serverless PDF generation triggered by Service Bus messages. Cold start latency is a known issue.",
        "created_at": ago(days=3),
        "submitted_at": ago(days=2),
        "telemetry": {
            "signals": ["metrics", "logs", "traces"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True},
                "QA":   {"metrics": True, "logs": True, "traces": True},
                "QA2":  {"metrics": False, "logs": False, "traces": False},
                "PROD": {"metrics": True, "logs": True, "traces": True},
            },
        },
        "technical_config": {
            "functionAppName": "invoice-pdf-generator-prod",
            "exporters": ["azure-monitor-exporter", "otel-collector"],
            "samplingRate": 0.5,
            "serviceName": "invoice-pdf-generator",
            "triggerType": "ServiceBusTrigger",
            "logFormat": "json",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 35.6, "projectedUtilization": 36.4, "message": "Serverless metrics are bursty — use max() not avg() in dashboards"},
                "logs":    {"status": "GREEN", "currentUtilization": 29.8, "projectedUtilization": 30.9, "message": "Healthy"},
                "traces":  {"status": "GREEN", "currentUtilization": 22.1, "projectedUtilization": 24.7, "message": "Healthy"},
            },
            "recommendations": [
                "Set 50% sampling rate — serverless functions have low RPS but critical business impact",
                "Use azure-monitor-exporter for native Function App host metrics (cold starts, execution count)",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "email-notification-function", "matched_app_code": "APP-0765",
             "score": 0.89, "match_reasons": ["Same tech stack (.NET)", "Same platform (Azure Functions)"],
             "exporters": ["azure-monitor-exporter", "otel-collector"],
             "dashboards": ["Azure Functions Overview", ".NET Runtime Metrics", "Service Bus Queue Depth"],
             "alert_rules": ["FunctionExecutionFailures", "ColdStartLatency", "ServiceBusDeadLetterCount"],
             "playbooks": ["https://confluence.company.com/obs/azure-functions-playbook"],
             "pitfalls": ["Cold start latency inflates P99 — filter on IsWarmInstance label for SLO dashboards",
                          "azure-monitor-exporter has 1-minute minimum scrape interval — do not set lower"]},
        ],
        "artifacts": [],
    },

    # ── 8. GCP-hosted Python data pipeline ─────────────────────────────────
    {
        "app_name": "customer-data-etl-pipeline",
        "app_code": "APP-1008",
        "portfolio": "Data Engineering",
        "hosting_platform": "gke",
        "tech_stack": "python_fastapi",
        "status": "draft",
        "alert_owner_email": "data-eng@company.com",
        "alert_owner_team": "Data Engineering",
        "created_by": "henry.obi@company.com",
        "notes": "GCP Dataflow pipeline for customer data transformation. Runs on Cloud Run workers. BigQuery output.",
        "created_at": ago(hours=6),
        "submitted_at": None,
        "telemetry": {
            "signals": ["metrics", "logs"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True},
                "QA":   {"metrics": True, "logs": True},
                "QA2":  {"metrics": False, "logs": False},
                "PROD": {"metrics": True, "logs": True},
            },
        },
        "technical_config": {
            "gcpProject": "company-data-prod",
            "cloudRunService": "customer-data-etl",
            "exporters": ["otel-collector", "stackdriver-exporter"],
            "logFormat": "json",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 38.2, "projectedUtilization": 39.0, "message": "Healthy"},
                "logs":    {"status": "GREEN", "currentUtilization": 34.7, "projectedUtilization": 36.2, "message": "Healthy"},
            },
            "recommendations": ["Use structured JSON logging — GCP Cloud Run logs are structured by default"],
        },
        "similarity_matches": [],
        "artifacts": [],
    },

    # ── 9. Node.js frontend BFF with Faro (RUM + Faro use case) ────────────
    {
        "app_name": "customer-portal-bff",
        "app_code": "APP-1009",
        "portfolio": "Digital Experience",
        "hosting_platform": "azure_aks",
        "tech_stack": "nodejs_express",
        "status": "completed",
        "alert_owner_email": "dx-platform@company.com",
        "alert_owner_team": "Digital Experience Platform",
        "created_by": "iris.taylor@company.com",
        "notes": "Backend-for-frontend for customer portal SPA. Needs both server-side (Node) and client-side (Faro) observability.",
        "created_at": ago(days=30),
        "submitted_at": ago(days=29),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "rum", "faro", "grafanaDashboards"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "rum": True, "faro": True, "grafanaDashboards": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "rum": True, "faro": True, "grafanaDashboards": True},
                "QA2":  {"metrics": True, "logs": True, "traces": True, "rum": False, "faro": False, "grafanaDashboards": False},
                "PROD": {"metrics": True, "logs": True, "traces": True, "rum": True, "faro": True, "grafanaDashboards": True},
            },
        },
        "technical_config": {
            "namespaces": ["dx-prod"],
            "deploymentNames": ["customer-portal-bff"],
            "exporters": ["otel-collector"],
            "samplingRate": 0.1,
            "serviceName": "customer-portal-bff",
            "faroAppName": "customer-portal",
            "faroEnvironment": "production",
            "faroCollectorUrl": "https://faro-collector.company.com/collect",
            "rumAppName": "customer-portal-rum",
        },
        "capacity": {
            "overall_status": "green",
            "can_proceed": True,
            "escalation_required": False,
            "signal_results": {
                "metrics": {"status": "GREEN", "currentUtilization": 44.9, "projectedUtilization": 46.1, "message": "Healthy"},
                "logs":    {"status": "GREEN", "currentUtilization": 40.2, "projectedUtilization": 42.0, "message": "Healthy"},
                "traces":  {"status": "GREEN", "currentUtilization": 32.5, "projectedUtilization": 34.8, "message": "Healthy"},
                "rum":     {"status": "GREEN", "currentUtilization": 24.3, "projectedUtilization": 26.0, "message": "Healthy"},
                "faro":    {"status": "GREEN", "currentUtilization": 19.8, "projectedUtilization": 21.2, "message": "Healthy"},
            },
            "recommendations": [
                "Faro SDK sends all JS errors by default — configure ignoredErrors for known third-party noise",
                "Enable session recording sampling at 10% to control Faro event volume",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "mobile-bff-api", "matched_app_code": "APP-0812",
             "score": 0.90, "match_reasons": ["Same tech stack (Node.js)", "Same platform (AKS)", "Same portfolio", "Same telemetry scope (metrics, logs, traces, rum, faro)"],
             "exporters": ["otel-collector"],
             "dashboards": ["Core Web Vitals", "Faro Error Tracking", "Node.js BFF Performance", "RUM Session Analytics"],
             "alert_rules": ["HighJSErrorRate", "CoreWebVitalsCLS", "CoreWebVitalsLCP", "APILatencyP99"],
             "playbooks": ["https://confluence.company.com/obs/nodejs-faro-rum-playbook"],
             "pitfalls": ["Faro sessionId label creates high cardinality — aggregate before storing",
                          "RUM beacons fire on page unload — some beacons are lost on mobile; use sendBeacon API"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0012981", "status": "synced",
             "payload": {"title": "Observability Onboarding: customer-portal-bff (APP-1009)"}},
        ],
    },

    # ── 10. APIM-backed .NET service (BLOCKED — capacity RED) ───────────────
    {
        "app_name": "partner-integration-api",
        "app_code": "APP-1010",
        "portfolio": "Partner Ecosystem",
        "hosting_platform": "on_prem",
        "tech_stack": "dotnet",
        "status": "cancelled",
        "alert_owner_email": "partner-eng@company.com",
        "alert_owner_team": "Partner Integration Engineering",
        "created_by": "james.patel@company.com",
        "notes": "High-volume partner API via Azure API Management. 50+ external partners. Blocked on Mimir capacity — platform team resolving.",
        "created_at": ago(days=7),
        "submitted_at": ago(days=6),
        "telemetry": {
            "signals": ["metrics", "logs", "traces", "grafanaDashboards"],
            "env_matrix": {
                "DEV":  {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "QA":   {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
                "QA2":  {"metrics": True, "logs": False, "traces": False, "grafanaDashboards": False},
                "PROD": {"metrics": True, "logs": True, "traces": True, "grafanaDashboards": True},
            },
        },
        "technical_config": {
            "apimInstanceName": "company-apim-prod",
            "backendServiceUrl": "https://partner-api-backend.company.com",
            "exporters": ["azure-monitor-exporter", "otel-collector"],
            "samplingRate": 0.05,
            "serviceName": "partner-integration-api",
        },
        "capacity": {
            "overall_status": "red",
            "can_proceed": False,
            "escalation_required": True,
            "signal_results": {
                "metrics": {"status": "RED", "currentUtilization": 78.4, "projectedUtilization": 83.1,
                            "message": "BLOCKED — Mimir active series at 78.4%. New tenant would breach 80% threshold."},
                "logs":    {"status": "AMBER", "currentUtilization": 66.2, "projectedUtilization": 68.7,
                            "message": "High — platform team notified"},
                "traces":  {"status": "GREEN", "currentUtilization": 41.8, "projectedUtilization": 43.9,
                            "message": "Healthy"},
            },
            "recommendations": [
                "🚨 BLOCKED: Mimir series at 78.4% — platform team must increase capacity limits before onboarding proceeds",
                "Review APIM policy metrics — each policy scope creates separate label set",
                "Consider 50-partner label grouping (partner_tier) instead of individual partner_id labels",
                "Estimated 8,000 new metric series from 50 partner labels — highest cardinality onboarding to date",
            ],
        },
        "similarity_matches": [
            {"rank": 1, "matched_app_name": "b2b-gateway-api", "matched_app_code": "APP-0445",
             "score": 0.85, "match_reasons": ["Same tech stack (.NET)", "Same platform (APIM)"],
             "exporters": ["azure-monitor-exporter"],
             "dashboards": ["APIM Gateway Overview", ".NET Backend Metrics", "Partner SLA Tracking"],
             "alert_rules": ["PartnerAPIErrorRate", "APIMGatewayLatency", "BackendUnhealthy"],
             "playbooks": ["https://confluence.company.com/obs/apim-dotnet-playbook"],
             "pitfalls": ["APIM emits per-operation metrics — group by operation_template not operation_name to avoid cardinality",
                          "Azure Monitor → Mimir federation introduces 1-minute lag — don't use for real-time SLOs"]},
        ],
        "artifacts": [
            {"artifact_type": "cr", "external_id": "CHG0014502", "status": "failed",
             "payload": {"title": "Observability Onboarding: partner-integration-api (APP-1010) — BLOCKED"}},
        ],
    },
]


# ── Seed Function ───────────────────────────────────────────────────────────

async def seed(conn: asyncpg.Connection) -> None:
    inserted = 0
    skipped = 0

    for entry in ONBOARDINGS:
        # Check if already seeded
        existing = await conn.fetchval(
            "SELECT id FROM onboarding_requests WHERE app_code = $1",
            entry["app_code"],
        )
        if existing:
            print(f"  ⏭  Skip {entry['app_code']} — already exists")
            skipped += 1
            continue

        async with conn.transaction():
            # Insert onboarding request
            onboarding_id = await conn.fetchval(
                """
                INSERT INTO onboarding_requests
                    (app_name, app_code, portfolio, hosting_platform, tech_stack,
                     status, alert_owner_email, alert_owner_team, created_by,
                     notes, created_at, updated_at, submitted_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12)
                RETURNING id
                """,
                entry["app_name"],
                entry["app_code"],
                entry["portfolio"],
                entry["hosting_platform"],
                entry["tech_stack"],
                entry["status"],
                entry["alert_owner_email"],
                entry["alert_owner_team"],
                entry["created_by"],
                entry["notes"],
                entry["created_at"],
                entry.get("submitted_at"),
            )

            # Telemetry scope
            if entry.get("telemetry"):
                t = entry["telemetry"]
                # Convert signals list to dict format expected by schema
                selected_signals = {sig: {"enabled": True} for sig in t.get("signals", [])}
                await conn.execute(
                    """
                    INSERT INTO telemetry_scopes
                        (onboarding_request_id, selected_signals, environment_matrix)
                    VALUES ($1, $2, $3)
                    """,
                    onboarding_id,
                    j(selected_signals),
                    j(t["env_matrix"]),
                )

            # Technical config
            if entry.get("technical_config"):
                await conn.execute(
                    """
                    INSERT INTO technical_configs (onboarding_request_id, config_data)
                    VALUES ($1, $2)
                    """,
                    onboarding_id,
                    j(entry["technical_config"]),
                )

            # Environment readiness (per-env/signal rows)
            if entry.get("telemetry", {}).get("env_matrix"):
                matrix = entry["telemetry"]["env_matrix"]
                signals = entry["telemetry"].get("signals", [])
                for env_name, env_signals in matrix.items():
                    for sig in signals:
                        sig_key = sig  # e.g. "metrics", "logs"
                        ready = bool(env_signals.get(sig_key, False))
                        await conn.execute(
                            """
                            INSERT INTO environment_readiness
                                (onboarding_request_id, environment, signal, ready)
                            VALUES ($1,$2,$3,$4)
                            """,
                            onboarding_id,
                            env_name,
                            sig_key,
                            ready,
                        )

            # Capacity assessment
            if entry.get("capacity"):
                cap = entry["capacity"]
                recs = cap.get("recommendations", [])
                recs_text = "; ".join(recs) if isinstance(recs, list) else str(recs)
                await conn.execute(
                    """
                    INSERT INTO capacity_assessments
                        (onboarding_request_id, overall_status, signal_results,
                         recommendations, can_proceed, escalation_required)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    """,
                    onboarding_id,
                    cap["overall_status"],
                    j(cap["signal_results"]),
                    recs_text,
                    cap["can_proceed"],
                    cap["escalation_required"],
                )

            # Similarity matches
            for match in entry.get("similarity_matches", []):
                await conn.execute(
                    """
                    INSERT INTO similarity_matches
                        (onboarding_request_id, rank, matched_app_name, matched_app_code,
                         score, match_reasons, exporters, dashboards, alert_rules,
                         playbooks, pitfalls)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    """,
                    onboarding_id,
                    match["rank"],
                    match["matched_app_name"],
                    match["matched_app_code"],
                    match["score"],
                    j(match["match_reasons"]),
                    j(match["exporters"]),
                    j(match["dashboards"]),
                    j(match["alert_rules"]),
                    j(match["playbooks"]),
                    j(match["pitfalls"]),
                )

            # Artifacts
            for artifact in entry.get("artifacts", []):
                await conn.execute(
                    """
                    INSERT INTO artifacts
                        (onboarding_request_id, artifact_type, external_id, status, payload)
                    VALUES ($1,$2,$3,$4,$5)
                    """,
                    onboarding_id,
                    artifact["artifact_type"],
                    artifact.get("external_id"),
                    artifact.get("status", "draft"),
                    j(artifact["payload"]),
                )

        status_icon = {
            "completed": "✅", "in_progress": "🔄", "governance_review": "⏳",
            "approved": "👍", "draft": "📝", "cancelled": "🚫",
        }.get(entry["status"], "•")
        print(
            f"  {status_icon} Seeded {entry['app_code']:10s} | {entry['app_name']:40s} | "
            f"{entry['tech_stack']:18s} on {entry['hosting_platform']:15s} | {entry['status']}"
        )
        inserted += 1

    print(f"\n{'─'*80}")
    print(f"  Done. Inserted: {inserted}  |  Skipped (already exist): {skipped}")
    print(f"  Total onboardings in DB: {await conn.fetchval('SELECT COUNT(*) FROM onboarding_requests')}")


async def main() -> None:
    print("=" * 80)
    print("  Observability Onboarding Platform — Demo Data Seeder")
    print("=" * 80)
    print(f"  Connecting to: {DATABASE_URL[:50]}...")
    conn: asyncpg.Connection = await asyncpg.connect(DATABASE_URL)
    try:
        await seed(conn)
    finally:
        await conn.close()
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
