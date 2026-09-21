import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { propertyService } from '../../services/propertyService';
import type { Property } from '../../types/property';
import PropertyCard from '../PropertyCard/PropertyCard';
import './FeaturedProperties.css';

export default function FeaturedProperties() {
  const { t, locale } = useLocale();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // ── Real API data ──────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatured = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a small set of properties for the home-page carousel
      const data = await propertyService.getFeaturedProperties(8);
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[FeaturedProperties] Could not load from API:', err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);
  // ─────────────────────────────────────────────────────────────────────────

  function checkScroll() {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const isRTL = document.documentElement.dir === 'rtl' || locale === 'ar';

    if (isRTL) {
      const maxScroll = scrollWidth - clientWidth;
      const current = Math.abs(scrollLeft);
      setAtStart(current <= 15);
      setAtEnd(current >= maxScroll - 15);
    } else {
      setAtStart(scrollLeft <= 15);
      setAtEnd(scrollLeft + clientWidth >= scrollWidth - 15);
    }
  }

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;
    checkScroll();
    container.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, properties]);

  function handleScroll(direction: 'prev' | 'next') {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const card = container.querySelector('.featured-carousel-item') as HTMLElement;
    const scrollAmount = card ? card.offsetWidth + 28 : 380;

    const isRTL = document.documentElement.dir === 'rtl' || locale === 'ar';
    const multiplier = direction === 'next' ? 1 : -1;
    const delta = isRTL ? -multiplier * scrollAmount : multiplier * scrollAmount;

    container.scrollBy({ left: delta, behavior: 'smooth' });
  }

  // Skeleton placeholders while loading
  if (loading) {
    return (
      <section className="featured-section section" aria-label="Featured Properties">
        <div className="container">
          <div className="featured-header-row">
            <div className="section-header">
              <span className="section-tagline">{t.featured_tagline}</span>
              <h2 className="section-title">{t.featured_title}</h2>
            </div>
          </div>
          <div className="featured-carousel" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div key={n} className="featured-carousel-item">
                <div style={{ height: '340px', borderRadius: '16px', background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state — backend returned 0 properties
  if (!loading && (!Array.isArray(properties) || properties.length === 0)) {
    return null;
  }

  return (
    <section className="featured-section section" aria-label="Featured Properties">
      <div className="container">
        <div className="featured-header-row">
          <div className="section-header">
            <span className="section-tagline">{t.featured_tagline}</span>
            <h2 className="section-title">{t.featured_title}</h2>
          </div>

          {/* Carousel Navigation Buttons */}
          <div className="featured-carousel-controls" aria-label="Carousel navigation">
            <button
              type="button"
              className="featured-carousel-btn"
              onClick={() => handleScroll('prev')}
              aria-label={locale === 'ar' ? 'السابق' : 'Previous'}
              disabled={atStart}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {locale === 'ar' ? (
                  <polyline points="9 18 15 12 9 6" />
                ) : (
                  <polyline points="15 18 9 12 15 6" />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="featured-carousel-btn"
              onClick={() => handleScroll('next')}
              aria-label={locale === 'ar' ? 'التالي' : 'Next'}
              disabled={atEnd}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {locale === 'ar' ? (
                  <polyline points="15 18 9 12 15 6" />
                ) : (
                  <polyline points="9 18 15 12 9 6" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Single Horizontal Row / Carousel */}
        <div className="featured-carousel" ref={carouselRef}>
          {(Array.isArray(properties) ? properties : []).map((property) => (
            <div key={property.id} className="featured-carousel-item">
              <PropertyCard property={property} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
