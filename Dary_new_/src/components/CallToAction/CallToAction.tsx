import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import './CallToAction.css';

export default function CallToAction() {
  const { t } = useLocale();

  return (
    <section className="cta-section" aria-label={t.cta_button}>
      <div className="container">
        <Link to="/properties" className="cta-card">
          <span className="cta-text">{t.cta_button}</span>
          <svg
            className="cta-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
