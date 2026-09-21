import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { propertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { useAuth } from '../context/AuthContext';
import type { Property } from '../types/property';

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const { isAuthenticated, user, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isThisOwnerProperty = Boolean(
    user?.id && property && (user.id === property.ownerId || user.id === property.owner?.id)
  );

  // Favorites state
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Booking request state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [bedsRequested, setBedsRequested] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [bookingNote, setBookingNote] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingWhatsappUrl, setBookingWhatsappUrl] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Auto-select first room when property loads
  useEffect(() => {
    if (property && Array.isArray(property.rooms_) && property.rooms_.length > 0) {
      const availableRoom = property.rooms_.find((r: any) => r.availableBeds > 0) || property.rooms_[0];
      if (availableRoom?.id) {
        setSelectedRoomId(availableRoom.id);
      }
    }
  }, [property]);

  // Open booking modal
  function handleOpenBookingModal() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setBookingError(null);
    setBookingSuccess(false);
    setBookingModalOpen(true);
  }

  // Submit booking request
  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    const roomId = selectedRoomId || (property?.rooms_ && property.rooms_[0]?.id);
    if (!roomId) {
      setBookingError(locale === 'ar' ? 'يرجى اختيار الغرفة المراد حجزها' : 'Please select a room to book');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setBookingError(locale === 'ar' ? 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول' : 'End date must be after start date');
      return;
    }

    setBookingLoading(true);
    setBookingError(null);
    try {
      const res = await TenantService.createBooking(id, {
        roomId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        bedsRequested: Number(bedsRequested) || 1,
        note: bookingNote.trim() || undefined,
      });
      const waUrl = res?.data?.whatsappLink || res?.whatsappLink;
      if (waUrl) {
        setBookingWhatsappUrl(waUrl);
      }
      setBookingSuccess(true);
    } catch (err: any) {
      setBookingError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر إرسال طلب الحجز. يرجى التحقق من التواريخ والمحاولة مرة أخرى.'
            : 'Could not submit booking request. Please check dates and try again.')
      );
    } finally {
      setBookingLoading(false);
    }
  }

  // ── Load property from real API ───────────────────────────────────────────
  const fetchProperty = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await propertyService.getPropertyById(id);
      if (!data) {
        setError(locale === 'ar' ? 'لم يتم العثور على هذا العقار.' : 'Property not found.');
      } else {
        setProperty(data);
        if (isAuthenticated) {
          TenantService.recordRecentlyViewed(id).catch(() => {});
        }
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات العقار. يرجى المحاولة مرة أخرى.'
            : 'Could not load property details. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  }, [id, locale, isAuthenticated]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // ── Check if property is already favorited ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    TenantService.getFavorites()
      .then((favs) => {
        const found = favs.some(
          (f) => f.propertyId === id || f.property?.id === id || f.id === id
        );
        setIsFavorite(found);
      })
      .catch(() => {});
  }, [id, isAuthenticated]);

  // ── Toggle Favorite ───────────────────────────────────────────────────────
  async function handleToggleFavorite() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setFavLoading(true);
    try {
      if (isFavorite) {
        await TenantService.removeFavorite(id);
        setIsFavorite(false);
      } else {
        await TenantService.addFavorite(id);
        setIsFavorite(true);
      }
    } catch (err: any) {
      console.error('[PropertyDetails] Favorite toggle error:', err);
    } finally {
      setFavLoading(false);
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="page" style={{ paddingTop: '7rem' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div style={{ height: '380px', borderRadius: '20px', background: '#F1F5F9', marginBottom: '2rem', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ height: '28px', width: '60%', borderRadius: '8px', background: '#F1F5F9', marginBottom: '1rem', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ height: '18px', width: '40%', borderRadius: '8px', background: '#F1F5F9', marginBottom: '0.5rem', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ height: '18px', width: '30%', borderRadius: '8px', background: '#F1F5F9', animation: 'shimmer 1.4s infinite' }} />
        </div>
      </main>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !property) {
    return (
      <main className="page" style={{ paddingTop: '7rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '540px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.25rem', opacity: 0.4 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
            {locale === 'ar' ? 'تعذر تحميل العقار' : 'Property Not Available'}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {error || (locale === 'ar' ? 'لم يتم العثور على هذا العقار.' : 'This property could not be found.')}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchProperty}
              style={{ padding: '0.65rem 1.4rem', borderRadius: '999px', background: 'var(--color-blue)', color: '#fff', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
            >
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
            <Link
              to="/properties"
              style={{ padding: '0.65rem 1.4rem', borderRadius: '999px', background: '#F1F5F9', color: 'var(--color-navy)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}
            >
              {locale === 'ar' ? 'تصفح العقارات' : 'Browse Properties'}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const displayTitle = property.title[locale] || property.title.ar || property.title.en;
  const displayLocation = property.location[locale] || property.location.ar || property.location.en;
  const displayType = property.type[locale] || property.type.ar || property.type.en;

  // Find currently selected room for pricing calculation in modal
  const activeRoom = property.rooms_?.find((r: any) => r.id === selectedRoomId) || property.rooms_?.[0];
  const roomPricePerBed = activeRoom?.pricePerBed || property.price || 0;
  const calculatedMonths = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const estimatedTotal = roomPricePerBed * bedsRequested * calculatedMonths;

  return (
    <main className="page" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
      <div className="container" style={{ maxWidth: '900px' }}>

        {/* Back link */}
        <Link
          to="/properties"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', marginBottom: '1.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {locale === 'ar' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
          </svg>
          {locale === 'ar' ? 'العودة إلى القائمة' : 'Back to listings'}
        </Link>

        {/* Hero Image */}
        <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', marginBottom: '2rem', aspectRatio: '16/9', background: '#F1F5F9' }}>
          <img
            src={property.image}
            alt={displayTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=900&h=506&fit=crop';
            }}
          />

          {/* Favorite button overlay (tenants and guests only) */}
          {!isAdmin && !isOwner && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favLoading}
              aria-label={isFavorite ? (locale === 'ar' ? 'إزالة من المفضلة' : 'Remove from favorites') : (locale === 'ar' ? 'إضافة للمفضلة' : 'Add to favorites')}
              style={{
                position: 'absolute',
                top: '16px',
                insetInlineEnd: '16px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                color: isFavorite ? '#EF4444' : '#9CA3AF',
                fontSize: '1.2rem',
                transition: 'color 0.2s, transform 0.15s',
                opacity: favLoading ? 0.6 : 1,
              }}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
        </div>

        {/* Property Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.5rem', lineHeight: 1.25 }}>
              {displayTitle}
            </h1>

            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {displayLocation}
            </p>

            {/* Specs row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy)', background: '#F1F5F9', padding: '0.4rem 0.9rem', borderRadius: '999px' }}>
                🏠 {displayType}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy)', background: '#F1F5F9', padding: '0.4rem 0.9rem', borderRadius: '999px' }}>
                🛏 {property.rooms_?.length || property.bedrooms} {locale === 'ar' ? 'غرف' : 'Rooms'}
              </span>
              {property.status && property.status !== 'APPROVED' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '0.4rem 0.9rem', borderRadius: '999px' }}>
                  ⏳ {property.status === 'PENDING' ? (locale === 'ar' ? 'قيد مراجعة الإدارة' : 'Pending Review') : property.status}
                </span>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
                  {locale === 'ar' ? 'عن السكن' : 'About Property'}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                  {property.description}
                </p>
              </div>
            )}

            {/* Rooms list */}
            {Array.isArray(property.rooms_) && property.rooms_.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
                  {locale === 'ar' ? '🛏️ خيارات الغرف والأسرّة المتاحة' : '🛏️ Available Rooms & Beds'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {property.rooms_.map((room: any, idx: number) => (
                    <div
                      key={room.id || idx}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                      }}
                    >
                      {room.photoUrl && (
                        <img
                          src={room.photoUrl}
                          alt={`Room ${idx + 1}`}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '0.75rem' }}
                        />
                      )}
                      <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        {room.roomType === 'SINGLE' ? (locale === 'ar' ? 'غرفة فردية' : 'Single Room') :
                         room.roomType === 'DOUBLE' ? (locale === 'ar' ? 'غرفة ثنائية' : 'Double Room') :
                         room.roomType === 'TRIPLE' ? (locale === 'ar' ? 'غرفة ثلاثية' : 'Triple Room') :
                         room.roomType === 'QUAD' ? (locale === 'ar' ? 'غرفة رباعية' : 'Quad Room') : room.roomType}
                      </div>
                      <div style={{ color: 'var(--color-blue)', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                        {room.pricePerBed} {property.currency} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {locale === 'ar' ? 'سرير شهرياً' : 'bed/mo'}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        {locale === 'ar' ? `المتاح: ${room.availableBeds} من أصل ${room.totalBeds} أسرّة` : `${room.availableBeds} of ${room.totalBeds} beds available`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {Array.isArray(property.amenities) && property.amenities.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.75rem' }}>
                  {locale === 'ar' ? '✨ المرافق والخدمات المشمولة' : '✨ Amenities & Inclusions'}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {property.amenities.map((item: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: '#EFF6FF',
                        color: 'var(--color-blue)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price + CTA card */}
          <div style={{ minWidth: '220px', border: '1px solid rgba(11,42,74,0.1)', borderRadius: '16px', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 20px rgba(11,42,74,0.07)', flexShrink: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              {locale === 'ar' ? 'السعر الشهري' : 'Monthly Price'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-blue)', lineHeight: 1, marginBottom: '0.35rem' }}>
              {property.price.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              {property.currency} / {locale === 'ar' ? 'شهر' : 'month'}
            </div>

            {isAdmin ? (
              <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>🛡️</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E1B4B', marginBottom: '0.35rem' }}>
                  {locale === 'ar' ? 'وضع مدير النظام (Admin View)' : 'System Administrator View'}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#4338CA', margin: '0 0 1rem', lineHeight: 1.5 }}>
                  {locale === 'ar'
                    ? 'أنت تتصفح هذا السكن بصلاحيات الإدارة العامة. يمكنك مراجعة وتعديل وإدارة كافة العقارات والطلبات عبر لوحة تحكم الأدمن.'
                    : 'You are viewing this property as an administrator. Manage properties and approvals in the admin dashboard.'}
                </p>
                <Link
                  to="/admin/properties"
                  style={{
                    display: 'block',
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#0B2A4A',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  {locale === 'ar' ? 'إدارة العقارات في لوحة الأدمن ←' : 'Manage Properties in Admin ←'}
                </Link>
              </div>
            ) : isOwner ? (
              isThisOwnerProperty ? (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '12px', padding: '1rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🏢</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'أنت مالك هذا السكن' : 'You own this property'}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#15803D', margin: '0 0 0.75rem' }}>
                    {locale === 'ar' ? 'يمكنك متابعة حجوزات هذا العقار وتعديل بياناته عبر لوحة تحكم المالك.' : 'Manage this listing and track bookings in your owner dashboard.'}
                  </p>
                  <Link
                    to="/owner-dashboard/properties"
                    style={{
                      display: 'block',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}
                  >
                    {locale === 'ar' ? 'إدارة العقار في لوحة التحكم ←' : 'Manage in Dashboard →'}
                  </Link>
                </div>
              ) : (
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '1rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.35rem' }}>
                    {locale === 'ar' ? 'أنت مسجل كمالك عقار' : 'Registered as Property Owner'}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 0.75rem' }}>
                    {locale === 'ar' ? 'طلبات الحجز مخصصة للطلاب والمستأجرين. يمكنك إدارة عقاراتك عبر لوحة التحكم.' : 'Booking is for tenants/students. Manage your listings in the owner dashboard.'}
                  </p>
                  <Link
                    to="/owner-dashboard"
                    style={{
                      display: 'block',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: '#0B2A4A',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                    }}
                  >
                    {locale === 'ar' ? 'لوحة تحكم المالك ←' : 'Owner Dashboard →'}
                  </Link>
                </div>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenBookingModal}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: 'var(--color-blue)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '0.75rem',
                    boxShadow: '0 4px 14px rgba(47, 107, 255, 0.3)',
                  }}
                >
                  {locale === 'ar' ? 'طلب حجز 📅' : 'Request to Book 📅'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={favLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: isFavorite ? '#EF4444' : 'var(--color-navy)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: '1px solid rgba(11,42,74,0.15)',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                  }}
                >
                  {isFavorite
                    ? (locale === 'ar' ? '❤️ محفوظ في المفضلة' : '❤️ Saved')
                    : (locale === 'ar' ? '🤍 حفظ في المفضلة' : '🤍 Save to Favorites')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer Note (for students/guests only) */}
        {!isAdmin && !isOwner && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2rem', borderTop: '1px solid rgba(11,42,74,0.07)', paddingTop: '1rem' }}>
            {locale === 'ar'
              ? 'للحصول على مزيد من التفاصيل، قم بإرسال طلب الحجز وسيتواصل معك المشرف لتنسيق الحجز عبر الواتساب.'
              : 'For more details, submit a booking request and an admin will coordinate with you via WhatsApp.'}
          </p>
        )}
      </div>

      {/* Booking Modal */}
      {bookingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {locale === 'ar' ? '📅 تقديم طلب حجز سكن' : '📅 Submit Booking Request'}
              </h3>
              <button
                type="button"
                onClick={() => setBookingModalOpen(false)}
                style={{ fontSize: '1.2rem', color: '#94A3B8', cursor: 'pointer', border: 'none', background: 'none' }}
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A', marginBottom: '0.5rem' }}>
                  {locale === 'ar' ? 'تم تسجيل طلب الحجز بنجاح!' : 'Booking Request Submitted!'}
                </h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  {locale === 'ar'
                    ? 'سيقوم المشرف بمراجعة طلبك والتواصل معك ومع المالك عبر الواتساب لتأكيد الحجز.'
                    : 'An admin will review your request and reach out to you via WhatsApp.'}
                </p>

                {bookingWhatsappUrl ? (
                  <a
                    href={bookingWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.85rem 1.75rem',
                      borderRadius: '12px',
                      backgroundColor: '#25D366',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '1rem',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                      marginBottom: '1rem',
                    }}
                  >
                    <span>💬</span>
                    <span>{locale === 'ar' ? 'متابعة وتأكيد الحجز عبر واتساب' : 'Continue on WhatsApp'}</span>
                  </a>
                ) : null}

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingModalOpen(false);
                      setBookingSuccess(false);
                    }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      color: 'var(--color-navy)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {locale === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {bookingError && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ {bookingError}
                  </div>
                )}

                {/* Select Room */}
                {Array.isArray(property.rooms_) && property.rooms_.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-navy)' }}>
                      {locale === 'ar' ? 'اختر الغرفة المراد حجزها *' : 'Select Room *'}
                    </label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      {property.rooms_.map((r: any, i: number) => (
                        <option key={r.id || i} value={r.id}>
                          {r.roomType} — {r.pricePerBed} {property.currency} / {locale === 'ar' ? 'سرير' : 'bed'} ({r.availableBeds} {locale === 'ar' ? 'أسرّة متاحة' : 'beds available'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Beds Requested */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-navy)' }}>
                    {locale === 'ar' ? 'عدد الأسرّة المطلوبة *' : 'Beds Requested *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={activeRoom?.availableBeds || 4}
                    value={bedsRequested}
                    onChange={(e) => setBedsRequested(Math.max(1, Number(e.target.value)))}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-navy)' }}>
                      {locale === 'ar' ? 'تاريخ البداية / الوصول *' : 'Start Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-navy)' }}>
                      {locale === 'ar' ? 'تاريخ النهاية / المغادرة *' : 'End Date *'}
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Total Price preview */}
                <div style={{ padding: '1rem', backgroundColor: '#F0FDF4', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                      {locale === 'ar' ? `المدة المقدرة: ${calculatedMonths} شهور` : `Est. Duration: ${calculatedMonths} months`}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-navy)', fontWeight: 700 }}>
                      {locale === 'ar' ? 'إجمالي تكلفة الإقامة:' : 'Estimated Total:'}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16A34A' }}>
                    {estimatedTotal.toLocaleString()} {property.currency}
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-navy)' }}>
                    {locale === 'ar' ? 'ملاحظات إضافية (اختياري)' : 'Notes (Optional)'}
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder={locale === 'ar' ? 'مثال: تفضيل سرير بجوار النافذة، موعد الوصول المتوقع...' : 'e.g. Preferred arrival time...'}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    style={{ padding: '0.7rem 1.25rem', borderRadius: '10px', backgroundColor: '#F1F5F9', color: 'var(--color-navy)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', border: 'none' }}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    style={{
                      padding: '0.7rem 1.5rem',
                      borderRadius: '10px',
                      backgroundColor: bookingLoading ? '#94A3B8' : 'var(--color-blue)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: bookingLoading ? 'not-allowed' : 'pointer',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(47, 107, 255, 0.25)',
                    }}
                  >
                    {bookingLoading ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (locale === 'ar' ? 'تأكيد طلب الحجز 🚀' : 'Confirm Request 🚀')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
