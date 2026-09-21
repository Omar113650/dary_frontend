import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminStatusCount, AdminReportItem } from '../../services/adminService';

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin-preview') ? '/admin-preview' : '/admin';

  const firstName =
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    (locale === 'ar' ? 'المدير' : 'Admin');

  // Status & Metric States
  const [usersStatus, setUsersStatus] = useState<any>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [propertiesStatus, setPropertiesStatus] = useState<any>(null);
  const [loadingProps, setLoadingProps] = useState(true);
  const [propsError, setPropsError] = useState<string | null>(null);

  const [bookingsStatus, setBookingsStatus] = useState<any>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [revenueData, setRevenueData] = useState<any>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  const [reportsStatus, setReportsStatus] = useState<any>(null);
  const [loadingReportsStatus, setLoadingReportsStatus] = useState(true);
  const [reportsStatusError, setReportsStatusError] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [recentReports, setRecentReports] = useState<AdminReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // 1. Fetch Users Status
  const fetchUsersStatus = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const data = await AdminService.getUsersStatus();
      setUsersStatus(data);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/users/status error:', err);
      setUsersError(err?.message || (locale === 'ar' ? 'تعذر تحميل إحصائيات المستخدمين.' : 'Could not load users status.'));
    } finally {
      setLoadingUsers(false);
    }
  }, [locale]);

  // 2. Fetch Properties Status
  const fetchPropsStatus = useCallback(async () => {
    setLoadingProps(true);
    setPropsError(null);
    try {
      const data = await AdminService.getPropertiesStatus();
      setPropertiesStatus(data);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/properties/status error:', err);
      setPropsError(err?.message || (locale === 'ar' ? 'تعذر تحميل إحصائيات العقارات.' : 'Could not load properties status.'));
    } finally {
      setLoadingProps(false);
    }
  }, [locale]);

  // 3. Fetch Bookings Status
  const fetchBookingsStatus = useCallback(async () => {
    setLoadingBookings(true);
    setBookingsError(null);
    try {
      const data = await AdminService.getBookingsStatus();
      setBookingsStatus(data);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/bookings/status error:', err);
      setBookingsError(err?.message || (locale === 'ar' ? 'تعذر تحميل إحصائيات الحجوزات.' : 'Could not load bookings status.'));
    } finally {
      setLoadingBookings(false);
    }
  }, [locale]);

  // 4. Fetch Revenue
  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    setRevenueError(null);
    try {
      const data = await AdminService.getBookingsRevenue();
      setRevenueData(data);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/bookings/revenue error:', err);
      setRevenueError(err?.message || (locale === 'ar' ? 'تعذر تحميل إحصائيات الإيرادات.' : 'Could not load revenue data.'));
    } finally {
      setLoadingRevenue(false);
    }
  }, [locale]);

  // 5. Fetch Reports Status
  const fetchReportsStatus = useCallback(async () => {
    setLoadingReportsStatus(true);
    setReportsStatusError(null);
    try {
      const data = await AdminService.getReportsStatus();
      setReportsStatus(data);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/reports/status error:', err);
      setReportsStatusError(err?.message || (locale === 'ar' ? 'تعذر تحميل إحصائيات البلاغات.' : 'Could not load reports status.'));
    } finally {
      setLoadingReportsStatus(false);
    }
  }, [locale]);

  // 6. Fetch 7d Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const data = await AdminService.getAnalytics('7d');
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/analytics?range=7d error:', err);
      setAnalyticsError(err?.message || (locale === 'ar' ? 'تعذر تحميل تحليلات المنصة.' : 'Could not load platform analytics.'));
    } finally {
      setLoadingAnalytics(false);
    }
  }, [locale]);

  // 7. Fetch Recent Reports
  const fetchRecentReports = useCallback(async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const data = await AdminService.getReports({ limit: 5 });
      const list = data?.reports || data?.items || data?.data || (Array.isArray(data) ? data : []);
      setRecentReports(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error('[AdminOverview] GET /dashboard/reports error:', err);
      setReportsError(err?.message || (locale === 'ar' ? 'تعذر تحميل قائمة البلاغات الحديثة.' : 'Could not load recent reports.'));
    } finally {
      setLoadingReports(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchUsersStatus();
    fetchPropsStatus();
    fetchBookingsStatus();
    fetchRevenue();
    fetchReportsStatus();
    fetchAnalytics();
    fetchRecentReports();
  }, [
    fetchUsersStatus,
    fetchPropsStatus,
    fetchBookingsStatus,
    fetchRevenue,
    fetchReportsStatus,
    fetchAnalytics,
    fetchRecentReports,
  ]);

  // Safe Parsers
  const normalizeStatusList = (raw: any): AdminStatusCount[] => {
    if (!raw) return [];
    const unwrapped =
      (raw?.status && typeof raw.status === 'object' && !Array.isArray(raw.status))
        ? raw.status
        : (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
        ? raw.data
        : raw;

    if (Array.isArray(unwrapped)) {
      return unwrapped
        .filter((item) => item && item.status && String(item.status).toLowerCase() !== 'total')
        .map((item) => ({
          status: String(item.status).toUpperCase(),
          count: typeof item.count === 'number' ? item.count : Number(item.count || 0),
        }));
    }

    if (typeof unwrapped === 'object') {
      return Object.entries(unwrapped)
        .filter(([key, val]) => {
          const lower = key.toLowerCase();
          return lower !== 'total' && lower !== 'totalproperties' && typeof val === 'number';
        })
        .map(([key, val]) => ({
          status: key.toUpperCase(),
          count: Number(val || 0),
        }));
    }
    return [];
  };

  const extractTotal = (raw: any, list: AdminStatusCount[]): number => {
    if (typeof raw === 'number') return raw;
    const unwrapped =
      (raw?.status && typeof raw.status === 'object' && !Array.isArray(raw.status))
        ? raw.status
        : (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
        ? raw.data
        : raw;

    if (typeof unwrapped?.total === 'number') return unwrapped.total;
    if (typeof unwrapped?.totalProperties === 'number') return unwrapped.totalProperties;

    // Avoid double counting if status + roles are in the same object
    if (unwrapped && (unwrapped.active !== undefined || unwrapped.inactive !== undefined)) {
      return (
        (Number(unwrapped.active) || 0) +
        (Number(unwrapped.inactive) || 0) +
        (Number(unwrapped.pending) || 0) +
        (Number(unwrapped.suspended) || 0)
      );
    }

    return list.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  };

  const usersStatusList = normalizeStatusList(usersStatus);
  const propsStatusList = normalizeStatusList(propertiesStatus);
  const bookingsStatusList = normalizeStatusList(bookingsStatus);
  const reportsStatusList = normalizeStatusList(reportsStatus);

  const totalUsers = extractTotal(usersStatus, usersStatusList);
  const totalProps = extractTotal(propertiesStatus, propsStatusList);
  const totalBookings = extractTotal(bookingsStatus, bookingsStatusList);
  const totalReports = extractTotal(reportsStatus, reportsStatusList);

  const parsedRevenue =
    revenueData?.totalRevenue ??
    revenueData?.revenue ??
    revenueData?.total ??
    (typeof revenueData === 'number' ? revenueData : null);

  const revenueCurrency = revenueData?.currency || (locale === 'ar' ? 'ج.م' : 'EGP');

  return (
    <div className="dary-page-container">
      {/* 1. Welcome Banner */}
      <div className="dary-welcome-card" style={{ background: 'linear-gradient(135deg, #0B2A4A 0%, #153E6B 100%)', border: '1px solid #B69F77' }}>
        <div className="dary-welcome-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(182, 159, 119, 0.2)', border: '1px solid #B69F77', padding: '0.2rem 0.6rem', borderRadius: '4px', color: '#B69F77', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <span>🛡️</span>
            <span>{locale === 'ar' ? 'لوحة القيادة المركزية' : 'CENTRAL COMMAND DASHBOARD'}</span>
          </div>
          <h1 className="dary-welcome-title">
            {locale === 'ar' ? `مرحبًا بك، ${firstName}` : `Welcome, ${firstName}`}
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'مراقبة مركزية لعمليات سكن الطلاب، نشاط المستخدمين، العقارات المسجلة، الحجوزات، والبلاغات.'
              : 'Platform oversight for student housing, user activity, properties, bookings, and customer tickets.'}
          </p>
        </div>

        <div className="dary-welcome-actions">
          <Link to={`${basePath}/users`} className="dary-primary-btn" style={{ backgroundColor: '#2F6BFF' }}>
            <span>{locale === 'ar' ? 'إدارة المستخدمين' : 'Manage Users'}</span>
          </Link>
          <Link to={`${basePath}/reports`} className="dary-secondary-btn" style={{ borderColor: '#B69F77', color: '#FFFFFF' }}>
            <span>{locale === 'ar' ? 'معالجة البلاغات' : 'Triage Reports'}</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric KPI Grid */}
      <div className="dary-metrics-grid">
        {/* Total Users */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingUsers ? '...' : usersError ? '—' : totalUsers.toLocaleString()}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
            </p>
          </div>
        </div>

        {/* Total Properties */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingProps ? '...' : propsError ? '—' : totalProps.toLocaleString()}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'العقارات المسجلة' : 'Registered Properties'}
            </p>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF9C3', color: '#CA8A04' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingBookings ? '...' : bookingsError ? '—' : totalBookings.toLocaleString()}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
            </p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: '#9333EA' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingRevenue ? (
                '...'
              ) : revenueError ? (
                '—'
              ) : parsedRevenue !== null ? (
                `${parsedRevenue.toLocaleString()} ${revenueCurrency}`
              ) : (
                '0'
              )}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي إيرادات المنصة' : 'Platform Revenue'}
            </p>
          </div>
        </div>

        {/* Reports / Triage */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingReportsStatus ? '...' : reportsStatusError ? '—' : totalReports.toLocaleString()}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'البلاغات والشكاوى' : 'Active Reports'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Operational Breakdowns: Users, Properties, Bookings */}
      <div className="dary-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Properties Breakdown */}
        <div className="dary-card">
          <div className="dary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="dary-card-title">{locale === 'ar' ? 'حالة العقارات المسجلة' : 'Properties by Status'}</h2>
            <Link to={`${basePath}/properties`} style={{ color: '#2F6BFF', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              {locale === 'ar' ? 'عرض الكل ←' : 'View All →'}
            </Link>
          </div>

          {loadingProps ? (
            <p style={{ color: '#64748B', padding: '1.5rem 0' }}>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : propsError ? (
            <div className="dary-error-alert">
              <span>{propsError}</span>
              <button type="button" onClick={fetchPropsStatus} className="dary-retry-btn">
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : propsStatusList.length === 0 ? (
            <p style={{ color: '#64748B', padding: '1rem 0', textAlign: 'center' }}>
              {locale === 'ar' ? 'لا توجد بيانات متاحة حالياً.' : 'No property status records found.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {propsStatusList.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0B2A4A' }}>{item.status}</span>
                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor:
                        item.status === 'APPROVED' ? '#DCFCE7' : item.status === 'PENDING' ? '#FEF9C3' : '#F1F5F9',
                      color:
                        item.status === 'APPROVED' ? '#15803D' : item.status === 'PENDING' ? '#A16207' : '#475569',
                    }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings Breakdown */}
        <div className="dary-card">
          <div className="dary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="dary-card-title">{locale === 'ar' ? 'حالة الحجوزات' : 'Bookings by Status'}</h2>
            <Link to={`${basePath}/bookings`} style={{ color: '#2F6BFF', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              {locale === 'ar' ? 'عرض الكل ←' : 'View All →'}
            </Link>
          </div>

          {loadingBookings ? (
            <p style={{ color: '#64748B', padding: '1.5rem 0' }}>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : bookingsError ? (
            <div className="dary-error-alert">
              <span>{bookingsError}</span>
              <button type="button" onClick={fetchBookingsStatus} className="dary-retry-btn">
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : bookingsStatusList.length === 0 ? (
            <p style={{ color: '#64748B', padding: '1rem 0', textAlign: 'center' }}>
              {locale === 'ar' ? 'لا توجد بيانات متاحة حالياً.' : 'No booking status records found.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {bookingsStatusList.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0B2A4A' }}>{item.status}</span>
                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      backgroundColor:
                        item.status === 'CONFIRMED' ? '#DCFCE7' : item.status === 'PENDING' ? '#FEF9C3' : '#FEE2E2',
                      color:
                        item.status === 'CONFIRMED' ? '#15803D' : item.status === 'PENDING' ? '#A16207' : '#B91C1C',
                    }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7-Day Analytics Overview Widget */}
        <div className="dary-card">
          <div className="dary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="dary-card-title">{locale === 'ar' ? 'نشاط المنصة (7 أيام)' : '7-Day Platform Activity'}</h2>
            <Link to={`${basePath}/analytics`} style={{ color: '#2F6BFF', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              {locale === 'ar' ? 'التحليلات التفصيلية ←' : 'Full Analytics →'}
            </Link>
          </div>

          {loadingAnalytics ? (
            <p style={{ color: '#64748B', padding: '1.5rem 0' }}>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : analyticsError ? (
            <div className="dary-error-alert">
              <span>{analyticsError}</span>
              <button type="button" onClick={fetchAnalytics} className="dary-retry-btn">
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
              <div style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{locale === 'ar' ? 'معدل الإشغال الإجمالي' : 'Occupancy Rate'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0B2A4A', marginTop: '0.25rem' }}>
                  {analyticsData?.occupancyRate !== undefined ? `${analyticsData.occupancyRate}%` : '—'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{locale === 'ar' ? 'النشاط اليومي (Daily Active Users)' : 'Daily Active Users'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0B2A4A', marginTop: '0.25rem' }}>
                  {analyticsData?.dailyActiveUsers !== undefined ? analyticsData.dailyActiveUsers.toLocaleString() : '—'}
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>{locale === 'ar' ? 'حجم الحجوزات المسجلة' : 'Booking Volume'}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0B2A4A', marginTop: '0.25rem' }}>
                  {analyticsData?.bookingVolume !== undefined ? analyticsData.bookingVolume.toLocaleString() : '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Recent Reports Quick Triage */}
      <div className="dary-card">
        <div className="dary-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="dary-card-title">{locale === 'ar' ? 'أحدث البلاغات والشكاوى الواردة' : 'Recent Reports & Inquiries'}</h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              {locale === 'ar' ? 'متابعة شكاوى الطلاب والملاك واتخاذ الإجراءات اللازمة' : 'Track tenant and owner reports for swift resolution'}
            </p>
          </div>
          <Link to={`${basePath}/reports`} className="dary-primary-btn" style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}>
            {locale === 'ar' ? 'كل البلاغات' : 'All Reports'}
          </Link>
        </div>

        {loadingReports ? (
          <p style={{ color: '#64748B', padding: '1.5rem 0' }}>{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : reportsError ? (
          <div className="dary-error-alert">
            <span>{reportsError}</span>
            <button type="button" onClick={fetchRecentReports} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : recentReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
            <p>{locale === 'ar' ? 'لا توجد بلاغات معلقة حالياً.' : 'No active reports at this time.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="dary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>#</th>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'العنوان / السبب' : 'Title / Reason'}</th>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الأولوية' : 'Priority'}</th>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'مقدم البلاغ' : 'Reporter'}</th>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th style={{ padding: '0.75rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report, idx) => {
                  const title =
                    report.title ||
                    (report.reportedProperty?.title
                      ? `${locale === 'ar' ? 'عقار: ' : 'Property: '}${report.reportedProperty.title}`
                      : report.description
                      ? report.description.substring(0, 45) + (report.description.length > 45 ? '...' : '')
                      : `${locale === 'ar' ? 'بلاغ ' : 'Report '}${report.reportedType || ''}`);

                  const reporter =
                    report.reporter?.firstName
                      ? `${report.reporter.firstName} ${report.reporter.lastName || ''}`.trim()
                      : report.reporter?.email || report.reportedBy?.name || report.reportedBy?.email || '—';

                  const rawPriority = (report.priority || 'medium').toUpperCase();

                  return (
                    <tr key={report.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.75rem', color: '#64748B', fontSize: '0.85rem' }}>
                        {report.id ? report.id.substring(0, 8) : `#${idx + 1}`}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0B2A4A' }}>
                        {title}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor:
                              rawPriority === 'URGENT' || rawPriority === 'HIGH'
                                ? '#FEE2E2'
                                : rawPriority === 'MEDIUM'
                                ? '#FEF9C3'
                                : '#F1F5F9',
                            color:
                              rawPriority === 'URGENT' || rawPriority === 'HIGH'
                                ? '#DC2626'
                                : rawPriority === 'MEDIUM'
                                ? '#CA8A04'
                                : '#475569',
                          }}
                        >
                          {rawPriority}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: report.status === 'RESOLVED' ? '#DCFCE7' : '#FEF9C3',
                            color: report.status === 'RESOLVED' ? '#15803D' : '#A16207',
                          }}
                        >
                          {report.status || 'PENDING'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#475569', fontSize: '0.85rem' }}>
                        {reporter}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748B', fontSize: '0.82rem' }}>
                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <Link
                          to={`${basePath}/reports`}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#0B2A4A',
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {locale === 'ar' ? 'معالجة' : 'Triage'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
