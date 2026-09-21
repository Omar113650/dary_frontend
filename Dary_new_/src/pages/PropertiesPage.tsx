import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { propertyService } from '../services/propertyService';
import type { Property } from '../types/property';
import PropertyCard from '../components/PropertyCard/PropertyCard';
import './PropertiesPage.css';

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

const bedroomOptions = [
  { value: '', label: { ar: 'أي عدد غرف', en: 'Any Rooms' } },
  { value: '1', label: { ar: 'غرفة واحدة', en: '1 Room' } },
  { value: '2', label: { ar: 'غرفتان', en: '2 Rooms' } },
  { value: '3', label: { ar: '3 غرف أو أكثر', en: '3+ Rooms' } },
];

export default function PropertiesPage() {
  const { t, locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter States
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || '');
  const [priceRange, setPriceRange] = useState(searchParams.get('priceRange') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
  const [sortBy, setSortBy] = useState('recommended');

  // Mobile Filter Drawer State
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Lock body scroll and handle ESC key when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileDrawerOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileDrawerOpen]);

  // Data & Lifecycle States
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync state to URL query params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (city) params.city = city;
    if (propertyType) params.propertyType = propertyType;
    if (priceRange) params.priceRange = priceRange;
    if (bedrooms) params.bedrooms = bedrooms;
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, city, propertyType, priceRange, bedrooms, setSearchParams]);

  // Reload counter for manual retries
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Fetch properties from real API via propertyService with race-condition handling
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
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
      })
      .then((data) => {
        if (!ignore) {
          setProperties(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (!ignore) {
          console.error('Failed to load properties from API:', err);
          setError(t.properties_error_desc);
          setProperties([]);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, city, propertyType, priceRange, bedrooms, reloadTrigger, t.properties_error_desc]);

  const loadProperties = useCallback(() => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  const handleRetry = loadProperties;

  // Expose loadProperties on window for dev/console/debugging convenience
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).loadProperties = loadProperties;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).loadProperties;
      }
    };
  }, [loadProperties]);

  // Client-side Sorting
  const sortedProperties = useMemo(() => {
    const list = [...properties];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => b.price - a.price);
    }
    return list;
  }, [properties, sortBy]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    searchTerm || city || propertyType || priceRange || bedrooms
  );

  const activeFilterCount = [
    Boolean(searchTerm),
    Boolean(city),
    Boolean(propertyType),
    Boolean(priceRange),
    Boolean(bedrooms),
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setCity('');
    setPropertyType('');
    setPriceRange('');
    setBedrooms('');
    setMobileDrawerOpen(false);
  };

  return (
    <main className="properties-page">
      <div className="container">
        {/* Page Header */}
        <header className="properties-header">
          <h1 className="properties-title">{t.page_properties_title}</h1>
          <p className="properties-subtitle">{t.properties_subtitle}</p>
        </header>

        {/* Desktop Filter Bar */}
        <div className="properties-filter-bar">
          {/* Keyword Search */}
          <div className="filter-input-wrap">
            <svg
              className="filter-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="filter-input"
              placeholder={t.properties_filter_search_placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t.properties_filter_search_placeholder}
            />
            {searchTerm && (
              <button
                type="button"
                className="filter-clear-input"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Location Dropdown */}
          <div className="filter-select-wrap">
            <select
              className="filter-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label={t.properties_filter_location}
            >
              {cityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value ? opt.label[locale] : `${t.properties_filter_location}: ${opt.label[locale]}`}
                </option>
              ))}
            </select>
          </div>

          {/* Property Type Dropdown */}
          <div className="filter-select-wrap">
            <select
              className="filter-select"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              aria-label={t.properties_filter_type}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value ? opt.label[locale] : `${t.properties_filter_type}: ${opt.label[locale]}`}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Dropdown */}
          <div className="filter-select-wrap">
            <select
              className="filter-select"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              aria-label={t.properties_filter_price}
            >
              {priceRanges.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value ? opt.label[locale] : `${t.properties_filter_price}: ${opt.label[locale]}`}
                </option>
              ))}
            </select>
          </div>

          {/* Bedrooms Dropdown */}
          <div className="filter-select-wrap">
            <select
              className="filter-select"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              aria-label={t.properties_filter_bedrooms}
            >
              {bedroomOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value ? opt.label[locale] : `${t.properties_filter_bedrooms}: ${opt.label[locale]}`}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button (Desktop) */}
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={handleResetFilters}
            >
              {t.properties_reset_filters}
            </button>
          )}

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            className="mobile-filter-trigger"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label={t.properties_mobile_filters_btn}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>{t.properties_mobile_filters_btn}</span>
            {activeFilterCount > 0 && (
              <span className="mobile-filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Results Metadata & Sorting Row */}
        <div className="properties-meta-row">
          <div className="properties-count-wrap">
            {!loading && !error && (
              <span className="properties-count">
                <strong>{sortedProperties.length}</strong> {t.properties_results_count}
              </span>
            )}
          </div>

          <div className="properties-sort-wrap">
            <label htmlFor="properties-sort-select" className="sort-label">
              {t.properties_sort_by}:
            </label>
            <select
              id="properties-sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recommended">{t.properties_sort_recommended}</option>
              <option value="price_asc">{t.properties_sort_price_asc}</option>
              <option value="price_desc">{t.properties_sort_price_desc}</option>
            </select>
          </div>
        </div>

        {/* State 1: Loading Skeleton Grid */}
        {loading && (
          <div className="properties-grid" aria-busy="true" aria-label="Loading properties">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="property-skeleton-card" aria-hidden="true">
                <div className="skeleton-media shimmer">
                  <div className="skeleton-badge shimmer" />
                </div>
                <div className="skeleton-body">
                  <div className="skeleton-location shimmer" />
                  <div className="skeleton-title shimmer" />
                  <div className="skeleton-specs">
                    <div className="skeleton-spec shimmer" />
                    <div className="skeleton-spec shimmer" />
                  </div>
                  <div className="skeleton-footer">
                    <div className="skeleton-price shimmer" />
                    <div className="skeleton-btn shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* State 2: Error State */}
        {!loading && error && (
          <div className="properties-error-state" role="alert">
            <div className="error-icon-wrap" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="error-title">{t.properties_error_title}</h3>
            <p className="error-desc">{error}</p>
            <button
              type="button"
              className="error-retry-btn"
              onClick={handleRetry}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>{t.properties_error_retry}</span>
            </button>
          </div>
        )}

        {/* State 3: Empty State */}
        {!loading && !error && sortedProperties.length === 0 && (
          <div className="properties-empty-state">
            <div className="empty-icon-wrap" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className="empty-title">{t.properties_empty_title}</h3>
            <p className="empty-desc">{t.properties_empty_desc}</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="empty-reset-btn"
                onClick={handleResetFilters}
              >
                {t.properties_reset_filters}
              </button>
            )}
          </div>
        )}

        {/* State 4: Real Properties Grid */}
        {!loading && !error && sortedProperties.length > 0 && (
          <div className="properties-grid">
            {sortedProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filters Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t.properties_mobile_filters_btn}
          >
            <div className="mobile-drawer-header">
              <h3 className="mobile-drawer-title">{t.properties_mobile_filters_btn}</h3>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label={t.properties_mobile_close}
              >
                ✕
              </button>
            </div>

            <div className="mobile-drawer-body">
              {/* Location */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_location}</label>
                <select
                  className="mobile-drawer-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  {cityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_type}</label>
                <select
                  className="mobile-drawer-select"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_price}</label>
                <select
                  className="mobile-drawer-select"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                >
                  {priceRanges.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bedrooms */}
              <div className="mobile-drawer-group">
                <label className="mobile-drawer-label">{t.properties_filter_bedrooms}</label>
                <select
                  className="mobile-drawer-select"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                >
                  {bedroomOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label[locale]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-drawer-footer">
              <button
                type="button"
                className="mobile-drawer-reset-btn"
                onClick={handleResetFilters}
              >
                {t.properties_reset_filters}
              </button>
              <button
                type="button"
                className="mobile-drawer-apply-btn"
                onClick={() => setMobileDrawerOpen(false)}
              >
                {t.properties_apply_filters}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
