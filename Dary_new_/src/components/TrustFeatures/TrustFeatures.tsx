import { useLocale } from '../../utils/LocaleContext';
import './TrustFeatures.css';

export default function TrustFeatures() {
  const { t } = useLocale();

  return (
    <section className="hero-trust-section" aria-label="DARY Trust Features">
      <div className="container hero-trust-container">
        <div className="hero-trust-row">
          {/* 1. Student Community */}
          <div className="hero-trust-item">
            <svg
              className="hero-trust-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="hero-trust-label">{t.trust_community}</span>
          </div>

          <div className="hero-trust-divider" aria-hidden="true" />

          {/* 2. Safe Environment */}
          <div className="hero-trust-item">
            <svg
              className="hero-trust-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="hero-trust-label">{t.trust_safe_env}</span>
          </div>

          <div className="hero-trust-divider" aria-hidden="true" />

          {/* 3. Trusted Properties */}
          <div className="hero-trust-item">
            <svg
              className="hero-trust-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="hero-trust-label">{t.trust_trusted_props}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
