import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { AdminService } from '../../services/adminService';
import type { AdminUserItem, AdminStatusCount } from '../../services/adminService';

export default function AdminUsersPage() {
  const { locale } = useLocale();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersStatus, setUsersStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Updating User State
  const [activeUpdatingId, setActiveUpdatingId] = useState<string | null>(null);

  // Modals for Role and Status Management
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('tenant');

  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');

  // 1. Fetch Users Status counts
  const fetchUsersStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await AdminService.getUsersStatus();
      setUsersStatus(data);
    } catch (err: any) {
      console.error('[AdminUsersPage] GET /dashboard/users/status failed:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // 2. Fetch Users List
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const data = await AdminService.getUsers(params);
      const list = data?.users || data?.items || data?.data || (Array.isArray(data) ? data : []);
      setUsers(Array.isArray(list) ? list : []);

      const total = data?.total || data?.meta?.total || (Array.isArray(list) ? list.length : 0);
      const limit = data?.limit || 10;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err: any) {
      console.error('[AdminUsersPage] GET /dashboard/users failed:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل قائمة المستخدمين من الخادم.'
            : 'Could not load users list from the server.')
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, locale]);

  useEffect(() => {
    fetchUsersStatus();
  }, [fetchUsersStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Role Modal
  const openRoleModal = (u: AdminUserItem, currentRole: string) => {
    setRoleModalUser(u);
    setSelectedRole(currentRole || 'tenant');
  };

  // Submit Role Change
  const submitRoleChange = async () => {
    if (!roleModalUser) return;
    setActiveUpdatingId(roleModalUser.id);
    setActionMessage(null);
    try {
      await AdminService.assignRole(roleModalUser.id, selectedRole);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? `تم تعيين الدور (${selectedRole}) بنجاح.` : `Role (${selectedRole}) assigned successfully.`,
      });
      setRoleModalUser(null);
      await Promise.all([fetchUsers(), fetchUsersStatus()]);
    } catch (err: any) {
      console.error('[AdminUsersPage] POST /roles/assign failed:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تعيين دور المستخدم.' : 'Failed to assign user role.'),
      });
    } finally {
      setActiveUpdatingId(null);
    }
  };

  // Open Status Modal
  const openStatusModal = (u: AdminUserItem) => {
    setStatusModalUser(u);
    const curr = (u.status as any) || 'ACTIVE';
    setSelectedStatus(curr === 'INACTIVE' ? 'INACTIVE' : curr === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE');
  };

  // Submit Status Change
  const submitStatusChange = async () => {
    if (!statusModalUser) return;
    setActiveUpdatingId(statusModalUser.id);
    setActionMessage(null);
    try {
      await AdminService.updateUserStatus(statusModalUser.id, selectedStatus);
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? `تم تحديث حالة المستخدم إلى (${selectedStatus}) بنجاح.` : `User status updated to (${selectedStatus}) successfully.`,
      });
      setStatusModalUser(null);
      await Promise.all([fetchUsers(), fetchUsersStatus()]);
    } catch (err: any) {
      console.error('[AdminUsersPage] PATCH /auth/users/:id/status failed:', err);
      setActionMessage({
        type: 'error',
        text: err?.message || (locale === 'ar' ? 'فشل تحديث حالة المستخدم.' : 'Failed to update user status.'),
      });
    } finally {
      setActiveUpdatingId(null);
    }
  };

  // Safe parse status counts
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

  const statusMetrics = normalizeStatusList(usersStatus);

  return (
    <div className="dary-page-container">
      {/* Page Header */}
      <div className="dary-page-header">
        <div>
          <h1 className="dary-page-title" style={{ color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👥</span>
            <span>{locale === 'ar' ? 'إدارة المستخدمين والأدوار' : 'Users & Access Control'}</span>
          </h1>
          <p className="dary-page-subtitle">
            {locale === 'ar'
              ? 'مراقبة جميع حسابات الطلاب، الملاك، ومديري النظام، مع إمكانية تعديل الحالة وتعيين الصلاحيات.'
              : 'Monitor student tenants, property owners, and system administrators with role & status controls.'}
          </p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: actionMessage.type === 'success' ? '#DCFCE7' : '#FEE2E2',
            color: actionMessage.type === 'success' ? '#15803D' : '#B91C1C',
            border: `1px solid ${actionMessage.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="dary-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        {statusMetrics.map((item, idx) => (
          <div key={idx} className="dary-metric-card">
            <div className="dary-metric-icon-wrap" style={{ backgroundColor: '#EEF3FF', color: '#2F6BFF' }}>
              👤
            </div>
            <div>
              <h3 className="dary-metric-number">
                {loadingStatus ? '...' : item.count}
              </h3>
              <p className="dary-metric-label">{item.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="dary-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 240px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={locale === 'ar' ? 'بحث بالاسم أو البريد الإلكتروني...' : 'Search name or email...'}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Role Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="">{locale === 'ar' ? 'جميع الأدوار (Roles)' : 'All Roles'}</option>
              <option value="super_admin">{locale === 'ar' ? 'المدير العام (Super Admin)' : 'Super Admin'}</option>
              <option value="admin">{locale === 'ar' ? 'مدير نظام (Admin)' : 'Admin'}</option>
              <option value="owner">{locale === 'ar' ? 'مالك عقار (Owner)' : 'Owner'}</option>
              <option value="tenant">{locale === 'ar' ? 'طالب / مستأجر (Tenant)' : 'Tenant'}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="">{locale === 'ar' ? 'جميع الحالات (Status)' : 'All Statuses'}</option>
              <option value="ACTIVE">{locale === 'ar' ? 'نشط (ACTIVE)' : 'ACTIVE'}</option>
              <option value="INACTIVE">{locale === 'ar' ? 'غير نشط (INACTIVE)' : 'INACTIVE'}</option>
              <option value="SUSPENDED">{locale === 'ar' ? 'معلّق (SUSPENDED)' : 'SUSPENDED'}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchUsers()}
            className="dary-primary-btn"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
          >
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Users Table */}
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
            <p>{locale === 'ar' ? 'جاري تحميل قائمة المستخدمين...' : 'Loading users list...'}</p>
          </div>
        ) : error ? (
          <div className="dary-error-alert" style={{ margin: '1rem' }}>
            <span>{error}</span>
            <button type="button" onClick={fetchUsers} className="dary-retry-btn">
              {locale === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>👥</span>
            <p style={{ fontWeight: 600, color: '#0B2A4A' }}>
              {locale === 'ar' ? 'لم يتم العثور على مستخدمين مطابقين.' : 'No matching users found.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="dary-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: locale === 'ar' ? 'right' : 'left' }}>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الدور (Role)' : 'Role'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'الهاتف' : 'Phone'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'تاريخ التسجيل' : 'Registered'}</th>
                    <th style={{ padding: '0.85rem 1rem', color: '#0B2A4A' }}>{locale === 'ar' ? 'إجراءات الإدارة' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const fullName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                    const directRole =
                      u.role ||
                      (Array.isArray(u.roles) && (
                        u.roles.includes('super_admin') ? 'super_admin' :
                        u.roles.includes('admin') ? 'admin' :
                        u.roles.includes('owner') ? 'owner' :
                        u.roles[0]
                      )) ||
                      'tenant';

                    const isBusy = activeUpdatingId === u.id;

                    const roleBadgeStyle =
                      directRole === 'super_admin'
                        ? { bg: '#EDE9FE', color: '#6D28D9', label: locale === 'ar' ? 'المدير العام' : 'SUPER_ADMIN' }
                        : directRole === 'admin'
                        ? { bg: '#FEF3C7', color: '#B45309', label: locale === 'ar' ? 'مدير نظام' : 'ADMIN' }
                        : directRole === 'owner'
                        ? { bg: '#EFF6FF', color: '#1D4ED8', label: locale === 'ar' ? 'مالك عقار' : 'OWNER' }
                        : { bg: '#F1F5F9', color: '#475569', label: locale === 'ar' ? 'طالب / مستأجر' : 'TENANT' };

                    const statusBadgeStyle =
                      u.status === 'ACTIVE'
                        ? { bg: '#DCFCE7', color: '#15803D', label: locale === 'ar' ? 'نشط' : 'ACTIVE' }
                        : u.status === 'INACTIVE'
                        ? { bg: '#FEF3C7', color: '#D97706', label: locale === 'ar' ? 'غير نشط' : 'INACTIVE' }
                        : u.status === 'SUSPENDED'
                        ? { bg: '#FEE2E2', color: '#B91C1C', label: locale === 'ar' ? 'معلّق' : 'SUSPENDED' }
                        : { bg: '#EFF6FF', color: '#2563EB', label: u.status || 'PENDING' };

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#0B2A4A',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              {(fullName[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0B2A4A' }}>{fullName}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: roleBadgeStyle.bg,
                              color: roleBadgeStyle.color,
                            }}
                          >
                            {roleBadgeStyle.label}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: statusBadgeStyle.bg,
                              color: statusBadgeStyle.color,
                            }}
                          >
                            {statusBadgeStyle.label}
                          </span>
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.85rem' }}>
                          {u.phone || '—'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#64748B', fontSize: '0.82rem' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {/* Change Role Button */}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openRoleModal(u, directRole)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                backgroundColor: '#F8FAFC',
                                color: '#0B2A4A',
                                border: '1px solid #CBD5E1',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>🎭</span>
                              <span>{locale === 'ar' ? 'تغيير الدور' : 'Change Role'}</span>
                            </button>

                            {/* Change Status Button */}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openStatusModal(u)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                backgroundColor: '#FFFFFF',
                                color: u.status === 'SUSPENDED' ? '#DC2626' : u.status === 'INACTIVE' ? '#D97706' : '#16A34A',
                                border: `1px solid ${u.status === 'SUSPENDED' ? '#FCA5A5' : u.status === 'INACTIVE' ? '#FCD34D' : '#86EFAC'}`,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>⚙️</span>
                              <span>{locale === 'ar' ? 'تعديل الحالة' : 'Change Status'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {locale === 'ar' ? 'السابق' : 'Previous'}
                </button>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    background: page >= totalPages ? '#F1F5F9' : '#FFFFFF',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {locale === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              direction: locale === 'ar' ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎭</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0B2A4A', fontWeight: 800 }}>
                  {locale === 'ar' ? 'تعيين دور المستخدم' : 'Assign User Role'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {locale === 'ar' ? 'تعديل الرتبة والصلاحيات للمستخدم:' : 'Update role and permissions for:'}{' '}
              <strong style={{ color: '#0B2A4A' }}>
                {roleModalUser.name || `${roleModalUser.firstName || ''} ${roleModalUser.lastName || ''}`.trim() || roleModalUser.email}
              </strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                {
                  value: 'super_admin',
                  icon: '🛡️',
                  title: locale === 'ar' ? 'المدير العام (Super Admin)' : 'Super Admin',
                  desc: locale === 'ar' ? 'كامل الصلاحيات للنظام، إدارة المسؤولين، البيانات، الإعدادات العليا' : 'Has full access to the entire system',
                },
                {
                  value: 'admin',
                  icon: '👔',
                  title: locale === 'ar' ? 'مدير نظام (Admin)' : 'Admin',
                  desc: locale === 'ar' ? 'إدارة العمليات، مراجعة العقارات، إدارة المستخدمين والشكاوى' : 'Manages system operations and users',
                },
                {
                  value: 'owner',
                  icon: '🏢',
                  title: locale === 'ar' ? 'مالك عقار (Owner)' : 'Property Owner',
                  desc: locale === 'ar' ? 'إضافة وإدارة العقارات والغرف واستقبال الحجوزات وإدارة المحفظة' : 'Owns and manages properties',
                },
                {
                  value: 'tenant',
                  icon: '🎓',
                  title: locale === 'ar' ? 'طالب / مستأجر (Tenant)' : 'Tenant / Student',
                  desc: locale === 'ar' ? 'تصفح سكنات الطلاب، حجز الغرف، تقديم المراجعات والدعم' : 'Books and rents properties',
                },
              ].map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: selectedRole === r.value ? '2px solid #0B2A4A' : '1px solid #E2E8F0',
                    backgroundColor: selectedRole === r.value ? 'rgba(11, 42, 74, 0.04)' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="roleOption"
                    value={r.value}
                    checked={selectedRole === r.value}
                    onChange={() => setSelectedRole(r.value)}
                    style={{ accentColor: '#0B2A4A', width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{r.icon}</span>
                      <span>{r.title}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={submitRoleChange}
                disabled={activeUpdatingId === roleModalUser.id}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0B2A4A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: activeUpdatingId === roleModalUser.id ? 'not-allowed' : 'pointer',
                }}
              >
                {activeUpdatingId === roleModalUser.id ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (locale === 'ar' ? 'تأكيد التغيير' : 'Confirm Change')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Status Modal */}
      {statusModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              direction: locale === 'ar' ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⚙️</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0B2A4A', fontWeight: 800 }}>
                  {locale === 'ar' ? 'تعديل حالة الحساب' : 'Update Account Status'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {locale === 'ar' ? 'تعديل حالة حساب المستخدم:' : 'Update account status for:'}{' '}
              <strong style={{ color: '#0B2A4A' }}>
                {statusModalUser.name || `${statusModalUser.firstName || ''} ${statusModalUser.lastName || ''}`.trim() || statusModalUser.email}
              </strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                {
                  value: 'ACTIVE',
                  icon: '🟢',
                  title: locale === 'ar' ? 'نشط (ACTIVE)' : 'Active',
                  desc: locale === 'ar' ? 'الحساب مفعّل بالكامل ويمكن للمستخدم تسجيل الدخول واستخدام المنصة' : 'Account is fully active and user can log in',
                  color: '#16A34A',
                },
                {
                  value: 'INACTIVE',
                  icon: '⚪',
                  title: locale === 'ar' ? 'غير نشط / معطل (INACTIVE)' : 'Inactive',
                  desc: locale === 'ar' ? 'تعطيل الحساب مؤقتاً وتسجيل خروج المستخدم فوراً دون حظره نهائياً' : 'Temporarily deactivate account and revoke access',
                  color: '#D97706',
                },
                {
                  value: 'SUSPENDED',
                  icon: '🔴',
                  title: locale === 'ar' ? 'معلّق / محظور (SUSPENDED)' : 'Suspended',
                  desc: locale === 'ar' ? 'تعليق الحساب وحظر المستخدم من تسجيل الدخول لمخالفة سياسات المنصة' : 'Suspend account and block user completely',
                  color: '#DC2626',
                },
              ].map((s) => (
                <label
                  key={s.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: selectedStatus === s.value ? `2px solid ${s.color}` : '1px solid #E2E8F0',
                    backgroundColor: selectedStatus === s.value ? 'rgba(11, 42, 74, 0.03)' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="statusOption"
                    value={s.value}
                    checked={selectedStatus === s.value}
                    onChange={() => setSelectedStatus(s.value as any)}
                    style={{ accentColor: s.color, width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{s.icon}</span>
                      <span>{s.title}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStatusModalUser(null)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={submitStatusChange}
                disabled={activeUpdatingId === statusModalUser.id}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedStatus === 'SUSPENDED' ? '#DC2626' : selectedStatus === 'INACTIVE' ? '#D97706' : '#16A34A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: activeUpdatingId === statusModalUser.id ? 'not-allowed' : 'pointer',
                }}
              >
                {activeUpdatingId === statusModalUser.id ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (locale === 'ar' ? 'تأكيد الحالة' : 'Confirm Status')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
