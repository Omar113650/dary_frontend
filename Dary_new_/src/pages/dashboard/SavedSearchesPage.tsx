import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { TenantService } from '../../services/tenantService';
import type { SavedSearchItem } from '../../services/tenantService';

export default function SavedSearchesPage() {
  const { locale } = useLocale();
  const [searches, setSearches] = useState<SavedSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const fetchSearches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TenantService.getSavedSearches();
      setSearches(data);
    } catch (err: any) {
      console.error('[SavedSearchesPage] GET /saved-searches failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل عمليات البحث المحفوظة من الخادم.'
            : 'Could not load saved searches from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchSearches();
  }, [fetchSearches]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setActionMessage(null);
    try {
      await TenantService.deleteSavedSearch(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف البحث المحفوظ.' : 'Saved search deleted.',
      });
    } catch (err: any) {
      console.error('[SavedSearchesPage] Delete error:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف البحث' : 'Failed to delete saved search'),
      });
    } finally {
      setDeletingId(null);
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
              {locale === 'ar' ? 'عمليات البحث المحفوظة' : 'Saved Searches'}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--dary-muted)' }}>
              {locale === 'ar'
                ? 'معايير البحث المفضلة لديك لتصل إلى السكنات المناسبة بضغطة زر واحدة.'
                : 'Your customized search filters to quickly find relevant properties.'}
            </p>
          </div>

          <Link to="/properties" className="dary-primary-btn" style={{ padding: '0.6rem 1.15rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{locale === 'ar' ? 'بحث جديد' : 'New Search'}</span>
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل عمليات البحث...' : 'Loading searches...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب البيانات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchSearches}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : searches.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">🔍</div>
            <h4 className="dary-empty-title">{locale === 'ar' ? 'لا توجد عمليات بحث محفوظة' : 'No Saved Searches'}</h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'يمكنك حفظ معايير بحثك أثناء تصفح العقارات لتلقي تنبيهات عند توفر سكنات جديدة تطابق رغبتك.'
                : 'You can save your search criteria while browsing to get instant access whenever new matching rooms are listed.'}
            </p>
            <Link to="/properties" className="dary-primary-btn">
              {locale === 'ar' ? 'ابدأ البحث الآن' : 'Start Searching'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {searches.map((item) => {
              // Construct query params for application
              const params = new URLSearchParams();
              if (item.city) params.set('city', item.city);
              if (item.propertyType) params.set('type', item.propertyType);
              if (item.minPrice) params.set('minPrice', String(item.minPrice));
              if (item.maxPrice) params.set('maxPrice', String(item.maxPrice));
              if (item.rooms) params.set('bedrooms', String(item.rooms));
              const queryStr = params.toString();
              const targetUrl = queryStr ? `/properties?${queryStr}` : '/properties';

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    border: '1px solid var(--dary-border)',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', color: 'var(--dary-navy)', fontWeight: 700 }}>
                      {item.name || (locale === 'ar' ? 'بحث مخصص' : 'Custom Search')}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
                      {item.city && (
                        <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                          📍 {item.city}
                        </span>
                      )}
                      {item.propertyType && (
                        <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                          🏢 {item.propertyType}
                        </span>
                      )}
                      {(item.minPrice || item.maxPrice) && (
                        <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                          💰 {item.minPrice || 0} - {item.maxPrice || '∞'} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      )}
                      {item.rooms && (
                        <span style={{ backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                          🛏️ {item.rooms} {locale === 'ar' ? 'غرف' : 'Rooms'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link
                      to={targetUrl}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--dary-blue)',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {locale === 'ar' ? 'تطبيق البحث' : 'Apply Search'}
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {locale === 'ar' ? 'حذف' : 'Delete'}
                    </button>
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
