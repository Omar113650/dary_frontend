import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import AdminDashboardHeader from './AdminDashboardHeader';
import { useUnreadNotificationsCount } from '../../hooks/useDashboardQueries';
import '../dashboard/Dashboard.css';

interface AdminDashboardLayoutProps {
  basePath?: string;
}

export default function AdminDashboardLayout({ basePath: customBasePath }: AdminDashboardLayoutProps) {
  const location = useLocation();
  const basePath =
    customBasePath ||
    (location.pathname.startsWith('/admin-preview') ? '/admin-preview' : '/admin');

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
      <AdminDashboardSidebar
        basePath={basePath}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div className="dary-main-wrapper">
        <AdminDashboardHeader
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
