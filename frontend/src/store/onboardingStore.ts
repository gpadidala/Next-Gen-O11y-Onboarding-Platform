/* -------------------------------------------------------------------------- */
/*  Onboarding wizard Zustand store                                           */
/* -------------------------------------------------------------------------- */

import { create } from 'zustand';
import type {
  OnboardingFormData,
  OnboardingResponse,
} from '@/types/onboarding';
import type { ApiError } from '@/types/api';
import {
  createOnboarding,
  submitOnboarding as submitOnboardingApi,
} from '@/api/onboarding';
import { TOTAL_STEPS } from '@/utils/constants';

/* ---- Default / empty form ---- */

const DRAFT_STORAGE_KEY = 'obs_onboarding_draft';

const EMPTY_FORM: OnboardingFormData = {
  /* Step 1 */
  appName: '',
  portfolio: '',
  appCode: '',
  description: '',

  /* Step 2 */
  hostingPlatform: '',
  techStack: '',
  runtimeVersion: '',

  /* Step 3 */
  telemetrySignals: [],

  /* Step 4 */
  technicalConfig: {
    samplingRate: 0.1,
    retentionDays: 30,
    customLabels: {},
    autoInstrumentation: true,
  },

  /* Step 5 */
  alertOwnerEmail: '',
  alertOwnerTeam: '',
  escalationPolicy: '',
  oncallSchedule: '',

  /* Step 6 */
  environmentReadiness: {
    DEV: { enabled: true },
    QA: { enabled: true },
    STAGING: { enabled: false },
    PROD: { enabled: false },
  },

  /* Step 7 */
  dependencies: {
    upstream: [],
    downstream: [],
    databases: [],
    messageQueues: [],
  },

  /* Step 8 */
  governanceAcknowledged: false,
  dataClassification: '',
  complianceNotes: '',

  /* Step 9 */
  reviewConfirmed: false,
};

/* ---- Store interface ---- */

export interface OnboardingStore {
  formData: OnboardingFormData;
  currentStep: number;
  isDirty: boolean;
  isSubmitting: boolean;
  error: ApiError | null;
  submittedOnboarding: OnboardingResponse | null;

  /** Merge partial form data into the current state. */
  setFormData: (partial: Partial<OnboardingFormData>) => void;
  /** Jump to a specific step (1-based). */
  setStep: (step: number) => void;
  /** Advance to the next step (clamped to TOTAL_STEPS). */
  nextStep: () => void;
  /** Go back to the previous step (clamped to 1). */
  prevStep: () => void;
  /** Reset the form to its initial empty state. */
  resetForm: () => void;
  /** Persist the current draft to localStorage. */
  saveDraft: () => void;
  /** Load a previously saved draft from localStorage. Returns true if found. */
  loadDraft: () => boolean;
  /** Clear the saved draft from localStorage. */
  clearDraft: () => void;
  /** Submit the onboarding to the backend API. */
  submitOnboarding: () => Promise<OnboardingResponse>;
}

/* ---- Store implementation ---- */

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  formData: { ...EMPTY_FORM },
  currentStep: 1,
  isDirty: false,
  isSubmitting: false,
  error: null,
  submittedOnboarding: null,

  setFormData: (partial) =>
    set((state) => ({
      formData: { ...state.formData, ...partial },
      isDirty: true,
    })),

  setStep: (step) =>
    set({ currentStep: Math.max(1, Math.min(step, TOTAL_STEPS)) }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS),
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1),
    })),

  resetForm: () =>
    set({
      formData: { ...EMPTY_FORM },
      currentStep: 1,
      isDirty: false,
      isSubmitting: false,
      error: null,
      submittedOnboarding: null,
    }),

  saveDraft: () => {
    const { formData, currentStep } = get();
    const payload = JSON.stringify({ formData, currentStep });
    localStorage.setItem(DRAFT_STORAGE_KEY, payload);
    set({ isDirty: false });
  },

  loadDraft: () => {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return false;

    try {
      const parsed: { formData: OnboardingFormData; currentStep: number } =
        JSON.parse(raw);
      set({
        formData: { ...EMPTY_FORM, ...parsed.formData },
        currentStep: parsed.currentStep ?? 1,
        isDirty: false,
      });
      return true;
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return false;
    }
  },

  clearDraft: () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  },

  submitOnboarding: async () => {
    const { formData } = get();
    set({ isSubmitting: true, error: null });

    try {
      // Build the create payload (strip wizard-only fields)
      const { hostingPlatform, techStack } = formData;
      if (!hostingPlatform || !techStack) {
        throw {
          type: 'about:blank',
          title: 'Validation Error',
          status: 422,
          detail: 'Hosting platform and tech stack are required.',
        } satisfies ApiError;
      }

      const created = await createOnboarding({
        appName: formData.appName,
        portfolio: formData.portfolio,
        appCode: formData.appCode,
        description: formData.description,
        hostingPlatform,
        techStack,
        runtimeVersion: formData.runtimeVersion,
        telemetrySignals: formData.telemetrySignals,
        technicalConfig: formData.technicalConfig,
        alertOwnerEmail: formData.alertOwnerEmail,
        alertOwnerTeam: formData.alertOwnerTeam,
        escalationPolicy: formData.escalationPolicy,
        oncallSchedule: formData.oncallSchedule,
        environmentReadiness: formData.environmentReadiness,
        dependencies: formData.dependencies,
        dataClassification: formData.dataClassification,
        complianceNotes: formData.complianceNotes,
      });

      // Submit for review
      const submitted = await submitOnboardingApi(created.id);

      set({
        isSubmitting: false,
        submittedOnboarding: submitted,
        isDirty: false,
      });

      // Clean up the draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      return submitted;
    } catch (err) {
      const apiError = err as ApiError;
      set({ isSubmitting: false, error: apiError });
      throw apiError;
    }
  },
}));
