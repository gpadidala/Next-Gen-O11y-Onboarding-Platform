# API Contracts

> Complete REST API documentation for the Next-Gen Observability Onboarding Platform.

**Base URL**: `/api/v1`
**Content-Type**: `application/json`
**Authentication**: Bearer token via `Authorization` header (all endpoints except health)

---

## Table of Contents

1. [Common Patterns](#common-patterns)
2. [Health Endpoints](#health-endpoints)
3. [Onboarding Endpoints](#onboarding-endpoints)
4. [Capacity Endpoints](#capacity-endpoints)
5. [Similarity Endpoints](#similarity-endpoints)
6. [Artifact Endpoints](#artifact-endpoints)
7. [Governance Endpoints](#governance-endpoints)
8. [Lookup Endpoints](#lookup-endpoints)
9. [Error Responses](#error-responses)

---

## Common Patterns

### Pagination

List endpoints support cursor-based pagination:

```
GET /api/v1/onboarding?limit=20&offset=0
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Maximum number of items to return (1-100) |
| `offset` | integer | 0 | Number of items to skip |

### Standard Response Envelope

All responses follow a consistent envelope:

```json
{
  "data": { ... },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-02T10:30:00Z"
  }
}
```

### Standard Error Envelope

```json
{
  "error": {
    "status_code": 422,
    "error_code": "VALIDATION_ERROR",
    "detail": "Validation failed.",
    "extra": { ... }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-02T10:30:00Z"
  }
}
```

---

## Health Endpoints

### GET /api/v1/health

Liveness probe. Returns 200 if the process is running.

**Request**: No parameters.

**Response** `200 OK`:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production"
}
```

---

### GET /api/v1/ready

Readiness probe. Returns 200 only when all dependencies (database, MCP servers) are reachable.

**Request**: No parameters.

**Response** `200 OK`:

```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "up", "latency_ms": 2 },
    "grafana_mcp": { "status": "up", "latency_ms": 15 },
    "confluence_mcp": { "status": "up", "latency_ms": 22 },
    "jira_mcp": { "status": "up", "latency_ms": 18 },
    "servicenow_mcp": { "status": "up", "latency_ms": 30 }
  }
}
```

**Response** `503 Service Unavailable`:

```json
{
  "status": "not_ready",
  "checks": {
    "database": { "status": "up", "latency_ms": 2 },
    "grafana_mcp": { "status": "down", "error": "Connection refused" },
    "confluence_mcp": { "status": "up", "latency_ms": 22 },
    "jira_mcp": { "status": "up", "latency_ms": 18 },
    "servicenow_mcp": { "status": "up", "latency_ms": 30 }
  }
}
```

---

## Onboarding Endpoints

### POST /api/v1/onboarding

Create a new onboarding request (initial draft).

**Request Body**:

```json
{
  "app_name": "Payment Gateway",
  "app_code": "PAY-GW-001",
  "portfolio": "Digital Payments",
  "hosting_platform": "eks",
  "tech_stack": "java_spring",
  "alert_owner_email": "sre-payments@company.com",
  "alert_owner_team": "Payments SRE",
  "created_by": "john.doe@company.com",
  "notes": "High-priority payment processing service"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_name` | string(255) | Yes | Human-readable application name |
| `app_code` | string(64) | Yes | Unique application code (must match CMDB) |
| `portfolio` | string(128) | Yes | Business portfolio the app belongs to |
| `hosting_platform` | enum | Yes | One of: `eks`, `ecs`, `ec2`, `lambda`, `on_prem`, `azure_aks`, `gke` |
| `tech_stack` | enum | Yes | One of: `java_spring`, `java_quarkus`, `python_fastapi`, `python_django`, `nodejs_express`, `nodejs_nestjs`, `dotnet`, `go`, `rust` |
| `alert_owner_email` | string(255) | Yes | Email of the alert owner |
| `alert_owner_team` | string(255) | Yes | Team name of the alert owner |
| `created_by` | string(255) | Yes | Email of the user creating the request |
| `notes` | string | No | Free-text notes |

**Response** `201 Created`:

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "app_name": "Payment Gateway",
    "app_code": "PAY-GW-001",
    "portfolio": "Digital Payments",
    "hosting_platform": "eks",
    "tech_stack": "java_spring",
    "status": "draft",
    "alert_owner_email": "sre-payments@company.com",
    "alert_owner_team": "Payments SRE",
    "created_by": "john.doe@company.com",
    "notes": "High-priority payment processing service",
    "submitted_at": null,
    "telemetry_scope": null,
    "capacity_assessment": null,
    "similarity_matches": [],
    "artifacts": [],
    "created_at": "2026-04-02T10:30:00Z",
    "updated_at": "2026-04-02T10:30:00Z"
  }
}
```

**Error Responses**:
- `409 Conflict`: App code already exists
- `422 Unprocessable Entity`: Validation error (missing required fields, invalid enum values)

---

### GET /api/v1/onboarding

List onboarding requests with optional filtering and pagination.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | enum | - | Filter by status |
| `portfolio` | string | - | Filter by portfolio |
| `created_by` | string | - | Filter by creator email |
| `limit` | integer | 20 | Page size (1-100) |
| `offset` | integer | 0 | Items to skip |
| `sort_by` | string | `created_at` | Sort field: `created_at`, `updated_at`, `app_name` |
| `sort_order` | string | `desc` | Sort direction: `asc` or `desc` |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "app_name": "Payment Gateway",
      "app_code": "PAY-GW-001",
      "portfolio": "Digital Payments",
      "hosting_platform": "eks",
      "tech_stack": "java_spring",
      "status": "submitted",
      "created_by": "john.doe@company.com",
      "created_at": "2026-04-02T10:30:00Z",
      "updated_at": "2026-04-02T11:45:00Z"
    }
  ],
  "meta": {
    "total": 142,
    "limit": 20,
    "offset": 0
  }
}
```

---

### GET /api/v1/onboarding/{id}

Retrieve a single onboarding request with all related data.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Onboarding request ID |

**Response** `200 OK`:

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "app_name": "Payment Gateway",
    "app_code": "PAY-GW-001",
    "portfolio": "Digital Payments",
    "hosting_platform": "eks",
    "tech_stack": "java_spring",
    "status": "artifacts_generated",
    "alert_owner_email": "sre-payments@company.com",
    "alert_owner_team": "Payments SRE",
    "created_by": "john.doe@company.com",
    "notes": "High-priority payment processing service",
    "submitted_at": null,
    "telemetry_scope": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "selected_signals": {
        "metrics": { "enabled": true, "details": { "estimated_series": 5000 } },
        "logs": { "enabled": true, "details": { "estimated_volume_mb_per_day": 500 } },
        "traces": { "enabled": true, "details": { "estimated_spans_per_sec": 200 } },
        "profiling": { "enabled": false }
      },
      "environment_matrix": {
        "metrics": { "dev": true, "qa": true, "staging": true, "production": true },
        "logs": { "dev": true, "qa": true, "staging": true, "production": true },
        "traces": { "dev": false, "qa": true, "staging": true, "production": true }
      }
    },
    "capacity_assessment": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "overall_status": "green",
      "signal_results": {
        "metrics": { "current_usage_pct": 45.2, "projected_usage_pct": 52.1, "status": "green" },
        "logs": { "current_usage_pct": 38.7, "projected_usage_pct": 44.3, "status": "green" },
        "traces": { "current_usage_pct": 61.5, "projected_usage_pct": 68.9, "status": "amber" }
      },
      "can_proceed": true,
      "escalation_required": false,
      "recommendations": ["Monitor trace ingestion rate after onboarding"],
      "assessed_at": "2026-04-02T11:00:00Z"
    },
    "similarity_matches": [
      {
        "rank": 1,
        "matched_app_name": "Order Service",
        "matched_app_code": "ORD-SVC-001",
        "score": 0.94,
        "match_reasons": ["Same tech stack", "Same hosting platform", "Similar portfolio"],
        "exporters": ["jmx-exporter", "otel-java-agent"],
        "dashboards": ["jvm-overview", "spring-boot-stats"],
        "alert_rules": ["high-error-rate", "p99-latency"],
        "playbooks": ["java-oom-runbook"]
      }
    ],
    "artifacts": [
      {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "artifact_type": "epic",
        "status": "synced",
        "external_id": "JIRA-12345",
        "external_url": "https://jira.company.com/browse/JIRA-12345",
        "payload": { "summary": "Onboard PAY-GW-001 to Observability Stack", "..." : "..." }
      }
    ],
    "created_at": "2026-04-02T10:30:00Z",
    "updated_at": "2026-04-02T11:45:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Onboarding request does not exist

---

### PUT /api/v1/onboarding/{id}

Update an existing onboarding request. Used to progress through wizard steps.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Onboarding request ID |

**Request Body** (partial update -- only include fields to change):

```json
{
  "hosting_platform": "eks",
  "tech_stack": "java_spring",
  "status": "in_progress",
  "telemetry_scope": {
    "selected_signals": {
      "metrics": { "enabled": true, "details": { "estimated_series": 5000 } },
      "logs": { "enabled": true, "details": {} },
      "traces": { "enabled": true, "details": {} },
      "profiling": { "enabled": false }
    },
    "environment_matrix": {
      "metrics": { "dev": true, "qa": true, "staging": true, "production": true }
    }
  },
  "notes": "Updated notes"
}
```

**Response** `200 OK`: Returns the full updated onboarding request (same shape as GET).

**Error Responses**:
- `404 Not Found`: Onboarding request does not exist
- `409 Conflict`: Invalid status transition (e.g., trying to move from `completed` back to `draft`)
- `422 Unprocessable Entity`: Validation error

---

### DELETE /api/v1/onboarding/{id}

Soft-delete (cancel) an onboarding request. Only allowed for requests in `draft` or `in_progress` status.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Onboarding request ID |

**Response** `200 OK`:

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "cancelled",
    "cancelled_at": "2026-04-02T12:00:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Onboarding request does not exist
- `409 Conflict`: Cannot cancel a request that is already submitted/approved/completed

---

## Capacity Endpoints

### POST /api/v1/capacity/check

Run a capacity assessment for an onboarding request.

**Request Body**:

```json
{
  "app_code": "PAY-GW-001",
  "tech_stack": "JavaSpringBoot",
  "hosting_platform": "AKS",
  "selected_signals": ["metrics", "logs", "traces"],
  "instance_count": 5,
  "custom_overrides": {
    "metrics": 8000
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_code` | string | Yes | Application code |
| `tech_stack` | enum | Yes | `JavaSpringBoot`, `DotNet`, `NodeJS`, `Python`, `Go` |
| `hosting_platform` | enum | Yes | `AKS`, `VM`, `ECS`, `OnPrem` |
| `selected_signals` | array[enum] | Yes | Subset of `metrics`, `logs`, `traces`, `profiles` |
| `instance_count` | integer | No | Number of application instances (default: 1) |
| `custom_overrides` | object | No | Per-signal load overrides in native units |

**Response** `200 OK`:

```json
{
  "data": {
    "app_code": "PAY-GW-001",
    "overall_status": "AMBER",
    "overall_decision": "ALLOW_MONITOR",
    "signal_results": [
      {
        "signal": "metrics",
        "backend": "Mimir",
        "current_usage_pct": 62.5,
        "projected_usage_pct": 71.3,
        "estimated_new_load": 8000.0,
        "total_capacity": 1000000.0,
        "current_used": 625000.0,
        "unit": "active series",
        "status": "AMBER",
        "decision": "ALLOW_MONITOR",
        "recommendations": ["Consider reviewing metric cardinality before onboarding"]
      },
      {
        "signal": "logs",
        "backend": "Loki",
        "current_usage_pct": 38.2,
        "projected_usage_pct": 42.1,
        "estimated_new_load": 10.0,
        "total_capacity": 256.0,
        "current_used": 97.8,
        "unit": "MB/s",
        "status": "GREEN",
        "decision": "ALLOW",
        "recommendations": []
      },
      {
        "signal": "traces",
        "backend": "Tempo",
        "current_usage_pct": 45.0,
        "projected_usage_pct": 50.2,
        "estimated_new_load": 500.0,
        "total_capacity": 10000.0,
        "current_used": 4500.0,
        "unit": "spans/sec",
        "status": "GREEN",
        "decision": "ALLOW",
        "recommendations": []
      }
    ],
    "recommendations": [
      "Overall capacity is in AMBER range due to Mimir metrics utilization",
      "Monitor active series count after onboarding completes"
    ],
    "headroom_factor": 1.2,
    "evaluated_at": "2026-04-02T11:00:00Z"
  }
}
```

**Error Responses**:
- `422 Unprocessable Entity`: Invalid input (unknown tech stack, empty signals list)
- `502 Bad Gateway`: Grafana MCP server unreachable

---

### GET /api/v1/capacity/status/{onboarding_request_id}

Retrieve the capacity assessment for a specific onboarding request.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `onboarding_request_id` | UUID | Onboarding request ID |

**Response** `200 OK`: Same shape as the `data` field in the capacity check response.

**Error Responses**:
- `404 Not Found`: No capacity assessment exists for this onboarding request

---

## Similarity Endpoints

### POST /api/v1/similarity/search

Find applications with similar characteristics to reuse their observability configurations.

**Request Body**:

```json
{
  "app_code": "PAY-GW-001",
  "tech_stack": "JavaSpringBoot",
  "hosting_platform": "AKS",
  "selected_signals": ["metrics", "logs", "traces"],
  "portfolio": "Digital Payments",
  "limit": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `app_code` | string | Yes | Application code to find matches for |
| `tech_stack` | string | Yes | Technology stack |
| `hosting_platform` | string | Yes | Hosting platform |
| `selected_signals` | array | Yes | Selected telemetry signals |
| `portfolio` | string | No | Portfolio for boosting same-portfolio matches |
| `limit` | integer | No | Maximum matches to return (default: 5, max: 20) |

**Response** `200 OK`:

```json
{
  "data": {
    "query_app_code": "PAY-GW-001",
    "matches": [
      {
        "rank": 1,
        "matched_app_name": "Order Service",
        "matched_app_code": "ORD-SVC-001",
        "score": 0.94,
        "match_reasons": [
          "Same technology stack (JavaSpringBoot)",
          "Same hosting platform (AKS)",
          "Same portfolio (Digital Payments)",
          "Similar signal selection"
        ],
        "exporters": [
          { "name": "jmx-exporter", "version": "0.17.2", "config_url": "https://..." },
          { "name": "otel-java-agent", "version": "1.32.0", "config_url": "https://..." }
        ],
        "dashboards": [
          { "name": "JVM Overview", "uid": "jvm-overview-001", "url": "https://grafana.company.com/d/jvm-overview-001" },
          { "name": "Spring Boot Stats", "uid": "spring-boot-001", "url": "https://grafana.company.com/d/spring-boot-001" }
        ],
        "alert_rules": [
          { "name": "High Error Rate", "severity": "critical", "expr": "rate(http_server_errors_total[5m]) > 0.05" },
          { "name": "P99 Latency", "severity": "warning", "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 2" }
        ],
        "playbooks": [
          { "name": "Java OOM Runbook", "url": "https://confluence.company.com/pages/java-oom" }
        ],
        "pitfalls": [
          "JMX exporter can cause high cardinality if default MBeans are not filtered",
          "Enable gzip compression for log shipping to reduce bandwidth"
        ]
      },
      {
        "rank": 2,
        "matched_app_name": "Refund Processor",
        "matched_app_code": "REF-PROC-001",
        "score": 0.87,
        "match_reasons": [
          "Same technology stack (JavaSpringBoot)",
          "Same portfolio (Digital Payments)"
        ],
        "exporters": [ "..." ],
        "dashboards": [ "..." ],
        "alert_rules": [ "..." ],
        "playbooks": [],
        "pitfalls": []
      }
    ],
    "total_candidates_evaluated": 342,
    "search_duration_ms": 125
  }
}
```

---

## Artifact Endpoints

### POST /api/v1/artifacts/generate

Generate all artifacts (CR, Epic, Stories, Tasks, CTASKs) for an onboarding request and sync them to external systems.

**Request Body**:

```json
{
  "onboarding_request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "artifact_types": ["cr", "epic", "story", "task", "ctask"],
  "sync_to_external": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `onboarding_request_id` | UUID | Yes | Onboarding request to generate artifacts for |
| `artifact_types` | array[enum] | No | Types to generate (default: all). Values: `cr`, `epic`, `story`, `task`, `ctask` |
| `sync_to_external` | boolean | No | Whether to push to Jira/ServiceNow/Confluence (default: true) |

**Response** `201 Created`:

```json
{
  "data": {
    "onboarding_request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "artifacts": [
      {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "artifact_type": "epic",
        "status": "synced",
        "external_id": "JIRA-12345",
        "external_url": "https://jira.company.com/browse/JIRA-12345",
        "payload": {
          "summary": "Onboard PAY-GW-001 (Payment Gateway) to Observability Stack",
          "description": "Epic for onboarding Payment Gateway onto the LGTM observability stack...",
          "labels": ["observability", "onboarding", "digital-payments"],
          "priority": "High"
        }
      },
      {
        "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
        "artifact_type": "story",
        "status": "synced",
        "external_id": "JIRA-12346",
        "external_url": "https://jira.company.com/browse/JIRA-12346",
        "payload": {
          "summary": "Configure Prometheus metrics collection for PAY-GW-001",
          "description": "Set up JMX exporter and OpenTelemetry Java agent...",
          "story_points": 3,
          "parent_epic": "JIRA-12345"
        }
      },
      {
        "id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
        "artifact_type": "ctask",
        "status": "synced",
        "external_id": "CTASK0012345",
        "external_url": "https://servicenow.company.com/ctask/CTASK0012345",
        "payload": {
          "short_description": "Provision Grafana datasources for PAY-GW-001",
          "assignment_group": "Platform Engineering",
          "priority": "2 - High"
        }
      }
    ],
    "generated_at": "2026-04-02T11:30:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Onboarding request does not exist
- `409 Conflict`: Artifacts already generated for this request
- `502 Bad Gateway`: MCP server communication failure

---

### POST /api/v1/artifacts/preview

Generate a preview of artifacts without persisting or syncing to external systems.

**Request Body**: Same as `/generate`.

**Response** `200 OK`: Same shape as `/generate` response, but all artifacts have `status: "preview"` and no `external_id` or `external_url`.

---

### GET /api/v1/artifacts/{id}

Retrieve a single artifact by ID.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Artifact ID |

**Response** `200 OK`:

```json
{
  "data": {
    "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "onboarding_request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "artifact_type": "epic",
    "status": "synced",
    "external_id": "JIRA-12345",
    "external_url": "https://jira.company.com/browse/JIRA-12345",
    "payload": { "..." : "..." },
    "error_message": null,
    "created_at": "2026-04-02T11:30:00Z",
    "updated_at": "2026-04-02T11:30:05Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Artifact does not exist

---

## Governance Endpoints

### POST /api/v1/governance/validate

Run all governance rules against an onboarding request.

**Request Body**:

```json
{
  "onboarding_request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `onboarding_request_id` | UUID | Yes | The onboarding request to validate |

**Response** `200 OK`:

```json
{
  "data": {
    "passed": false,
    "score": 72,
    "total_rules_evaluated": 12,
    "hard_violations": [
      {
        "rule_id": "GOV-003",
        "severity": "HARD",
        "message": "Production environment requires all four telemetry signals (metrics, logs, traces, profiles) to be enabled.",
        "suggestion": "Enable the 'profiles' signal for the production environment to comply with the full-stack observability mandate.",
        "context": {
          "missing_signals": ["profiles"],
          "environment": "production"
        }
      }
    ],
    "soft_violations": [
      {
        "rule_id": "GOV-102",
        "severity": "SOFT",
        "message": "Application code 'PAY-GW-001' does not follow the recommended naming convention '{PORTFOLIO}-{APP}-{SEQ}'.",
        "suggestion": "Consider renaming to 'DPAY-PAYGW-001' for consistency with other applications.",
        "context": {
          "current_code": "PAY-GW-001",
          "suggested_pattern": "{PORTFOLIO}-{APP}-{SEQ}"
        }
      }
    ]
  }
}
```

---

### GET /api/v1/governance/rules

List all available governance rules.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `severity` | enum | - | Filter by `HARD` or `SOFT` |

**Response** `200 OK`:

```json
{
  "data": {
    "rules": [
      {
        "rule_id": "GOV-001",
        "severity": "HARD",
        "description": "Alert owner email must be a valid, non-empty email address belonging to an active distribution list or individual.",
        "category": "ownership"
      },
      {
        "rule_id": "GOV-002",
        "severity": "HARD",
        "description": "At least one telemetry signal must be selected for onboarding.",
        "category": "signals"
      },
      {
        "rule_id": "GOV-101",
        "severity": "SOFT",
        "description": "Recommended to enable metrics for all environments where the application is deployed.",
        "category": "best-practice"
      }
    ],
    "total": 12
  }
}
```

---

## Lookup Endpoints

### GET /api/v1/lookup/portfolios

List all available portfolios for the onboarding wizard auto-complete.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Partial match filter |
| `limit` | integer | 50 | Maximum results |

**Response** `200 OK`:

```json
{
  "data": {
    "portfolios": [
      { "name": "Digital Payments", "app_count": 24 },
      { "name": "Customer Identity", "app_count": 12 },
      { "name": "Core Banking", "app_count": 38 },
      { "name": "Mobile Platform", "app_count": 15 }
    ]
  }
}
```

---

### GET /api/v1/lookup/tech-stacks

List all supported technology stacks.

**Response** `200 OK`:

```json
{
  "data": {
    "tech_stacks": [
      { "value": "java_spring", "label": "Java / Spring Boot", "default_exporters": ["jmx-exporter", "otel-java-agent"] },
      { "value": "java_quarkus", "label": "Java / Quarkus", "default_exporters": ["otel-java-agent"] },
      { "value": "python_fastapi", "label": "Python / FastAPI", "default_exporters": ["otel-python"] },
      { "value": "python_django", "label": "Python / Django", "default_exporters": ["otel-python", "django-prometheus"] },
      { "value": "nodejs_express", "label": "Node.js / Express", "default_exporters": ["otel-node"] },
      { "value": "nodejs_nestjs", "label": "Node.js / NestJS", "default_exporters": ["otel-node", "nestjs-prometheus"] },
      { "value": "dotnet", "label": ".NET", "default_exporters": ["otel-dotnet"] },
      { "value": "go", "label": "Go", "default_exporters": ["otel-go", "prometheus-go-client"] },
      { "value": "rust", "label": "Rust", "default_exporters": ["otel-rust"] }
    ]
  }
}
```

---

### GET /api/v1/lookup/platforms

List all supported hosting platforms.

**Response** `200 OK`:

```json
{
  "data": {
    "platforms": [
      { "value": "eks", "label": "Amazon EKS", "cloud": "aws", "container_native": true },
      { "value": "ecs", "label": "Amazon ECS", "cloud": "aws", "container_native": true },
      { "value": "ec2", "label": "Amazon EC2", "cloud": "aws", "container_native": false },
      { "value": "lambda", "label": "AWS Lambda", "cloud": "aws", "container_native": false },
      { "value": "on_prem", "label": "On-Premises", "cloud": null, "container_native": false },
      { "value": "azure_aks", "label": "Azure AKS", "cloud": "azure", "container_native": true },
      { "value": "gke", "label": "Google GKE", "cloud": "gcp", "container_native": true }
    ]
  }
}
```

---

## Error Responses

All error responses use the standard error envelope format.

### Error Codes Reference

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `BAD_REQUEST` | Malformed request body or query parameters |
| 404 | `NOT_FOUND` | Requested resource does not exist |
| 409 | `CONFLICT` | Resource conflict (duplicate app code, invalid status transition) |
| 409 | `CAPACITY_EXCEEDED` | Capacity limits exceeded, onboarding blocked |
| 422 | `VALIDATION_ERROR` | Request data fails domain-level validation |
| 422 | `GOVERNANCE_VIOLATION` | Governance policy violation blocks the operation |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `MCP_CLIENT_ERROR` | Upstream MCP service communication failure |
| 503 | `SERVICE_UNAVAILABLE` | Service is not ready (dependency down) |

### Example Error Response

```json
{
  "error": {
    "status_code": 502,
    "error_code": "MCP_CLIENT_ERROR",
    "detail": "Failed to communicate with Jira MCP Server: connection timeout after 30s",
    "extra": {
      "service_name": "jira",
      "upstream_status": null
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-02T10:30:00Z"
  }
}
```
