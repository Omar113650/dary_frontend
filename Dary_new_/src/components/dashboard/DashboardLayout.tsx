import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { TenantService } from '../../services/tenantService';
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Poll notifications count once on mount
    let isMounted = true;
    TenantService.getNotifications(1, 10)
      .then((res) => {
        if (!isMounted) return;
        const unread = res.items.filter((n) => !n.isRead && !n.read).length;
        setUnreadCount(unread);
      })
      .catch((err) => {
        // Log API error; don't break the layout
        console.warn('[DashboardLayout] Could not fetch notifications count:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
