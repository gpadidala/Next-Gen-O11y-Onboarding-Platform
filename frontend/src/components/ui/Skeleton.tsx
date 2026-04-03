import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type SkeletonVariant = 'text' | 'card' | 'table-row' | 'circular';

export interface SkeletonProps {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Number of lines (only for "text" variant) */
  lines?: number;
  /** Width class override (e.g. "w-48") */
  width?: string;
  /** Height class override (e.g. "h-6") */
  height?: string;
  /** Number of columns for table-row variant */
  columns?: number;
  /** Additional class names for the wrapper */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Base shimmer                                                              */
/* -------------------------------------------------------------------------- */

function ShimmerBlock({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded bg-slate-200', className)}
      aria-hidden="true"
      {...rest}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Variants                                                                  */
/* -------------------------------------------------------------------------- */

function TextSkeleton({ lines = 3, width, className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2.5', width, className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBlock
          key={i}
          className={cn(
            'h-4 rounded',
            // Last line is shorter for natural look
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  );
}

function CardSkeleton({ width, height, className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-surface-primary p-5',
        width,
        height,
        className,
      )}
      aria-hidden="true"
    >
      <ShimmerBlock className="mb-4 h-4 w-1/3" />
      <div className="space-y-2.5">
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-5/6" />
        <ShimmerBlock className="h-3 w-2/3" />
      </div>
      <div className="mt-5 flex gap-2">
        <ShimmerBlock className="h-8 w-20 rounded-md" />
        <ShimmerBlock className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ columns = 4, className }: SkeletonProps) {
  return (
    <div
      className={cn('flex items-center gap-4 border-b border-slate-100 px-4 py-3', className)}
      aria-hidden="true"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <ShimmerBlock
          key={i}
          className={cn(
            'h-4 flex-1',
            i === 0 && 'max-w-[8rem]',
          )}
        />
      ))}
    </div>
  );
}

function CircularSkeleton({ width, height, className }: SkeletonProps) {
  return (
    <ShimmerBlock
      className={cn(
        'rounded-full',
        width ?? 'h-10 w-10',
        height,
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

function Skeleton(props: SkeletonProps) {
  const { variant = 'text' } = props;

  switch (variant) {
    case 'text':
      return <TextSkeleton {...props} />;
    case 'card':
      return <CardSkeleton {...props} />;
    case 'table-row':
      return <TableRowSkeleton {...props} />;
    case 'circular':
      return <CircularSkeleton {...props} />;
    default:
      return <TextSkeleton {...props} />;
  }
}

export { Skeleton };
export default Skeleton;
