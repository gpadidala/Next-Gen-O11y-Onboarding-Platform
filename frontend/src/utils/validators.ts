/* -------------------------------------------------------------------------- */
/*  Zod validation schemas for each onboarding wizard step                    */
/* -------------------------------------------------------------------------- */

import { z } from 'zod';
import {
  HostingPlatform,
  TechStack,
  TelemetrySignal,
  OBS_TEAM_EMAILS,
} from '@/types/onboarding';

/* ---- Reusable helpers ---- */

const nonEmpty = (field: string) =>
  z.string().trim().min(1, `${field} is required.`);

const hostingPlatformValues = Object.values(HostingPlatform) as [
  string,
  ...string[],
];
const techStackValues = Object.values(TechStack) as [string, ...string[]];
const telemetrySignalValues = Object.values(TelemetrySignal) as [
  string,
  ...string[],
];

/* -------------------------------------------------------------------------- */
/*  Step 1 - Application Identity                                            */
/* -------------------------------------------------------------------------- */

export const step1Schema = z.object({
  appName: nonEmpty('Application name')
    .min(3, 'Application name must be at least 3 characters.')
    .max(100, 'Application name must be 100 characters or fewer.')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/,
      'Application name must start with an alphanumeric character and contain only letters, numbers, spaces, hyphens, or underscores.',
    ),
  portfolio: nonEmpty('Portfolio'),
  appCode: nonEmpty('Application code')
    .max(20, 'Application code must be 20 characters or fewer.')
    .regex(
      /^[A-Z0-9][A-Z0-9_-]*$/,
      'Application code must be uppercase alphanumeric with optional hyphens or underscores.',
    ),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer.')
    .optional()
    .default(''),
});

export type Step1Data = z.infer<typeof step1Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 2 - Platform & Stack                                                 */
/* -------------------------------------------------------------------------- */

export const step2Schema = z.object({
  hostingPlatform: z.enum(hostingPlatformValues, {
    errorMap: () => ({ message: 'Please select a hosting platform.' }),
  }),
  techStack: z.enum(techStackValues, {
    errorMap: () => ({ message: 'Please select a tech stack.' }),
  }),
  runtimeVersion: z.string().max(50).optional().default(''),
});

export type Step2Data = z.infer<typeof step2Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 3 - Telemetry Scope                                                  */
/* -------------------------------------------------------------------------- */

export const step3Schema = z.object({
  telemetrySignals: z
    .array(z.enum(telemetrySignalValues))
    .min(1, 'Select at least one telemetry signal.'),
  dbType: z.string().optional(),
  dbSchema: z.string().optional(),
  dbConnectionAlias: z.string().optional(),
});

export type Step3Data = z.infer<typeof step3Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 4 - Technical Configuration                                          */
/* -------------------------------------------------------------------------- */

export const step4Schema = z.object({
  technicalConfig: z.object({
    samplingRate: z
      .number()
      .min(0, 'Sampling rate must be at least 0.')
      .max(1, 'Sampling rate must be at most 1.'),
    retentionDays: z
      .number()
      .int('Retention must be a whole number.')
      .min(1, 'Retention must be at least 1 day.')
      .max(365, 'Retention cannot exceed 365 days.'),
    customLabels: z.record(z.string(), z.string()),
    autoInstrumentation: z.boolean(),
    collectorEndpoint: z
      .string()
      .url('Collector endpoint must be a valid URL.')
      .optional()
      .or(z.literal('')),
    additionalScrapeTargets: z
      .array(z.string().url('Each scrape target must be a valid URL.'))
      .optional(),
  }),
  /* Additional technical fields used by the wizard */
  namespace: z.string().optional(),
  deploymentNames: z.array(z.string()).optional(),
  exporterType: z.string().optional(),
  logPaths: z.array(z.string()).optional(),
  logFormat: z.string().optional(),
  serviceName: z.string().optional(),
});

export type Step4Data = z.infer<typeof step4Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 5 - Alert & Ownership / Dependencies                                 */
/* -------------------------------------------------------------------------- */

export const step5Schema = z.object({
  alertOwnerEmail: nonEmpty('Alert owner email')
    .email('Please enter a valid email address.')
    .refine(
      (email) =>
        !OBS_TEAM_EMAILS.some(
          (blocked) => email.toLowerCase() === blocked.toLowerCase(),
        ),
      'Observability team emails cannot be used as alert owner. Please use your team email.',
    ),
  alertOwnerTeam: nonEmpty('Alert owner team'),
  escalationPolicy: z.string().optional().default(''),
  oncallSchedule: z.string().optional().default(''),
  dbaContact: z
    .string()
    .email('Must be a valid email address.')
    .or(z.literal(''))
    .optional(),
  vendorContact: z
    .string()
    .email('Must be a valid email address.')
    .or(z.literal(''))
    .optional(),
  platformDependencies: z.array(z.string()).optional().default([]),
});

export type Step5Data = z.infer<typeof step5Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 6 - Environment Readiness                                            */
/* -------------------------------------------------------------------------- */

const environmentConfigSchema = z.object({
  enabled: z.boolean(),
  namespace: z.string().optional(),
  replicas: z.number().int().min(0).optional(),
  resourceQuota: z.string().optional(),
});

export const step6Schema = z
  .object({
    environmentReadiness: z.object({
      DEV: environmentConfigSchema,
      QA: environmentConfigSchema,
      STAGING: environmentConfigSchema,
      PROD: environmentConfigSchema,
    }),
  })
  .refine(
    (data) => data.environmentReadiness.DEV.enabled,
    {
      message: 'DEV environment must be enabled.',
      path: ['environmentReadiness', 'DEV', 'enabled'],
    },
  )
  .refine(
    (data) => data.environmentReadiness.QA.enabled,
    {
      message: 'QA environment must be enabled.',
      path: ['environmentReadiness', 'QA', 'enabled'],
    },
  );

export type Step6Data = z.infer<typeof step6Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 7 - Dependencies                                                     */
/* -------------------------------------------------------------------------- */

export const step7Schema = z.object({
  dependencies: z.object({
    upstream: z.array(z.string()),
    downstream: z.array(z.string()),
    databases: z.array(z.string()),
    messageQueues: z.array(z.string()),
  }),
});

export type Step7Data = z.infer<typeof step7Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 8 - Governance                                                       */
/* -------------------------------------------------------------------------- */

export const step8Schema = z.object({
  governanceAcknowledged: z.literal(true, {
    errorMap: () => ({
      message: 'You must acknowledge the governance rules.',
    }),
  }),
  dataClassification: nonEmpty('Data classification'),
  complianceNotes: z.string().max(1000).optional().default(''),
});

export type Step8Data = z.infer<typeof step8Schema>;

/* -------------------------------------------------------------------------- */
/*  Step 9 - Review & Submit                                                  */
/* -------------------------------------------------------------------------- */

export const step9Schema = z.object({
  reviewConfirmed: z.literal(true, {
    errorMap: () => ({
      message: 'Please confirm you have reviewed all details before submitting.',
    }),
  }),
});

export type Step9Data = z.infer<typeof step9Schema>;

/* -------------------------------------------------------------------------- */
/*  Schema map for dynamic step validation                                    */
/* -------------------------------------------------------------------------- */

export const stepSchemas: Record<number, z.ZodTypeAny> = {
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

/**
 * Returns the Zod schema for a given step number.
 */
export function getStepSchema(step: number): z.ZodTypeAny {
  return stepSchemas[step] ?? z.object({});
}

/**
 * Validate form data for a given step.
 *
 * @returns `{ success: true, data }` or `{ success: false, errors }`.
 */
export function validateStep(
  step: number,
  data: unknown,
):
  | { success: true; data: unknown }
  | { success: false; errors: z.ZodIssue[] } {
  const schema = stepSchemas[step];
  if (!schema) {
    return {
      success: false,
      errors: [
        {
          code: 'custom',
          message: `No schema defined for step ${step}`,
          path: [],
        },
      ],
    };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
