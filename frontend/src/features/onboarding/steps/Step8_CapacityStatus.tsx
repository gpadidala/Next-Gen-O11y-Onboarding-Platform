import { useEffect, useState } from 'react';
import {
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOnboarding } from '../context/OnboardingContext';
import type { SignalCapacity, CapacityCheckResponse } from '@/types/capacity';
import type { TelemetrySignal } from '@/types/onboarding';

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

type CapacityLevel = 'GREEN' | 'AMBER' | 'RED';

function getCapacityLevel(projected: number): CapacityLevel {
  if (projected >= 90) return 'RED';
  if (projected >= 70) return 'AMBER';
  return 'GREEN';
}

function getOverallLevel(signals: SignalCapacity[]): CapacityLevel {
  if (signals.some((s) => getCapacityLevel(s.projectedUtilisation) === 'RED'))
    return 'RED';
  if (signals.some((s) => getCapacityLevel(s.projectedUtilisation) === 'AMBER'))
    return 'AMBER';
  return 'GREEN';
}

const LEVEL_CONFIG: Record<
  CapacityLevel,
  { badgeStatus: 'success' | 'warning' | 'error'; label: string; ring: string; bg: string; text: string; bar: string }
> = {
  GREEN: {
    badgeStatus: 'success',
    label: 'Sufficient Capacity',
    ring: 'ring-green-200',
    bg: 'bg-green-50',
    text: 'text-green-800',
    bar: 'bg-green-500',
  },
  AMBER: {
    badgeStatus: 'warning',
    label: 'Limited Capacity',
    ring: 'ring-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    bar: 'bg-amber-500',
  },
  RED: {
    badgeStatus: 'error',
    label: 'Insufficient Capacity',
    ring: 'ring-red-200',
    bg: 'bg-red-50',
    text: 'text-red-800',
    bar: 'bg-red-500',
  },
};

const SIGNAL_LABELS: Record<TelemetrySignal, string> = {
  METRICS: 'Metrics (Mimir)',
  LOGS: 'Logs (Loki)',
  TRACES: 'Traces (Tempo)',
  PROFILING: 'Profiling (Pyroscope)',
  RUM: 'Real User Monitoring',
  SYNTHETICS: 'Synthetics',
};

/* -------------------------------------------------------------------------- */
/*  Skeleton                                                                  */
/* -------------------------------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-16 rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-5">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-full rounded-full bg-slate-100" />
            <div className="mt-3 flex justify-between">
              <div className="h-3 w-16 rounded bg-slate-100" />
              <div className="h-3 w-16 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CapacityGauge                                                             */
/* -------------------------------------------------------------------------- */

interface CapacityGaugeProps {
  signal: SignalCapacity;
}

function CapacityGauge({ signal }: CapacityGaugeProps) {
  const level = getCapacityLevel(signal.projectedUtilisation);
  const config = LEVEL_CONFIG[level];
  const signalLabel =
    SIGNAL_LABELS[signal.signal as TelemetrySignal] ?? signal.signal;

  return (
    <Card className="relative overflow-hidden">
      {/* Status indicator bar at top */}
      <div className={`absolute inset-x-0 top-0 h-1 ${config.bar}`} />

      <div className="pt-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">
            {signalLabel}
          </h4>
          <Badge status={config.badgeStatus} size="sm">
            {level}
          </Badge>
        </div>

        {/* Gauge bar */}
        <div className="mt-4">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {/* Current utilization */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-slate-300 transition-all duration-500"
              style={{ width: `${Math.min(signal.currentUtilisation, 100)}%` }}
            />
            {/* Projected utilization (overlay) */}
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${config.bar} opacity-80`}
              style={{
                width: `${Math.min(signal.projectedUtilisation, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Current:{' '}
            <span className="font-medium text-slate-700">
              {signal.currentUtilisation.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <ArrowRight className="h-3 w-3" />
            Projected:{' '}
            <span className={`font-medium ${config.text}`}>
              {signal.projectedUtilisation.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Headroom */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            Headroom: {signal.availableHeadroom.toLocaleString()} {signal.unit}
          </span>
          <span>
            Max: {signal.maxCapacity.toLocaleString()} {signal.unit}
          </span>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export default function Step8CapacityStatus() {
  const { formData, nextStep, prevStep } = useOnboarding();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capacityData, setCapacityData] =
    useState<CapacityCheckResponse | null>(null);

  /* ---- Fetch capacity assessment on mount ---- */

  useEffect(() => {
    let cancelled = false;

    async function fetchCapacity() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/capacity/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signals: formData.telemetrySignals,
            estimatedDailyVolume: 1_000_000,
            retentionDays: formData.technicalConfig.retentionDays,
            environment: 'PROD',
          }),
        });

        if (!response.ok) {
          throw new Error(`Capacity check failed (${response.status})`);
        }

        const result: CapacityCheckResponse = await response.json();
        if (!cancelled) setCapacityData(result);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to check capacity',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCapacity();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Derived state ---- */

  const overallLevel = capacityData
    ? getOverallLevel(capacityData.signals)
    : null;

  const isBlocked = overallLevel === 'RED';
  const isWarning = overallLevel === 'AMBER';

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Capacity Assessment
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Automated capacity check for your selected telemetry signals against
          current cluster utilization.
        </p>
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">
                Capacity Check Failed
              </h4>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && capacityData && overallLevel && (
        <>
          {/* Overall Status Banner */}
          {overallLevel === 'GREEN' && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="text-sm font-semibold text-green-800">
                    All Clear - Sufficient Capacity
                  </h4>
                  <p className="mt-0.5 text-sm text-green-700">
                    {capacityData.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {overallLevel === 'AMBER' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">
                    Warning - Limited Capacity
                  </h4>
                  <p className="mt-0.5 text-sm text-amber-700">
                    {capacityData.summary} You may proceed, but consider the
                    recommendations below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {overallLevel === 'RED' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">
                    Blocked - Insufficient Capacity
                  </h4>
                  <p className="mt-0.5 text-sm text-red-700">
                    {capacityData.summary} You cannot proceed until capacity
                    issues are resolved. Please contact the platform team.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Per-Signal Gauges */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Per-Signal Capacity
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {capacityData.signals.map((sig) => (
                <CapacityGauge key={sig.signal} signal={sig} />
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {capacityData.recommendations.length > 0 && (
            <Card
              header={
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>Recommendations</span>
                </div>
              }
            >
              <ul className="space-y-2">
                {capacityData.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Assessment timestamp */}
          <p className="text-xs text-slate-400">
            Assessed at:{' '}
            {new Date(capacityData.assessedAt).toLocaleString()}
          </p>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-5">
        <Button variant="secondary" onClick={prevStep}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {isBlocked && (
            <span className="text-xs text-red-600">
              Resolve capacity issues to continue
            </span>
          )}
          {isWarning && (
            <span className="text-xs text-amber-600">
              Proceeding with limited capacity
            </span>
          )}
          <Button onClick={nextStep} disabled={isBlocked}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
