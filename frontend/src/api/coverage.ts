/* -------------------------------------------------------------------------- */
/*  Coverage & CMDB & Grafana-usage API calls                                 */
/*                                                                            */
/*  The backend returns flat payloads (no { data: ... } envelope) for these   */
/*  v2 endpoints, so we return response.data directly.                        */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  AppCoverageDetail,
  CMDBAppListResponse,
  CMDBAppRecord,
  CoverageGapsResponse,
  CoverageRefreshResponse,
  CoverageTrendPoint,
  GrafanaTeamListResponse,
  GrafanaUsageCoverageResponse,
  GrafanaUsageSummary,
  LeadershipCoverageResponse,
  PortfolioCoverage,
  ScopeCoverage,
  VpCoverage,
} from '@/types/coverage';

export async function getCoverageSummary(): Promise<LeadershipCoverageResponse> {
  const r = await apiClient.get<LeadershipCoverageResponse>('/coverage/summary');
  return r.data;
}

export async function getCoverageByPortfolio(): Promise<PortfolioCoverage[]> {
  const r = await apiClient.get<PortfolioCoverage[]>('/coverage/by-portfolio');
  return r.data;
}

export async function getCoverageByVp(): Promise<VpCoverage[]> {
  const r = await apiClient.get<VpCoverage[]>('/coverage/by-vp');
  return r.data;
}

export async function getCoverageByManager(): Promise<ScopeCoverage[]> {
  const r = await apiClient.get<ScopeCoverage[]>('/coverage/by-manager');
  return r.data;
}

export async function getCoverageByArchitect(): Promise<ScopeCoverage[]> {
  const r = await apiClient.get<ScopeCoverage[]>('/coverage/by-architect');
  return r.data;
}

export async function getCoverageByLob(): Promise<ScopeCoverage[]> {
  const r = await apiClient.get<ScopeCoverage[]>('/coverage/by-lob');
  return r.data;
}

export async function getCoverageGaps(filters?: {
  portfolio?: string;
  vp_email?: string;
}): Promise<CoverageGapsResponse> {
  const r = await apiClient.get<CoverageGapsResponse>('/coverage/gaps', {
    params: filters,
  });
  return r.data;
}

export async function getAppCoverageDetail(
  appCode: string,
): Promise<AppCoverageDetail> {
  const r = await apiClient.get<AppCoverageDetail>(`/coverage/app/${appCode}`);
  return r.data;
}

export async function refreshCoverage(): Promise<CoverageRefreshResponse> {
  const r = await apiClient.post<CoverageRefreshResponse>('/coverage/refresh');
  return r.data;
}

export async function getCoverageTrends(
  days = 90,
): Promise<CoverageTrendPoint[]> {
  const r = await apiClient.get<CoverageTrendPoint[]>('/coverage/trends', {
    params: { days },
  });
  return r.data;
}

// ── CMDB ─────────────────────────────────────────────────────────────────

export async function listCmdbApps(params?: {
  portfolio?: string;
  vp_email?: string;
  architect_email?: string;
  app_code?: string;
  page?: number;
  page_size?: number;
}): Promise<CMDBAppListResponse> {
  const r = await apiClient.get<CMDBAppListResponse>('/cmdb/apps', { params });
  return r.data;
}

export async function getCmdbApp(
  appCode: string,
): Promise<CMDBAppRecord | null> {
  const r = await listCmdbApps({ app_code: appCode, page_size: 1 });
  return r.items[0] ?? null;
}

export async function triggerCmdbSync(): Promise<{
  run_id: string;
  status: string;
  message: string;
}> {
  const r = await apiClient.post('/cmdb/sync');
  return r.data;
}

// ── Grafana usage ────────────────────────────────────────────────────────

export async function getGrafanaUsageSummary(): Promise<GrafanaUsageSummary> {
  const r = await apiClient.get<GrafanaUsageSummary>('/grafana-usage/summary');
  return r.data;
}

export async function listGrafanaTeams(params?: {
  org_id?: number;
  portfolio?: string;
  active_only?: boolean;
  page?: number;
  page_size?: number;
}): Promise<GrafanaTeamListResponse> {
  const r = await apiClient.get<GrafanaTeamListResponse>('/grafana-usage/teams', {
    params,
  });
  return r.data;
}

export async function getGrafanaAdoptionCoverage(): Promise<GrafanaUsageCoverageResponse> {
  const r = await apiClient.get<GrafanaUsageCoverageResponse>(
    '/grafana-usage/coverage',
  );
  return r.data;
}
