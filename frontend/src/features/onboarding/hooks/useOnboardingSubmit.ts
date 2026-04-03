/* -------------------------------------------------------------------------- */
/*  useOnboardingSubmit - Final submission hook                               */
/* -------------------------------------------------------------------------- */

import { useCallback, useState } from 'react';
import { useOnboarding } from '@/features/onboarding/context/OnboardingContext';
import { useStepValidation } from './useStepValidation';
import apiClient from '@/api/client';
import type { OnboardingSubmitResponse } from '@/types/onboarding';
import type { GovernanceResult } from '@/types/governance';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface UseOnboardingSubmitReturn {
  /** Submit the full onboarding request. Validates all steps first. */
  submit: () => Promise<OnboardingSubmitResponse | null>;
  /** Whether submission is in progress. */
  isSubmitting: boolean;
  /** Error message if submission failed. */
  submitError: string | null;
  /** Result from the last successful submission. */
  submitResult: OnboardingSubmitResponse | null;
  /** Run governance validation only (without submitting). */
  runGovernanceCheck: () => Promise<GovernanceResult | null>;
  /** Whether governance check is running. */
  isCheckingGovernance: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useOnboardingSubmit(): UseOnboardingSubmitReturn {
  const {
    formData,
    step4Extended,
    step5Extended,
    isEditing,
    onboardingId,
    setGovernanceResult,
    clearDraft,
  } = useOnboarding();

  const { validateStep } = useStepValidation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<OnboardingSubmitResponse | null>(null);
  const [isCheckingGovernance, setIsCheckingGovernance] = useState(false);

  /**
   * Validate all 9 steps sequentially. Returns the first failing step or 0 if all pass.
   */
  const validateAllSteps = useCallback(async (): Promise<number> => {
    for (let step = 1; step <= 9; step++) {
      const valid = await validateStep(step);
      if (!valid) return step;
    }
    return 0;
  }, [validateStep]);

  /**
   * Build the submission payload from context data.
   */
  const buildPayload = useCallback(() => {
    return {
      // Step 1
      appName: formData.appName,
      portfolio: formData.portfolio,
      appCode: formData.appCode,
      description: formData.description,
      // Step 2
      hostingPlatform: formData.hostingPlatform,
      techStack: formData.techStack,
      runtimeVersion: formData.runtimeVersion,
      // Step 3
      telemetrySignals: formData.telemetrySignals,
      // Step 4
      technicalConfig: {
        ...formData.technicalConfig,
        samplingRate: step4Extended.samplingRate ?? formData.technicalConfig.samplingRate,
      },
      namespace: step4Extended.namespace,
      deploymentNames: step4Extended.deploymentNames,
      exporterType: step4Extended.exporterType,
      logPaths: step4Extended.logPaths,
      logFormat: step4Extended.logFormat,
      serviceName: step4Extended.serviceName,
      dbType: step4Extended.dbType,
      dbSchema: step4Extended.dbSchema,
      dbConnectionAlias: step4Extended.dbConnectionAlias,
      // Step 5
      alertOwnerEmail: step5Extended.alertOwnerEmail || formData.alertOwnerEmail,
      alertOwnerTeam: step5Extended.alertOwnerTeam || formData.alertOwnerTeam,
      escalationPolicy: formData.escalationPolicy,
      oncallSchedule: formData.oncallSchedule,
      dbaContact: step5Extended.dbaContact,
      vendorContact: step5Extended.vendorContact,
      platformDependencies: step5Extended.platformDependencies,
      // Step 6
      environmentReadiness: formData.environmentReadiness,
      // Step 7
      dependencies: formData.dependencies,
      // Step 8
      dataClassification: formData.dataClassification,
      complianceNotes: formData.complianceNotes,
    };
  }, [formData, step4Extended, step5Extended]);

  /**
   * Run the governance validation check against the API.
   */
  const runGovernanceCheck = useCallback(async (): Promise<GovernanceResult | null> => {
    setIsCheckingGovernance(true);
    try {
      const payload = buildPayload();
      const response = await apiClient.post<GovernanceResult>(
        '/governance/validate',
        { data: payload },
      );
      const result = response.data;
      setGovernanceResult(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Governance check failed. Please try again.';
      setSubmitError(message);
      return null;
    } finally {
      setIsCheckingGovernance(false);
    }
  }, [buildPayload, setGovernanceResult]);

  /**
   * Submit the full onboarding request.
   * 1. Validates all steps.
   * 2. Runs governance check.
   * 3. Calls the submit API.
   * 4. Clears the draft on success.
   */
  const submit = useCallback(async (): Promise<OnboardingSubmitResponse | null> => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Step 1: Validate all steps
      const failingStep = await validateAllSteps();
      if (failingStep > 0) {
        setSubmitError(`Validation failed on step ${failingStep}. Please review and fix the errors.`);
        return null;
      }

      // Step 2: Governance check
      const governance = await runGovernanceCheck();
      if (governance && !governance.passed) {
        const errorViolations = governance.violations.filter((v) => v.severity === 'ERROR');
        if (errorViolations.length > 0) {
          setSubmitError(
            `Governance check failed with ${errorViolations.length} error(s): ${errorViolations.map((v) => v.message).join('; ')}`,
          );
          return null;
        }
      }

      // Step 3: Submit
      const payload = buildPayload();
      const endpoint = isEditing
        ? `/onboarding/${onboardingId}`
        : '/onboarding';
      const method = isEditing ? 'put' : 'post';

      const response = await apiClient[method]<OnboardingSubmitResponse>(
        endpoint,
        payload,
      );

      const result = response.data;
      setSubmitResult(result);

      // Step 4: Clear draft on success
      clearDraft();

      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'detail' in err
            ? (err as { detail: string }).detail
            : 'Submission failed. Please try again.';
      setSubmitError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAllSteps, runGovernanceCheck, buildPayload, isEditing, onboardingId, clearDraft]);

  return {
    submit,
    isSubmitting,
    submitError,
    submitResult,
    runGovernanceCheck,
    isCheckingGovernance,
  };
}

export default useOnboardingSubmit;
