/* -------------------------------------------------------------------------- */
/*  useOnboardingForm - react-hook-form wrapper with Zod validation           */
/* -------------------------------------------------------------------------- */

import { useCallback, useMemo } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
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
/*  Return type                                                               */
/* -------------------------------------------------------------------------- */

export interface UseOnboardingFormReturn {
  /** react-hook-form methods for the current step */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  /** Whether the current step has been modified */
  isDirty: boolean;
  /** Whether the current step passes validation */
  isValid: boolean;
  /** Current step number */
  currentStep: number;
  /** Sync form values into context and optionally advance */
  syncToContext: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Custom hook that wraps react-hook-form with step-specific Zod validation.
 * Automatically loads default values from OnboardingContext for the current step.
 */
export function useOnboardingForm(): UseOnboardingFormReturn {
  const { currentStep, formData, step4Extended, step5Extended } = useOnboarding();

  const schema = stepSchemaMap[currentStep];

  /** Build default values for the current step from context. */
  const defaultValues = useMemo(() => {
    switch (currentStep) {
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
          dbType: step4Extended.dbType ?? '',
          dbSchema: step4Extended.dbSchema ?? '',
          dbConnectionAlias: step4Extended.dbConnectionAlias ?? '',
        };
      case 4:
        return {
          technicalConfig: formData.technicalConfig,
          namespace: step4Extended.namespace ?? '',
          deploymentNames: step4Extended.deploymentNames ?? [],
          exporterType: step4Extended.exporterType ?? '',
          logPaths: step4Extended.logPaths ?? [],
          logFormat: step4Extended.logFormat ?? '',
          serviceName: step4Extended.serviceName ?? '',
        };
      case 5:
        return {
          alertOwnerEmail: step5Extended.alertOwnerEmail || formData.alertOwnerEmail,
          alertOwnerTeam: step5Extended.alertOwnerTeam || formData.alertOwnerTeam,
          escalationPolicy: formData.escalationPolicy,
          oncallSchedule: formData.oncallSchedule,
          dbaContact: step5Extended.dbaContact ?? '',
          vendorContact: step5Extended.vendorContact ?? '',
          platformDependencies: step5Extended.platformDependencies ?? [],
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
  }, [currentStep, formData, step4Extended, step5Extended]);

  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
    mode: 'onBlur',
  });

  const {
    formState: { isDirty, isValid },
  } = form;

  const { updateFormData, setStep4Extended, setStep5Extended } = useOnboarding();

  /** Sync current form values into OnboardingContext. */
  const syncToContext = useCallback(() => {
    const values = form.getValues();

    switch (currentStep) {
      case 1:
        updateFormData({
          appName: values.appName,
          portfolio: values.portfolio,
          appCode: values.appCode,
          description: values.description ?? '',
        });
        break;
      case 2:
        updateFormData({
          hostingPlatform: values.hostingPlatform,
          techStack: values.techStack,
          runtimeVersion: values.runtimeVersion ?? '',
        });
        break;
      case 3:
        updateFormData({ telemetrySignals: values.telemetrySignals });
        if (values.dbType) {
          setStep4Extended({
            dbType: values.dbType,
            dbSchema: values.dbSchema,
            dbConnectionAlias: values.dbConnectionAlias,
          });
        }
        break;
      case 4:
        updateFormData({ technicalConfig: values.technicalConfig });
        setStep4Extended({
          namespace: values.namespace,
          deploymentNames: values.deploymentNames,
          exporterType: values.exporterType,
          logPaths: values.logPaths,
          logFormat: values.logFormat,
          serviceName: values.serviceName,
        });
        break;
      case 5:
        updateFormData({
          alertOwnerEmail: values.alertOwnerEmail,
          alertOwnerTeam: values.alertOwnerTeam,
          escalationPolicy: values.escalationPolicy ?? '',
          oncallSchedule: values.oncallSchedule ?? '',
        });
        setStep5Extended({
          alertOwnerEmail: values.alertOwnerEmail,
          alertOwnerTeam: values.alertOwnerTeam,
          dbaContact: values.dbaContact,
          vendorContact: values.vendorContact,
          platformDependencies: values.platformDependencies ?? [],
        });
        break;
      case 6:
        updateFormData({ environmentReadiness: values.environmentReadiness });
        break;
      case 7:
        updateFormData({ dependencies: values.dependencies });
        break;
      case 8:
        updateFormData({
          governanceAcknowledged: values.governanceAcknowledged,
          dataClassification: values.dataClassification,
          complianceNotes: values.complianceNotes,
        });
        break;
      case 9:
        updateFormData({ reviewConfirmed: values.reviewConfirmed });
        break;
    }
  }, [currentStep, form, updateFormData, setStep4Extended, setStep5Extended]);

  return {
    form,
    isDirty,
    isValid,
    currentStep,
    syncToContext,
  };
}

export default useOnboardingForm;
