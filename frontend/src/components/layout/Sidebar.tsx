import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Gauge,
  Settings,
  Menu,
  X,
  Activity,
  Grid3X3,
  Briefcase,
  Target,
  Users,
  PlugZap,
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
    label: 'Onboarding',
    icon: <PlusCircle className="h-5 w-5" />,
  },
  {
    to: '/coverage',
    label: 'Coverage & Adoption',
    icon: <Target className="h-5 w-5" />,
  },
  {
    to: '/capacity',
    label: 'Capacity',
    icon: <Gauge className="h-5 w-5" />,
  },
  {
    to: '/catalog',
    label: 'Service Catalog',
    icon: <Grid3X3 className="h-5 w-5" />,
  },
  {
    to: '/portfolios',
    label: 'Portfolios',
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    to: '/grafana-usage',
    label: 'Grafana Usage',
    icon: <Users className="h-5 w-5" />,
  },
  {
    to: '/admin/integrations',
    label: 'Integrations',
    icon: <PlugZap className="h-5 w-5" />,
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
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-[0_4px_14px_-2px_rgba(30,64,175,0.55)]"
              style={{
                background:
                  'linear-gradient(135deg, #1E40AF 0%, #3B82F6 60%, #60A5FA 100%)',
              }}
              aria-hidden="true"
            >
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-nav-text-active">
                O11y Platform
              </div>
              <div className="text-2xs font-medium uppercase tracking-wider text-nav-text">
                Coverage · Adoption
              </div>
            </div>
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
        <nav className="mt-3 flex-1 space-y-0.5 px-3">
          <div className="mb-2 px-3 text-2xs font-bold uppercase tracking-widest text-nav-text/70">
            Navigate
          </div>
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
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-nav-bg-hover text-nav-text-active shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-nav-text hover:bg-nav-bg-hover/70 hover:text-nav-text-active',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 h-7 w-[3px] rounded-r-full bg-nav-accent shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      'shrink-0 transition-transform duration-200 group-hover:scale-110',
                      isActive ? 'text-nav-accent' : 'text-nav-text',
                    )}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-700/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-xs font-bold text-white">
              OP
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-nav-text-active">
                Platform Ops
              </div>
              <div className="text-2xs text-nav-text">v2.0 · live</div>
            </div>
          </div>
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
