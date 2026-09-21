import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { OwnerService } from '../../services/ownerService';
import type { OwnerPropertyItem } from '../../services/ownerService';

export default function OwnerPropertiesPage() {
  const { locale } = useLocale();
  const [properties, setProperties] = useState<OwnerPropertyItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Confirmed endpoint: GET /properties/my
      const data = await OwnerService.getMyProperties();
      setProperties(data);
    } catch (err: any) {
      console.error('[OwnerPropertiesPage] GET /properties/my failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل عقاراتك من الخادم.'
            : 'Could not load your properties from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredProperties = useMemo(() => {
    let result = properties;
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => {
        const st = (p.status || '').toUpperCase();
        if (statusFilter === 'APPROVED') return st === 'APPROVED' || st === 'ACTIVE';
        if (statusFilter === 'PENDING') return st === 'PENDING';
        if (statusFilter === 'REJECTED') return st === 'REJECTED';
        if (statusFilter === 'SUSPENDED') return st === 'SUSPENDED';
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        const district = (p.district || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        return title.includes(q) || city.includes(q) || district.includes(q) || address.includes(q);
      });
    }

    return result;
  }, [properties, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = properties.length;
    const approved = properties.filter((p) => (p.status || '').toUpperCase() === 'APPROVED' || (p.status || '').toUpperCase() === 'ACTIVE').length;
    const pending = properties.filter((p) => (p.status || '').toUpperCase() === 'PENDING').length;
    return { total, approved, pending };
  }, [properties]);

  function getPropertyTypeLabel(type?: string) {
    if (!type) return locale === 'ar' ? 'سكن طلابي' : 'Student Housing';
    const map: Record<string, { ar: string; en: string }> = {
      shared_apartment: { ar: 'شقة مشتركة', en: 'Shared Apartment' },
      private_room: { ar: 'غرفة خاصة', en: 'Private Room' },
      shared_room: { ar: 'غرفة مشتركة', en: 'Shared Room' },
      studio: { ar: 'استوديو', en: 'Studio' },
      entire_apartment: { ar: 'شقة كاملة', en: 'Entire Apartment' },
      apartment: { ar: 'شقة', en: 'Apartment' },
      dormitory: { ar: 'سكن طلابي', en: 'Dormitory' },
    };
    const key = type.toLowerCase();
    return map[key] ? (locale === 'ar' ? map[key].ar : map[key].en) : type;
  }

  function getStatusBadge(status?: string) {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'ACTIVE') {
      return (
        <span className="dary-badge dary-badge-closed" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
          ✓ {locale === 'ar' ? 'معتمد ومتاح' : 'Approved & Live'}
        </span>
      );
    }
    if (s === 'PENDING') {
      return (
        <span className="dary-badge dary-badge-pending" style={{ backgroundColor: '#FEF9C3', color: '#A16207' }}>
          ⏳ {locale === 'ar' ? 'قيد مراجعة الإدارة' : 'Pending Review'}
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="dary-badge dary-badge-cancelled" style={{ color: '#DC2626', backgroundColor: '#FEE2E2' }}>
          ✕ {locale === 'ar' ? 'مرفوض' : 'Rejected'}
        </span>
      );
    }
    if (s === 'SUSPENDED') {
      return (
        <span className="dary-badge dary-badge-cancelled">
          ⏸️ {locale === 'ar' ? 'معلّق' : 'Suspended'}
        </span>
      );
    }
    return <span className="dary-badge">{status || '—'}</span>;
  }

  return (
    <div>
      {/* 1. Header with Stats & Actions */}
      <div className="dary-welcome-card" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dary-welcome-title">
            {locale === 'ar' ? 'عقاراتي المسجلة 🏢' : 'My Registered Properties 🏢'}
          </h1>
          <p className="dary-welcome-subtitle">
            {locale === 'ar'
              ? 'متابعة وإدارة جميع العقارات والوحدات السكنية المضافة لحسابك وحالة اعتماد كل عقار.'
              : 'Manage student housing properties registered under your account.'}
          </p>
        </div>

        <div className="dary-welcome-actions">
          <Link
            to="new"
            className="dary-primary-btn"
            style={{ textDecoration: 'none', backgroundColor: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>+</span>
            <span>{locale === 'ar' ? 'إضافة عقار جديد' : 'Add New Property'}</span>
          </Link>
        </div>
      </div>

      {/* 2. Quick Metrics Row */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
            🏢
          </div>
          <div>
            <h3 className="dary-metric-number">{stats.total}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'إجمالي العقارات المسجلة' : 'Total Properties'}
            </p>
          </div>
        </div>

        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            ✓
          </div>
          <div>
            <h3 className="dary-metric-number">{stats.approved}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'معتمدة ومنشورة للطلاب' : 'Approved & Live'}
            </p>
          </div>
        </div>

        <div className="dary-metric-card">
          <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#FEF9C3', color: '#CA8A04' }}>
            ⏳
          </div>
          <div>
            <h3 className="dary-metric-number">{stats.pending}</h3>
            <p className="dary-metric-label">
              {locale === 'ar' ? 'قيد مراجعة الإدارة' : 'Pending Review'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="dary-section-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dary-navy)', marginInlineEnd: '0.5rem' }}>
              {locale === 'ar' ? 'تصفية الحالة:' : 'Filter Status:'}
            </span>
            {[
              { key: 'ALL', label: locale === 'ar' ? `الكل (${stats.total})` : `All (${stats.total})` },
              { key: 'APPROVED', label: locale === 'ar' ? `معتمد ومتاح (${stats.approved})` : `Approved (${stats.approved})` },
              { key: 'PENDING', label: locale === 'ar' ? `قيد المراجعة (${stats.pending})` : `Pending (${stats.pending})` },
              { key: 'REJECTED', label: locale === 'ar' ? 'مرفوض' : 'Rejected' },
              { key: 'SUSPENDED', label: locale === 'ar' ? 'معلق' : 'Suspended' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: statusFilter === tab.key ? '1px solid var(--dary-blue)' : '1px solid var(--dary-border)',
                  backgroundColor: statusFilter === tab.key ? 'var(--dary-blue)' : '#FFFFFF',
                  color: statusFilter === tab.key ? '#FFFFFF' : 'var(--dary-navy)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ minWidth: '240px', flex: '1 1 240px', maxWidth: '360px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={locale === 'ar' ? '🔍 ابحث بالعنوان أو المدينة أو الحي...' : '🔍 Search by title, city, district...'}
              className="dary-input"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', margin: 0 }}
            />
          </div>
        </div>
      </div>

      {/* 4. Properties Grid */}
      <div className="dary-section-card">
        {loading ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--dary-muted)' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#0B2A4A', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {locale === 'ar' ? 'جاري تحميل العقارات...' : 'Loading properties...'}
            </p>
          </div>
        ) : error ? (
          <div className="dary-error-state">
            <p className="dary-error-title">{locale === 'ar' ? 'خطأ في جلب العقارات' : 'API Error'}</p>
            <p className="dary-error-desc">{error}</p>
            <button type="button" className="dary-retry-btn" onClick={fetchProperties}>
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="dary-empty-state">
            <div className="dary-empty-icon">🏢</div>
            <h4 className="dary-empty-title">
              {statusFilter === 'ALL' && !searchQuery
                ? locale === 'ar'
                  ? 'لا توجد عقارات مسجلة حتى الآن'
                  : 'No Properties Registered Yet'
                : locale === 'ar'
                ? 'لا توجد عقارات مطابقة لبحثك أو الفلتر المختار'
                : 'No Properties Match Your Search or Filter'}
            </h4>
            <p className="dary-empty-desc">
              {locale === 'ar'
                ? 'ابدأ بإضافة عقاراتك وسكناتك الطلابية لتتم مراجعتها ونشرها للطلاب في أسرع وقت.'
                : 'Add student housing properties to start receiving booking requests from students.'}
            </p>
            <Link
              to="new"
              className="dary-primary-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                textDecoration: 'none',
              }}
            >
              <span>+</span> {locale === 'ar' ? 'إضافة عقار جديد' : 'Add Property'}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredProperties.map((property) => {
              const image =
                property.primaryImage ||
                (Array.isArray(property.images) && property.images.length > 0
                  ? typeof property.images[0] === 'string'
                    ? property.images[0]
                    : property.images[0]?.url
                  : '') ||
                (Array.isArray(property.rooms_) && property.rooms_.length > 0
                  ? property.rooms_[0]?.photoUrl
                  : '') ||
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';

              const price =
                property.startingPrice ||
                property.price ||
                (property as any).pricePerMonth ||
                (Array.isArray(property.rooms_) && property.rooms_.length > 0
                  ? Math.min(...property.rooms_.map((r: any) => Number(r.pricePerBed) || 0).filter((p: number) => p > 0))
                  : null);

              const roomCount =
                (Array.isArray(property.rooms_) && property.rooms_.length > 0 ? property.rooms_.length : null) ||
                (typeof property.rooms === 'number' && property.rooms > 0 ? property.rooms : null) ||
                (Array.isArray((property as any).roomsConfig) ? (property as any).roomsConfig.length : null) ||
                1;

              const isPending = (property.status || '').toUpperCase() === 'PENDING';

              return (
                <div
                  key={property.id}
                  style={{
                    border: '1px solid var(--dary-border)',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <div style={{ position: 'relative', height: '180px', backgroundColor: '#F1F5F9' }}>
                    <img
                      src={image}
                      alt={property.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&q=80&w=600&h=400&fit=crop';
                      }}
                    />
                    <div style={{ position: 'absolute', top: '10px', insetInlineStart: '10px' }}>
                      {getStatusBadge(property.status)}
                    </div>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', color: 'var(--dary-navy)', fontWeight: 700, lineHeight: 1.4 }}>
                      {property.title}
                    </h3>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.825rem', color: 'var(--dary-muted)' }}>
                      📍 {property.city ? `${property.city} • ` : ''}
                      {property.address || property.district || property.governorate || ''}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem', fontSize: '0.8rem', color: 'var(--dary-muted)' }}>
                      <span style={{ backgroundColor: '#F8FAFC', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        🏢 {getPropertyTypeLabel(property.propertyType)}
                      </span>
                      <span style={{ backgroundColor: '#F8FAFC', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        🛏️ {roomCount} {locale === 'ar' ? 'غرف' : 'Rooms'}
                      </span>
                    </div>

                    {isPending && (
                      <div style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.85rem', fontSize: '0.775rem', color: '#854D0E', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>ℹ️</span>
                        <span>{locale === 'ar' ? 'قيد مراجعة واعتماد الإدارة ليظهر للطلاب' : 'Under admin review to go live'}</span>
                      </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--dary-border)' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: 'var(--dary-blue)', fontSize: '1.15rem' }}>
                          {price && !isNaN(Number(price)) ? Number(price).toLocaleString() : '—'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--dary-muted)', marginInlineStart: '0.25rem' }}>
                          {locale === 'ar' ? 'ج.م / شهرياً' : 'EGP / mo'}
                        </span>
                      </div>

                      <Link
                        to={`/properties/${property.id}`}
                        style={{
                          padding: '0.45rem 0.9rem',
                          borderRadius: '8px',
                          backgroundColor: '#0B2A4A',
                          color: '#FFFFFF',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        {locale === 'ar' ? 'معاينة السكن' : 'View Listing'}
                      </Link>
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
