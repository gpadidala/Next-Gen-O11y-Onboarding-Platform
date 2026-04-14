/* -------------------------------------------------------------------------- */
/*  Integration-config types                                                  */
/* -------------------------------------------------------------------------- */

export type IntegrationTarget =
  | 'cmdb'
  | 'mimir'
  | 'loki'
  | 'tempo'
  | 'pyroscope'
  | 'faro'
  | 'grafana'
  | 'blackbox';

export const ALL_INTEGRATION_TARGETS: IntegrationTarget[] = [
  'cmdb',
  'mimir',
  'loki',
  'tempo',
  'pyroscope',
  'faro',
  'grafana',
  'blackbox',
];

export interface IntegrationConfig {
  id: string;
  target: IntegrationTarget;
  display_name: string;
  description?: string | null;
  base_url: string;
  auth_mode: string;
  has_token: boolean;
  use_mock: boolean;
  is_enabled: boolean;
  extra_config?: Record<string, unknown> | null;
  last_test_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfigUpdate {
  display_name?: string;
  description?: string;
  base_url?: string;
  auth_mode?: string;
  /** Send empty string to clear, undefined to leave untouched. */
  auth_token?: string;
  use_mock?: boolean;
  is_enabled?: boolean;
  extra_config?: Record<string, unknown>;
}

export interface IntegrationTestResult {
  target: string;
  ok: boolean;
  status: string;
  message: string;
  tested_at: string;
}

export interface CategoryBreakdown {
  label: string;
  total: number;
  onboarded: number;
  pct: number;
}

export interface IntegrationRunResult {
  target: string;
  ok: boolean;
  status: string;
  message: string;
  started_at: string;
  finished_at: string;
  items_processed: number;
  items_onboarded: number;
  category_label: string;
  categories: CategoryBreakdown[];
}
