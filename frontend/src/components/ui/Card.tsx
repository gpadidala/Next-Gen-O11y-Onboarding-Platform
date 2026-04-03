import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional header content rendered at the top with a divider */
  header?: ReactNode;
  /** Optional footer content rendered at the bottom with a divider */
  footer?: ReactNode;
  /** Padding variant for the body content */
  padding?: CardPadding;
  /** Enable hover shadow transition */
  hoverable?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Style maps                                                                */
/* -------------------------------------------------------------------------- */

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Card({
  header,
  footer,
  padding = 'md',
  hoverable = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-surface-primary shadow-card',
        hoverable && 'transition-shadow duration-200 hover:shadow-card-hover',
        className,
      )}
      {...rest}
    >
      {header && (
        <div className="border-b border-slate-200 px-5 py-3.5">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-semibold text-slate-900">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}

      <div className={cn(paddingStyles[padding])}>{children}</div>

      {footer && (
        <div className="border-t border-slate-200 px-5 py-3.5">{footer}</div>
      )}
    </div>
  );
}

export { Card };
export default Card;
