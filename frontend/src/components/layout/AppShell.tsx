import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface AppShellProps {
  /** Page content rendered in the main area */
  children: ReactNode;
  /** Hide footer if needed (e.g. for full-screen views) */
  hideFooter?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * AppShell provides the top-level layout for every page:
 * collapsible sidebar navigation, top header bar, content area, and footer.
 *
 * On desktop (lg+) the sidebar is always visible. On mobile it is hidden by
 * default and toggled via a hamburger button.
 */
function AppShell({ children, hideFooter = false }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="flex min-h-screen bg-surface-secondary">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <Header onMenuToggle={toggleSidebar} />

        {/* Page content */}
        <main
          className={cn('flex-1 overflow-auto')}
          id="main-content"
          role="main"
        >
          <div className="page-container">{children}</div>
        </main>

        {/* Footer */}
        {!hideFooter && <Footer />}
      </div>
    </div>
  );
}

export { AppShell };
export default AppShell;
