import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminBookingItem, AdminStatusCount } from '../../services/adminService';

export default function AdminBookingsPage() {
  const { locale } = useLocale();

  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [bookingsStatus, setBookingsStatus] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 1. Fetch Bookings Metrics & Revenue
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const [statusRes, revRes] = await Promise.allSettled([
        AdminService.getBookingsStatus(),
        AdminService.getBookingsRevenue(),
      ]);
      if (statusRes.status === 'fulfilled') {
        setBookingsStatus(statusRes.value);
      }
      if (revRes.status === 'fulfilled') {
        setRevenueData(revRes.value);
      }
    } catch (err: any) {
      console.error('[AdminBookingsPage] metrics fetch failed:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // 2. Fetch Bookings List
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AdminService.getBookings({ page, limit: 10 });
      const list = data?.bookings || data?.items || data?.data || (Array.isArray(data) ? data : []);
      setBookings(Array.isArray(list) ? list : []);

      const total = data?.total || data?.meta?.total || (Array.isArray(list) ? list.length : 0);
      const limit = data?.limit || 10;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err: any) {
      console.error('[AdminBookingsPage] GET /dashboard/bookings failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل قائمة الحجوزات من الخادم.'
            : 'Could not load bookings from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [page, locale]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

  const statusMetrics = normalizeStatusList(bookingsStatus);

  const parsedRevenue =
    revenueData?.totalRevenue ??
    revenueData?.revenue ??
    revenueData?.total ??
    (typeof revenueData === 'number' ? revenueData : null);

  const revenueCurrency = revenueData?.currency || (locale === 'ar' ? 'ج.م' : 'EGP');

  const filteredBookings = statusFilter
    ? bookings.filter((b) => b.status === statusFilter)
    : bookings;

  // Action state
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancelModalBookingId, setCancelModalBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Auto clear banner
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const handleUpdateStatus = async (bookingId: string, status: string, note?: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await AdminService.updateBookingStatus(bookingId, status, note);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? `تم تحديث حالة الحجز إلى "${status}" بنجاح.` : `Booking status updated to "${status}" successfully.`,
      });
      await Promise.all([fetchBookings(), fetchMetrics()]);
    } catch (e: any) {
      setActionMessage({
        type: 'error',
        text: e?.message || (locale === 'ar' ? 'فشل تنفيذ الإجراء على الحجز.' : 'Failed to perform booking action.'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalBookingId) return;
    setActionLoading(true);
    try {
      const reason = cancelReason.trim() || (locale === 'ar' ? 'ملغى من إدارة المنصة' : 'Cancelled by platform admin');
      await AdminService.updateBookingStatus(cancelModalBookingId, 'CANCELLED', reason);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم إلغاء الحجز بنجاح.' : 'Booking has been cancelled successfully.',
      });
      setCancelModalBookingId(null);
      setCancelReason('');
      await Promise.all([fetchBookings(), fetchMetrics()]);
    } catch (e: any) {
      setActionMessage({
        type: 'error',
        text: e?.message || (locale === 'ar' ? 'فشل إلغاء الحجز.' : 'Failed to cancel booking.'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="dary-page-container">
      {/* Action Banner */}
      {actionMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: actionMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: actionMessage.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span>{actionMessage.type === 'success' ? '✓ ' : '✕ '}{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="dary-page-header">
        <div>
          <h1 className="dary-page-title" style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📅</span>
            <span>{locale === 'ar' ? 'إدارة ومتابعة الحجوزات' : 'Bookings Management'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'متابعة كافة طلبات حجز الغرف والأسرة لطلاب الجامعات بين المستأجرين وأصحاب العقارات.'
              : 'Supervise all student room & bed bookings, contracts, and payment transactions.'}
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Revenue Card */}
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: '#9333EA' }}>
            💰
          </div>
          <div>
            <h3 className="dary-metric-number">
              {loadingMetrics ? '...' : parsedRevenue !== null ? `${parsedRevenue.toLocaleString()} ${revenueCurrency}` : '—'}
            </h3>
            <p className="dary-metric-label">{locale === 'ar' ? 'إجمالي الحصيلة المالية' : 'Total Revenue'}</p>
          </div>
        </div>

        {/* Status Badges */}
        {statusMetrics.map((item, idx) => (
          <div key={idx} className="dary-metric-card">
            <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
              📋
            </div>
            <div>
              <h3 className="dary-metric-number">{loadingMetrics ? '...' : item.count}</h3>
              <p className="dary-metric-label">{item.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#0B2A4A', fontSize: '0.9rem' }}>
            {locale === 'ar' ? 'تصفية الحالة:' : 'Filter Status:'}
          </span>
          {['', 'CONFIRMED', 'PENDING', 'CONTACTED', 'CLOSED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: statusFilter === st ? '#2F6BFF' : '#F1F5F9',
                color: statusFilter === st ? '#FFFFFF' : '#475569',
                fontWeight: statusFilter === st ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {st === '' ? (locale === 'ar' ? 'الكل' : 'All') : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="dary-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            {locale === 'ar' ? 'جاري تحميل الحجوزات...' : 'Loading bookings...'}
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#EF4444' }}>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                fetchBookings();
                fetchMetrics();
              }}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                backgroundColor: '#2F6BFF',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            {locale === 'ar' ? 'لا توجد حجوزات مسجلة تطابق هذا الفلتر.' : 'No bookings found matching filter.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'معرف الحجز' : 'Booking ID'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'المستأجر' : 'Tenant'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'العقار / الغرفة' : 'Property / Room'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'المدة المطلوبة' : 'Duration'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'الإيجار الشهري' : 'Rent / mo'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '0.85rem 1rem' }}>{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {filteredBookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0B2A4A' }}>
                        {b.id ? b.id.substring(0, 8) : '—'}...
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0B2A4A' }}>
                          {b.tenant?.name || `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim() || b.tenantId || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {b.tenant?.email || b.tenant?.phone || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0B2A4A' }}>
                          {b.property?.title || 'عقار جامعي'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {b.room?.roomType ? `غرفة ${b.room.roomType}` : b.property?.city || 'غرفة دراسية'}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                        <div>{b.startDate || b.moveInDate ? new Date(b.startDate || b.moveInDate!).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}</div>
                        <div style={{ color: '#94A3B8' }}>↓</div>
                        <div>{b.endDate || b.moveOutDate ? new Date(b.endDate || b.moveOutDate!).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0B2A4A' }}>
                        {b.totalPrice !== undefined ? `${b.totalPrice.toLocaleString()} ${revenueCurrency}` : (b.room?.pricePerBed || b.room?.monthlyRent) ? `${Number(b.room.pricePerBed || b.room.monthlyRent).toLocaleString()} ${revenueCurrency}` : '—'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor:
                              b.status === 'CONFIRMED' || b.status === 'CLOSED'
                                ? '#DCFCE7'
                                : b.status === 'CONTACTED'
                                ? '#E0F2FE'
                                : b.status === 'PENDING'
                                ? '#FEF9C3'
                                : '#FEE2E2',
                            color:
                              b.status === 'CONFIRMED' || b.status === 'CLOSED'
                                ? '#15803D'
                                : b.status === 'CONTACTED'
                                ? '#0369A1'
                                : b.status === 'PENDING'
                                ? '#A16207'
                                : '#B91C1C',
                          }}
                        >
                          {b.status || 'PENDING'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {b.status === 'PENDING' && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(b.id, 'CONTACTED', 'تم التواصل من الإدارة')}
                              style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #0284C7',
                                backgroundColor: '#E0F2FE',
                                color: '#0369A1',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              📞 {locale === 'ar' ? 'تم التواصل' : 'Contacted'}
                            </button>
                          )}

                          {b.status === 'CONTACTED' && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleUpdateStatus(b.id, 'CLOSED', 'تم إتمام وتأكيد الحجز')}
                              style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #16A34A',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ✓ {locale === 'ar' ? 'إتمام الحجز' : 'Close / Finish'}
                            </button>
                          )}

                          {(b.status === 'PENDING' || b.status === 'CONTACTED') && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => {
                                setCancelModalBookingId(b.id);
                                setCancelReason('');
                              }}
                              style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #EF4444',
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ✕ {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </button>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: page >= totalPages ? '#F1F5F9' : '#FFFFFF',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* In-app Cancel Booking Modal */}
      {cancelModalBookingId && (
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
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.75rem' }}>
              {locale === 'ar' ? 'إلغاء حجز الطالب' : 'Cancel Booking'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem' }}>
              {locale === 'ar'
                ? 'يرجى كتابة سبب الإلغاء ليتم إرساله للمستأجر وصاحب العقار في الإشعارات:'
                : 'Please specify the cancellation reason to notify tenant and property owner:'}
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={locale === 'ar' ? 'مثال: تعذر التواصل مع الطالب أو الحجز غير مكتمل' : 'e.g., Unable to reach tenant'}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setCancelModalBookingId(null);
                  setCancelReason('');
                }}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'تراجع' : 'Back'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmCancel}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading
                  ? (locale === 'ar' ? 'جاري الإلغاء...' : 'Cancelling...')
                  : (locale === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
