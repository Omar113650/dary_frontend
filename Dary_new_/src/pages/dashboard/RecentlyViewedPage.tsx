import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { RecentlyViewedItem } from '../../services/tenantService';

export default function RecentlyViewedPage() {
  const { locale } = useLocale();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearModal, setConfirmClearModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const fetchRecentlyViewed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TenantService.getRecentlyViewed();
      setItems(data);
    } catch (err: any) {
      console.error('[RecentlyViewedPage] GET /recently-viewed failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل سجل المشاهدة من الخادم.'
            : 'Could not load recently viewed items from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchRecentlyViewed();
  }, [fetchRecentlyViewed]);

  async function handleRemove(propertyId: string) {
    try {
      await TenantService.removeRecentlyViewed(propertyId);
      setItems((prev) =>
        prev.filter((i) => i.propertyId !== propertyId && i.property?.id !== propertyId && i.id !== propertyId)
      );
    } catch (err: any) {
      console.error('[RecentlyViewedPage] Remove item error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف العنصر من السجل' : 'Failed to remove from history'),
      });
    }
  }

  function handleClearAll() {
    setConfirmClearModal(true);
  }

  async function handleConfirmClearAll() {
    setIsClearing(true);
    setActionMessage(null);
    try {
      await TenantService.clearRecentlyViewed();
      setItems([]);
      setConfirmClearModal(false);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم مسح سجل المشاهدة بالكامل.' : 'Recently viewed history cleared.',
      });
    } catch (err: any) {
      console.error('[RecentlyViewedPage] Clear all error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل مسح السجل' : 'Failed to clear history'),
      });
    } finally {
      setIsClearing(false);
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
              {locale === 'ar' ? 'شوهدت مؤخرًا' : 'Recently Viewed'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'قائمة بالعقارات التي قمت بزيارتها وتفقد تفاصيلها مؤخرًا.'
                : 'History of student housing properties you recently viewed.'}
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isClearing}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isClearing
                ? locale === 'ar'
                  ? 'جاري المسح...'
                  : 'Clearing...'
                : locale === 'ar'
                ? 'مسح السجل بالكامل'
                : 'Clear All'}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل السجل...' : 'Loading history...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchRecentlyViewed}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">🕒</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'لم تشاهد أي سكنات مؤخرًا' : 'No Recently Viewed Items'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'عندما تتصفح العقارات المتاحة، سيتم حفظها هنا تلقائيًا لتتمكن من الرجوع إليها بسهولة.'
                : 'When you view property details, they will automatically be preserved here for easy access.'}
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
            {items.map((item) => {
              const p = item.property || item;
              const propId = item.propertyId || p.id;
              const title = p.title || (locale === 'ar' ? 'سكن طلابي' : 'Student Housing');
              const image =
                p.primaryImage ||
                (Array.isArray(p.images) && p.images[0]?.url ? p.images[0].url : p.image) ||
                '/placeholder.jpg';

              return (
                <div
                  key={item.id || propId}
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
                      aria-label="Remove item"
                      title={locale === 'ar' ? 'حذف من السجل' : 'Remove from history'}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineEnd: '10px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                        color: '#64748B',
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

      {/* Clear All Confirmation Modal */}
      {confirmClearModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.5rem' }}>
              {locale === 'ar' ? 'مسح سجل المشاهدة' : 'Clear View History'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {locale === 'ar'
                ? 'هل أنت متأكد من مسح جميع العقارات التي شاهدتها مؤخرًا من سجلك؟'
                : 'Are you sure you want to clear your entire recently viewed housing history?'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmClearModal(false)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'تراجع' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleConfirmClearAll}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isClearing ? 'not-allowed' : 'pointer',
                  border: 'none',
                }}
              >
                {isClearing ? '...' : (locale === 'ar' ? 'مسح السجل' : 'Clear All')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
