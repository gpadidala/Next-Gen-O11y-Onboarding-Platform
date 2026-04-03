/* -------------------------------------------------------------------------- */
/*  OnboardingContext - Wizard state management with draft persistence        */
/* -------------------------------------------------------------------------- */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  OnboardingFormData,
  TechnicalConfig,
  EnvironmentReadiness,
  Dependencies,
  DatabaseType,
  LogFormat,
  ExporterType,
  PlatformDependency,
} from '@/types/onboarding';
import type { CapacityCheckResponse } from '@/types/capacity';
import type { SimilaritySearchResponse } from '@/types/similarity';
import type { GovernanceResult } from '@/types/governance';

/* -------------------------------------------------------------------------- */
/*  Storage key                                                               */
/* -------------------------------------------------------------------------- */

const DRAFT_STORAGE_KEY = 'obs_onboarding_draft';

/* -------------------------------------------------------------------------- */
/*  Extended step data interfaces for Steps 4 & 5                             */
/* -------------------------------------------------------------------------- */

export interface Step4ExtendedData {
  namespace?: string;
  deploymentNames?: string[];
  exporterType?: ExporterType | '';
  logPaths?: string[];
  logFormat?: LogFormat | '';
  serviceName?: string;
  samplingRate?: number;
  dbType?: DatabaseType | '';
  dbSchema?: string;
  dbConnectionAlias?: string;
}

export interface Step5ExtendedData {
  alertOwnerEmail: string;
  alertOwnerTeam: string;
  dbaContact?: string;
  vendorContact?: string;
  platformDependencies: PlatformDependency[];
}

/* -------------------------------------------------------------------------- */
/*  Default form values                                                       */
/* -------------------------------------------------------------------------- */

const defaultTechnicalConfig: TechnicalConfig = {
  samplingRate: 0.1,
  retentionDays: 30,
  customLabels: {},
  autoInstrumentation: true,
};

const defaultEnvironmentReadiness: EnvironmentReadiness = {
  DEV: { enabled: false },
  QA: { enabled: false },
  STAGING: { enabled: false },
  PROD: { enabled: true },
};

const defaultDependencies: Dependencies = {
  upstream: [],
  downstream: [],
  databases: [],
  messageQueues: [],
};

export const defaultFormData: OnboardingFormData = {
  appName: '',
  portfolio: '',
  appCode: '',
  description: '',
  hostingPlatform: '',
  techStack: '',
  runtimeVersion: '',
  telemetrySignals: [],
  technicalConfig: defaultTechnicalConfig,
  alertOwnerEmail: '',
  alertOwnerTeam: '',
  escalationPolicy: '',
  oncallSchedule: '',
  environmentReadiness: defaultEnvironmentReadiness,
  dependencies: defaultDependencies,
  governanceAcknowledged: false,
  dataClassification: '',
  complianceNotes: '',
  reviewConfirmed: false,
};

const defaultStep4Extended: Step4ExtendedData = {
  namespace: '',
  deploymentNames: [],
  exporterType: '',
  logPaths: [],
  logFormat: '',
  serviceName: '',
  samplingRate: 0.1,
  dbType: '',
  dbSchema: '',
  dbConnectionAlias: '',
};

const defaultStep5Extended: Step5ExtendedData = {
  alertOwnerEmail: '',
  alertOwnerTeam: '',
  dbaContact: '',
  vendorContact: '',
  platformDependencies: [],
};

/* -------------------------------------------------------------------------- */
/*  Persisted draft shape                                                     */
/* -------------------------------------------------------------------------- */

interface DraftState {
  currentStep: number;
  formData: OnboardingFormData;
  step4Extended: Step4ExtendedData;
  step5Extended: Step5ExtendedData;
}

/* -------------------------------------------------------------------------- */
/*  Context value interface                                                   */
/* -------------------------------------------------------------------------- */

export interface OnboardingContextValue {
  /** Current step number (1-9). */
  currentStep: number;
  /** Total number of steps. */
  totalSteps: number;
  /** The full wizard form data. */
  formData: OnboardingFormData;
  /** Extended step 4 data for dynamic config fields. */
  step4Extended: Step4ExtendedData;
  /** Extended step 5 data for dependencies. */
  step5Extended: Step5ExtendedData;
  /** Whether the wizard is in edit mode. */
  isEditing: boolean;
  /** Onboarding ID when editing. */
  onboardingId: string | null;
  /** Whether unsaved changes exist. */
  isDirty: boolean;
  /** API response results held in context. */
  capacityResult: CapacityCheckResponse | null;
  similarityResult: SimilaritySearchResponse | null;
  governanceResult: GovernanceResult | null;

  /** Navigate to a specific step (1-9). */
  setStep: (step: number) => void;
  /** Go to the next step. */
  nextStep: () => void;
  /** Go to the previous step. */
  prevStep: () => void;
  /** Update a subset of form data (shallow merge). */
  updateFormData: (patch: Partial<OnboardingFormData>) => void;
  /** Replace the entire form data (e.g. when adopting a config). */
  setFormData: (data: OnboardingFormData) => void;
  /** Update step 4 extended data. */
  setStep4Extended: (data: Partial<Step4ExtendedData>) => void;
  /** Update step 5 extended data. */
  setStep5Extended: (data: Partial<Step5ExtendedData>) => void;
  /** Persist current state to localStorage. Returns true on success. */
  saveDraft: () => boolean;
  /** Clear persisted draft and reset wizard. */
  clearDraft: () => void;
  /** Mark the form as clean (not dirty). */
  markClean: () => void;
  /** Reset the wizard to initial state. */
  resetWizard: () => void;
  /** Set capacity check result. */
  setCapacityResult: (result: CapacityCheckResponse | null) => void;
  /** Set similarity search result. */
  setSimilarityResult: (result: SimilaritySearchResponse | null) => void;
  /** Set governance validation result. */
  setGovernanceResult: (result: GovernanceResult | null) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

export interface OnboardingProviderProps {
  children: ReactNode;
  /** Number of wizard steps (default 9). */
  totalSteps?: number;
  /** Pre-populated form data (edit mode). */
  initialData?: OnboardingFormData;
  /** Onboarding ID if editing. */
  onboardingId?: string | null;
}

export function OnboardingProvider({
  children,
  totalSteps = 9,
  initialData,
  onboardingId = null,
}: OnboardingProviderProps) {
  /* -- Load draft from localStorage on mount -- */
  const loadedDraft = useRef<DraftState | null>(null);

  if (loadedDraft.current === null && !initialData) {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        loadedDraft.current = JSON.parse(raw) as DraftState;
      }
    } catch {
      // Ignore corrupted draft
    }
  }

  const [currentStep, setCurrentStep] = useState<number>(
    loadedDraft.current?.currentStep ?? 1,
  );
  const [formData, setFormDataRaw] = useState<OnboardingFormData>(
    initialData ?? loadedDraft.current?.formData ?? defaultFormData,
  );
  const [step4Extended, setStep4ExtendedRaw] = useState<Step4ExtendedData>(
    loadedDraft.current?.step4Extended ?? defaultStep4Extended,
  );
  const [step5Extended, setStep5ExtendedRaw] = useState<Step5ExtendedData>(
    loadedDraft.current?.step5Extended ?? defaultStep5Extended,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [capacityResult, setCapacityResult] = useState<CapacityCheckResponse | null>(null);
  const [similarityResult, setSimilarityResult] = useState<SimilaritySearchResponse | null>(null);
  const [governanceResult, setGovernanceResult] = useState<GovernanceResult | null>(null);

  const isEditing = Boolean(onboardingId);

  /* -- Step navigation (1-based) -- */
  const setStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) setCurrentStep(step);
    },
    [totalSteps],
  );

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  /* -- Data setters -- */
  const updateFormData = useCallback((patch: Partial<OnboardingFormData>) => {
    setFormDataRaw((prev) => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  const setFormData = useCallback((data: OnboardingFormData) => {
    setFormDataRaw(data);
    setIsDirty(true);
  }, []);

  const setStep4Extended = useCallback((data: Partial<Step4ExtendedData>) => {
    setStep4ExtendedRaw((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  const setStep5Extended = useCallback((data: Partial<Step5ExtendedData>) => {
    setStep5ExtendedRaw((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => setIsDirty(false), []);

  /* -- Draft persistence -- */
  const saveDraft = useCallback((): boolean => {
    try {
      const state: DraftState = {
        currentStep,
        formData,
        step4Extended,
        step5Extended,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
      setIsDirty(false);
      return true;
    } catch {
      return false;
    }
  }, [currentStep, formData, step4Extended, step5Extended]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setFormDataRaw(defaultFormData);
    setStep4ExtendedRaw(defaultStep4Extended);
    setStep5ExtendedRaw(defaultStep5Extended);
    setCapacityResult(null);
    setSimilarityResult(null);
    setGovernanceResult(null);
    setCurrentStep(1);
    setIsDirty(false);
  }, []);

  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setFormDataRaw(defaultFormData);
    setStep4ExtendedRaw(defaultStep4Extended);
    setStep5ExtendedRaw(defaultStep5Extended);
    setCapacityResult(null);
    setSimilarityResult(null);
    setGovernanceResult(null);
    setIsDirty(false);
  }, []);

  /* -- Auto-save draft on unload -- */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirty) {
        const state: DraftState = { currentStep, formData, step4Extended, step5Extended };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, currentStep, formData, step4Extended, step5Extended]);

  /* -- Context value (memoized) -- */
  const value = useMemo<OnboardingContextValue>(
    () => ({
      currentStep,
      totalSteps,
      formData,
      step4Extended,
      step5Extended,
      isEditing,
      onboardingId,
      isDirty,
      capacityResult,
      similarityResult,
      governanceResult,
      setStep,
      nextStep,
      prevStep,
      updateFormData,
      setFormData,
      setStep4Extended,
      setStep5Extended,
      saveDraft,
      clearDraft,
      markClean,
      resetWizard,
      setCapacityResult,
      setSimilarityResult,
      setGovernanceResult,
    }),
    [
      currentStep,
      totalSteps,
      formData,
      step4Extended,
      step5Extended,
      isEditing,
      onboardingId,
      isDirty,
      capacityResult,
      similarityResult,
      governanceResult,
      setStep,
      nextStep,
      prevStep,
      updateFormData,
      setFormData,
      setStep4Extended,
      setStep5Extended,
      saveDraft,
      clearDraft,
      markClean,
      resetWizard,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}

export default OnboardingContext;
