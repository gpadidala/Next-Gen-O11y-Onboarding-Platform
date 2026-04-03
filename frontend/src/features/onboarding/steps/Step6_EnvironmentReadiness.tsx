import { useState, useMemo, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOnboarding } from '../context/OnboardingContext';
import type { TelemetrySignal } from '@/types/onboarding';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

interface EnvColumn {
  key: 'DEV' | 'QA' | 'STAGING' | 'PROD';
  label: string;
  required: boolean;
  readOnly: boolean;
}

const ENV_COLUMNS: EnvColumn[] = [
  { key: 'DEV', label: 'DEV', required: true, readOnly: false },
  { key: 'QA', label: 'QA', required: true, readOnly: false },
  { key: 'STAGING', label: 'QA2 / Staging', required: false, readOnly: false },
  { key: 'PROD', label: 'PROD', required: false, readOnly: true },
];

const SIGNAL_LABELS: Record<TelemetrySignal, string> = {
  METRICS: 'Metrics',
  LOGS: 'Logs',
  TRACES: 'Traces',
  PROFILING: 'Profiling',
  RUM: 'Real User Monitoring',
  SYNTHETICS: 'Synthetics',
};

/* -------------------------------------------------------------------------- */
/*  Internal state: per-signal per-env readiness map                          */
/* -------------------------------------------------------------------------- */

type ReadinessMap = Record<string, Record<string, boolean>>;

function buildInitialReadiness(
  signals: TelemetrySignal[],
  existing: Record<string, { enabled: boolean }>,
): ReadinessMap {
  const map: ReadinessMap = {};
  for (const signal of signals) {
    map[signal] = {};
    for (const env of ENV_COLUMNS) {
      if (env.key === 'PROD') {
        map[signal][env.key] = true;
      } else {
        // Try to hydrate from existing form data
        map[signal][env.key] = existing[env.key]?.enabled ?? false;
      }
    }
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function Step6EnvironmentReadiness() {
  const { formData, updateFormData, nextStep, prevStep } = useOnboarding();
  const signals = formData.telemetrySignals;

  const [readiness, setReadiness] = useState<ReadinessMap>(() =>
    buildInitialReadiness(signals, formData.environmentReadiness),
  );

  const [attemptedNext, setAttemptedNext] = useState(false);

  /* ---- Validation ---- */

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    for (const signal of signals) {
      for (const env of ENV_COLUMNS) {
        if (env.required && !readiness[signal]?.[env.key]) {
          errors.push(
            `${SIGNAL_LABELS[signal]} must be available in ${env.label}`,
          );
        }
      }
    }
    return errors;
  }, [signals, readiness]);

  const isValid = validationErrors.length === 0;

  /* ---- Handlers ---- */

  const toggleCell = useCallback(
    (signal: TelemetrySignal, envKey: string) => {
      setReadiness((prev) => ({
        ...prev,
        [signal]: {
          ...prev[signal],
          [envKey]: !prev[signal]?.[envKey],
        },
      }));
    },
    [],
  );

  const handleNext = useCallback(() => {
    setAttemptedNext(true);
    if (!isValid) return;

    // Derive environment readiness for form state
    // Aggregate: an env is "enabled" if ALL signals are checked for it
    const envKeys = ['DEV', 'QA', 'STAGING', 'PROD'] as const;
    const envReadiness = {} as Record<string, { enabled: boolean }>;
    for (const envKey of envKeys) {
      const allChecked = signals.every(
        (sig) => readiness[sig]?.[envKey] ?? false,
      );
      envReadiness[envKey] = { enabled: allChecked };
    }

    updateFormData({
      environmentReadiness: {
        DEV: envReadiness.DEV,
        QA: envReadiness.QA,
        STAGING: envReadiness.STAGING,
        PROD: envReadiness.PROD,
      },
    });
    nextStep();
  }, [isValid, signals, readiness, updateFormData, nextStep]);

  /* ---- Empty state ---- */

  if (signals.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              No Telemetry Signals Selected
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Please go back to Step 3 and select at least one telemetry signal
              before configuring environment readiness.
            </p>
          </div>
          <Button variant="secondary" onClick={prevStep}>
            Back to Signal Selection
          </Button>
        </div>
      </Card>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Environment Readiness
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm which telemetry signals are available in each environment.
          DEV and QA are required for all selected signals.
        </p>
      </div>

      {/* Readiness Matrix */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left font-medium text-slate-700">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-slate-400" />
                    Telemetry Signal
                  </div>
                </th>
                {ENV_COLUMNS.map((env) => (
                  <th
                    key={env.key}
                    className="px-5 py-3 text-center font-medium text-slate-700"
                  >
                    {env.label}
                    {env.required && (
                      <span className="ml-1 text-red-500" title="Required">
                        *
                      </span>
                    )}
                    {env.readOnly && (
                      <span className="ml-1 text-xs text-slate-400">
                        (auto)
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((signal, idx) => (
                <tr
                  key={signal}
                  className={
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }
                >
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {SIGNAL_LABELS[signal]}
                  </td>
                  {ENV_COLUMNS.map((env) => {
                    const checked = readiness[signal]?.[env.key] ?? false;
                    const isRequired = env.required;
                    const isReadOnly = env.readOnly;
                    const showError =
                      attemptedNext && isRequired && !checked;

                    return (
                      <td key={env.key} className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isReadOnly}
                              onChange={() => {
                                if (!isReadOnly) toggleCell(signal, env.key);
                              }}
                              className={`
                                h-5 w-5 rounded border transition-colors
                                focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                                ${isReadOnly
                                  ? 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400'
                                  : showError
                                    ? 'border-red-400 text-brand-600'
                                    : 'border-slate-300 text-brand-600'
                                }
                              `}
                            />
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="text-red-500 font-semibold">*</span>
          Required environment
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          Signal available
        </span>
      </div>

      {/* Validation Error */}
      {attemptedNext && !isValid && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">
                Cannot Proceed
              </h4>
              <p className="mt-1 text-sm text-red-700">
                All selected telemetry signals must be available in DEV and QA
                environments before continuing.
              </p>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-red-600">
                {validationErrors.slice(0, 5).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li>...and {validationErrors.length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Badges */}
      <div className="flex flex-wrap gap-2">
        {ENV_COLUMNS.map((env) => {
          const count = signals.filter(
            (sig) => readiness[sig]?.[env.key],
          ).length;
          const total = signals.length;
          const allDone = count === total;

          return (
            <Badge
              key={env.key}
              status={allDone ? 'success' : env.required ? 'error' : 'neutral'}
            >
              {env.label}: {count}/{total}
            </Badge>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Button variant="secondary" onClick={prevStep}>
          Back
        </Button>
        <Button onClick={handleNext}>Continue</Button>
      </div>
    </div>
  );
}
