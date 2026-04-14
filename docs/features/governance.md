# Governance Engine

11 deterministic rules, 4 source files, 0 LLMs. Rules live in [`backend/app/engine/rules/`](../../backend/app/engine/rules/) and are auto-discovered at import time.

## The rules

| ID | Name | Severity | What it checks |
|---|---|---|---|
| **GOV-001** | DevTelemetryExists | HARD | DEV environment must be enabled for every selected signal |
| **GOV-002** | QATelemetryExists | HARD | QA environment must be enabled for every selected signal |
| **GOV-003** | AlertOwnerRequired | HARD | `alert_owner_email` must be non-empty / non-whitespace |
| **GOV-004** | AlertOwnerNotObsTeam | HARD | Reject emails matching `obs-team@`, `observability@`, `platform-monitoring@` |
| **GOV-005** | CapacityNotRed | HARD | `capacity_assessment.overall_status` must not be RED |
| **GOV-006** | AppCodeValid | HARD | `app_code` must match `APP-\d{4,6}` |
| **GOV-007** | AtLeastOneTelemetrySignal | HARD | At least one signal must be selected |
| **GOV-101** | CapacityAmberWarning | SOFT | Warn if any signal is AMBER |
| **GOV-102** | HighCardinalityRisk | SOFT | Warn if `estimated_series_count > 10,000` |
| **GOV-103** | NoTracesSelected | SOFT | Recommend enabling traces |
| **GOV-105** | MissingQA2Environment | SOFT | Recommend optional QA2 gate |

## Scoring

```
score = 100 − 20·len(HARD violations) − 5·len(SOFT violations)
passed = (len(HARD violations) == 0)
```

Floor at 0. INFO severity exists in the schema but no current rule uses it.

## Rule file layout

```
backend/app/engine/rules/
├── __init__.py            # auto-discovers + registers all rules
├── base.py                # Rule abstract class: rule_id, severity, evaluate(ctx) → Violation | None
├── capacity_rules.py      # GOV-005, GOV-101, GOV-102
├── environment_rules.py   # GOV-001, GOV-002, GOV-006, GOV-105
├── ownership_rules.py     # GOV-003, GOV-004
└── telemetry_rules.py     # GOV-007, GOV-103
```

Each rule is ~10 lines:

```python
class AlertOwnerRequired(Rule):
    rule_id = "GOV-003"
    severity = GovernanceSeverity.HARD
    description = "Alert owner email must be provided."

    def evaluate(self, ctx: RuleContext) -> Violation | None:
        if not ctx.alert_owner_email or not ctx.alert_owner_email.strip():
            return Violation(
                rule_id=self.rule_id,
                severity=self.severity,
                message="alert_owner_email is required.",
                field="alert_owner_email",
                suggestion="Provide a non-empty email for the on-call team.",
            )
        return None
```

## API

- `POST /api/v1/governance/validate` — body `{onboarding_request_id, dry_run}`, returns `GovernanceResult`
- `GET /api/v1/governance/rules` — public rule catalog for the Admin panel

## Where it runs

- Onboarding Step 9 calls validate before allowing submit
- `onboarding_service.submit_onboarding` re-validates as a final gate before the state transition (prevents bypass via direct API call)
