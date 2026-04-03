/* -------------------------------------------------------------------------- */
/*  Capacity planning types                                                   */
/* -------------------------------------------------------------------------- */

import type { TelemetrySignal } from './onboarding';

export interface CapacityCheckRequest {
  /** Telemetry signals to evaluate capacity for. */
  signals: TelemetrySignal[];
  /** Expected daily volume (e.g. events per day). */
  estimatedDailyVolume: number;
  /** Retention period in days. */
  retentionDays: number;
  /** Target environment (e.g. "PROD", "QA"). */
  environment: string;
}

export interface SignalCapacity {
  signal: TelemetrySignal;
  /** Current utilisation 0-100. */
  currentUtilisation: number;
  /** Projected utilisation after onboarding 0-100. */
  projectedUtilisation: number;
  /** Maximum capacity ceiling. */
  maxCapacity: number;
  /** Remaining headroom in native units. */
  availableHeadroom: number;
  /** Unit of measurement (e.g. "GB/day", "spans/sec"). */
  unit: string;
  /** Whether this signal has sufficient capacity. */
  withinBudget: boolean;
}

export interface CapacityCheckResponse {
  /** Overall pass / fail. */
  approved: boolean;
  /** Per-signal breakdown. */
  signals: SignalCapacity[];
  /** Human-readable summary. */
  summary: string;
  /** Recommendations if capacity is tight. */
  recommendations: string[];
  /** ISO timestamp of the assessment. */
  assessedAt: string;
}

export interface CapacityStatus {
  /** Per-signal current cluster-wide capacity. */
  signals: SignalCapacity[];
  /** Last refresh timestamp. */
  lastUpdated: string;
  /** Overall cluster health indicator. */
  clusterHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}
