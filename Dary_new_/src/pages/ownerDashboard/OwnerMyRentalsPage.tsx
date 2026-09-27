import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { RentalBooking } from '../../services/tenantService';
import { ReviewService } from '../../services/reviewService';
import { useTenantRentals } from '../../hooks/useDashboardQueries';
import { useQueryClient } from '../../lib/queryClient';

export default function OwnerMyRentalsPage() {
  const { locale } = useLocale();
  const location = useLocation();
  const queryClient = useQueryClient();
  const basePath = location.pathname.startsWith('/owner-dashboard-preview')
    ? '/owner-dashboard-preview'
    : '/owner-dashboard';

  // Cached: 30s staleTime
  const {
    data: rawRentals,
    isLoading: loading,
    error: queryErr,
    refetch: fetchRentals,
  } = useTenantRentals();

  const rentals: RentalBooking[] = Array.isArray(rawRentals) ? rawRentals : [];
  const error = queryErr
    ? (queryErr as any)?.message ||
      (locale === 'ar'
        ? 'تعذر تحميل قائمة حجوزاتك الشخصية من الخادم.'
        : 'Could not load your personal bookings from the server.')
    : null;

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<RentalBooking | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<RentalBooking | null>(null);
  const [propertyRating, setPropertyRating] = useState(5);
  const [ownerRating, setOwnerRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string | null>(null);

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    setReviewErrorMsg(null);
    setReviewSuccessMsg(null);
    try {
      await ReviewService.createReview({
        bookingId: reviewBooking.id,
        propertyRating: Number(propertyRating),
        ownerRating: Number(ownerRating),
        comment: reviewComment.trim() || undefined,
      });
      setReviewSuccessMsg(
        locale === 'ar'
          ? '✓ تم إرسال تقييمك بنجاح! شكراً لمشاركتك تجربتك.'
          : '✓ Review submitted successfully! Thank you.'
      );
      setTimeout(() => {
        setReviewBooking(null);
        setReviewSuccessMsg(null);
        setReviewComment('');
      }, 2500);
    } catch (err: any) {
      setReviewErrorMsg(
        err?.message ||
          (locale === 'ar' ? 'فشل إرسال التقييم. يرجى المحاولة لاحقاً.' : 'Failed to submit review.')
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingBooking) return;
    if (!cancelNote.trim()) {
      setCancelError(
        locale === 'ar'
          ? 'يرجى كتابة سبب إلغاء الحجز.'
          : 'Please provide a reason for cancelling the booking.'
      );
      return;
    }

    setIsSubmittingCancel(true);
    setCancelError(null);
    try {
      await TenantService.cancelBooking(cancellingBooking.id, cancelNote);
      queryClient.invalidateQueries({ queryKey: ['tenant', 'rentals'] });
      await fetchRentals();
      setCancellingBooking(null);
      setCancelNote('');
    } catch (err: any) {
      console.error('[OwnerMyRentalsPage] Cancellation error:', err);
      setCancelError(
        err?.message ||
          (locale === 'ar'
            ? 'فشل إلغاء الحجز. يرجى المحاولة لاحقًا.'
            : 'Failed to cancel booking. Please try again.')
      );
    } finally {
      setIsSubmittingCancel(false);
    }
  }

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
          {locale === 'ar' ? '✓ مؤكد ومكتمل' : '✓ Confirmed'}
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

  return (
    <div>
      {/* 1. Header Card */}
      <div className="dary-welcome-card" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dary-welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🧳</span>
            <span>{locale === 'ar' ? 'حجوزاتي وإيجاراتي الشخصية' : 'My Personal Bookings & Rentals'}</span>
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'متابعة كافة طلبات الحجز التي قمت بطلبها لنفسك في العقارات الأخرى وحالاتها المسجلة لدى منصة داري.'
              : 'Track all booking requests you made for yourself on other properties and their statuses.'}
          </p>
        </div>

        <div className="dary-welcome-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to={`${basePath}/explore`}
            className="dary-primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            <span>🧭</span>
            <span>{locale === 'ar' ? 'تصفح وحجز سكن جديد' : 'Browse & Book New Property'}</span>
          </Link>

          <Link
            to={`${basePath}/bookings`}
            className="dary-secondary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            <span>📥</span>
            <span>{locale === 'ar' ? 'طلبات الحجز الواردة على عقاراتي' : 'Incoming Bookings on My Properties'}</span>
          </Link>
        </div>
      </div>

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
          to={`${basePath}/my-rentals`}
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
          <span>🧳</span>
          <span>{locale === 'ar' ? 'حجوزاتي الشخصية' : 'My Personal Bookings'}</span>
          <span
            style={{
              padding: '0.1rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              backgroundColor: 'rgba(255,255,255,0.25)',
              color: '#FFFFFF',
            }}
          >
            {rentals.length}
          </span>
        </Link>

        <Link
          to={`${basePath}/bookings`}
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
          <span>📥</span>
          <span>{locale === 'ar' ? 'طلبات الحجز على عقاراتي' : 'Requests on My Properties'}</span>
        </Link>
      </div>

      {/* 2. Rentals Content List */}
      <div className="dary-section-card">
        <div className="dary-section-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
              {locale === 'ar' ? 'قائمة الحجوزات السارية والسابقة' : 'Current & Past Personal Bookings'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'تفاصيل الغرف، التواريخ، الرسوم، وحالة الاعتماد والتواصل مع إدارة داري والمالك.'
                : 'Room details, dates, pricing, and status updates.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchRentals()}
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
            <span>🔄</span>
            <span>{locale === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {loading ? (
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
              {locale === 'ar' ? 'جاري تحميل حجوزاتك الشخصية...' : 'Loading your bookings...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={() => fetchRentals()}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : rentals.length === 0 ? (
          <div
            style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              border: '1px dashed #CBD5E1',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🧳</div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B2A4A', margin: '0 0 0.5rem' }}>
              {locale === 'ar' ? 'لم تقم بحجز أي عقار لنفسك حتى الآن' : 'No Personal Bookings Found'}
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
              {locale === 'ar'
                ? 'إذا كنت تبحث عن سكن لنفسك أو لإقامتك في مدينة أخرى، يمكنك تصفح كافة العقارات المتاحة وتقديم طلب حجز فوراً.'
                : 'If you want to stay in student housing or book accommodation in another city, browse available properties and book directly.'}
            </p>
            <Link
              to={`${basePath}/explore`}
              className="dary-primary-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              <span>🧭</span>
              <span>{locale === 'ar' ? 'تصفح العقارات المتاحة الآن' : 'Explore Properties Now'}</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rentals.map((rental) => {
              const canCancel = (rental.status || '').toUpperCase() === 'PENDING';
              return (
                <div
                  key={rental.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: '0 2px 8px rgba(11, 42, 74, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0B2A4A', fontWeight: 800 }}>
                          {rental.property?.title || (locale === 'ar' ? 'طلب حجز سكن' : 'Booking Request')}
                        </h3>
                        {getStatusBadge(rental.status)}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                        {rental.property?.city ? `${rental.property.city} • ` : ''}
                        {rental.property?.address || ''}
                      </p>
                    </div>

                    {(rental.totalPrice || rental.room?.pricePerBed || rental.property?.startingPrice || rental.property?.price) && (
                      <div style={{ textAlign: locale === 'ar' ? 'left' : 'right' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2F6BFF' }}>
                          {Number(rental.totalPrice || rental.room?.pricePerBed || rental.property?.startingPrice || rental.property?.price).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748B', marginInlineStart: '0.35rem' }}>
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</span>
                      <strong style={{ color: '#0B2A4A' }}>
                        {rental.createdAt ? new Date(rental.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                      </strong>
                    </div>
                    {rental.room?.roomType && (
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'نوع الغرفة' : 'Room Type'}</span>
                        <strong style={{ color: '#0B2A4A' }}>{rental.room.roomType}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'عدد الأسرة' : 'Beds Requested'}</span>
                      <strong style={{ color: '#0B2A4A' }}>{rental.bedsRequested || 1}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'فترة الحجز' : 'Stay Period'}</span>
                      <strong style={{ color: '#0B2A4A' }}>
                        {rental.startDate ? new Date(rental.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                        {rental.endDate ? ` → ${new Date(rental.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}` : ''}
                      </strong>
                    </div>
                    {rental.monthsCount && (
                      <div>
                        <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'عدد الشهور' : 'Duration'}</span>
                        <strong style={{ color: '#0B2A4A' }}>
                          {rental.monthsCount} {locale === 'ar' ? 'شهر' : 'months'}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#64748B', display: 'block' }}>{locale === 'ar' ? 'رقم الحجز' : 'Booking ID'}</span>
                      <strong style={{ color: '#0B2A4A', fontFamily: 'monospace' }}>
                        {rental.id.slice(0, 8)}...
                      </strong>
                    </div>
                  </div>

                  {rental.note && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', backgroundColor: '#FFFBEB', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <strong>{locale === 'ar' ? 'ملاحظة: ' : 'Note: '}</strong>
                      {rental.note}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>

                    {/* Rate & Review Button (Only for CLOSED bookings) */}
                    {(rental.status || '').toUpperCase() === 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewBooking(rental);
                          setPropertyRating(5);
                          setOwnerRating(5);
                          setReviewComment('');
                          setReviewSuccessMsg(null);
                          setReviewErrorMsg(null);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#F59E0B',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)',
                        }}
                      >
                        <span>⭐</span>
                        <span>{locale === 'ar' ? 'تقييم السكن والمالك' : 'Review & Rate'}</span>
                      </button>
                    )}

                    {rental.property?.id && (
                      <Link
                        to={`/properties/${rental.property.id}`}
                        state={{ property: rental.property }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0B2A4A',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        {locale === 'ar' ? 'عرض تفاصيل السكن' : 'View Property'}
                      </Link>
                    )}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingBooking(rental);
                          setCancelNote('');
                          setCancelError(null);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel Request'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Booking Modal */}
      {cancellingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: '#0B2A4A', fontSize: '1.25rem', fontWeight: 700 }}>
              {locale === 'ar' ? 'تأكيد إلغاء الحجز' : 'Confirm Cancellation'}
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748B' }}>
              {locale === 'ar'
                ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ يرجى كتابة سبب الإلغاء أدناه.'
                : 'Are you sure you want to cancel this booking request? Please specify the reason.'}
            </p>

            {cancelError && (
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {cancelError}
              </div>
            )}

            <textarea
              rows={3}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder={
                locale === 'ar'
                  ? 'سبب الإلغاء (مثال: تغيير خطة السفر، حجز سكن آخر...)'
                  : 'Reason for cancellation...'
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                marginBottom: '1.5rem',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                disabled={isSubmittingCancel}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0B2A4A',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'تراجع' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {isSubmittingCancel
                  ? locale === 'ar'
                    ? 'جاري الإلغاء...'
                    : 'Cancelling...'
                  : locale === 'ar'
                  ? 'تأكيد الإلغاء'
                  : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#0B2A4A', fontSize: '1.25rem', fontWeight: 800 }}>
                {locale === 'ar' ? 'تقييم تجربتك في هذا السكن ⭐' : 'Rate Your Stay ⭐'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                style={{ fontSize: '1.2rem', color: '#94A3B8', cursor: 'pointer', border: 'none', background: 'none' }}
              >
                ✕
              </button>
            </div>

            {reviewSuccessMsg && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
                {reviewSuccessMsg}
              </div>
            )}

            {reviewErrorMsg && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
                {reviewErrorMsg}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.4rem' }}>
                  {locale === 'ar' ? 'تقييم العقار والخدمات (1 إلى 5):' : 'Property & Amenities Rating (1 to 5):'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPropertyRating(star)}
                      style={{
                        fontSize: '1.75rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: star <= propertyRating ? '#F59E0B' : '#CBD5E1',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.4rem' }}>
                  {locale === 'ar' ? 'تقييم تعاون مالك السكن (1 إلى 5):' : 'Owner Cooperation Rating (1 to 5):'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOwnerRating(star)}
                      style={{
                        fontSize: '1.75rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: star <= ownerRating ? '#F59E0B' : '#CBD5E1',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.4rem' }}>
                  {locale === 'ar' ? 'تعليقك وملاحظاتك (اختياري):' : 'Comments & Feedback (Optional):'}
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={locale === 'ar' ? 'شارك رأيك لمساعدة الآخرين...' : 'Share your experience...'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#0B2A4A',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    backgroundColor: '#F59E0B',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: submittingReview ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submittingReview
                    ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                    : (locale === 'ar' ? 'إرسال التقييم ⭐' : 'Submit Review ⭐')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
