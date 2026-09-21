import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import OwnerDashboardSidebar from './OwnerDashboardSidebar';
import OwnerDashboardHeader from './OwnerDashboardHeader';
import { NotificationService } from '../../services/notificationService';
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    NotificationService.getNotifications({ page: 1, limit: 10 })
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items || []);
        const unread = items.filter((n: any) => !n.isRead && !n.read).length;
        setUnreadCount(unread);
      })
      .catch((err) => console.warn('[OwnerDashboardLayout] Notifications load error:', err));
  }, [location.pathname]);

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
