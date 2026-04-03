/* -------------------------------------------------------------------------- */
/*  Application constants                                                     */
/* -------------------------------------------------------------------------- */

/* ---- Wizard step metadata ---- */

export interface StepMeta {
  /** 1-based step number. */
  number: number;
  /** Short name shown in the stepper UI. */
  name: string;
  /** Longer description shown below the step name. */
  description: string;
}

export const STEPS: readonly StepMeta[] = [
  {
    number: 1,
    name: 'Application Identity',
    description: 'Basic application name, portfolio, and identifier.',
  },
  {
    number: 2,
    name: 'Platform & Stack',
    description: 'Hosting platform, tech stack, and runtime version.',
  },
  {
    number: 3,
    name: 'Telemetry Scope',
    description: 'Select which observability signals to enable.',
  },
  {
    number: 4,
    name: 'Technical Configuration',
    description: 'Sampling rates, retention, labels, and collector settings.',
  },
  {
    number: 5,
    name: 'Alert & Ownership',
    description: 'Alert owner email, team, escalation, and on-call details.',
  },
  {
    number: 6,
    name: 'Environment Readiness',
    description: 'Configure target environments and readiness criteria.',
  },
  {
    number: 7,
    name: 'Dependencies',
    description: 'Upstream, downstream, database, and message-queue dependencies.',
  },
  {
    number: 8,
    name: 'Governance',
    description: 'Review governance rules, data classification, and compliance.',
  },
  {
    number: 9,
    name: 'Review & Submit',
    description: 'Confirm all details and submit the onboarding request.',
  },
] as const;

export const TOTAL_STEPS = STEPS.length;

/* ---- Portfolio list ---- */

export const PORTFOLIOS: readonly string[] = [
  'Digital Banking',
  'Payments Platform',
  'Risk & Compliance',
  'Capital Markets',
  'Wealth Management',
  'Insurance',
  'Data & Analytics',
  'Infrastructure',
  'Cloud Platform',
  'DevOps Tooling',
  'Customer Experience',
  'Identity & Security',
] as const;

/* ---- Default values ---- */

export const DEFAULT_SAMPLING_RATE = 0.1;
export const DEFAULT_RETENTION_DAYS = 30;

/* ---- Observability team contacts ---- */
/* Canonical list lives in @/types/onboarding; re-exported here for convenience. */

export { OBS_TEAM_EMAILS } from '@/types/onboarding';

/* ---- API base URL (mirrored from env for non-Axios usage) ---- */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
