import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type StatusLevel = 'green' | 'amber' | 'red';

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /** Traffic-light status */
  status: StatusLevel;
  /** Text label rendered next to the dot */
  label?: string;
  /** Show pulsing animation for active/live status */
  pulse?: boolean;
  /** Size of the indicator dot */
  size?: 'sm' | 'md' | 'lg';
}

/* -------------------------------------------------------------------------- */
/*  Style maps                                                                */
/* -------------------------------------------------------------------------- */

const dotColor: Record<StatusLevel, string> = {
  green: 'bg-status-healthy',
  amber: 'bg-warning',
  red: 'bg-critical',
};

const pulseColor: Record<StatusLevel, string> = {
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
};

const labelColor: Record<StatusLevel, string> = {
  green: 'text-green-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
};

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

const labelSizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function StatusIndicator({
  status,
  label,
  pulse = false,
  size = 'md',
  className,
  ...rest
}: StatusIndicatorProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      {...rest}
    >
      <span className="relative inline-flex" aria-hidden="true">
        {/* Pulsing ring */}
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              pulseColor[status],
            )}
          />
        )}
        {/* Solid dot */}
        <span
          className={cn('relative inline-flex rounded-full', dotColor[status], sizeStyles[size])}
        />
      </span>

      {label && (
        <span className={cn('font-medium', labelColor[status], labelSizeStyles[size])}>
          {label}
        </span>
      )}

      {/* Screen reader text when no label */}
      {!label && (
        <span className="sr-only">
          Status: {status === 'green' ? 'Healthy' : status === 'amber' ? 'Warning' : 'Critical'}
        </span>
      )}
    </span>
  );
}

export { StatusIndicator };
export default StatusIndicator;
