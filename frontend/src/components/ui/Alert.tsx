import { type HTMLAttributes, type ReactNode } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** Variant determines color scheme and default icon */
  variant?: AlertVariant;
  /** Alert title (optional) */
  title?: string;
  /** Custom icon to override the default */
  icon?: ReactNode;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Called when the dismiss button is clicked */
  onDismiss?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Style & icon maps                                                         */
/* -------------------------------------------------------------------------- */

const variantStyles: Record<AlertVariant, string> = {
  success: 'border-status-healthy-border bg-status-healthy-bg text-green-800',
  warning: 'border-warning-border bg-warning-bg text-amber-800',
  error: 'border-critical-border bg-critical-bg text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

const iconMap: Record<AlertVariant, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />,
};

const dismissStyles: Record<AlertVariant, string> = {
  success: 'text-green-600 hover:bg-green-100 focus-visible:ring-green-500',
  warning: 'text-amber-600 hover:bg-amber-100 focus-visible:ring-amber-500',
  error: 'text-red-600 hover:bg-red-100 focus-visible:ring-red-500',
  info: 'text-blue-600 hover:bg-blue-100 focus-visible:ring-blue-500',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Alert({
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  className,
  children,
  ...rest
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {/* Icon */}
      <div className="shrink-0 pt-0.5">{icon ?? iconMap[variant]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-sm font-semibold">{title}</h3>
        )}
        {children && (
          <div className={cn('text-sm', title && 'mt-1')}>{children}</div>
        )}
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'shrink-0 rounded-md p-1 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            dismissStyles[variant],
          )}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export { Alert };
export default Alert;
