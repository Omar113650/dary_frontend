import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import type { Property } from '../../types/property';
import { getPropertyOccupancySummary } from '../../services/occupancyService';
import './PropertyCard.css';

interface PropertyCardProps {
  property: Property;
  customBookings?: any[];
}

export default function PropertyCard({ property, customBookings }: PropertyCardProps) {
  const { t, locale } = useLocale();

  const occ = useMemo(() => {
    return getPropertyOccupancySummary(property, customBookings, locale);
  }, [property, customBookings, locale]);

  return (
    <article className="property-card">
      <Link
        to={`/properties/${property.id}`}
        state={{ property }}
        className="property-card-link-wrapper"
      >
        {/* Media */}
        <div className="property-card-media" style={{ position: 'relative' }}>
          <img
            src={property.image}
            alt={property.title[locale]}
            className="property-card-image"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';
            }}
          />
          <span className="property-card-badge">{property.type[locale]}</span>

          {/* Occupancy Status Badge on Media */}
          {occ.badgeType === 'occupied' && (
            <span
              style={{
                position: 'absolute',
                top: '10px',
                insetInlineEnd: '10px',
                backgroundColor: 'rgba(220, 38, 38, 0.95)',
                color: '#FFFFFF',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 2,
              }}
            >
              {occ.vacatingDate
                ? (locale === 'ar' ? `🔒 محجوز حتى ${occ.vacatingDate}` : `🔒 Booked until ${occ.vacatingDate}`)
                : (locale === 'ar' ? '🔒 محجوز بالكامل' : '🔒 Fully Booked')}
            </span>
          )}

          {occ.badgeType === 'partial' && (
            <span
              style={{
                position: 'absolute',
                top: '10px',
                insetInlineEnd: '10px',
                backgroundColor: 'rgba(217, 119, 6, 0.95)',
                color: '#FFFFFF',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 2,
              }}
            >
              {locale === 'ar'
                ? `⚠️ متاح ${occ.availableBeds} من ${occ.totalBeds} أسرّة`
                : `⚠️ ${occ.availableBeds} of ${occ.totalBeds} beds`}
            </span>
          )}
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

          {/* Booking & Vacancy Schedule Banner */}
          <div
            style={{
              marginTop: '0.65rem',
              marginBottom: '0.65rem',
              padding: '0.5rem 0.65rem',
              borderRadius: '8px',
              backgroundColor:
                occ.badgeType === 'occupied'
                  ? '#FEF2F2'
                  : occ.badgeType === 'partial'
                  ? '#FFFBEB'
                  : '#F0FDF4',
              border:
                '1px solid ' +
                (occ.badgeType === 'occupied'
                  ? '#FECACA'
                  : occ.badgeType === 'partial'
                  ? '#FDE68A'
                  : '#BBF7D0'),
              fontSize: '0.76rem',
              lineHeight: 1.45,
            }}
          >
            {/* Top Row: Status & Vacancy Date */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  color:
                    occ.badgeType === 'occupied'
                      ? '#991B1B'
                      : occ.badgeType === 'partial'
                      ? '#92400E'
                      : '#166534',
                }}
              >
                {occ.badgeType === 'occupied'
                  ? (locale === 'ar' ? '🔒 محجوز بالكامل' : '🔒 Fully Booked')
                  : occ.badgeType === 'partial'
                  ? (locale === 'ar' ? `⚠️ متاح ${occ.availableBeds} من ${occ.totalBeds} أسرّة` : `⚠️ ${occ.availableBeds} of ${occ.totalBeds} beds available`)
                  : (locale === 'ar' ? '✓ شاغر ومتاح للحجز الفوري' : '✓ Vacant & Available Now')}
              </span>
              {occ.vacatingDate && (
                <span
                  style={{
                    fontWeight: 700,
                    color: occ.badgeType === 'occupied' ? '#DC2626' : '#2563EB',
                    fontSize: '0.73rem',
                  }}
                >
                  {locale === 'ar' ? `يفضى: ${occ.vacatingDate}` : `Vacating: ${occ.vacatingDate}`}
                </span>
              )}
            </div>

            {/* Exact Booking Duration: e.g. ٢٧/٩/٢٠٢٦ ↓ ٢٧/١٢/٢٠٢٦ */}
            {occ.rangeDisplay ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '0.3rem',
                  paddingTop: '0.3rem',
                  borderTop: '1px dashed rgba(0,0,0,0.08)',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                <span>📅 {locale === 'ar' ? 'فترة الحجز:' : 'Stay Period:'}</span>
                <span style={{ color: '#0B2A4A', direction: 'ltr', unicodeBidi: 'embed' }}>
                  {occ.startFormatted}
                </span>
                <span style={{ color: '#2563EB', fontWeight: 900, fontSize: '0.85rem' }}>↓</span>
                <span style={{ color: '#0B2A4A', direction: 'ltr', unicodeBidi: 'embed' }}>
                  {occ.endFormatted}
                </span>
              </div>
            ) : null}
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
