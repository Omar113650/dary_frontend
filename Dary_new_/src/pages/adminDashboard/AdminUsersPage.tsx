import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale } from '../../utils/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services/authService';
import { AdminService } from '../../services/adminService';
import { ApiClient } from '../../services/apiClient';
import type { AdminUserItem, AdminStatusCount } from '../../services/adminService';
import AnimatedCounter from '../../components/common/AnimatedCounter';
import Pagination from '../../components/common/Pagination';
import { useAdminUsersStatus } from '../../hooks/useDashboardQueries';
import { useQueryClient, STALE_TIMES } from '../../lib/queryClient';
import type { AdminModule } from '../../utils/adminPermissions';
import {
  ADMIN_MODULES,
  ADMIN_ROLE_PRESETS,
  getAdminAssignedModules,
  saveAdminPermissions,
} from '../../utils/adminPermissions';

export default function AdminUsersPage() {
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const initialParams = { page: 1, limit: 10 };
  const initialCache = queryClient.getQueryData<any>(['admin', 'users', initialParams]);
  const initialList = initialCache?.users || initialCache?.items || initialCache?.data || (Array.isArray(initialCache) ? initialCache : []);

  const [users, setUsers] = useState<AdminUserItem[]>(() => (Array.isArray(initialList) ? initialList : []));
  
  // Cached: 30s staleTime
  const {
    data: usersStatus,
    isLoading: loadingStatus,
    refetch: fetchUsersStatus,
  } = useAdminUsersStatus();
  
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
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

  const { isSuperAdmin } = useAuth();

  // Create Admin Modal State (Dual Mode: Existing User vs New Account with OTP)
  const [createAdminModalOpen, setCreateAdminModalOpen] = useState(false);
  const [adminModalTab, setAdminModalTab] = useState<'existing' | 'new'>('existing');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [promotingUser, setPromotingUser] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Tab 1: Existing User Selection
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<string>('');

  // Tab 2: New Account Creation & OTP
  const [creationStep, setCreationStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pendingRegisteredUser, setPendingRegisteredUser] = useState<{ id: string; email: string; name: string } | null>(null);

  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminLastName, setNewAdminLastName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('Admin@2026!');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminModules, setNewAdminModules] = useState<AdminModule[]>(['properties']);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('INSPECTOR');

  const generateStrongPassword = () => {
    const specials = '!@#$%&*';
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    let pwd =
      uppers[Math.floor(Math.random() * uppers.length)] +
      lowers[Math.floor(Math.random() * lowers.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      specials[Math.floor(Math.random() * specials.length)];
    const all = uppers + lowers + digits + specials;
    for (let i = 0; i < 6; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    setNewAdminPassword(pwd);
  };

  // Success Credentials Modal State
  const [credentialsModal, setCredentialsModal] = useState<{
    email: string;
    password: string;
    modules: AdminModule[];
    name: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Edit Permissions Modal for existing Admin
  const [permissionsModalUser, setPermissionsModalUser] = useState<AdminUserItem | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<AdminModule[]>([]);

  // Selected Modules inside Role Modal when selectedRole === 'admin'
  const [roleModalAdminModules, setRoleModalAdminModules] = useState<AdminModule[]>(['properties']);

  // Modals for Role and Status Management
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('tenant');

  const [statusModalUser, setStatusModalUser] = useState<AdminUserItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');

  // 2. Fetch Users List
  const fetchUsers = useCallback(async () => {
    const params: any = { page, limit: 10 };
    if (search.trim()) params.search = search.trim();
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.status = statusFilter;

    const cacheKey = ['admin', 'users', params];
    const cached = queryClient.getQueryData<any>(cacheKey);
    if (cached) {
      const list =
        cached?.users ||
        cached?.items ||
        cached?.data?.users ||
        cached?.data?.items ||
        (Array.isArray(cached?.data) ? cached.data : null) ||
        (Array.isArray(cached) ? cached : []);
      setUsers(Array.isArray(list) ? list : []);
      const total =
        cached?.total ??
        cached?.meta?.total ??
        cached?.data?.total ??
        cached?.data?.meta?.total ??
        (Array.isArray(list) ? list.length : 0);
      const limit = cached?.limit || cached?.meta?.limit || 10;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: cacheKey,
        queryFn: () => AdminService.getUsers(params),
        staleTime: STALE_TIMES.LISTS,
      });
      const list =
        data?.users ||
        data?.items ||
        data?.data?.users ||
        data?.data?.items ||
        (Array.isArray(data?.data) ? data.data : null) ||
        (Array.isArray(data) ? data : []);
      setUsers(Array.isArray(list) ? list : []);

      const total =
        data?.total ??
        data?.meta?.total ??
        data?.data?.total ??
        data?.data?.meta?.total ??
        (Array.isArray(list) ? list.length : 0);
      const limit = data?.limit || data?.meta?.limit || 10;
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
  }, [page, search, roleFilter, statusFilter, locale, queryClient]);

  // Client-side filtering fallback if backend returns full unpaginated/unfiltered list
  const filteredUsers = useMemo(() => {
    // If backend already filtered on server side and returned a page-slice (e.g. <= 10 items when total > 10), keep as-is:
    if (users.length <= 10 && (search.trim() || roleFilter || statusFilter)) {
      return users;
    }

    let result = users;

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(s) ||
          u.name?.toLowerCase().includes(s) ||
          `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(s) ||
          u.phone?.includes(s)
      );
    }

    if (roleFilter) {
      result = result.filter((u) => {
        const directRole: string =
          u.role ||
          (Array.isArray(u.roles) && (
            u.roles.some((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name) === 'super_admin') ? 'super_admin' :
            u.roles.some((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name) === 'admin') ? 'admin' :
            u.roles.some((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name) === 'owner') ? 'owner' :
            (typeof u.roles[0] === 'string' ? u.roles[0] : (u.roles[0]?.name || u.roles[0]?.role?.name))
          )) ||
          'tenant';
        return directRole.toLowerCase() === roleFilter.toLowerCase();
      });
    }

    if (statusFilter) {
      result = result.filter((u) => (u.status || '').toUpperCase() === statusFilter.toUpperCase());
    }

    return result;
  }, [users, search, roleFilter, statusFilter]);

  // If the returned list has more items than the page limit (10),
  // it means the server sent the full dataset without slicing.
  // In that case, we slice by the current page on the client side:
  const isClientSidePaginated = filteredUsers.length > 10;
  const effectiveTotalPages = isClientSidePaginated
    ? Math.max(1, Math.ceil(filteredUsers.length / 10))
    : Math.max(1, totalPages);

  const displayedUsers = useMemo(() => {
    if (isClientSidePaginated) {
      const startIndex = (page - 1) * 10;
      return filteredUsers.slice(startIndex, startIndex + 10);
    }
    return filteredUsers;
  }, [filteredUsers, isClientSidePaginated, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open Role Modal
  const openRoleModal = (u: AdminUserItem, currentRole: string) => {
    setRoleModalUser(u);
    setSelectedRole(currentRole || 'tenant');
    const existing = getAdminAssignedModules(u);
    setRoleModalAdminModules(existing.length > 0 ? existing : ['properties']);
  };

  // Submit Role Change
  const submitRoleChange = async () => {
    if (!roleModalUser) return;
    setActiveUpdatingId(roleModalUser.id);
    setActionMessage(null);
    try {
      await AdminService.assignRole(roleModalUser.id, selectedRole);
      if (selectedRole === 'admin') {
        saveAdminPermissions(roleModalUser.id, roleModalUser.email, roleModalAdminModules);
      }
      setActionMessage({
        type: 'success',
        text: locale === 'ar' ? `تم تعيين الدور (${selectedRole}) بنجاح وتحديث الصلاحيات.` : `Role (${selectedRole}) assigned and permissions saved successfully.`,
      });
      setRoleModalUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
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

  // Open Direct Permissions Modal for existing admin
  const openPermissionsModal = (u: AdminUserItem) => {
    setPermissionsModalUser(u);
    const existing = getAdminAssignedModules(u);
    setEditingPermissions(existing.length > 0 ? existing : ['properties']);
  };

  // Submit Direct Permissions Change
  const submitPermissionsChange = () => {
    if (!permissionsModalUser) return;
    saveAdminPermissions(permissionsModalUser.id, permissionsModalUser.email, editingPermissions);
    setActionMessage({
      type: 'success',
      text: locale === 'ar'
        ? `تم تحديث صلاحيات المسؤول (${permissionsModalUser.name || permissionsModalUser.email}) بنجاح.`
        : `Permissions for admin (${permissionsModalUser.name || permissionsModalUser.email}) updated successfully.`,
    });
    setPermissionsModalUser(null);
    setUsers((prev) => [...prev]);
  };

  // Option 1: Promote an Existing Verified User
  const handlePromoteExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    if (!selectedExistingUserId) {
      setCreateModalError(locale === 'ar' ? 'يرجى اختيار مستخدم من القائمة أولاً.' : 'Please select a user to promote.');
      return;
    }

    const targetUser = users.find((u) => u.id === selectedExistingUserId);
    if (!targetUser) {
      setCreateModalError(locale === 'ar' ? 'تعذر العثور على المستخدم المحدد.' : 'Selected user not found.');
      return;
    }

    if (newAdminModules.length === 0) {
      setCreateModalError(locale === 'ar' ? 'يرجى اختيار صلاحية واحدة على الأقل لهذا المسؤول.' : 'Please select at least one module permission.');
      return;
    }

    setPromotingUser(true);

    try {
      await AdminService.assignRole(targetUser.id, 'admin');
      try {
        await AdminService.updateUserStatus(targetUser.id, 'ACTIVE');
      } catch {}
      try {
        await ApiClient.patch(`/auth/users/${targetUser.id}/status`, { status: 'ACTIVE', isVerified: true });
      } catch {}
      try {
        await ApiClient.patch(`/auth/users/${targetUser.id}`, { status: 'ACTIVE', isVerified: true });
      } catch {}

      saveAdminPermissions(targetUser.id, targetUser.email, newAdminModules);

      setActionMessage({
        type: 'success',
        text: locale === 'ar'
          ? `تمت ترقية المستخدم (${targetUser.name || targetUser.email}) إلى مدير نظام وتفعيل حسابه بنجاح مع الصلاحيات المحددة.`
          : `User (${targetUser.name || targetUser.email}) promoted to admin successfully with selected permissions.`,
      });

      setCreateAdminModalOpen(false);
      setSelectedExistingUserId('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await Promise.all([fetchUsers(), fetchUsersStatus()]);
    } catch (err: any) {
      console.error('Failed to promote user:', err);
      setCreateModalError(
        err?.message || (locale === 'ar' ? 'فشل تعيين دور المسؤول للمستخدم.' : 'Failed to promote user to admin.')
      );
    } finally {
      setPromotingUser(false);
    }
  };

  // Option 2: Register New Admin Account (Direct Activation - No OTP required)
  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    const fName = newAdminFirstName.trim();
    const lName = newAdminLastName.trim() || 'Admin';
    const email = newAdminEmail.trim().toLowerCase();
    const rawPhone = newAdminPhone.trim();

    if (!fName || fName.length < 2) {
      setCreateModalError(locale === 'ar' ? 'الاسم الأول يجب أن يتكون من حرفين على الأقل.' : 'First name must be at least 2 characters.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateModalError(locale === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.');
      return;
    }

    // Password validation (min 8 chars, 1 upper, 1 lower, 1 digit, 1 special)
    const hasMinLength = newAdminPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newAdminPassword);
    const hasLower = /[a-z]/.test(newAdminPassword);
    const hasNumber = /[0-9]/.test(newAdminPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newAdminPassword);

    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setCreateModalError(
        locale === 'ar'
          ? 'كلمة المرور يجب أن لا تقل عن 8 خانات وتحتوي على حرف كبير (A-Z)، حرف صغير (a-z)، رقم (0-9)، ورمز خاص (@، #، $، إلخ). يمكنك الضغط على زر "توليد كلمة سر".'
          : 'Password must be at least 8 chars and include uppercase, lowercase, number, and special character.'
      );
      return;
    }

    // Phone formatting to E.164 standard required by backend regex ^\+[1-9]\d{7,14}$
    let formattedPhone = rawPhone.replace(/[\s\-()]/g, '');
    if (!formattedPhone) {
      formattedPhone = '+201000000001';
    } else if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+2' + formattedPhone;
      } else {
        formattedPhone = '+20' + formattedPhone;
      }
    }

    if (!/^\+[1-9]\d{7,14}$/.test(formattedPhone)) {
      setCreateModalError(locale === 'ar' ? 'صيغة رقم الهاتف غير صحيحة. يجب أن تبدأ برمز الدولة (+20).' : 'Invalid phone format. Must start with country code (+).');
      return;
    }

    if (newAdminModules.length === 0) {
      setCreateModalError(locale === 'ar' ? 'يرجى اختيار صلاحية واحدة على الأقل لهذا المسؤول.' : 'Please select at least one module permission.');
      return;
    }

    setCreatingAdmin(true);

    try {
      let createdUser: any = null;

      // 1. Call dedicated create-admin API in backend (creates active + verified admin directly)
      try {
        const res = await AdminService.createAdmin({
          firstName: fName,
          lastName: lName,
          email: email,
          phone: formattedPhone,
          password: newAdminPassword,
          roleName: 'admin',
        });
        createdUser = res?.user || res?.data?.user || res?.data || res;
      } catch (adminErr: any) {
        const errMsg = (adminErr?.message || '').toLowerCase();
        // If user already exists in DB, find them and promote to admin
        if (errMsg.includes('already exists') || errMsg.includes('موجود') || errMsg.includes('registered') || adminErr?.status === 409) {
          const existingUser = users.find((u) => u.email?.toLowerCase() === email);
          if (existingUser) {
            createdUser = existingUser;
          } else {
            throw adminErr;
          }
        } else {
          // Fallback to register + activate if endpoint returned 404
          try {
            const res = await AuthService.register({
              firstName: fName,
              lastName: lName,
              email: email,
              password: newAdminPassword,
              phone: formattedPhone,
              roles: 'tenant',
            });
            createdUser = res?.data?.user || res?.user;
          } catch (regErr: any) {
            throw adminErr || regErr;
          }
        }
      }

      // 2. Lookup the user ID from database
      let realUserId: string | null = createdUser?.id || null;
      if (!realUserId) {
        try {
          const freshData = await AdminService.getUsers({ search: email });
          const list = freshData?.users || freshData?.items || freshData?.data || (Array.isArray(freshData) ? freshData : []);
          const found = list.find((u: any) => u.email?.toLowerCase() === email);
          if (found?.id) realUserId = found.id;
        } catch {}
      }

      if (!realUserId) {
        const matchedLocal = users.find((u) => u.email?.toLowerCase() === email);
        if (matchedLocal?.id) realUserId = matchedLocal.id;
      }

      // 3. Ensure role and active status are set in database
      if (realUserId) {
        try {
          await AdminService.updateUserStatus(realUserId, 'ACTIVE');
        } catch {}
        try {
          await AdminService.assignRole(realUserId, 'admin');
        } catch {}
        try {
          await ApiClient.patch(`/auth/users/${realUserId}/status`, { status: 'ACTIVE', isVerified: true });
        } catch {}
      }

      // 4. Save permissions
      const assignedId = realUserId || `admin_${Date.now()}`;
      saveAdminPermissions(assignedId, email, newAdminModules);

      // 5. Success! Close modal and show Credentials Modal directly
      setCreateAdminModalOpen(false);
      setCreationStep('form');
      setCredentialsModal({
        name: `${fName} ${lName}`.trim(),
        email: email,
        password: newAdminPassword,
        modules: [...newAdminModules],
      });

      setNewAdminFirstName('');
      setNewAdminLastName('');
      setNewAdminEmail('');
      setNewAdminPassword('Admin@2026!');
      setNewAdminPhone('');
      setNewAdminModules(['properties']);
      setOtpCode('');
      setPendingRegisteredUser(null);

      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await Promise.all([fetchUsers(), fetchUsersStatus()]);
    } catch (err: any) {
      console.error('Failed to create admin:', err);
      setCreateModalError(
        err?.message || (locale === 'ar' ? 'تعذر إنشاء حساب المسؤول. يرجى التحقق من صحة البيانات المدخلة.' : 'Failed to create new admin user.')
      );
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Option 2 (Step 2): Verify OTP and Promote to Admin
  const handleVerifyOtpAndFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRegisteredUser || !otpCode.trim()) {
      setCreateModalError(locale === 'ar' ? 'يرجى إدخال كود التحقق (OTP).' : 'Please enter OTP code.');
      return;
    }

    setVerifyingOtp(true);
    setCreateModalError(null);

    try {
      await AuthService.verifyOtp({
        email: pendingRegisteredUser.email,
        otp: otpCode.trim(),
        type: 'EMAIL_VERIFICATION',
      });

      // Assign admin role now that account is verified
      if (pendingRegisteredUser.id) {
        try {
          await AdminService.assignRole(pendingRegisteredUser.id, 'admin');
        } catch {}
      }

      saveAdminPermissions(pendingRegisteredUser.id, pendingRegisteredUser.email, newAdminModules);

      setCreateAdminModalOpen(false);
      setCreationStep('form');
      setCredentialsModal({
        name: pendingRegisteredUser.name,
        email: pendingRegisteredUser.email,
        password: newAdminPassword,
        modules: [...newAdminModules],
      });

      setNewAdminFirstName('');
      setNewAdminLastName('');
      setNewAdminEmail('');
      setNewAdminPassword('Admin@2026!');
      setNewAdminPhone('');
      setNewAdminModules(['properties']);
      setOtpCode('');
      setPendingRegisteredUser(null);

      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await Promise.all([fetchUsers(), fetchUsersStatus()]);
    } catch (err: any) {
      console.error('OTP verify failed:', err);
      setCreateModalError(
        err?.message || (locale === 'ar' ? 'كود التحقق غير صحيح أو انتهت صلاحيته. تفقد الكود في كونسول الباك إند.' : 'Invalid OTP code. Check your console.')
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Option 2 (Bypass/Skip OTP if already verified or local development)
  const handleSkipOtpAndFinalize = async () => {
    if (!pendingRegisteredUser) return;
    if (pendingRegisteredUser.id) {
      try {
        await AdminService.assignRole(pendingRegisteredUser.id, 'admin');
      } catch {}
    }
    saveAdminPermissions(pendingRegisteredUser.id, pendingRegisteredUser.email, newAdminModules);
    setCreateAdminModalOpen(false);
    setCreationStep('form');
    setCredentialsModal({
      name: pendingRegisteredUser.name,
      email: pendingRegisteredUser.email,
      password: newAdminPassword,
      modules: [...newAdminModules],
    });
    setPendingRegisteredUser(null);
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    await Promise.all([fetchUsers(), fetchUsersStatus()]);
  };

  const handleCopyCredentials = () => {
    if (!credentialsModal) return;
    const text = `بيانات الدخول للوحة إدارة داري:\nالبريد الإلكتروني: ${credentialsModal.email}\nكلمة المرور: ${credentialsModal.password}\nالرابط: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
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
      <div className="dary-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setCreateAdminModalOpen(true)}
            className="dary-primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0B2A4A',
              padding: '0.75rem 1.4rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(11, 42, 74, 0.2)',
            }}
          >
            <span>➕</span>
            <span>{locale === 'ar' ? 'إضافة مسؤول وتحديد صلاحياته' : 'Add Admin with Permissions'}</span>
          </button>
        )}
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
                <AnimatedCounter value={item.count} loading={loadingStatus} />
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
        ) : displayedUsers.length === 0 ? (
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
                  {displayedUsers.map((u) => {
                    const fullName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                    const directRole: string =
                      u.role ||
                      (Array.isArray(u.roles) && (
                        u.roles.some((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name) === 'super_admin') ? 'super_admin' :
                        u.roles.some((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name) === 'admin') ? 'admin' :
                        u.roles.some((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name) === 'owner') ? 'owner' :
                        (typeof u.roles[0] === 'string' ? u.roles[0] : (u.roles[0]?.name || u.roles[0]?.role?.name))
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
                          {/* If admin, display their assigned modules badges */}
                          {directRole === 'admin' && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', maxWidth: '240px' }}>
                              {getAdminAssignedModules(u).map((modId) => {
                                const modInfo = ADMIN_MODULES.find((m) => m.id === modId);
                                if (!modInfo) return null;
                                return (
                                  <span
                                    key={modId}
                                    style={{
                                      fontSize: '0.68rem',
                                      backgroundColor: '#F1F5F9',
                                      color: '#1E293B',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #E2E8F0',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {modInfo.icon} {locale === 'ar' ? modInfo.titleAr : modInfo.titleEn}
                                  </span>
                                );
                              })}
                            </div>
                          )}
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
                            {/* Edit Permissions Button for Admin */}
                            {directRole === 'admin' && isSuperAdmin && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openPermissionsModal(u)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#FEF3C7',
                                  color: '#92400E',
                                  border: '1px solid #FCD34D',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>🛡️</span>
                                <span>{locale === 'ar' ? 'الصلاحيات' : 'Permissions'}</span>
                              </button>
                            )}

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

                            {/* Quick Activate Button for PENDING accounts */}
                            {u.status === 'PENDING' && isSuperAdmin && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={async () => {
                                  setActiveUpdatingId(u.id);
                                  try {
                                    await AdminService.updateUserStatus(u.id, 'ACTIVE');
                                    try {
                                      await ApiClient.patch(`/auth/users/${u.id}/status`, { status: 'ACTIVE', isVerified: true });
                                    } catch {}
                                    setActionMessage({
                                      type: 'success',
                                      text: locale === 'ar' ? `تم تفعيل حساب (${u.name || u.email}) إلى نشط (ACTIVE) بنجاح.` : `Account activated successfully.`,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
                                    await Promise.all([fetchUsers(), fetchUsersStatus()]);
                                  } catch (err: any) {
                                    setActionMessage({
                                      type: 'error',
                                      text: err?.message || (locale === 'ar' ? 'فشل تفعيل الحساب.' : 'Failed to activate account.'),
                                    });
                                  } finally {
                                    setActiveUpdatingId(null);
                                  }
                                }}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  border: '1px solid #86EFAC',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: isBusy ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>⚡</span>
                                <span>{locale === 'ar' ? 'تفعيل الحساب (نشط)' : 'Activate (ACTIVE)'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modern Reusable Pagination */}
            <Pagination
              currentPage={page}
              totalPages={effectiveTotalPages}
              totalCount={filteredUsers.length > 10 ? filteredUsers.length : undefined}
              limit={10}
              onPageChange={(newPage) => setPage(newPage)}
              loading={loading}
            />
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

            {/* If Admin Role is selected, show granular permissions selector */}
            {selectedRole === 'admin' && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.88rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛡️</span>
                  <span>{locale === 'ar' ? 'تحديد الصلاحيات الممنوحة لهذا المسؤول:' : 'Assign Specific Permissions for this Admin:'}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.75rem' }}>
                  {locale === 'ar'
                    ? 'سيتمكن هذا المسؤول من رؤية والتحكم فقط في الأقسام التي تختارها هنا عند تسجيل دخوله.'
                    : 'This admin will only see and manage the modules selected below upon login.'}
                </p>

                {/* Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                  {ADMIN_ROLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setRoleModalAdminModules([...preset.modules])}
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0B2A4A',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {locale === 'ar' ? preset.nameAr : preset.nameEn}
                    </button>
                  ))}
                </div>

                {/* Checkboxes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {ADMIN_MODULES.filter((m) => m.id !== 'overview' && m.id !== 'profile' && m.id !== 'notifications').map((m) => {
                    const checked = roleModalAdminModules.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          color: checked ? '#0B2A4A' : '#64748B',
                          fontWeight: checked ? 700 : 500,
                          backgroundColor: checked ? '#EFF6FF' : '#FFFFFF',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          border: checked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoleModalAdminModules([...roleModalAdminModules, m.id]);
                            } else {
                              setRoleModalAdminModules(roleModalAdminModules.filter((id) => id !== m.id));
                            }
                          }}
                          style={{ accentColor: '#0B2A4A', width: '16px', height: '16px' }}
                        />
                        <span>{m.icon}</span>
                        <span>{locale === 'ar' ? m.titleAr : m.titleEn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

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

      {/* Edit Permissions Only Modal for Admin */}
      {permissionsModalUser && (
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
              maxWidth: '560px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              direction: locale === 'ar' ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0B2A4A', fontWeight: 800 }}>
                  {locale === 'ar' ? 'تعديل صلاحيات المسؤول' : 'Edit Admin Permissions'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsModalUser(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {locale === 'ar' ? 'تحديد الأقسام المسموح بالوصول إليها للمسؤول:' : 'Set permitted dashboard modules for:'}{' '}
              <strong style={{ color: '#0B2A4A' }}>
                {permissionsModalUser.name || permissionsModalUser.email}
              </strong>
            </p>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {ADMIN_ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setEditingPermissions([...preset.modules])}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#0B2A4A',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {locale === 'ar' ? preset.nameAr : preset.nameEn}
                </button>
              ))}
            </div>

            {/* Module Checkboxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
              {ADMIN_MODULES.filter((m) => m.id !== 'overview' && m.id !== 'profile' && m.id !== 'notifications').map((m) => {
                const checked = editingPermissions.includes(m.id);
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: checked ? '#0B2A4A' : '#64748B',
                      fontWeight: checked ? 700 : 500,
                      backgroundColor: checked ? '#EFF6FF' : '#FFFFFF',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: checked ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingPermissions([...editingPermissions, m.id]);
                        } else {
                          setEditingPermissions(editingPermissions.filter((id) => id !== m.id));
                        }
                      }}
                      style={{ accentColor: '#0B2A4A', width: '16px', height: '16px' }}
                    />
                    <span>{m.icon}</span>
                    <span>{locale === 'ar' ? m.titleAr : m.titleEn}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPermissionsModalUser(null)}
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
                onClick={submitPermissionsChange}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0B2A4A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'حفظ الصلاحيات' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Admin Modal */}
      {createAdminModalOpen && (
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
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              direction: locale === 'ar' ? 'rtl' : 'ltr',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>➕</span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0B2A4A', fontWeight: 800 }}>
                  {locale === 'ar' ? 'إضافة مسؤول وتحديد صلاحياته' : 'Add Admin & Assign Permissions'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateAdminModalOpen(false);
                  setCreationStep('form');
                  setCreateModalError(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher: Existing User vs New User */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                backgroundColor: '#F1F5F9',
                padding: '4px',
                borderRadius: '10px',
                marginBottom: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('existing');
                  setCreateModalError(null);
                }}
                style={{
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.84rem',
                  fontWeight: adminModalTab === 'existing' ? 700 : 500,
                  color: adminModalTab === 'existing' ? '#0B2A4A' : '#64748B',
                  backgroundColor: adminModalTab === 'existing' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: adminModalTab === 'existing' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>👤</span>
                <span>{locale === 'ar' ? 'ترقية مستخدم مسجل (مفعّل)' : 'Promote Existing User'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminModalTab('new');
                  setCreateModalError(null);
                }}
                style={{
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.84rem',
                  fontWeight: adminModalTab === 'new' ? 700 : 500,
                  color: adminModalTab === 'new' ? '#0B2A4A' : '#64748B',
                  backgroundColor: adminModalTab === 'new' ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: adminModalTab === 'new' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>✨</span>
                <span>{locale === 'ar' ? 'إنشاء مسؤول جديد (مباشر)' : 'Create New Admin'}</span>
              </button>
            </div>

            {createModalError && (
              <div
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#FEE2E2',
                  color: '#B91C1C',
                  border: '1px solid #FCA5A5',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span style={{ flex: 1, lineHeight: 1.5 }}>{createModalError}</span>
              </div>
            )}

            {/* TAB 1: PROMOTE EXISTING USER */}
            {adminModalTab === 'existing' && (
              <div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                  {locale === 'ar'
                    ? 'اختر مستخدماً مسجلاً ومفعلاً بالفعل في النظام لمنحه صلاحيات الإشراف، ليتمكن فوراً من تسجيل الدخول والوصول للأقسام المحددة له دون الحاجة لخطوات تحقق إضافية.'
                    : 'Select an existing verified user to grant them admin privileges and scoped dashboard modules.'}
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '6px' }}>
                    {locale === 'ar' ? 'اختر المستخدم المراد ترقيته *' : 'Select User *'}
                  </label>
                  <select
                    value={selectedExistingUserId}
                    onChange={(e) => setSelectedExistingUserId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="">{locale === 'ar' ? '-- اختر مستخدماً من القائمة --' : '-- Choose a user --'}</option>
                    {users.map((u) => {
                      const isAdm =
                        u.role === 'admin' ||
                        u.role === 'super_admin' ||
                        u.roles?.some((r: any) => {
                          const roleName = typeof r === 'string' ? r : r?.name || r?.role?.name;
                          return roleName === 'admin' || roleName === 'super_admin';
                        });
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name || (locale === 'ar' ? 'مستخدم بدون اسم' : 'User')} — {u.email} ({isAdm ? (locale === 'ar' ? 'مسؤول حالي' : 'Current Admin') : (locale === 'ar' ? 'مستخدم عادي' : 'Regular User')}) {u.isVerified ? '✅' : '⏳'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Module Permissions Picker */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.88rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🛡️</span>
                    <span>{locale === 'ar' ? 'تحديد الصلاحيات الممنوحة له:' : 'Select Authorized Scope:'}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.75rem' }}>
                    {locale === 'ar' ? 'اختر دوراً جاهزاً أو قم بتحديد الأقسام يدوياً:' : 'Choose a role template or pick individual modules:'}
                  </p>

                  {/* Preset Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                    {ADMIN_ROLE_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedPresetId(preset.id);
                            setNewAdminModules([...preset.modules]);
                          }}
                          style={{
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.76rem',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #0B2A4A' : '1px solid #CBD5E1',
                            backgroundColor: isSelected ? '#0B2A4A' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#0B2A4A',
                            cursor: 'pointer',
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {locale === 'ar' ? preset.nameAr : preset.nameEn}
                        </button>
                      );
                    })}
                  </div>

                  {/* Granular Module Checkboxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.5rem' }}>
                    {ADMIN_MODULES.filter((m) => m.id !== 'overview' && m.id !== 'profile' && m.id !== 'notifications').map((m) => {
                      const checked = newAdminModules.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            color: checked ? '#0B2A4A' : '#64748B',
                            fontWeight: checked ? 700 : 500,
                            backgroundColor: checked ? '#EFF6FF' : '#FFFFFF',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            border: checked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedPresetId('custom');
                              if (e.target.checked) {
                                setNewAdminModules([...newAdminModules, m.id]);
                              } else {
                                setNewAdminModules(newAdminModules.filter((id) => id !== m.id));
                              }
                            }}
                            style={{ accentColor: '#0B2A4A', width: '16px', height: '16px' }}
                          />
                          <span>{m.icon}</span>
                          <span>{locale === 'ar' ? m.titleAr : m.titleEn}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setCreateAdminModalOpen(false)}
                    style={{
                      padding: '0.65rem 1.2rem',
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
                    disabled={!selectedExistingUserId || promotingUser || newAdminModules.length === 0}
                    onClick={handlePromoteExistingUser}
                    style={{
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: (!selectedExistingUserId || promotingUser || newAdminModules.length === 0) ? '#94A3B8' : '#0B2A4A',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      cursor: (!selectedExistingUserId || promotingUser || newAdminModules.length === 0) ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {promotingUser
                      ? (locale === 'ar' ? 'جاري الترقية...' : 'Promoting...')
                      : (locale === 'ar' ? 'ترقية المستخدم وتعيين الصلاحيات' : 'Promote & Assign')}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CREATE NEW ADMIN WITH OTP VERIFICATION */}
            {adminModalTab === 'new' && (
              <div>
                {creationStep === 'form' && (
                  <form onSubmit={handleCreateAdminSubmit}>
                    <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: '1.2rem', lineHeight: 1.5 }}>
                      {locale === 'ar'
                        ? 'إنشاء حساب مسؤول جديد، تحديد بيانات دخوله، وتعيين الصلاحيات المخصصة له ليتم تفعيله واعتماده فوراً في خطوة واحدة.'
                        : 'Register a new admin account with credentials and authorized modules. Activated directly in one step.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '4px' }}>
                          {locale === 'ar' ? 'الاسم الأول *' : 'First Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={newAdminFirstName}
                          onChange={(e) => setNewAdminFirstName(e.target.value)}
                          placeholder={locale === 'ar' ? 'مثال: أحمد' : 'e.g. Ahmed'}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '4px' }}>
                          {locale === 'ar' ? 'اسم العائلة' : 'Last Name'}
                        </label>
                        <input
                          type="text"
                          value={newAdminLastName}
                          onChange={(e) => setNewAdminLastName(e.target.value)}
                          placeholder={locale === 'ar' ? 'مثال: محمد' : 'e.g. Mohamed'}
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.85rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '4px' }}>
                        {locale === 'ar' ? 'البريد الإلكتروني للوصول *' : 'Email Address *'}
                      </label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin.inspect@dary.com"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A' }}>
                            {locale === 'ar' ? 'كلمة المرور *' : 'Password *'}
                          </label>
                          <button
                            type="button"
                            onClick={generateStrongPassword}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2F6BFF',
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                              fontWeight: 700,
                              padding: 0,
                            }}
                          >
                            {locale === 'ar' ? '🎲 توليد كلمة سر' : '🎲 Generate'}
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Admin@2026!"
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '2px' }}>
                          {locale === 'ar' ? '8 خانات على الأقل (حرف كبير، صغير، رقم، رمز)' : 'Min 8 chars (upper, lower, digit, symbol)'}
                        </span>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '4px' }}>
                          {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                        </label>
                        <input
                          type="tel"
                          value={newAdminPhone}
                          onChange={(e) => setNewAdminPhone(e.target.value)}
                          placeholder="+201012345678"
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '2px' }}>
                          {locale === 'ar' ? 'مثال: +201012345678 أو 01012345678' : 'e.g. +201012345678'}
                        </span>
                      </div>
                    </div>

                    {/* Module Permissions Picker */}
                    <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#0B2A4A', fontSize: '0.88rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🛡️</span>
                        <span>{locale === 'ar' ? 'تحديد الصلاحيات الممنوحة:' : 'Select Authorized Scope:'}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.75rem' }}>
                        {locale === 'ar' ? 'اختر دوراً جاهزاً أو قم بتحديد الأقسام يدوياً:' : 'Choose a role template or pick individual modules:'}
                      </p>

                      {/* Preset Chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
                        {ADMIN_ROLE_PRESETS.map((preset) => {
                          const isSelected = selectedPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setSelectedPresetId(preset.id);
                                setNewAdminModules([...preset.modules]);
                              }}
                              style={{
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.76rem',
                                borderRadius: '6px',
                                border: isSelected ? '1.5px solid #0B2A4A' : '1px solid #CBD5E1',
                                backgroundColor: isSelected ? '#0B2A4A' : '#FFFFFF',
                                color: isSelected ? '#FFFFFF' : '#0B2A4A',
                                cursor: 'pointer',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {locale === 'ar' ? preset.nameAr : preset.nameEn}
                            </button>
                          );
                        })}
                      </div>

                      {/* Granular Module Checkboxes */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '0.5rem' }}>
                        {ADMIN_MODULES.filter((m) => m.id !== 'overview' && m.id !== 'profile' && m.id !== 'notifications').map((m) => {
                          const checked = newAdminModules.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                color: checked ? '#0B2A4A' : '#64748B',
                                fontWeight: checked ? 700 : 500,
                                backgroundColor: checked ? '#EFF6FF' : '#FFFFFF',
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                border: checked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedPresetId('custom');
                                  if (e.target.checked) {
                                    setNewAdminModules([...newAdminModules, m.id]);
                                  } else {
                                    setNewAdminModules(newAdminModules.filter((id) => id !== m.id));
                                  }
                                }}
                                style={{ accentColor: '#0B2A4A', width: '16px', height: '16px' }}
                              />
                              <span>{m.icon}</span>
                              <span>{locale === 'ar' ? m.titleAr : m.titleEn}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setCreateAdminModalOpen(false)}
                        style={{
                          padding: '0.65rem 1.2rem',
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
                        type="submit"
                        disabled={creatingAdmin}
                        style={{
                          padding: '0.65rem 1.5rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#0B2A4A',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          cursor: creatingAdmin ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {creatingAdmin
                          ? (locale === 'ar' ? 'جاري التسجيل في قاعدة البيانات...' : 'Registering...')
                          : (locale === 'ar' ? 'حفظ ومتابعة تأكيد الـ OTP ⬅' : 'Save & Proceed to OTP ⬅')}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: ENTER OTP CODE */}
                {creationStep === 'otp' && (
                  <form onSubmit={handleVerifyOtpAndFinalize}>
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem',
                          margin: '0 auto 0.75rem auto',
                        }}
                      >
                        📩
                      </div>
                      <h4 style={{ margin: '0 0 0.4rem 0', color: '#0B2A4A', fontSize: '1.1rem', fontWeight: 800 }}>
                        {locale === 'ar' ? 'تأكيد كود التحقق (OTP)' : 'Enter OTP Code'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                        {locale === 'ar'
                          ? `تم تسجيل الحساب (${pendingRegisteredUser?.email}). أدخل الرمز المرسل لتفعيل الحساب كـ مسؤول فوراً.`
                          : `Account registered for (${pendingRegisteredUser?.email}). Enter OTP code to activate.`}
                      </p>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.8rem',
                        color: '#1E40AF',
                        marginBottom: '1.25rem',
                        lineHeight: 1.5,
                      }}
                    >
                      💡 <strong>{locale === 'ar' ? 'ملحوظة للمطور:' : 'Dev Tip:'}</strong>{' '}
                      {locale === 'ar'
                        ? 'كود الـ OTP يظهر في نافذة الـ Terminal الخاصة بالـ Backend. يمكنك إدخاله هنا أو الضغط على "تخطي التحقق الآن" لتفعيل الحساب مباشرة.'
                        : 'Check backend terminal for OTP code, or click "Skip OTP" to finalize directly.'}
                    </div>

                    <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0B2A4A', marginBottom: '8px' }}>
                        {locale === 'ar' ? 'كود التحقق المتكون من 6 أرقام' : '6-digit OTP Code'}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        autoFocus
                        style={{
                          width: '200px',
                          textAlign: 'center',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #0B2A4A',
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          letterSpacing: '6px',
                          fontFamily: 'monospace',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleSkipOtpAndFinalize}
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          border: '1px dashed #94A3B8',
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {locale === 'ar' ? 'تخطي التحقق الآن (مباشر) ⚡' : 'Skip OTP Verification ⚡'}
                      </button>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setCreationStep('form')}
                          style={{
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {locale === 'ar' ? 'رجوع للبيانات' : 'Back'}
                        </button>
                        <button
                          type="submit"
                          disabled={verifyingOtp || !otpCode.trim()}
                          style={{
                            padding: '0.65rem 1.4rem',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: (verifyingOtp || !otpCode.trim()) ? '#94A3B8' : '#0B2A4A',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            cursor: (verifyingOtp || !otpCode.trim()) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {verifyingOtp ? (locale === 'ar' ? 'جاري التحقق...' : 'Verifying...') : (locale === 'ar' ? 'تأكيد وتفعيل المسؤول ✅' : 'Verify & Activate ✅')}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credentials Created Success Modal */}
      {credentialsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 42, 74, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              direction: locale === 'ar' ? 'rtl' : 'ltr',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 1rem',
              }}
            >
              ✓
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', color: '#0B2A4A', fontWeight: 800 }}>
              {locale === 'ar' ? 'تم إنشاء حساب المسؤول بنجاح!' : 'Admin Account Created!'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: '1.25rem' }}>
              {locale === 'ar'
                ? 'يمكن للمسؤول الآن تسجيل الدخول مباشرة بهذه البيانات، وستظهر له لوحة التحكم بالأقسام المحددة فقط.'
                : 'The admin can now log in with these credentials and access their scoped dashboard.'}
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                padding: '1rem',
                textAlign: locale === 'ar' ? 'right' : 'left',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748B' }}>{locale === 'ar' ? 'المسؤول: ' : 'Admin: '}</span>
                <strong style={{ color: '#0B2A4A' }}>{credentialsModal.name}</strong>
              </div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748B' }}>{locale === 'ar' ? 'البريد الإلكتروني: ' : 'Email: '}</span>
                <strong style={{ color: '#0B2A4A', fontFamily: 'monospace' }}>{credentialsModal.email}</strong>
              </div>
              <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748B' }}>{locale === 'ar' ? 'كلمة المرور: ' : 'Password: '}</span>
                <strong style={{ color: '#0B2A4A', fontFamily: 'monospace' }}>{credentialsModal.password}</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '0.35rem' }}>
                {locale === 'ar' ? 'الصلاحيات الممنوحة:' : 'Assigned Modules:'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {credentialsModal.modules.map((mId) => {
                  const m = ADMIN_MODULES.find((item) => item.id === mId);
                  return (
                    <span
                      key={mId}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#EEF2FF',
                        color: '#3730A3',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {m?.icon} {locale === 'ar' ? m?.titleAr : m?.titleEn}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleCopyCredentials}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: copiedCredentials ? '#DCFCE7' : '#FFFFFF',
                  color: copiedCredentials ? '#15803D' : '#0B2A4A',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>{copiedCredentials ? '✓' : '📋'}</span>
                <span>{copiedCredentials ? (locale === 'ar' ? 'تم النسخ!' : 'Copied!') : (locale === 'ar' ? 'نسخ بيانات الدخول' : 'Copy Credentials')}</span>
              </button>
              <button
                type="button"
                onClick={() => setCredentialsModal(null)}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0B2A4A',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                {locale === 'ar' ? 'إغلاق ومتابعة' : 'Done'}
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
