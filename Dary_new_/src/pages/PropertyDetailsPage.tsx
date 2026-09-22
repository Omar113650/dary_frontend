import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { propertyService } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { ReportService } from '../services/reportService';
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

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  // Report Property state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('الصور لا تطابق الواقع.');
  const [reportDescription, setReportDescription] = useState('');
  const [reportPriority, setReportPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  function handleOpenReportModal() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setReportError(null);
    setReportSuccess(false);
    setReportModalOpen(true);
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const fullDesc = reportDescription.trim()
        ? `${reportReason} - ${reportDescription.trim()}`
        : reportReason;

      await ReportService.createReport({
        reportedType: 'property',
        reportedPropertyId: id,
        description: fullDesc,
        priority: reportPriority,
      });

      setReportSuccess(true);
    } catch (err: any) {
      console.error('[PropertyDetailsPage] createReport failed:', err);
      setReportError(
        err?.message ||
          (locale === 'ar'
            ? 'فشل إرسال البلاغ. يرجى المحاولة مرة أخرى لاحقًا.'
            : 'Failed to submit report. Please try again later.')
      );
    } finally {
      setReportLoading(false);
    }
  }

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

  // ── Collect and deduplicate all property images ─────────────────────────────
  const allImages: Array<{ url: string; category?: string }> = (() => {
    const list: Array<{ url: string; category?: string }> = [];
    const seen = new Set<string>();

    const add = (item: any, defaultCat = 'general') => {
      if (!item) return;
      const url = typeof item === 'string' ? item : item?.url;
      if (!url || typeof url !== 'string' || url.startsWith('file://') || seen.has(url)) return;
      seen.add(url);
      list.push({
        url,
        category: (typeof item === 'object' && item?.category) || defaultCat,
      });
    };

    // Primary image
    if (property.image) add(property.image, 'main');
    // Multiple images
    if (Array.isArray(property.images)) {
      property.images.forEach((img: any) => add(img));
    }
    // Photos arrays
    if (Array.isArray(property.photos)) {
      property.photos.forEach((img: any) => add(img));
    }
    if (Array.isArray(property.imageUrls)) {
      property.imageUrls.forEach((img: any) => add(img));
    }
    if (Array.isArray(property.kitchenPhotos)) {
      property.kitchenPhotos.forEach((img: any) => add(img, 'kitchen'));
    }
    if (Array.isArray(property.bathroomPhotos)) {
      property.bathroomPhotos.forEach((img: any) => add(img, 'bathroom'));
    }
    if (Array.isArray(property.livingRoomPhotos)) {
      property.livingRoomPhotos.forEach((img: any) => add(img, 'livingRoom'));
    }
    if (Array.isArray(property.roomPhotos)) {
      property.roomPhotos.forEach((img: any) => add(img, 'room'));
    }
    // Room-specific photos
    if (Array.isArray(property.rooms_)) {
      property.rooms_.forEach((r: any) => {
        if (r?.photoUrl) add(r.photoUrl, 'room');
      });
    }

    if (list.length === 0 && property.image) {
      list.push({ url: property.image, category: 'main' });
    }
    return list;
  })();

  const currentImage = allImages[activeImageIndex] || allImages[0] || { url: property.image, category: 'main' };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') {
        locale === 'ar' ? handlePrevImage() : handleNextImage();
      }
      if (e.key === 'ArrowLeft') {
        locale === 'ar' ? handleNextImage() : handlePrevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, allImages.length, locale]);

  const getCategoryLabel = (cat?: string) => {
    if (!cat) return null;
    const catMap: Record<string, { ar: string; en: string }> = {
      room: { ar: 'غرفة', en: 'Room' },
      kitchen: { ar: 'مطبخ', en: 'Kitchen' },
      bathroom: { ar: 'حمام', en: 'Bathroom' },
      livingRoom: { ar: 'غرفة معيشة', en: 'Living Room' },
      main: { ar: 'الواجهة الرئيسية', en: 'Main' },
      general: { ar: 'عام', en: 'General' },
    };
    const c = catMap[cat];
    return c ? (locale === 'ar' ? c.ar : c.en) : cat;
  };

  // Owner details helper
  const ownerName = property.owner?.firstName
    ? `${property.owner.firstName} ${property.owner.lastName || ''}`.trim()
    : property.owner?.name || (locale === 'ar' ? 'مالك موثق في داري' : 'Verified Dary Host');
  const ownerPhone = property.owner?.whatsappPhone || property.owner?.phone;

  return (
    <main className="page" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>

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

        {/* ── Multi-Image Interactive Gallery ──────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          {/* Main Photo Viewport */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              maxHeight: '480px',
              background: '#0B2A4A',
              cursor: 'zoom-in',
              boxShadow: '0 8px 30px rgba(11, 42, 74, 0.12)',
            }}
          >
            <img
              src={currentImage.url}
              alt={`${displayTitle} - ${activeImageIndex + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.25s ease' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=900&h=506&fit=crop';
              }}
            />

            {/* Top-start: Image Counter Badge & Category */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                insetInlineStart: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 2,
              }}
            >
              <span
                style={{
                  backgroundColor: 'rgba(11, 42, 74, 0.82)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                <span>📷</span>
                <span>{activeImageIndex + 1} / {allImages.length}</span>
              </span>

              {getCategoryLabel(currentImage.category) && (
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    color: 'var(--color-navy)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {getCategoryLabel(currentImage.category)}
                </span>
              )}
            </div>

            {/* Top-end: Zoom Button & Favorite Toggle */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                insetInlineEnd: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 2,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                title={locale === 'ar' ? 'عرض الصور بحجم كامل' : 'View Fullscreen'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(6px)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  transition: 'transform 0.15s ease',
                }}
              >
                🔍
              </button>

              {!isAdmin && !isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite();
                  }}
                  disabled={favLoading}
                  aria-label={isFavorite ? (locale === 'ar' ? 'إزالة من المفضلة' : 'Remove from favorites') : (locale === 'ar' ? 'إضافة للمفضلة' : 'Add to favorites')}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(6px)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    opacity: favLoading ? 0.6 : 1,
                  }}
                >
                  {isFavorite ? '❤️' : '🤍'}
                </button>
              )}
            </div>

            {/* Left & Right Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  title={locale === 'ar' ? 'الصورة السابقة' : 'Previous Photo'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineStart: '16px',
                    transform: 'translateY(-50%)',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(6px)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    color: 'var(--color-navy)',
                    zIndex: 2,
                    transition: 'transform 0.15s ease, background-color 0.2s',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {locale === 'ar' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  title={locale === 'ar' ? 'الصورة التالية' : 'Next Photo'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '16px',
                    transform: 'translateY(-50%)',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(6px)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    color: 'var(--color-navy)',
                    zIndex: 2,
                    transition: 'transform 0.15s ease, background-color 0.2s',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {locale === 'ar' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Thumbnails Row */}
          {allImages.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                overflowX: 'auto',
                paddingTop: '0.85rem',
                paddingBottom: '0.4rem',
                scrollbarWidth: 'thin',
              }}
            >
              {allImages.map((img, idx) => {
                const isSelected = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      position: 'relative',
                      width: '100px',
                      height: '68px',
                      flexShrink: 0,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isSelected ? '3px solid var(--color-blue)' : '2px solid #E2E8F0',
                      opacity: isSelected ? 1 : 0.65,
                      transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      padding: 0,
                      backgroundColor: '#0F172A',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={`Thumb ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=200&h=130&fit=crop';
                      }}
                    />
                    {getCategoryLabel(img.category) && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '3px',
                          insetInlineEnd: '3px',
                          fontSize: '0.65rem',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      >
                        {getCategoryLabel(img.category)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Main Two-Column Layout ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2rem', alignItems: 'start' }}>
          <div>
            {/* Header: Title & Badges */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                {property.status && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.8rem',
                      borderRadius: '999px',
                      backgroundColor: property.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7',
                      color: property.status === 'APPROVED' ? '#15803D' : '#D97706',
                    }}
                  >
                    {property.status === 'APPROVED'
                      ? (locale === 'ar' ? '✓ معتمد وموثق من داري' : '✓ Verified Listing')
                      : property.status === 'PENDING'
                      ? (locale === 'ar' ? '⏳ قيد مراجعة الإدارة' : 'Pending Review')
                      : property.status}
                  </span>
                )}

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.8rem',
                    borderRadius: '999px',
                    backgroundColor: property.propertyClass === 'LUXURY' ? '#FEF9C3' : '#F1F5F9',
                    color: property.propertyClass === 'LUXURY' ? '#A16207' : 'var(--color-navy)',
                  }}
                >
                  {property.propertyClass === 'LUXURY'
                    ? (locale === 'ar' ? '⭐ فئة فاخرة (Luxury)' : '⭐ Luxury Class')
                    : (locale === 'ar' ? '🏷️ فئة اقتصادية قياسية' : 'Standard Class')}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.35rem 0.8rem',
                    borderRadius: '999px',
                    backgroundColor: property.genderAllowed === 'female_only' ? '#FCE7F3' : property.genderAllowed === 'male_only' ? '#E0F2FE' : '#F3E8FF',
                    color: property.genderAllowed === 'female_only' ? '#BE185D' : property.genderAllowed === 'male_only' ? '#0369A1' : '#6B21A8',
                  }}
                >
                  {property.genderAllowed === 'female_only'
                    ? (locale === 'ar' ? '👩‍🎓 سكن طالبات (إناث فقط)' : 'Female Only 👩‍🎓')
                    : property.genderAllowed === 'male_only'
                    ? (locale === 'ar' ? '👨‍🎓 سكن طلاب (شباب فقط)' : 'Male Only 👨‍🎓')
                    : (locale === 'ar' ? '👥 متاح للجميع' : 'Open to All 👥')}
                </span>

                {property.targetTenantType === 'STUDENT' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.8rem',
                      borderRadius: '999px',
                      backgroundColor: '#EFF6FF',
                      color: 'var(--color-blue)',
                    }}
                  >
                    📚 {locale === 'ar' ? 'مخصص للطلاب والدارسين' : 'Students Only'}
                  </span>
                )}
              </div>

              <h1 style={{ fontSize: '1.95rem', fontWeight: 900, color: 'var(--color-navy)', marginBottom: '0.65rem', lineHeight: 1.3 }}>
                {displayTitle}
              </h1>

              <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-blue)', flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{displayLocation}</span>
              </p>
            </div>

            {/* Detailed Location & Proximity Box */}
            {(property.address || property.nearestUniversity) && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '1.15rem 1.25rem',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                {property.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                    <span style={{ fontSize: '1.1rem' }}>📍</span>
                    <span style={{ fontWeight: 700 }}>{locale === 'ar' ? 'العنوان التفصيلي:' : 'Detailed Address:'}</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{property.address}</span>
                  </div>
                )}

                {property.nearestUniversity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#1E40AF' }}>
                    <span style={{ fontSize: '1.1rem' }}>🎓</span>
                    <span style={{ fontWeight: 700 }}>{locale === 'ar' ? 'الجامعة الأقرب:' : 'Nearest University:'}</span>
                    <span style={{ fontWeight: 600 }}>{property.nearestUniversity}</span>
                    {property.distanceToUniversity !== undefined && (
                      <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                        {property.distanceToUniversity} {locale === 'ar' ? 'كم' : 'km'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Key Specifications Grid (6 Tiles) ─────────────────────────── */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.9rem' }}>
                {locale === 'ar' ? '📊 مواصفات وبيانات السكن' : '📊 Property Specifications'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'نوع العقار' : 'Property Type'}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    🏠 {displayType}
                  </div>
                </div>

                <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'حالة الفرش' : 'Furnishing'}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    🛋️ {property.isFurnished ? (locale === 'ar' ? 'مفروش بالكامل' : 'Fully Furnished') : (locale === 'ar' ? 'غير مفروش' : 'Unfurnished')}
                  </div>
                </div>

                <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'عدد الغرف' : 'Bedrooms'}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    🛏️ {property.rooms_?.length || property.bedrooms} {locale === 'ar' ? 'غرف' : 'Rooms'}
                  </div>
                </div>

                <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'دورات المياه' : 'Bathrooms'}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    🚿 {property.bathrooms || 1} {locale === 'ar' ? 'حمامات' : 'Baths'}
                  </div>
                </div>

                <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'الطابق / الدور' : 'Floor'}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    🏢 {property.floor !== undefined && property.floor !== '' ? (locale === 'ar' ? `الدور ${property.floor}` : `Floor ${property.floor}`) : (locale === 'ar' ? 'طابق ملائم' : 'Standard')}
                  </div>
                </div>

                <div style={{ padding: '0.9rem 1rem', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'المساحة الإجمالية' : 'Total Area'}
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    📐 {property.area ? `${property.area} ${locale === 'ar' ? 'م²' : 'sqm'}` : (locale === 'ar' ? 'مساحة مناسبة' : 'Ample Space')}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Utilities & Bills Inclusions Card ─────────────────────────── */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.75rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', margin: '0 0 0.85rem' }}>
                💡 {locale === 'ar' ? 'المرافق والفواتير المشمولة في الإيجار' : 'Utilities & Inclusions in Rent'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: property.electricityIncluded ? '#15803D' : '#64748B' }}>
                  <span>{property.electricityIncluded ? '⚡ ✓' : '⚡ ✕'}</span>
                  <span>{property.electricityIncluded ? (locale === 'ar' ? 'الكهرباء مشمولة في الإيجار' : 'Electricity Included') : (locale === 'ar' ? 'الكهرباء غير مشمولة (على المستأجر)' : 'Electricity Not Included')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: property.waterIncluded ? '#15803D' : '#64748B' }}>
                  <span>{property.waterIncluded ? '💧 ✓' : '💧 ✕'}</span>
                  <span>{property.waterIncluded ? (locale === 'ar' ? 'المياه مشمولة في الإيجار' : 'Water Included') : (locale === 'ar' ? 'المياه غير مشمولة (على المستأجر)' : 'Water Not Included')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: property.internetIncluded ? '#15803D' : '#64748B' }}>
                  <span>{property.internetIncluded ? '🌐 ✓' : '🌐 ✕'}</span>
                  <span>{property.internetIncluded ? (locale === 'ar' ? 'إنترنت WiFi عالي السرعة مشمول' : 'High-speed WiFi Included') : (locale === 'ar' ? 'الإنترنت غير مشمول' : 'Internet Not Included')}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.65rem' }}>
                  {locale === 'ar' ? '📝 عن السكن' : '📝 About Property'}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', margin: 0, whiteSpace: 'pre-line' }}>
                  {property.description}
                </p>
              </div>
            )}

            {/* Rooms list */}
            {Array.isArray(property.rooms_) && property.rooms_.length > 0 && (
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.85rem' }}>
                  {locale === 'ar' ? '🛏️ خيارات الغرف والأسرّة المتاحة' : '🛏️ Available Rooms & Beds'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
                  {property.rooms_.map((room: any, idx: number) => {
                    const roomName =
                      room.roomType === 'SINGLE' ? (locale === 'ar' ? 'غرفة فردية' : 'Single Room') :
                      room.roomType === 'DOUBLE' ? (locale === 'ar' ? 'غرفة ثنائية' : 'Double Room') :
                      room.roomType === 'TRIPLE' ? (locale === 'ar' ? 'غرفة ثلاثية' : 'Triple Room') :
                      room.roomType === 'QUAD' ? (locale === 'ar' ? 'غرفة رباعية' : 'Quad Room') : room.roomType;
                    const isAvailable = room.availableBeds > 0;

                    return (
                      <div
                        key={room.id || idx}
                        style={{
                          padding: '1rem',
                          borderRadius: '14px',
                          border: selectedRoomId === room.id ? '2px solid var(--color-blue)' : '1px solid #E2E8F0',
                          backgroundColor: selectedRoomId === room.id ? '#EFF6FF' : '#F8FAFC',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: selectedRoomId === room.id ? '0 4px 14px rgba(47, 107, 255, 0.15)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div>
                          {room.photoUrl && (
                            <img
                              src={room.photoUrl}
                              alt={roomName}
                              style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '10px', marginBottom: '0.75rem' }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=300&h=200&fit=crop';
                              }}
                            />
                          )}
                          <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '1rem', marginBottom: '0.35rem' }}>
                            {roomName}
                          </div>
                          <div style={{ color: 'var(--color-blue)', fontWeight: 900, fontSize: '1.15rem', marginBottom: '0.45rem' }}>
                            {room.pricePerBed} {property.currency} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {locale === 'ar' ? 'سرير شهرياً' : 'bed/mo'}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: isAvailable ? '#15803D' : '#DC2626', fontWeight: 700, marginBottom: '0.85rem' }}>
                            {isAvailable
                              ? (locale === 'ar' ? `✓ المتاح: ${room.availableBeds} من أصل ${room.totalBeds} أسرّة` : `✓ ${room.availableBeds} of ${room.totalBeds} beds available`)
                              : (locale === 'ar' ? '✕ ممتلئة بالكامل' : '✕ Fully Booked')}
                          </div>
                        </div>

                        {!isAdmin && !isOwner && isAvailable && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              handleOpenBookingModal();
                            }}
                            style={{
                              width: '100%',
                              padding: '0.6rem',
                              borderRadius: '8px',
                              backgroundColor: selectedRoomId === room.id ? 'var(--color-blue)' : '#FFFFFF',
                              color: selectedRoomId === room.id ? '#FFFFFF' : 'var(--color-navy)',
                              border: '1px solid ' + (selectedRoomId === room.id ? 'var(--color-blue)' : '#CBD5E1'),
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {locale === 'ar' ? 'حجز هذه الغرفة ←' : 'Book this Room →'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amenities */}
            {Array.isArray(property.amenities) && property.amenities.length > 0 && (
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.85rem' }}>
                  {locale === 'ar' ? '✨ المرافق والخدمات المشمولة' : '✨ Amenities & Inclusions'}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                  {property.amenities.map((item: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: '0.45rem 0.95rem',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        color: 'var(--color-blue)',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        border: '1px solid #DBEAFE',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✓</span>
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* House Rules & Policies (if provided) */}
            {property.rules && (
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.65rem' }}>
                  {locale === 'ar' ? '📋 شروط وقواعد السكن' : '📋 House Rules & Policies'}
                </h3>
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '1.15rem' }}>
                  {Array.isArray(property.rules) ? (
                    <ul style={{ margin: 0, paddingInlineStart: '1.25rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                      {property.rules.map((rule: string, rIdx: number) => (
                        <li key={rIdx}>{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                      {property.rules}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Owner / Host Information Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1rem',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    color: 'var(--color-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    border: '2px solid #BFDBFE',
                    overflow: 'hidden',
                  }}
                >
                  {property.owner?.avatar ? (
                    <img src={property.owner.avatar} alt={ownerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    ownerName.charAt(0) || '👤'
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {locale === 'ar' ? 'المالك / المعلن المسئول' : 'Host / Owner'}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                    {ownerName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                    ✓ {locale === 'ar' ? 'حساب مالك معتمد وموثق لدى منصة داري' : 'Verified Host on Dary Platform'}
                  </div>
                </div>
              </div>

              {ownerPhone && (
                <a
                  href={`https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    locale === 'ar'
                      ? `مرحبًا، أنا مهتم بحجز السكن: ${displayTitle}`
                      : `Hello, I am interested in booking: ${displayTitle}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '10px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    boxShadow: '0 3px 10px rgba(37, 211, 102, 0.25)',
                  }}
                >
                  <span>💬</span>
                  <span>{locale === 'ar' ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}</span>
                </a>
              )}
            </div>
          </div>

          {/* ── Sidebar: Price & Booking Actions Card ────────────────────────── */}
          <div style={{ position: 'sticky', top: '6rem', border: '1px solid rgba(11,42,74,0.1)', borderRadius: '20px', padding: '1.65rem', background: '#fff', boxShadow: '0 6px 24px rgba(11,42,74,0.08)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              {locale === 'ar' ? 'السعر الشهري' : 'Monthly Price'}
            </div>
            <div style={{ fontSize: '2.15rem', fontWeight: 900, color: 'var(--color-blue)', lineHeight: 1, marginBottom: '0.35rem' }}>
              {property.price.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              {property.currency} / {locale === 'ar' ? 'شهرياً' : 'month'}
            </div>

            {/* Deposit Breakdown */}
            {property.deposit !== undefined && property.deposit > 0 && (
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  {locale === 'ar' ? 'مبلغ التأمين المسترد:' : 'Security Deposit (Refundable):'}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                  🛡️ {property.deposit.toLocaleString()} {property.currency}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                  {locale === 'ar' ? 'يُرد بالكامل عند انتهاء مدة الإقامة وتسليم الغرفة.' : 'Refunded upon checkout.'}
                </div>
              </div>
            )}

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
                    padding: '0.9rem',
                    borderRadius: '12px',
                    background: 'var(--color-blue)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '0.75rem',
                    boxShadow: '0 4px 14px rgba(47, 107, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>📅</span>
                  <span>{locale === 'ar' ? 'طلب حجز سكن' : 'Request to Book'}</span>
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
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '1px solid rgba(11,42,74,0.15)',
                    cursor: 'pointer',
                    marginTop: '0.35rem',
                  }}
                >
                  {isFavorite
                    ? (locale === 'ar' ? '❤️ محفوظ في المفضلة' : '❤️ Saved in Favorites')
                    : (locale === 'ar' ? '🤍 حفظ في المفضلة' : '🤍 Save to Favorites')}
                </button>

                <button
                  type="button"
                  onClick={handleOpenReportModal}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    border: '1px solid #FECACA',
                    cursor: 'pointer',
                    marginTop: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>⚠️</span>
                  <span>{locale === 'ar' ? 'إبلاغ عن هذا العقار' : 'Report this property'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer Note (for students/guests only) */}
        {!isAdmin && !isOwner && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2.5rem', borderTop: '1px solid rgba(11,42,74,0.07)', paddingTop: '1rem' }}>
            {locale === 'ar'
              ? '💡 للحصول على مزيد من التفاصيل، قم بإرسال طلب الحجز وسيتواصل معك المشرف لتنسيق الحجز عبر الواتساب.'
              : '💡 For more details, submit a booking request and an admin will coordinate with you via WhatsApp.'}
          </p>
        )}
      </div>

      {/* ── Fullscreen Lightbox Modal ──────────────────────────────────────── */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.94)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem',
          }}
        >
          {/* Lightbox Header Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '20px',
              insetInline: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📷</span>
              <span>{activeImageIndex + 1} / {allImages.length}</span>
              {getCategoryLabel(currentImage.category) && (
                <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {getCategoryLabel(currentImage.category)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '1.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* Centered Large Image with Nav Buttons */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '75vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={currentImage.url}
              alt={`${displayTitle} - Fullscreen`}
              style={{
                maxWidth: '90vw',
                maxHeight: '74vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              }}
            />

            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineStart: '-55px',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {locale === 'ar' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '-55px',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {locale === 'ar' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Lightbox */}
          {allImages.length > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '20px',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                maxWidth: '90vw',
                padding: '6px',
              }}
            >
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: '64px',
                    height: '44px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: activeImageIndex === idx ? '2px solid #3B82F6' : '1px solid rgba(255,255,255,0.3)',
                    opacity: activeImageIndex === idx ? 1 : 0.5,
                    cursor: 'pointer',
                    padding: 0,
                    backgroundColor: '#000',
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Report Property Modal */}
      {reportModalOpen && (
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <span>{locale === 'ar' ? 'إبلاغ عن عقار أو محتوى غير لائق' : 'Report Property or Inappropriate Content'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                style={{ fontSize: '1.2rem', color: '#94A3B8', cursor: 'pointer', border: 'none', background: 'none' }}
              >
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛡️</div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16A34A', marginBottom: '0.5rem' }}>
                  {locale === 'ar' ? 'تم استلام بلاغك بنجاح' : 'Report Submitted Successfully'}
                </h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {locale === 'ar'
                    ? 'شكراً لحرصك على أمان المنصة. ستقوم إدارة داري بمراجعة البلاغ واتخاذ الإجراءات اللازمة فوراً.'
                    : 'Thank you for helping keep our platform safe. Dary administration will review this report and take necessary actions promptly.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportSuccess(false);
                    setReportDescription('');
                  }}
                  style={{
                    padding: '0.75rem 2rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-navy)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {reportError && (
                  <div
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#DC2626',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠️ {reportError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.4rem' }}>
                    {locale === 'ar' ? 'سبب البلاغ' : 'Reason for Report'} *
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <option value="الصور لا تطابق الواقع.">الصور لا تطابق الواقع (Photos do not match reality)</option>
                    <option value="معلومات أو أسعار مضللة أو خاطئة.">معلومات أو أسعار مضللة أو خاطئة (Misleading/wrong info or price)</option>
                    <option value="احتيال أو طلب تحويل مالي خارج المنصة.">احتيال أو طلب تحويل مالي خارج المنصة (Fraud or off-platform payment request)</option>
                    <option value="العقار غير متاح أو وهمي.">العقار غير متاح أو وهمي (Property fake or unavailable)</option>
                    <option value="سوء سلوك أو إساءة من المالك.">سوء سلوك أو إساءة من المالك (Owner misconduct or harassment)</option>
                    <option value="سبب آخر.">سبب آخر (Other reason)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.4rem' }}>
                    {locale === 'ar' ? 'درجة الأولوية / خطورة المشكلة' : 'Priority / Severity'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {(['low', 'medium', 'high'] as const).map((p) => {
                      const isSelected = reportPriority === p;
                      const labelMap: Record<string, { ar: string; en: string }> = {
                        low: { ar: 'منخفضة', en: 'Low' },
                        medium: { ar: 'متوسطة', en: 'Medium' },
                        high: { ar: 'عالية / عاجل', en: 'High' },
                      };
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setReportPriority(p)}
                          style={{
                            padding: '0.6rem 0.5rem',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? (p === 'high' ? '#DC2626' : p === 'medium' ? '#F59E0B' : '#3B82F6') : '#E2E8F0'}`,
                            backgroundColor: isSelected ? (p === 'high' ? '#FEF2F2' : p === 'medium' ? '#FEF3C7' : '#EFF6FF') : '#FFFFFF',
                            color: isSelected ? (p === 'high' ? '#DC2626' : p === 'medium' ? '#D97706' : '#2563EB') : '#64748B',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          {locale === 'ar' ? labelMap[p].ar : labelMap[p].en}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.4rem' }}>
                    {locale === 'ar' ? 'تفاصيل إضافية أو توضيح (اختياري)' : 'Additional details (optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder={
                      locale === 'ar'
                        ? 'وضح ما حدث بالتفصيل لمساعدة الإدارة في اتخاذ الإجراء المناسب...'
                        : 'Explain what happened in detail to help the administration take action...'
                    }
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    style={{
                      padding: '0.7rem 1.25rem',
                      borderRadius: '10px',
                      backgroundColor: '#F1F5F9',
                      color: 'var(--color-navy)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={reportLoading}
                    style={{
                      padding: '0.7rem 1.5rem',
                      borderRadius: '10px',
                      backgroundColor: reportLoading ? '#94A3B8' : '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: reportLoading ? 'not-allowed' : 'pointer',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    }}
                  >
                    {reportLoading
                      ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
                      : (locale === 'ar' ? 'إرسال البلاغ 🛡️' : 'Submit Report 🛡️')}
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
