import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { RentalBooking } from '../../services/tenantService';
import { ContractService } from '../../services/contractService';
import type { ContractItem } from '../../services/contractService';
import { ReviewService } from '../../services/reviewService';
import { useTenantRentals } from '../../hooks/useDashboardQueries';

export default function RentalsPage() {
  const { locale } = useLocale();

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
        ? 'تعذر تحميل الإيجارات والحجوزات من الخادم.'
        : 'Could not load rentals and bookings from the server.')
    : null;

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<RentalBooking | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Digital Contract State
  const [contractBooking, setContractBooking] = useState<RentalBooking | null>(null);
  const [contractData, setContractData] = useState<ContractItem | null>(null);
  const [loadingContract, setLoadingContract] = useState(false);
  const [signingFile, setSigningFile] = useState<File | null>(null);
  const [uploadingSign, setUploadingSign] = useState(false);
  const [contractMsg, setContractMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState<RentalBooking | null>(null);
  const [propertyRating, setPropertyRating] = useState(5);
  const [ownerRating, setOwnerRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string | null>(null);

  async function openContractModal(booking: RentalBooking) {
    setContractBooking(booking);
    setContractData(null);
    setSigningFile(null);
    setContractMsg(null);
    setLoadingContract(true);
    try {
      const data = await ContractService.getContractByBooking(booking.id);
      setContractData(data);
    } catch (err: any) {
      console.error('Failed to load contract:', err);
    } finally {
      setLoadingContract(false);
    }
  }

  async function handleTenantSign() {
    if (!contractData || !signingFile) return;
    setUploadingSign(true);
    setContractMsg(null);
    try {
      await ContractService.tenantSignContract(contractData.id, signingFile);
      setContractMsg({
        type: 'success',
        text: locale === 'ar' ? 'تم رفع نسختك الموقعة بنجاح! بانتظار توقيع المالك واعتماد الإدارة.' : 'Signed contract uploaded successfully!',
      });
      if (contractBooking) {
        const updated = await ContractService.getContractByBooking(contractBooking.id);
        setContractData(updated);
      }
    } catch (err: any) {
      setContractMsg({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل رفع العقد الموقع. يرجى التأكد من رفع ملف PDF.' : 'Failed to upload signed contract. Ensure you upload a valid PDF.'),
      });
    } finally {
      setUploadingSign(false);
    }
  }

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
      setReviewSuccessMsg(locale === 'ar' ? '✓ تم إرسال تقييمك بنجاح! شكراً لمشاركتك تجربتك.' : '✓ Review submitted successfully! Thank you.');
      setTimeout(() => {
        setReviewBooking(null);
        setReviewSuccessMsg(null);
        setReviewComment('');
      }, 2500);
    } catch (err: any) {
      setReviewErrorMsg(err?.message || (locale === 'ar' ? 'فشل إرسال التقييم. يرجى المحاولة لاحقاً.' : 'Failed to submit review.'));
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
      // Refresh list
      await fetchRentals();
      setCancellingBooking(null);
      setCancelNote('');
    } catch (err: any) {
      console.error('[RentalsPage] Cancellation error:', err);
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

  function getStatusBadge(status: string) {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') {
      return (
        <span className="dary-badge dary-badge-pending">
          {locale === 'ar' ? 'قيد المراجعة' : 'Pending'}
        </span>
      );
    }
    if (s === 'CONTACTED') {
      return (
        <span className="dary-badge dary-badge-contacted">
          {locale === 'ar' ? 'تم التواصل' : 'Contacted'}
        </span>
      );
    }
    if (s === 'CLOSED') {
      return (
        <span className="dary-badge dary-badge-closed">
          {locale === 'ar' ? 'مكتمل' : 'Closed'}
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="dary-badge dary-badge-cancelled">
          {locale === 'ar' ? 'ملغي' : 'Cancelled'}
        </span>
      );
    }
    return <span className="dary-badge">{status}</span>;
  }

  return (
    <div>
      <div className="dary-section-card">
        <div className="dary-section-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dary-navy)', margin: 0 }}>
              {locale === 'ar' ? 'إيجاراتي وحجوزاتي' : 'My Rentals & Bookings'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'متابعة كافة طلبات الحجز الخاصة بك وحالتها الحالية.'
                : 'Track all your rental booking requests and current statuses.'}
            </p>
          </div>

          <Link to="/properties" className="dary-primary-btn" style={{ padding: '0.6rem 1.15rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{locale === 'ar' ? 'حجز سكن جديد' : 'New Booking'}</span>
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل الإيجارات...' : 'Loading rentals...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchRentals}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : rentals.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">📋</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'لا توجد حجوزات حتى الآن' : 'No Rentals Found'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'لم يتم تسجيل أي طلبات حجز لحسابك بعد. تصفح خيارات السكن الطلابي المتاحة وقدّم طلبك بسهولة.'
                : 'No rental requests registered on your account yet. Explore available student housing options and submit your booking.'}
            </p>
            <Link to="/properties" className="dary-primary-btn">
              {locale === 'ar' ? 'تصفح السكنات' : 'Explore Properties'}
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
                    border: '1px solid var(--dary-border)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                          {rental.property?.title || (locale === 'ar' ? 'طلب حجز سكن' : 'Booking Request')}
                        </h3>
                        {getStatusBadge(rental.status)}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dary-muted)' }}>
                        {rental.property?.city ? `${rental.property.city} • ` : ''}
                        {rental.property?.address || ''}
                      </p>
                    </div>

                    {(rental.totalPrice || rental.room?.pricePerBed || rental.property?.startingPrice || rental.property?.price) && (
                      <div style={{ textAlign: locale === 'ar' ? 'left' : 'right' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dary-blue)' }}>
                          {rental.totalPrice || rental.room?.pricePerBed || rental.property?.startingPrice || rental.property?.price}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--dary-muted)', marginInlineStart: '0.35rem' }}>
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
                      <span style={{ color: 'var(--dary-muted)', display: 'block' }}>{locale === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</span>
                      <strong style={{ color: 'var(--dary-navy)' }}>
                        {rental.createdAt ? new Date(rental.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                      </strong>
                    </div>
                    {rental.room?.roomType && (
                      <div>
                        <span style={{ color: 'var(--dary-muted)', display: 'block' }}>{locale === 'ar' ? 'نوع الغرفة' : 'Room Type'}</span>
                        <strong style={{ color: 'var(--dary-navy)' }}>{rental.room.roomType}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--dary-muted)', display: 'block' }}>{locale === 'ar' ? 'عدد الأسرة' : 'Beds Requested'}</span>
                      <strong style={{ color: 'var(--dary-navy)' }}>{rental.bedsRequested || 1}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--dary-muted)', display: 'block' }}>{locale === 'ar' ? 'فترة الحجز' : 'Stay Period'}</span>
                      <strong style={{ color: 'var(--dary-navy)' }}>
                        {rental.startDate ? new Date(rental.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                        {rental.endDate ? ` → ${new Date(rental.endDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}` : ''}
                      </strong>
                    </div>
                    {rental.monthsCount && (
                      <div>
                        <span style={{ color: 'var(--dary-muted)', display: 'block' }}>{locale === 'ar' ? 'عدد الشهور' : 'Duration'}</span>
                        <strong style={{ color: 'var(--dary-navy)' }}>
                          {rental.monthsCount} {locale === 'ar' ? 'شهر' : 'months'}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--dary-muted)', display: 'block' }}>{locale === 'ar' ? 'رقم الحجز' : 'Booking ID'}</span>
                      <strong style={{ color: 'var(--dary-navy)', fontFamily: 'monospace' }}>
                        {rental.id.slice(0, 8)}...
                      </strong>
                    </div>
                  </div>

                  {rental.note && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dary-muted)', backgroundColor: '#FFFBEB', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      <strong>{locale === 'ar' ? 'ملاحظة: ' : 'Note: '}</strong>
                      {rental.note}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--dary-border)' }}>
                    {/* Electronic Contract Button */}
                    <button
                      type="button"
                      onClick={() => openContractModal(rental)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #2F6BFF',
                        backgroundColor: '#EFF6FF',
                        color: '#2F6BFF',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>📝</span>
                      <span>{locale === 'ar' ? 'العقد الإلكتروني' : 'Digital Contract'}</span>
                    </button>

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
                          border: '1px solid var(--dary-border)',
                          backgroundColor: '#FFFFFF',
                          color: 'var(--dary-navy)',
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
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--dary-navy)', fontSize: '1.25rem', fontWeight: 700 }}>
              {locale === 'ar' ? 'تأكيد إلغاء الحجز' : 'Confirm Booking Cancellation'}
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ يرجى كتابة سبب الإلغاء أدناه (مطلوب من الخادم).'
                : 'Are you sure you want to cancel this booking request? Please specify the reason below (required by the backend).'}
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
                  ? 'سبب الإلغاء (مثال: وجدت سكنًا آخر، تغيير موعد الدراسة...)'
                  : 'Cancellation reason (e.g. found another place, schedule changed...)'
              }
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--dary-border)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                marginBottom: '1.5rem',
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
                  border: '1px solid var(--dary-border)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--dary-navy)',
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

      {/* Digital Contract Modal */}
      {contractBooking && (
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
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--dary-navy)', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📝</span>
                <span>{locale === 'ar' ? 'العقد الإلكتروني للحجز' : 'Digital Rental Contract'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setContractBooking(null)}
                style={{ fontSize: '1.2rem', color: '#94A3B8', cursor: 'pointer', border: 'none', background: 'none' }}
              >
                ✕
              </button>
            </div>

            {loadingContract ? (
              <div style={{ padding: '2.5rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#2F6BFF', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{locale === 'ar' ? 'جاري جلب بيانات العقد...' : 'Loading contract...'}</p>
              </div>
            ) : !contractData ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                  {locale === 'ar' ? 'لم يتم إنشاء مسودة العقد بعد' : 'No Contract Draft Created Yet'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--dary-muted)', lineHeight: 1.6 }}>
                  {locale === 'ar'
                    ? 'سيقوم المشرف العام بإعداد ورفع مسودة العقد بعد التنسيق معكم عبر الواتساب، وستظهر هنا فور إرسالها.'
                    : 'The administration will upload the contract draft after coordination on WhatsApp.'}
                </p>
                <button
                  type="button"
                  onClick={() => setContractBooking(null)}
                  style={{
                    marginTop: '1.5rem',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {contractMsg && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: contractMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${contractMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                      color: contractMsg.type === 'success' ? '#166534' : '#991B1B',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    {contractMsg.text}
                  </div>
                )}

                {/* Contract Status Overview */}
                <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--dary-muted)', display: 'block' }}>
                      {locale === 'ar' ? 'رقم العقد:' : 'Contract Number:'}
                    </span>
                    <strong style={{ color: 'var(--dary-navy)', fontFamily: 'monospace' }}>
                      {contractData.contractNumber || contractData.id.slice(0, 8)}
                    </strong>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor:
                          contractData.status === 'ACTIVE'
                            ? '#DCFCE7'
                            : contractData.status === 'SIGNED'
                            ? '#EFF6FF'
                            : contractData.status === 'SENT'
                            ? '#FEF9C3'
                            : '#F1F5F9',
                        color:
                          contractData.status === 'ACTIVE'
                            ? '#15803D'
                            : contractData.status === 'SIGNED'
                            ? '#1D4ED8'
                            : contractData.status === 'SENT'
                            ? '#A16207'
                            : '#475569',
                      }}
                    >
                      {contractData.status}
                    </span>
                  </div>
                </div>

                {/* Download Draft PDF */}
                {contractData.draftPdfUrl && (
                  <div style={{ padding: '1rem', border: '1px dashed #CBD5E1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--dary-navy)', display: 'block' }}>
                        {locale === 'ar' ? 'مسودة العقد الرسمية' : 'Official Contract Draft'}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
                        {locale === 'ar' ? 'يرجى مراجعة بنود العقد وتوقيعها' : 'Review and sign terms'}
                      </span>
                    </div>
                    <a
                      href={contractData.draftPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#0B2A4A',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span>📥</span>
                      <span>{locale === 'ar' ? 'تحميل المسودة (PDF)' : 'Download PDF'}</span>
                    </a>
                  </div>
                )}

                {/* Signatures status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: contractData.tenantSignedAt ? '#F0FDF4' : '#FFFBEB', borderRadius: '8px', border: `1px solid ${contractData.tenantSignedAt ? '#BBF7D0' : '#FDE68A'}` }}>
                    <div style={{ fontWeight: 700, color: contractData.tenantSignedAt ? '#15803D' : '#B45309' }}>
                      {contractData.tenantSignedAt ? '✓ تم توقيع المستأجر' : '⏳ بانتظار توقيعك'}
                    </div>
                    {contractData.tenantSignedAt && (
                      <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                        {new Date(contractData.tenantSignedAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0.75rem', backgroundColor: contractData.ownerSignedAt ? '#F0FDF4' : '#F8FAFC', borderRadius: '8px', border: `1px solid ${contractData.ownerSignedAt ? '#BBF7D0' : '#E2E8F0'}` }}>
                    <div style={{ fontWeight: 700, color: contractData.ownerSignedAt ? '#15803D' : '#64748B' }}>
                      {contractData.ownerSignedAt ? '✓ تم توقيع المالك' : '⏳ بانتظار توقيع المالك'}
                    </div>
                    {contractData.ownerSignedAt && (
                      <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.25rem' }}>
                        {new Date(contractData.ownerSignedAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Tenant Signed PDF */}
                {!contractData.tenantSignedAt && contractData.status !== 'CANCELLED' && (
                  <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                      {locale === 'ar' ? 'رفع العقد بعد التوقيع (ملف PDF)' : 'Upload Signed Contract (PDF)'}
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setSigningFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '0.85rem', marginBottom: '0.75rem', width: '100%' }}
                    />
                    <button
                      type="button"
                      disabled={!signingFile || uploadingSign}
                      onClick={handleTenantSign}
                      style={{
                        padding: '0.6rem 1.25rem',
                        backgroundColor: signingFile && !uploadingSign ? '#16A34A' : '#94A3B8',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: signingFile && !uploadingSign ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {uploadingSign
                        ? (locale === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                        : (locale === 'ar' ? 'تأكيد ورفع التوقيع ✍️' : 'Upload Signature ✍️')}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setContractBooking(null)}
                    style={{
                      padding: '0.55rem 1.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: 'none',
                      fontWeight: 600,
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
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--dary-navy)', fontSize: '1.25rem', fontWeight: 800 }}>
                {locale === 'ar' ? '⭐ تقييم إقامتك وسكنك' : '⭐ Rate & Review Your Stay'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                style={{ fontSize: '1.2rem', color: '#94A3B8', cursor: 'pointer', border: 'none', background: 'none' }}
              >
                ✕
              </button>
            </div>

            {reviewSuccessMsg ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h4 style={{ color: '#16A34A', fontWeight: 800, margin: '0 0 0.5rem' }}>{reviewSuccessMsg}</h4>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {reviewErrorMsg && (
                  <div style={{ padding: '0.65rem 0.9rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem' }}>
                    {reviewErrorMsg}
                  </div>
                )}

                {/* Property Rating */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '0.35rem' }}>
                    {locale === 'ar' ? 'تقييم العقار والغرفة (1 إلى 5):' : 'Property & Room Rating (1-5):'}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPropertyRating(star)}
                        style={{
                          fontSize: '1.5rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: star <= propertyRating ? '#F59E0B' : '#CBD5E1',
                        }}
                      >
                        ★
                      </button>
                    ))}
                    <span style={{ marginInlineStart: '0.5rem', alignSelf: 'center', fontWeight: 700, color: '#F59E0B' }}>
                      {propertyRating} / 5
                    </span>
                  </div>
                </div>

                {/* Owner Rating */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '0.35rem' }}>
                    {locale === 'ar' ? 'تقييم المالك وتعامله (1 إلى 5):' : 'Owner Rating (1-5):'}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setOwnerRating(star)}
                        style={{
                          fontSize: '1.5rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: star <= ownerRating ? '#F59E0B' : '#CBD5E1',
                        }}
                      >
                        ★
                      </button>
                    ))}
                    <span style={{ marginInlineStart: '0.5rem', alignSelf: 'center', fontWeight: 700, color: '#F59E0B' }}>
                      {ownerRating} / 5
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--dary-navy)', marginBottom: '0.35rem' }}>
                    {locale === 'ar' ? 'تعليقك وانطباعك عن السكن (اختياري):' : 'Your Review Comment (Optional):'}
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={
                      locale === 'ar'
                        ? 'وضح مميزات السكن أو أي ملاحظات تفيد الطلاب الآخرين...'
                        : 'Share your experience to help fellow students...'
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setReviewBooking(null)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: 'none',
                      fontWeight: 600,
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
                      cursor: submittingReview ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingReview
                      ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                      : (locale === 'ar' ? 'إرسال التقييم ⭐' : 'Submit Review ⭐')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
