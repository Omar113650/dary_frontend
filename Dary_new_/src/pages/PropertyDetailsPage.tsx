import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { propertyService, getCachedProperty } from '../services/propertyService';
import { TenantService } from '../services/tenantService';
import { ReportService } from '../services/reportService';
import { ReviewService } from '../services/reviewService';
import type { ReviewItem } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';
import type { Property } from '../types/property';

const recordedRecentlyViewedIds = new Set<string>();

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const { isAuthenticated, user, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Instant hydration from navigation state or session cache
  const passedProperty = (location.state as any)?.property as Property | undefined;
  const initialProperty =
    passedProperty && passedProperty.id === id
      ? passedProperty
      : id
      ? getCachedProperty(id)
      : null;

  const [property, setProperty] = useState<Property | null>(initialProperty);
  const [loading, setLoading] = useState<boolean>(!initialProperty);
  const [error, setError] = useState<string | null>(null);

  const propertyRef = useRef<Property | null>(property);
  propertyRef.current = property;

  const isThisOwnerProperty = Boolean(
    user?.id && property && (user.id === property.ownerId || user.id === property.owner?.id)
  );

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageFitMode, setImageFitMode] = useState<'contain' | 'cover'>('contain');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

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

  // Check if all rooms in this property are full
  const isFullyBooked = useMemo(() => {
    if (!property) return false;
    if (Array.isArray(property.rooms_) && property.rooms_.length > 0) {
      return property.rooms_.every(
        (r: any) => Number(r.availableBeds) <= 0 || r.status === 'FULL'
      );
    }
    return false;
  }, [property]);

  // Auto-select first available room when property loads
  useEffect(() => {
    if (property && Array.isArray(property.rooms_) && property.rooms_.length > 0) {
      const availableRoom = property.rooms_.find(
        (r: any) => Number(r.availableBeds) > 0 && r.status !== 'FULL'
      ) || property.rooms_[0];
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
    if (isFullyBooked) {
      return;
    }
    setBookingError(null);
    setBookingSuccess(false);
    setBookingModalOpen(true);
  }

  // Reviews & Ratings state
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsMeta, setReviewsMeta] = useState<{ total: number; avgPropertyRating: number; avgOwnerRating: number } | null>(null);

  const fetchReviews = useCallback(async (propId: string) => {
    setReviewsLoading(true);
    try {
      const res = await ReviewService.getPropertyReviews(propId);
      const items: ReviewItem[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setReviews(items);

      const total = res?.meta?.total ?? items.length;
      let avgProp = res?.aggregates?._avg?.propertyRating;
      let avgOwn = res?.aggregates?._avg?.ownerRating;

      if (avgProp === undefined && items.length > 0) {
        avgProp = items.reduce((acc: number, r: ReviewItem) => acc + (r.propertyRating || 0), 0) / items.length;
      }
      if (avgOwn === undefined && items.length > 0) {
        avgOwn = items.reduce((acc: number, r: ReviewItem) => acc + (r.ownerRating || 0), 0) / items.length;
      }

      setReviewsMeta({
        total,
        avgPropertyRating: avgProp ? Number(Number(avgProp).toFixed(1)) : 0,
        avgOwnerRating: avgOwn ? Number(Number(avgOwn).toFixed(1)) : 0,
      });
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  // Submit booking request
  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    if (isFullyBooked) {
      setBookingError(locale === 'ar' ? 'نعتذر، هذا السكن ممتلئ بالكامل ولا يمكن استقبال طلبات حجز جديدة.' : 'Sorry, this property is fully booked.');
      return;
    }

    const roomId = selectedRoomId || (property?.rooms_ && property.rooms_[0]?.id);
    if (!roomId) {
      setBookingError(locale === 'ar' ? 'يرجى اختيار الغرفة المراد حجزها' : 'Please select a room to book');
      return;
    }

    const targetRoom = property?.rooms_?.find((r: any) => r.id === roomId);
    if (targetRoom && (Number(targetRoom.availableBeds) <= 0 || targetRoom.status === 'FULL')) {
      setBookingError(locale === 'ar' ? 'هذه الغرفة ممتلئة بالكامل ولا تتوفر بها أسرّة شاغرة حالياً.' : 'This room is fully booked and has no beds available.');
      return;
    }
    if (targetRoom && Number(bedsRequested) > Number(targetRoom.availableBeds || 1)) {
      setBookingError(locale === 'ar' ? `عدد الأسرة المطلوبة يتجاوز المتاح (${targetRoom.availableBeds} أسرّة)` : `Requested beds exceed available (${targetRoom.availableBeds} beds)`);
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
        try {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        } catch (e) {
          console.error('Failed to auto-open WhatsApp link:', e);
        }
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
    if (!id) {
      setLoading(false);
      setError(locale === 'ar' ? 'معرف العقار غير صالح.' : 'Invalid property ID.');
      return;
    }
    // Only block screen if we don't already have property data displayed
    if (!propertyRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await propertyService.getPropertyById(id);
      if (!data) {
        if (!propertyRef.current) {
          setError(locale === 'ar' ? 'لم يتم العثور على هذا العقار.' : 'Property not found.');
        }
      } else {
        setProperty(data);
        if (isAuthenticated && id && !recordedRecentlyViewedIds.has(id)) {
          recordedRecentlyViewedIds.add(id);
          TenantService.recordRecentlyViewed(id).catch(() => {});
        }
      }
      // Also load property reviews
      fetchReviews(id);
    } catch (err: any) {
      if (!propertyRef.current) {
        setError(
          err?.message ||
            (locale === 'ar'
              ? 'تعذر تحميل بيانات العقار. يرجى المحاولة مرة أخرى.'
              : 'Could not load property details. Please try again.')
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id, locale, isAuthenticated, fetchReviews]);

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

  // ── Collect and deduplicate all property images (Memoized & Safe) ─────────
  const allImages: Array<{ url: string; category?: string }> = useMemo(() => {
    if (!property) return [];
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

    if (property.image) add(property.image, 'main');
    if (Array.isArray(property.images)) {
      property.images.forEach((img: any) => add(img));
    }
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
    if (Array.isArray(property.rooms_)) {
      property.rooms_.forEach((r: any) => {
        if (r?.photoUrl) add(r.photoUrl, 'room');
      });
    }
    if (list.length === 0 && property.image) {
      list.push({ url: property.image, category: 'main' });
    }
    return list;
  }, [property]);

  const currentImage = allImages[activeImageIndex] || allImages[0] || {
    url: property?.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=900&h=506&fit=crop',
    category: 'main',
  };

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  }, [allImages.length]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  }, [allImages.length]);

  // Keyboard navigation for Gallery & Lightbox (HOOK PLACED UNCONDITIONALLY)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
      if (e.key === 'ArrowRight') {
        locale === 'ar' ? handlePrevImage() : handleNextImage();
      }
      if (e.key === 'ArrowLeft') {
        locale === 'ar' ? handleNextImage() : handlePrevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handlePrevImage, handleNextImage, locale]);

  // Auto-scroll thumbnails when active image changes (HOOK PLACED UNCONDITIONALLY)
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeBtn = thumbnailsRef.current.children[activeImageIndex] as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeImageIndex]);

  // Slow loading watchdog timer (HOOK PLACED UNCONDITIONALLY)
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  useEffect(() => {
    if (!loading || property) {
      setIsSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsSlowLoading(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [loading, property]);

  // Touch Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        locale === 'ar' ? handlePrevImage() : handleNextImage();
      } else {
        locale === 'ar' ? handleNextImage() : handlePrevImage();
      }
    }
    setTouchStartX(null);
  };

  // ── Loading skeleton (Only shown if NO property is available in memory/cache) ──
  if (loading && !property) {
    return (
      <main className="page" style={{ paddingTop: '7rem', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div style={{ height: '380px', borderRadius: '20px', background: '#F1F5F9', marginBottom: '2rem', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ height: '28px', width: '60%', borderRadius: '8px', background: '#F1F5F9', marginBottom: '1rem', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ height: '18px', width: '40%', borderRadius: '8px', background: '#F1F5F9', marginBottom: '0.5rem', animation: 'shimmer 1.4s infinite' }} />
          <div style={{ height: '18px', width: '30%', borderRadius: '8px', background: '#F1F5F9', marginBottom: '2rem', animation: 'shimmer 1.4s infinite' }} />

          {isSlowLoading && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '16px',
                padding: '1.25rem',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                {locale === 'ar'
                  ? 'جاري جلب تفاصيل العقار من الخادم... يستغرق الأمر وقتاً أطول من المعتاد.'
                  : 'Fetching property details from the server... taking longer than usual.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={fetchProperty}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '999px',
                    background: 'var(--color-blue)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'ar' ? 'إعادة المحاولة الآن' : 'Retry Now'}
                </button>
                <Link
                  to="/properties"
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '999px',
                    background: '#F1F5F9',
                    color: 'var(--color-navy)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                  }}
                >
                  {locale === 'ar' ? 'العودة للعقارات' : 'Back to Listings'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if ((error || !property) && !loading) {
    return (
      <main className="page" style={{ paddingTop: '7rem', textAlign: 'center', minHeight: '80vh' }}>
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
            {error || (locale === 'ar' ? 'لم يتم العثور على هذا العقار أو قد تم حذفه.' : 'This property could not be found or has been removed.')}
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

  // Safety guard for TypeScript
  if (!property) return null;

  const displayTitle =
    typeof property.title === 'string'
      ? property.title
      : property.title?.[locale] || property.title?.ar || property.title?.en || (locale === 'ar' ? 'عقار سكني' : 'Property Listing');

  const displayLocation =
    typeof property.location === 'string'
      ? property.location
      : property.location?.[locale] || property.location?.ar || property.location?.en || property.city || (locale === 'ar' ? 'الموقع غير محدد' : 'Unspecified Location');

  const displayType =
    typeof property.type === 'string'
      ? property.type
      : property.type?.[locale] || property.type?.ar || property.type?.en || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');

  // Find currently selected room for pricing calculation in modal
  const activeRoom = property.rooms_?.find((r: any) => r.id === selectedRoomId) || property.rooms_?.[0];
  const roomPricePerBed = activeRoom?.pricePerBed || property.price || 0;
  const calculatedMonths = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const estimatedTotal = roomPricePerBed * bedsRequested * calculatedMonths;

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
          {/* Main Photo Viewport with Ambient Blurred Backdrop & Full Uncropped Image */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              minHeight: '340px',
              maxHeight: '520px',
              backgroundColor: '#071829',
              boxShadow: '0 12px 36px rgba(11, 42, 74, 0.16)',
              userSelect: 'none',
            }}
          >
            {/* Ambient Blurred Backdrop (Ensures empty letterbox space is vibrant and matches image colors) */}
            <img
              src={currentImage.url}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(35px) brightness(0.45)',
                transform: 'scale(1.25)',
                pointerEvents: 'none',
              }}
            />

            {/* Main Crisp Foreground Image (100% visible, no parts cropped) */}
            <img
              src={currentImage.url}
              alt={`${displayTitle} - ${activeImageIndex + 1}`}
              onClick={() => setIsLightboxOpen(true)}
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                height: '100%',
                objectFit: imageFitMode,
                display: 'block',
                cursor: 'zoom-in',
                transition: 'transform 0.25s ease',
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=900&h=506&fit=crop';
              }}
            />

            {/* Left & Right Subtle Click Zones for fast navigation */}
            {allImages.length > 1 && (
              <>
                <div
                  onClick={handlePrevImage}
                  title={locale === 'ar' ? 'الصورة السابقة' : 'Previous Photo'}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    insetInlineStart: 0,
                    width: '18%',
                    zIndex: 2,
                    cursor: 'pointer',
                  }}
                />
                <div
                  onClick={handleNextImage}
                  title={locale === 'ar' ? 'الصورة التالية' : 'Next Photo'}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    insetInlineEnd: 0,
                    width: '18%',
                    zIndex: 2,
                    cursor: 'pointer',
                  }}
                />
              </>
            )}

            {/* Top-start: Image Counter Badge & Category */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                insetInlineStart: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 3,
                pointerEvents: 'auto',
              }}
            >
              <span
                style={{
                  backgroundColor: 'rgba(11, 42, 74, 0.85)',
                  backdropFilter: 'blur(10px)',
                  color: '#FFFFFF',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <span>📷</span>
                <span>{activeImageIndex + 1} / {allImages.length}</span>
              </span>

              {getCategoryLabel(currentImage.category) && (
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    color: 'var(--color-navy)',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {getCategoryLabel(currentImage.category)}
                </span>
              )}
            </div>

            {/* Top-end: Fit Mode Toggle, Zoom, Favorite Buttons */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                insetInlineEnd: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                zIndex: 3,
                pointerEvents: 'auto',
              }}
            >
              {/* Fit Mode Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
                }}
                title={
                  imageFitMode === 'contain'
                    ? (locale === 'ar' ? 'تكبير لملء الإطار بالكامل' : 'Cover frame')
                    : (locale === 'ar' ? 'إظهار الصورة كاملة بدون قص' : 'Fit full uncropped image')
                }
                style={{
                  height: '42px',
                  padding: '0 0.85rem',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--color-navy)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span>{imageFitMode === 'contain' ? '⤢' : '⤡'}</span>
                <span>{imageFitMode === 'contain' ? (locale === 'ar' ? 'الصورة كاملة' : 'Full') : (locale === 'ar' ? 'ملء الإطار' : 'Cover')}</span>
              </button>

              {/* Fullscreen Lightbox Button */}
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
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1.15rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  transition: 'transform 0.15s ease',
                }}
              >
                🔍
              </button>

              {/* Favorite Button */}
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
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    opacity: favLoading ? 0.6 : 1,
                  }}
                >
                  {isFavorite ? '❤️' : '🤍'}
                </button>
              )}
            </div>

            {/* Left & Right Prominent Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  title={locale === 'ar' ? 'الصورة السابقة (أو اضغط السهم الأيمن)' : 'Previous Photo'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineStart: '18px',
                    transform: 'translateY(-50%)',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(11, 42, 74, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    color: 'var(--color-navy)',
                    zIndex: 3,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    {locale === 'ar' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  title={locale === 'ar' ? 'الصورة التالية (أو اضغط السهم الأيسر)' : 'Next Photo'}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '18px',
                    transform: 'translateY(-50%)',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(11, 42, 74, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    color: 'var(--color-navy)',
                    zIndex: 3,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    {locale === 'ar' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
                  </svg>
                </button>
              </>
            )}

            {/* Bottom Dots Indicator */}
            {allImages.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '7px',
                  alignItems: 'center',
                  zIndex: 3,
                  backgroundColor: 'rgba(7, 24, 41, 0.7)',
                  backdropFilter: 'blur(8px)',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(idx);
                    }}
                    style={{
                      width: activeImageIndex === idx ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '999px',
                      backgroundColor: activeImageIndex === idx ? 'var(--color-blue)' : 'rgba(255, 255, 255, 0.55)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails Row with Auto-scroll */}
          {allImages.length > 1 && (
            <div style={{ marginTop: '1rem' }}>
              <div
                ref={thumbnailsRef}
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  overflowX: 'auto',
                  paddingBottom: '0.5rem',
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
                        width: '110px',
                        height: '75px',
                        flexShrink: 0,
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: isSelected ? '3px solid var(--color-blue)' : '2px solid #E2E8F0',
                        opacity: isSelected ? 1 : 0.65,
                        transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        padding: 0,
                        backgroundColor: '#0F172A',
                        boxShadow: isSelected ? '0 4px 14px rgba(47, 107, 255, 0.3)' : 'none',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                <span>💡 {locale === 'ar' ? 'يمكنك التمرير أو استخدام أسهم لوحة المفاتيح ↔️ للتنقل بين الصور' : 'Swipe, click thumbnails, or use arrow keys ↔️ to browse photos'}</span>
                <span>{allImages.length} {locale === 'ar' ? 'صور متوفرة' : 'photos available'}</span>
              </div>
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
                  {typeof (property.description as any) === 'object' && property.description !== null
                    ? ((property.description as any)[locale] || (property.description as any).ar || (property.description as any).en || JSON.stringify(property.description))
                    : String(property.description)}
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
                    const isAvailable = Number(room.availableBeds) > 0 && room.status !== 'FULL';

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
                  {property.amenities.map((item: any, i: number) => {
                    const label =
                      typeof item === 'object' && item !== null
                        ? (item.name || item.title || item.label || JSON.stringify(item))
                        : String(item);
                    return (
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
                        <span>{label}</span>
                      </span>
                    );
                  })}
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
                      {property.rules.map((rule: any, rIdx: number) => {
                        const ruleText = typeof rule === 'object' && rule !== null ? (rule.name || rule.rule || JSON.stringify(rule)) : String(rule);
                        return <li key={rIdx}>{ruleText}</li>;
                      })}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                      {typeof (property.rules as any) === 'object' && property.rules !== null
                        ? ((property.rules as any)[locale] || (property.rules as any).ar || (property.rules as any).en || JSON.stringify(property.rules))
                        : String(property.rules)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Student Reviews & Ratings Section ───────────────────────────── */}
            <div style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⭐</span>
                  <span>{locale === 'ar' ? 'تقييمات وتجارب الطلاب' : 'Student Reviews & Ratings'}</span>
                </h3>
                {reviewsMeta && reviewsMeta.total > 0 && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {reviewsMeta.total} {locale === 'ar' ? 'تقييم موثق' : 'verified reviews'}
                  </span>
                )}
              </div>

              {/* Aggregates Card */}
              {reviewsMeta && reviewsMeta.total > 0 ? (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1.25rem',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-blue)', lineHeight: 1 }}>
                      {reviewsMeta.avgPropertyRating.toFixed(1)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: '2px', color: '#F59E0B', fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star}>
                            {star <= Math.round(reviewsMeta.avgPropertyRating) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                        {locale === 'ar' ? 'تقييم العقار والخدمات' : 'Property & Amenities Rating'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderInlineStart: '1px solid #E2E8F0', paddingInlineStart: '1.25rem' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#16A34A', lineHeight: 1 }}>
                      {reviewsMeta.avgOwnerRating.toFixed(1)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: '2px', color: '#F59E0B', fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star}>
                            {star <= Math.round(reviewsMeta.avgOwnerRating) ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                        {locale === 'ar' ? 'تقييم تعاون المالك' : 'Owner Cooperation Rating'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.9rem' }}>
                  {locale === 'ar' ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}
                </div>
              ) : reviews.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '16px',
                    padding: '2rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                    {locale === 'ar' ? 'لا توجد تقييمات منشورة لهذا السكن بعد' : 'No student reviews published yet'}
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    {locale === 'ar'
                      ? 'يمكن للطلاب تقييم السكن والمالك بعد تأكيد وحضور الحجز.'
                      : 'Students can rate and review this accommodation after completing their stay.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reviews.map((rev) => {
                    const tenantName =
                      rev.tenant?.firstName
                        ? `${rev.tenant.firstName} ${rev.tenant?.lastName || ''}`.trim()
                        : (locale === 'ar' ? 'طالب جامعي' : 'University Student');
                    const initial = tenantName.charAt(0).toUpperCase();

                    return (
                      <div
                        key={rev.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '14px',
                          padding: '1.25rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {rev.tenant?.avatar ? (
                              <img
                                src={rev.tenant.avatar}
                                alt={tenantName}
                                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '50%',
                                  backgroundColor: '#EEF2FF',
                                  color: '#4F46E5',
                                  fontWeight: 800,
                                  fontSize: '1rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {initial}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.92rem' }}>
                                {tenantName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700 }}>
                              🏠 {locale === 'ar' ? 'السكن' : 'Property'}: {rev.propertyRating}/5 ★
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>
                              👤 {locale === 'ar' ? 'المالك' : 'Owner'}: {rev.ownerRating}/5 ★
                            </span>
                          </div>
                        </div>

                        {rev.comment && (
                          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar: Price & Booking Actions Card ────────────────────────── */}
          <div style={{ position: 'sticky', top: '6rem', border: '1px solid rgba(11,42,74,0.1)', borderRadius: '20px', padding: '1.65rem', background: '#fff', boxShadow: '0 6px 24px rgba(11,42,74,0.08)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              {locale === 'ar' ? 'السعر الشهري' : 'Monthly Price'}
            </div>
            <div style={{ fontSize: '2.15rem', fontWeight: 900, color: 'var(--color-blue)', lineHeight: 1, marginBottom: '0.35rem' }}>
              {Number(property.price || 0).toLocaleString()}
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
                  🛡️ {Number(property.deposit || 0).toLocaleString()} {property.currency}
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
                {isFullyBooked ? (
                  <div
                    style={{
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: '#FEE2E2',
                      border: '1.5px solid #F87171',
                      color: '#991B1B',
                      marginBottom: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '0.35rem' }}>
                      <span>✕</span>
                      <span>{locale === 'ar' ? 'السكن ممتلئ بالكامل' : 'Property Fully Booked'}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#B91C1C', lineHeight: 1.5 }}>
                      {locale === 'ar'
                        ? 'نعتذر، جميع الغرف والأسرة في هذا السكن محجوزة بالكامل حالياً.'
                        : 'All rooms and beds in this property are currently occupied.'}
                    </p>
                  </div>
                ) : (
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
                )}

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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'relative',
              maxWidth: '94vw',
              maxHeight: '76vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
          >
            <img
              src={currentImage.url}
              alt={`${displayTitle} - Fullscreen`}
              style={{
                maxWidth: '92vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '14px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
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
                    insetInlineStart: '16px',
                    transform: 'translateY(-50%)',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                    {locale === 'ar' ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextImage}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    insetInlineEnd: '16px',
                    transform: 'translateY(-50%)',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
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
                      {property.rooms_.map((r: any, i: number) => {
                        const isAvail = Number(r.availableBeds) > 0 && r.status !== 'FULL';
                        return (
                          <option key={r.id || i} value={r.id} disabled={!isAvail}>
                            {r.roomType} — {r.pricePerBed} {property.currency} / {locale === 'ar' ? 'سرير' : 'bed'} ({isAvail ? `${r.availableBeds} ${locale === 'ar' ? 'أسرّة متاحة' : 'beds available'}` : (locale === 'ar' ? 'ممتلئة بالكامل' : 'Fully Booked')})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {activeRoom && (Number(activeRoom.availableBeds) <= 0 || activeRoom.status === 'FULL') && (
                  <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                    ✕ {locale === 'ar' ? 'هذه الغرفة ممتلئة بالكامل حالياً ولا تتوفر بها أسرّة شاغرة.' : 'This room is currently full and has no beds available.'}
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
                    max={Math.max(1, activeRoom?.availableBeds || 1)}
                    value={bedsRequested}
                    disabled={!activeRoom || Number(activeRoom.availableBeds) <= 0 || activeRoom.status === 'FULL'}
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
                    {Number(estimatedTotal || 0).toLocaleString()} {property.currency}
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
                    disabled={
                      bookingLoading ||
                      !activeRoom ||
                      Number(activeRoom.availableBeds) <= 0 ||
                      activeRoom.status === 'FULL' ||
                      bedsRequested > Number(activeRoom.availableBeds || 0)
                    }
                    style={{
                      padding: '0.7rem 1.5rem',
                      borderRadius: '10px',
                      backgroundColor:
                        bookingLoading ||
                        !activeRoom ||
                        Number(activeRoom.availableBeds) <= 0 ||
                        activeRoom.status === 'FULL' ||
                        bedsRequested > Number(activeRoom.availableBeds || 0)
                          ? '#94A3B8'
                          : 'var(--color-blue)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor:
                        bookingLoading ||
                        !activeRoom ||
                        Number(activeRoom.availableBeds) <= 0 ||
                        activeRoom.status === 'FULL' ||
                        bedsRequested > Number(activeRoom.availableBeds || 0)
                          ? 'not-allowed'
                          : 'pointer',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(47, 107, 255, 0.25)',
                    }}
                  >
                    {bookingLoading
                      ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                      : !activeRoom || Number(activeRoom.availableBeds) <= 0 || activeRoom.status === 'FULL'
                      ? (locale === 'ar' ? '✕ الغرفة ممتلئة بالكامل' : '✕ Fully Booked')
                      : (locale === 'ar' ? 'تأكيد طلب الحجز 🚀' : 'Confirm Request 🚀')}
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
