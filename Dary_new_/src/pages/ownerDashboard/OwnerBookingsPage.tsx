import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';
import type {
  OwnerPropertyItem,
  OwnerPropertyBookingItem,
} from '../../services/ownerService';

export default function OwnerBookingsPage() {
  const { locale } = useLocale();

  // Booking status breakdown
  const [bookingStatusData, setBookingStatusData] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Properties to select from
  const [properties, setProperties] = useState<OwnerPropertyItem[]>([]);
  const [selectedPropId, setSelectedPropId] = useState<string>('ALL');

  // Active status filter tab
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Property bookings list
  const [propertyBookings, setPropertyBookings] = useState<OwnerPropertyBookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // Action / Updating state
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Selected Booking Details Modal State
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [modalNote, setModalNote] = useState<string>('');

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await OwnerService.getBookingsStatus();
      setBookingStatusData(data);
    } catch (err: any) {
      console.error('[OwnerBookingsPage] Bookings status fetch failed:', err);
      setStatusError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل إحصائيات الحجوزات من الخادم.'
            : 'Could not load bookings status from the server.')
      );
    } finally {
      setLoadingStatus(false);
    }
  }, [locale]);

  const loadBookingsForProperty = useCallback(
    async (propId: string, currentProps: OwnerPropertyItem[]) => {
      setLoadingBookings(true);
      setBookingsError(null);
      try {
        if (propId === 'ALL' || !propId) {
          if (!currentProps || currentProps.length === 0) {
            setPropertyBookings([]);
            return;
          }
          // Fetch bookings for all owner properties in parallel
          const settled = await Promise.allSettled(
            currentProps.map(async (p) => {
              const res = await OwnerService.getPropertyBookings(p.id);
              return res.map((b: any) => ({
                ...b,
                property: b.property || p,
              }));
            })
          );
          const aggregated: any[] = [];
          for (const item of settled) {
            if (item.status === 'fulfilled' && Array.isArray(item.value)) {
              aggregated.push(...item.value);
            }
          }
          // Sort newest bookings first
          aggregated.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          setPropertyBookings(aggregated);
        } else {
          const data = await OwnerService.getPropertyBookings(propId);
          const curProp = currentProps.find((p) => p.id === propId);
          const enriched = data.map((b: any) => ({
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
    [locale]
  );

  const reloadAll = useCallback(async () => {
    fetchStatus();
    try {
      const list = await OwnerService.getMyProperties();
      const safeList = Array.isArray(list) ? list : [];
      setProperties(safeList);
      await loadBookingsForProperty(selectedPropId, safeList);
    } catch (err) {
      console.warn('[OwnerBookingsPage] Could not load properties list:', err);
    }
  }, [fetchStatus, loadBookingsForProperty, selectedPropId]);

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update Booking Status Handler
  const handleUpdateStatus = async (bookingId: string, newStatus: string, note?: string) => {
    setUpdatingBookingId(bookingId);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
    try {
      await OwnerService.updateBookingStatus(bookingId, newStatus, note);
      
      // Update local state immediately
      setPropertyBookings((prev) =>
        prev.map((b: any) =>
          b.id === bookingId
            ? { ...b, status: newStatus, note: note || b.note }
            : b
        )
      );

      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev: any) => ({ ...prev, status: newStatus, note: note || prev?.note }));
      }

      const statusLabels: Record<string, string> = {
        PENDING: locale === 'ar' ? 'قيد المراجعة' : 'Pending',
        CONTACTED: locale === 'ar' ? 'تم التواصل مع الطالب' : 'Contacted',
        CLOSED: locale === 'ar' ? 'مؤكد ومكتمل' : 'Confirmed',
        CANCELLED: locale === 'ar' ? 'ملغي' : 'Cancelled',
      };

      setActionSuccessMessage(
        locale === 'ar'
          ? `✓ تم تغيير حالة الحجز بنجاح إلى: ${statusLabels[newStatus] || newStatus}`
          : `✓ Booking status updated to: ${statusLabels[newStatus] || newStatus}`
      );

      // Refresh overview statistics in background
      fetchStatus();
    } catch (err: any) {
      console.error('[OwnerBookingsPage] Update status failed:', err);
      setActionErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          (locale === 'ar'
            ? 'تعذر تحديث حالة الحجز. يرجى المحاولة مرة أخرى.'
            : 'Failed to update booking status. Please try again.')
      );
    } finally {
      setUpdatingBookingId(null);
      setTimeout(() => {
        setActionSuccessMessage(null);
      }, 4000);
    }
  };

  // Filter bookings based on selected status tab and search term
  const filteredBookings = useMemo(() => {
    return propertyBookings.filter((b: any) => {
      // 1. Status Filter
      if (selectedStatusTab !== 'ALL') {
        const bStatus = (b.status || '').toUpperCase();
        if (selectedStatusTab === 'PENDING' && bStatus !== 'PENDING') return false;
        if (selectedStatusTab === 'CONTACTED' && bStatus !== 'CONTACTED') return false;
        if (
          selectedStatusTab === 'CLOSED' &&
          bStatus !== 'CLOSED' &&
          bStatus !== 'CONFIRMED'
        )
          return false;
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

  // Status counts from current bookings
  const statusCounts = useMemo(() => {
    const counts = { ALL: propertyBookings.length, PENDING: 0, CONTACTED: 0, CLOSED: 0, CANCELLED: 0 };
    for (const b of propertyBookings) {
      const s = (b.status || '').toUpperCase();
      if (s === 'PENDING') counts.PENDING++;
      else if (s === 'CONTACTED') counts.CONTACTED++;
      else if (s === 'CLOSED' || s === 'CONFIRMED') counts.CLOSED++;
      else if (s === 'CANCELLED') counts.CANCELLED++;
    }
    return counts;
  }, [propertyBookings]);

  function getStatusBadge(status?: string) {
    const s = (status || '').toUpperCase();
    if (s === 'CLOSED' || s === 'CONFIRMED') {
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
            border: '1px solid #BBF7D0',
          }}
        >
          {locale === 'ar' ? '✓ مكتمل / مؤكد' : '✓ Confirmed'}
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
          {locale === 'ar' ? '⏳ قيد المراجعة' : 'Pending'}
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

  const selectedPropertyObj = properties.find((p) => p.id === selectedPropId);

  return (
    <div>
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
              {locale === 'ar' ? '📋 طلبات الحجز وإدارة حالاتها' : '📋 Student Booking Requests & Status'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'متابعة وتغيير حالة طلبات الحجز (قيد المراجعة، تم التواصل، تأكيد، أو إلغاء) والتواصل مع الطلاب.'
                : 'Review, update booking status (Pending, Contacted, Confirmed, Cancelled), and communicate with students.'}
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

        {/* Action Success / Error Banners */}
        {actionSuccessMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              border: '1px solid #BBF7D0',
              fontWeight: 700,
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{actionSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: '#15803D', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

        {actionErrorMessage && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              border: '1px solid #FECACA',
              fontWeight: 700,
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{actionErrorMessage}</span>
            <button
              type="button"
              onClick={() => setActionErrorMessage(null)}
              style={{ background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        )}

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
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803D', marginBottom: '0.2rem' }}>
                {statusCounts.CLOSED}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                {locale === 'ar' ? '✓ مؤكد / مكتمل' : 'Confirmed'}
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
              { id: 'PENDING', labelAr: '⏳ قيد المراجعة', labelEn: '⏳ Pending', count: statusCounts.PENDING },
              { id: 'CONTACTED', labelAr: '📞 تم التواصل', labelEn: '📞 Contacted', count: statusCounts.CONTACTED },
              { id: 'CLOSED', labelAr: '✓ مؤكد', labelEn: '✓ Confirmed', count: statusCounts.CLOSED },
              { id: 'CANCELLED', labelAr: '✕ ملغي', labelEn: '✕ Cancelled', count: statusCounts.CANCELLED },
            ].map((tab) => {
              const isActive = selectedStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatusTab(tab.id)}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredBookings.map((b: any) => {
              const tenantName = b.tenant?.firstName
                ? `${b.tenant.firstName} ${b.tenant.lastName || ''}`.trim()
                : b.tenant?.name || (locale === 'ar' ? 'طالب مستأجر' : 'Student Tenant');
              const tenantPhone = b.tenant?.whatsappPhone || b.tenant?.phone;
              const propertyTitle = b.property?.title || selectedPropertyObj?.title || (locale === 'ar' ? 'سكن جامعي' : 'Student Housing');
              const propertyLocation = b.property?.city || b.property?.address || '';
              const roomType = b.room?.roomType ? `غرفة ${b.room.roomType}` : null;
              const beds = b.bedsRequested || 1;
              const currentStatus = (b.status || '').toUpperCase();
              const isUpdating = updatingBookingId === b.id;

              return (
                <div
                  key={b.id}
                  style={{
                    border: currentStatus === 'PENDING' ? '1.5px solid #FCD34D' : '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '1.35rem',
                    backgroundColor: currentStatus === 'PENDING' ? '#FFFDF5' : '#FFFFFF',
                    boxShadow: currentStatus === 'PENDING' ? '0 4px 12px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
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
                    {/* Status Management Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
                        {locale === 'ar' ? 'تغيير الحالة:' : 'Change Status:'}
                      </span>

                      {/* 1. Contacted Action */}
                      {currentStatus !== 'CONTACTED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(b.id, 'CONTACTED')}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            border: '1px solid #BAE6FD',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            opacity: isUpdating ? 0.6 : 1,
                          }}
                        >
                          📞 {locale === 'ar' ? 'تم التواصل' : 'Mark Contacted'}
                        </button>
                      )}

                      {/* 2. Confirm / Closed Action */}
                      {currentStatus !== 'CLOSED' && currentStatus !== 'CONFIRMED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(b.id, 'CLOSED', 'تم تأكيد وقبول الحجز من قبل المالك')}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            border: '1px solid #BBF7D0',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            opacity: isUpdating ? 0.6 : 1,
                          }}
                        >
                          ✓ {locale === 'ar' ? 'تأكيد الحجز' : 'Confirm & Accept'}
                        </button>
                      )}

                      {/* 3. Revert to Pending */}
                      {currentStatus !== 'PENDING' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(b.id, 'PENDING')}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#FEF9C3',
                            color: '#A16207',
                            border: '1px solid #FEF08A',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            opacity: isUpdating ? 0.6 : 1,
                          }}
                        >
                          ⏳ {locale === 'ar' ? 'إعادة للمراجعة' : 'Set Pending'}
                        </button>
                      )}

                      {/* 4. Cancel Action */}
                      {currentStatus !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => {
                            const reason = window.prompt(
                              locale === 'ar' ? 'سبب إلغاء الطلب (اختياري):' : 'Reason for cancellation:'
                            );
                            handleUpdateStatus(b.id, 'CANCELLED', reason || 'تم الإلغاء من قبل مالك العقار');
                          }}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            backgroundColor: '#FEE2E2',
                            color: '#B91C1C',
                            border: '1px solid #FECACA',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            opacity: isUpdating ? 0.6 : 1,
                          }}
                        >
                          ✕ {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel'}
                        </button>
                      )}

                      {isUpdating && (
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                          {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                        </span>
                      )}
                    </div>

                    {/* Communication & Modal Details Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {tenantPhone && (
                        <a
                          href={`https://wa.me/${tenantPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: '1px solid #BBF7D0',
                          }}
                        >
                          💬 {locale === 'ar' ? 'واتساب' : 'WhatsApp'}
                        </a>
                      )}

                      {tenantPhone && (
                        <a
                          href={`tel:${tenantPhone}`}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: '1px solid #DBEAFE',
                          }}
                        >
                          📞 {locale === 'ar' ? 'اتصال' : 'Call'}
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBooking(b);
                          setModalNote(b.note || '');
                        }}
                        style={{
                          padding: '0.45rem 0.95rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0B2A4A',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {locale === 'ar' ? 'التفاصيل 🔍' : 'Details 🔍'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Booking Details Modal */}
      {selectedBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setSelectedBooking(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '0.85rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
                  {locale === 'ar' ? '📄 تفاصيل وتحديث حالة الحجز' : '📄 Booking Details & Status'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                  ID: {selectedBooking.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Status Selector in Modal */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                marginBottom: '1.25rem',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A' }}>
                  {locale === 'ar' ? 'تحديث حالة الحجز:' : 'Update Status:'}
                </span>
                {getStatusBadge(selectedBooking.status)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {[
                  { id: 'PENDING', labelAr: '⏳ قيد المراجعة', bg: '#FEF9C3', text: '#A16207' },
                  { id: 'CONTACTED', labelAr: '📞 تم التواصل', bg: '#E0F2FE', text: '#0369A1' },
                  { id: 'CLOSED', labelAr: '✓ مؤكد / مكتمل', bg: '#DCFCE7', text: '#15803D' },
                  { id: 'CANCELLED', labelAr: '✕ ملغي', bg: '#FEE2E2', text: '#B91C1C' },
                ].map((s) => {
                  const isCurrent = (selectedBooking.status || '').toUpperCase() === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={updatingBookingId === selectedBooking.id}
                      onClick={() => handleUpdateStatus(selectedBooking.id, s.id, modalNote)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: isCurrent ? `2px solid ${s.text}` : '1px solid #CBD5E1',
                        backgroundColor: isCurrent ? s.bg : '#FFFFFF',
                        color: s.text,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      {s.labelAr} {isCurrent && '●'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Student (Tenant) Info Section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                👤 {locale === 'ar' ? 'بيانات الطالب (المستأجر)' : 'Student Details'}
              </h4>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'الاسم:' : 'Name:'}</span>
                  <strong style={{ fontSize: '0.875rem', color: '#0B2A4A' }}>
                    {selectedBooking.tenant?.firstName
                      ? `${selectedBooking.tenant.firstName} ${selectedBooking.tenant.lastName || ''}`.trim()
                      : selectedBooking.tenant?.name || '—'}
                  </strong>
                </div>

                {selectedBooking.tenant?.email && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>{selectedBooking.tenant.email}</strong>
                  </div>
                )}

                {(selectedBooking.tenant?.whatsappPhone || selectedBooking.tenant?.phone) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'رقم الهاتف والواتساب:' : 'WhatsApp & Phone:'}</span>
                    <a
                      href={`https://wa.me/${(selectedBooking.tenant?.whatsappPhone || selectedBooking.tenant?.phone).replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      💬 {selectedBooking.tenant?.whatsappPhone || selectedBooking.tenant?.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Accommodation Details */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                🏠 {locale === 'ar' ? 'تفاصيل السكن والغرفة المطلوبة' : 'Accommodation & Room'}
              </h4>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'العقار:' : 'Property:'}</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>
                    {selectedBooking.property?.title || selectedPropertyObj?.title || 'سكن جامعي'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'نوع الغرفة:' : 'Room Type:'}</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>
                    {selectedBooking.room?.roomType ? `غرفة ${selectedBooking.room.roomType}` : 'غرفة مخصصة للطلاب'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'الأسرة المطلوبة:' : 'Requested Beds:'}</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>
                    {selectedBooking.bedsRequested || 1} {locale === 'ar' ? 'سرير' : 'beds'}
                  </strong>
                </div>

                {selectedBooking.monthsCount && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'مدة الإقامة:' : 'Duration:'}</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>
                      {selectedBooking.monthsCount} {locale === 'ar' ? 'أشهر' : 'months'}
                    </strong>
                  </div>
                )}

                {selectedBooking.room?.pricePerBed && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'سعر السرير شهرياً:' : 'Monthly Rate / Bed:'}</span>
                    <strong style={{ fontSize: '0.85rem', color: '#16A34A' }}>
                      {Number(selectedBooking.room.pricePerBed).toLocaleString()} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Stay Period & Dates */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                📅 {locale === 'ar' ? 'فترة الإقامة وتواريخ الحجز' : 'Stay Duration & Dates'}
              </h4>
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'تاريخ الوصول (Move-in):' : 'Check-in:'}</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>
                    {selectedBooking.startDate ? new Date(selectedBooking.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>{locale === 'ar' ? 'تاريخ المغادرة (Move-out):' : 'Check-out:'}</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0B2A4A' }}>
                    {selectedBooking.endDate ? new Date(selectedBooking.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                  </strong>
                </div>

                {selectedBooking.totalPrice !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A' }}>{locale === 'ar' ? 'إجمالي الحجز المقدر:' : 'Estimated Total:'}</span>
                    <strong style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2F6BFF' }}>
                      {Number(selectedBooking.totalPrice).toLocaleString()} {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Notes (Editable / Viewable) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                📝 {locale === 'ar' ? 'ملاحظات الحجز' : 'Notes'}
              </h4>
              <textarea
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder={locale === 'ar' ? 'أضف ملاحظات خاصة بهذا الحجز...' : 'Add notes for this booking...'}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.85rem',
                  color: '#0B2A4A',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
              {(selectedBooking.tenant?.whatsappPhone || selectedBooking.tenant?.phone) ? (
                <a
                  href={`https://wa.me/${(selectedBooking.tenant?.whatsappPhone || selectedBooking.tenant?.phone).replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  💬 {locale === 'ar' ? 'مراسلة عبر واتساب' : 'Chat on WhatsApp'}
                </a>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0B2A4A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
