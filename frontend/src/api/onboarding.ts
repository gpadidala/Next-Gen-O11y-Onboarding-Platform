/* -------------------------------------------------------------------------- */
/*  Onboarding API calls                                                      */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  OnboardingCreate,
  OnboardingUpdate,
  OnboardingListParams,
} from '@/types/onboarding';

// Backend returns objects flat (no { data: ... } wrapper) — use 'any' shaped responses
// and extract fields directly from response.data.

export interface BackendOnboardingResponse {
  id: string;
  app_name: string;
  app_code: string;
  portfolio: string;
  hosting_platform: string;
  tech_stack: string;
  status: string;
  alert_owner_email: string;
  alert_owner_team: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  notes?: string | null;
  success?: boolean;
  message?: string;
}

export interface BackendListResponse {
  items: BackendOnboardingResponse[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

/**
 * Create a new onboarding request.
 */
export async function createOnboarding(
  data: OnboardingCreate,
): Promise<BackendOnboardingResponse> {
  const response = await apiClient.post<BackendOnboardingResponse>(
    '/onboardings/',
    data,
  );
  return response.data;
}

/**
 * Fetch a single onboarding by ID.
 */
export async function getOnboarding(
  id: string,
): Promise<BackendOnboardingResponse> {
  const response = await apiClient.get<BackendOnboardingResponse>(
    `/onboardings/${id}/`,
  );
  return response.data;
}

/**
 * List onboardings with optional filtering and pagination.
 */
export async function listOnboardings(
  params?: OnboardingListParams,
): Promise<BackendListResponse> {
  const response = await apiClient.get<BackendListResponse>(
    '/onboardings/',
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
): Promise<BackendOnboardingResponse> {
  const response = await apiClient.put<BackendOnboardingResponse>(
    `/onboardings/${id}/`,
    data,
  );
  return response.data;
}

/**
 * Submit an onboarding for review / approval.
 */
export async function submitOnboarding(
  id: string,
): Promise<BackendOnboardingResponse> {
  const response = await apiClient.post<BackendOnboardingResponse>(
    `/onboardings/${id}/submit/`,
  );
  return response.data;
}

/**
 * Delete (cancel) an onboarding.
 */
export async function deleteOnboarding(id: string): Promise<void> {
  await apiClient.delete(`/onboardings/${id}/`);
}
