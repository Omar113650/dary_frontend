import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminPropertyItem, AdminStatusCount } from '../../services/adminService';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import Pagination from '../../components/common/Pagination';
import { useAdminPropertiesStatus } from '../../hooks/useDashboardQueries';
import { useQueryClient, STALE_TIMES } from '../../lib/queryClient';

export default function AdminPropertiesPage() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const [properties, setProperties] = useState<AdminPropertyItem[]>([]);
  
  // Cached: 5m staleTime
  const {
    data: propertiesStatus,
    isLoading: loadingStatus,
    refetch: fetchStatus,
  } = useAdminPropertiesStatus();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters, Search & Pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Action State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspendModalId, setSuspendModalId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // 2. Fetch Properties List
  const fetchProperties = useCallback(async () => {
    const isPending = statusFilter === 'PENDING';
    const cacheKey = isPending
      ? ['admin', 'properties', 'pending', { page, limit, search: debouncedSearch }]
      : ['admin', 'properties', { page, limit, status: statusFilter, search: debouncedSearch, sort: sortBy, order: sortOrder }];
    const cached = queryClient.getQueryData<any>(cacheKey);
    if (cached) {
      const list = cached?.properties || cached?.items || cached?.data || (Array.isArray(cached) ? cached : []);
      setProperties(Array.isArray(list) ? list : []);
      const total =
        cached?.pagination?.totalProperties ??
        cached?.meta?.total ??
        cached?.totalCount ??
        cached?.total ??
        (Array.isArray(list) ? list.length : 0);
      setTotalCount(total);
      const pages =
        cached?.pagination?.totalPages ??
        cached?.meta?.totalPages ??
        cached?.totalPages ??
        Math.max(1, Math.ceil(total / limit));
      setTotalPages(pages);
      setHasNextPage(Boolean(cached?.pagination?.hasNextPage ?? cached?.meta?.hasNextPage ?? cached?.hasNextPage ?? page < pages));
      setHasPrevPage(Boolean(cached?.pagination?.hasPrevPage ?? cached?.meta?.hasPrevPage ?? cached?.hasPrevPage ?? page > 1));
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: cacheKey,
        queryFn: () =>
          isPending
            ? AdminService.getPendingProperties({ page, limit })
            : AdminService.getProperties({
                page,
                limit,
                status: statusFilter || undefined,
                search: debouncedSearch || undefined,
                sort: sortBy,
                order: sortOrder,
              }),
        staleTime: STALE_TIMES.LISTS,
      });
      const list = data?.properties || data?.items || data?.data || (Array.isArray(data) ? data : []);
      setProperties(Array.isArray(list) ? list : []);

      const total =
        data?.pagination?.totalProperties ??
        data?.meta?.total ??
        data?.totalCount ??
        data?.total ??
        (Array.isArray(list) ? list.length : 0);
      setTotalCount(total);
      const pages =
        data?.pagination?.totalPages ??
        data?.meta?.totalPages ??
        data?.totalPages ??
        Math.max(1, Math.ceil(total / limit));
      setTotalPages(pages);
      setHasNextPage(Boolean(data?.pagination?.hasNextPage ?? data?.meta?.hasNextPage ?? data?.hasNextPage ?? page < pages));
      setHasPrevPage(Boolean(data?.pagination?.hasPrevPage ?? data?.meta?.hasPrevPage ?? data?.hasPrevPage ?? page > 1));
    } catch (err: any) {
      console.error('[AdminPropertiesPage] Fetch properties failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل قائمة العقارات من الخادم.'
            : 'Could not load properties from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch, sortBy, sortOrder, locale, queryClient]);

  // Handle Approve
  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await AdminService.reviewProperty(id, 'APPROVED');
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم اعتماد العقار بنجاح وتفعيله على المنصة.' : 'Property approved and activated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      await Promise.all([fetchProperties(), fetchStatus()]);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشلت عملية اعتماد العقار.' : 'Failed to approve property.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject
  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      setActionMessage({
        type: 'error',
        text: locale === 'ar' ? 'يرجى كتابة سبب الرفض.' : 'Please provide a rejection reason.',
      });
      return;
    }
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await AdminService.reviewProperty(id, 'REJECTED', rejectionReason.trim());
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم رفض العقار وإشعار المالك بالسبب.' : 'Property rejected and owner notified.',
      });
      setRejectModalId(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      await Promise.all([fetchProperties(), fetchStatus()]);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشلت عملية رفض العقار.' : 'Failed to reject property.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Suspend
  const handleConfirmSuspend = async () => {
    if (!suspendModalId) return;
    setActionLoadingId(suspendModalId);
    setActionMessage(null);
    try {
      await AdminService.suspendProperty(suspendModalId);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تعليق العقار بنجاح.' : 'Property suspended successfully.',
      });
      setSuspendModalId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      await Promise.all([fetchProperties(), fetchStatus()]);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشلت عملية تعليق العقار.' : 'Failed to suspend property.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Toggle Availability
  const handleToggleAvailability = async (id: string) => {
    setActionLoadingId(id);
    setActionMessage(null);
    try {
      await AdminService.togglePropertyAvailability(id);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تحديث حالة إتاحة العقار بنجاح.' : 'Property availability updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      await Promise.all([fetchProperties(), fetchStatus()]);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث حالة الإتاحة.' : 'Failed to toggle availability.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Property
  const handleConfirmDelete = async () => {
    if (!deleteModalId) return;
    setActionLoadingId(deleteModalId);
    setActionMessage(null);
    try {
      await AdminService.deleteProperty(deleteModalId);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف العقار بنجاح.' : 'Property deleted successfully.',
      });
      setDeleteModalId(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      await Promise.all([fetchProperties(), fetchStatus()]);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشلت عملية حذف العقار.' : 'Failed to delete property.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const normalizeStatusList = (raw: any): AdminStatusCount[] => {
    if (!raw) return [];
    const unwrapped =
      (raw?.status && typeof raw.status === 'object' && !Array.isArray(raw.status))
        ? raw.status
        : (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data))
        ? raw.data
        : raw;

    if (Array.isArray(unwrapped)) {
      return unwrapped
        .filter((item) => item && item.status && String(item.status).toLowerCase() !== 'total')
        .map((item) => ({
          status: String(item.status).toUpperCase(),
          count: typeof item.count === 'number' ? item.count : Number(item.count || 0),
        }));
    }

    if (typeof unwrapped === 'object') {
      return Object.entries(unwrapped)
        .filter(([key, val]) => {
          const lower = key.toLowerCase();
          return lower !== 'total' && lower !== 'totalproperties' && typeof val === 'number';
        })
        .map(([key, val]) => ({
          status: key.toUpperCase(),
          count: Number(val || 0),
        }));
    }
    return [];
  };

  const statusMetrics = normalizeStatusList(propertiesStatus);

  // The server handles filtering by status, search, and sort.
  // Fallback to client filtering only if server returned mixed statuses when statusFilter was applied.
  const filteredProperties =
    statusFilter && properties.some((p) => p.status && p.status !== statusFilter)
      ? properties.filter((p) => p.status === statusFilter)
      : properties;

  return (
    <div className="dary-page-container">
      {/* Action Banner */}
      {actionMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: actionMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: actionMessage.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span>{actionMessage.type === 'success' ? '✓ ' : '✕ '}{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="dary-page-header">
        <div>
          <h1 className="dary-page-title" style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏢</span>
            <span>{locale === 'ar' ? 'إدارة العقارات والوحدات' : 'Properties Management'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'مراجعة كافة عروض سكن الطلاب المضافة، التأكد من استيفاء الشروط والموافقة أو المراجعة.'
              : 'Audit, review and oversee student housing listings registered across the platform.'}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {statusMetrics.map((item, idx) => (
          <div key={idx} className="dary-metric-card">
            <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
              🏠
            </div>
            <div>
              <h3 className="dary-metric-number">
                <AnimatedCounter value={item.count} loading={loadingStatus} />
              </h3>
              <p className="dary-metric-label">{item.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top row: Search & Sort */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 280px', maxWidth: '450px', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  locale === 'ar'
                    ? '🔍 ابحث بالعنوان أو المدينة أو الحي أو اسم المالك...'
                    : '🔍 Search by title, city, district, owner...'
                }
                className="dary-input"
                style={{ padding: '0.55rem 0.9rem', fontSize: '0.875rem', width: '100%', margin: 0 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
                {locale === 'ar' ? 'الترتيب:' : 'Sort by:'}
              </span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split('-');
                  setSortBy(f);
                  setSortOrder(o as 'asc' | 'desc');
                  setPage(1);
                }}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0B2A4A',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="createdAt-desc">{locale === 'ar' ? 'الأحدث إضافة' : 'Newest'}</option>
                <option value="createdAt-asc">{locale === 'ar' ? 'الأقدم إضافة' : 'Oldest'}</option>
                <option value="startingPrice-asc">{locale === 'ar' ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
                <option value="startingPrice-desc">{locale === 'ar' ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
                <option value="viewsCount-desc">{locale === 'ar' ? 'الأكثر مشاهدة' : 'Most Viewed'}</option>
                <option value="title-asc">{locale === 'ar' ? 'العنوان أبجدياً' : 'Title (A-Z)'}</option>
              </select>
            </div>
          </div>

          {/* Bottom row: Status Filter Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.85rem', marginInlineEnd: '0.25rem' }}>
              {locale === 'ar' ? 'تصفية الحالة:' : 'Filter Status:'}
            </span>
            {[
              { key: '', labelAr: 'الكل', labelEn: 'All' },
              { key: 'APPROVED', labelAr: 'معتمد ومتاح', labelEn: 'Approved' },
              { key: 'PENDING', labelAr: 'بانتظار الموافقة', labelEn: 'Pending Review' },
              { key: 'SUSPENDED', labelAr: 'معلق', labelEn: 'Suspended' },
              { key: 'REJECTED', labelAr: 'مرفوض', labelEn: 'Rejected' },
            ].map((tab) => {
              const isActive = statusFilter === tab.key;
              const countItem = tab.key ? statusMetrics.find((m) => m.status === tab.key) : null;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--dary-navy, #0B2A4A)' : '#CBD5E1',
                    backgroundColor: isActive ? 'var(--dary-navy, #0B2A4A)' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{locale === 'ar' ? tab.labelAr : tab.labelEn}</span>
                  {countItem && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '999px',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#64748B',
                      }}
                    >
                      {countItem.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Properties Table / Cards */}
      <div className="dary-card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0B2A4A',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p>{locale === 'ar' ? 'جاري تحميل قائمة العقارات...' : 'Loading properties...'}</p>
          </div>
        ) : error ? (
          <div className="dary-error-alert" style={{ margin: '1rem' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchProperties} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🏠</span>
            <p style={{ fontWeight: 600, color: '#0B2A4A' }}>
              {locale === 'ar' ? 'لا توجد عقارات مطابقة.' : 'No properties found.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="dary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'العقار' : 'Property'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'المالك' : 'Owner'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'المدينة والحي' : 'Location'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'السعر' : 'Price'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'التاريخ' : 'Created'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((p) => {
                    const primaryImg = (() => {
                      if (p.primaryImage) return p.primaryImage;
                      if (Array.isArray(p.images) && p.images.length > 0) {
                        const found = (p.images as any[]).find((img: any) => typeof img === 'object' && img?.isPrimary);
                        if (found && typeof found === 'object' && found.url) return found.url as string;
                        const first = p.images[0] as any;
                        if (typeof first === 'string') return first;
                        if (first && typeof first === 'object' && first.url) return first.url as string;
                      }
                      if (Array.isArray(p.rooms_) && p.rooms_[0]?.photoUrl) {
                        return p.rooms_[0].photoUrl as string;
                      }
                      return null;
                    })();

                    const ownerFullName =
                      [p.owner?.firstName, p.owner?.lastName].filter(Boolean).join(' ').trim() ||
                      (p.owner as any)?.name ||
                      (p.owner?.email ? p.owner.email.split('@')[0] : null) ||
                      (p.ownerId ? `${locale === 'ar' ? 'المالك' : 'Owner'} #${p.ownerId.slice(0, 6)}` : '—');

                    const ownerPhone = (p.owner as any)?.whatsappPhone || p.owner?.phone || (p as any)?.contactPhone;

                    const rawPrice =
                      p.startingPrice ??
                      (p as any).price ??
                      (Array.isArray(p.rooms_) && p.rooms_[0]?.pricePerBed) ??
                      null;
                    const priceDisplay =
                      rawPrice !== null && rawPrice !== undefined
                        ? `${Number(rawPrice).toLocaleString()} ${p.currency || (locale === 'ar' ? 'ج.م' : 'EGP')}`
                        : '—';

                    const locationParts = [p.city, p.district].filter(Boolean);
                    const locationDisplay = locationParts.length > 0 ? locationParts.join(' - ') : (p.governorate || '—');

                    const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
                      APPROVED: {
                        label: locale === 'ar' ? 'معتمد ومتاح' : 'Approved',
                        bg: '#DCFCE7',
                        color: '#15803D',
                        border: '#BBF7D0',
                      },
                      PENDING: {
                        label: locale === 'ar' ? 'بانتظار الموافقة' : 'Pending',
                        bg: '#FEF9C3',
                        color: '#A16207',
                        border: '#FEF08A',
                      },
                      SUSPENDED: {
                        label: locale === 'ar' ? 'معلق مؤقتاً' : 'Suspended',
                        bg: '#FFEDD5',
                        color: '#C2410C',
                        border: '#FED7AA',
                      },
                      REJECTED: {
                        label: locale === 'ar' ? 'مرفوض' : 'Rejected',
                        bg: '#FEE2E2',
                        color: '#B91C1C',
                        border: '#FECACA',
                      },
                    };
                    const curStatus = (p.status || 'PENDING').toUpperCase();
                    const statusInfo = statusConfig[curStatus] || {
                      label: curStatus,
                      bg: '#F1F5F9',
                      color: '#475569',
                      border: '#E2E8F0',
                    };

                    const propertyTypeLabels: Record<string, string> = {
                      ROOM: locale === 'ar' ? 'غرفة مستقلة' : 'Room',
                      STUDIO: locale === 'ar' ? 'استوديو' : 'Studio',
                      APARTMENT: locale === 'ar' ? 'شقة كاملة' : 'Apartment',
                      BED: locale === 'ar' ? 'سرير في غرفة' : 'Bed',
                      VILLA: locale === 'ar' ? 'فيلا' : 'Villa',
                    };
                    const typeDisplay =
                      (p.propertyType && propertyTypeLabels[p.propertyType.toUpperCase()]) ||
                      p.propertyType ||
                      p.propertyClass ||
                      (locale === 'ar' ? 'سكن طلاب' : 'Student Housing');

                    const isAvailable = p.isAvailable !== false;

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt={p.title}
                                style={{
                                  width: '46px',
                                  height: '46px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: '1px solid #E2E8F0',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '46px',
                                  height: '46px',
                                  borderRadius: '8px',
                                  backgroundColor: '#EEF3FF',
                                  color: '#2F6BFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.25rem',
                                  flexShrink: 0,
                                }}
                              >
                                🏢
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#0B2A4A', fontSize: '0.9rem' }}>{p.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                  {typeDisplay}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '4px',
                                    backgroundColor: isAvailable ? '#F0FDF4' : '#F8FAFC',
                                    color: isAvailable ? '#166534' : '#64748B',
                                    border: `1px solid ${isAvailable ? '#BBF7D0' : '#CBD5E1'}`,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      backgroundColor: isAvailable ? '#22C55E' : '#94A3B8',
                                    }}
                                  />
                                  {isAvailable
                                    ? (locale === 'ar' ? 'متاح للحجز' : 'Available')
                                    : (locale === 'ar' ? 'غير متاح' : 'Unavailable')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 700, color: '#0B2A4A' }}>
                            👤 {ownerFullName}
                          </div>
                          {p.owner?.email && (
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                              {p.owner.email}
                            </div>
                          )}
                          {ownerPhone && (
                            <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <a
                                href={`https://wa.me/${String(ownerPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  locale === 'ar'
                                    ? `مرحباً ${ownerFullName}، معك إدارة منصة داري بخصوص مراجعة عقارك المسجل (${p.title}).`
                                    : `Hello ${ownerFullName}, this is Dary Admin regarding your property listing (${p.title}).`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={locale === 'ar' ? 'مراسلة المالك عبر واتساب' : 'WhatsApp Owner'}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  padding: '0.18rem 0.45rem',
                                  borderRadius: '5px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  border: '1px solid #BBF7D0',
                                }}
                              >
                                💬 {locale === 'ar' ? 'واتساب' : 'WhatsApp'}
                              </a>
                              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                {ownerPhone}
                              </span>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.85rem' }}>
                          <div>{locationDisplay}</div>
                          {p.nearestUniversity && (
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                              🎓 {p.nearestUniversity}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 700, color: '#0B2A4A' }}>
                            {priceDisplay}
                          </div>
                          {rawPrice !== null && rawPrice !== undefined && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {locale === 'ar' ? 'يبدأ من / شهرياً' : 'Starting / mo'}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color,
                              border: `1px solid ${statusInfo.border}`,
                            }}
                          >
                            {statusInfo.label}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <Link
                              to={`/properties/${p.id}`}
                              style={{
                                padding: '0.32rem 0.6rem',
                                borderRadius: '6px',
                                backgroundColor: '#0B2A4A',
                                color: '#FFFFFF',
                                textDecoration: 'none',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                            >
                              <span>👁️</span>
                              <span>{locale === 'ar' ? 'عرض' : 'View'}</span>
                            </Link>

                            {p.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === p.id}
                                  onClick={() => handleApprove(p.id)}
                                  title={locale === 'ar' ? 'الموافقة على العقار ونشره' : 'Approve Property'}
                                  style={{
                                    padding: '0.32rem 0.6rem',
                                    borderRadius: '6px',
                                    backgroundColor: '#16A34A',
                                    color: '#FFFFFF',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                                    border: 'none',
                                  }}
                                >
                                  {actionLoadingId === p.id ? '...' : (locale === 'ar' ? '✓ قبول' : '✓ Approve')}
                                </button>
                                <button
                                  type="button"
                                  disabled={actionLoadingId === p.id}
                                  onClick={() => setRejectModalId(p.id)}
                                  title={locale === 'ar' ? 'رفض العقار مع توضيح السبب' : 'Reject Property'}
                                  style={{
                                    padding: '0.32rem 0.6rem',
                                    borderRadius: '6px',
                                    backgroundColor: '#DC2626',
                                    color: '#FFFFFF',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                                    border: 'none',
                                  }}
                                >
                                  {locale === 'ar' ? '✕ رفض' : '✕ Reject'}
                                </button>
                              </>
                            )}

                            {p.status === 'APPROVED' && (
                              <button
                                type="button"
                                disabled={actionLoadingId === p.id}
                                onClick={() => setSuspendModalId(p.id)}
                                title={locale === 'ar' ? 'تعليق العقار مؤقتاً' : 'Suspend Property'}
                                style={{
                                  padding: '0.32rem 0.6rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#F59E0B',
                                  color: '#FFFFFF',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                                  border: 'none',
                                }}
                              >
                                {actionLoadingId === p.id ? '...' : (locale === 'ar' ? '⏸ تعليق' : '⏸ Suspend')}
                              </button>
                            )}

                            {(p.status === 'SUSPENDED' || p.status === 'REJECTED') && (
                              <button
                                type="button"
                                disabled={actionLoadingId === p.id}
                                onClick={() => handleApprove(p.id)}
                                title={locale === 'ar' ? 'إعادة اعتماد وتفعيل العقار' : 'Re-approve Property'}
                                style={{
                                  padding: '0.32rem 0.6rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                                  border: 'none',
                                }}
                              >
                                {actionLoadingId === p.id ? '...' : (locale === 'ar' ? '✓ تفعيل' : '✓ Activate')}
                              </button>
                            )}

                            {/* Availability Toggle */}
                            <button
                              type="button"
                              disabled={actionLoadingId === p.id}
                              onClick={() => handleToggleAvailability(p.id)}
                              title={
                                isAvailable
                                  ? (locale === 'ar' ? 'إيقاف إتاحة العقار للحجز' : 'Make listing unavailable')
                                  : (locale === 'ar' ? 'إتاحة العقار للحجز' : 'Make listing available')
                              }
                              style={{
                                padding: '0.32rem 0.6rem',
                                borderRadius: '6px',
                                backgroundColor: isAvailable ? '#F8FAFC' : '#ECFDF5',
                                color: isAvailable ? '#475569' : '#059669',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                                border: `1px solid ${isAvailable ? '#CBD5E1' : '#A7F3D0'}`,
                              }}
                            >
                              {actionLoadingId === p.id
                                ? '...'
                                : isAvailable
                                ? (locale === 'ar' ? '🔄 إيقاف' : '🔄 Disable')
                                : (locale === 'ar' ? '🔄 إتاحة' : '🔄 Enable')}
                            </button>

                            {/* Delete Property */}
                            <button
                              type="button"
                              disabled={actionLoadingId === p.id}
                              onClick={() => setDeleteModalId(p.id)}
                              title={locale === 'ar' ? 'حذف العقار' : 'Delete Property'}
                              style={{
                                padding: '0.32rem 0.6rem',
                                borderRadius: '6px',
                                backgroundColor: '#FFF1F2',
                                color: '#E11D48',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: actionLoadingId === p.id ? 'not-allowed' : 'pointer',
                                border: '1px solid #FECDD3',
                              }}
                            >
                              🗑️ {locale === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reject Modal */}
            {rejectModalId && (
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
                    borderRadius: '16px',
                    padding: '1.75rem',
                    maxWidth: '450px',
                    width: '100%',
                    boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
                  }}
                >
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0B2A4A', marginBottom: '0.75rem' }}>
                    {locale === 'ar' ? '🚫 رفض طلب إدراج العقار' : '🚫 Reject Property Listing'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {locale === 'ar'
                      ? 'يرجى كتابة سبب واضح للرفض حتى يتمكن المالك من تصحيحه وإعادة المحاولة:'
                      : 'Please specify the rejection reason for the owner:'}
                  </p>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder={locale === 'ar' ? 'مثال: الصور غير واضحة، أو تفاصيل الغرف غير مكتملة...' : 'e.g. Unclear photos or incomplete room data...'}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.9rem',
                      marginBottom: '1.25rem',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalId(null);
                        setRejectionReason('');
                      }}
                      style={{
                        padding: '0.55rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: '#F1F5F9',
                        color: '#0B2A4A',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        border: 'none',
                      }}
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === rejectModalId}
                      onClick={() => handleReject(rejectModalId)}
                      style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: '8px',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: actionLoadingId === rejectModalId ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      {actionLoadingId === rejectModalId ? '...' : (locale === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Suspend Confirmation Modal */}
            {suspendModalId && (
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
                    {locale === 'ar' ? 'تعليق العقار' : 'Suspend Property'}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
                    {locale === 'ar'
                      ? 'هل أنت متأكد من رغبتك في تعليق هذا العقار مؤقتاً؟ لن يظهر للطلاب في نتائج البحث.'
                      : 'Are you sure you want to suspend this property? It will be hidden from search results.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setSuspendModalId(null)}
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
                      disabled={actionLoadingId === suspendModalId}
                      onClick={handleConfirmSuspend}
                      style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: '8px',
                        backgroundColor: '#F59E0B',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: actionLoadingId === suspendModalId ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      {actionLoadingId === suspendModalId ? '...' : (locale === 'ar' ? 'تأكيد التعليق' : 'Confirm Suspend')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalId && (
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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#B91C1C', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🗑️</span>
                    <span>{locale === 'ar' ? 'حذف العقار' : 'Delete Property'}</span>
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    {locale === 'ar'
                      ? 'هل أنت متأكد من رغبتك في حذف هذا العقار؟ سيتم نقله إلى سلة المحذوفات ولن يظهر للطلاب في المنصة.'
                      : 'Are you sure you want to delete this property? It will be archived and hidden from student search.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setDeleteModalId(null)}
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
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === deleteModalId}
                      onClick={handleConfirmDelete}
                      style={{
                        padding: '0.55rem 1.25rem',
                        borderRadius: '8px',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: actionLoadingId === deleteModalId ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      {actionLoadingId === deleteModalId ? '...' : (locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modern Reusable Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              limitOptions={[10, 20, 50]}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
}
