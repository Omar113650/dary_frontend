import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';

export default function OwnerOverviewPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/owner-dashboard-preview')
    ? '/owner-dashboard-preview'
    : '/owner-dashboard';

  const firstName =
    user?.firstName ||
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    (locale === 'ar' ? 'المالك' : 'Owner');

  // 1. Property Status State
  const [propertiesStatus, setPropertiesStatus] = useState<any>(null);
  const [loadingProps, setLoadingProps] = useState(true);
  const [propsError, setPropsError] = useState<string | null>(null);

  // 1b. Real Properties List State
  const [myPropertiesList, setMyPropertiesList] = useState<any[]>([]);
  const [loadingMyProps, setLoadingMyProps] = useState(true);

  // 2. Booking Status State
  const [bookingsStatus, setBookingsStatus] = useState<any>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // 3. Revenue State
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  // 4. Calendar State
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Fetch Section A: Properties Status & List
  const fetchPropertiesStatus = useCallback(async () => {
    setLoadingProps(true);
    setLoadingMyProps(true);
    setPropsError(null);
    try {
      const [statusData, propsData] = await Promise.allSettled([
        OwnerService.getPropertiesStatus(),
        OwnerService.getMyProperties(),
      ]);

      if (statusData.status === 'fulfilled') {
        setPropertiesStatus(statusData.value);
      }
      if (propsData.status === 'fulfilled') {
        setMyPropertiesList(Array.isArray(propsData.value) ? propsData.value : []);
      }
    } catch (err: any) {
      console.error('[OwnerOverview] Properties status fetch failed:', err);
      setPropsError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل حالة العقارات من الخادم.'
            : 'Could not load properties status from the server.')
      );
    } finally {
      setLoadingProps(false);
      setLoadingMyProps(false);
    }
  }, [locale]);

  // Fetch Section B: Bookings Status
  const fetchBookingsStatus = useCallback(async () => {
    setLoadingBookings(true);
    setBookingsError(null);
    try {
      const data = await OwnerService.getBookingsStatus();
      setBookingsStatus(data);
    } catch (err: any) {
      console.error('[OwnerOverview] Bookings status fetch failed:', err);
      setBookingsError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل حالة الحجوزات من الخادم.'
            : 'Could not load bookings status from the server.')
      );
    } finally {
      setLoadingBookings(false);
    }
  }, [locale]);

  // Fetch Section C: Revenue
  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    setRevenueError(null);
    try {
      const data = await OwnerService.getRevenue();
      setRevenueData(data);
    } catch (err: any) {
      console.error('[OwnerOverview] Revenue fetch failed:', err);
      setRevenueError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات الإيرادات من الخادم.'
            : 'Could not load revenue data from the server.')
      );
    } finally {
      setLoadingRevenue(false);
    }
  }, [locale]);

  // Fetch Section D: Calendar Summary
  const fetchCalendar = useCallback(async () => {
    setLoadingCalendar(true);
    setCalendarError(null);
    try {
      const data = await OwnerService.getCalendarSummary();
      setCalendarData(data);
    } catch (err: any) {
      console.error('[OwnerOverview] Calendar summary fetch failed:', err);
      setCalendarError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل ملخص التقويم من الخادم.'
            : 'Could not load calendar summary from the server.')
      );
    } finally {
      setLoadingCalendar(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchPropertiesStatus();
    fetchBookingsStatus();
    fetchRevenue();
    fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to safely parse status counts
  function extractStatusEntries(raw: any): Array<{ status: string; count: number }> {
    if (!raw) return [];
    const unwrapped =
      (raw?.status && typeof raw.status === 'object' && !Array.isArray(raw.status))
        ? raw.status
        : (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
        ? raw.data
        : raw;

    if (Array.isArray(unwrapped)) {
      return unwrapped
        .filter((item) => item && (item.status || item.name || item.key) && String(item.status || item.name || item.key).toLowerCase() !== 'total')
        .map((item) => ({
          status: String(item.status || item.name || item.key).toUpperCase(),
          count: Number(item.count || item._count || 0),
        }));
    }

    if (typeof unwrapped === 'object') {
      const entries: Array<{ status: string; count: number }> = [];
      const ignoredKeys = ['success', 'message', 'statuscode', 'total', 'totalproperties'];
      for (const [key, val] of Object.entries(unwrapped)) {
        if (!ignoredKeys.includes(key.toLowerCase())) {
          if (typeof val === 'number') {
            entries.push({ status: key.toUpperCase(), count: val });
          } else if (val && typeof val === 'object' && 'count' in (val as any)) {
            entries.push({ status: key.toUpperCase(), count: Number((val as any).count) });
          }
        }
      }
      return entries;
    }
    return [];
  }

  const extractOwnerTotal = (raw: any, list: Array<{ status: string; count: number }>): number => {
    if (typeof raw === 'number') return raw;
    const unwrapped =
      (raw?.status && typeof raw.status === 'object' && !Array.isArray(raw.status))
        ? raw.status
        : (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
        ? raw.data
        : raw;

    if (unwrapped?.totalProperties !== undefined && typeof unwrapped.totalProperties === 'number') return unwrapped.totalProperties;
    if (unwrapped?.total !== undefined && typeof unwrapped.total === 'number') return unwrapped.total;
    return list.reduce((acc, curr) => acc + curr.count, 0);
  };

  const propStatusList = extractStatusEntries(propertiesStatus);
  const bookingStatusList = extractStatusEntries(bookingsStatus);
  const totalOwnerProps = extractOwnerTotal(propertiesStatus, propStatusList);
  const totalOwnerBookings = extractOwnerTotal(bookingsStatus, bookingStatusList);

  // Parse revenue safely
  const parsedRevenue =
    revenueData?.totalRevenue ??
    revenueData?.revenue ??
    revenueData?.total ??
    (typeof revenueData === 'number' ? revenueData : null);

  const revenueCurrency = revenueData?.currency || (locale === 'ar' ? 'ج.م' : 'EGP');

  // Calendar summary data extraction
  const activeBookings = calendarData?.activeBookings ?? 0;
  const upcomingBookings = calendarData?.upcomingBookings ?? 0;
  const expiringSoon = calendarData?.expiringSoon ?? 0;
  const occupiedBeds = calendarData?.occupiedBeds ?? 0;

  return (
    <div>
      {/* 1. Welcome Card */}
      <div className="dary-welcome-card" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dary-welcome-title">
            {locale === 'ar' ? `مرحبًا بك، ${firstName} 🏢` : `Welcome, ${firstName} 🏢`}
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'متابعة شاملة لعقاراتك، نسب الإشغال، الحجوزات، والأداء المالي لسكنك الطلابي.'
              : 'Comprehensive overview of your properties, occupancy rates, bookings, and revenue.'}
          </p>
        </div>

        <div className="dary-welcome-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to={`${basePath}/properties/new`}
            className="dary-primary-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#16A34A', textDecoration: 'none' }}
          >
            <span>+</span>
            <span>{locale === 'ar' ? 'إضافة عقار جديد' : 'Add Property'}</span>
          </Link>
          <Link to={`${basePath}/properties`} className="dary-primary-btn" style={{ textDecoration: 'none' }}>
            <span>{locale === 'ar' ? 'إدارة العقارات' : 'Manage Properties'}</span>
          </Link>
          <Link to={`${basePath}/bookings`} className="dary-secondary-btn" style={{ textDecoration: 'none' }}>
            <span>{locale === 'ar' ? 'عرض الحجوزات' : 'View Bookings'}</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric Cards (Revenue + Counts + Occupancy) */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Revenue Card */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: '#9333EA' }}>
            💰
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
              {locale === 'ar' ? 'إجمالي الإيرادات المحققة' : 'Total Revenue'}
            </p>
          </div>
        </div>

        {/* Properties Total */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            🏠
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingProps ? '...' : propsError ? '—' : totalOwnerProps}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي العقارات المسجلة' : 'Total Properties'}
            </p>
          </div>
        </div>

        {/* Bookings Total */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2F6BFF' }}>
            📋
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingBookings ? '...' : bookingsError ? '—' : totalOwnerBookings}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي طلبات الحجز' : 'Total Bookings'}
            </p>
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF9C3', color: '#CA8A04' }}>
            🛏️
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingCalendar ? '...' : calendarError ? '—' : occupiedBeds}
            </h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'الأسرّة المشغولة حاليًا' : 'Occupied Beds'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Status Highlights Grid (Properties Status + Bookings Status) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Properties Status Card */}
        <div className="dary-section-card" style={{ margin: 0 }}>
          <div className="dary-section-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B2A4A', margin: 0 }}>
                {locale === 'ar' ? '🏢 حالة العقارات المسجلة' : '🏢 Properties Status'}
              </h3>
            </div>
            <Link to={`${basePath}/properties`} className="dary-view-all-link" style={{ fontSize: '0.85rem' }}>
              <span>{locale === 'ar' ? 'عرض الكل' : 'View All'}</span>
              <span>←</span>
            </Link>
          </div>

          {loadingProps ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#64748B' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{locale === 'ar' ? 'جاري تحميل العقارات...' : 'Loading properties...'}</p>
            </div>
          ) : propStatusList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{locale === 'ar' ? 'لا توجد عقارات مسجلة حتى الآن.' : 'No properties found.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {propStatusList.map((item) => {
                const isApproved = item.status === 'APPROVED' || item.status === 'PUBLISHED';
                const isPending = item.status === 'PENDING' || item.status === 'UNDERREVIEW';
                const isRejected = item.status === 'REJECTED';
                const bg = isApproved ? '#DCFCE7' : isPending ? '#FEF9C3' : isRejected ? '#FEE2E2' : '#F1F5F9';
                const color = isApproved ? '#15803D' : isPending ? '#A16207' : isRejected ? '#B91C1C' : '#475569';

                return (
                  <div
                    key={item.status}
                    style={{
                      padding: '1rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                      {item.count}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: bg,
                        color: color,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bookings Status Card */}
        <div className="dary-section-card" style={{ margin: 0 }}>
          <div className="dary-section-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B2A4A', margin: 0 }}>
                {locale === 'ar' ? '📋 حالة طلبات الحجز' : '📋 Bookings Status'}
              </h3>
            </div>
            <Link to={`${basePath}/bookings`} className="dary-view-all-link" style={{ fontSize: '0.85rem' }}>
              <span>{locale === 'ar' ? 'عرض الكل' : 'View All'}</span>
              <span>←</span>
            </Link>
          </div>

          {loadingBookings ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#64748B' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{locale === 'ar' ? 'جاري تحميل الحجوزات...' : 'Loading bookings...'}</p>
            </div>
          ) : bookingStatusList.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{locale === 'ar' ? 'لا توجد طلبات حجز مسجلة.' : 'No bookings found.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {bookingStatusList.map((item) => {
                const isConfirmed = item.status === 'CONFIRMED' || item.status === 'CLOSED';
                const isContacted = item.status === 'CONTACTED';
                const isPending = item.status === 'PENDING';
                const bg = isConfirmed ? '#DCFCE7' : isContacted ? '#E0F2FE' : isPending ? '#FEF9C3' : '#FEE2E2';
                const color = isConfirmed ? '#15803D' : isContacted ? '#0369A1' : isPending ? '#A16207' : '#B91C1C';

                return (
                  <div
                    key={item.status}
                    style={{
                      padding: '1rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                      {item.count}
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: bg,
                        color: color,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3b. My Properties Cards Grid */}
      <div className="dary-section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dary-section-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? '🏢 عقاراتي المسجلة' : '🏢 My Registered Properties'}
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'نظرة سريعة على عقاراتك المضافة وحالة اعتمادها من قبل إدارة المنصة.'
                : 'Quick overview of your registered properties and their verification status.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              to={`${basePath}/properties/new`}
              className="dary-primary-btn"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', backgroundColor: '#16A34A', textDecoration: 'none' }}
            >
              <span>+</span> {locale === 'ar' ? 'إضافة عقار' : 'Add Property'}
            </Link>
            <Link
              to={`${basePath}/properties`}
              className="dary-secondary-btn"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', textDecoration: 'none' }}
            >
              <span>{locale === 'ar' ? 'إدارة الكل' : 'Manage All'}</span>
              <span>←</span>
            </Link>
          </div>
        </div>

        {loadingMyProps ? (
          <div style={{ padding: '2.5rem 0', textAlign: 'center', color: '#64748B' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 0.75rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{locale === 'ar' ? 'جاري تحميل العقارات...' : 'Loading properties...'}</p>
          </div>
        ) : myPropertiesList.length === 0 ? (
          <div className="dary-empty-state" style={{ padding: '2rem' }}>
            <div className="dary-empty-icon" style={{ fontSize: '2.5rem' }}>🏢</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'لا توجد عقارات مسجلة حتى الآن' : 'No Properties Yet'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'ابدأ بإضافة وحداتك السكنية وسكناتك الطلابية لتتم مراجعتها ونشرها للطلاب.'
                : 'Add your student housing properties to start receiving bookings.'}
            </p>
            <Link
              to={`${basePath}/properties/new`}
              className="dary-primary-btn"
              style={{ textDecoration: 'none', marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>+</span> {locale === 'ar' ? 'إضافة عقار جديد' : 'Add Property'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {myPropertiesList.slice(0, 6).map((prop) => {
              const image =
                prop.primaryImage ||
                (Array.isArray(prop.images) && prop.images.length > 0
                  ? typeof prop.images[0] === 'string'
                    ? prop.images[0]
                    : prop.images[0]?.url
                  : '') ||
                (Array.isArray(prop.rooms_) && prop.rooms_.length > 0
                  ? prop.rooms_[0]?.photoUrl
                  : '') ||
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';

              const price =
                prop.startingPrice ||
                prop.price ||
                (prop as any).pricePerMonth ||
                (Array.isArray(prop.rooms_) && prop.rooms_.length > 0
                  ? Math.min(...prop.rooms_.map((r: any) => Number(r.pricePerBed) || 0).filter((p: number) => p > 0))
                  : null);

              const roomCount =
                (Array.isArray(prop.rooms_) && prop.rooms_.length > 0 ? prop.rooms_.length : null) ||
                (typeof prop.rooms === 'number' && prop.rooms > 0 ? prop.rooms : null) ||
                1;

              const s = (prop.status || '').toUpperCase();
              const isApproved = s === 'APPROVED' || s === 'ACTIVE';
              const isPending = s === 'PENDING';

              return (
                <div
                  key={prop.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ position: 'relative', height: '140px', backgroundColor: '#F1F5F9' }}>
                    <img
                      src={image}
                      alt={prop.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';
                      }}
                    />
                    <div style={{ position: 'absolute', top: '8px', insetInlineStart: '8px' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          backgroundColor: isApproved ? '#DCFCE7' : isPending ? '#FEF9C3' : '#FEE2E2',
                          color: isApproved ? '#15803D' : isPending ? '#A16207' : '#B91C1C',
                        }}
                      >
                        {isApproved ? (locale === 'ar' ? '✓ معتمد' : 'Approved') : isPending ? (locale === 'ar' ? '⏳ قيد المراجعة' : 'Pending') : prop.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#0B2A4A' }}>
                      {prop.title}
                    </h4>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.775rem', color: '#64748B' }}>
                      📍 {prop.city ? `${prop.city} • ` : ''}{prop.district || prop.address || ''}
                    </p>

                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                      <span style={{ backgroundColor: '#F8FAFC', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        🛏️ {roomCount} {locale === 'ar' ? 'غرف' : 'Rooms'}
                      </span>
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontWeight: 800, color: '#2F6BFF', fontSize: '1rem' }}>
                        {price && !isNaN(Number(price)) ? Number(price).toLocaleString() : '—'}{' '}
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#64748B' }}>{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </span>

                      <Link
                        to={`/properties/${prop.id}`}
                        style={{
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          color: '#0B2A4A',
                          textDecoration: 'none',
                        }}
                      >
                        {locale === 'ar' ? 'معاينة ←' : 'View →'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Occupancy & Calendar Summary */}
      <div className="dary-section-card">
        <div className="dary-section-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? '🗓️ ملخص الإشغال وجداول التسكين' : '🗓️ Occupancy & Calendar Overview'}
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'متابعة مباشرة لمواعيد وصول الطلاب، فترات الحجز السارية، والعقود التي توشك على الانتهاء.'
                : 'Real-time overview of active student stays, upcoming arrivals, and expiring leases.'}
            </p>
          </div>
          <Link
            to={`${basePath}/calendar`}
            className="dary-primary-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            <span>{locale === 'ar' ? 'فتح التقويم الكامل' : 'Open Full Calendar'}</span>
            <span>←</span>
          </Link>
        </div>

        {loadingCalendar ? (
          <div style={{ padding: '2.5rem 0', textAlign: 'center', color: '#64748B' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{locale === 'ar' ? 'جاري تحميل ملخص التقويم...' : 'Loading calendar...'}</p>
          </div>
        ) : calendarError ? (
          <div className="dary-error-state">
            <p className="dary-error-desc">{calendarError}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchCalendar}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', display: 'block', marginBottom: '0.4rem' }}>
                🟢 {locale === 'ar' ? 'الحجوزات السارية الآن' : 'Active Bookings'}
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#14532D' }}>
                {activeBookings}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#15803D' }}>
                {locale === 'ar' ? 'طلاب مقيمون حاليًا بالسكن' : 'Students currently staying'}
              </span>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E40AF', display: 'block', marginBottom: '0.4rem' }}>
                🟡 {locale === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1E3A8A' }}>
                {upcomingBookings}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#2563EB' }}>
                {locale === 'ar' ? 'مواعيد وصول وتسكين قادمة' : 'Upcoming check-in dates'}
              </span>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400E', display: 'block', marginBottom: '0.4rem' }}>
                ⏰ {locale === 'ar' ? 'تنتهي خلال 30 يوماً' : 'Expiring Soon'}
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#78350F' }}>
                {expiringSoon}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#D97706' }}>
                {locale === 'ar' ? 'عقود وحجوزات توشك على الانتهاء' : 'Contracts expiring within 30 days'}
              </span>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: '#FAF5FF', borderRadius: '12px', border: '1px solid #E9D5FF' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B21A8', display: 'block', marginBottom: '0.4rem' }}>
                🛏️ {locale === 'ar' ? 'الأسرّة المشغولة' : 'Occupied Beds'}
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#581C87' }}>
                {occupiedBeds}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#9333EA' }}>
                {locale === 'ar' ? 'إجمالي الأسرّة المحجوزة' : 'Total occupied beds'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
