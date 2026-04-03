/* -------------------------------------------------------------------------- */
/*  Capacity API calls                                                        */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  CapacityCheckRequest,
  CapacityCheckResponse,
  CapacityStatus,
} from '@/types/capacity';
import type { ApiResponse } from '@/types/api';

/**
 * Run a capacity check for a proposed onboarding.
 */
export async function checkCapacity(
  data: CapacityCheckRequest,
): Promise<CapacityCheckResponse> {
  const response = await apiClient.post<ApiResponse<CapacityCheckResponse>>(
    '/capacity/check',
    data,
  );
  return response.data.data;
}

/**
 * Get the current cluster-wide capacity status.
 */
export async function getCapacityStatus(): Promise<CapacityStatus> {
  const response = await apiClient.get<ApiResponse<CapacityStatus>>(
    '/capacity/status',
  );
  return response.data.data;
}
