/* -------------------------------------------------------------------------- */
/*  Similarity search API calls                                               */
/* -------------------------------------------------------------------------- */

import apiClient from './client';
import type {
  SimilaritySearchRequest,
  SimilaritySearchResponse,
} from '@/types/similarity';
import type { ApiResponse } from '@/types/api';

/**
 * Search for applications similar to the given criteria.
 */
export async function searchSimilar(
  data: SimilaritySearchRequest,
): Promise<SimilaritySearchResponse> {
  const response = await apiClient.post<ApiResponse<SimilaritySearchResponse>>(
    '/similarity/search',
    data,
  );
  return response.data.data;
}
