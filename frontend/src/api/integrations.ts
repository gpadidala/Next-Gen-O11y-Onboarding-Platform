/* -------------------------------------------------------------------------- */
/*  Integration config API                                                    */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  IntegrationConfig,
  IntegrationConfigUpdate,
  IntegrationRunResult,
  IntegrationTarget,
  IntegrationTestResult,
} from '@/types/integration';

export async function listIntegrations(): Promise<IntegrationConfig[]> {
  const r = await apiClient.get<IntegrationConfig[]>('/integrations/');
  return r.data;
}

export async function getIntegration(
  target: IntegrationTarget,
): Promise<IntegrationConfig> {
  const r = await apiClient.get<IntegrationConfig>(`/integrations/${target}`);
  return r.data;
}

export async function updateIntegration(
  target: IntegrationTarget,
  payload: IntegrationConfigUpdate,
): Promise<IntegrationConfig> {
  const r = await apiClient.put<IntegrationConfig>(
    `/integrations/${target}`,
    payload,
  );
  return r.data;
}

export async function testIntegration(
  target: IntegrationTarget,
): Promise<IntegrationTestResult> {
  const r = await apiClient.post<IntegrationTestResult>(
    `/integrations/${target}/test`,
  );
  return r.data;
}

export async function runIntegration(
  target: IntegrationTarget,
): Promise<IntegrationRunResult> {
  const r = await apiClient.post<IntegrationRunResult>(
    `/integrations/${target}/run`,
  );
  return r.data;
}

export async function seedIntegrations(): Promise<{ inserted: number }> {
  const r = await apiClient.post<{ inserted: number }>('/integrations/seed');
  return r.data;
}
