/* -------------------------------------------------------------------------- */
/*  Capacity planning Zustand store                                           */
/* -------------------------------------------------------------------------- */

import { create } from 'zustand';
import type {
  CapacityCheckRequest,
  CapacityCheckResponse,
} from '@/types/capacity';
import type { ApiError } from '@/types/api';
import { checkCapacity as checkCapacityApi } from '@/api/capacity';

/* ---- Store interface ---- */

export interface CapacityStore {
  assessment: CapacityCheckResponse | null;
  isLoading: boolean;
  error: ApiError | null;

  /** Run a capacity check against the backend. */
  checkCapacity: (data: CapacityCheckRequest) => Promise<void>;
  /** Clear the current assessment. */
  clearAssessment: () => void;
}

/* ---- Store implementation ---- */

export const useCapacityStore = create<CapacityStore>((set) => ({
  assessment: null,
  isLoading: false,
  error: null,

  checkCapacity: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await checkCapacityApi(data);
      set({ assessment: result, isLoading: false });
    } catch (err) {
      set({ error: err as ApiError, isLoading: false });
    }
  },

  clearAssessment: () =>
    set({ assessment: null, error: null }),
}));
