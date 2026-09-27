import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types/property';
import AnimatedCounter from '../../components/common/AnimatedCounter';

interface PriceRangeOption {
  value: string;
  label: { ar: string; en: string };
  min?: number;
  max?: number;
}

const priceRanges: PriceRangeOption[] = [
  { value: '', label: { ar: 'جميع الأسعار', en: 'All Prices' }, min: undefined, max: undefined },
  { value: 'under-1500', label: { ar: 'أقل من 1,500 ج.م', en: 'Under 1,500 EGP' }, min: undefined, max: 1500 },
  { value: '1500-3000', label: { ar: '1,500 - 3,000 ج.م', en: '1,500 - 3,000 EGP' }, min: 1500, max: 3000 },
  { value: '3000-5000', label: { ar: '3,000 - 5,000 ج.م', en: '3,000 - 5,000 EGP' }, min: 3000, max: 5000 },
  { value: 'over-5000', label: { ar: 'أكثر من 5,000 ج.م', en: 'Over 5,000 EGP' }, min: 5000, max: undefined },
];

const cityOptions = [
  { value: '', label: { ar: 'جميع المحافظات / المدن', en: 'All Locations' } },
  { value: 'cairo', label: { ar: 'القاهرة (جامعة القاهرة / عين شمس)', en: 'Cairo' } },
  { value: 'giza', label: { ar: 'الجيزة / الدقي', en: 'Giza / Dokki' } },
  { value: 'mansoura', label: { ar: 'المنصورة (جامعة المنصورة)', en: 'Mansoura' } },
  { value: 'alexandria', label: { ar: 'الإسكندرية (جامعة الإسكندرية)', en: 'Alexandria' } },
  { value: 'tanta', label: { ar: 'طنطا (جامعة طنطا)', en: 'Tanta' } },
  { value: 'zagazig', label: { ar: 'الزقازيق', en: 'Zagazig' } },
  { value: 'assiut', label: { ar: 'أسيوط', en: 'Assiut' } },
  { value: 'october', label: { ar: '6 أكتوبر (جامعة MSA / MUST)', en: '6th of October' } },
];

const typeOptions = [
  { value: '', label: { ar: 'جميع أنواع السكن', en: 'All Housing Types' } },
  { value: 'shared_apartment', label: { ar: 'شقة مشتركة (Shared Apartment)', en: 'Shared Apartment' } },
  { value: 'private_room', label: { ar: 'غرفة خاصة (Private Room)', en: 'Private Room' } },
  { value: 'shared_room', label: { ar: 'غرفة مشتركة (Shared Room)', en: 'Shared Room' } },
  { value: 'studio', label: { ar: 'استوديو (Studio)', en: 'Studio' } },
  { value: 'entire_apartment', label: { ar: 'شقة كاملة (Entire Apartment)', en: 'Entire Apartment' } },
];

export default function OwnerExplorePropertiesPage() {
  const { locale } = useLocale();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/owner-dashboard-preview')
    ? '/owner-dashboard-preview'
    : '/owner-dashboard';

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('recommended');

  // Properties data
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch properties
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    const activePrice = priceRanges.find((p) => p.value === priceRange);

    propertyService
      .getProperties({
        search: debouncedSearch || undefined,
        city: city || undefined,
        propertyType: propertyType || undefined,
        minPrice: activePrice?.min,
        maxPrice: activePrice?.max,
      })
      .then((data) => {
        if (!ignore) {
          setProperties(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          console.error('[OwnerExplorePropertiesPage] fetch error:', err);
          setError(
            locale === 'ar'
              ? 'تعذر تحميل قائمة العقارات المتاحة حالياً. يرجى المحاولة مرة أخرى.'
              : 'Could not load available properties list. Please try again.'
          );
          setProperties([]);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, city, propertyType, priceRange, reloadKey, locale]);

  // Client sort
  const sortedProperties = useMemo(() => {
    const list = [...properties];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }
    return list;
  }, [properties, sortBy]);

  const hasActiveFilters = Boolean(searchTerm || city || propertyType || priceRange);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCity('');
    setPropertyType('');
    setPriceRange('');
  }, []);

  return (
    <div>
      {/* 1. Header Card */}
      <div className="dary-welcome-card" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dary-welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🧭</span>
            <span>{locale === 'ar' ? 'تصفح وحجز العقارات المتاحة' : 'Browse & Book Available Properties'}</span>
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'يمكنك كمالك عقار استعراض السكنات المتاحة على المنصة وحجز أي عقار لنفسك أو لمعارفك ومتابعة حجوزاتك الشخصية مباشرة من لوحة تحكمك.'
              : 'Explore all published properties across the platform. You can book any property for yourself and track your personal bookings in your dashboard.'}
          </p>
        </div>

        <div className="dary-welcome-actions">
          <Link
            to={`${basePath}/my-rentals`}
            className="dary-primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#0B2A4A',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            <span>📋</span>
            <span>{locale === 'ar' ? 'عرض حجوزاتي الشخصية' : 'My Personal Bookings'}</span>
          </Link>
        </div>
      </div>

      {/* Info notice banner */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1E40AF',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>💡</span>
        <span>
          {locale === 'ar'
            ? 'ملاحظة: يمكنك تقديم طلب حجز على أي عقار لا تملكه. فور تأكيد الحجز ستتمكن من توقيع العقد الإلكتروني ومتابعة الإقامة عبر تبويب "حجوزاتي الشخصية".'
            : 'Note: You can submit a booking request for any property that does not belong to you, and manage your stay from "My Personal Bookings".'}
        </span>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="dary-section-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          {/* Keyword Search */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.3rem' }}>
              🔍 {locale === 'ar' ? 'بحث باسم السكن أو الجامعة:' : 'Search name or university:'}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={locale === 'ar' ? 'مثال: سكن النخبة، الدقي...' : 'e.g. Dokki housing...'}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* City / Location */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.3rem' }}>
              📍 {locale === 'ar' ? 'المدينة / المحافظة:' : 'Location:'}
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              {cityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[locale]}
                </option>
              ))}
            </select>
          </div>

          {/* Housing Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.3rem' }}>
              🏠 {locale === 'ar' ? 'نوع السكن:' : 'Housing Type:'}
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[locale]}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.3rem' }}>
              💵 {locale === 'ar' ? 'نطاق السعر:' : 'Price Range:'}
            </label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              {priceRanges.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[locale]}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.3rem' }}>
              🔃 {locale === 'ar' ? 'ترتيب النتائج:' : 'Sort By:'}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="recommended">{locale === 'ar' ? 'الأكثر ملائمة وموصى به' : 'Recommended'}</option>
              <option value="price_asc">{locale === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
              <option value="price_desc">{locale === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#DC2626',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>✕</span>
              <span>{locale === 'ar' ? 'إعادة ضبط كل الفلاتر' : 'Reset all filters'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0B2A4A', margin: 0 }}>
          {locale === 'ar' ? 'العقارات السكنية المتاحة' : 'Available Housing Units'}{' '}
          {!loading && !error && (
            <span style={{ fontSize: '0.9rem', color: '#2F6BFF', fontWeight: 800 }}>
              (<AnimatedCounter value={sortedProperties.length} /> {locale === 'ar' ? 'عقار' : 'properties'})
            </span>
          )}
        </h3>

        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#0B2A4A',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span>🔄</span>
          <span>{locale === 'ar' ? 'تحديث القائمة' : 'Refresh'}</span>
        </button>
      </div>

      {/* 4. Properties Grid / Loading / Error / Empty States */}
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
            {locale === 'ar' ? 'جاري تحميل العقارات المتاحة...' : 'Loading available properties...'}
          </p>
        </div>
      ) : error ? (
        <div className="dary-error-state">
          <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب العقارات' : 'Error Loading'}</p>
          <p className="dary-error-desc">{error}</p>
          <button type="button" className="dary-retry-btn" onClick={() => setReloadKey((k) => k + 1)}>
            {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : sortedProperties.length === 0 ? (
        <div
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            border: '1px dashed #CBD5E1',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏠</div>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B2A4A', margin: '0 0 0.5rem' }}>
            {locale === 'ar' ? 'لم يتم العثور على عقارات مطابقة' : 'No Matching Properties Found'}
          </h4>
          <p style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: '460px', margin: '0 auto 1.25rem' }}>
            {locale === 'ar'
              ? 'جرّب البحث بكلمات مختلفة أو تغيير معايير المدينة ونطاق السعر.'
              : 'Try adjusting your search criteria or resetting filters.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="dary-primary-btn"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              {locale === 'ar' ? 'إلغاء الفلاتر وعرض الكل' : 'Reset Filters & Show All'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {sortedProperties.map((property) => {
            const displayTitle =
              typeof property.title === 'string'
                ? property.title
                : property.title?.[locale] || property.title?.ar || property.title?.en || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');

            const displayLocation =
              typeof property.location === 'string'
                ? property.location
                : property.location?.[locale] || property.location?.ar || property.city || (locale === 'ar' ? 'مصر' : 'Egypt');

            const displayType =
              typeof property.type === 'string'
                ? property.type
                : property.type?.[locale] || property.type?.ar || (locale === 'ar' ? 'سكن طلابي' : 'Housing');

            const image =
              property.primaryImage ||
              property.image ||
              (Array.isArray(property.images) && property.images.length > 0
                ? typeof property.images[0] === 'string'
                  ? property.images[0]
                  : property.images[0]?.url
                : '') ||
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';

            return (
              <div
                key={property.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 12px rgba(11, 42, 74, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Media */}
                <div style={{ position: 'relative', height: '180px', backgroundColor: '#F1F5F9' }}>
                  <img
                    src={image}
                    alt={displayTitle}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';
                    }}
                  />
                  <div style={{ position: 'absolute', top: '10px', insetInlineStart: '10px' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(11, 42, 74, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                      }}
                    >
                      {displayType}
                    </span>
                  </div>

                  {property.genderAllowed && (
                    <div style={{ position: 'absolute', top: '10px', insetInlineEnd: '10px' }}>
                      <span
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor:
                            property.genderAllowed === 'female_only'
                              ? '#FCE7F3'
                              : property.genderAllowed === 'male_only'
                              ? '#E0F2FE'
                              : '#F3E8FF',
                          color:
                            property.genderAllowed === 'female_only'
                              ? '#BE185D'
                              : property.genderAllowed === 'male_only'
                              ? '#0369A1'
                              : '#6B21A8',
                        }}
                      >
                        {property.genderAllowed === 'female_only'
                          ? (locale === 'ar' ? 'طالبات' : 'Female')
                          : property.genderAllowed === 'male_only'
                          ? (locale === 'ar' ? 'شباب' : 'Male')
                          : (locale === 'ar' ? 'مشترك' : 'Mixed')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 800, color: '#0B2A4A', lineHeight: 1.4 }}>
                    {displayTitle}
                  </h4>

                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.825rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>📍</span>
                    <span>{displayLocation}</span>
                  </p>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.78rem', color: '#475569' }}>
                    {property.bedrooms && (
                      <span style={{ backgroundColor: '#F8FAFC', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        🛏️ {property.bedrooms} {locale === 'ar' ? 'غرف' : 'Bedrooms'}
                      </span>
                    )}
                    {property.bathrooms && (
                      <span style={{ backgroundColor: '#F8FAFC', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        🚿 {property.bathrooms} {locale === 'ar' ? 'حمام' : 'Baths'}
                      </span>
                    )}
                    {property.nearestUniversity && (
                      <span style={{ backgroundColor: '#EFF6FF', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #DBEAFE', color: '#1E40AF' }}>
                        🎓 {property.nearestUniversity}
                      </span>
                    )}
                  </div>

                  {/* Footer & Action */}
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '1px solid #F1F5F9' }}>
                    <div>
                      <span style={{ fontWeight: 900, color: '#2F6BFF', fontSize: '1.2rem' }}>
                        {Number(property.price || 0).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', marginInlineStart: '0.25rem' }}>
                        {property.currency} / {locale === 'ar' ? 'شهرياً' : 'mo'}
                      </span>
                    </div>

                    <Link
                      to={`/properties/${property.id}`}
                      state={{ property }}
                      style={{
                        padding: '0.55rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: '#0B2A4A',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span>{locale === 'ar' ? 'تفاصيل وحجز' : 'Details & Book'}</span>
                      <span>←</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
