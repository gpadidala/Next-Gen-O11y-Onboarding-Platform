/* -------------------------------------------------------------------------- */
/*  Coverage & Adoption types                                                 */
/* -------------------------------------------------------------------------- */

export type SignalName =
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'profiles'
  | 'faro'
  | 'synthetics';

export const ALL_SIGNALS: SignalName[] = [
  'metrics',
  'logs',
  'traces',
  'profiles',
  'faro',
  'synthetics',
];

export interface SignalCoverage {
  signal: SignalName;
  total_apps: number;
  onboarded: number;
  coverage_pct: number;
  volume_metric_name?: string | null;
  volume_metric_value?: number | null;
}

export interface ScopeCoverage {
  scope_type: string;
  scope_key: string;
  total_apps: number;
  apps_onboarded_any: number;
  coverage_pct_any: number;
  coverage_pct_full_stack: number;
  per_signal: SignalCoverage[];
}

export interface PortfolioCoverage {
  portfolio: string;
  vp_name?: string | null;
  vp_email?: string | null;
  total_apps: number;
  onboarded: number;
  gap: number;
  coverage_pct_any: number;
  per_signal: SignalCoverage[];
}

export interface VpCoverage {
  vp_name?: string | null;
  vp_email?: string | null;
  portfolios: string[];
  total_apps: number;
  onboarded: number;
  coverage_pct_any: number;
  per_signal: SignalCoverage[];
}

export interface LeadershipCoverageResponse {
  snapshot_date: string;
  global: ScopeCoverage;
  portfolios: PortfolioCoverage[];
  vps: VpCoverage[];
}

export interface LgtmAppCoverageRecord {
  id: string;
  app_code: string;
  signal: SignalName;
  is_onboarded: boolean;
  tenant_id?: string | null;
  active_series_count?: number | null;
  log_volume_bytes_per_day?: number | null;
  span_rate_per_sec?: number | null;
  profile_rate_per_sec?: number | null;
  faro_sessions_per_day?: number | null;
  synthetics_url_count?: number | null;
  last_sample_at?: string | null;
  source_probe?: string | null;
  collected_at: string;
}

export interface AppCoverageDetail {
  app_code: string;
  app_name: string;
  portfolio?: string | null;
  vp_name?: string | null;
  manager_name?: string | null;
  architect_name?: string | null;
  per_signal: LgtmAppCoverageRecord[];
  onboarding_status?: string | null;
}

export interface CoverageTrendPoint {
  snapshot_date: string;
  coverage_pct_any: number;
  coverage_pct_full_stack: number;
}

export interface CoverageRefreshResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface CMDBAppRecord {
  id: string;
  app_code: string;
  app_name: string;
  portfolio: string;
  sub_portfolio?: string | null;
  description?: string | null;
  business_criticality?: string | null;
  hosting_platform?: string | null;
  tech_stack?: string | null;
  vp_name?: string | null;
  vp_email?: string | null;
  director_name?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  architect_name?: string | null;
  architect_email?: string | null;
  product_owner?: string | null;
  lob?: string | null;
  region?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_team?: string | null;
  cost_center?: string | null;
  cmdb_id?: string | null;
  cmdb_sync_source?: string | null;
  cmdb_last_synced_at?: string | null;
  retired: boolean;
}

export interface CoverageGapsResponse {
  items: CMDBAppRecord[];
  total: number;
}

export interface CMDBAppListResponse {
  items: CMDBAppRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface GrafanaUsageSummary {
  total_orgs: number;
  total_teams: number;
  active_teams_30d: number;
  total_users: number;
  active_users_30d: number;
  total_dashboards: number;
  dashboards_viewed_30d: number;
  team_adoption_pct: number;
}

export interface GrafanaTeamUsage {
  id: string;
  org_id: number;
  team_id: number;
  team_name: string;
  mapped_app_code?: string | null;
  mapped_portfolio?: string | null;
  member_count: number;
  active_users_30d: number;
  dashboard_count: number;
  dashboard_views_30d: number;
  last_activity_at?: string | null;
  collected_at: string;
}

export interface GrafanaTeamListResponse {
  items: GrafanaTeamUsage[];
  total: number;
  page: number;
  page_size: number;
}

export interface GrafanaUsageCoverageResponse {
  total_cmdb_apps: number;
  apps_with_mapped_team: number;
  team_coverage_pct: number;
  unmapped_app_codes: string[];
}
