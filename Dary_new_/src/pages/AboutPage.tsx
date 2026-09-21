import { useLocale } from '../utils/LocaleContext';
import HowItWorks from '../components/HowItWorks/HowItWorks';
import WhyDary from '../components/WhyDary/WhyDary';
import './AboutPage.css';

export default function AboutPage() {
  const { t } = useLocale();

  return (
    <main className="about-page">
      {/* 1. About Page Hero */}
      <header className="about-hero">
        <div className="container">
          <div className="about-hero-content">
            <h1 className="about-hero-title">{t.about_hero_title}</h1>
            <p className="about-hero-subtitle">{t.about_hero_subtitle}</p>
          </div>
        </div>
      </header>

      {/* 2. Mission & Vision Cards */}
      <section className="about-purpose-section" aria-labelledby="about-purpose-heading">
        <div className="container">
          <div className="section-header">
            <span className="section-tagline">{t.about_purpose_tagline}</span>
            <h2 id="about-purpose-heading" className="section-title">
              {t.about_purpose_title}
            </h2>
          </div>

          <div className="about-purpose-grid">
            {/* Card 1: Our Mission (Navy Card) */}
            <article className="purpose-card purpose-card--navy">
              <div className="purpose-card-header">
                <div className="purpose-icon-wrap purpose-icon-wrap--navy">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                </div>
                <span className="purpose-badge purpose-badge--navy">
                  {t.about_mission_label}
                </span>
              </div>
              <h3 className="purpose-card-title purpose-card-title--navy">
                {t.about_mission_title}
              </h3>
              <p className="purpose-card-desc purpose-card-desc--navy">
                {t.about_mission_desc}
              </p>
            </article>

            {/* Card 2: Our Vision (White Card with Navy Accents) */}
            <article className="purpose-card purpose-card--white">
              <div className="purpose-card-header">
                <div className="purpose-icon-wrap purpose-icon-wrap--white">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <span className="purpose-badge purpose-badge--white">
                  {t.about_vision_label}
                </span>
              </div>
              <h3 className="purpose-card-title purpose-card-title--white">
                {t.about_vision_title}
              </h3>
              <p className="purpose-card-desc purpose-card-desc--white">
                {t.about_vision_desc}
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. How DARY Works */}
      <HowItWorks />

      {/* 4. Why Students Choose DARY */}
      <WhyDary />
    </main>
  );
}
