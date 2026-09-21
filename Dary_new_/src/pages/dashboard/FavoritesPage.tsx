import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { FavoriteItem } from '../../services/tenantService';

export default function FavoritesPage() {
  const { locale } = useLocale();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TenantService.getFavorites();
      setFavorites(data);
    } catch (err: any) {
      console.error('[FavoritesPage] GET /favorites failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل قائمة المفضلة من الخادم.'
            : 'Could not load favorites from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  async function handleRemove(propertyId: string) {
    setRemovingId(propertyId);
    setActionMessage(null);
    try {
      await TenantService.removeFavorite(propertyId);
      setFavorites((prev) =>
        prev.filter((f) => f.propertyId !== propertyId && f.property?.id !== propertyId && f.id !== propertyId)
      );
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تمت إزالة العقار من المفضلة.' : 'Property removed from favorites.',
      });
    } catch (err: any) {
      console.error('[FavoritesPage] Remove favorite error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل إزالة العقار من المفضلة' : 'Failed to remove favorite'),
      });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      {actionMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: actionMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: actionMessage.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          <span>{actionMessage.type === 'success' ? '✓ ' : '✕ '}{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      <div className="dary-section-card">
        <div className="dary-section-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dary-navy)', margin: 0 }}>
              {locale === 'ar' ? 'العقارات المفضلة' : 'Saved Favorites'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'السكنات التي قمت بحفظها للرجوع إليها ومقارنتها لاحقًا.'
                : 'Housing options you saved for quick comparison and future booking.'}
            </p>
          </div>

          <Link to="/properties" className="dary-primary-btn" style={{ padding: '0.6rem 1.15rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{locale === 'ar' ? 'تصفح المزيد' : 'Browse More'}</span>
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل المفضلة...' : 'Loading favorites...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchFavorites}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">❤️</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'قائمة المفضلة فارغة' : 'No Favorites Saved'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'لم تقم بحفظ أي سكن في المفضلة حتى الآن. تصفح السكنات المتاحة واضغط على أيقونة القلب لحفظها هنا.'
                : 'You have not saved any housing options yet. Browse properties and click the heart icon to save them here.'}
            </p>
            <Link to="/properties" className="dary-primary-btn">
              {locale === 'ar' ? 'استكشف السكنات' : 'Explore Properties'}
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {favorites.map((fav) => {
              const p = fav.property || fav;
              const propId = fav.propertyId || p.id;
              const title = p.title || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');
              const image =
                p.primaryImage ||
                (Array.isArray(p.images) && p.images[0]?.url ? p.images[0].url : p.image) ||
                '/placeholder.jpg';

              return (
                <div
                  key={fav.id || propId}
                  style={{
                    border: '1px solid var(--dary-border)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ position: 'relative', height: '170px', backgroundColor: '#F1F5F9' }}>
                    <img
                      src={image}
                      alt={title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(propId)}
                      disabled={removingId === propId}
                      aria-label="Remove favorite"
                      title={locale === 'ar' ? 'إزالة من المفضلة' : 'Remove favorite'}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineEnd: '10px',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                        color: '#EF4444',
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                      {title}
                    </h3>
                    <p style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', color: 'var(--dary-muted)' }}>
                      {p.city ? `${p.city} • ` : ''}
                      {p.address || ''}
                    </p>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--dary-border)' }}>
                      <span style={{ fontWeight: 800, color: 'var(--dary-blue)', fontSize: '1.1rem' }}>
                        {p.price || '—'} {p.price ? (locale === 'ar' ? 'ج.م' : 'EGP') : ''}
                      </span>
                      {propId && (
                        <Link
                          to={`/properties/${propId}`}
                          style={{
                            padding: '0.45rem 0.9rem',
                            borderRadius: '8px',
                            backgroundColor: 'var(--dary-blue-light)',
                            color: 'var(--dary-blue)',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          {locale === 'ar' ? 'التفاصيل' : 'View'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
