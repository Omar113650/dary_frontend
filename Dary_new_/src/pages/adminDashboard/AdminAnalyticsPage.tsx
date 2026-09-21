import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';

export default function AdminAnalyticsPage() {
  const { locale } = useLocale();

  const [analytics, setAnalytics] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, revRes] = await Promise.allSettled([
        AdminService.getAnalytics('7d'),
        AdminService.getBookingsRevenue(),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      } else {
        throw analyticsRes.reason;
      }

      if (revRes.status === 'fulfilled') {
        setRevenue(revRes.value);
      }
    } catch (err: any) {
      console.error('[AdminAnalyticsPage] GET /dashboard/analytics?range=7d failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل تحليلات المنصة من الخادم.'
            : 'Could not load platform analytics from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const parseMetricNumber = (val: any, fallback = 0): number => {
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string' && !Number.isNaN(Number(val))) return Number(val);
    if (Array.isArray(val)) return val.reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
    if (typeof val === 'object' && val !== null) {
      if (typeof val.count === 'number') return val.count;
      if (typeof val.rate === 'number') return val.rate;
      if (typeof val.total === 'number') return val.total;
    }
    return fallback;
  };

  const occupancyRate = parseMetricNumber(analytics?.occupancyRate ?? analytics?.summary?.occupancyRate ?? analytics?.occupancy, 0);
  const dau = parseMetricNumber(analytics?.dailyActiveUsers ?? analytics?.summary?.dailyActiveUsers ?? analytics?.activeUsers, 0);
  const bookingVolume = parseMetricNumber(analytics?.bookingVolume ?? analytics?.summary?.bookingVolume ?? analytics?.totalBookings, 0);
  const userGrowth = parseMetricNumber(
    analytics?.growthRate ??
    analytics?.summary?.newUsers ??
    analytics?.newUsers ??
    analytics?.userGrowth,
    0
  );

  const totalRevenue =
    revenue?.totalRevenue ??
    revenue?.revenue ??
    revenue?.total ??
    (typeof revenue === 'number' ? revenue : null);

  const currency = revenue?.currency || (locale === 'ar' ? 'ج.م' : 'EGP');

  return (
    <div className="dary-page-container">
      {/* Header */}
      <div className="dary-page-header">
        <div>
          <h1 className="dary-page-title" style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span>
            <span>{locale === 'ar' ? 'تحليلات المنصة والأداء (7 أيام)' : 'Platform Performance (7 Days)'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'مؤشرات الأداء الرئيسية لمنصة سكن الطلاب خلال آخر 7 أيام تشمل معدلات الإشغال، نمو المستخدمين والنشاط اليومي.'
              : 'KPI metrics covering occupancy, platform engagement, user acquisition, and financial totals.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              backgroundColor: '#EEF3FF',
              color: '#2F6BFF',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            Range: 7 Days (7d)
          </span>
          <button
            type="button"
            onClick={fetchAnalyticsData}
            className="dary-secondary-btn"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dary-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #E2E8F0',
              borderTopColor: '#0B2A4A',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1.5rem',
            }}
          />
          <p>{locale === 'ar' ? 'جاري تجميع مؤشرات الأداء والتحليلات...' : 'Compiling analytics metrics...'}</p>
        </div>
      ) : error ? (
        <div className="dary-error-alert">
          <span>{error}</span>
          <button type="button" onClick={fetchAnalyticsData} className="dary-retry-btn">
            {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : (
        <>
          {/* Main 4 Metric Cards */}
          <div className="dary-metrics-grid" style={{ marginBottom: '2rem' }}>
            {/* Occupancy Rate */}
            <div className="dary-metric-card">
              <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
                🏢
              </div>
              <div>
                <h3 className="dary-metric-number">{occupancyRate}%</h3>
                <p className="dary-metric-label">{locale === 'ar' ? 'معدل الإشغال الإجمالي' : 'Occupancy Rate'}</p>
              </div>
            </div>

            {/* Daily Active Users */}
            <div className="dary-metric-card">
              <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                👥
              </div>
              <div>
                <h3 className="dary-metric-number">{dau.toLocaleString()}</h3>
                <p className="dary-metric-label">{locale === 'ar' ? 'المستخدمين النشطين يومياً' : 'Daily Active Users'}</p>
              </div>
            </div>

            {/* Booking Volume */}
            <div className="dary-metric-card">
              <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF9C3', color: '#CA8A04' }}>
                📋
              </div>
              <div>
                <h3 className="dary-metric-number">{bookingVolume.toLocaleString()}</h3>
                <p className="dary-metric-label">{locale === 'ar' ? 'حجم الحجوزات المسجلة' : 'Booking Volume'}</p>
              </div>
            </div>

            {/* Platform Revenue */}
            <div className="dary-metric-card">
              <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: '#9333EA' }}>
                💰
              </div>
              <div>
                <h3 className="dary-metric-number">
                  {totalRevenue !== null ? `${totalRevenue.toLocaleString()} ${currency}` : '—'}
                </h3>
                <p className="dary-metric-label">{locale === 'ar' ? 'إجمالي إيرادات المنصة' : 'Total Revenue'}</p>
              </div>
            </div>
          </div>

          {/* Deep Analytics Visual Panels */}
          <div className="dary-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Occupancy Progress */}
            <div className="dary-card">
              <h2 className="dary-card-title" style={{ marginBottom: '1rem' }}>
                {locale === 'ar' ? 'تحليل الإشغال والقدرة الاستيعابية' : 'Occupancy & Capacity'}
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                {locale === 'ar'
                  ? 'نسبة الأسرة والغرف المؤجرة مقارنة بإجمالي الطاقة الاستيعابية عبر كافة العقارات.'
                  : 'Proportion of booked beds and rooms vs total student capacity.'}
              </p>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: '#0B2A4A' }}>{locale === 'ar' ? 'معدل الإشغال الحالي' : 'Current Occupancy'}</span>
                  <span style={{ color: '#2F6BFF' }}>{occupancyRate}%</span>
                </div>
                <div style={{ height: '12px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                      backgroundColor: '#2F6BFF',
                      borderRadius: '6px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{locale === 'ar' ? 'المؤجر' : 'Occupied'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16A34A', marginTop: '0.25rem' }}>
                    {occupancyRate}%
                  </div>
                </div>
                <div style={{ flex: 1, padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{locale === 'ar' ? 'المتاح الشاغر' : 'Available'}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0B2A4A', marginTop: '0.25rem' }}>
                    {Math.max(0, 100 - occupancyRate)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Growth & Engagement */}
            <div className="dary-card">
              <h2 className="dary-card-title" style={{ marginBottom: '1rem' }}>
                {locale === 'ar' ? 'النمو والنشاط التفاعلي (7 أيام)' : 'Growth & User Engagement'}
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                {locale === 'ar'
                  ? 'معدل انضمام مستخدمين جدد وتفاعل الطلاب والملاك عبر المنصة.'
                  : 'New user signups and daily interactions during the 7-day monitoring window.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0B2A4A' }}>{locale === 'ar' ? 'معدل نمو المستخدمين' : 'User Growth Rate'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{locale === 'ar' ? 'الطلاب والملاك الجدد' : 'New signups over 7 days'}</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: userGrowth >= 0 ? '#16A34A' : '#DC2626' }}>
                    {userGrowth >= 0 ? `+${userGrowth}` : `${userGrowth}`}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', marginInlineStart: '4px' }}>
                      {locale === 'ar' ? 'مستخدم' : 'users'}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0B2A4A' }}>{locale === 'ar' ? 'نشاط المستخدمين اليومي' : 'Active Daily Users'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{locale === 'ar' ? 'زيارات وتفاعلات المنصة' : 'Platform visits & sessions'}</div>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2F6BFF' }}>
                    {dau.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
