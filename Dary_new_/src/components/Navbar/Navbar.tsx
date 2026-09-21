import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/branding/FINAL-LOGO1.png';
import './Navbar.css';

export default function Navbar() {
  const { t, locale, setLocale } = useLocale();
  const { isAuthenticated, isOwner, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // We set inline styles directly on the bar element to guarantee
  // that CSS specificity never overrides the scroll-driven values.
  const barRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  const dashboardPath = isAdmin ? '/admin' : isOwner ? '/owner-dashboard' : '/dashboard';

  useEffect(() => {
    let ticking = false;

    function applyProgress() {
      const scrollY = window.scrollY ?? document.documentElement.scrollTop ?? 0;
      const progress = Math.min(Math.max(scrollY / 120, 0), 1);

      const bar = barRef.current;
      if (!bar) return;

      const vw = window.innerWidth;

      // ─── Desktop (> 1024px) ───────────────────────────────────────────────
      if (vw > 1024) {
        // Top state:   calc(100% - 380px)  →  compact state: min(1140, vw-48)
        // Compact (progress=1) values are unchanged.
        const topWidth = vw - 380;          // ~190px margin each side
        const compactWidth = Math.min(1140, vw - 48);
        const width = Math.round(topWidth - (topWidth - compactWidth) * progress);

        const height = Math.round(62 - 2 * progress);          // 62px → 60px
        const radius = Math.round(31 - 1 * progress);          // 31px → 30px
        const paddingInline = +(20 + 2 * progress).toFixed(1); // 20px → 22px

        bar.style.width = `${width}px`;
        bar.style.maxWidth = `${width}px`;
        bar.style.height = `${height}px`;
        bar.style.borderRadius = `${radius}px`;
        bar.style.paddingLeft = `${paddingInline}px`;
        bar.style.paddingRight = `${paddingInline}px`;

        if (logoRef.current) {
          // 36px at top, 36px compact — same both states
          logoRef.current.style.height = '36px';
        }
        if (btnRef.current) {
          const btnH = Math.round(38 - 2 * progress);          // 38px → 36px
          // Button padding same both states: 1.15rem
          btnRef.current.style.height = `${btnH}px`;
          btnRef.current.style.paddingLeft = '1.15rem';
          btnRef.current.style.paddingRight = '1.15rem';
        }

      // ─── Tablet (769px – 1024px) ─────────────────────────────────────────
      } else if (vw > 768) {
        const height = Math.round(68 - 12 * progress);         // 68px → 56px
        const radius = Math.round(34 - 6 * progress);          // 34px → 28px

        bar.style.width = '100%';
        bar.style.maxWidth = '100%';
        bar.style.height = `${height}px`;
        bar.style.borderRadius = `${radius}px`;
        bar.style.paddingLeft = '';
        bar.style.paddingRight = '';

        if (logoRef.current) {
          const logoH = Math.round(40 - 8 * progress);         // 40px → 32px
          logoRef.current.style.height = `${logoH}px`;
        }
        if (btnRef.current) {
          btnRef.current.style.height = '';
          btnRef.current.style.paddingLeft = '';
          btnRef.current.style.paddingRight = '';
        }

      // ─── Mobile (≤ 768px) ─────────────────────────────────────────────────
      } else {
        const height = Math.round(62 - 10 * progress);         // 62px → 52px

        bar.style.width = '100%';
        bar.style.maxWidth = '100%';
        bar.style.height = `${height}px`;
        bar.style.borderRadius = '';
        bar.style.paddingLeft = '';
        bar.style.paddingRight = '';

        if (logoRef.current) {
          const logoH = Math.round(34 - 6 * progress);         // 34px → 28px
          logoRef.current.style.height = `${logoH}px`;
        }
        if (btnRef.current) {
          btnRef.current.style.height = '';
          btnRef.current.style.paddingLeft = '';
          btnRef.current.style.paddingRight = '';
        }
      }

      // Shadow opacity — always update regardless of breakpoint
      bar.style.setProperty('--nav-shadow-progress', progress.toFixed(4));

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(applyProgress);
        ticking = true;
      }
    }

    // Apply immediately on mount so initial state is correct
    applyProgress();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', applyProgress, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', applyProgress);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const links = [
    { to: '/', label: t.nav_home },
    { to: '/properties', label: t.nav_properties },
    { to: '/about', label: t.nav_about },
  ];

  function toggleLocale() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return (
    <header className="navbar-wrapper">
      <nav ref={barRef as React.RefObject<HTMLElement>} className="navbar-bar" aria-label="Main Navigation">
        {/* Brand Logo */}
        <div className="navbar-side navbar-brand-wrap">
          <Link to="/" className="navbar-brand" aria-label={t.site_name}>
            <img ref={logoRef} src={logo} alt={t.site_name} className="navbar-logo" />
          </Link>
        </div>

        {/* Centered Navigation Links */}
        <div className="navbar-center">
          <ul className="navbar-links">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={
                    'navbar-link' + (isActive(link.to) ? ' navbar-link--active' : '')
                  }
                >
                  <span>{link.label}</span>
                  {isActive(link.to) && <span className="navbar-link-indicator" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Language Switcher, Desktop Auth & Mobile Hamburger */}
        <div className="navbar-side navbar-actions">
          <button
            type="button"
            className="navbar-locale-pill"
            onClick={toggleLocale}
            aria-label="Toggle language"
          >
            <svg
              className="navbar-globe-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="navbar-locale-text">
              {locale === 'ar' ? 'EN' : 'عربي'}
            </span>
            <svg
              className="navbar-locale-chevron"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div className="navbar-auth-divider" aria-hidden="true" />

          {/* Desktop Authentication Actions */}
          <div className="navbar-auth-desktop">
            {isAuthenticated ? (
              <Link
                ref={btnRef as React.RefObject<HTMLAnchorElement>}
                to={dashboardPath}
                className="navbar-auth-register"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>{t.nav_dashboard}</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'navbar-auth-login' +
                    (isActive('/login') ? ' navbar-auth-login--active' : '')
                  }
                >
                  {t.nav_login}
                </Link>
                <Link
                  ref={btnRef as React.RefObject<HTMLAnchorElement>}
                  to="/register"
                  className="navbar-auth-register"
                >
                  {t.nav_register}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="navbar-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Floating Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="navbar-mobile-card">
          <ul className="navbar-mobile-links">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={
                    'navbar-mobile-link' +
                    (isActive(link.to) ? ' navbar-mobile-link--active' : '')
                  }
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile Authentication Actions */}
          <div className="navbar-mobile-auth">
            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="navbar-mobile-auth-register"
                onClick={() => setMobileOpen(false)}
              >
                {t.nav_dashboard}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'navbar-mobile-auth-login' +
                    (isActive('/login') ? ' navbar-mobile-auth-login--active' : '')
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {t.nav_login}
                </Link>
                <Link
                  to="/register"
                  className="navbar-mobile-auth-register"
                  onClick={() => setMobileOpen(false)}
                >
                  {t.nav_register}
                </Link>
              </>
            )}
          </div>

          <div className="navbar-mobile-footer">
            <button
              type="button"
              className="navbar-mobile-locale"
              onClick={() => {
                toggleLocale();
                setMobileOpen(false);
              }}
            >
              {locale === 'ar' ? 'English' : 'عربي'}
            </button>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div
          className="navbar-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </header>
  );
}
