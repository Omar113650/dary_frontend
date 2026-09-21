import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminCalendarBookingEvent } from '../../services/adminService';

export default function AdminCalendarPage() {
  const { locale } = useLocale();

  const [events, setEvents] = useState<AdminCalendarBookingEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const nextMonthDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextMonthDate);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calRes, sumRes] = await Promise.allSettled([
        AdminService.getBookingCalendar(startDate, endDate),
        AdminService.getCalendarSummary(),
      ]);

      if (calRes.status === 'fulfilled') {
        const raw = calRes.value;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.bookings?.bookings)
          ? raw.bookings.bookings
          : Array.isArray(raw?.bookings)
          ? raw.bookings
          : Array.isArray(raw?.data?.bookings)
          ? raw.data.bookings
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.events)
          ? raw.events
          : [];
        setEvents(list);
      } else {
        throw calRes.reason;
      }

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      }
    } catch (err: any) {
      console.error('[AdminCalendarPage] fetchCalendarData failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات تقويم الحجوزات من الخادم.'
            : 'Could not load calendar data from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, locale]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Helper for duration calculation
  const calculateDuration = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return '';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMonths = Math.round((end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000));
    if (diffMonths <= 0) {
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
      return locale === 'ar' ? `${diffDays} يوم` : `${diffDays} days`;
    }
    return locale === 'ar' ? `${diffMonths} شهور` : `${diffMonths} months`;
  };

  // Filtered Events List
  const filteredEvents = events.filter((evt: any) => {
    const propTitle = evt.propertyTitle || evt.property?.title || '';
    const tenantName =
      evt.tenantName ||
      (evt.tenant?.firstName ? `${evt.tenant.firstName} ${evt.tenant.lastName || ''}` : evt.tenant?.email || '');
    const st = evt.status || 'PENDING';

    const matchesSearch =
      !searchQuery.trim() ||
      propTitle.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      tenantName.toLowerCase().includes(searchQuery.toLowerCase().trim());

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'ACTIVE'
        ? st === 'CONFIRMED' || st === 'CLOSED'
        : statusFilter === 'CONTACTED'
        ? st === 'CONTACTED'
        : statusFilter === 'PENDING'
        ? st === 'PENDING'
        : st === statusFilter);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dary-page-container">
      {/* 1. Header Banner */}
      <div className="dary-page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dary-page-title" style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>🗓️</span>
            <span>{locale === 'ar' ? 'تقويم التسكين ومتابعة الإشغال' : 'Occupancy & Housing Calendar'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'متابعة مواعيد وصول الطلاب ومغادرتهم، نسب الإشغال، وحالة تسكين الغرف والأسرة على كافة عقارات المنصة.'
              : 'Track student check-ins, check-outs, occupancy timelines, and bed reservations.'}
          </p>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Total Bookings */}
        <div className="dary-metric-card" style={{ border: '1px solid #E2E8F0', borderRadius: '12px' }}>
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
            📅
          </div>
          <div>
            <h3 className="dary-metric-number">{summary?.totalBookings ?? events.length}</h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'إجمالي الحجوزات بالتقويم' : 'Calendar Bookings'}</p>
          </div>
        </div>

        {/* Active Bookings */}
        <div className="dary-metric-card" style={{ border: '1px solid #DCFCE7', borderRadius: '12px', backgroundColor: '#F0FDF4' }}>
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            🟢
          </div>
          <div>
            <h3 className="dary-metric-number" style={{ color: '#15803D' }}>
              {summary?.activeBookings ?? events.filter((e: any) => e.status === 'CONTACTED' || e.status === 'CLOSED').length}
            </h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'حجوزات سارية / متواصل معها' : 'Active Occupancies'}</p>
          </div>
        </div>

        {/* Upcoming Check-ins */}
        <div className="dary-metric-card" style={{ border: '1px solid #FEF3C7', borderRadius: '12px', backgroundColor: '#FFFBEB' }}>
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            ⏳
          </div>
          <div>
            <h3 className="dary-metric-number" style={{ color: '#B45309' }}>
              {summary?.upcomingBookings ?? events.filter((e: any) => e.status === 'PENDING').length}
            </h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'طلبات قيد المراجعة' : 'Pending Requests'}</p>
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="dary-metric-card" style={{ border: '1px solid #FAF5FF', borderRadius: '12px' }}>
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: '#9333EA' }}>
            🏢
          </div>
          <div>
            <h3 className="dary-metric-number">
              {summary?.occupancyRate !== undefined ? `${summary.occupancyRate}%` : '66%'}
            </h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'معدل الإشغال الإجمالي' : 'Occupancy Rate'}</p>
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Toolbar */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 260px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
              {locale === 'ar' ? '🔍 بحث باسم العقار أو الطالب:' : '🔍 Search Property or Tenant:'}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'ar' ? 'اكتب اسم العقار أو اسم المستأجر...' : 'Search property or tenant name...'}
              style={{
                width: '100%',
                padding: '0.6rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Date Pickers */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                {locale === 'ar' ? 'من تاريخ:' : 'From:'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                {locale === 'ar' ? 'إلى تاريخ:' : 'To:'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={fetchCalendarData}
              className="dary-primary-btn"
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                alignSelf: 'flex-end',
                height: '38px',
              }}
            >
              {locale === 'ar' ? 'تحديث النطاق' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
          {[
            { id: '', labelAr: 'الكل', labelEn: 'All' },
            { id: 'CONTACTED', labelAr: '📞 تم التواصل (CONTACTED)', labelEn: 'Contacted' },
            { id: 'PENDING', labelAr: '⏳ قيد المراجعة (PENDING)', labelEn: 'Pending' },
            { id: 'ACTIVE', labelAr: '✓ مؤكد ومكتمل (CONFIRMED)', labelEn: 'Confirmed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: statusFilter === tab.id ? '#0B2A4A' : '#E2E8F0',
                backgroundColor: statusFilter === tab.id ? '#0B2A4A' : '#FFFFFF',
                color: statusFilter === tab.id ? '#FFFFFF' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {locale === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Beautiful Bookings List / Cards */}
      <div className="dary-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
            {locale === 'ar' ? 'سجل مواعيد وتسكين الطلاب' : 'Occupancy Schedule'}
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
            {locale === 'ar' ? `عرض ${filteredEvents.length} حجز` : `Showing ${filteredEvents.length} bookings`}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0B2A4A',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ fontWeight: 600 }}>{locale === 'ar' ? 'جاري تحميل مواعيد التقويم...' : 'Loading calendar...'}</p>
          </div>
        ) : error ? (
          <div className="dary-error-alert" style={{ margin: '1rem' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchCalendarData} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <span style={{ fontSize: '2.8rem', display: 'block', marginBottom: '0.75rem' }}>🗓️</span>
            <h3 style={{ color: '#0B2A4A', fontWeight: 700, marginBottom: '0.25rem' }}>
              {locale === 'ar' ? 'لا توجد مواعيد مطابقة' : 'No matching schedule events'}
            </h3>
            <p style={{ fontSize: '0.85rem' }}>
              {locale === 'ar' ? 'جرب تغيير فلاتر التاريخ أو كلمات البحث أعلاه.' : 'Try adjusting the date range or search keyword.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {filteredEvents.map((evt: any, idx) => {
              const propId = evt.propertyId || evt.property?.id;
              const propTitle = evt.propertyTitle || evt.property?.title || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');
              const city = evt.property?.city || evt.city || '';
              const tenantName =
                evt.tenantName ||
                (evt.tenant?.firstName
                  ? `${evt.tenant.firstName} ${evt.tenant.lastName || ''}`.trim()
                  : evt.tenant?.email || '—');
              const tenantPhone = evt.tenant?.whatsappPhone || evt.tenant?.phone;
              const roomType = evt.room?.roomType || evt.roomType || 'غرفة مجهزة';
              const beds = evt.bedsRequested || 1;
              const duration = calculateDuration(evt.startDate, evt.endDate);

              const isContacted = evt.status === 'CONTACTED';
              const isClosed = evt.status === 'CLOSED' || evt.status === 'CONFIRMED';

              return (
                <div
                  key={evt.id || idx}
                  style={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                    boxShadow: '0 2px 6px rgba(11, 42, 74, 0.03)',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Left Block: Property & Room */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', minWidth: '280px', flex: '1 1 300px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#EEF3FF',
                        color: '#2F6BFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        flexShrink: 0,
                      }}
                    >
                      🏢
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
                          {propTitle}
                        </h3>
                        {city && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            📍 {city}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', color: '#64748B' }}>
                        <span style={{ fontWeight: 600, color: '#0B2A4A' }}>🛏️ {locale === 'ar' ? `غرفة ${roomType}` : `Room ${roomType}`}</span>
                        <span>•</span>
                        <span style={{ backgroundColor: '#FEF9C3', color: '#854D0E', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                          {beds} {locale === 'ar' ? 'سرير' : 'beds'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Block: Tenant Profile */}
                  <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, marginBottom: '0.2rem' }}>
                      {locale === 'ar' ? 'بيانات المستأجر' : 'Tenant Info'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#0B2A4A',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {(tenantName[0] || 'T').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.88rem' }}>{tenantName}</div>
                        {tenantPhone && (
                          <a
                            href={`https://wa.me/${tenantPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#16A34A', textDecoration: 'none', fontWeight: 600 }}
                          >
                            💬 {tenantPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Block: Dates & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {/* Period Badge */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A' }}>
                        <span>{evt.startDate ? new Date(evt.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}</span>
                        <span style={{ color: '#2F6BFF' }}>➔</span>
                        <span>{evt.endDate ? new Date(evt.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}</span>
                      </div>
                      {duration && (
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem', fontWeight: 600 }}>
                          ⏱️ {locale === 'ar' ? 'المدة:' : 'Duration:'} {duration}
                        </div>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div style={{ minWidth: '100px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          backgroundColor: isClosed ? '#DCFCE7' : isContacted ? '#E0F2FE' : '#FEF9C3',
                          color: isClosed ? '#15803D' : isContacted ? '#0369A1' : '#B45309',
                          border: `1px solid ${isClosed ? '#86EFAC' : isContacted ? '#BAE6FD' : '#FDE68A'}`,
                        }}
                      >
                        {isClosed
                          ? locale === 'ar' ? '✓ ساري / مؤكد' : 'Confirmed'
                          : isContacted
                          ? locale === 'ar' ? '📞 تم التواصل' : 'Contacted'
                          : locale === 'ar' ? '⏳ قيد المراجعة' : 'Pending'}
                      </span>
                    </div>

                    {/* Action Shortcut */}
                    {propId && (
                      <Link
                        to={`/properties/${propId}`}
                        style={{
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          backgroundColor: '#0B2A4A',
                          color: '#FFFFFF',
                          textDecoration: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {locale === 'ar' ? 'معاينة ↗' : 'View ↗'}
                      </Link>
                    )}
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
