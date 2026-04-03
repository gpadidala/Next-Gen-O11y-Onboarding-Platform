/* -------------------------------------------------------------------------- */
/*  Artifact generation API calls                                             */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  ArtifactGenerateRequest,
  ArtifactPreviewResponse,
  ArtifactResponse,
} from '@/types/artifact';
import type { ApiResponse } from '@/types/api';

/**
 * Generate all deployment artifacts for an onboarding.
 */
export async function generateArtifacts(
  onboardingId: string,
): Promise<ArtifactResponse> {
  const payload: ArtifactGenerateRequest = { onboardingId };
  const response = await apiClient.post<ApiResponse<ArtifactResponse>>(
    '/artifacts/generate',
    payload,
  );
  return response.data.data;
}

/**
 * Preview artifacts before committing them.
 */
export async function previewArtifacts(
  onboardingId: string,
): Promise<ArtifactPreviewResponse> {
  const payload: ArtifactGenerateRequest = { onboardingId };
  const response = await apiClient.post<ApiResponse<ArtifactPreviewResponse>>(
    '/artifacts/preview',
    payload,
  );
  return response.data.data;
}

/**
 * Get previously generated artifacts for an onboarding.
 */
export async function getArtifacts(
  onboardingId: string,
): Promise<ArtifactResponse> {
  const response = await apiClient.get<ApiResponse<ArtifactResponse>>(
    `/artifacts/${onboardingId}`,
  );
  return response.data.data;
}
