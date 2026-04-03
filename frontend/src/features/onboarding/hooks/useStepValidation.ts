/* -------------------------------------------------------------------------- */
/*  useStepValidation - Per-step Zod validation hook                          */
/* -------------------------------------------------------------------------- */

import { useCallback, useState } from 'react';
import type { z, ZodError } from 'zod';
import { useOnboarding } from '@/features/onboarding/context/OnboardingContext';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  step6Schema,
  step7Schema,
  step8Schema,
  step9Schema,
} from '@/utils/validators';

/* -------------------------------------------------------------------------- */
/*  Schema map                                                                */
/* -------------------------------------------------------------------------- */

const stepSchemaMap: Record<number, z.ZodSchema> = {
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
  5: step5Schema,
  6: step6Schema,
  7: step7Schema,
  8: step8Schema,
  9: step9Schema,
};

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface StepValidationError {
  field: string;
  message: string;
}

export interface UseStepValidationReturn {
  /** Validate a specific step. Returns true if valid. */
  validateStep: (stepNumber: number) => Promise<boolean>;
  /** Validate the current step. Returns true if valid. */
  validateCurrentStep: () => Promise<boolean>;
  /** Errors for the last validation run. */
  errors: StepValidationError[];
  /** Whether a validation is currently running. */
  isValidating: boolean;
  /** Clear all errors. */
  clearErrors: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useStepValidation(): UseStepValidationReturn {
  const { currentStep, formData, step4Extended, step5Extended } = useOnboarding();
  const [errors, setErrors] = useState<StepValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Build the data object for a given step number from context.
   */
  const getStepData = useCallback(
    (stepNumber: number): Record<string, unknown> => {
      switch (stepNumber) {
        case 1:
          return {
            appName: formData.appName,
            portfolio: formData.portfolio,
            appCode: formData.appCode,
            description: formData.description,
          };
        case 2:
          return {
            hostingPlatform: formData.hostingPlatform,
            techStack: formData.techStack,
            runtimeVersion: formData.runtimeVersion,
          };
        case 3:
          return {
            telemetrySignals: formData.telemetrySignals,
            dbType: step4Extended.dbType,
            dbSchema: step4Extended.dbSchema,
            dbConnectionAlias: step4Extended.dbConnectionAlias,
          };
        case 4:
          return {
            technicalConfig: formData.technicalConfig,
            namespace: step4Extended.namespace,
            deploymentNames: step4Extended.deploymentNames,
            exporterType: step4Extended.exporterType,
            logPaths: step4Extended.logPaths,
            logFormat: step4Extended.logFormat,
            serviceName: step4Extended.serviceName,
          };
        case 5:
          return {
            alertOwnerEmail: step5Extended.alertOwnerEmail || formData.alertOwnerEmail,
            alertOwnerTeam: step5Extended.alertOwnerTeam || formData.alertOwnerTeam,
            escalationPolicy: formData.escalationPolicy,
            oncallSchedule: formData.oncallSchedule,
            dbaContact: step5Extended.dbaContact,
            vendorContact: step5Extended.vendorContact,
            platformDependencies: step5Extended.platformDependencies,
          };
        case 6:
          return {
            environmentReadiness: formData.environmentReadiness,
          };
        case 7:
          return {
            dependencies: formData.dependencies,
          };
        case 8:
          return {
            governanceAcknowledged: formData.governanceAcknowledged,
            dataClassification: formData.dataClassification,
            complianceNotes: formData.complianceNotes,
          };
        case 9:
          return {
            reviewConfirmed: formData.reviewConfirmed,
          };
        default:
          return {};
      }
    },
    [formData, step4Extended, step5Extended],
  );

  /**
   * Validate a specific step by number.
   */
  const validateStep = useCallback(
    async (stepNumber: number): Promise<boolean> => {
      const schema = stepSchemaMap[stepNumber];
      if (!schema) return true;

      setIsValidating(true);
      try {
        const data = getStepData(stepNumber);
        await schema.parseAsync(data);
        setErrors([]);
        return true;
      } catch (err) {
        const zodErr = err as ZodError;
        const parsed: StepValidationError[] = zodErr.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        setErrors(parsed);
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [getStepData],
  );

  /**
   * Validate the current step.
   */
  const validateCurrentStep = useCallback(
    () => validateStep(currentStep),
    [currentStep, validateStep],
  );

  const clearErrors = useCallback(() => setErrors([]), []);

  return {
    validateStep,
    validateCurrentStep,
    errors,
    isValidating,
    clearErrors,
  };
}

export default useStepValidation;
