import { isUserSuperAdmin, extractUserRole } from '../context/AuthContext';

export type AdminModule =
  | 'overview'
  | 'properties'
  | 'tickets'
  | 'bookings'
  | 'reports'
  | 'reviews'
  | 'users'
  | 'analytics'
  | 'calendar'
  | 'notifications'
  | 'profile';

export interface AdminModuleConfig {
  id: AdminModule;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
  path: string;
  backendPermissions: string[];
}

export const ADMIN_MODULES: AdminModuleConfig[] = [
  {
    id: 'properties',
    titleAr: 'معاينة ومراجعة السكنات',
    titleEn: 'Property Inspection & Review',
    descriptionAr: 'معاينة العقارات الجديدة المعلقة، فحص الصور والمواصفات، واعتمادها أو رفضها أو إيقافها.',
    descriptionEn: 'Review pending properties, inspect photos, approve, reject, or suspend listings.',
    icon: '🏠',
    path: '/admin/properties',
    backendPermissions: [
      'property.read',
      'property.pending.read',
      'property.review',
      'property.suspend',
      'property.update',
      'dashboard.properties.read',
    ],
  },
  {
    id: 'tickets',
    titleAr: 'الدعم الفني وتذاكر المساعدة',
    titleEn: 'Support Tickets & Helpdesk',
    descriptionAr: 'استلام تذاكر الدعم والرد على استفسارات ومشكلات الطلاب والملاك وتغيير حالاتها.',
    descriptionEn: 'Handle student & owner support tickets, reply to inquiries, and resolve issues.',
    icon: '💬',
    path: '/admin/tickets',
    backendPermissions: [
      'support_ticket.read',
      'support_ticket.assign_admin',
      'support_ticket.status.update',
      'support_ticket.message.create',
    ],
  },
  {
    id: 'bookings',
    titleAr: 'الحجوزات والعقود الرقمية',
    titleEn: 'Bookings & Contracts',
    descriptionAr: 'متابعة طلبات الحجز، تعيين المشرفين، وإدارة واعتماد العقود الإلكترونية.',
    descriptionEn: 'Track booking requests, assign admins, manage and activate digital rental contracts.',
    icon: '📋',
    path: '/admin/bookings',
    backendPermissions: [
      'booking.read',
      'booking.assign_admin',
      'booking.status.update',
      'dashboard.bookings.read',
      'dashboard.bookings.revenue.read',
      'contract.create',
      'contract.read',
      'contract.read_all',
      'contract.activate',
      'contract.cancel',
    ],
  },
  {
    id: 'reports',
    titleAr: 'البلاغات والشكاوى',
    titleEn: 'Reports & Complaints',
    descriptionAr: 'متابعة بلاغات المستخدمين ضد العقارات الوهمية والمخالفات وتحديد أولوياتها وحلها.',
    descriptionEn: 'Review reported properties and user violations, set priorities, and resolve complaints.',
    icon: '⚠️',
    path: '/admin/reports',
    backendPermissions: [
      'report.read',
      'report.priority.update',
      'report.resolve',
      'dashboard.reports.read',
    ],
  },
  {
    id: 'reviews',
    titleAr: 'التقييمات والمراجعات',
    titleEn: 'Reviews Moderation',
    descriptionAr: 'مراجعة واعتماد تقييمات الطلاب وتجاربهم مع السكنات والملاك.',
    descriptionEn: 'Review, moderate, and approve student ratings and reviews.',
    icon: '⭐',
    path: '/admin/reviews',
    backendPermissions: [
      'review.read',
      'review.read_pending',
      'review.moderate',
    ],
  },
  {
    id: 'users',
    titleAr: 'المستخدمين والصلاحيات',
    titleEn: 'User Management & Roles',
    descriptionAr: 'إدارة حسابات الطلاب والملاك والمشرفين، تفعيل/تعطيل الحسابات، وتعيين الأدوار.',
    descriptionEn: 'Manage tenant, owner, and admin accounts, activate/deactivate, and assign roles.',
    icon: '👥',
    path: '/admin/users',
    backendPermissions: [
      'user.read',
      'user.deactivate',
      'user.reactivate',
      'user.delete',
      'dashboard.users.read',
      'role.assign',
      'role.remove',
    ],
  },
  {
    id: 'analytics',
    titleAr: 'التحليلات ومؤشرات الأداء',
    titleEn: 'Platform Analytics & Revenue',
    descriptionAr: 'متابعة الرسوم البيانية، نسب الإشغال، الإيرادات المالية، ونمو المستخدمين.',
    descriptionEn: 'View platform growth metrics, revenue, occupancy rates, and analytics.',
    icon: '📊',
    path: '/admin/analytics',
    backendPermissions: [
      'dashboard.analytics.read',
      'dashboard.bookings.revenue.read',
    ],
  },
  {
    id: 'calendar',
    titleAr: 'تقويم الإشغال والتسكين',
    titleEn: 'Occupancy Calendar',
    descriptionAr: 'استعراض مواعيد وصول ومغادرة الطلاب عبر كافة العقارات.',
    descriptionEn: 'Overview of student check-in and checkout schedules across all properties.',
    icon: '🗓️',
    path: '/admin/calendar',
    backendPermissions: [
      'booking.read',
      'property.read',
    ],
  },
];

export interface AdminRolePreset {
  id: string;
  nameAr: string;
  nameEn: string;
  modules: AdminModule[];
  badgeColor: string;
}

export const ADMIN_ROLE_PRESETS: AdminRolePreset[] = [
  {
    id: 'INSPECTOR',
    nameAr: 'مشرف معاينة واعتماد سكنات',
    nameEn: 'Property Inspection Specialist',
    modules: ['properties'],
    badgeColor: '#16A34A',
  },
  {
    id: 'SUPPORT',
    nameAr: 'مشرف دعم فني وخدمة عملاء',
    nameEn: 'Customer Support Specialist',
    modules: ['tickets'],
    badgeColor: '#0284C7',
  },
  {
    id: 'BOOKINGS',
    nameAr: 'مشرف حجوزات وعقود',
    nameEn: 'Bookings & Contracts Admin',
    modules: ['bookings', 'calendar'],
    badgeColor: '#9333EA',
  },
  {
    id: 'MODERATOR',
    nameAr: 'مشرف محتوى وبلاغات وتقييمات',
    nameEn: 'Content & Trust Moderator',
    modules: ['reports', 'reviews'],
    badgeColor: '#D97706',
  },
  {
    id: 'FULL',
    nameAr: 'مدير نظام كامل الصلاحيات',
    nameEn: 'Full Administrator',
    modules: ['properties', 'tickets', 'bookings', 'reports', 'reviews', 'users', 'analytics', 'calendar'],
    badgeColor: '#0B2A4A',
  },
];

/**
 * Persists admin modules assignment in local storage mapped by both userId and email
 */
export function saveAdminPermissions(userId: string, email: string, modules: AdminModule[]): void {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.stringify(modules);
    if (userId) {
      localStorage.setItem(`dary_admin_modules_${userId}`, data);
    }
    if (email) {
      localStorage.setItem(`dary_admin_modules_${email.trim().toLowerCase()}`, data);
    }
  } catch (err) {
    console.warn('[saveAdminPermissions] Local storage write error:', err);
  }
}

/**
 * Retrieves the assigned modules for an admin user by checking:
 * 1) User object properties (assignedModules, permissions)
 * 2) Local storage mapped by user ID
 * 3) Local storage mapped by user email
 */
export function getAdminAssignedModules(user: any): AdminModule[] {
  if (!user) return [];

  // Super admins have access to all modules
  if (isUserSuperAdmin(user)) {
    return [
      'overview',
      'properties',
      'tickets',
      'bookings',
      'reports',
      'reviews',
      'users',
      'analytics',
      'calendar',
      'notifications',
      'profile',
    ];
  }

  // 1. Check user payload directly
  if (Array.isArray(user.assignedModules) && user.assignedModules.length > 0) {
    return user.assignedModules;
  }
  if (Array.isArray(user.modules) && user.modules.length > 0) {
    return user.modules;
  }

  // 2. Check if user has granular permissions array from backend JWT/API
  const permissions: string[] = Array.isArray(user.permissions)
    ? user.permissions
    : Array.isArray(user.role?.permissions)
    ? user.role.permissions.map((p: any) => (typeof p === 'string' ? p : p?.name))
    : [];

  if (permissions.length > 0) {
    if (permissions.includes('*')) {
      return [
        'overview',
        'properties',
        'tickets',
        'bookings',
        'reports',
        'reviews',
        'users',
        'analytics',
        'calendar',
        'notifications',
        'profile',
      ];
    }

    const matchedModules = new Set<AdminModule>(['overview', 'profile', 'notifications']);
    for (const mod of ADMIN_MODULES) {
      const hasPerm = mod.backendPermissions.some((bp) => permissions.includes(bp));
      if (hasPerm) {
        matchedModules.add(mod.id);
      }
    }
    if (matchedModules.size > 3) {
      return Array.from(matchedModules);
    }
  }

  // 3. Check localStorage by ID or Email
  if (typeof window !== 'undefined') {
    try {
      if (user.id) {
        const stored = localStorage.getItem(`dary_admin_modules_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
      if (user.email) {
        const stored = localStorage.getItem(`dary_admin_modules_${user.email.trim().toLowerCase()}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
  }

  // Fallback: If user is an admin without specific module restriction, grant standard admin modules
  const role = extractUserRole(user);
  if (role === 'admin') {
    return ['overview', 'properties', 'tickets', 'bookings', 'reports', 'reviews', 'calendar', 'notifications', 'profile'];
  }

  return [];
}

/**
 * Checks if an authenticated user has access to a specific admin module
 */
export function hasAdminModuleAccess(user: any, module: AdminModule): boolean {
  if (!user) return false;

  // Super admin always has 100% full access
  if (isUserSuperAdmin(user)) return true;

  // Overview, Profile, and Notifications are accessible to any authorized admin
  if (module === 'overview' || module === 'profile' || module === 'notifications') {
    const role = extractUserRole(user);
    return role === 'admin' || role === 'super_admin';
  }

  const assigned = getAdminAssignedModules(user);
  return assigned.includes(module);
}

/**
 * Returns the primary entry path for an admin based on their assigned permissions
 */
export function getFirstAllowedAdminPath(user: any): string {
  if (!user || isUserSuperAdmin(user)) return '/admin';

  const assigned = getAdminAssignedModules(user);

  // If they have overview, stay on overview
  if (assigned.includes('overview') && assigned.length > 4) return '/admin';

  // Otherwise, route directly to their primary functional module!
  if (assigned.includes('properties')) return '/admin/properties';
  if (assigned.includes('tickets')) return '/admin/tickets';
  if (assigned.includes('bookings')) return '/admin/bookings';
  if (assigned.includes('reports')) return '/admin/reports';
  if (assigned.includes('reviews')) return '/admin/reviews';
  if (assigned.includes('users')) return '/admin/users';
  if (assigned.includes('analytics')) return '/admin/analytics';
  if (assigned.includes('calendar')) return '/admin/calendar';

  return '/admin';
}
