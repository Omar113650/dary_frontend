import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminDashboardSidebar from './AdminDashboardSidebar';
import AdminDashboardHeader from './AdminDashboardHeader';
import { NotificationService } from '../../services/notificationService';
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    NotificationService.getNotifications({ page: 1, limit: 10 })
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items || []);
        const unread = items.filter((n: any) => !n.isRead && !n.read).length;
        setUnreadCount(unread);
      })
      .catch((err) => console.warn('[AdminDashboardLayout] Notifications load error:', err));
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
      <AdminDashboardSidebar
        basePath={basePath}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
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
