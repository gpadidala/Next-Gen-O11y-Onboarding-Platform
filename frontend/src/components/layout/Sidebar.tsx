import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Gauge,
  Settings,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarProps {
  /** Whether the sidebar is open (used on mobile) */
  open: boolean;
  /** Toggle sidebar open/closed */
  onToggle: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Nav items                                                                 */
/* -------------------------------------------------------------------------- */

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    to: '/onboarding/new',
    label: 'New Onboarding',
    icon: <PlusCircle className="h-5 w-5" />,
  },
  {
    to: '/capacity',
    label: 'Capacity',
    icon: <Gauge className="h-5 w-5" />,
  },
  {
    to: '/admin',
    label: 'Admin',
    icon: <Settings className="h-5 w-5" />,
  },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function Sidebar({ open, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 lg:hidden"
          style={{ zIndex: 'var(--z-sidebar)' }}
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 flex w-[var(--sidebar-width)] flex-col bg-nav-bg shadow-sidebar transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ zIndex: 'var(--z-sidebar)' }}
        aria-label="Main navigation"
      >
        {/* Logo / Brand */}
        <div className="flex h-[var(--header-height)] items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-brand-400" aria-hidden="true" />
            <span className="text-sm font-bold tracking-tight text-nav-text-active">
              O11y Platform
            </span>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md p-1 text-nav-text transition-colors hover:bg-nav-bg-hover hover:text-nav-text-active lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => {
                // Close sidebar on mobile after navigation
                if (window.innerWidth < 1024) onToggle();
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-nav-bg-hover text-nav-text-active'
                    : 'text-nav-text hover:bg-nav-bg-hover hover:text-nav-text-active',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 h-8 w-1 rounded-r-full bg-nav-accent"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'shrink-0',
                      isActive ? 'text-nav-accent' : 'text-nav-text',
                    )}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-700 p-4">
          <p className="text-2xs text-nav-text">v1.0.0</p>
        </div>
      </aside>

      {/* Hamburger toggle for mobile (visible when sidebar is closed) */}
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-4 top-3 rounded-md bg-nav-bg p-2 text-nav-text-active shadow-md lg:hidden"
          style={{ zIndex: 'var(--z-header)' }}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </>
  );
}

export { Sidebar };
export default Sidebar;
