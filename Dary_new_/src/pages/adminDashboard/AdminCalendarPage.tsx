import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminCalendarBookingEvent } from '../../services/adminService';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import Pagination from '../../components/common/Pagination';

export default function AdminCalendarPage() {
  const { locale } = useLocale();

  const [events, setEvents] = useState<AdminCalendarBookingEvent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state (Offset & Cursor compatible)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const nextMonthDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextMonthDate);

  // Debounce search input to avoid overwhelming the server
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Calendar Data with full pagination, filtering, and sorting
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [calRes, sumRes] = await Promise.allSettled([
        AdminService.getBookingCalendar({
          page,
          limit,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
          sort: sortBy,
          order: sortOrder,
        }),
        AdminService.getCalendarSummary(),
      ]);

      if (calRes.status === 'fulfilled') {
        const raw = calRes.value;
        const list = Array.isArray(raw?.data?.bookings)
          ? raw.data.bookings
          : Array.isArray(raw?.bookings)
          ? raw.bookings
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.events)
          ? raw.events
          : Array.isArray(raw)
          ? raw
          : [];
        setEvents(list);

        const total =
          raw?.meta?.total ??
          raw?.totalCount ??
          raw?.data?.totalCount ??
          raw?.data?.meta?.total ??
          raw?.total ??
          list.length;
        setTotalCount(typeof total === 'number' ? total : list.length);

        const pages =
          raw?.meta?.totalPages ??
          raw?.totalPages ??
          raw?.data?.totalPages ??
          raw?.data?.meta?.totalPages ??
          Math.max(1, Math.ceil((total || list.length) / limit));
        setTotalPages(Math.max(1, pages));

        const next =
          raw?.meta?.hasNextPage ??
          raw?.hasNextPage ??
          raw?.data?.hasNextPage ??
          page < pages;
        setHasNextPage(Boolean(next));

        const prev =
          raw?.meta?.hasPrevPage ??
          raw?.hasPrevPage ??
          raw?.data?.hasPrevPage ??
          page > 1;
        setHasPrevPage(Boolean(prev));
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
  }, [page, limit, startDate, endDate, statusFilter, debouncedSearch, sortBy, sortOrder, locale]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Quick Date Preset Handler
  const applyDatePreset = (preset: '30days' | 'thisMonth' | 'nextMonth' | 'quarter' | 'all') => {
    const now = new Date();
    setPage(1);

    if (preset === '30days') {
      setStartDate(today);
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'nextMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'quarter') {
      setStartDate(today);
      setEndDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

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
              ? 'متابعة مواعيد وصول الطلاب ومغادرتهم، نسب الإشغال، وحالة تسكين الغرف والأسرة على كافة عقارات المنصة مع الترقيم والبحث الفوري.'
              : 'Track student check-ins, check-outs, occupancy timelines, and bed reservations with server-side pagination and filters.'}
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
            <h3 className="dary-metric-number">
              <AnimatedCounter value={summary?.totalBookings ?? totalCount} loading={loading && !totalCount} />
            </h3>
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
              <AnimatedCounter
                value={summary?.activeBookings ?? events.filter((e: any) => e.status === 'CONTACTED' || e.status === 'CLOSED' || e.status === 'CONFIRMED').length}
                loading={loading && !summary}
              />
            </h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'حجوزات سارية / مؤكدة' : 'Active Occupancies'}</p>
          </div>
        </div>

        {/* Upcoming Check-ins */}
        <div className="dary-metric-card" style={{ border: '1px solid #FEF3C7', borderRadius: '12px', backgroundColor: '#FFFBEB' }}>
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            ⏳
          </div>
          <div>
            <h3 className="dary-metric-number" style={{ color: '#B45309' }}>
              <AnimatedCounter
                value={summary?.upcomingBookings ?? events.filter((e: any) => e.status === 'PENDING').length}
                loading={loading && !summary}
              />
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
              <AnimatedCounter
                value={summary?.occupancyRate !== undefined ? summary.occupancyRate : 66}
                loading={loading && !summary}
                suffix="%"
              />
            </h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'معدل الإشغال الإجمالي' : 'Occupancy Rate'}</p>
          </div>
        </div>
      </div>

      {/* 3. Filter, Search and Sorting Toolbar */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        {/* Row 1: Search Box + Date Pickers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {/* Smart Search Box */}
          <div style={{ flex: '1 1 280px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
              {locale === 'ar' ? '🔍 بحث ذكي (العقار، العميل، الهاتف، العنوان):' : '🔍 Smart Search (Property, Tenant, Phone, City):'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ar' ? 'ابحث باسم المستأجر، رقم الهاتف، أو اسم العقار...' : 'Search tenant, phone, property...'}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: locale === 'ar' ? '0.75rem' : 'auto',
                    right: locale === 'ar' ? 'auto' : '0.75rem',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    border: 'none',
                    background: 'none',
                  }}
                  title={locale === 'ar' ? 'مسح البحث' : 'Clear search'}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Date Pickers */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                {locale === 'ar' ? 'من تاريخ:' : 'From:'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
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
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
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
              onClick={() => {
                setPage(1);
                fetchCalendarData();
              }}
              className="dary-primary-btn"
              style={{
                padding: '0.6rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                height: '38px',
              }}
            >
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Row 2: Date Presets & Sorting Options */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '1rem',
            paddingTop: '0.85rem',
            borderTop: '1px dashed #E2E8F0',
          }}
        >
          {/* Quick Date Range Presets */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
              {locale === 'ar' ? 'نطاقات سريعة:' : 'Quick Presets:'}
            </span>
            {[
              { id: '30days', labelAr: '30 يوم القادمة', labelEn: 'Next 30 Days' },
              { id: 'thisMonth', labelAr: 'الشهر الحالي', labelEn: 'This Month' },
              { id: 'nextMonth', labelAr: 'الشهر القادم', labelEn: 'Next Month' },
              { id: 'quarter', labelAr: '3 أشهر', labelEn: 'Quarter' },
              { id: 'all', labelAr: 'كافة التواريخ', labelEn: 'All Time' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id as any)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {locale === 'ar' ? p.labelAr : p.labelEn}
              </button>
            ))}
          </div>

          {/* Sorting Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700 }}>
              {locale === 'ar' ? 'الترتيب حسب:' : 'Sort by:'}
            </span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0B2A4A',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="startDate">{locale === 'ar' ? 'تاريخ الوصول (البداية)' : 'Start Date'}</option>
              <option value="endDate">{locale === 'ar' ? 'تاريخ المغادرة (النهاية)' : 'End Date'}</option>
              <option value="createdAt">{locale === 'ar' ? 'تاريخ تقديم الحجز' : 'Date Created'}</option>
              <option value="totalPrice">{locale === 'ar' ? 'السعر الإجمالي' : 'Total Price'}</option>
              <option value="status">{locale === 'ar' ? 'حالة الحجز' : 'Status'}</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                setPage(1);
              }}
              title={locale === 'ar' ? `الترتيب: ${sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}` : `Order: ${sortOrder.toUpperCase()}`}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#0B2A4A',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              <span>{sortOrder === 'asc' ? (locale === 'ar' ? 'تصاعدي' : 'ASC') : (locale === 'ar' ? 'تنازلي' : 'DESC')}</span>
            </button>
          </div>
        </div>

        {/* Row 3: Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9' }}>
          {[
            { id: '', labelAr: 'الكل', labelEn: 'All' },
            { id: 'PENDING', labelAr: '⏳ قيد الانتظار (PENDING)', labelEn: '⏳ Pending' },
            { id: 'CONTACTED', labelAr: '📞 تم التواصل (CONTACTED)', labelEn: '📞 Contacted' },
            { id: 'CONFIRMED', labelAr: '✓ مؤكد - مبلغ معلق (CONFIRMED)', labelEn: '✓ Confirmed (Pending)' },
            { id: 'CLOSED', labelAr: '🏁 مكتمل نهائياً (CLOSED)', labelEn: '🏁 Closed (Completed)' },
            { id: 'CANCELLED', labelAr: '✕ ملغي (CANCELLED)', labelEn: '✕ Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
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

      {/* 4. Bookings List / Cards */}
      <div className="dary-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? 'سجل مواعيد وتسكين الطلاب' : 'Occupancy Schedule'}
            </h2>
            {loading && (
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid #CBD5E1',
                  borderTopColor: '#2F6BFF',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            )}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
            {locale === 'ar'
              ? `إجمالي السجلات: ${totalCount} حجز`
              : `Total records: ${totalCount} bookings`}
          </span>
        </div>

        {loading && events.length === 0 ? (
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
          <div className="dary-error-alert" style={{ margin: '1.5rem' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchCalendarData} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : events.length === 0 ? (
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
          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {events.map((evt: any, idx) => {
              const propId = evt.propertyId || evt.property?.id;
              const propTitle = evt.propertyTitle || evt.property?.title || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');
              const city = evt.property?.city || evt.city || '';
              const tenantName =
                evt.tenantName ||
                (evt.tenant?.firstName
                  ? `${evt.tenant.firstName} ${evt.tenant.lastName || ''}`.trim()
                  : evt.tenant?.email || '—');
              const tenantPhone = evt.tenant?.whatsappPhone || evt.tenant?.phone;
              const roomType = evt.room?.roomType || evt.roomType || (locale === 'ar' ? 'غرفة مجهزة' : 'Equipped Room');
              const beds = evt.bedsRequested || 1;
              const duration = calculateDuration(evt.startDate, evt.endDate);

              const evtStatus = (evt.status || '').toUpperCase();
              const isContacted = evtStatus === 'CONTACTED';
              const isConfirmed = evtStatus === 'CONFIRMED';
              const isClosed = evtStatus === 'CLOSED';
              const isCancelled = evtStatus === 'CANCELLED';

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
                          backgroundColor: isClosed ? '#DCFCE7' : isConfirmed ? '#E0E7FF' : isContacted ? '#E0F2FE' : isCancelled ? '#FEE2E2' : '#FEF9C3',
                          color: isClosed ? '#15803D' : isConfirmed ? '#3730A3' : isContacted ? '#0369A1' : isCancelled ? '#DC2626' : '#B45309',
                          border: `1px solid ${isClosed ? '#86EFAC' : isConfirmed ? '#C7D2FE' : isContacted ? '#BAE6FD' : isCancelled ? '#FECACA' : '#FDE68A'}`,
                        }}
                      >
                        {isClosed
                          ? locale === 'ar' ? '🏁 مكتمل نهائياً' : '🏁 Closed'
                          : isConfirmed
                          ? locale === 'ar' ? '✓ مؤكد (مبلغ معلق)' : '✓ Confirmed'
                          : isContacted
                          ? locale === 'ar' ? '📞 تم التواصل' : 'Contacted'
                          : isCancelled
                          ? locale === 'ar' ? '✕ ملغي' : 'Cancelled'
                          : locale === 'ar' ? '⏳ قيد الانتظار' : 'Pending'}
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

        {/* 5. Pagination Controls */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          limitOptions={[10, 20, 50]}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          loading={loading}
        />
      </div>
    </div>
  );
}
