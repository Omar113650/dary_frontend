import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types/property';
import type {
  RentalBooking,
  FavoriteItem,
  SavedSearchItem,
} from '../../services/tenantService';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/dashboard-preview') ? '/dashboard-preview' : '/dashboard';

  const [loadingRentals, setLoadingRentals] = useState(true);
  const [rentals, setRentals] = useState<RentalBooking[]>([]);
  const [rentalsError, setRentalsError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState<boolean>(true);

  const firstName =
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    (locale === 'ar' ? 'طالبنا العزيز' : 'Student');

  // Load Rentals strictly using GET /dashboard/rentals
  const fetchRentals = useCallback(async () => {
    setLoadingRentals(true);
    setRentalsError(null);
    try {
      const data = await TenantService.getRentals();
      setRentals(data);
    } catch (err: any) {
      console.error('[DashboardOverview] GET /dashboard/rentals failed:', err);
      setRentalsError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات الإيجارات من الخادم.'
            : 'Could not load rentals from the server.')
      );
    } finally {
      setLoadingRentals(false);
    }
  }, [locale]);

  // Load other metrics & featured properties
  const fetchOtherData = useCallback(async () => {
    TenantService.getFavorites()
      .then(setFavorites)
      .catch((err) => console.warn('[Overview] Favorites load error:', err));

    TenantService.getSavedSearches()
      .then(setSavedSearches)
      .catch((err) => console.warn('[Overview] Saved searches error:', err));

    TenantService.getNotifications(1, 10)
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items || []);
        const unread = items.filter((n: any) => !n.isRead && !n.read).length;
        setUnreadNotifications(unread);
      })
      .catch((err) => console.warn('[Overview] Notifications load error:', err));

    setLoadingProperties(true);
    propertyService
      .getProperties({ limit: 6 })
      .then((props) => {
        setFeaturedProperties(props);
      })
      .catch((err) => console.warn('[Overview] Properties load error:', err))
      .finally(() => setLoadingProperties(false));
  }, []);

  useEffect(() => {
    fetchRentals();
    fetchOtherData();
  }, [fetchRentals, fetchOtherData]);

  function getStatusBadge(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') {
      return (
        <span className="dary-badge dary-badge-pending">
          {locale === 'ar' ? 'قيد المراجعة' : 'Pending'}
        </span>
      );
    }
    if (s === 'CONTACTED') {
      return (
        <span className="dary-badge dary-badge-contacted">
          {locale === 'ar' ? 'تم التواصل' : 'Contacted'}
        </span>
      );
    }
    if (s === 'CLOSED') {
      return (
        <span className="dary-badge dary-badge-closed">
          {locale === 'ar' ? 'مكتمل' : 'Closed'}
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="dary-badge dary-badge-cancelled">
          {locale === 'ar' ? 'ملغي' : 'Cancelled'}
        </span>
      );
    }
    return <span className="dary-badge">{status}</span>;
  }

  return (
    <div>
      {/* 1. Welcome Banner */}
      <div className="dary-welcome-card">
        <div>
          <h1 className="dary-welcome-title">
            {locale === 'ar' ? `مرحبًا بك، ${firstName} 👋` : `Welcome back, ${firstName} 👋`}
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'مرحبًا بك في لوحة تحكم سكنك الجامعي. تتبع طلبات الحجز، تصفح العقارات المفضلة، وتواصل مع الدعم في أي وقت.'
              : 'Welcome to your student housing dashboard. Track your booking requests, manage favorites, and contact support anytime.'}
          </p>
        </div>

        <div className="dary-welcome-actions">
          <Link to="/properties" className="dary-primary-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{locale === 'ar' ? 'ابحث عن سكن' : 'Find Housing'}</span>
          </Link>
          <Link to={`${basePath}/rentals`} className="dary-secondary-btn">
            <span>{locale === 'ar' ? 'إيجاراتي' : 'My Rentals'}</span>
          </Link>
        </div>
      </div>

      {/* 2. Live Metrics Grid */}
      <div className="dary-metrics-grid">
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">{rentals.length}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
            </p>
          </div>
        </div>

        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">{favorites.length}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'العقارات المفضلة' : 'Saved Favorites'}
            </p>
          </div>
        </div>

        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">{savedSearches.length}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'عمليات البحث المحفوظة' : 'Saved Searches'}
            </p>
          </div>
        </div>

        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF9C3', color: '#CA8A04' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">{unreadNotifications}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إشعارات غير مقروءة' : 'Unread Alerts'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Recent Rentals Section */}
      <div className="dary-section-card">
        <div className="dary-section-header">
          <h3>{locale === 'ar' ? 'أحدث الحجوزات والإيجارات' : 'Recent Rentals & Bookings'}</h3>
          <Link to={`${basePath}/rentals`} className="dary-view-all-link">
            <span>{locale === 'ar' ? 'عرض الكل' : 'View All'}</span>
            <span>→</span>
          </Link>
        </div>

        {loadingRentals ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 0.75rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{locale === 'ar' ? 'جاري تحميل الحجوزات...' : 'Loading bookings...'}</p>
          </div>
        ) : rentalsError ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'فشل تحميل الحجوزات' : 'Failed to Load Rentals'}</p>
            <p className="dary-error-desc">{rentalsError}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchRentals}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : rentals.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">🏠</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'لا توجد حجوزات حالية' : 'No Bookings Yet'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'لم تقم بحجز أي سكن حتى الآن. ابدأ بتصفح خيارات السكن الطلابي المتاحة بالقرب من جامعتك.'
                : 'You have not booked any accommodation yet. Start exploring student housing options near your university.'}
            </p>
            <Link to="/properties" className="dary-primary-btn">
              {locale === 'ar' ? 'تصفح السكنات المتاحة' : 'Explore Housing'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rentals.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  border: '1px solid var(--dary-border)',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                      {item.property?.title || (locale === 'ar' ? 'طلب حجز سكن' : 'Housing Booking Request')}
                    </h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dary-muted)' }}>
                    {item.property?.city || ''} {item.property?.address ? `• ${item.property.address}` : ''}
                    {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {(item.totalPrice || item.room?.pricePerBed || item.property?.startingPrice || item.property?.price) && (
                    <span style={{ fontWeight: 700, color: 'var(--dary-blue)', fontSize: '1.05rem' }}>
                      {item.totalPrice || item.room?.pricePerBed || item.property?.startingPrice || item.property?.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                  )}
                  <Link
                    to={`${basePath}/rentals`}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      color: 'var(--dary-navy)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    {locale === 'ar' ? 'التفاصيل' : 'Details'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Featured Available Housing Section */}
      <div className="dary-section-card" style={{ marginTop: '1.5rem' }}>
        <div className="dary-section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--dary-navy)' }}>
              {locale === 'ar' ? '🏢 سكنات طلابية مقترحة ومتاحة' : '🏢 Recommended Available Housing'}
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.825rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'استكشف أحدث العقارات والشقق المعتمدة والمتاحة للتسكين فورًا.'
                : 'Explore verified student accommodations available for immediate booking.'}
            </p>
          </div>
          <Link to="/properties" className="dary-view-all-link">
            <span>{locale === 'ar' ? 'تصفح كل السكنات' : 'Explore All'}</span>
            <span>→</span>
          </Link>
        </div>

        {loadingProperties ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 0.5rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{locale === 'ar' ? 'جاري تحميل السكنات المتاحة...' : 'Loading available housing...'}</p>
          </div>
        ) : featuredProperties.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
            <p style={{ margin: 0, color: 'var(--dary-muted)', fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'لا توجد سكنات معروضة حاليًا في هذه المنطقة.' : 'No housing listings available currently.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {featuredProperties.slice(0, 6).map((prop) => (
              <div
                key={prop.id}
                style={{
                  border: '1px solid var(--dary-border)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ position: 'relative', height: '160px', backgroundColor: '#EEF2F6', overflow: 'hidden' }}>
                  <img
                    src={prop.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop'}
                    alt={typeof prop.title === 'string' ? prop.title : prop.title?.[locale] || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: locale === 'ar' ? '10px' : 'auto',
                      left: locale === 'ar' ? 'auto' : '10px',
                      backgroundColor: 'rgba(11, 42, 74, 0.85)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {typeof prop.type === 'string' ? prop.type : prop.type?.[locale] || ''}
                  </span>
                </div>

                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h4
                      style={{
                        margin: '0 0 0.35rem',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--dary-navy)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {typeof prop.title === 'string' ? prop.title : prop.title?.[locale] || ''}
                    </h4>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
                      📍 {typeof prop.location === 'string' ? prop.location : prop.location?.[locale] || ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
                    <div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--dary-blue)' }}>
                        {prop.price?.toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--dary-muted)', marginInlineStart: '0.25rem' }}>
                        {locale === 'ar' ? 'ج.م / شهريًا' : 'EGP / mo'}
                      </span>
                    </div>

                    <Link
                      to={`/properties/${prop.id}`}
                      style={{
                        padding: '0.45rem 0.9rem',
                        backgroundColor: '#0B2A4A',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {locale === 'ar' ? 'عرض السكن' : 'View'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
