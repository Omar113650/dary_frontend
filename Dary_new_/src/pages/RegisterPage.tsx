import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../utils/LocaleContext';
import { AuthService } from '../services/authService';
import logo from '../assets/branding/FINAL-LOGO1.png';
import './Auth.css';

export default function RegisterPage() {
  const { t, locale, setLocale } = useLocale();
  const navigate = useNavigate();

  // Role Selection (strictly 'tenant' or 'owner')
  const [role, setRole] = useState<'tenant' | 'owner'>('tenant');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Errors
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function toggleLocale() {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  }

  // Password rule tests for progressive UX feedback
  const hasMinLength = password.length >= 8 && password.length <= 72;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  // Validation
  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    const cleanFirstName = firstName.trim();
    if (!cleanFirstName || cleanFirstName.length < 2 || cleanFirstName.length > 50) {
      errors.firstName =
        locale === 'ar'
          ? 'الاسم الأول مطلوب (2–50 حرفًا).'
          : 'First name is required (2–50 characters).';
    }

    const cleanLastName = lastName.trim();
    if (!cleanLastName || cleanLastName.length < 2 || cleanLastName.length > 50) {
      errors.lastName =
        locale === 'ar'
          ? 'اسم العائلة مطلوب (2–50 حرفًا).'
          : 'Last name is required (2–50 characters).';
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail) || cleanEmail.length > 255) {
      errors.email =
        locale === 'ar'
          ? 'يرجى إدخال بريد إلكتروني صحيح (بحد أقصى 255 حرفًا).'
          : 'Please enter a valid email address (max 255 chars).';
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    if (!cleanPhone) {
      errors.phone =
        locale === 'ar'
          ? 'رقم الهاتف مطلوب بالصيغة الدولية (مثال: +201012345678).'
          : 'Phone number is required in international format (e.g. +201012345678).';
    } else if (!phoneRegex.test(cleanPhone)) {
      errors.phone =
        locale === 'ar'
          ? 'صيغة الهاتف غير صحيحة. يجب أن تبدأ برمز الدولة (+).'
          : 'Invalid phone format. Must start with country code (+).';
    }

    const cleanWhatsapp = whatsappPhone.trim().replace(/\s+/g, '');
    if (cleanWhatsapp && !phoneRegex.test(cleanWhatsapp)) {
      errors.whatsappPhone =
        locale === 'ar'
          ? 'صيغة رقم الواتساب غير صحيحة. يجب أن تبدأ برمز الدولة (+).'
          : 'Invalid WhatsApp format. Must start with country code (+).';
    }

    if (!password) {
      errors.password = locale === 'ar' ? 'كلمة المرور مطلوبة.' : 'Password is required.';
    } else if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      errors.password =
        locale === 'ar'
          ? 'يرجى استيفاء شروط كلمة المرور الموضحة أدناه.'
          : 'Please satisfy all password criteria below.';
    }

    if (confirmPassword !== password) {
      errors.confirmPassword =
        locale === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const cleanWhatsapp = whatsappPhone.trim().replace(/\s+/g, '');

      // POST /auth/register
      await AuthService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: cleanPhone,
        whatsappPhone: cleanWhatsapp || undefined,
        roles: role, // 'tenant' or 'owner' only
      });

      // Redirect to OTP verification screen
      navigate('/verify-otp', {
        state: { email: email.trim().toLowerCase() },
        replace: true,
      });
    } catch (err: any) {
      console.error('[RegisterPage] Registration error:', err);

      const errData = err?.data;
      if (errData?.errors && typeof errData.errors === 'object') {
        const mapped: Record<string, string> = {};
        for (const [key, val] of Object.entries(errData.errors)) {
          mapped[key] = Array.isArray(val) ? val.join(', ') : String(val);
        }
        setFieldErrors(mapped);
      }

      const errMsg = (err?.message || '').toLowerCase();
      const errCode = (err?.code || '').toLowerCase();

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
            ? 'فشل إنشاء الحساب. يرجى التحقق من البيانات المدخلة والمحاولة مجددًا.'
            : 'Registration failed. Please review your input and try again.')
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
                {locale === 'ar' ? 'ابدأ رحلتك مع داري' : 'Start your journey with DARY'}
              </span>
            </div>
            <h1 className="auth-title">
              {locale === 'ar' ? 'إنشاء حساب' : 'Create account'}
            </h1>
            <p className="auth-subtitle">
              {locale === 'ar'
                ? 'أنشئ حسابك لاستكشاف السكن المناسب لك بسهولة والتواصل مباشرة.'
                : 'Create your account to easily explore student housing and connect directly.'}
            </p>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="auth-alert-error" role="alert">
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="auth-form auth-stagger-item" onSubmit={handleSubmit} noValidate>
            {/* Role Selector: Student/Tenant vs Property Owner */}
            <div className="auth-field-group">
              <label className="auth-label">
                {locale === 'ar' ? 'نوع الحساب' : 'Account type'}
              </label>
              <div className="auth-role-selector-grid">
                <button
                  type="button"
                  onClick={() => setRole('tenant')}
                  className={`auth-role-card ${role === 'tenant' ? 'auth-role-card--active' : ''}`}
                >
                  <span className="auth-role-card-icon">🎓</span>
                  <span>{locale === 'ar' ? 'طالب / مستأجر' : 'Student / Tenant'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`auth-role-card ${role === 'owner' ? 'auth-role-card--active' : ''}`}
                >
                  <span className="auth-role-card-icon">🔑</span>
                  <span>{locale === 'ar' ? 'مالك عقار' : 'Property Owner'}</span>
                </button>
              </div>
            </div>

            {/* First Name & Last Name (Side by side on desktop) */}
            <div className="auth-grid-2col">
              <div className="auth-field-group">
                <label htmlFor="reg-first-name" className="auth-label">
                  {t.auth_first_name_label}
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="reg-first-name"
                    type="text"
                    className="auth-input"
                    placeholder={t.auth_first_name_placeholder}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
                {fieldErrors.firstName && (
                  <span className="auth-field-error">{fieldErrors.firstName}</span>
                )}
              </div>

              <div className="auth-field-group">
                <label htmlFor="reg-last-name" className="auth-label">
                  {t.auth_last_name_label}
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="reg-last-name"
                    type="text"
                    className="auth-input"
                    placeholder={t.auth_last_name_placeholder}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
                {fieldErrors.lastName && (
                  <span className="auth-field-error">{fieldErrors.lastName}</span>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-email" className="auth-label">
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
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder={t.auth_email_placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && (
                <span className="auth-field-error">{fieldErrors.email}</span>
              )}
            </div>

            {/* Phone Number Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-phone" className="auth-label">
                {t.auth_phone_label}
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <input
                  id="reg-phone"
                  type="tel"
                  className="auth-input"
                  placeholder={t.auth_phone_placeholder}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  dir="ltr"
                  required
                />
              </div>
              <span className="auth-field-hint">{t.auth_phone_hint}</span>
              {fieldErrors.phone && (
                <span className="auth-field-error">{fieldErrors.phone}</span>
              )}
            </div>

            {/* WhatsApp Field (Optional) */}
            <div className="auth-field-group">
              <label htmlFor="reg-whatsapp" className="auth-label">
                {t.auth_whatsapp_label}
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
                <input
                  id="reg-whatsapp"
                  type="tel"
                  className="auth-input"
                  placeholder={t.auth_whatsapp_placeholder}
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  autoComplete="tel"
                  dir="ltr"
                />
              </div>
              {fieldErrors.whatsappPhone && (
                <span className="auth-field-error">{fieldErrors.whatsappPhone}</span>
              )}
            </div>

            {/* Password & Confirm Password (Side by side on desktop) */}
            <div className="auth-grid-2col">
              <div className="auth-field-group">
                <label htmlFor="reg-password" className="auth-label">
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
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t.auth_password_placeholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
                {fieldErrors.password && (
                  <span className="auth-field-error">{fieldErrors.password}</span>
                )}
              </div>

              <div className="auth-field-group">
                <label htmlFor="reg-confirm-password" className="auth-label">
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
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder={t.auth_confirm_password_placeholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
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
                {fieldErrors.confirmPassword && (
                  <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
                )}
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

            {/* Submit Button */}
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
                  <span>{locale === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{locale === 'ar' ? 'إنشاء حساب' : 'Create account'}</span>
              )}
            </button>
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
