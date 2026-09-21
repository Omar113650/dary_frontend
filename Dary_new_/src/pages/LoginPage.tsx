import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { useAuth, extractUserRole, isUserAdmin } from '../context/AuthContext';
import { AuthService } from '../services/authService';
import logo from '../assets/branding/FINAL-LOGO1.png';
import './Auth.css';

export default function LoginPage() {
  const { t, locale, setLocale } = useLocale();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = (location.state as any) || {};
  const prefillEmail = locationState.email || '';
  const successNotice = locationState.message || null;

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Errors & Unverified Account State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSending, setResendSending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function toggleLocale() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }

  async function handleResendOtp() {
    if (!email.trim() || resendSending || resendCooldown > 0) return;
    setResendSending(true);
    setResendNotice(null);
    try {
      await AuthService.resendOtp(email);
      setResendCooldown(60);
      setResendNotice(
        locale === 'ar'
          ? 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح.'
          : 'A new verification code has been sent to your email.'
      );
    } catch (err: any) {
      console.error('[LoginPage] resendOtp error:', err);
      setResendNotice(
        err?.message ||
          (locale === 'ar' ? 'فشل إعادة إرسال الرمز.' : 'Failed to resend verification code.')
      );
    } finally {
      setResendSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setIsUnverified(false);
    setResendNotice(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMsg(
        locale === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
          : 'Please enter both email and password'
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = await login({ email: cleanEmail, password });

      const userRole = extractUserRole(user);
      const isAdminUser = isUserAdmin(user);
      const isOwnerUser = userRole === 'owner' || userRole === 'landlord';

      const targetFrom = locationState?.from?.pathname;
      const isValidFrom =
        targetFrom &&
        targetFrom !== '/login' &&
        targetFrom !== '/register' &&
        targetFrom !== '/verify-otp';

      // Strictly route users according to their actual role:
      if (isAdminUser || userRole === 'super_admin' || userRole === 'admin') {
        if (targetFrom && targetFrom.startsWith('/admin')) {
          navigate(targetFrom, { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
        return;
      }

      if (isOwnerUser) {
        if (targetFrom && targetFrom.startsWith('/owner-dashboard')) {
          navigate(targetFrom, { replace: true });
        } else {
          navigate('/owner-dashboard', { replace: true });
        }
        return;
      }

      // Tenant / Student
      if (
        targetFrom &&
        isValidFrom &&
        !targetFrom.startsWith('/admin') &&
        !targetFrom.startsWith('/owner-dashboard')
      ) {
        navigate(targetFrom, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.error('[LoginPage] Login error:', err);

      const errMsg = (err?.message || '').toLowerCase();
      const errCode = (err?.code || '').toLowerCase();
      const errData = err?.data || {};

      const isUnverifiedAccount =
        errMsg.includes('verify') ||
        errMsg.includes('verification') ||
        errMsg.includes('unverified') ||
        errMsg.includes('not verified') ||
        errMsg.includes('activation') ||
        errMsg.includes('تفعيل') ||
        errMsg.includes('تحقق') ||
        errCode.includes('unverified') ||
        errData.isVerified === false ||
        errData.status === 'PENDING';

      if (isUnverifiedAccount) {
        setIsUnverified(true);
        setErrorMsg(
          locale === 'ar'
            ? 'الحساب غير مفعّل بعد. يرجى تأكيد بريدك الإلكتروني باستخدام رمز التحقق (OTP).'
            : 'Your account is not verified yet. Please verify your email using your OTP.'
        );
        return;
      }

      const isSuspendedAccount =
        errMsg.includes('suspended') ||
        errMsg.includes('inactive') ||
        errMsg.includes('disabled') ||
        errMsg.includes('معلق') ||
        errMsg.includes('حظر') ||
        errMsg.includes('موقوف');

      if (isSuspendedAccount) {
        setErrorMsg(
          locale === 'ar'
            ? 'هذا الحساب معلّق أو غير نشط حالياً. يرجى التواصل مع إدارة المنصة للمساعدة.'
            : 'This account is currently suspended or inactive. Please contact support.'
        );
        return;
      }

      if (errData?.errors && typeof errData.errors === 'object') {
        const fieldErrors = Object.values(errData.errors).flat().join(' | ');
        if (fieldErrors) {
          setErrorMsg(fieldErrors);
          return;
        }
      }

      if (
        errMsg.includes('invalidcredentials') ||
        errMsg.includes('invalid credentials') ||
        errMsg.includes('invalid_credentials') ||
        errMsg.includes('invalid password') ||
        errMsg.includes('wrong password') ||
        errMsg.includes('user not found') ||
        errMsg.includes('incorrect') ||
        err?.status === 401
      ) {
        setErrorMsg(
          locale === 'ar'
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مجدداً.'
            : 'Invalid email or password. Please check your credentials and try again.'
        );
        return;
      }

      if (err?.status === 403) {
        setErrorMsg(
          locale === 'ar'
            ? 'غير مصرح لك بالوصول. يرجى مراجعة إدارة المنصة.'
            : 'Access forbidden. Please contact platform administrators.'
        );
        return;
      }

      if (
        errMsg.includes('failed to fetch') ||
        errMsg.includes('network') ||
        errCode === 'network_error'
      ) {
        setErrorMsg(
          locale === 'ar'
            ? 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل خادم الباك إند (Backend) على المنفذ 8003.'
            : 'Could not connect to the server. Please ensure the backend server is running on port 8003.'
        );
        return;
      }

      setErrorMsg(
        err?.message ||
          (locale === 'ar'
            ? 'فشل تسجيل الدخول. تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً.'
            : 'Login failed. Could not reach the server, please try again later.')
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
        {/* Top Navigation Bar: Back Link | Center DARY Logo | Language Toggle */}
        <header className="auth-top-nav">
          <div className="auth-nav-start">
            <Link to="/" className="auth-back-link">
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
              <span>{locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
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
                {locale === 'ar' ? 'مرحبًا بعودتك' : 'Welcome Back'}
              </span>
            </div>
            <h1 className="auth-title">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
            </h1>
            <p className="auth-subtitle">
              {locale === 'ar'
                ? 'سجّل دخولك للوصول إلى حسابك ومتابعة خيارات السكن المناسبة لك.'
                : 'Sign in to access your account and continue your housing journey.'}
            </p>
          </div>

          {/* Success Notice */}
          {successNotice && (
            <div className="auth-alert-success" role="status">
              <span>✓</span>
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="auth-alert-error" role="alert">
              <div>{errorMsg}</div>

              {isUnverified && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #FCA5A5',
                    marginTop: '0.25rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/verify-otp', {
                        state: { email: email.trim().toLowerCase() },
                      })
                    }
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: '8px',
                      backgroundColor: '#0B2A4A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {locale === 'ar' ? 'إدخال رمز التحقق (OTP) ←' : 'Verify OTP Now →'}
                  </button>

                  <button
                    type="button"
                    disabled={resendSending || resendCooldown > 0}
                    onClick={handleResendOtp}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#0B2A4A',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: resendSending || resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {resendSending
                      ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                      : resendCooldown > 0
                      ? `${locale === 'ar' ? 'إعادة الإرسال بعد' : 'Resend in'} ${resendCooldown}s`
                      : (locale === 'ar' ? 'إعادة إرسال الرمز' : 'Resend OTP')}
                  </button>

                  {resendNotice && (
                    <div style={{ width: '100%', fontSize: '0.8rem', color: '#047857', marginTop: '0.25rem' }}>
                      {resendNotice}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form className="auth-form auth-stagger-item" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="login-email" className="auth-label">
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
                  id="login-email"
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

            {/* Password Field */}
            <div className="auth-field-group">
              <label htmlFor="login-password" className="auth-label">
                {t.auth_password_label}
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder={t.auth_password_placeholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            {/* Remember Me & Forgot Password */}
            <div className="auth-options-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{t.auth_remember_me}</span>
              </label>

              <Link
                to="/forgot-password"
                className="auth-forgot-link"
              >
                {t.auth_forgot_password}
              </Link>
            </div>

            {/* Primary CTA Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="auth-btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>{locale === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</span>
              )}
            </button>
          </form>

          {/* Switch Prompt */}
          <div className="auth-switch-prompt auth-stagger-item">
            <span>{t.auth_no_account}</span>
            <Link to="/register" className="auth-switch-link">
              {t.auth_create_account_link}
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
