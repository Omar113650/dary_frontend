import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function TenantRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading, isOwner, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#F7F8FA',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid #E2E8F0',
            borderTopColor: '#0B2A4A',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isOwner) {
    return <Navigate to="/owner-dashboard" replace />;
  }

  return <>{children}</>;
}
