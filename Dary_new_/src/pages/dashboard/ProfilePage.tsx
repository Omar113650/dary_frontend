import { useState, useEffect, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../utils/LocaleContext';
import { ProfileService } from '../../services/profileService';
import { AuthService } from '../../services/authService';

export default function ProfilePage() {
  const { user, refreshUser, logout, isAdmin } = useAuth();
  const { locale, t, direction } = useLocale();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Security state
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Check if current user has confirmed user.delete permission
  const hasDeletePermission = Boolean(
    isAdmin ||
    user?.permissions?.includes?.('user.delete') ||
    user?.rolePermissions?.some?.((rp: any) => rp?.permission?.name === 'user.delete' || rp?.name === 'user.delete')
  );

  // Profile state mapped defensively
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    faculty: '',
    city: '',
    country: '',
    nationality: '',
    gender: '',
    bio: '',
    avatar: '',
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ProfileService.getMyProfile();
      // Defensive field mapping
      const p = data?.profile || {};
      const u = data?.user || data || {};

      setFormData({
        name: u.name || user?.name || '',
        email: u.email || user?.email || '',
        phone: u.phone || user?.phone || '',
        university: p.university || u.university || '',
        faculty: p.faculty || u.faculty || '',
        city: p.city || u.city || '',
        country: p.country || u.country || '',
        nationality: p.nationality || u.nationality || '',
        gender: p.gender || u.gender || '',
        bio: p.bio || u.bio || '',
        avatar: u.avatar || user?.avatar || '',
      });
    } catch (err: any) {
      console.error('[ProfilePage] Failed to load profile:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات الملف الشخصي. يرجى إعادة المحاولة.'
            : 'Failed to load profile details. Please try again.')
      );
      // Fallback display from auth user context if available
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          avatar: user.avatar || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [user, locale]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleFieldChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject > 10MB client-side
    if (file.size > 10 * 1024 * 1024) {
      setError(locale === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 10 ميغابايت' : 'Avatar image must not exceed 10 MB');
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);
    try {
      const res = await ProfileService.uploadAvatar(file);
      const newUrl = res?.data?.avatar || res?.avatar;
      if (newUrl) {
        setFormData((prev) => ({ ...prev, avatar: newUrl }));
      }
      await refreshUser();
    } catch (err: any) {
      console.error('[ProfilePage] Avatar upload error:', err);
      setError(err?.message || (locale === 'ar' ? 'فشل رفع الصورة الشخصية' : 'Failed to upload avatar'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleDeleteAvatar() {
    if (!formData.avatar) return;
    setIsUploadingAvatar(true);
    setError(null);
    try {
      await ProfileService.deleteAvatar();
      setFormData((prev) => ({ ...prev, avatar: '' }));
      await refreshUser();
    } catch (err: any) {
      console.error('[ProfilePage] Avatar delete error:', err);
      setError(err?.message || (locale === 'ar' ? 'فشل حذف الصورة الشخصية' : 'Failed to remove avatar'));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    // Payload mapped strictly to confirmed swagger contract
    const updatePayload: Record<string, any> = {};
    if (formData.university) updatePayload.university = formData.university;
    if (formData.faculty) updatePayload.faculty = formData.faculty;
    if (formData.city) updatePayload.city = formData.city;
    if (formData.country) updatePayload.country = formData.country;
    if (formData.nationality) updatePayload.nationality = formData.nationality;
    if (formData.gender) updatePayload.gender = formData.gender;
    if (formData.bio) updatePayload.bio = formData.bio;

    try {
      await ProfileService.updateProfile(updatePayload);
      setSaveSuccess(true);
      await refreshUser();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('[ProfilePage] Profile update error:', err);
      setError(err?.message || (locale === 'ar' ? 'فشل تحديث البيانات' : 'Failed to save changes'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRequestPasswordReset() {
    const userEmail = formData.email || user?.email;
    if (!userEmail) {
      setResetErrorMessage(locale === 'ar' ? 'البريد الإلكتروني غير متوفر' : 'Email is not available');
      return;
    }
    setIsSendingReset(true);
    setResetErrorMessage(null);
    setResetSuccessMessage(null);
    try {
      await AuthService.forgotPassword(userEmail);
      setResetSuccessMessage(t.sec_pwd_sent);
      setTimeout(() => setResetSuccessMessage(null), 8000);
    } catch (err: any) {
      console.error('[ProfilePage] Password reset request error:', err);
      setResetErrorMessage(
        err?.message ||
          (locale === 'ar'
            ? 'فشل إرسال رابط استعادة كلمة المرور. يرجى المحاولة لاحقاً.'
            : 'Failed to send password reset link. Please try again later.')
      );
    } finally {
      setIsSendingReset(false);
    }
  }

  async function handleDeleteAccount() {
    const isPhraseValid =
      deleteConfirmText.trim().toUpperCase() === 'DELETE' ||
      deleteConfirmText.trim() === 'حذف';

    if (!deleteCheckbox || !isPhraseValid) {
      return;
    }

    setIsDeletingAccount(true);
    setDeleteErrorMessage(null);

    try {
      await AuthService.deleteAccount();
      // Clear local authentication context and redirect to /login
      await logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('[ProfilePage] Account deletion error:', err);
      if (err?.status === 403 || err?.statusCode === 403 || err?.message?.toLowerCase().includes('permission')) {
        setDeleteErrorMessage(t.sec_del_error_403);
      } else if (err?.status === 401 || err?.statusCode === 401) {
        setDeleteErrorMessage(
          locale === 'ar'
            ? 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول'
            : 'Session expired, please sign in again'
        );
      } else {
        setDeleteErrorMessage(err?.message || t.sec_del_error_generic);
      }
    } finally {
      setIsDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <div className="dary-section-card">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
          <div>
            <div style={{ width: '180px', height: '24px', backgroundColor: '#E2E8F0', borderRadius: '6px', marginBottom: '8px' }} />
            <div style={{ width: '120px', height: '16px', backgroundColor: '#E2E8F0', borderRadius: '4px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dary-section-card">
        <div className="dary-section-header">
          <h3>{locale === 'ar' ? 'الملف الشخصي للطالب' : 'Student Profile'}</h3>
        </div>

        {error && (
          <div className="dary-error-state" style={{ marginBottom: '1.5rem', textAlign: 'start' }}>
            <p className="dary-error-title">{locale === 'ar' ? 'تنبيه' : 'Notice'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={loadProfile}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {saveSuccess && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            ✓ {locale === 'ar' ? 'تم حفظ بيانات الملف الشخصي بنجاح.' : 'Profile updated successfully.'}
          </div>
        )}

        {/* Avatar Section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid var(--dary-border)',
            marginBottom: '2rem',
          }}
        >
          {formData.avatar ? (
            <img
              src={formData.avatar}
              alt={formData.name}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #0B2A4A',
              }}
            />
          ) : (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                backgroundColor: '#0B2A4A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {(formData.name[0] || 'D').toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <label
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#2F6BFF',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                  display: 'inline-block',
                }}
              >
                {isUploadingAvatar
                  ? locale === 'ar'
                    ? 'جاري الرفع...'
                    : 'Uploading...'
                  : locale === 'ar'
                  ? 'تغيير الصورة'
                  : 'Change Avatar'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  style={{ display: 'none' }}
                />
              </label>

              {formData.avatar && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={isUploadingAvatar}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    color: '#EF4444',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {locale === 'ar' ? 'حذف الصورة' : 'Remove'}
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar' ? 'صيغ PNG أو JPG، بحد أقصى 10 ميغابايت.' : 'PNG or JPG, up to 10 MB.'}
            </p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                disabled
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--dary-muted)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--dary-muted)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* University */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'الجامعة' : 'University'}
              </label>
              <input
                type="text"
                name="university"
                value={formData.university}
                onChange={handleFieldChange}
                placeholder={locale === 'ar' ? 'مثال: جامعة المنصورة' : 'e.g. Mansoura University'}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Faculty */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'الكلية / التخصص' : 'Faculty / Major'}
              </label>
              <input
                type="text"
                name="faculty"
                value={formData.faculty}
                onChange={handleFieldChange}
                placeholder={locale === 'ar' ? 'مثال: كلية التجارة' : 'e.g. Faculty of Commerce'}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* City */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'المدينة' : 'City'}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFieldChange}
                placeholder={locale === 'ar' ? 'المدينة' : 'City'}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Nationality */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'الجنسية' : 'Nationality'}
              </label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleFieldChange}
                placeholder={locale === 'ar' ? 'الجنسية' : 'Nationality'}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
                {locale === 'ar' ? 'الجنس' : 'Gender'}
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleFieldChange}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dary-border)',
                  fontSize: '0.9rem',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">{locale === 'ar' ? 'اختر الجنس' : 'Select Gender'}</option>
                <option value="MALE">{locale === 'ar' ? 'ذكر' : 'Male'}</option>
                <option value="FEMALE">{locale === 'ar' ? 'أنثى' : 'Female'}</option>
              </select>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dary-navy)', marginBottom: '0.4rem' }}>
              {locale === 'ar' ? 'نبذة تعريفية' : 'Bio'}
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleFieldChange}
              placeholder={locale === 'ar' ? 'اكتب نبذة مختصرة عن نفسك...' : 'Write a short bio about yourself...'}
              style={{
                width: '100%',
                padding: '0.7rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid var(--dary-border)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            className="dary-primary-btn"
            disabled={isSaving}
          >
            {isSaving
              ? locale === 'ar'
                ? 'جاري الحفظ...'
                : 'Saving...'
              : locale === 'ar'
              ? 'حفظ التغييرات'
              : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Account Security & Password Recovery Section */}
      <div className="dary-section-card" style={{ marginTop: '2rem' }}>
        <div className="dary-section-header" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(47, 107, 255, 0.08)',
                color: 'var(--dary-blue, #2F6BFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--dary-navy, #0B2A4A)', fontWeight: 700 }}>
                {t.sec_title}
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                {t.sec_subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 1. Password Recovery / Reset Card */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '1.5rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--dary-navy, #0B2A4A)' }}>
                  {t.sec_pwd_title}
                </h4>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(47, 107, 255, 0.1)',
                    color: 'var(--dary-blue, #2F6BFF)',
                    fontWeight: 600,
                  }}
                >
                  {locale === 'ar' ? 'محمي بكلمة مرور' : 'Password Protected'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                {t.sec_pwd_desc}
              </p>

              <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#64748B' }}>
                <span style={{ fontWeight: 600, color: 'var(--dary-navy, #0B2A4A)' }}>
                  {locale === 'ar' ? 'البريد المرتبط:' : 'Registered email:'}
                </span>{' '}
                <span style={{ fontFamily: 'monospace', color: '#334155' }}>
                  {formData.email || user?.email || '—'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={handleRequestPasswordReset}
                disabled={isSendingReset}
                className="dary-primary-btn"
                style={{
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {isSendingReset ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"></path>
                    </svg>
                    <span>{t.sec_pwd_sending}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>{t.sec_pwd_btn}</span>
                  </>
                )}
              </button>

              <Link
                to="/forgot-password"
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--dary-blue, #2F6BFF)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{t.sec_pwd_goto_reset}</span>
                <span>{direction === 'rtl' ? '←' : '→'}</span>
              </Link>
            </div>
          </div>

          {resetSuccessMessage && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                color: '#065F46',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {resetErrorMessage && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '0.85rem',
              }}
            >
              {resetErrorMessage}
            </div>
          )}
        </div>

        {/* 2. Account Deletion Card */}
        <div
          style={{
            backgroundColor: hasDeletePermission ? '#FFFBFB' : '#F8FAFC',
            borderRadius: '12px',
            border: hasDeletePermission ? '1px solid #FEE2E2' : '1px solid #E2E8F0',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: hasDeletePermission ? '#991B1B' : 'var(--dary-navy, #0B2A4A)',
                  }}
                >
                  {t.sec_del_title}
                </h4>

                {!hasDeletePermission && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      fontWeight: 600,
                    }}
                  >
                    {locale === 'ar' ? 'صلاحية غير مفعلة' : 'Permission Pending'}
                  </span>
                )}
              </div>

              {hasDeletePermission ? (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#7F1D1D', lineHeight: 1.6 }}>
                  {t.sec_del_desc}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
                  {t.sec_del_perm_pending_desc}
                </p>
              )}
            </div>

            <div>
              {hasDeletePermission ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteCheckbox(false);
                    setDeleteConfirmText('');
                    setDeleteErrorMessage(null);
                  }}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #DC2626',
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>{t.sec_del_btn}</span>
                </button>
              ) : (
                <Link
                  to="/dashboard/support"
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--dary-navy, #0B2A4A)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background 0.2s',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>{t.sec_del_contact_support}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingAccount) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(11, 42, 74, 0.25)',
              textAlign: 'start',
              border: '1px solid #FEE2E2',
            }}
          >
            {/* Header with warning icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>

              <div>
                <h3 id="delete-account-title" style={{ margin: 0, fontSize: '1.25rem', color: '#991B1B', fontWeight: 800 }}>
                  {t.sec_del_modal_title}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  DELETE /auth/delete
                </p>
              </div>
            </div>

            {/* Warning copy */}
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#991B1B', fontWeight: 700, lineHeight: 1.5 }}>
                {t.sec_del_modal_warning}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: '#7F1D1D', lineHeight: 1.5 }}>
                {locale === 'ar'
                  ? 'سيؤدي هذا الإجراء إلى حذف ملفك الشخصي بالكامل وإلغاء جميع الجلسات النشطة. لا يمكن استعادة الحساب بعد الحذف.'
                  : 'This action will permanently purge your profile and terminate all active sessions. Your account cannot be recovered.'}
              </p>
            </div>

            {/* Confirmation Checkbox */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--dary-navy, #0B2A4A)',
                  fontWeight: 600,
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={deleteCheckbox}
                  onChange={(e) => setDeleteCheckbox(e.target.checked)}
                  disabled={isDeletingAccount}
                  style={{
                    marginTop: '0.2rem',
                    accentColor: '#DC2626',
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                  }}
                />
                <span>
                  {locale === 'ar'
                    ? 'أقر بأنني أرغب في حذف حسابي وبياناتي نهائياً وبلا رجعة.'
                    : 'I acknowledge that I want to permanently delete my account and data.'}
                </span>
              </label>
            </div>

            {/* Explicit typed confirmation */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '0.4rem',
                }}
              >
                {t.sec_del_modal_confirm_phrase}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={isDeletingAccount}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  outline: 'none',
                }}
              />
            </div>

            {deleteErrorMessage && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '0.85rem',
                }}
              >
                {deleteErrorMessage}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAccount}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t.sec_del_modal_cancel}
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={
                  !deleteCheckbox ||
                  (deleteConfirmText.trim().toUpperCase() !== 'DELETE' &&
                    deleteConfirmText.trim() !== 'حذف') ||
                  isDeletingAccount
                }
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor:
                    deleteCheckbox &&
                    (deleteConfirmText.trim().toUpperCase() === 'DELETE' ||
                      deleteConfirmText.trim() === 'حذف')
                      ? '#DC2626'
                      : '#94A3B8',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor:
                    deleteCheckbox &&
                    (deleteConfirmText.trim().toUpperCase() === 'DELETE' ||
                      deleteConfirmText.trim() === 'حذف') &&
                    !isDeletingAccount
                      ? 'pointer'
                      : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s',
                }}
              >
                {isDeletingAccount ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"></path>
                    </svg>
                    <span>{t.sec_del_deleting}</span>
                  </>
                ) : (
                  <span>{t.sec_del_modal_confirm_btn}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

