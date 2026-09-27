import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';

interface SuperAdminGuardProps {
  children: ReactNode;
}

export default function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { isSuperAdmin } = useAuth();
  const { locale } = useLocale();

  if (!isSuperAdmin) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '65vh',
          textAlign: 'center',
          padding: '2.5rem 1.5rem',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            marginBottom: '1.25rem',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
          }}
        >
          🛡️
        </div>
        <h2 style={{ color: '#0B2A4A', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {locale === 'ar' ? 'صلاحية المدير العام (Super Admin) فقط' : 'Super Admin Access Only'}
        </h2>
        <p style={{ color: '#64748B', maxWidth: '520px', fontSize: '0.96rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
          {locale === 'ar'
            ? 'هذه الشاشة مخصصة حصرياً للمدير العام للنظام لإدارة وتعديل الأدوار وصلاحيات الوصول الحساسة (RBAC).'
            : 'This control section is strictly reserved for the Super Admin to govern system roles and granular access permissions (RBAC).'}
        </p>
        <Link
          to="/admin"
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#0B2A4A',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.94rem',
            boxShadow: '0 4px 14px rgba(11, 42, 74, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>←</span>
          <span>{locale === 'ar' ? 'العودة للوحة التحكم' : 'Return to Admin Dashboard'}</span>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
