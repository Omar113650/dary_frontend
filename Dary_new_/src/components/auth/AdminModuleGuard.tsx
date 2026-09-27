import { Navigate, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import { hasAdminModuleAccess, getFirstAllowedAdminPath } from '../../utils/adminPermissions';
import type { AdminModule } from '../../utils/adminPermissions';

interface AdminModuleGuardProps {
  module: AdminModule;
  children: ReactNode;
}

export default function AdminModuleGuard({ module, children }: AdminModuleGuardProps) {
  const { user, isSuperAdmin } = useAuth();
  const { locale } = useLocale();

  // Super admin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const isAllowed = hasAdminModuleAccess(user, module);

  if (!isAllowed) {
    const fallbackPath = getFirstAllowedAdminPath(user);

    // If fallback is identical to current or no match, show unauthorized page with navigation button
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '1rem',
          }}
        >
          🔒
        </div>
        <h2 style={{ color: '#0B2A4A', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {locale === 'ar' ? 'عفواً، لا تملك صلاحية الوصول لهذا القسم' : 'Access Restricted'}
        </h2>
        <p style={{ color: '#64748B', maxWidth: '480px', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {locale === 'ar'
            ? 'تم تقييد حساب الإدارة الخاص بك لمهام محددة بواسطة المدير العام. يمكنك الوصول فقط إلى الأقسام المصرح لك بها.'
            : 'Your administrator account has scoped permissions set by the Super Admin. You can only view authorized sections.'}
        </p>
        <Link
          to={fallbackPath}
          style={{
            padding: '0.75rem 1.75rem',
            backgroundColor: '#0B2A4A',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.92rem',
            boxShadow: '0 4px 12px rgba(11, 42, 74, 0.2)',
          }}
        >
          {locale === 'ar' ? 'الذهاب إلى قسمك المخصص' : 'Go to Authorized Section'}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
