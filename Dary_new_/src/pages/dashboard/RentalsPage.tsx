import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { RentalBooking } from '../../services/tenantService';

export default function RentalsPage() {
  const { locale } = useLocale();
  const [rentals, setRentals] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<RentalBooking | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // STRICTLY GET /dashboard/rentals
      const data = await TenantService.getRentals();
      setRentals(data);
    } catch (err: any) {
      console.error('[RentalsPage] GET /dashboard/rentals failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل الإيجارات والحجوزات من الخادم.'
            : 'Could not load rentals and bookings from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

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

                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--dary-border)' }}>
                    {rental.property?.id && (
                      <Link
                        to={`/properties/${rental.property.id}`}
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
    </div>
  );
}
