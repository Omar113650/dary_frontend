import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminBookingItem, AdminStatusCount } from '../../services/adminService';
import { ContractService } from '../../services/contractService';
import type { ContractItem } from '../../services/contractService';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { useAdminBookingsStatus, useAdminRevenue } from '../../hooks/useDashboardQueries';
import { useQueryClient, STALE_TIMES } from '../../lib/queryClient';

export default function AdminBookingsPage() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const initialCache = queryClient.getQueryData<any>(['admin', 'bookings', { page: 1, limit: 10 }]);
  const initialList = initialCache?.bookings || initialCache?.items || initialCache?.data || (Array.isArray(initialCache) ? initialCache : []);

  const [bookings, setBookings] = useState<AdminBookingItem[]>(() => (Array.isArray(initialList) ? initialList : []));
  
  // Cached metrics (5m)
  const {
    data: bookingsStatus,
    isLoading: loadingStatus,
    refetch: fetchBookingsStatus,
  } = useAdminBookingsStatus();

  const {
    data: revenueData,
    isLoading: loadingRevenue,
    refetch: fetchRevenue,
  } = useAdminRevenue();

  const loadingMetrics = loadingStatus || loadingRevenue;
  const fetchMetrics = useCallback(async () => {
    await Promise.allSettled([fetchBookingsStatus(), fetchRevenue()]);
  }, [fetchBookingsStatus, fetchRevenue]);

  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 2. Fetch Bookings List
  const fetchBookings = useCallback(async () => {
    const cacheKey = ['admin', 'bookings', { page, limit: 10 }];
    const cached = queryClient.getQueryData<any>(cacheKey);
    if (cached) {
      const list = cached?.bookings || cached?.items || cached?.data || (Array.isArray(cached) ? cached : []);
      setBookings(Array.isArray(list) ? list : []);
      const total = cached?.total || cached?.meta?.total || (Array.isArray(list) ? list.length : 0);
      const limit = cached?.limit || 10;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: cacheKey,
        queryFn: () => AdminService.getBookings({ page, limit: 10 }),
        staleTime: STALE_TIMES.LISTS,
      });
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
  }, [page, locale, queryClient]);

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

  // Digital Contract Management State
  const [contractBooking, setContractBooking] = useState<AdminBookingItem | null>(null);
  const [contractData, setContractData] = useState<ContractItem | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [draftPdfFile, setDraftPdfFile] = useState<File | null>(null);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [isActivatingContract, setIsActivatingContract] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [contractModalMsg, setContractModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openContractModal = async (booking: AdminBookingItem) => {
    setContractBooking(booking);
    setContractData(null);
    setDraftPdfFile(null);
    setContractModalMsg(null);
    setLoadingContract(true);
    try {
      const data = await ContractService.getContractByBooking(booking.id);
      setContractData(data);
    } catch (err: any) {
      console.error('Failed to load contract:', err);
    } finally {
      setLoadingContract(false);
    }
  };

  const handleCreateContract = async () => {
    if (!contractBooking) return;
    setIsCreatingContract(true);
    setContractModalMsg(null);
    try {
      const created = await ContractService.createContract(contractBooking.id);
      setContractData(created?.contract || created);
      setContractModalMsg({
        type: 'success',
        text: locale === 'ar' ? 'تم إنشاء مسودة العقد بنجاح! يمكنك الآن رفع ملف PDF المسودة.' : 'Contract draft created successfully! Upload draft PDF.',
      });
    } catch (err: any) {
      setContractModalMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل إنشاء العقد.' : 'Failed to create contract.'),
      });
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handleSendDraft = async () => {
    if (!contractData || !draftPdfFile) return;
    setIsSendingDraft(true);
    setContractModalMsg(null);
    try {
      await ContractService.sendContract(contractData.id, draftPdfFile);
      setContractModalMsg({
        type: 'success',
        text: locale === 'ar' ? 'تم إرسال مسودة العقد بنجاح إلى المستأجر والمالك للتوقيع.' : 'Contract sent to tenant and owner for signature.',
      });
      if (contractBooking) {
        const updated = await ContractService.getContractByBooking(contractBooking.id);
        setContractData(updated);
      }
    } catch (err: any) {
      setContractModalMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل إرسال مسودة العقد.' : 'Failed to send contract draft.'),
      });
    } finally {
      setIsSendingDraft(false);
    }
  };

  const handleActivateContract = async () => {
    if (!contractData) return;
    setIsActivatingContract(true);
    setContractModalMsg(null);
    try {
      await ContractService.activateContract(contractData.id);
      setContractModalMsg({
        type: 'success',
        text: locale === 'ar' ? 'تم تفعيل العقد بنجاح وخصم الأسرة من الغرفة!' : 'Contract activated successfully!',
      });
      if (contractBooking) {
        const updated = await ContractService.getContractByBooking(contractBooking.id);
        setContractData(updated);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    } catch (err: any) {
      setContractModalMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تفعيل العقد.' : 'Failed to activate contract.'),
      });
    } finally {
      setIsActivatingContract(false);
    }
  };

  const handleCancelContract = async () => {
    if (!contractData) return;
    if (!window.confirm(locale === 'ar' ? 'هل أنت متأكد من رغبتك في إلغاء هذا العقد؟' : 'Are you sure you want to cancel this contract?')) return;
    try {
      await ContractService.cancelContract(contractData.id);
      setContractModalMsg({
        type: 'success',
        text: locale === 'ar' ? 'تم إلغاء العقد وإعادة الأسرة للغرفة.' : 'Contract cancelled successfully.',
      });
      if (contractBooking) {
        const updated = await ContractService.getContractByBooking(contractBooking.id);
        setContractData(updated);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    } catch (err: any) {
      setContractModalMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل إلغاء العقد.' : 'Failed to cancel contract.'),
      });
    }
  };

  // Auto clear banner
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const handleUpdateStatus = async (
    bookingId: string,
    status: 'CONTACTED' | 'CLOSED' | 'CANCELLED',
    note?: string
  ) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await AdminService.updateBookingStatus(bookingId, status, note);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? `تم تحديث حالة الحجز إلى "${status}" بنجاح.` : `Booking status updated to "${status}" successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'revenue'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'revenue'] });
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
              <AnimatedCounter
                value={parsedRevenue}
                loading={loadingMetrics}
                suffix={` ${revenueCurrency}`}
                fallback="—"
              />
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
              <h3 className="dary-metric-number">
                <AnimatedCounter value={item.count} loading={loadingMetrics} />
              </h3>
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
                          {b.room?.roomType ? `غرفة ${b.room.roomType}` : b.room?.type ? `غرفة ${b.room.type}` : b.property?.city || 'غرفة دراسية'}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                        <div>{b.startDate || b.moveInDate ? new Date(b.startDate || b.moveInDate!).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}</div>
                        <div style={{ color: '#94A3B8' }}>↓</div>
                        <div>{b.endDate || b.moveOutDate ? new Date(b.endDate || b.moveOutDate!).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0B2A4A' }}>
                        {b.totalPrice !== undefined
                          ? `${b.totalPrice.toLocaleString()} ${revenueCurrency}`
                          : (b.room?.pricePerBed || b.room?.monthlyRent)
                          ? `${Number(
                              b.room?.pricePerBed || b.room?.monthlyRent
                            ).toLocaleString()} ${revenueCurrency}`
                          : '—'}
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
                          <button
                            type="button"
                            onClick={() => openContractModal(b)}
                            style={{
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #6366F1',
                              backgroundColor: '#EEF2FF',
                              color: '#4F46E5',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            📝 {locale === 'ar' ? 'العقد' : 'Contract'}
                          </button>

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

      {/* Digital Contract Modal for Admin */}
      {contractBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
              padding: '2rem',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: locale === 'ar' ? 'right' : 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📝</span>
                <span>{locale === 'ar' ? 'العقد الإلكتروني للحجز' : 'Digital Contract'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setContractBooking(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                ×
              </button>
            </div>

            {/* Contract Modal Message Banner */}
            {contractModalMsg && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: contractModalMsg.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                  color: contractModalMsg.type === 'success' ? '#03543F' : '#9B1C1C',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {contractModalMsg.type === 'success' ? '✓ ' : '✕ '}{contractModalMsg.text}
              </div>
            )}

            {/* Booking Summary Box */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>{locale === 'ar' ? 'المستأجر:' : 'Tenant:'} </span>
                  <strong>{contractBooking.tenant?.name || contractBooking.tenant?.firstName || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>{locale === 'ar' ? 'العقار:' : 'Property:'} </span>
                  <strong>{contractBooking.property?.title || 'عقار جامعي'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>{locale === 'ar' ? 'الحجز ID:' : 'Booking ID:'} </span>
                  <span style={{ fontFamily: 'monospace' }}>{contractBooking.id.substring(0, 8)}...</span>
                </div>
              </div>
            </div>

            {loadingContract ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748B' }}>
                {locale === 'ar' ? 'جاري جلب بيانات العقد...' : 'Loading contract details...'}
              </div>
            ) : !contractData ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                <p style={{ color: '#475569', marginBottom: '1.25rem' }}>
                  {locale === 'ar'
                    ? 'لم يتم إنشاء عقد إلكتروني لهذا الحجز بعد. يمكنك إنشاء مسودة الآن وتحديد الشروط.'
                    : 'No digital contract exists for this booking yet. Create a draft to proceed.'}
                </p>
                <button
                  type="button"
                  disabled={isCreatingContract}
                  onClick={handleCreateContract}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    backgroundColor: '#2F6BFF',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: isCreatingContract ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isCreatingContract
                    ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                    : (locale === 'ar' ? '📄 إنشاء مسودة العقد (Draft)' : '📄 Create Contract Draft')}
                </button>
              </div>
            ) : (
              <div>
                {/* Contract Status Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', padding: '0.75rem 1rem', backgroundColor: '#EEF2FF', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#3730A3', fontSize: '0.9rem' }}>
                    {locale === 'ar' ? 'حالة العقد:' : 'Contract Status:'}
                  </span>
                  <span
                    style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor:
                        contractData.status === 'ACTIVE'
                          ? '#DCFCE7'
                          : contractData.status === 'SIGNED'
                          ? '#E0E7FF'
                          : contractData.status === 'SENT'
                          ? '#E0F2FE'
                          : contractData.status === 'DRAFT'
                          ? '#FEF9C3'
                          : '#FEE2E2',
                      color:
                        contractData.status === 'ACTIVE'
                          ? '#15803D'
                          : contractData.status === 'SIGNED'
                          ? '#4338CA'
                          : contractData.status === 'SENT'
                          ? '#0369A1'
                          : contractData.status === 'DRAFT'
                          ? '#A16207'
                          : '#B91C1C',
                    }}
                  >
                    {contractData.status}
                  </span>
                </div>

                {/* Draft PDF Upload & View */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.75rem' }}>
                    {locale === 'ar' ? '1. مسودة العقد (Draft PDF)' : '1. Contract Draft (PDF)'}
                  </h4>
                  {contractData.contractUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <a
                        href={contractData.contractUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          color: '#2F6BFF',
                          textDecoration: 'underline',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}
                      >
                        📄 {locale === 'ar' ? 'عرض / تحميل ملف المسودة المرفوع' : 'View / Download Uploaded Draft'}
                      </a>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                      {locale === 'ar' ? 'لم يتم رفع ملف المسودة بعد.' : 'No draft PDF uploaded yet.'}
                    </p>
                  )}

                  {/* Upload new / updated draft */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setDraftPdfFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      disabled={!draftPdfFile || isSendingDraft}
                      onClick={handleSendDraft}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '6px',
                        backgroundColor: !draftPdfFile || isSendingDraft ? '#CBD5E1' : '#2F6BFF',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: !draftPdfFile || isSendingDraft ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSendingDraft
                        ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                        : (locale === 'ar' ? '📤 إرسال المسودة للأطراف للتوقيع' : '📤 Send Draft for Signatures')}
                    </button>
                  </div>
                </div>

                {/* Signatures Progress */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.75rem' }}>
                    {locale === 'ar' ? '2. توقيعات الأطراف' : '2. Signatures Status'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Tenant Status */}
                    <div style={{ padding: '0.85rem', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 700, color: '#0B2A4A', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
                        {locale === 'ar' ? 'المستأجر (Tenant)' : 'Tenant'}
                      </div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        {contractData.tenantSigned ? (
                          <span style={{ color: '#15803D', fontWeight: 600 }}>✅ {locale === 'ar' ? 'قام بالتوقيع' : 'Signed'}</span>
                        ) : (
                          <span style={{ color: '#A16207', fontWeight: 600 }}>⏳ {locale === 'ar' ? 'بانتظار التوقيع' : 'Pending'}</span>
                        )}
                      </div>
                      {contractData.tenantSignedPdfUrl && (
                        <a
                          href={contractData.tenantSignedPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2F6BFF', fontSize: '0.8rem', textDecoration: 'underline' }}
                        >
                          📄 {locale === 'ar' ? 'عرض توقيع المستأجر' : 'View signed copy'}
                        </a>
                      )}
                    </div>

                    {/* Owner Status */}
                    <div style={{ padding: '0.85rem', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 700, color: '#0B2A4A', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
                        {locale === 'ar' ? 'المالك (Owner)' : 'Owner'}
                      </div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        {contractData.ownerSigned ? (
                          <span style={{ color: '#15803D', fontWeight: 600 }}>✅ {locale === 'ar' ? 'قام بالتوقيع' : 'Signed'}</span>
                        ) : (
                          <span style={{ color: '#A16207', fontWeight: 600 }}>⏳ {locale === 'ar' ? 'بانتظار التوقيع' : 'Pending'}</span>
                        )}
                      </div>
                      {contractData.ownerSignedPdfUrl && (
                        <a
                          href={contractData.ownerSignedPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2F6BFF', fontSize: '0.8rem', textDecoration: 'underline' }}
                        >
                          📄 {locale === 'ar' ? 'عرض توقيع المالك' : 'View signed copy'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Final Admin Action Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                  {contractData.status !== 'ACTIVE' && contractData.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      disabled={isActivatingContract || (!contractData.tenantSigned && !contractData.ownerSigned)}
                      onClick={handleActivateContract}
                      title={!contractData.tenantSigned || !contractData.ownerSigned ? 'يتطلب توقيع الطرفين أولاً' : ''}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: isActivatingContract ? 'not-allowed' : 'pointer',
                        opacity: (!contractData.tenantSigned || !contractData.ownerSigned) ? 0.6 : 1,
                      }}
                    >
                      {isActivatingContract
                        ? (locale === 'ar' ? 'جاري التفعيل...' : 'Activating...')
                        : (locale === 'ar' ? '🚀 تفعيل العقد رسمياً (خصم السرير)' : '🚀 Activate Contract')}
                    </button>
                  )}

                  {contractData.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={handleCancelContract}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: '1px solid #EF4444',
                        backgroundColor: '#FEE2E2',
                        color: '#B91C1C',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      ✕ {locale === 'ar' ? 'إلغاء العقد وإتاحة السرير' : 'Cancel Contract'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setContractBooking(null)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {locale === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
