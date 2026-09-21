import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import logo from '../../assets/branding/FINAL-LOGO1.png';
import './Footer.css';

export default function Footer() {
  const { t, locale, setLocale } = useLocale();

  const links = [
    { to: '/', label: t.nav_home },
    { to: '/properties', label: t.nav_properties },
    { to: '/about', label: t.nav_about },
  ];

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-main">
          {/* Brand & Short Description */}
          <div className="footer-col footer-col--brand">
            <Link to="/" className="footer-brand" aria-label={t.site_name}>
              <img src={logo} alt={t.site_name} className="footer-logo" />
            </Link>
            <p className="footer-desc">{t.footer_desc}</p>
          </div>

          {/* Quick Navigation Links */}
          <div className="footer-col footer-col--links">
            <h4 className="footer-heading">{t.footer_links_title}</h4>
            <ul className="footer-nav-list">
              {links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Language Switcher */}
          <div className="footer-col footer-col--locale">
            <h4 className="footer-heading">{t.footer_language_title}</h4>
            <div className="footer-locale-segmented" role="group" aria-label={t.footer_language_title}>
              <button
                type="button"
                className={`footer-locale-seg ${locale === 'ar' ? 'footer-locale-seg--active' : ''}`}
                onClick={() => setLocale('ar')}
              >
                عربي
              </button>
              <button
                type="button"
                className={`footer-locale-seg ${locale === 'en' ? 'footer-locale-seg--active' : ''}`}
                onClick={() => setLocale('en')}
              >
                English
              </button>
            </div>
          </div>

          {/* Social Media */}
          <div className="footer-col footer-col--social">
            <h4 className="footer-heading">{t.footer_social_title}</h4>
            <div className="footer-social-links">
              <a
                href="https://www.facebook.com/dary.houses"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-btn"
                aria-label="Facebook"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Divider & Copyright */}
        <div className="footer-bottom">
          <p className="footer-copyright">{t.footer_copyright}</p>
        </div>
      </div>
    </footer>
  );
}
