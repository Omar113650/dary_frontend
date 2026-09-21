import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';

export default function OwnerCalendarPage() {
  const { locale } = useLocale();
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await OwnerService.getCalendarSummary({ days: daysFilter });
      setCalendarData(data);
    } catch (err: any) {
      console.error('[OwnerCalendarPage] Calendar summary fetch failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل ملخص التقويم من الخادم.'
            : 'Could not load calendar summary from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale, daysFilter]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const activeBookings = calendarData?.activeBookings ?? 0;
  const upcomingBookings = calendarData?.upcomingBookings ?? 0;
  const expiringSoon = calendarData?.expiringSoon ?? 0;
  const occupiedBeds = calendarData?.occupiedBeds ?? 0;
  const totalBookings = calendarData?.totalBookings ?? 0;

  // Bookings list from backend or empty
  const rawBookings: any[] = Array.isArray(calendarData?.bookings)
    ? calendarData.bookings
    : Array.isArray(calendarData?.events)
    ? calendarData.events
    : Array.isArray(calendarData)
    ? calendarData
    : [];

  return (
    <div>
      {/* 1. Header Card */}
      <div className="dary-section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="dary-section-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? '🗓️ تقويم التسكين وإشغال العقارات' : '🗓️ Occupancy & Stays Calendar'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'متابعة مواعيد وصول الطلاب، فترات الحجز السارية، وتواريخ انتهاء عقود الإيجار لجميع عقاراتك.'
                : 'Supervise tenant check-in dates, active room stays, and lease expiration schedules.'}
            </p>
          </div>
        </div>

        {/* 2. Top Summary Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534', display: 'block', marginBottom: '0.4rem' }}>
              🟢 {locale === 'ar' ? 'الحجوزات السارية الآن' : 'Active Bookings'}
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#14532D' }}>
              {loading ? '...' : activeBookings}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#15803D' }}>
              {locale === 'ar' ? 'طلاب مقيمون حاليًا في السكن' : 'Students currently staying'}
            </span>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E40AF', display: 'block', marginBottom: '0.4rem' }}>
              🟡 {locale === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E3A8A' }}>
              {loading ? '...' : upcomingBookings}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#2563EB' }}>
              {locale === 'ar' ? 'مواعيد وصول وتسكين قادمة' : 'Upcoming check-in dates'}
            </span>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400E', display: 'block', marginBottom: '0.4rem' }}>
              ⏰ {locale === 'ar' ? 'تنتهي خلال 30 يوماً' : 'Expiring Soon'}
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#78350F' }}>
              {loading ? '...' : expiringSoon}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#D97706' }}>
              {locale === 'ar' ? 'عقود توشك على الانتهاء' : 'Contracts expiring soon'}
            </span>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: '#FAF5FF', borderRadius: '12px', border: '1px solid #E9D5FF' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B21A8', display: 'block', marginBottom: '0.4rem' }}>
              🛏️ {locale === 'ar' ? 'الأسرّة المشغولة' : 'Occupied Beds'}
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#581C87' }}>
              {loading ? '...' : occupiedBeds}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#9333EA' }}>
              {locale === 'ar' ? 'إجمالي الأسرّة المحجوزة' : 'Total active beds'}
            </span>
          </div>
        </div>

        {/* 3. Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A' }}>
            {locale === 'ar' ? `إجمالي الحجوزات المجدولة (${totalBookings || rawBookings.length})` : `Total Scheduled Bookings (${totalBookings || rawBookings.length})`}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDaysFilter(days)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: daysFilter === days ? '#0B2A4A' : '#FFFFFF',
                  color: daysFilter === days ? '#FFFFFF' : '#475569',
                  fontWeight: daysFilter === days ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: daysFilter === days ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {locale === 'ar' ? `${days} يوم` : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Bookings Cards List */}
        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: '#64748B' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل جدول المواعيد...' : 'Loading schedules...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب بيانات التقويم' : 'Calendar Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchCalendar}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : rawBookings.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🗓️</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B2A4A', margin: '0 0 0.4rem' }}>
              {locale === 'ar' ? 'لا توجد حجوزات مجدولة حاليًا' : 'No Scheduled Bookings Found'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '480px', margin: '0 auto' }}>
              {locale === 'ar'
                ? 'عندما يقدم الطلاب طلبات حجز على عقاراتك وتتم معالجتها، ستظهر فترات الإقامة وتواريخ الوصول والمغادرة هنا تلقائيًا.'
                : 'As students book rooms in your properties, their stay duration, check-in, and check-out dates will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {rawBookings.map((b: any, idx: number) => {
              const start = b.startDate || b.moveInDate;
              const end = b.endDate || b.moveOutDate;
              const tenantName = b.tenant?.firstName
                ? `${b.tenant.firstName} ${b.tenant.lastName || ''}`.trim()
                : b.tenant?.name || b.tenantName || 'طالب مستأجر';
              const tenantPhone = b.tenant?.whatsappPhone || b.tenant?.phone;
              const propertyTitle = b.property?.title || b.propertyTitle || 'سكن جامعي';
              const roomName = b.room?.roomType ? `غرفة ${b.room.roomType}` : 'غرفة دراسية';
              const beds = b.bedsRequested || 1;

              const isConfirmed = b.status === 'CONFIRMED' || b.status === 'CLOSED';
              const isContacted = b.status === 'CONTACTED';
              const isPending = b.status === 'PENDING';
              const bg = isConfirmed ? '#DCFCE7' : isContacted ? '#E0F2FE' : isPending ? '#FEF9C3' : '#FEE2E2';
              const color = isConfirmed ? '#15803D' : isContacted ? '#0369A1' : isPending ? '#A16207' : '#B91C1C';

              return (
                <div
                  key={b.id || idx}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0B2A4A', fontWeight: 700 }}>
                        {propertyTitle}
                      </h3>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: bg,
                          color: color,
                        }}
                      >
                        {b.status || 'PENDING'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.825rem', color: '#64748B', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>👤 {tenantName}</span>
                      <span>•</span>
                      <span>🏠 {roomName} ({beds} {locale === 'ar' ? 'سرير' : 'beds'})</span>
                      {tenantPhone && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://wa.me/${tenantPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#16A34A', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            💬 {tenantPhone}
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: locale === 'ar' ? 'left' : 'right', borderInlineStart: '2px solid #F1F5F9', paddingInlineStart: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {locale === 'ar' ? 'فترة الإقامة' : 'Stay Duration'}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A' }}>
                      {start ? new Date(start).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                      <span style={{ color: '#94A3B8', margin: '0 0.35rem' }}>→</span>
                      {end ? new Date(end).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
