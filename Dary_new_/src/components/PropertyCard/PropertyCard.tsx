import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import type { Property } from '../../types/property';
import './PropertyCard.css';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const { t, locale } = useLocale();

  return (
    <article className="property-card">
      <Link to={`/properties/${property.id}`} className="property-card-link-wrapper">
        {/* Media */}
        <div className="property-card-media">
          <img
            src={property.image}
            alt={property.title[locale]}
            className="property-card-image"
            loading="lazy"
          />
          <span className="property-card-badge">{property.type[locale]}</span>
        </div>

        {/* Details */}
        <div className="property-card-content">
          <div className="property-card-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{property.location[locale]}</span>
          </div>

          <h3 className="property-card-title">{property.title[locale]}</h3>

          <div className="property-card-specs">
            <div className="property-spec-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4v16" />
                <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                <path d="M2 17h20" />
                <path d="M6 8v9" />
              </svg>
              <span>
                {property.bedrooms} {t.bedrooms_label}
              </span>
            </div>

            <span className="property-spec-dot">•</span>

            <div className="property-spec-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6h6" />
                <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" />
                <path d="M4 14h16" />
              </svg>
              <span>
                {property.bathrooms} {t.bathrooms_label}
              </span>
            </div>
          </div>

          {/* Pricing & CTA */}
          <div className="property-card-footer">
            <div className="property-card-price-wrap">
              <span className="property-card-price">
                {property.price.toLocaleString()} {property.currency}
              </span>
              <span className="property-card-period">{t.per_month}</span>
            </div>

            <span className="property-card-action">
              <span>{t.featured_view}</span>
              <svg className="property-card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {locale === 'ar' ? (
                  <path d="m15 18-6-6 6-6" />
                ) : (
                  <path d="m9 18 6-6-6-6" />
                )}
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
