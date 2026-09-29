import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { useUnreadNotificationsCount } from '../../hooks/useDashboardQueries';
import './Dashboard.css';

interface DashboardLayoutProps {
  basePath?: string;
}

export default function DashboardLayout({ basePath: customBasePath }: DashboardLayoutProps) {
  const location = useLocation();
  const basePath =
    customBasePath ||
    (location.pathname.startsWith('/dashboard-preview') ? '/dashboard-preview' : '/dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Real-time unread notifications count (polls every 15s)
  const { data: liveUnreadCount } = useUnreadNotificationsCount();
  const unreadCount = liveUnreadCount ?? 0;

  return (
    <div className="dary-dashboard-shell">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`dary-backdrop ${mobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <DashboardSidebar
        basePath={basePath}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div className="dary-main-wrapper">
        <DashboardHeader
          basePath={basePath}
          onOpenMobile={() => setMobileOpen(true)}
          unreadCount={unreadCount}
        />

        <main className="dary-content-outlet">
          <Outlet context={{ unreadCount }} />
        </main>
      </div>
    </div>
  );
}
