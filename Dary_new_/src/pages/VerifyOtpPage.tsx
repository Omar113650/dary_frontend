import { useState, useEffect, useRef } from 'react';
import type { FormEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { AuthService } from '../services/authService';
import logo from '../assets/branding/FINAL-LOGO1.png';
import './Auth.css';

export default function VerifyOtpPage() {
  const { t, locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = (location.state as any) || {};
  const queryParams = new URLSearchParams(location.search);
  const initialEmail = locationState.email || queryParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);

  // Refs for each digit input
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resend OTP state
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Focus the first empty digit input on mount
  useEffect(() => {
    if (!isEditingEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [isEditingEmail]);

  function toggleLocale() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }

  function handleDigitChange(index: number, val: string) {
    const numericChar = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = numericChar;
    setDigits(newDigits);

    if (numericChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < 5) inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || '';
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  const otpCode = digits.join('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setResendSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanEmail) {
      setErrorMsg(
        locale === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني.'
          : 'Please provide your email address.'
      );
      return;
    }

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg(
        locale === 'ar'
          ? 'يجب إدخال جميع أرقام رمز التحقق الستة.'
          : 'Please enter all 6 digits of the verification code.'
      );
      return;
    }

    setIsLoading(true);
    try {
      // POST /auth/verify-otp
      await AuthService.verifyOtp({ email: cleanEmail, otp: cleanOtp });

      navigate('/login', {
        state: {
          email: cleanEmail,
          message:
            locale === 'ar'
              ? 'تم تأكيد بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول.'
              : 'Your email has been verified successfully! You can now sign in.',
        },
        replace: true,
      });
    } catch (err: any) {
      console.error('[VerifyOtpPage] verifyOtp error:', err);
      setErrorMsg(
        err?.message ||
          (locale === 'ar'
            ? 'رمز التحقق غير صحيح أو انتهت صلاحيته. يرجى إعادة المحاولة.'
            : 'Invalid or expired verification code. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (isResending || resendCooldown > 0) return;
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg(
        locale === 'ar'
          ? 'يرجى إدخال البريد الإلكتروني لإعادة إرسال الرمز.'
          : 'Please enter your email to resend the code.'
      );
      return;
    }

    setIsResending(true);
    setErrorMsg(null);
    setResendSuccess(null);

    try {
      // POST /auth/resend-otp
      await AuthService.resendOtp(cleanEmail);
      setResendCooldown(60);
      setResendSuccess(
        locale === 'ar'
          ? 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني بنجاح.'
          : 'A new verification code has been sent to your email.'
      );
    } catch (err: any) {
      console.error('[VerifyOtpPage] resendOtp error:', err);
      setErrorMsg(
        err?.message ||
          (locale === 'ar'
            ? 'فشل إرسال رمز التحقق مجددًا. يرجى المحاولة لاحقًا.'
            : 'Failed to resend verification code. Please try again later.')
      );
    } finally {
      setIsResending(false);
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
              <span>{t.auth_login_link}</span>
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
                {locale === 'ar' ? 'تأكيد الحساب' : 'Account Verification'}
              </span>
            </div>
            <h1 className="auth-title">{t.auth_otp_title}</h1>
            <p className="auth-subtitle">{t.auth_otp_subtitle}</p>
          </div>

          {/* Success Notice */}
          {resendSuccess && (
            <div className="auth-alert-success" role="status">
              <span>✓</span>
              <span>{resendSuccess}</span>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="auth-alert-error" role="alert">
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="auth-form auth-stagger-item" onSubmit={handleSubmit} noValidate>
            {/* Email Field with Edit Toggle */}
            <div className="auth-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="verify-email" className="auth-label">
                  {t.auth_email_label}
                </label>
                {email && !isEditingEmail && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2F6BFF',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {locale === 'ar' ? 'تعديل البريد' : 'Change email'}
                  </button>
                )}
              </div>

              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="verify-email"
                  type="email"
                  className="auth-input"
                  value={email}
                  disabled={!isEditingEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth_email_placeholder}
                  required
                />
              </div>
            </div>

            {/* 6 Individual OTP Digit Boxes */}
            <div className="auth-field-group" style={{ alignItems: 'center' }}>
              <label htmlFor="otp-digit-0" className="auth-label" style={{ textAlign: 'center', width: '100%' }}>
                {t.auth_otp_label}
              </label>

              <div className="auth-otp-boxes-wrap" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className={`auth-otp-digit-input ${digit ? 'auth-otp-digit-input--filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    aria-label={`OTP Digit ${idx + 1}`}
                  />
                ))}
              </div>

              <span className="auth-field-hint" style={{ textAlign: 'center' }}>
                {locale === 'ar'
                  ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني'
                  : 'Enter the 6-digit code sent to your email'}
              </span>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
              style={{ marginTop: '0.75rem' }}
            >
              {isLoading ? (
                <>
                  <svg className="auth-btn-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>{locale === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
                </>
              ) : (
                <span>{t.auth_otp_button}</span>
              )}
            </button>

            {/* Resend OTP Block */}
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem',
                borderRadius: '14px',
                backgroundColor: '#FAFBFC',
                border: '1px solid #E2E8F0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '0.45rem' }}>
                {locale === 'ar' ? 'لم تستلم رمز التحقق؟' : "Didn't receive the code?"}
              </div>

              <button
                type="button"
                disabled={isResending || resendCooldown > 0}
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#94A3B8' : '#2F6BFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: resendCooldown > 0 || isResending ? 'not-allowed' : 'pointer',
                }}
              >
                {isResending
                  ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
                  : resendCooldown > 0
                  ? `${t.auth_otp_resend_countdown} ${resendCooldown}s`
                  : t.auth_otp_resend}
              </button>
            </div>
          </form>

          {/* Switch Prompt */}
          <div className="auth-switch-prompt auth-stagger-item">
            <span>{t.auth_have_account}</span>
            <Link to="/login" className="auth-switch-link">
              {t.auth_login_link}
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
