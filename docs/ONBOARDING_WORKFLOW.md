# Onboarding Workflow

## 9-Step Guided Wizard

### Step 1: Application Identification
- Enter application name, select portfolio, provide app code (APP-NNNN)
- App code uniqueness validated against existing records

### Step 2: Platform & Technology
- Select hosting platform: AKS, VM, APIM, GCP, Azure Functions
- Select tech stack: Java Spring Boot, .NET, Node.js, Python, Go
- Dynamic info card shows common patterns for the combination

### Step 3: Telemetry Scope
- Multi-select telemetry signals: Metrics, Logs, Traces, Profiles, RUM, Faro, Dashboards, DB Plugins
- Minimum 1 signal required
- DB Plugins selection triggers additional configuration fields

### Step 4: Technical Configuration
- Dynamic fields based on platform + tech stack + signals
- AKS: namespace, deployment names, exporter type
- VM: log paths, log format
- Traces: service name, sampling rate (0.0–1.0)
- DB Plugins: database type, schema, connection alias

### Step 5: Dependencies & Ownership
- Alert owner email (required, must NOT be obs team)
- Alert owner team name
- Optional: DBA contact, vendor contact
- Platform dependencies (postgres-exporter, redis-exporter, etc.)

### Step 6: Environment Readiness
- Matrix: signals × environments (DEV, QA, QA2, PROD)
- DEV and QA required for all selected signals
- QA2 optional, PROD auto-checked
- Blocks navigation if DEV/QA not ready

### Step 7: Intelligence View (auto-populated)
- Calls similarity search API on step entry
- Shows top 5 similar apps with match details
- "Adopt Configuration" copies a similar app's config into the form
- Shows suggested exporters, dashboards, known pitfalls

### Step 8: Capacity Status (auto-populated)
- Calls capacity check API on step entry
- Per-signal gauges showing GREEN/AMBER/RED
- RED blocks further progress
- AMBER shows warning with recommendations

### Step 9: Review & Submit
- Full read-only summary of all steps
- Governance validation result with score
- HARD violations disable Submit button
- SOFT violations show warnings (overridable with justification)
- "Generate Artifacts" previews CR + Jira items
- "Submit" finalises the onboarding request

## Status Transitions

```
DRAFT → VALIDATING → CAPACITY_CHECK → PENDING_APPROVAL → APPROVED → IN_PROGRESS → COMPLETED
                                                       ↘ BLOCKED
                                                       ↘ REJECTED
```
