import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import OwnerDashboardSidebar from './OwnerDashboardSidebar';
import OwnerDashboardHeader from './OwnerDashboardHeader';
import { useUnreadNotificationsCount } from '../../hooks/useDashboardQueries';
import '../dashboard/Dashboard.css';

interface OwnerDashboardLayoutProps {
  basePath?: string;
}

export default function OwnerDashboardLayout({ basePath: customBasePath }: OwnerDashboardLayoutProps) {
  const location = useLocation();
  const basePath =
    customBasePath ||
    (location.pathname.startsWith('/owner-dashboard-preview') ? '/owner-dashboard-preview' : '/owner-dashboard');

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
      <OwnerDashboardSidebar
        basePath={basePath}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div className="dary-main-wrapper">
        <OwnerDashboardHeader
          basePath={basePath}
          unreadCount={unreadCount}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main className="dary-content-outlet">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
