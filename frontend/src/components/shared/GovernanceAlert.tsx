import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Violation, GovernanceSeverity } from '@/types/governance';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface GovernanceAlertProps {
  /** Array of governance violations to display */
  violations: Violation[];
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Severity styles                                                           */
/* -------------------------------------------------------------------------- */

const severityConfig: Record<
  GovernanceSeverity,
  {
    bgClass: string;
    borderClass: string;
    iconClass: string;
    textClass: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  ERROR: {
    bgClass: 'bg-critical-bg',
    borderClass: 'border-critical-border',
    iconClass: 'text-red-600',
    textClass: 'text-red-800',
    label: 'HARD Violation',
    icon: <ShieldAlert className="h-5 w-5" aria-hidden="true" />,
  },
  WARNING: {
    bgClass: 'bg-warning-bg',
    borderClass: 'border-warning-border',
    iconClass: 'text-amber-600',
    textClass: 'text-amber-800',
    label: 'SOFT Violation',
    icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
  },
  INFO: {
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    iconClass: 'text-blue-600',
    textClass: 'text-blue-800',
    label: 'Info',
    icon: <Info className="h-5 w-5" aria-hidden="true" />,
  },
};

/* -------------------------------------------------------------------------- */
/*  Single Violation Row                                                      */
/* -------------------------------------------------------------------------- */

function ViolationItem({ violation }: { violation: Violation }) {
  const config = severityConfig[violation.severity];

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgClass,
        config.borderClass,
      )}
      role="alert"
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('shrink-0 pt-0.5', config.iconClass)}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn('text-xs font-bold uppercase tracking-wide', config.textClass)}
            >
              {config.label}
            </span>
            <span className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-2xs text-slate-600">
              {violation.ruleId}
            </span>
            {violation.field && (
              <span className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-2xs text-slate-500">
                {violation.field}
              </span>
            )}
          </div>

          {/* Message */}
          <p className={cn('mt-1 text-sm', config.textClass)}>
            {violation.message}
          </p>

          {/* Suggestion */}
          {violation.remediation && (
            <div className="mt-2 flex items-start gap-1.5">
              <Lightbulb
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <p className="text-xs text-slate-600">
                <span className="font-medium">Suggestion:</span>{' '}
                {violation.remediation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

function GovernanceAlert({ violations, className }: GovernanceAlertProps) {
  if (violations.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-status-healthy-border bg-status-healthy-bg p-4',
          className,
        )}
        role="status"
      >
        <ShieldCheck
          className="h-5 w-5 text-green-600"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-green-800">
          All governance checks passed. No violations found.
        </p>
      </div>
    );
  }

  // Sort: ERROR first, then WARNING, then INFO
  const severityOrder: Record<GovernanceSeverity, number> = {
    ERROR: 0,
    WARNING: 1,
    INFO: 2,
  };

  const sorted = [...violations].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const errorCount = violations.filter((v) => v.severity === 'ERROR').length;
  const warningCount = violations.filter((v) => v.severity === 'WARNING').length;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>
          <strong className="text-slate-700">{violations.length}</strong> violation
          {violations.length !== 1 ? 's' : ''} found
        </span>
        {errorCount > 0 && (
          <span className="text-red-600">
            {errorCount} blocking
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-amber-600">
            {warningCount} advisory
          </span>
        )}
      </div>

      {/* Violation cards */}
      {sorted.map((violation, index) => (
        <ViolationItem key={`${violation.ruleId}-${index}`} violation={violation} />
      ))}
    </div>
  );
}

export { GovernanceAlert };
export default GovernanceAlert;
