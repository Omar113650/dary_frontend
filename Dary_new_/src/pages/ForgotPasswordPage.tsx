import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { AuthService } from '../services/authService';
import logo from '../assets/branding/FINAL-LOGO1.png';
import './Auth.css';

export default function ForgotPasswordPage() {
  const { t, locale, setLocale } = useLocale();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  function toggleLocale() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg(
        locale === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    setIsLoading(true);
    try {
      // POST /auth/forget-password: { "email": "<email>" }
      await AuthService.forgotPassword(cleanEmail);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[ForgotPasswordPage] Error:', err);
      setErrorMsg(
        err?.message ||
          (locale === 'ar'
            ? 'حدث خطأ أثناء محاولة إرسال رابط الاستعادة. يرجى المحاولة لاحقاً.'
            : 'An error occurred while requesting the reset link. Please try again later.')
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page-root">
      {/* Background Photography Layer with subtle cinematic movement */}
      <div className="auth-bg-layer" aria-hidden="true" />

      <div className="auth-shell">
        {/* Top Navigation Bar: Back Link | Center Logo | Language Toggle */}
        <header className="auth-top-nav">
          <div className="auth-nav-start">
            <Link to="/login" className="auth-back-link">
              <span className="auth-back-arrow">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: locale === 'ar' ? 'scaleX(-1)' : 'none' }}
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </span>
              <span>{t.auth_back_to_login}</span>
            </Link>
          </div>

          <div className="auth-nav-center">
            <Link to="/" className="auth-brand-logo-wrap" aria-label={t.site_name}>
              <img src={logo} alt={t.site_name} className="auth-brand-logo" />
            </Link>
          </div>

          <div className="auth-nav-end">
            <button
              type="button"
              className="auth-locale-btn"
              onClick={toggleLocale}
              aria-label="Toggle language"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{locale === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          </div>
        </header>

        {/* Centered Form Area with Stagger Animation */}
        <main className="auth-content-wrap">
          <div className="auth-form-header auth-stagger-item">
            <div className="auth-eyebrow-wrap">
              <span className="auth-eyebrow-accent" aria-hidden="true" />
              <span className="auth-eyebrow">
                {locale === 'ar' ? 'استعادة الحساب' : 'Account Recovery'}
              </span>
            </div>
            <h1 className="auth-title">{t.auth_forgot_title}</h1>
            <p className="auth-subtitle">{t.auth_forgot_subtitle}</p>
          </div>

          {/* Success State */}
          {isSuccess ? (
            <div className="auth-stagger-item" style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                className="auth-alert-success"
                role="status"
                style={{
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '1.75rem 1.25rem',
                  gap: '0.85rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#D1FAE5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    color: '#059669',
                    fontWeight: 800,
                  }}
                >
                  ✓
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#065F46' }}>
                  {t.auth_forgot_success_title}
                </div>
                <div style={{ color: '#047857', fontSize: '0.92rem', maxWidth: '440px', lineHeight: 1.6 }}>
                  {t.auth_forgot_success_desc}
                </div>
              </div>

              <div style={{ marginTop: '1.75rem' }}>
                <Link
                  to="/login"
                  className="auth-submit-btn"
                  style={{ textDecoration: 'none' }}
                >
                  {t.auth_back_to_login}
                </Link>
              </div>
            </div>
          ) : (
            <form className="auth-form auth-stagger-item" onSubmit={handleSubmit} noValidate>
              {/* Error Alert */}
              {errorMsg && (
                <div className="auth-alert-error" role="alert">
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="auth-field-group">
                <label htmlFor="forgot-email" className="auth-label">
                  {t.auth_email_label}
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="auth-input"
                    placeholder={t.auth_email_placeholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isLoading}
                style={{ marginTop: '0.5rem' }}
              >
                {isLoading ? (
                  <>
                    <svg className="auth-btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>{locale === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
                  </>
                ) : (
                  <span>{t.auth_forgot_btn}</span>
                )}
              </button>
            </form>
          )}

          {/* Switch Back to Login */}
          {!isSuccess && (
            <div className="auth-switch-prompt auth-stagger-item">
              <Link to="/login" className="auth-switch-link">
                {t.auth_back_to_login}
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
