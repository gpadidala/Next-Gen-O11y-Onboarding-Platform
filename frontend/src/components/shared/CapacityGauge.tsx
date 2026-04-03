import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type CapacityGaugeStatus = 'green' | 'amber' | 'red';
export type CapacityGaugeVariant = 'circular' | 'bar';

export interface CapacityGaugeProps {
  /** Utilization value (0-100) */
  value: number;
  /** Traffic-light status */
  status: CapacityGaugeStatus;
  /** Label displayed below or beside the gauge */
  label: string;
  /** Gauge variant */
  variant?: CapacityGaugeVariant;
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Color maps                                                                */
/* -------------------------------------------------------------------------- */

const statusColors: Record<CapacityGaugeStatus, string> = {
  green: 'text-status-healthy',
  amber: 'text-warning',
  red: 'text-critical',
};

const barBgColors: Record<CapacityGaugeStatus, string> = {
  green: 'bg-status-healthy',
  amber: 'bg-warning',
  red: 'bg-critical',
};

const barTrackColors: Record<CapacityGaugeStatus, string> = {
  green: 'bg-green-100',
  amber: 'bg-amber-100',
  red: 'bg-red-100',
};

const strokeColors: Record<CapacityGaugeStatus, string> = {
  green: 'stroke-status-healthy',
  amber: 'stroke-warning',
  red: 'stroke-critical',
};

/* -------------------------------------------------------------------------- */
/*  Circular gauge sub-component                                              */
/* -------------------------------------------------------------------------- */

function CircularGauge({
  value,
  status,
  label,
  className,
}: CapacityGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div
      className={cn('flex flex-col items-center gap-2', className)}
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedValue}%`}
    >
      <div className="relative h-24 w-24">
        <svg
          className="h-full w-full -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-slate-200"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-500', strokeColors[status])}
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'text-lg font-bold',
              statusColors[status],
            )}
          >
            {clampedValue}%
          </span>
        </div>
      </div>

      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bar gauge sub-component                                                   */
/* -------------------------------------------------------------------------- */

function BarGauge({
  value,
  status,
  label,
  className,
}: CapacityGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('w-full', className)}
      role="meter"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedValue}%`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span
          className={cn('text-sm font-bold', statusColors[status])}
        >
          {clampedValue}%
        </span>
      </div>

      <div
        className={cn(
          'h-2.5 w-full overflow-hidden rounded-full',
          barTrackColors[status],
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            barBgColors[status],
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

function CapacityGauge(props: CapacityGaugeProps) {
  const { variant = 'circular' } = props;

  return variant === 'circular' ? (
    <CircularGauge {...props} />
  ) : (
    <BarGauge {...props} />
  );
}

export { CapacityGauge };
export default CapacityGauge;
