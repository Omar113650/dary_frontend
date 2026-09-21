import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextType } from '../../context/AuthContext';
import type { User } from '../../services/authService';
import AdminDashboardLayout from './AdminDashboardLayout';

export default function DevAdminDashboardPreview() {
  // Prevent rendering in production
  if (!import.meta.env.DEV) {
    return <Navigate to="/admin" replace />;
  }

  const previewAdmin: User = {
    id: 'preview-admin-01',
    name: 'عبد الرحمن الشمري',
    email: 'admin@dary.ae',
    phone: '+966 50 123 4567',
    role: 'admin',
    roles: ['admin', 'super_admin'],
    avatar: null,
    profile: {
      city: 'الرياض',
      country: 'المملكة العربية السعودية',
      nationality: 'سعودي',
      gender: 'MALE',
      bio: 'مدير عام لمنصة داري لسكن الطلاب وإدارة العمليات المركزية.',
    },
  };

  const devAuthValue: AuthContextType = {
    user: previewAdmin,
    role: 'admin',
    isAuthenticated: true,
    isLoading: false,
    isTenant: false,
    isOwner: false,
    isAdmin: true,
    login: async () => null,
    logout: async () => {
      console.info('وضع المعاينة: تم استدعاء تسجيل الخروج (Development Preview Logout)');
    },
    refreshUser: async () => {},
  };

  return (
    <AuthContext.Provider value={devAuthValue}>
      {/* Dev Mode Sticky Badge */}
      <div
        style={{
          backgroundColor: '#0B2A4A',
          color: '#FFFFFF',
          padding: '0.45rem 1rem',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #B69F77',
          zIndex: 100,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              backgroundColor: '#B69F77',
              color: '#0B2A4A',
              fontWeight: 800,
              fontSize: '0.68rem',
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}
          >
            ADMIN DEV PREVIEW
          </span>
          <span>
            معاينة لوحة تحكم الإدارة العامة (مخصصة للتطوير والاختبار البصري فقط — المسار الإنتاجي /admin محمي برتبة Admin/Super Admin)
          </span>
        </div>
        <span style={{ opacity: 0.8, fontSize: '0.72rem' }}>/admin-preview</span>
      </div>

      <AdminDashboardLayout basePath="/admin-preview" />
    </AuthContext.Provider>
  );
}
