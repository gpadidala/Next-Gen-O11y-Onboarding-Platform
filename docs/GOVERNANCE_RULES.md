# Governance Rules

## HARD Rules (Block Submission)

Violations of HARD rules prevent the onboarding from being submitted.

| Rule ID | Name | Check | Consequence |
|---------|------|-------|-------------|
| GOV-001 | DEV Telemetry Exists | DEV checkbox = true for ALL selected signals | Cannot submit |
| GOV-002 | QA Telemetry Exists | QA checkbox = true for ALL selected signals | Cannot submit |
| GOV-003 | Alert Owner Required | alertOwnerEmail is not empty | Cannot submit |
| GOV-004 | Alert Owner Not Obs Team | alertOwnerEmail NOT in obs_team_emails | Cannot submit |
| GOV-005 | Capacity Not RED | overallStatus != RED | Cannot submit |
| GOV-006 | AppCode Must Be Valid | appCode matches pattern `APP-\d{4,6}` | Cannot submit |
| GOV-007 | At Least 1 Telemetry Signal | At least one signal selected | Cannot submit |

## SOFT Rules (Warning, Allow with Justification)

SOFT rule violations generate warnings but allow submission with justification.

| Rule ID | Name | Check | Recommendation |
|---------|------|-------|---------------|
| GOV-101 | Capacity AMBER | Any signal in AMBER status | Review with platform team |
| GOV-102 | High Cardinality Risk | Estimated series > 10,000 | Implement label allow-lists |
| GOV-103 | No Traces Selected | Traces not in telemetryScope | Enable for full observability |
| GOV-104 | No Similar Apps Found | 0 similarity matches | First-of-kind — extra review |
| GOV-105 | Missing QA2 Environment | QA2 not checked | Enable for complete validation |

## Scoring

- Start at 100
- Each HARD violation: -20 points
- Each SOFT violation: -5 points
- Minimum score: 0

## Evaluation Flow

1. All HARD rules evaluated first (enables fast-fail)
2. All SOFT rules evaluated
3. `passed = len(hard_violations) == 0`
4. Score calculated
5. Result returned with full violation details

## Obs Team Email Patterns

The following email prefixes identify observability team members (configurable):
- `obs-team@`
- `observability@`
- `platform-monitoring@`
