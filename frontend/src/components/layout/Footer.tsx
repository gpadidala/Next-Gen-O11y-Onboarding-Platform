import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface FooterProps {
  /** Version string to display */
  version?: string;
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Footer({ version = '1.0.0', className }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'border-t border-slate-200 bg-surface-primary px-6 py-3',
        className,
      )}
    >
      <div className="flex flex-col items-center justify-between gap-1 text-xs text-slate-400 sm:flex-row">
        <span>&copy; {year} Observability Onboarding Platform. All rights reserved.</span>
        <span>v{version}</span>
      </div>
    </footer>
  );
}

export { Footer };
export default Footer;
