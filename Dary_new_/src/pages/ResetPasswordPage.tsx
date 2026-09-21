import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { AuthService } from '../services/authService';
import logo from '../assets/branding/FINAL-LOGO1.png';
import './Auth.css';

export default function ResetPasswordPage() {
  const { t, locale, setLocale } = useLocale();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // The backend contract delivers tokens via email link: ${FRONTEND_URL}/reset-password/${userId}/${resetToken}
  // Also gracefully read from searchParams if navigated with ?userId=...&resetToken=...
  const userId = params.userId || searchParams.get('userId') || '';
  const resetToken = params.resetToken || searchParams.get('resetToken') || searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  function toggleLocale() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }

  // Password rules progressive check
  const hasMinLength = newPassword.length >= 8 && newPassword.length <= 72;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);

    if (!userId || !resetToken) {
      setErrorMsg(t.auth_reset_invalid_token);
      return;
    }

    if (!newPassword) {
      setErrorMsg(locale === 'ar' ? 'يرجى إدخال كلمة المرور الجديدة.' : 'Please enter a new password.');
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setErrorMsg(
        locale === 'ar'
          ? 'يجب أن تستوفي كلمة المرور جميع شروط الأمان الموضحة.'
          : 'Password must satisfy all security requirements.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(locale === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // POST /auth/reset-password: { userId, resetToken, newPassword }
      await AuthService.resetPassword({
        userId,
        resetToken,
        newPassword,
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[ResetPasswordPage] Error:', err);
      setErrorMsg(
        err?.message ||
          (locale === 'ar'
            ? 'فشل تغيير كلمة المرور. قد يكون الرابط منتهي الصلاحية أو غير صالح.'
            : 'Failed to reset password. The link may be expired or invalid.')
      );
    } finally {
      setIsLoading(false);
    }
  }

  const isTokenMissing = !userId || !resetToken;

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
                {locale === 'ar' ? 'إعادة التعيين' : 'Password Reset'}
              </span>
            </div>
            <h1 className="auth-title">{t.auth_reset_title}</h1>
            <p className="auth-subtitle">{t.auth_reset_subtitle}</p>
          </div>

          {/* Missing Token Warning */}
          {isTokenMissing && !isSuccess && (
            <div className="auth-alert-error auth-stagger-item" role="alert">
              <div>{t.auth_reset_invalid_token}</div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                <Link to="/forgot-password" style={{ color: '#991B1B', fontWeight: 700, textDecoration: 'underline' }}>
                  {locale === 'ar' ? 'طلب رابط جديد لاستعادة كلمة المرور' : 'Request a new password reset link'}
                </Link>
              </div>
            </div>
          )}

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
                  {t.auth_reset_success_title}
                </div>
                <div style={{ color: '#047857', fontSize: '0.92rem', maxWidth: '440px', lineHeight: 1.6 }}>
                  {t.auth_reset_success_desc}
                </div>
              </div>

              <div style={{ marginTop: '1.75rem' }}>
                <Link
                  to="/login"
                  className="auth-submit-btn"
                  style={{ textDecoration: 'none' }}
                >
                  {t.auth_login_button}
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

              {/* New Password */}
              <div className="auth-field-group">
                <label htmlFor="reset-new-password" className="auth-label">
                  {t.auth_new_password_label}
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t.auth_password_placeholder}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isTokenMissing}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="auth-field-group">
                <label htmlFor="reset-confirm-password" className="auth-label">
                  {t.auth_confirm_password_label}
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t.auth_confirm_password_placeholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isTokenMissing}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Progressive Password Checklist */}
              <div className="auth-password-checklist">
                <span className={`auth-rule-item ${hasMinLength ? 'auth-rule-item--valid' : ''}`}>
                  <span className="auth-rule-icon">{hasMinLength ? '✓' : '○'}</span>
                  <span>{locale === 'ar' ? '8–72 حرفًا' : '8–72 chars'}</span>
                </span>
                <span className={`auth-rule-item ${hasUpper ? 'auth-rule-item--valid' : ''}`}>
                  <span className="auth-rule-icon">{hasUpper ? '✓' : '○'}</span>
                  <span>{locale === 'ar' ? 'حرف كبير (A-Z)' : 'Uppercase'}</span>
                </span>
                <span className={`auth-rule-item ${hasLower ? 'auth-rule-item--valid' : ''}`}>
                  <span className="auth-rule-icon">{hasLower ? '✓' : '○'}</span>
                  <span>{locale === 'ar' ? 'حرف صغير (a-z)' : 'Lowercase'}</span>
                </span>
                <span className={`auth-rule-item ${hasNumber ? 'auth-rule-item--valid' : ''}`}>
                  <span className="auth-rule-icon">{hasNumber ? '✓' : '○'}</span>
                  <span>{locale === 'ar' ? 'رقم (0-9)' : 'Number'}</span>
                </span>
                <span className={`auth-rule-item ${hasSpecial ? 'auth-rule-item--valid' : ''}`}>
                  <span className="auth-rule-icon">{hasSpecial ? '✓' : '○'}</span>
                  <span>{locale === 'ar' ? 'رمز خاص (!@#$)' : 'Special char'}</span>
                </span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isLoading || isTokenMissing}
                style={{ marginTop: '0.75rem' }}
              >
                {isLoading ? (
                  <>
                    <svg className="auth-btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>{locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>{t.auth_reset_btn}</span>
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
