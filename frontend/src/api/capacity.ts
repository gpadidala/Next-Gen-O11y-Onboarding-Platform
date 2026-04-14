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

export interface ComponentMetric {
  name: string;
  display_name: string;
  unit: string;
  current: number;
  min: number;
  max: number;
  avg: number;
  limit: number | null;
  utilization_pct: number | null;
  status: 'green' | 'amber' | 'red' | 'unknown';
}

export interface ComponentStack {
  component: string;
  display_name: string;
  source: 'mock' | 'live';
  base_url: string;
  use_mock: boolean;
  is_reachable: boolean;
  error: string | null;
  collected_at: string;
  metrics: ComponentMetric[];
}

export interface CapacityStackResponse {
  collected_at: string;
  components: ComponentStack[];
}

export async function getCapacityStack(): Promise<CapacityStackResponse> {
  const r = await apiClient.get<CapacityStackResponse>('/capacity/stack');
  return r.data;
}

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
