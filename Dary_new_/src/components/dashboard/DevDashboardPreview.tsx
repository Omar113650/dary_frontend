import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextType } from '../../context/AuthContext';
import type { User } from '../../services/authService';
import DashboardLayout from './DashboardLayout';

export default function DevDashboardPreview() {
  // Prevent rendering in production
  if (!import.meta.env.DEV) {
    return <Navigate to="/dashboard" replace />;
  }

  const previewUser: User = {
    id: 'preview-tenant-01',
    name: 'أحمد محمود',
    email: 'ahmed.student@dary.ae',
    phone: '+20 10 9876 5432',
    role: 'tenant',
    roles: ['tenant'],
    avatar: null,
    profile: {
      university: 'جامعة القاهرة',
      faculty: 'كلية الهندسة',
      city: 'الجيزة',
      country: 'مصر',
      nationality: 'مصري',
      gender: 'MALE',
      bio: 'طالب في السنة الثالثة أبحث عن سكن هادئ ونظيف بالقرب من الحرم الجامعي.',
    },
  };

  const devAuthValue: AuthContextType = {
    user: previewUser,
    role: 'tenant',
    isAuthenticated: true,
    isLoading: false,
    isTenant: true,
    isOwner: false,
    isAdmin: false,
    login: async () => null,
    logout: async () => {
      console.info('وضع المعاينة: تم استدعاء تسجيل الخروج التجريبي (Development Preview Logout)');
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
            DEV PREVIEW
          </span>
          <span>
            معاينة لوحة تحكم المستأجر (مخصصة للتطوير والاختبار البصري فقط — المسار الإنتاجي /dashboard محمي بالكامل)
          </span>
        </div>
        <span style={{ opacity: 0.8, fontSize: '0.72rem' }}>/dashboard-preview</span>
      </div>

      <DashboardLayout basePath="/dashboard-preview" />
    </AuthContext.Provider>
  );
}
