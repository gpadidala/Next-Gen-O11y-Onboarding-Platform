/* -------------------------------------------------------------------------- */
/*  Governance validation API calls                                           */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  GovernanceValidateRequest,
  GovernanceResult,
  GovernanceRule,
} from '@/types/governance';
import type { ApiResponse } from '@/types/api';

/**
 * Validate an onboarding against all governance rules.
 */
export async function validateGovernance(
  data: GovernanceValidateRequest,
): Promise<GovernanceResult> {
  const response = await apiClient.post<ApiResponse<GovernanceResult>>(
    '/governance/validate',
    data,
  );
  return response.data.data;
}

/**
 * Retrieve the list of all governance rules (enabled and disabled).
 */
export async function getGovernanceRules(): Promise<GovernanceRule[]> {
  const response = await apiClient.get<ApiResponse<GovernanceRule[]>>(
    '/governance/rules',
  );
  return response.data.data;
}
