/* -------------------------------------------------------------------------- */
/*  Governance validation types                                               */
/* -------------------------------------------------------------------------- */

export const GovernanceSeverity = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
} as const;

export type GovernanceSeverity =
  (typeof GovernanceSeverity)[keyof typeof GovernanceSeverity];

export interface Violation {
  /** Machine-readable rule code (e.g. "GOV-001"). */
  ruleId: string;
  /** Human-readable rule name. */
  ruleName: string;
  /** Severity of this violation. */
  severity: GovernanceSeverity;
  /** Human-readable description of the violation. */
  message: string;
  /** JSON path or field that triggered the violation. */
  field?: string;
  /** Suggestion on how to fix the violation. */
  remediation?: string;
}

export interface GovernanceResult {
  /** Whether all ERROR-severity rules passed. */
  passed: boolean;
  /** All violations found (may include WARNINGs even when passed is true). */
  violations: Violation[];
  /** Total rules evaluated. */
  rulesEvaluated: number;
  /** ISO timestamp of the evaluation. */
  evaluatedAt: string;
}

export interface GovernanceRule {
  /** Unique rule identifier. */
  ruleId: string;
  /** Human-readable name. */
  name: string;
  /** Detailed description of the rule. */
  description: string;
  /** Severity if violated. */
  severity: GovernanceSeverity;
  /** Whether this rule is currently enabled. */
  enabled: boolean;
  /** Category grouping (e.g. "naming", "security", "capacity"). */
  category: string;
}

export interface GovernanceValidateRequest {
  onboardingId?: string;
  /** Inline data to validate (alternative to onboardingId). */
  data?: Record<string, unknown>;
}
