import { Bell, Menu, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import ThemeToggle from '@/components/ui/ThemeToggle';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface HeaderProps {
  /** Callback to toggle sidebar on mobile */
  onMenuToggle?: () => void;
  /** Additional class names */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Header({ onMenuToggle, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-[var(--header-height)] items-center justify-between border-b border-slate-200 bg-surface-primary px-4 sm:px-6',
        className,
      )}
      style={{ zIndex: 'var(--z-header)' }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
          O11y Onboarding Platform
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {/* Notification dot */}
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-critical ring-2 ring-white"
            aria-hidden="true"
          />
        </button>

        {/* User avatar / name */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
          aria-label="User menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden font-medium sm:inline">User</span>
        </button>
      </div>
    </header>
  );
}

export { Header };
export default Header;
