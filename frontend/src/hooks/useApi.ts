/* -------------------------------------------------------------------------- */
/*  Generic async data-fetching hook                                          */
/* -------------------------------------------------------------------------- */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ApiError } from '@/types/api';

/* ---- Hook return type ---- */

export interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  /** Manually (re)trigger the fetch. */
  refetch: () => Promise<void>;
}

/* ---- Options ---- */

export interface UseApiOptions {
  /** If true, the fetch runs immediately on mount. Defaults to true. */
  immediate?: boolean;
}

/* ---- Hook implementation ---- */

/**
 * Generic hook for async API calls with loading, error, and data states.
 *
 * @param fetcher - An async function that returns data of type T.
 * @param options - Configuration options.
 *
 * @example
 * ```ts
 * const { data, isLoading, error, refetch } = useApi(
 *   () => getOnboarding(id),
 *   { immediate: true },
 * );
 * ```
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = {},
): UseApiReturn<T> {
  const { immediate = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<ApiError | null>(null);

  // Track component mount to avoid setting state after unmount
  const mountedRef = useRef(true);
  // Keep the latest fetcher in a ref to avoid stale closures
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as ApiError);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Auto-fetch on mount when `immediate` is true
  useEffect(() => {
    if (immediate) {
      void refetch();
    }
  }, [immediate, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, isLoading, error, refetch };
}
