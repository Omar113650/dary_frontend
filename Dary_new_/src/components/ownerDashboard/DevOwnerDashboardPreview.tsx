import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import type { AuthContextType } from '../../context/AuthContext';
import type { User } from '../../services/authService';
import OwnerDashboardLayout from './OwnerDashboardLayout';

export default function DevOwnerDashboardPreview() {
  // Prevent rendering in production
  if (!import.meta.env.DEV) {
    return <Navigate to="/owner-dashboard" replace />;
  }

  const previewOwner: User = {
    id: 'preview-owner-01',
    name: 'طارق الحسيني',
    email: 'tarek.owner@dary.ae',
    phone: '+20 12 3456 7890',
    role: 'owner',
    roles: ['owner'],
    avatar: null,
    profile: {
      city: 'القاهرة',
      country: 'مصر',
      nationality: 'مصري',
      gender: 'MALE',
      bio: 'مالك سكن طلابي معتمد في منطقة الدقي والجيزة.',
    },
  };

  const devAuthValue: AuthContextType = {
    user: previewOwner,
    role: 'owner',
    isAuthenticated: true,
    isLoading: false,
    isTenant: false,
    isOwner: true,
    isAdmin: false,
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
            OWNER DEV PREVIEW
          </span>
          <span>
            معاينة لوحة تحكم أصحاب العقارات (مخصصة للتطوير والاختبار البصري فقط — المسار الإنتاجي /owner-dashboard محمي بالكامل)
          </span>
        </div>
        <span style={{ opacity: 0.8, fontSize: '0.72rem' }}>/owner-dashboard-preview</span>
      </div>

      <OwnerDashboardLayout basePath="/owner-dashboard-preview" />
    </AuthContext.Provider>
  );
}
