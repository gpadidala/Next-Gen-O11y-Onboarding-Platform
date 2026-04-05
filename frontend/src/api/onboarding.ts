/* -------------------------------------------------------------------------- */
/*  Onboarding API calls                                                      */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  OnboardingCreate,
  OnboardingUpdate,
  OnboardingResponse,
  OnboardingListParams,
  OnboardingListResponse,
} from '@/types/onboarding';
import type { ApiResponse } from '@/types/api';

/**
 * Create a new onboarding request.
 */
export async function createOnboarding(
  data: OnboardingCreate,
): Promise<OnboardingResponse> {
  const response = await apiClient.post<ApiResponse<OnboardingResponse>>(
    '/onboardings/',
    data,
  );
  return response.data.data;
}

/**
 * Fetch a single onboarding by ID.
 */
export async function getOnboarding(
  id: string,
): Promise<OnboardingResponse> {
  const response = await apiClient.get<ApiResponse<OnboardingResponse>>(
    `/onboardings/${id}`,
  );
  return response.data.data;
}

/**
 * List onboardings with optional filtering and pagination.
 */
export async function listOnboardings(
  params?: OnboardingListParams,
): Promise<OnboardingListResponse> {
  const response = await apiClient.get<OnboardingListResponse>(
    '/onboardings',
    { params },
  );
  return response.data;
}

/**
 * Update an existing onboarding (partial update).
 */
export async function updateOnboarding(
  id: string,
  data: OnboardingUpdate,
): Promise<OnboardingResponse> {
  const response = await apiClient.put<ApiResponse<OnboardingResponse>>(
    `/onboardings/${id}`,
    data,
  );
  return response.data.data;
}

/**
 * Submit an onboarding for review / approval.
 */
export async function submitOnboarding(
  id: string,
): Promise<OnboardingResponse> {
  const response = await apiClient.post<ApiResponse<OnboardingResponse>>(
    `/onboardings/${id}/submit`,
  );
  return response.data.data;
}

/**
 * Delete (cancel) an onboarding.
 */
export async function deleteOnboarding(id: string): Promise<void> {
  await apiClient.delete(`/onboardings/${id}`);
}
