import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';

export default function OwnerRevenuePage() {
  const { locale } = useLocale();
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await OwnerService.getRevenue();
      setRevenueData(data);
    } catch (err: any) {
      console.error('[OwnerRevenuePage] Revenue fetch failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات الإيرادات من الخادم.'
            : 'Could not load revenue data from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  // Defensive extraction
  const parsedTotal =
    revenueData?.totalRevenue ??
    revenueData?.total ??
    revenueData?.revenue ??
    (typeof revenueData === 'number' ? revenueData : 0);

  const currency = revenueData?.currency || (locale === 'ar' ? 'ج.م' : 'EGP');
  const completedBookings = revenueData?.completedBookings ?? 0;
  const pendingBookings = revenueData?.pendingBookings ?? 0;
  const totalProperties = revenueData?.totalProperties ?? 0;
  const avgRevenuePerProperty = revenueData?.avgRevenuePerProperty ?? (totalProperties > 0 ? Math.round(Number(parsedTotal) / totalProperties) : 0);

  return (
    <div>
      {/* Header Section */}
      <div className="dary-section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dary-section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? '📊 تقرير الإيرادات والأداء المالي' : '📊 Revenue & Financial Performance'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'متابعة تفصيلية للإيرادات المحققة من عقاراتك المؤجرة بناءً على عقود وحجوزات الطلاب الفعلية.'
                : 'Track student booking earnings, completed payments, and property performance.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#64748B' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل مؤشرات الإيرادات...' : 'Loading financial metrics...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب بيانات الإيرادات' : 'Error loading revenue'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchRevenue}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div>
            {/* Main Highlight Hero Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0B2A4A 0%, #1E3A8A 100%)',
                borderRadius: '16px',
                padding: '2rem',
                color: '#FFFFFF',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
                boxShadow: '0 10px 25px -5px rgba(11, 42, 74, 0.25)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.9rem', color: '#CBD5E1', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  {locale === 'ar' ? 'إجمالي الحصيلة المالية المحققة' : 'Total Earned Revenue'}
                </span>
                <div style={{ fontSize: '2.75rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {Number(parsedTotal).toLocaleString()}
                  <span style={{ fontSize: '1.25rem', marginInlineStart: '0.6rem', color: '#FDE047', fontWeight: 700 }}>
                    {currency}
                  </span>
                </div>
                <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#93C5FD' }}>
                  {locale === 'ar'
                    ? 'الأرباح الناتجة من الحجوزات المكتملة وتسكين الطلاب'
                    : 'Revenue generated from confirmed and completed student housing stays.'}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  padding: '1.25rem 1.75rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  textAlign: locale === 'ar' ? 'right' : 'left',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#E2E8F0', marginBottom: '0.25rem' }}>
                  {locale === 'ar' ? 'حالة الحساب المالي' : 'Account Financial Status'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ADE80' }}>
                  ✓ {locale === 'ar' ? 'حساب نشط ومطابق' : 'Active & Verified'}
                </div>
              </div>
            </div>

            {/* 4 Performance Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                  ✅ {locale === 'ar' ? 'الحجوزات المكتملة والمحصلة' : 'Completed Bookings'}
                </span>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B2A4A' }}>
                  {completedBookings}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#16A34A' }}>
                  {locale === 'ar' ? 'حجوزات تم إتمامها وتسكينها' : 'Fully completed bookings'}
                </span>
              </div>

              <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                  ⏳ {locale === 'ar' ? 'حجوزات قيد المعالجة' : 'Pending Bookings'}
                </span>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B2A4A' }}>
                  {pendingBookings}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#CA8A04' }}>
                  {locale === 'ar' ? 'طلبات حجز بانتظار التأكيد' : 'Requests in progress'}
                </span>
              </div>

              <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                  🏢 {locale === 'ar' ? 'العقارات المؤجرة' : 'Total Properties'}
                </span>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B2A4A' }}>
                  {totalProperties}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#2563EB' }}>
                  {locale === 'ar' ? 'عقارات مسجلة بحسابك' : 'Active listings'}
                </span>
              </div>

              <div style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.35rem' }}>
                  📈 {locale === 'ar' ? 'متوسط الإيراد لكل سكن' : 'Avg Revenue / Property'}
                </span>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0B2A4A' }}>
                  {avgRevenuePerProperty.toLocaleString()} {currency}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9333EA' }}>
                  {locale === 'ar' ? 'متوسط العائد لكل وحدة' : 'Average return per unit'}
                </span>
              </div>
            </div>

            {/* Financial Guidelines / Best Practices */}
            <div style={{ padding: '1.5rem', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#166534', margin: '0 0 0.5rem' }}>
                💡 {locale === 'ar' ? 'نصائح لزيادة عوائد وإشغال سكن الطلاب' : 'Tips to Maximize Student Housing Returns'}
              </h3>
              <ul style={{ margin: 0, paddingInlineStart: '1.25rem', color: '#15803D', fontSize: '0.85rem', lineHeight: 1.8 }}>
                <li>{locale === 'ar' ? 'تأكد من تحديث أسعار الغرف والأسرة بما يواكب بداية الفصول والمواسم الدراسية للجامعات.' : 'Keep room and bed pricing competitive around university academic semester start dates.'}</li>
                <li>{locale === 'ar' ? 'إضافة صور واضحة ومرافق تشمل الإنترنت السريع والتكييف يرفع معدل الحجز المباشر بنسبة تفوق 45%.' : 'Clear photos and inclusions like high-speed Wi-Fi and AC boost student bookings by over 45%.'}</li>
                <li>{locale === 'ar' ? 'سرعة التنسيق والتواصل مع الطلاب فور وصول طلب الحجز تضمن إتمام العقد وتفادي إلغاء الطلبات.' : 'Prompt communication with students upon booking request ensures smooth contract completion.'}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
