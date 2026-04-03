# Data Models

## Database: PostgreSQL 16 + pgvector

### Tables

#### `onboarding_requests`
Primary table storing all onboarding requests.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| id | UUID | PK, default gen_random_uuid() | Unique identifier |
| app_name | VARCHAR(100) | NOT NULL | Application display name |
| app_code | VARCHAR(20) | UNIQUE, NOT NULL, INDEX | CMDB application code (APP-NNNN) |
| portfolio | VARCHAR(100) | NOT NULL | Business portfolio |
| hosting_platform | VARCHAR(50) | NOT NULL | AKS, VM, APIM, GCP, AzureFunctions |
| tech_stack | VARCHAR(50) | NOT NULL | JavaSpringBoot, DotNet, NodeJS, Python, Go |
| status | VARCHAR(30) | NOT NULL, default DRAFT | Workflow status |
| alert_owner_email | VARCHAR(255) | NOT NULL | Alert owner email (must not be obs team) |
| alert_owner_team | VARCHAR(100) | NOT NULL | Alert owner team name |
| notes | TEXT | nullable | Free-text notes |
| created_by | VARCHAR(255) | nullable | Submitter identity |
| created_at | TIMESTAMPTZ | default now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | default now() | Last modification |
| submitted_at | TIMESTAMPTZ | nullable | Submission timestamp |

#### `telemetry_scopes`
Selected telemetry signals per onboarding.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| onboarding_id | UUID | FK → onboarding_requests(id) CASCADE |
| signals | JSONB | Array of signal names |
| environment_matrix | JSONB | Per-env per-signal readiness |

#### `technical_configs`
Dynamic technical configuration based on platform/stack/signals.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| onboarding_id | UUID | FK → onboarding_requests(id) CASCADE |
| config_data | JSONB | Platform-specific configuration |

#### `environment_readiness`
Per-environment readiness flags.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| onboarding_id | UUID | FK → onboarding_requests(id) CASCADE |
| dev_ready | BOOLEAN | default false |
| qa_ready | BOOLEAN | default false |
| qa2_ready | BOOLEAN | default false |
| prod_ready | BOOLEAN | default true |
| signal_env_matrix | JSONB | Detailed per-signal per-env matrix |

#### `capacity_assessments`
Capacity evaluation results from the capacity engine.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| onboarding_id | UUID | FK → onboarding_requests(id) CASCADE |
| overall_status | VARCHAR(10) | GREEN, AMBER, RED |
| signal_results | JSONB | Per-signal evaluation details |
| recommendations | JSONB | Array of recommendation strings |
| can_proceed | BOOLEAN | Whether onboarding can continue |
| escalation_required | BOOLEAN | Whether platform team must review |
| assessed_at | TIMESTAMPTZ | Assessment timestamp |

#### `similarity_matches`
Similar onboarding results from the similarity engine.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| onboarding_id | UUID | FK → onboarding_requests(id) CASCADE |
| rank | INTEGER | Match rank (1 = best) |
| matched_app_name | VARCHAR(200) | Similar app name |
| matched_app_code | VARCHAR(20) | Similar app code |
| score | FLOAT | Similarity score (0-1) |
| match_reasons | JSONB | Why this app matched |
| exporters | JSONB | Recommended exporters |
| dashboards | JSONB | Recommended dashboards |
| alert_rules | JSONB | Recommended alert rules |
| playbooks | JSONB | Related playbook URLs |
| pitfalls | JSONB | Known issues to avoid |

#### `artifacts`
Generated CR and Jira artifacts.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| onboarding_id | UUID | FK → onboarding_requests(id) CASCADE |
| artifact_type | VARCHAR(20) | CR, EPIC, STORY, TASK, CTASK |
| external_id | VARCHAR(100) | Jira key or ServiceNow number |
| external_url | VARCHAR(500) | Link to external system |
| payload | JSONB | Full artifact content |
| status | VARCHAR(30) | default DRAFT |

#### `audit_logs`
Append-only audit trail.

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK |
| entity_type | VARCHAR(100) | onboarding, capacity, etc. |
| entity_id | VARCHAR(100) | Entity identifier |
| action | VARCHAR(100) | CREATED, UPDATED, SUBMITTED, etc. |
| actor | VARCHAR(255) | Who performed the action |
| changes | JSONB | Changed field values |
| timestamp | TIMESTAMPTZ | INDEX, default now() |

### Enums

- **OnboardingStatus**: DRAFT, VALIDATING, CAPACITY_CHECK, PENDING_APPROVAL, APPROVED, IN_PROGRESS, COMPLETED, BLOCKED, REJECTED
- **HostingPlatform**: AKS, VM, APIM, GCP, AzureFunctions
- **TechStack**: JavaSpringBoot, DotNet, NodeJS, Python, Go
- **TelemetrySignal**: metrics, logs, traces, profiles, rum, faro, grafanaDashboards, dbPlugins
- **CapacityStatus**: GREEN, AMBER, RED
- **ArtifactType**: CR, EPIC, STORY, TASK, CTASK
