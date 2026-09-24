import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import type { OwnerPropertyItem } from '../../services/ownerService';
import { propertyService } from '../../services/propertyService';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import { useOwnerMyProperties } from '../../hooks/useDashboardQueries';

export default function OwnerPropertiesPage() {
  const { locale } = useLocale();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manage Rooms state
  const [manageRoomsProperty, setManageRoomsProperty] = useState<OwnerPropertyItem | null>(null);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [newRoomType, setNewRoomType] = useState<'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD'>('SINGLE');
  const [newPricePerBed, setNewPricePerBed] = useState<number>(2000);
  const [newTotalBeds, setNewTotalBeds] = useState<number>(1);
  const [newAvailableBeds, setNewAvailableBeds] = useState<number>(1);
  const [newRoomPhoto, setNewRoomPhoto] = useState<File | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [roomModalMessage, setRoomModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editTotalBeds, setEditTotalBeds] = useState<number>(0);
  const [editAvailableBeds, setEditAvailableBeds] = useState<number>(0);
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  // Semi-static cache: 5 minutes staleTime
  const {
    data: rawProperties,
    isLoading: loading,
    error: queryError,
    refetch: fetchProperties,
  } = useOwnerMyProperties();

  const properties: OwnerPropertyItem[] = Array.isArray(rawProperties) ? rawProperties : [];
  const error = queryError
    ? (queryError as any)?.message ||
      (locale === 'ar'
        ? 'تعذر تحميل عقاراتك من الخادم.'
        : 'Could not load your properties from the server.')
    : null;

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

  const handleToggleAvailability = async (propertyId: string) => {
    setActionLoadingId(propertyId);
    setPageMessage(null);
    try {
      await propertyService.toggleAvailability(propertyId);
      setPageMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم تحديث حالة إتاحة العقار بنجاح.' : 'Property availability updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['owner', 'my-properties'] });
      fetchProperties();
    } catch (err: any) {
      setPageMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث حالة الإتاحة.' : 'Failed to toggle availability.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm(locale === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا العقار نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to permanently delete this property? This cannot be undone.')) {
      return;
    }
    setActionLoadingId(propertyId);
    setPageMessage(null);
    try {
      await propertyService.deleteProperty(propertyId);
      setPageMessage({
        type: 'success',
        text: locale === 'ar' ? 'تم حذف العقار بنجاح.' : 'Property deleted successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['owner', 'my-properties'] });
      fetchProperties();
    } catch (err: any) {
      setPageMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف العقار.' : 'Failed to delete property.'),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenManageRooms = (property: OwnerPropertyItem) => {
    setManageRoomsProperty(property);
    const rooms = (property as any).rooms_ || (property as any).propertyRooms || (Array.isArray(property.rooms) ? property.rooms : []) || [];
    setRoomsList(Array.isArray(rooms) ? rooms : []);
    setRoomModalMessage(null);
    setEditingRoomId(null);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageRoomsProperty) return;
    setIsAddingRoom(true);
    setRoomModalMessage(null);
    try {
      const payload = {
        roomType: newRoomType,
        pricePerBed: Number(newPricePerBed),
        totalBeds: Number(newTotalBeds),
        availableBeds: Number(newAvailableBeds),
      };
      const res = await propertyService.addRoom(manageRoomsProperty.id, payload);
      const createdRoom = res?.room || res;

      if (newRoomPhoto && createdRoom?.id) {
        try {
          await propertyService.updateRoomPhoto(createdRoom.id, newRoomPhoto);
        } catch (photoErr) {
          console.error('Failed to upload room photo:', photoErr);
        }
      }

      setRoomModalMessage({
        type: 'success',
        text: locale === 'ar' ? 'تمت إضافة الغرفة بنجاح!' : 'Room added successfully!',
      });
      setRoomsList((prev) => [...prev, createdRoom]);
      setNewRoomPhoto(null);
      queryClient.invalidateQueries({ queryKey: ['owner', 'my-properties'] });
      fetchProperties();
    } catch (err: any) {
      setRoomModalMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل إضافة الغرفة.' : 'Failed to add room.'),
      });
    } finally {
      setIsAddingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm(locale === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذه الغرفة؟' : 'Are you sure you want to delete this room?')) {
      return;
    }
    try {
      await propertyService.deleteRoom(roomId);
      setRoomsList((prev) => prev.filter((r) => r.id !== roomId));
      queryClient.invalidateQueries({ queryKey: ['owner', 'my-properties'] });
      fetchProperties();
    } catch (err: any) {
      setRoomModalMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل حذف الغرفة.' : 'Failed to delete room.'),
      });
    }
  };

  const handleSaveEditRoom = async (roomId: string) => {
    setIsSavingRoom(true);
    try {
      await propertyService.updateRoom(roomId, {
        pricePerBed: Number(editPrice),
        totalBeds: Number(editTotalBeds),
        availableBeds: Number(editAvailableBeds),
      });
      setRoomsList((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, pricePerBed: Number(editPrice), totalBeds: Number(editTotalBeds), availableBeds: Number(editAvailableBeds) }
            : r
        )
      );
      setEditingRoomId(null);
      queryClient.invalidateQueries({ queryKey: ['owner', 'my-properties'] });
      fetchProperties();
    } catch (err: any) {
      setRoomModalMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تعديل الغرفة.' : 'Failed to update room.'),
      });
    } finally {
      setIsSavingRoom(false);
    }
  };

  return (
    <div>
      {/* Action Banner */}
      {pageMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: pageMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
            color: pageMessage.type === 'success' ? '#03543F' : '#9B1C1C',
            border: `1px solid ${pageMessage.type === 'success' ? '#31C48D' : '#F98080'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span>{pageMessage.type === 'success' ? '✓ ' : '✕ '}{pageMessage.text}</span>
          <button
            type="button"
            onClick={() => setPageMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}

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
            <h3 className="dary-metric-number">
              <AnimatedCounter value={stats.total} loading={loading} />
            </h3>
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
            <h3 className="dary-metric-number">
              <AnimatedCounter value={stats.approved} loading={loading} />
            </h3>
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
            <h3 className="dary-metric-number">
              <AnimatedCounter value={stats.pending} loading={loading} />
            </h3>
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

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--dary-border)', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: 'var(--dary-blue)', fontSize: '1.15rem' }}>
                          {price && !isNaN(Number(price)) ? Number(price).toLocaleString() : '—'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--dary-muted)', marginInlineStart: '0.25rem' }}>
                          {locale === 'ar' ? 'ج.م / شهرياً' : 'EGP / mo'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Toggle Availability */}
                        <button
                          type="button"
                          disabled={actionLoadingId === property.id}
                          onClick={() => handleToggleAvailability(property.id)}
                          title={locale === 'ar' ? 'تبديل حالة التوفر للطلاب' : 'Toggle availability'}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: property.isAvailable !== false ? '#F0FDF4' : '#FEF2F2',
                            color: property.isAvailable !== false ? '#15803D' : '#DC2626',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: actionLoadingId === property.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {actionLoadingId === property.id
                            ? '⏳'
                            : property.isAvailable !== false
                            ? (locale === 'ar' ? '🟢 متاح' : '🟢 Active')
                            : (locale === 'ar' ? '🔴 غير متاح' : '🔴 Hidden')}
                        </button>

                        {/* Manage Rooms */}
                        <button
                          type="button"
                          onClick={() => handleOpenManageRooms(property)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #2F6BFF',
                            backgroundColor: '#EFF6FF',
                            color: '#2F6BFF',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🛏️ {locale === 'ar' ? 'الغرف' : 'Rooms'}
                        </button>

                        {/* View Listing */}
                        <Link
                          to={`/properties/${property.id}`}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            backgroundColor: '#0B2A4A',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          {locale === 'ar' ? 'معاينة' : 'View'}
                        </Link>

                        {/* Delete Property */}
                        <button
                          type="button"
                          disabled={actionLoadingId === property.id}
                          onClick={() => handleDeleteProperty(property.id)}
                          title={locale === 'ar' ? 'حذف العقار نهائياً' : 'Delete property'}
                          style={{
                            padding: '0.35rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid #FCA5A5',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: actionLoadingId === property.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Manage Rooms Modal ────────────────────────────────────────── */}
      {manageRoomsProperty && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
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
              padding: '2rem',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: locale === 'ar' ? 'right' : 'left',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B2A4A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛏️</span>
                  <span>{locale === 'ar' ? 'إدارة غرف وأسرة العقار' : 'Manage Rooms & Beds'}</span>
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748B' }}>
                  {manageRoomsProperty.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManageRoomsProperty(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                ×
              </button>
            </div>

            {/* Room Modal Message Banner */}
            {roomModalMessage && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: roomModalMessage.type === 'success' ? '#DEF7EC' : '#FDE8E8',
                  color: roomModalMessage.type === 'success' ? '#03543F' : '#9B1C1C',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {roomModalMessage.type === 'success' ? '✓ ' : '✕ '}{roomModalMessage.text}
              </div>
            )}

            {/* Existing Rooms Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.85rem' }}>
                {locale === 'ar' ? '1. الغرف الحالية المسجلة' : '1. Existing Rooms'} ({roomsList.length})
              </h4>

              {roomsList.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '0.875rem' }}>
                  {locale === 'ar' ? 'لا توجد غرف مسجلة لهذا السكن بعد. يمكنك إضافة أول غرفة بالأسفل.' : 'No rooms registered yet. Add a room below.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {roomsList.map((room, idx) => {
                    const isEditing = editingRoomId === room.id;
                    const rType = room.roomType || room.type || 'SINGLE';
                    const rPrice = room.pricePerBed || room.monthlyRent || room.price || 0;
                    const rTotal = room.totalBeds ?? 1;
                    const rAvail = room.availableBeds ?? rTotal;

                    return (
                      <div
                        key={room.id || idx}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          padding: '1rem',
                          backgroundColor: isEditing ? '#F0F9FF' : '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.95rem' }}>
                              🚪 {locale === 'ar' ? `غرفة ${rType}` : `Room ${rType}`}
                            </span>
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: rAvail > 0 ? '#DCFCE7' : '#FEE2E2',
                                color: rAvail > 0 ? '#15803D' : '#B91C1C',
                              }}
                            >
                              {rAvail > 0 ? (locale === 'ar' ? 'شاغر' : 'Available') : (locale === 'ar' ? 'ممتلئ' : 'Full')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {!isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRoomId(room.id);
                                    setEditPrice(rPrice);
                                    setEditTotalBeds(rTotal);
                                    setEditAvailableBeds(rAvail);
                                  }}
                                  style={{
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0B2A4A',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✏️ {locale === 'ar' ? 'تعديل' : 'Edit'}
                                </button>
                                {room.id && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(room.id)}
                                    style={{
                                      padding: '0.3rem 0.6rem',
                                      borderRadius: '6px',
                                      border: '1px solid #FCA5A5',
                                      backgroundColor: '#FEF2F2',
                                      color: '#DC2626',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    🗑️ {locale === 'ar' ? 'حذف' : 'Delete'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={isSavingRoom}
                                  onClick={() => handleSaveEditRoom(room.id)}
                                  style={{
                                    padding: '0.3rem 0.75rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#16A34A',
                                    color: '#FFFFFF',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: isSavingRoom ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {isSavingRoom ? '...' : (locale === 'ar' ? '✓ حفظ' : '✓ Save')}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingRoom}
                                  onClick={() => setEditingRoomId(null)}
                                  style={{
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    color: '#475569',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Room Details / Edit Row */}
                        {isEditing ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #CBD5E1' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                                {locale === 'ar' ? 'سعر السرير (ج.م):' : 'Bed Price (EGP):'}
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editPrice}
                                onChange={(e) => setEditPrice(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                                {locale === 'ar' ? 'إجمالي الأسرة:' : 'Total Beds:'}
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={editTotalBeds}
                                onChange={(e) => setEditTotalBeds(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                                {locale === 'ar' ? 'الأسرة الشاغرة:' : 'Available Beds:'}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={editTotalBeds}
                                value={editAvailableBeds}
                                onChange={(e) => setEditAvailableBeds(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.825rem', color: '#64748B', flexWrap: 'wrap' }}>
                            <span>💰 {locale === 'ar' ? 'سعر السرير:' : 'Bed Price:'} <strong style={{ color: '#0B2A4A' }}>{Number(rPrice).toLocaleString()} ج.م</strong></span>
                            <span>🛏️ {locale === 'ar' ? 'الأسرة المتاحة:' : 'Available Beds:'} <strong style={{ color: '#0B2A4A' }}>{rAvail} من أصل {rTotal}</strong></span>
                            {room.photoUrl && (
                              <a href={room.photoUrl} target="_blank" rel="noreferrer" style={{ color: '#2F6BFF', textDecoration: 'underline' }}>
                                📷 {locale === 'ar' ? 'صورة الغرفة' : 'Room Photo'}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Room Section */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>➕</span>
                <span>{locale === 'ar' ? '2. إضافة غرفة جديدة لهذا السكن' : '2. Add New Room'}</span>
              </h4>

              <form onSubmit={handleAddRoom}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      {locale === 'ar' ? 'نوع الغرفة' : 'Room Type'} *
                    </label>
                    <select
                      value={newRoomType}
                      onChange={(e: any) => {
                        const t = e.target.value;
                        setNewRoomType(t);
                        const defaultBeds = t === 'SINGLE' ? 1 : t === 'DOUBLE' ? 2 : t === 'TRIPLE' ? 3 : 4;
                        setNewTotalBeds(defaultBeds);
                        setNewAvailableBeds(defaultBeds);
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="SINGLE">{locale === 'ar' ? 'فردية (SINGLE - سرير واحد)' : 'Single (1 Bed)'}</option>
                      <option value="DOUBLE">{locale === 'ar' ? 'ثنائية (DOUBLE - سريرين)' : 'Double (2 Beds)'}</option>
                      <option value="TRIPLE">{locale === 'ar' ? 'ثلاثية (TRIPLE - 3 أسرة)' : 'Triple (3 Beds)'}</option>
                      <option value="QUAD">{locale === 'ar' ? 'رباعية (QUAD - 4 أسرة)' : 'Quad (4 Beds)'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      {locale === 'ar' ? 'سعر السرير شهرياً (ج.م)' : 'Price Per Bed (EGP)'} *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newPricePerBed}
                      onChange={(e) => setNewPricePerBed(Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      {locale === 'ar' ? 'إجمالي الأسرة' : 'Total Beds'} *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={12}
                      value={newTotalBeds}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNewTotalBeds(val);
                        if (newAvailableBeds > val) setNewAvailableBeds(val);
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      {locale === 'ar' ? 'الأسرة الشاغرة حالياً' : 'Available Beds'} *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={newTotalBeds}
                      value={newAvailableBeds}
                      onChange={(e) => setNewAvailableBeds(Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                    {locale === 'ar' ? 'صورة الغرفة (اختياري)' : 'Room Photo (Optional)'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewRoomPhoto(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setManageRoomsProperty(null)}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {locale === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingRoom}
                    style={{
                      padding: '0.55rem 1.35rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2F6BFF',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      cursor: isAddingRoom ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isAddingRoom
                      ? (locale === 'ar' ? 'جاري الإضافة...' : 'Adding...')
                      : (locale === 'ar' ? '➕ إضافة الغرفة' : '➕ Add Room')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
