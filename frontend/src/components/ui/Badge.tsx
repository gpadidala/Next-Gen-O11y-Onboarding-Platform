import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Status determines the color scheme */
  status?: BadgeStatus;
  /** Size variant */
  size?: BadgeSize;
}

/* -------------------------------------------------------------------------- */
/*  Style maps                                                                */
/* -------------------------------------------------------------------------- */

const statusStyles: Record<BadgeStatus, string> = {
  success: 'bg-status-healthy-bg text-green-700 ring-status-healthy-border',
  warning: 'bg-warning-bg text-amber-700 ring-warning-border',
  error: 'bg-critical-bg text-red-700 ring-critical-border',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  neutral: 'bg-pending-bg text-slate-600 ring-pending-border',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-2xs',
  md: 'px-2.5 py-0.5 text-xs',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Badge({
  status = 'neutral',
  size = 'md',
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        statusStyles[status],
        sizeStyles[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export { Badge };
export default Badge;
