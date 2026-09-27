import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { BookingService } from '../../services/bookingService';
import type { BookingItem } from '../../services/bookingService';

interface BookingDetailsModalProps {
  bookingId: string;
  initialData?: any;
  role: 'tenant' | 'owner' | 'admin';
  onClose: () => void;
  onUpdated?: () => void;
}

export default function BookingDetailsModal({
  bookingId,
  initialData,
  role,
  onClose,
  onUpdated,
}: BookingDetailsModalProps) {
  const { locale } = useLocale();

  const [booking, setBooking] = useState<BookingItem | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelNote, setCancelNote] = useState('');

  const fetchDetails = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await BookingService.getBookingById(bookingId);
      if (data) {
        setBooking(data);
      } else if (!initialData) {
        setError(locale === 'ar' ? 'لم يتم العثور على بيانات هذا الحجز.' : 'Booking details not found.');
      }
    } catch (err: any) {
      console.error('[BookingDetailsModal] Fetch error:', err);
      if (!initialData) {
        setError(err?.message || (locale === 'ar' ? 'تعذر جلب تفاصيل الحجز.' : 'Failed to fetch booking details.'));
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, initialData, locale]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle Admin Assigning booking to self
  const handleAssignToMe = async () => {
    if (!booking) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await BookingService.assignBooking(booking.id);
      setActionMsg({
        type: 'success',
        text: locale === 'ar' ? '✓ تم تعيين هذا الحجز لك بنجاح.' : '✓ Booking successfully assigned to you.',
      });
      await fetchDetails();
      onUpdated?.();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تعيين الحجز.' : 'Failed to assign booking.'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Update (Admin or Tenant Cancel)
  const handleStatusChange = async (newStatus: 'CONTACTED' | 'CLOSED' | 'CANCELLED', note?: string) => {
    if (!booking) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await BookingService.changeBookingStatus(booking.id, newStatus, note);
      const labels: Record<string, string> = {
        CONTACTED: locale === 'ar' ? 'تم التواصل' : 'Contacted',
        CLOSED: locale === 'ar' ? 'مؤكد ومعتمد' : 'Closed / Confirmed',
        CANCELLED: locale === 'ar' ? 'ملغي' : 'Cancelled',
      };
      setActionMsg({
        type: 'success',
        text: locale === 'ar'
          ? `✓ تم تحديث حالة الحجز إلى "${labels[newStatus] || newStatus}".`
          : `✓ Booking status changed to "${labels[newStatus] || newStatus}".`,
      });
      setShowCancelInput(false);
      setCancelNote('');
      await fetchDetails();
      onUpdated?.();
    } catch (err: any) {
      setActionMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث حالة الحجز.' : 'Failed to update booking status.'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'CLOSED' || s === 'CONFIRMED') {
      return (
        <span
          style={{
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            border: '1px solid #BBF7D0',
          }}
        >
          ✓ {locale === 'ar' ? 'مؤكد ومعتمد' : 'Confirmed'}
        </span>
      );
    }
    if (s === 'CONTACTED') {
      return (
        <span
          style={{
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: '#E0F2FE',
            color: '#0369A1',
            border: '1px solid #BAE6FD',
          }}
        >
          📞 {locale === 'ar' ? 'تم التواصل' : 'Contacted'}
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span
          style={{
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: '#FEF9C3',
            color: '#A16207',
            border: '1px solid #FEF08A',
          }}
        >
          ⏳ {locale === 'ar' ? 'قيد المراجعة' : 'Pending'}
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span
          style={{
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
          }}
        >
          ✕ {locale === 'ar' ? 'ملغي' : 'Cancelled'}
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '0.3rem 0.85rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 700,
          backgroundColor: '#F1F5F9',
          color: '#475569',
        }}
      >
        {status || '—'}
      </span>
    );
  };

  const tenantName =
    booking?.tenant?.name ||
    `${booking?.tenant?.firstName || ''} ${booking?.tenant?.lastName || ''}`.trim() ||
    (locale === 'ar' ? 'طالب مستأجر' : 'Student Tenant');

  const tenantPhone = booking?.tenant?.whatsappPhone || booking?.tenant?.phone;
  const cleanTenantPhone = tenantPhone ? String(tenantPhone).replace(/[^0-9]/g, '') : null;

  const rawPropTitle: any = booking?.property?.title;
  const propertyTitle =
    typeof rawPropTitle === 'object' && rawPropTitle !== null
      ? (rawPropTitle[locale] || rawPropTitle.ar || rawPropTitle.en || '')
      : (typeof rawPropTitle === 'string' ? rawPropTitle : (locale === 'ar' ? 'سكن جامعي' : 'Student Housing'));
  const propertyCity = booking?.property?.city || '';
  const propertyDistrict = booking?.property?.district || '';
  const propertyAddress = booking?.property?.address || '';

  const rawOwner =
    (typeof booking?.property?.owner === 'object' && booking?.property?.owner !== null ? booking?.property?.owner : null) ||
    (typeof (booking?.property as any)?.user === 'object' ? (booking?.property as any).user : null) ||
    (typeof (booking?.property as any)?.host === 'object' ? (booking?.property as any).host : null) ||
    (typeof (booking as any)?.owner === 'object' ? (booking as any).owner : null) ||
    (typeof (booking as any)?.user === 'object' ? (booking as any).user : null);

  const ownerId =
    booking?.property?.ownerId ||
    (booking?.property as any)?.userId ||
    (booking as any)?.ownerId ||
    (typeof booking?.property?.owner === 'string' ? booking?.property?.owner : null) ||
    rawOwner?.id;

  const ownerName =
    [rawOwner?.firstName, rawOwner?.lastName].filter(Boolean).join(' ').trim() ||
    rawOwner?.name ||
    rawOwner?.fullName ||
    (rawOwner?.email ? rawOwner.email.split('@')[0] : null) ||
    booking?.property?.ownerName ||
    (booking?.property as any)?.owner_name ||
    (typeof booking?.property?.owner === 'string' ? booking?.property?.owner : null) ||
    (ownerId ? `${locale === 'ar' ? 'المالك' : 'Owner'} #${String(ownerId).slice(0, 6)}` : '');

  const ownerPhone = rawOwner?.whatsappPhone || rawOwner?.phone || (booking?.property as any)?.contactPhone;
  const cleanOwnerPhone = ownerPhone ? String(ownerPhone).replace(/[^0-9]/g, '') : null;

  const assignedAdminName =
    booking?.assignedAdmin?.firstName
      ? `${booking.assignedAdmin.firstName} ${booking.assignedAdmin.lastName || ''}`.trim()
      : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0B2A4A' }}>
                {locale === 'ar' ? 'تفاصيل طلب الحجز' : 'Booking Request Details'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                ID: {bookingId}
              </span>
            </div>
            {booking && getStatusBadge(booking.status)}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {actionMsg && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                backgroundColor: actionMsg.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                color: actionMsg.type === 'success' ? '#03543F' : '#9B1C1C',
                border: `1px solid ${actionMsg.type === 'success' ? '#31C48D' : '#F98080'}`,
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {actionMsg.text}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: '#64748B' }}>
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
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {locale === 'ar' ? 'جاري تحميل تفاصيل الحجز...' : 'Loading booking details...'}
              </p>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: '#DC2626' }}>
              <p style={{ fontWeight: 700 }}>{error}</p>
              <button
                type="button"
                onClick={fetchDetails}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          ) : booking ? (
            <>
              {/* 1. Quick Financial & Duration Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', marginBottom: '0.25rem' }}>
                    💰 {locale === 'ar' ? 'المبلغ الإجمالي' : 'Total Price'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B2A4A' }}>
                    {booking.totalPrice !== undefined ? Number(booking.totalPrice).toLocaleString() : '—'}
                    <span style={{ fontSize: '0.75rem', marginInlineStart: '0.3rem', color: '#64748B' }}>
                      {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                    📅 {locale === 'ar' ? 'مدة الإقامة' : 'Stay Duration'}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0B2A4A' }}>
                    {booking.monthsCount ? `${booking.monthsCount} ${locale === 'ar' ? 'أشهر' : 'months'}` : '—'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                    {booking.startDate ? new Date(booking.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : ''}
                    {' → '}
                    {booking.endDate ? new Date(booking.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : ''}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                    🛏️ {locale === 'ar' ? 'الأسرة المطلوبة' : 'Beds Requested'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B2A4A' }}>
                    {booking.bedsRequested || 1}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {booking.room?.roomType ? `${booking.room.roomType}` : ''}
                    {booking.room?.pricePerBed ? ` (${Number(booking.room.pricePerBed).toLocaleString()} ج.م/سرير)` : ''}
                  </div>
                </div>
              </div>

              {/* 2. Property & Room Info */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 800, color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🏢</span>
                  <span>{locale === 'ar' ? 'بيانات السكن والعقار' : 'Property & Accommodation'}</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'اسم العقار' : 'Property Title'}</span>
                    <strong style={{ color: '#0B2A4A' }}>{propertyTitle}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'الموقع' : 'Location'}</span>
                    <strong style={{ color: '#0B2A4A' }}>
                      {propertyCity} {propertyDistrict ? `• ${propertyDistrict}` : ''} {propertyAddress ? `(${propertyAddress})` : ''}
                    </strong>
                  </div>
                  {ownerName && (
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'مالك العقار' : 'Owner'}</span>
                      <strong style={{ color: '#0B2A4A' }}>{ownerName}</strong>
                      {cleanOwnerPhone && role === 'admin' && (
                        <a
                          href={`https://wa.me/${cleanOwnerPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginInlineStart: '0.5rem', color: '#15803D', fontSize: '0.75rem', textDecoration: 'underline' }}
                        >
                          💬 واتساب
                        </a>
                      )}
                    </div>
                  )}
                  {booking.property?.id && (
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'رابط العقار' : 'Property Page'}</span>
                      <Link
                        to={`/properties/${booking.property.id}`}
                        target="_blank"
                        style={{ color: '#2F6BFF', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        {locale === 'ar' ? 'فتح صفحة السكن ↗' : 'View Property ↗'}
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Tenant Info */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 800, color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>👤</span>
                  <span>{locale === 'ar' ? 'بيانات المستأجر (الطالب)' : 'Tenant Details'}</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'الاسم' : 'Name'}</span>
                    <strong style={{ color: '#0B2A4A' }}>{tenantName}</strong>
                  </div>
                  {booking.tenant?.email && (
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                      <strong style={{ color: '#0B2A4A' }}>{booking.tenant.email}</strong>
                    </div>
                  )}
                  {cleanTenantPhone && (
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <a
                          href={`tel:${cleanTenantPhone}`}
                          style={{ color: '#0B2A4A', fontWeight: 700, textDecoration: 'none' }}
                        >
                          📞 {tenantPhone}
                        </a>
                        <a
                          href={`https://wa.me/${cleanTenantPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          💬 واتساب
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Admin Supervision & Contract Info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                {/* Admin Assignment Block */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    🛡️ {locale === 'ar' ? 'المشرف المسؤول من داري:' : 'Assigned Admin:'}
                  </div>
                  {assignedAdminName ? (
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0B2A4A' }}>
                      ✓ {assignedAdminName}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.825rem', color: '#B45309', fontWeight: 600 }}>
                        {locale === 'ar' ? 'لم يتم التعيين لمشرف محدد بعد' : 'Not assigned yet'}
                      </span>
                      {role === 'admin' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleAssignToMe}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #2F6BFF',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {locale === 'ar' ? '🙋‍♂️ تعيين لي الآن' : 'Assign to Me'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Contract Status Block */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    📑 {locale === 'ar' ? 'حالة العقد الإلكتروني:' : 'Contract Status:'}
                  </div>
                  {booking.contract ? (
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#15803D' }}>
                      ✓ {booking.contract.status || 'ACTIVE'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.825rem', color: '#64748B' }}>
                      {locale === 'ar' ? 'يتم إصدار العقد تلقائياً عند إتمام وتأكيد الحجز' : 'Issued automatically upon confirmation'}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Notes & Creation Timestamps */}
              {booking.note && (
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#92400E', display: 'block', marginBottom: '0.2rem' }}>
                    📝 {locale === 'ar' ? 'ملاحظات وتفاصيل إضافية من الطالب:' : 'Tenant Notes:'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350F', lineHeight: 1.5 }}>
                    {booking.note}
                  </p>
                </div>
              )}

              {/* Cancel Input Modal/Block */}
              {showCancelInput && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.35rem' }}>
                    {locale === 'ar' ? 'سبب إلغاء الحجز *' : 'Cancellation Reason *'}
                  </label>
                  <textarea
                    rows={2}
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    placeholder={locale === 'ar' ? 'اكتب سبب الإلغاء ليتم إرساله في الإشعار...' : 'Enter reason for cancellation...'}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid #FCA5A5',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      marginBottom: '0.75rem',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowCancelInput(false)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      {locale === 'ar' ? 'تراجع' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('CANCELLED', cancelNote.trim() || 'تم الإلغاء')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {actionLoading ? '...' : locale === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Admin Workflow Status Actions */}
          {role === 'admin' && booking && !showCancelInput ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {booking.status === 'PENDING' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('CONTACTED', 'تم التواصل من قبل المشرف')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #0284C7',
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  📞 {locale === 'ar' ? 'تم التواصل' : 'Mark Contacted'}
                </button>
              )}

              {booking.status === 'CONTACTED' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange('CLOSED', 'تم إتمام وتأكيد الحجز رسمياً')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #16A34A',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✓ {locale === 'ar' ? 'إتمام وتأكيد الحجز' : 'Confirm / Close'}
                </button>
              )}

              {booking.status !== 'CANCELLED' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowCancelInput(true)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #FCA5A5',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  ✕ {locale === 'ar' ? 'إلغاء الحجز' : 'Cancel Booking'}
                </button>
              )}
            </div>
          ) : role === 'tenant' && booking && (booking.status || '').toUpperCase() === 'PENDING' && !showCancelInput ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setShowCancelInput(true)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
              }}
            >
              ✕ {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel Request'}
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {locale === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
