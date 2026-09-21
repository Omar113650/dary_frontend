import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import logo from '../../assets/branding/FINAL-LOGO1.png';

interface DashboardSidebarProps {
  basePath?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  unreadCount?: number;
}

export default function DashboardSidebar({
  basePath = '/dashboard',
  mobileOpen,
  onCloseMobile,
  unreadCount = 0,
}: DashboardSidebarProps) {
  const navigate = useNavigate();
  const { user, logout, role } = useAuth();
  const { t, locale } = useLocale();

  const navItems = [
    {
      to: basePath,
      end: true,
      label: locale === 'ar' ? 'نظرة عامة' : 'Overview',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      to: `${basePath}/rentals`,
      label: locale === 'ar' ? 'حجوزاتي وإيجاراتي' : 'My Rentals & Bookings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      to: `${basePath}/favorites`,
      label: locale === 'ar' ? 'المفضلة' : 'Favorites',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      to: `${basePath}/recently-viewed`,
      label: locale === 'ar' ? 'شوهدت مؤخرًا' : 'Recently Viewed',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      to: `${basePath}/saved-searches`,
      label: locale === 'ar' ? 'عمليات البحث المحفوظة' : 'Saved Searches',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      to: `${basePath}/notifications`,
      label: locale === 'ar' ? 'الإشعارات' : 'Notifications',
      badge: unreadCount > 0 ? unreadCount : undefined,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      to: `${basePath}/support`,
      label: locale === 'ar' ? 'الدعم والمساعدة' : 'Support & Tickets',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      to: `${basePath}/profile`,
      label: locale === 'ar' ? 'الملف الشخصي' : 'My Profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : (user?.name || user?.email?.split('@')[0] || (locale === 'ar' ? 'طالب داري' : 'Dary Student'));
  const avatarLetter = (displayName[0] || 'D').toUpperCase();

  const roleLabel =
    role === 'super_admin'
      ? (locale === 'ar' ? 'المدير العام (Super Admin)' : 'Super Admin')
      : role === 'admin'
      ? (locale === 'ar' ? 'مدير النظام (Admin)' : 'Admin')
      : role === 'owner'
      ? (locale === 'ar' ? 'مالك عقار (Owner)' : 'Property Owner')
      : (locale === 'ar' ? 'مستأجر • طالب' : 'Tenant • Student');

  return (
    <aside className={`dary-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="dary-sidebar-header">
        <Link to="/" onClick={onCloseMobile} aria-label={t.site_name}>
          <img src={logo} alt={t.site_name} className="dary-sidebar-logo" />
        </Link>
        <button
          type="button"
          className="dary-sidebar-close"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      <nav className="dary-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `dary-nav-item ${isActive ? 'active' : ''}`}
            onClick={onCloseMobile}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && <span className="dary-nav-badge">{item.badge}</span>}
          </NavLink>
        ))}

        <div className="dary-sidebar-divider" />

        <Link to="/properties" className="dary-nav-item" onClick={onCloseMobile}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{locale === 'ar' ? 'تصفح السكنات' : 'Browse Properties'}</span>
        </Link>
      </nav>

      <div className="dary-sidebar-footer">
        <Link to={`${basePath}/profile`} className="dary-sidebar-user-pill" onClick={onCloseMobile}>
          {user?.avatar ? (
            <img src={user.avatar} alt={displayName} className="dary-user-avatar" />
          ) : (
            <div className="dary-user-avatar">{avatarLetter}</div>
          )}
          <div className="dary-user-info">
            <span className="dary-user-name">{displayName}</span>
            <span className="dary-user-role-badge">
              {roleLabel}
            </span>
          </div>
        </Link>

        <button
          type="button"
          className="dary-logout-btn"
          onClick={async () => {
            onCloseMobile();
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
}
