import { useLocale } from '../../utils/LocaleContext';
import PropertySearch from '../PropertySearch/PropertySearch';
import TrustFeatures from '../TrustFeatures/TrustFeatures';
import heroApartmentImg from '../../assets/hero/hero-apartment.jpg';
import './Hero.css';

export default function Hero() {
  const { t, locale } = useLocale();

  const handleScrollDown = () => {
    const nextSection =
      document.getElementById('featured-properties') ||
      document.querySelector('.featured-section') ||
      document.querySelector('section:nth-of-type(2)');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-section" aria-label="Hero">
      {/* Cinematic Full-Bleed 100vh Residential Bedroom Photography */}
      <div className="hero-media-wrap">
        <img
          src={heroApartmentImg}
          alt="Modern Student Apartment Bedroom"
          className="hero-image"
          loading="eager"
        />
        <div className="hero-overlay" />
      </div>

      {/* Content Container — Left Portion (~40-45%) on Desktop */}
      <div className="hero-content-container container">
        <div className="hero-content-column">
          {/* Text Hierarchy */}
          <div className="hero-text-card">
            {t.hero_kicker && (
              <div className="hero-kicker-wrap">
                <span className="hero-kicker-dot" aria-hidden="true" />
                <span className="hero-kicker">{t.hero_kicker}</span>
              </div>
            )}
            <h1 className="hero-headline">
              {locale === 'en' ? (
                <>
                  More than just housing
                  <br />
                  A community building your future
                </>
              ) : (
                <>
                  أكثر من مجرد سكن
                  <br />
                  مجتمع يبني مستقبلك
                </>
              )}
            </h1>
            {t.hero_subtitle && (
              <p className="hero-subtitle">{t.hero_subtitle}</p>
            )}
          </div>

          {/* Integrated Search Bar (sits directly beneath text in the same column) */}
          <div className="hero-search-wrap">
            <PropertySearch />
          </div>

          {/* Trust Features (directly below search in the same column) */}
          <div className="hero-trust-wrap">
            <TrustFeatures />
          </div>
        </div>
      </div>

      {/* Subtle Scroll Down Indicator */}
      <button
        type="button"
        className="hero-scroll-indicator"
        onClick={handleScrollDown}
        aria-label={locale === 'ar' ? 'التمرير للأسفل' : 'Scroll down'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </section>
  );
}
