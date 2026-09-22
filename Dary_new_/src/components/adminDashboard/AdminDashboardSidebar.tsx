import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import logo from '../../assets/branding/FINAL-LOGO1.png';

interface AdminDashboardSidebarProps {
  basePath?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function AdminDashboardSidebar({
  basePath = '/admin',
  mobileOpen,
  onCloseMobile,
}: AdminDashboardSidebarProps) {
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
      to: `${basePath}/users`,
      label: locale === 'ar' ? 'المستخدمين' : 'Users',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      to: `${basePath}/properties`,
      label: locale === 'ar' ? 'العقارات' : 'Properties',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      to: `${basePath}/bookings`,
      label: locale === 'ar' ? 'الحجوزات' : 'Bookings',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      ),
    },
    {
      to: `${basePath}/reports`,
      label: locale === 'ar' ? 'البلاغات والشكاوى' : 'Reports',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      to: `${basePath}/tickets`,
      label: locale === 'ar' ? 'تذاكر الدعم والمساعدة' : 'Support Tickets',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      to: `${basePath}/analytics`,
      label: locale === 'ar' ? 'التحليلات' : 'Analytics',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      to: `${basePath}/calendar`,
      label: locale === 'ar' ? 'تقويم الإشغال' : 'Calendar',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      to: `${basePath}/notifications`,
      label: locale === 'ar' ? 'الإشعارات' : 'Notifications',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      to: `${basePath}/profile`,
      label: locale === 'ar' ? 'الملف الشخصي' : 'Profile',
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
    : (user?.name || user?.email?.split('@')[0] || (locale === 'ar' ? 'مدير النظام' : 'Administrator'));
  const avatarLetter = (displayName[0] || 'A').toUpperCase();

  const roleLabel = role === 'super_admin'
    ? (locale === 'ar' ? 'المدير العام (Super Admin)' : 'Super Admin')
    : (locale === 'ar' ? 'مدير النظام (Admin)' : 'System Admin');

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
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <div className="dary-sidebar-role-badge" style={{ margin: '0 1rem 1rem', padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'rgba(182, 159, 119, 0.15)', border: '1px solid rgba(182, 159, 119, 0.3)', color: '#B69F77', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🛡️</span>
        <span>{role === 'super_admin' ? (locale === 'ar' ? 'المدير العام — Super Admin' : 'Super Admin') : (locale === 'ar' ? 'إدارة المنصة — Admin' : 'Platform Administration')}</span>
      </div>

      <nav className="dary-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `dary-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="dary-nav-icon">{item.icon}</span>
            <span className="dary-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="dary-sidebar-footer">
        <div className="dary-user-profile-summary">
          <div className="dary-avatar" style={{ backgroundColor: '#0B2A4A', color: '#B69F77', border: '1px solid #B69F77' }}>
            {avatarLetter}
          </div>
          <div className="dary-user-info">
            <span className="dary-user-name">{displayName}</span>
            <span className="dary-user-email" style={{ color: '#B69F77' }}>
              {roleLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="dary-logout-btn"
          onClick={async () => {
            onCloseMobile();
            await logout();
            navigate('/login', { replace: true });
          }}
          title={t.auth_logout_btn || 'تسجيل الخروج'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{t.auth_logout_btn || 'تسجيل الخروج'}</span>
        </button>
      </div>
    </aside>
  );
}
