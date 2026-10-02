import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';
import type {
  OwnerPropertyItem,
  OwnerPropertyBookingItem,
} from '../../services/ownerService';
import { useOwnerBookingsStatus, useOwnerMyProperties } from '../../hooks/useDashboardQueries';
import { useQueryClient, STALE_TIMES } from '../../lib/queryClient';
import Pagination from '../../components/common/Pagination';
import BookingDetailsModal from '../../components/common/BookingDetailsModal';

export default function OwnerBookingsPage() {
  const { locale } = useLocale();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/owner-dashboard-preview')
    ? '/owner-dashboard-preview'
    : '/owner-dashboard';
  const queryClient = useQueryClient();

  // Booking status breakdown (Cached: 30s)
  const {
    isLoading: loadingStatus,
    error: statusErrorObj,
    refetch: fetchStatus,
  } = useOwnerBookingsStatus();
  const statusError = statusErrorObj
    ? (statusErrorObj as any)?.message ||
      (locale === 'ar'
        ? 'تعذر تحميل إحصائيات الحجوزات من الخادم.'
        : 'Could not load bookings status from the server.')
    : null;

  // Properties to select from (Cached: 5m, Semi-static)
  const { data: rawProperties } = useOwnerMyProperties();
  const properties: OwnerPropertyItem[] = Array.isArray(rawProperties) ? rawProperties : [];
  const [selectedPropId, setSelectedPropId] = useState<string>('ALL');

  // Active status filter tab
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  // Property bookings list
  const [propertyBookings, setPropertyBookings] = useState<OwnerPropertyBookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any | null>(null);

  const loadBookingsForProperty = useCallback(
    async (propId: string, currentProps: OwnerPropertyItem[]) => {
      const cacheKey =
        propId === 'ALL' || !propId
          ? ['owner', 'all-properties-bookings']
          : ['owner', 'properties', propId, 'bookings'];

      const cached = queryClient.getQueryData<any[]>(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setPropertyBookings(cached);
      } else {
        setLoadingBookings(true);
      }
      setBookingsError(null);
      try {
        if (propId === 'ALL' || !propId) {
          if (!currentProps || currentProps.length === 0) {
            setPropertyBookings([]);
            return;
          }
          const aggregated = await queryClient.fetchQuery({
            queryKey: ['owner', 'all-properties-bookings'],
            queryFn: async () => {
              const settled = await Promise.allSettled(
                currentProps.map(async (p) => {
                  const res = await queryClient.fetchQuery({
                    queryKey: ['owner', 'properties', p.id, 'bookings'],
                    queryFn: () => OwnerService.getPropertyBookings(p.id),
                    staleTime: STALE_TIMES.LISTS,
                  });
                  return (Array.isArray(res) ? res : []).map((b: any) => ({
                    ...b,
                    property: b.property || p,
                  }));
                })
              );
              const items: any[] = [];
              for (const item of settled) {
                if (item.status === 'fulfilled' && Array.isArray(item.value)) {
                  items.push(...item.value);
                }
              }
              items.sort(
                (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
              );
              return items;
            },
            staleTime: STALE_TIMES.LISTS,
          });
          setPropertyBookings(Array.isArray(aggregated) ? aggregated : []);
        } else {
          const data = await queryClient.fetchQuery({
            queryKey: ['owner', 'properties', propId, 'bookings'],
            queryFn: () => OwnerService.getPropertyBookings(propId),
            staleTime: STALE_TIMES.LISTS,
          });
          const curProp = currentProps.find((p) => p.id === propId);
          const enriched = (Array.isArray(data) ? data : []).map((b: any) => ({
            ...b,
            property: b.property || curProp,
          }));
          enriched.sort(
            (a: any, b: any) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          setPropertyBookings(enriched);
        }
      } catch (err: any) {
        console.error(`[OwnerBookingsPage] fetch bookings failed:`, err);
        setBookingsError(
          err?.message ||
            (locale === 'ar'
              ? 'تعذر تحميل طلبات الحجز لهذا العقار.'
              : 'Could not load bookings for this property.')
        );
      } finally {
        setLoadingBookings(false);
      }
    },
    [locale, queryClient]
  );

  const reloadAll = useCallback(async () => {
    fetchStatus();
    if (properties.length > 0) {
      await loadBookingsForProperty(selectedPropId, properties);
    }
  }, [fetchStatus, loadBookingsForProperty, selectedPropId, properties]);

  useEffect(() => {
    if (properties.length > 0) {
      loadBookingsForProperty(selectedPropId, properties);
    }
  }, [loadBookingsForProperty, selectedPropId, properties]);



  // Filter bookings based on selected status tab and search term
  const filteredBookings = useMemo(() => {
    return propertyBookings.filter((b: any) => {
      // 1. Status Filter
      if (selectedStatusTab !== 'ALL') {
        const bStatus = (b.status || '').toUpperCase();
        if (selectedStatusTab === 'PENDING' && bStatus !== 'PENDING') return false;
        if (selectedStatusTab === 'CONTACTED' && bStatus !== 'CONTACTED') return false;
        if (selectedStatusTab === 'CONFIRMED' && bStatus !== 'CONFIRMED') return false;
        if (selectedStatusTab === 'CLOSED' && bStatus !== 'CLOSED') return false;
        if (selectedStatusTab === 'CANCELLED' && bStatus !== 'CANCELLED') return false;
      }

      // 2. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const studentName = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''} ${b.tenant?.name || ''}`.toLowerCase();
        const studentPhone = `${b.tenant?.phone || ''} ${b.tenant?.whatsappPhone || ''}`;
        const propTitle = (b.property?.title || '').toLowerCase();
        const roomType = (b.room?.roomType || '').toLowerCase();

        return (
          studentName.includes(term) ||
          studentPhone.includes(term) ||
          propTitle.includes(term) ||
          roomType.includes(term)
        );
      }

      return true;
    });
  }, [propertyBookings, selectedStatusTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / limit));
  const paginatedBookings = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredBookings.slice(startIndex, startIndex + limit);
  }, [filteredBookings, page, limit]);

  // Status counts from current bookings
  const statusCounts = useMemo(() => {
    const counts = { ALL: propertyBookings.length, PENDING: 0, CONTACTED: 0, CONFIRMED: 0, CLOSED: 0, CANCELLED: 0 };
    for (const b of propertyBookings) {
      const s = (b.status || '').toUpperCase();
      if (s === 'PENDING') counts.PENDING++;
      else if (s === 'CONTACTED') counts.CONTACTED++;
      else if (s === 'CONFIRMED') counts.CONFIRMED++;
      else if (s === 'CLOSED') counts.CLOSED++;
      else if (s === 'CANCELLED') counts.CANCELLED++;
    }
    return counts;
  }, [propertyBookings]);

  function getStatusBadge(status?: string) {
    const s = (status || '').toUpperCase();
    if (s === 'CLOSED') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #86EFAC',
          }}
        >
          {locale === 'ar' ? '🏁 تم الانتهاء (تم تحصيل المبلغ)' : '🏁 Closed (Revenue Collected)'}
        </span>
      );
    }
    if (s === 'CONFIRMED') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#E0E7FF',
            color: '#3730A3',
            border: '1px solid #C7D2FE',
          }}
        >
          {locale === 'ar' ? '✓ مؤكد ومعتمد (المبلغ معلق)' : '✓ Confirmed (Pending Revenue)'}
        </span>
      );
    }
    if (s === 'CONTACTED') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#E0F2FE',
            color: '#0369A1',
            border: '1px solid #BAE6FD',
          }}
        >
          {locale === 'ar' ? '📞 تم التواصل' : 'Contacted'}
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#FEF9C3',
            color: '#A16207',
            border: '1px solid #FEF08A',
          }}
        >
          {locale === 'ar' ? '⏳ قيد الانتظار' : 'Pending'}
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
          }}
        >
          {locale === 'ar' ? '✕ ملغي' : 'Cancelled'}
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: '#F1F5F9',
          color: '#475569',
        }}
      >
        {status || '—'}
      </span>
    );
  }

  return (
    <div>
      {/* Tabs navigation banner to switch effortlessly between incoming & personal bookings */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: '#F1F5F9',
          padding: '0.4rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          width: 'fit-content',
        }}
      >
        <Link
          to={`${basePath}/bookings`}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '9px',
            backgroundColor: '#0B2A4A',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 6px rgba(11, 42, 74, 0.2)',
          }}
        >
          <span>📥</span>
          <span>{locale === 'ar' ? 'طلبات الحجز الواردة على عقاراتي' : 'Incoming Requests on My Properties'}</span>
        </Link>

        <Link
          to={`${basePath}/my-rentals`}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '9px',
            backgroundColor: 'transparent',
            color: '#64748B',
            fontWeight: 700,
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>🧳</span>
          <span>{locale === 'ar' ? 'حجوزاتي الشخصية كنزيل' : 'My Personal Bookings'}</span>
        </Link>

        <Link
          to={`${basePath}/explore`}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '9px',
            backgroundColor: 'transparent',
            color: '#2F6BFF',
            fontWeight: 700,
            fontSize: '0.875rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>🧭</span>
          <span>{locale === 'ar' ? 'تصفح وحجز سكن' : 'Explore Properties'}</span>
        </Link>
      </div>

      <div className="dary-section-card" style={{ marginBottom: '1.5rem' }}>
        <div
          className="dary-section-header"
          style={{
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? '📋 طلبات الحجز الواردة على عقاراتي' : '📋 Incoming Booking Requests'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'متابعة كافة طلبات الحجز الواردة على سكنك الطلابي؛ تتولى إدارة منصة داري التواصل مع الطلاب واعتماد الحجوزات نيابةً عنك.'
                : 'Track booking requests on your properties. Dary Administration verifies, communicates with students, and confirms bookings on your behalf.'}
            </p>
          </div>

          <button
            type="button"
            onClick={reloadAll}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0B2A4A',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            🔄 {locale === 'ar' ? 'تحديث الطلبات' : 'Refresh'}
          </button>
        </div>

        {/* Centralized Management Notice */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1E40AF',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <div>
            <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1D4ED8' }}>
              {locale === 'ar' ? 'نظام الحجوزات المركزي لحماية الملاك والطلاب:' : 'Centralized Booking Protection:'}
            </strong>
            {locale === 'ar'
              ? 'تتم إدارة كافة طلبات الحجز، التواصل مع المستأجرين، وتأكيد أو إلغاء الحجوزات حصرياً بواسطة إدارة منصة داري لضمان مصداقية المستأجرين وسداد المستحقات. يمكنك هنا متابعة تفاصيل الطلبات وحالاتها المسجلة دون أي أعباء إدارية.'
              : 'All booking requests, student vetting, confirmations, and cancellations are handled centrally by Dary Administration. You can track booking status and details without administrative overhead.'}
          </div>
        </div>



        {/* 1. Status Overview Metric Badges */}
        {loadingStatus ? (
          <div style={{ padding: '1rem 0', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
            {locale === 'ar' ? 'جاري تحميل ملخص الحجوزات...' : 'Loading status overview...'}
          </div>
        ) : statusError ? (
          <div className="dary-error-state" style={{ marginBottom: '1.5rem' }}>
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب حالة الحجوزات' : 'API Error'}</p>
            <p className="dary-error-desc">{statusError}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchStatus}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1D4ED8', marginBottom: '0.2rem' }}>
                {statusCounts.ALL}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF' }}>
                {locale === 'ar' ? 'إجمالي الطلبات' : 'Total Bookings'}
              </span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#FEF9C3',
                border: '1px solid #FEF08A',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#A16207', marginBottom: '0.2rem' }}>
                {statusCounts.PENDING}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#854D0E' }}>
                {locale === 'ar' ? '⏳ قيد المراجعة' : 'Pending'}
              </span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#E0F2FE',
                border: '1px solid #BAE6FD',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0369A1', marginBottom: '0.2rem' }}>
                {statusCounts.CONTACTED}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#075985' }}>
                {locale === 'ar' ? '📞 تم التواصل' : 'Contacted'}
              </span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#E0E7FF',
                border: '1px solid #C7D2FE',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3730A3', marginBottom: '0.2rem' }}>
                {statusCounts.CONFIRMED}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#312E81' }}>
                {locale === 'ar' ? '✓ مؤكد (مبلغ معلق)' : 'Confirmed (Pending)'}
              </span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803D', marginBottom: '0.2rem' }}>
                {statusCounts.CLOSED}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                {locale === 'ar' ? '🏁 مكتمل نهائياً' : 'Closed (Completed)'}
              </span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#B91C1C', marginBottom: '0.2rem' }}>
                {statusCounts.CANCELLED}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991B1B' }}>
                {locale === 'ar' ? '✕ ملغي' : 'Cancelled'}
              </span>
            </div>
          </div>
        )}

        {/* 2. Controls Bar: Property Filter & Search & Status Tabs */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Row 1: Property Dropdown + Search Box */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Property Selector */}
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                🏢 {locale === 'ar' ? 'تصفية حسب العقار:' : 'Filter by Property:'}
              </label>
              <select
                value={selectedPropId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedPropId(newId);
                  setPage(1);
                  loadBookingsForProperty(newId, properties);
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#0B2A4A',
                  outline: 'none',
                }}
              >
                <option value="ALL">
                  {locale === 'ar' ? '🏢 جميع العقارات (كافة الحجوزات)' : '🏢 All Properties (All Bookings)'}
                </option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.city ? `(${p.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                🔍 {locale === 'ar' ? 'بحث في الطلبات:' : 'Search Bookings:'}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder={locale === 'ar' ? 'اسم الطالب، الهاتف، الغرفة...' : 'Student name, phone, room...'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.875rem',
                  color: '#0B2A4A',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Row 2: Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #E2E8F0', paddingTop: '0.85rem' }}>
            {[
              { id: 'ALL', labelAr: 'الكل', labelEn: 'All', count: statusCounts.ALL },
              { id: 'PENDING', labelAr: '⏳ قيد الانتظار', labelEn: '⏳ Pending', count: statusCounts.PENDING },
              { id: 'CONTACTED', labelAr: '📞 تم التواصل', labelEn: '📞 Contacted', count: statusCounts.CONTACTED },
              { id: 'CONFIRMED', labelAr: '✓ مؤكد - مبلغ معلق', labelEn: '✓ Confirmed (Pending)', count: statusCounts.CONFIRMED },
              { id: 'CLOSED', labelAr: '🏁 مكتمل نهائياً', labelEn: '🏁 Closed (Completed)', count: statusCounts.CLOSED },
              { id: 'CANCELLED', labelAr: '✕ ملغي', labelEn: '✕ Cancelled', count: statusCounts.CANCELLED },
            ].map((tab) => {
              const isActive = selectedStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedStatusTab(tab.id);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isActive ? '#0B2A4A' : '#CBD5E1',
                    backgroundColor: isActive ? '#0B2A4A' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{locale === 'ar' ? tab.labelAr : tab.labelEn}</span>
                  <span
                    style={{
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#475569',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Bookings List Cards */}
        {loadingBookings ? (
          <div style={{ padding: '3.5rem 0', textAlign: 'center', color: '#64748B' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0B2A4A',
                borderRadius: '50%',
                margin: '0 auto 1rem',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
              {locale === 'ar' ? 'جاري تحميل وتحديث طلبات الحجز...' : 'Loading bookings...'}
            </p>
          </div>
        ) : bookingsError ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب الحجوزات' : 'API Error'}</p>
            <p className="dary-error-desc">{bookingsError}</p>
            <button
              type="button"
              className="dary-retry-btn"
              onClick={() => loadBookingsForProperty(selectedPropId, properties)}
            >
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div
            style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '14px',
              border: '1px dashed #CBD5E1',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📑</div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0B2A4A', margin: '0 0 0.4rem' }}>
              {locale === 'ar' ? 'لا توجد طلبات حجز مطابقة حالياً' : 'No matching booking requests'}
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: '460px', margin: '0 auto' }}>
              {locale === 'ar'
                ? 'ستظهر هنا طلبات الحجز فور قيام الطلاب بتقديم طلب حجز على أي من عقاراتك المسجلة.'
                : 'Booking requests will appear here when students book any of your properties.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {paginatedBookings.map((b: any) => {
              const tenantName = b.tenant?.firstName
                ? `${b.tenant.firstName} ${b.tenant.lastName || ''}`.trim()
                : b.tenant?.name || (locale === 'ar' ? 'طالب مستأجر' : 'Student Tenant');
              const propertyTitle = b.property?.title || (locale === 'ar' ? 'سكن جامعي' : 'Student Housing');
              const propertyLocation = b.property?.city || b.property?.address || '';
              const roomType = b.room?.roomType ? `غرفة ${b.room.roomType}` : null;
              const beds = b.bedsRequested || 1;
              const currentStatus = (b.status || '').toUpperCase();

              return (
                <div
                  key={b.id}
                  style={{
                    border: currentStatus === 'CLOSED'
                      ? '1.5px solid #86EFAC'
                      : currentStatus === 'CONFIRMED'
                      ? '1.5px solid #C7D2FE'
                      : currentStatus === 'PENDING'
                      ? '1.5px solid #FCD34D'
                      : '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    backgroundColor: currentStatus === 'CLOSED'
                      ? '#F8FCF9'
                      : currentStatus === 'CONFIRMED'
                      ? '#F8FAFF'
                      : currentStatus === 'PENDING'
                      ? '#FFFDF5'
                      : '#FFFFFF',
                    boxShadow: currentStatus === 'CLOSED'
                      ? '0 4px 14px rgba(22, 163, 74, 0.08)'
                      : currentStatus === 'CONFIRMED'
                      ? '0 4px 14px rgba(55, 48, 163, 0.06)'
                      : currentStatus === 'PENDING'
                      ? '0 4px 12px rgba(245, 158, 11, 0.08)'
                      : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  {/* Automated Dary Team Communication Status Banner */}
                  {currentStatus === 'CLOSED' && (
                    <div
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: '12px',
                        backgroundColor: '#F0FDF4',
                        border: '1.5px solid #86EFAC',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '1.6rem' }}>🏁</span>
                        <div>
                          <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                            {locale === 'ar' ? 'تم إتمام الحجز نهائياً وتفعيل العقد وتحصيل المبلغ!' : 'Booking Completed & Revenue Collected!'}
                          </div>
                          <div style={{ fontSize: '0.835rem', color: '#15803D', lineHeight: 1.5 }}>
                            {locale === 'ar'
                              ? 'تم إتمام التعاقد النهائي وتسكين الطالب وإضافة المبلغ إلى إيراداتك المحصلة النهائية.'
                              : 'The booking contract is finalized and the amount has been added to your total collected revenue.'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          border: '1px solid #BBF7D0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        ✓ {locale === 'ar' ? 'تم تحصيل المبلغ' : 'Revenue Collected'}
                      </span>
                    </div>
                  )}

                  {currentStatus === 'CONFIRMED' && (
                    <div
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: '12px',
                        backgroundColor: '#EEF2FF',
                        border: '1.5px solid #C7D2FE',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '1.6rem' }}>✓</span>
                        <div>
                          <div style={{ fontWeight: 800, color: '#3730A3', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                            {locale === 'ar' ? 'تم تأكيد واعتماد الحجز (المبلغ معلق لحين التعاقد النهائي)' : 'Booking Confirmed (Pending Revenue)'}
                          </div>
                          <div style={{ fontSize: '0.835rem', color: '#4338CA', lineHeight: 1.5 }}>
                            {locale === 'ar'
                              ? 'اعتمدت إدارة داري الحجز، والمبلغ حالياً ضمن الإيرادات المعلقة وسيسمّع في إيراداتك النهائية فور إتمام التعاقد النهائي (CLOSED).'
                              : 'Dary Admin confirmed this booking. Revenue is pending and will be added to final revenue once closed.'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          border: '1px solid #FDE68A',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        ⏳ {locale === 'ar' ? 'المبلغ معلق' : 'Pending Revenue'}
                      </span>
                    </div>
                  )}

                  {currentStatus === 'CONTACTED' && (
                    <div
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: '12px',
                        backgroundColor: '#EFF6FF',
                        border: '1.5px solid #93C5FD',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📞</span>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1E40AF', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                            {locale === 'ar' ? 'عقارك تلقى طلباً — جاري التنسيق بواسطة فريق داري' : 'Booking in progress by Dary Team'}
                          </div>
                          <div style={{ fontSize: '0.835rem', color: '#1D4ED8', lineHeight: 1.5 }}>
                            {locale === 'ar'
                              ? 'يتواصل فريق داري حالياً مع المستأجر لترتيب كافة المواعيد والتفاصيل، وسيتواصل معك تيم داري فور الانتهاء.'
                              : 'Dary team is coordinating with the student and will contact you once finalized.'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#DBEAFE',
                          color: '#1E40AF',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        🔄 {locale === 'ar' ? 'جاري التنسيق مع الطالب' : 'Coordinating with student'}
                      </span>
                    </div>
                  )}

                  {currentStatus === 'PENDING' && (
                    <div
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: '12px',
                        backgroundColor: '#FFFBEB',
                        border: '1.5px solid #FDE68A',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 300px' }}>
                        <span style={{ fontSize: '1.5rem' }}>⏳</span>
                        <div>
                          <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                            {locale === 'ar' ? 'طلب حجز جديد على عقارك — قيد مراجعة السوبر أدمن' : 'New Booking Request under Review'}
                          </div>
                          <div style={{ fontSize: '0.835rem', color: '#B45309', lineHeight: 1.5 }}>
                            {locale === 'ar'
                              ? 'تم تسجيل طلب حجز جديد على هذا العقار. يراجع المشرف العام الطلب وسيتواصل فريق داري معك لتأكيد الحجز.'
                              : 'A new booking request has been submitted. Admin is reviewing it and Dary team will reach out.'}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          border: '1px solid #FDE68A',
                        }}
                      >
                        ⏳ {locale === 'ar' ? 'بانتظار مراجعة الإدارة' : 'Pending Admin Review'}
                      </span>
                    </div>
                  )}

                  {currentStatus === 'CANCELLED' && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>✕</span>
                      <div style={{ fontSize: '0.835rem', color: '#991B1B', fontWeight: 600 }}>
                        {locale === 'ar'
                          ? 'تم إلغاء هذا الطلب بواسطة إدارة داري، وتظل الغرفة متاحة لاستقبال طلبات حجز جديدة.'
                          : 'This booking was cancelled by Dary admin. The room is available for other requests.'}
                      </div>
                    </div>
                  )}

                  {/* Top Row: Tenant & Accommodation Overview */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      marginBottom: '1rem',
                      paddingBottom: '0.85rem',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <div style={{ flex: '1 1 320px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0B2A4A', fontWeight: 800 }}>
                          👤 {tenantName}
                        </h3>
                        {getStatusBadge(b.status)}
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.45rem' }}>
                        🏢 {propertyTitle} {propertyLocation ? `• ${propertyLocation}` : ''}
                      </div>

                      <div
                        style={{
                          fontSize: '0.825rem',
                          color: '#64748B',
                          display: 'flex',
                          gap: '0.65rem',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        {roomType && <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>🏠 {roomType}</span>}
                        <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>🛏️ {beds} {locale === 'ar' ? 'أسرة مطلوبة' : 'beds'}</span>
                        {b.createdAt && (
                          <span>📅 {locale === 'ar' ? 'تاريخ التقديم:' : 'Applied:'} {new Date(b.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}</span>
                        )}
                      </div>
                    </div>

                    {/* Stay Duration & Price */}
                    <div style={{ textAlign: locale === 'ar' ? 'left' : 'right', minWidth: '160px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                        {locale === 'ar' ? 'فترة الإقامة المقترحة' : 'Stay Duration'}
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: '#0B2A4A', display: 'block', marginBottom: '0.25rem' }}>
                        {b.startDate ? new Date(b.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                        <span style={{ color: '#94A3B8', margin: '0 0.35rem' }}>→</span>
                        {b.endDate ? new Date(b.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                      </strong>

                      {b.totalPrice !== undefined && (
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16A34A' }}>
                          {Number(b.totalPrice).toLocaleString()} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Status Transition Actions & Communication */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.85rem',
                    }}
                  >
                    {/* Admin Supervision Status Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                        🛡️ {locale === 'ar' ? 'إشراف إدارة داري:' : 'Dary Admin Supervision:'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#0B2A4A',
                          backgroundColor: '#F8FAFC',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        {currentStatus === 'PENDING' && (locale === 'ar' ? '⏳ قيد المراجعة والتحقق من الإدارة' : 'Pending Admin Verification')}
                        {currentStatus === 'CONTACTED' && (locale === 'ar' ? '📞 جارٍ التواصل والترتيب مع الطالب' : 'Admin Contacting Student')}
                        {currentStatus === 'CONFIRMED' && (locale === 'ar' ? '✓ مؤكد ومعتمد (المبلغ معلق)' : 'Confirmed (Pending Revenue)')}
                        {currentStatus === 'CLOSED' && (locale === 'ar' ? '🏁 تم الانتهاء والتعاقد (تم تحصيل المبلغ)' : 'Closed (Revenue Collected)')}
                        {currentStatus === 'CANCELLED' && (locale === 'ar' ? '✕ تم إلغاء الطلب من قِبل الإدارة' : 'Cancelled by Admin')}
                        {!['PENDING', 'CONTACTED', 'CLOSED', 'CONFIRMED', 'CANCELLED'].includes(currentStatus) && (locale === 'ar' ? 'تتم المتابعة بواسطة الإدارة' : 'Managed by Admin')}
                      </span>
                    </div>

                    {/* View Booking Details Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForDetails(b)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #2F6BFF',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      📋 {locale === 'ar' ? 'عرض تفاصيل الحجز' : 'View Booking Details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reusable Modern Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={filteredBookings.length}
            limit={limit}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            limitOptions={[10, 20, 50]}
            style={{ marginTop: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}
          />
        </>
      )}
      </div>

      {/* Booking Details Modal */}
      {selectedBookingForDetails && (
        <BookingDetailsModal
          bookingId={selectedBookingForDetails.id}
          initialData={selectedBookingForDetails}
          role="owner"
          onClose={() => setSelectedBookingForDetails(null)}
          onUpdated={reloadAll}
        />
      )}
    </div>
  );
}
