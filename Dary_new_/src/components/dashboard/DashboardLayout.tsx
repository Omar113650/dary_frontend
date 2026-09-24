import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { TenantService } from '../../services/tenantService';
import { defaultQueryClient, STALE_TIMES } from '../../lib/queryClient';
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
    // Fetch notifications count with cached stale time
    let isMounted = true;
    defaultQueryClient
      .fetchQuery({
        queryKey: ['tenant', 'notifications', 1, 10],
        queryFn: () => TenantService.getNotifications(1, 10),
        staleTime: STALE_TIMES.LIVE,
      })
      .then((res) => {
        if (!isMounted) return;
        const unread = res?.items ? res.items.filter((n: any) => !n.isRead && !n.read).length : 0;
        setUnreadCount(unread);
      })
      .catch((err) => {
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
          <Outlet context={{ unreadCount, setUnreadCount }} />
        </main>
      </div>
    </div>
  );
}
