import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { RbacService, type RoleItem, type Permission } from '../../services/rbacService';
import './AdminRolesPermissions.css';

// Permission categorization helper
interface PermissionCategoryGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string;
  color: string;
  permissions: Permission[];
}

export default function AdminRolesPermissionsPage() {
  const { locale } = useLocale();
  const { isSuperAdmin } = useAuth();

  // Core Data States
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Active Selected Role for Permissions Matrix
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<string>>(new Set());
  const [originalPermissionIds, setOriginalPermissionIds] = useState<Set<string>>(new Set());
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Create Role Modal
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);

  // Assign Role to User Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleName, setAssignRoleName] = useState('admin');
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [assignModalMsg, setAssignModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial Data Fetch
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        RbacService.getRoles(),
        RbacService.getPermissions(),
      ]);

      const fetchedRoles = Array.isArray(rolesRes) ? rolesRes : [];
      const fetchedPerms = Array.isArray(permsRes) ? permsRes : [];

      setRoles(fetchedRoles);
      setAllPermissions(fetchedPerms);

      // Select first non-super_admin role or the first role available
      if (fetchedRoles.length > 0) {
        const defaultRole = fetchedRoles.find((r) => r.name === 'admin') || fetchedRoles[0];
        selectRoleForMatrix(defaultRole, fetchedRoles);
      }
    } catch (err: any) {
      console.error('[AdminRolesPermissionsPage] Failed to load data:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'تعذر تحميل بيانات الأدوار والصلاحيات من الخادم.'
            : 'Failed to load roles and permissions data from server.')
      );
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When a role is clicked
  const selectRoleForMatrix = (role: RoleItem, rolesList = roles) => {
    setSelectedRole(role);
    // Find permissions associated with this role
    const currentRole = rolesList.find((r) => r.id === role.id) || role;
    let permIds = new Set<string>();

    if (currentRole.rolePermissions && Array.isArray(currentRole.rolePermissions)) {
      permIds = new Set(currentRole.rolePermissions.map((rp) => rp.permissionId || rp.permission?.id).filter(Boolean));
    }

    setAssignedPermissionIds(new Set(permIds));
    setOriginalPermissionIds(new Set(permIds));
    setActionSuccess(null);
  };

  // Check if current role has dirty changes
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole || selectedRole.name === 'super_admin') return false;
    if (assignedPermissionIds.size !== originalPermissionIds.size) return true;
    for (const id of assignedPermissionIds) {
      if (!originalPermissionIds.has(id)) return true;
    }
    return false;
  }, [assignedPermissionIds, originalPermissionIds, selectedRole]);

  // Group Permissions by Category
  const categorizedPermissions = useMemo(() => {
    const groups: Record<string, PermissionCategoryGroup> = {
      property: {
        id: 'property',
        titleAr: 'إدارة العقارات والوحدات',
        titleEn: 'Properties & Rooms',
        icon: '🏠',
        color: '#0284C7',
        permissions: [],
      },
      booking: {
        id: 'booking',
        titleAr: 'الحجوزات والتسكين',
        titleEn: 'Bookings & Occupancy',
        icon: '📋',
        color: '#16A34A',
        permissions: [],
      },
      contract: {
        id: 'contract',
        titleAr: 'العقود الرقمية والتواقيع',
        titleEn: 'Digital Contracts',
        icon: '📝',
        color: '#8B5CF6',
        permissions: [],
      },
      user: {
        id: 'user',
        titleAr: 'إدارة المستخدمين والحسابات',
        titleEn: 'Users & Accounts',
        icon: '👥',
        color: '#0B2A4A',
        permissions: [],
      },
      report: {
        id: 'report',
        titleAr: 'البلاغات والشكاوى',
        titleEn: 'Reports & Violations',
        icon: '⚠️',
        color: '#EA580C',
        permissions: [],
      },
      support_ticket: {
        id: 'support_ticket',
        titleAr: 'الدعم الفني وتذاكر المساعدة',
        titleEn: 'Support Tickets',
        icon: '💬',
        color: '#2563EB',
        permissions: [],
      },
      review: {
        id: 'review',
        titleAr: 'التقييمات والمراجعات',
        titleEn: 'Reviews Moderation',
        icon: '⭐',
        color: '#EAB308',
        permissions: [],
      },
      dashboard: {
        id: 'dashboard',
        titleAr: 'لوحات القيادة والتحليلات',
        titleEn: 'Dashboard & Analytics',
        icon: '📊',
        color: '#0D9488',
        permissions: [],
      },
      notification: {
        id: 'notification',
        titleAr: 'الإشعارات والتنبيهات',
        titleEn: 'Notifications System',
        icon: '🔔',
        color: '#4F46E5',
        permissions: [],
      },
      role_permission: {
        id: 'role_permission',
        titleAr: 'إدارة الأدوار والصلاحيات (RBAC)',
        titleEn: 'Roles & Permissions Control',
        icon: '🛡️',
        color: '#B69F77',
        permissions: [],
      },
      auth_profile: {
        id: 'auth_profile',
        titleAr: 'المصادقة والملف الشخصي',
        titleEn: 'Auth & User Profiles',
        icon: '👤',
        color: '#64748B',
        permissions: [],
      },
      other: {
        id: 'other',
        titleAr: 'الميزات العامة والمفضلة',
        titleEn: 'Favorites & Other Features',
        icon: '✨',
        color: '#94A3B8',
        permissions: [],
      },
    };

    allPermissions.forEach((perm) => {
      const name = perm.name.toLowerCase();
      if (name.startsWith('property.')) groups.property.permissions.push(perm);
      else if (name.startsWith('booking.')) groups.booking.permissions.push(perm);
      else if (name.startsWith('contract.')) groups.contract.permissions.push(perm);
      else if (name.startsWith('user.')) groups.user.permissions.push(perm);
      else if (name.startsWith('report.')) groups.report.permissions.push(perm);
      else if (name.startsWith('support_ticket.')) groups.support_ticket.permissions.push(perm);
      else if (name.startsWith('review.')) groups.review.permissions.push(perm);
      else if (name.startsWith('dashboard.')) groups.dashboard.permissions.push(perm);
      else if (name.startsWith('notification.')) groups.notification.permissions.push(perm);
      else if (name.startsWith('role.') || name.startsWith('permission.')) groups.role_permission.permissions.push(perm);
      else if (name.startsWith('auth.') || name.startsWith('profile.')) groups.auth_profile.permissions.push(perm);
      else groups.other.permissions.push(perm);
    });

    return Object.values(groups).filter((g) => g.permissions.length > 0);
  }, [allPermissions]);

  // Filtered Categories based on user search & category dropdown
  const filteredCategoryGroups = useMemo(() => {
    return categorizedPermissions
      .map((cat) => {
        if (categoryFilter !== 'all' && cat.id !== categoryFilter) {
          return null;
        }

        const filteredPerms = cat.permissions.filter((p) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.trim().toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
          );
        });

        if (filteredPerms.length === 0) return null;

        return {
          ...cat,
          permissions: filteredPerms,
        };
      })
      .filter(Boolean) as PermissionCategoryGroup[];
  }, [categorizedPermissions, categoryFilter, searchQuery]);

  // Toggle Single Permission
  const togglePermission = (permId: string) => {
    if (!selectedRole || selectedRole.name === 'super_admin') return;
    setAssignedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  // Toggle All Permissions in a Category
  const toggleCategoryPermissions = (cat: PermissionCategoryGroup) => {
    if (!selectedRole || selectedRole.name === 'super_admin') return;
    const catPermIds = cat.permissions.map((p) => p.id);
    const allAssigned = catPermIds.every((id) => assignedPermissionIds.has(id));

    setAssignedPermissionIds((prev) => {
      const next = new Set(prev);
      if (allAssigned) {
        catPermIds.forEach((id) => next.delete(id));
      } else {
        catPermIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Save Permissions to Backend
  const handleSavePermissions = async () => {
    if (!selectedRole || selectedRole.name === 'super_admin') return;
    setIsSavingPermissions(true);
    setActionSuccess(null);
    setError(null);

    try {
      const idsArray = Array.from(assignedPermissionIds);
      const res = await RbacService.assignPermissionsToRole(selectedRole.id, idsArray);

      setOriginalPermissionIds(new Set(assignedPermissionIds));
      setActionSuccess(
        res?.message ||
          (locale === 'ar'
            ? `تم تحديث صلاحيات الدور (${selectedRole.name}) بنجاح (${idsArray.length} صلاحية).`
            : `Permissions for role (${selectedRole.name}) updated successfully (${idsArray.length} permissions).`)
      );

      // Refresh roles data to keep local cache synchronized
      const updatedRoles = await RbacService.getRoles();
      setRoles(updatedRoles);
    } catch (err: any) {
      console.error('[AdminRolesPermissionsPage] Failed to assign permissions:', err);
      setError(
        err?.message ||
          (locale === 'ar'
            ? 'حدث خطأ أثناء حفظ الصلاحيات. يرجى المحاولة مرة أخرى.'
            : 'Error while saving permissions. Please try again.')
      );
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Reset Changes
  const handleResetChanges = () => {
    setAssignedPermissionIds(new Set(originalPermissionIds));
    setActionSuccess(null);
  };

  // Create New Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsCreatingRole(true);
    setCreateRoleError(null);

    try {
      const created = await RbacService.createRole({
        name: newRoleName.trim().toLowerCase(),
        description: newRoleDesc.trim(),
      });

      const updatedRoles = await RbacService.getRoles();
      setRoles(updatedRoles);
      const matched = updatedRoles.find((r) => r.id === created.id || r.name === created.name) || created;
      selectRoleForMatrix(matched, updatedRoles);

      setCreateRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setActionSuccess(
        locale === 'ar'
          ? `تم إنشاء الدور الجديد (${created.name}) بنجاح! يمكنك الآن تخصيص صلاحياته.`
          : `New role (${created.name}) created successfully! You can now assign permissions.`
      );
    } catch (err: any) {
      console.error('[AdminRolesPermissionsPage] Create role error:', err);
      setCreateRoleError(
        err?.message ||
          (locale === 'ar' ? 'فشل إنشاء الدور. قد يكون الاسم مستخدماً بالفعل.' : 'Failed to create role.')
      );
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Quick Assign Role to User
  const handleAssignRoleToUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId.trim()) return;

    setIsAssigningRole(true);
    setAssignModalMsg(null);

    try {
      const res = await RbacService.assignRole(assignUserId.trim(), assignRoleName);
      setAssignModalMsg({
        type: 'success',
        text:
          res?.message ||
          (locale === 'ar'
            ? `تم إسناد الدور (${assignRoleName}) للمستخدم بنجاح.`
            : `Role (${assignRoleName}) assigned to user successfully.`),
      });
      setAssignUserId('');
    } catch (err: any) {
      console.error('[AdminRolesPermissionsPage] Assign user role error:', err);
      setAssignModalMsg({
        type: 'error',
        text:
          err?.message ||
          (locale === 'ar' ? 'فشل إسناد الدور للمستخدم. يرجى التحقق من صحة المعرف (UUID).' : 'Failed to assign role.'),
      });
    } finally {
      setIsAssigningRole(false);
    }
  };

  return (
    <div className="dary-rbac-page">
      {/* Top Header Banner */}
      <div className="dary-rbac-header">
        <div className="dary-rbac-title-box">
          <div className="dary-rbac-badge">
            <span>🛡️</span>
            <span>{locale === 'ar' ? 'نظام التحكم بالوصول (RBAC)' : 'Role-Based Access Control'}</span>
          </div>
          <h1>{locale === 'ar' ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}</h1>
          <p>
            {locale === 'ar'
              ? 'لوحة إدارة الصلاحيات الحصرية للمدير العام. يمكنك هنا استعراض الأدوار، ضبط مصفوفة الصلاحيات بدقة، وإسناد الأدوار للمستخدمين.'
              : 'Super Admin central control to inspect roles, configure granular permission matrices, and assign roles to users.'}
          </p>
        </div>

        <div className="dary-rbac-actions">
          <button
            type="button"
            className="dary-rbac-btn dary-btn-secondary"
            onClick={() => {
              setAssignModalOpen(true);
              setAssignModalMsg(null);
            }}
          >
            <span>👤</span>
            <span>{locale === 'ar' ? 'إسناد دور لمستخدم' : 'Assign User Role'}</span>
          </button>

          <button
            type="button"
            className="dary-rbac-btn dary-btn-primary"
            onClick={() => {
              setCreateRoleModalOpen(true);
              setCreateRoleError(null);
            }}
          >
            <span>➕</span>
            <span>{locale === 'ar' ? 'إنشاء دور جديد' : 'New System Role'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="dary-rbac-alert dary-alert-success">
          <span>✓</span>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="dary-rbac-alert dary-alert-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="dary-rbac-metrics-strip">
        <div className="dary-rbac-metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(11, 42, 74, 0.08)', color: '#0B2A4A' }}>🛡️</div>
          <div className="metric-info">
            <span className="metric-label">{locale === 'ar' ? 'إجمالي الأدوار' : 'Total Roles'}</span>
            <span className="metric-value">{roles.length}</span>
          </div>
        </div>

        <div className="dary-rbac-metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(182, 159, 119, 0.12)', color: '#B69F77' }}>🔑</div>
          <div className="metric-info">
            <span className="metric-label">{locale === 'ar' ? 'الصلاحيات المسجلة' : 'Registered Permissions'}</span>
            <span className="metric-value">{allPermissions.length}</span>
          </div>
        </div>

        <div className="dary-rbac-metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(22, 163, 74, 0.1)', color: '#16A34A' }}>👑</div>
          <div className="metric-info">
            <span className="metric-label">{locale === 'ar' ? 'دور السوبر أدمن' : 'Super Admin Mode'}</span>
            <span className="metric-value" style={{ fontSize: '1rem', color: '#16A34A' }}>
              {locale === 'ar' ? 'نجمة (*) وصول شامل' : 'Wildcard (*) Full Access'}
            </span>
          </div>
        </div>

        <div className="dary-rbac-metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284C7' }}>⚡</div>
          <div className="metric-info">
            <span className="metric-label">{locale === 'ar' ? 'الدور المختار حالياً' : 'Active Role Matrix'}</span>
            <span className="metric-value" style={{ fontSize: '1.1rem', color: '#0B2A4A' }}>
              {selectedRole?.name || '---'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Roles Sidebar + Permissions Matrix */}
      <div className="dary-rbac-main-grid">
        {/* Left Column: Roles Selector Cards */}
        <aside className="dary-rbac-roles-col">
          <div className="dary-rbac-card-header">
            <h3>{locale === 'ar' ? 'الأدوار المسجلة' : 'System Roles'}</h3>
            <span className="count-pill">{roles.length}</span>
          </div>

          <div className="dary-rbac-roles-list">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              const isSuper = r.name === 'super_admin';
              const permCount = isSuper
                ? allPermissions.length
                : (r.rolePermissions?.length || 0);

              return (
                <div
                  key={r.id}
                  onClick={() => selectRoleForMatrix(r)}
                  className={`dary-rbac-role-card ${isSelected ? 'active' : ''} ${isSuper ? 'super-role' : ''}`}
                >
                  <div className="role-card-top">
                    <div className="role-title-row">
                      <span className="role-icon">
                        {isSuper ? '👑' : r.name === 'admin' ? '🛡️' : r.name === 'owner' ? '🏠' : '🎓'}
                      </span>
                      <strong className="role-name">{r.name}</strong>
                    </div>
                    <span className={`role-badge ${isSuper ? 'badge-super' : 'badge-count'}`}>
                      {isSuper ? (locale === 'ar' ? 'كامل (*) ' : 'Full (*)') : `${permCount} ${locale === 'ar' ? 'صلاحية' : 'perms'}`}
                    </span>
                  </div>

                  <p className="role-desc">
                    {r.description || (isSuper ? (locale === 'ar' ? 'المدير العام بكافة الصلاحيات' : 'Complete system clearance') : (locale === 'ar' ? 'دور نظام مخصص' : 'System role'))}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Column: Permissions Matrix for Selected Role */}
        <section className="dary-rbac-matrix-col">
          {/* Header of Active Role */}
          <div className="dary-rbac-matrix-header">
            <div className="matrix-title-wrap">
              <h2>
                <span>{locale === 'ar' ? 'صلاحيات الدور:' : 'Permissions for:'}</span>
                <span className="highlight-role-name"> {selectedRole?.name || '---'}</span>
              </h2>
              <p>
                {selectedRole?.name === 'super_admin'
                  ? (locale === 'ar'
                      ? 'تمت برمجة هذا الدور برمز النجمة (*) ليمتلك جميع الصلاحيات الحالية والمستقبلية تلقائياً دون الحاجة لتحديدها يدوياً.'
                      : 'Super Admin role is assigned wildcard (*) access, granting automatic unconditional permissions across the entire platform.')
                  : (locale === 'ar'
                      ? `تم تعيين ${assignedPermissionIds.size} من أصل ${allPermissions.length} صلاحية لهذا الدور.`
                      : `${assignedPermissionIds.size} of ${allPermissions.length} permissions assigned to this role.`)}
              </p>
            </div>

            {/* Unsaved Changes Banner / Floating Action Bar */}
            {hasUnsavedChanges && (
              <div className="dary-rbac-unsaved-bar">
                <span className="unsaved-text">
                  ⚠️ {locale === 'ar' ? 'لديك تغييرات غير محفوظة' : 'Unsaved changes pending'}
                </span>
                <div className="unsaved-actions">
                  <button
                    type="button"
                    className="dary-rbac-btn dary-btn-cancel"
                    onClick={handleResetChanges}
                    disabled={isSavingPermissions}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Reset'}
                  </button>
                  <button
                    type="button"
                    className="dary-rbac-btn dary-btn-save"
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                  >
                    {isSavingPermissions ? (
                      <span className="spinner-inline" />
                    ) : (
                      <span>💾</span>
                    )}
                    <span>{locale === 'ar' ? 'حفظ الصلاحيات' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filters Bar: Search & Category Filter */}
          <div className="dary-rbac-filters-bar">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={
                  locale === 'ar'
                    ? 'ابحث باسم الصلاحية أو الوصف (مثال: property.create)...'
                    : 'Search permission name or description (e.g. property.create)...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="category-select-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">{locale === 'ar' ? 'جميع الأقسام' : 'All Categories'}</option>
                {categorizedPermissions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {locale === 'ar' ? c.titleAr : c.titleEn} ({c.permissions.length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Super Admin Notice Banner */}
          {selectedRole?.name === 'super_admin' && (
            <div className="dary-rbac-super-notice">
              <div className="notice-icon">👑</div>
              <div className="notice-content">
                <h4>{locale === 'ar' ? 'صلاحيات المدير العام كاملة وغير مقيدة' : 'Unrestricted Super Admin Privileges'}</h4>
                <p>
                  {locale === 'ar'
                    ? 'في نظام الصلاحيات المعتمد، يمتلك دور super_admin تصريح النجمة [*] الذي يتجاوز جميع فحوصات الصلاحيات الفردية. لذلك، يتم تفعيل كافة الصلاحيات أدناه تلقائياً وبشكل دائم.'
                    : 'The super_admin role holds the master wildcard [*] permission, bypassing individual granular checks. All permissions below are perpetually active.'}
                </p>
              </div>
            </div>
          )}

          {/* Categories & Permissions Grid */}
          {loading ? (
            <div className="dary-rbac-loading-state">
              <div className="rbac-spinner" />
              <p>{locale === 'ar' ? 'جاري تحميل مصفوفة الصلاحيات...' : 'Loading permissions matrix...'}</p>
            </div>
          ) : filteredCategoryGroups.length === 0 ? (
            <div className="dary-rbac-empty-state">
              <span className="empty-icon">🔍</span>
              <h3>{locale === 'ar' ? 'لا توجد صلاحيات مطابقة' : 'No matching permissions found'}</h3>
              <p>{locale === 'ar' ? 'جرب البحث بكلمة مختلفة أو مسح حقول الفلترة.' : 'Try another query or reset filters.'}</p>
            </div>
          ) : (
            <div className="dary-rbac-categories-list">
              {filteredCategoryGroups.map((cat) => {
                const isSuper = selectedRole?.name === 'super_admin';
                const catPermIds = cat.permissions.map((p) => p.id);
                const assignedCount = isSuper
                  ? catPermIds.length
                  : catPermIds.filter((id) => assignedPermissionIds.has(id)).length;
                const allAssigned = isSuper || (catPermIds.length > 0 && assignedCount === catPermIds.length);

                return (
                  <div key={cat.id} className="dary-rbac-category-block">
                    <div className="category-block-header">
                      <div className="category-info">
                        <span className="category-icon" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                          {cat.icon}
                        </span>
                        <div>
                          <h4>{locale === 'ar' ? cat.titleAr : cat.titleEn}</h4>
                          <span className="category-stats">
                            {assignedCount} / {catPermIds.length} {locale === 'ar' ? 'مفعلة' : 'active'}
                          </span>
                        </div>
                      </div>

                      {!isSuper && (
                        <button
                          type="button"
                          className="category-toggle-all-btn"
                          onClick={() => toggleCategoryPermissions(cat)}
                        >
                          {allAssigned
                            ? (locale === 'ar' ? 'إلغاء تحديد القسم' : 'Deselect Group')
                            : (locale === 'ar' ? 'تحديد كل القسم' : 'Select All in Group')}
                        </button>
                      )}
                    </div>

                    <div className="permissions-chips-grid">
                      {cat.permissions.map((perm) => {
                        const isChecked = isSuper || assignedPermissionIds.has(perm.id);

                        return (
                          <div
                            key={perm.id}
                            onClick={() => togglePermission(perm.id)}
                            className={`permission-chip ${isChecked ? 'selected' : ''} ${isSuper ? 'disabled-super' : ''}`}
                          >
                            <div className="chip-checkbox">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by parent onClick
                                disabled={isSuper}
                              />
                            </div>
                            <div className="chip-details">
                              <span className="perm-name">{perm.name}</span>
                              {perm.description && (
                                <span className="perm-desc">{perm.description}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal 1: Create New Role */}
      {createRoleModalOpen && (
        <div className="dary-rbac-modal-backdrop" onClick={() => setCreateRoleModalOpen(false)}>
          <div className="dary-rbac-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{locale === 'ar' ? 'إنشاء دور نظام جديد' : 'Create New System Role'}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setCreateRoleModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole}>
              <div className="modal-body">
                {createRoleError && (
                  <div className="modal-error-banner">⚠️ {createRoleError}</div>
                )}

                <div className="form-group">
                  <label>
                    {locale === 'ar' ? 'اسم الدور (إنجليزي بأحرف صغيرة، مثل: auditor):' : 'Role Name (lowercase, e.g. auditor):'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. finance_auditor"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  />
                  <small>
                    {locale === 'ar'
                      ? 'يجب أن يكون اسم الدور فريداً وبأحرف إنجليزية بدون مسافات (مثلاً: supervisor, quality_inspector).'
                      : 'Must be unique lowercase English identifier (e.g. supervisor, quality_inspector).'}
                  </small>
                </div>

                <div className="form-group">
                  <label>{locale === 'ar' ? 'وصف الدور والمسؤوليات:' : 'Role Description:'}</label>
                  <textarea
                    rows={3}
                    placeholder={
                      locale === 'ar'
                        ? 'وضح مهام هذا الدور ومجال مسؤوليته في النظام...'
                        : 'Explain the responsibilities for this role...'
                    }
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="dary-rbac-btn dary-btn-cancel"
                  onClick={() => setCreateRoleModalOpen(false)}
                  disabled={isCreatingRole}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="dary-rbac-btn dary-btn-save"
                  disabled={isCreatingRole || !newRoleName.trim()}
                >
                  {isCreatingRole ? <span className="spinner-inline" /> : null}
                  <span>{locale === 'ar' ? 'إنشاء الدور' : 'Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Role to User */}
      {assignModalOpen && (
        <div className="dary-rbac-modal-backdrop" onClick={() => setAssignModalOpen(false)}>
          <div className="dary-rbac-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{locale === 'ar' ? 'إسناد دور لمستخدم' : 'Assign Role to User'}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setAssignModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignRoleToUser}>
              <div className="modal-body">
                {assignModalMsg && (
                  <div className={`modal-banner ${assignModalMsg.type === 'success' ? 'success' : 'error'}`}>
                    {assignModalMsg.type === 'success' ? '✓' : '⚠️'} {assignModalMsg.text}
                  </div>
                )}

                <div className="form-group">
                  <label>{locale === 'ar' ? 'معرف المستخدم (User ID / UUID):' : 'User UUID:'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                  />
                  <small>
                    {locale === 'ar'
                      ? 'يمكنك نسخ معرف المستخدم من صفحة المستخدمين.'
                      : 'You can copy the user UUID directly from the users table.'}
                  </small>
                </div>

                <div className="form-group">
                  <label>{locale === 'ar' ? 'اختر الدور المراد إسناده:' : 'Select Target Role:'}</label>
                  <select
                    value={assignRoleName}
                    onChange={(e) => setAssignRoleName(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} - {r.description || r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {assignRoleName === 'owner' && (
                  <div className="wallet-notice-card">
                    <span>💡</span>
                    <span>
                      {locale === 'ar'
                        ? 'ملاحظة: عند تعيين دور (owner) سيقوم النظام تلقائياً بإنشاء محفظة مالية للمستخدم إذا لم تكن موجودة.'
                        : 'Note: Assigning owner role will automatically provision a financial wallet for this user if absent.'}
                    </span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="dary-rbac-btn dary-btn-cancel"
                  onClick={() => setAssignModalOpen(false)}
                  disabled={isAssigningRole}
                >
                  {locale === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="submit"
                  className="dary-rbac-btn dary-btn-save"
                  disabled={isAssigningRole || !assignUserId.trim()}
                >
                  {isAssigningRole ? <span className="spinner-inline" /> : null}
                  <span>{locale === 'ar' ? 'تأكيد إسناد الدور' : 'Confirm Role Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
