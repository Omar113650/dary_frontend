import { useQuery, useMutation, useQueryClient, STALE_TIMES, QUERY_KEYS } from '../lib/queryClient';
import { OwnerService } from '../services/ownerService';
import { AdminService } from '../services/adminService';
import { TenantService } from '../services/tenantService';
import { propertyService } from '../services/propertyService';
import { NotificationService } from '../services/notificationService';

// ==========================================
// 1. OWNER DASHBOARD QUERIES & MUTATIONS
// ==========================================

/** Owner Properties Status: 30s cache */
export function useOwnerPropertiesStatus() {
  return useQuery({
    queryKey: [...QUERY_KEYS.owner.propertiesStatus],
    queryFn: () => OwnerService.getPropertiesStatus(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

/** Owner Properties List: 5m cache (Semi-static data) */
export function useOwnerMyProperties() {
  return useQuery({
    queryKey: [...QUERY_KEYS.owner.myProperties],
    queryFn: () => OwnerService.getMyProperties(),
    staleTime: STALE_TIMES.STATIC,
  });
}

/** Owner Bookings Status: 30s cache */
export function useOwnerBookingsStatus() {
  return useQuery({
    queryKey: [...QUERY_KEYS.owner.bookingsStatus],
    queryFn: () => OwnerService.getBookingsStatus(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

/** Owner Revenue Summary: 30s cache */
export function useOwnerRevenue() {
  return useQuery({
    queryKey: [...QUERY_KEYS.owner.revenue],
    queryFn: () => OwnerService.getRevenue(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

/** Owner Calendar Summary: 30s cache */
export function useOwnerCalendar(days?: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.owner.calendar(days)],
    queryFn: () => OwnerService.getCalendarSummary(days ? { days } : undefined),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

/** Owner Property Bookings: 30s cache */
export function useOwnerPropertyBookings(propId: string, enabled = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.owner.propertyBookings(propId)],
    queryFn: () => OwnerService.getPropertyBookings(propId),
    staleTime: STALE_TIMES.DASHBOARD,
    enabled: enabled && Boolean(propId),
  });
}

/** Mutation: Update Owner Booking Status with auto-invalidation */
export function useUpdateOwnerBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      status,
      note,
    }: {
      bookingId: string;
      status: string;
      note?: string;
    }) => OwnerService.updateBookingStatus(bookingId, status, note),
    onSuccess: () => {
      // Invalidate both bookings status, revenue, and property bookings
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.owner.bookingsStatus] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.owner.revenue] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'properties'] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'calendar'] });
    },
  });
}

// ==========================================
// 2. ADMIN DASHBOARD QUERIES
// ==========================================

export function useAdminUsersStatus() {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.usersStatus],
    queryFn: () => AdminService.getUsersStatus(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useAdminPropertiesStatus() {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.propertiesStatus],
    queryFn: () => AdminService.getPropertiesStatus(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useAdminBookingsStatus() {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.bookingsStatus],
    queryFn: () => AdminService.getBookingsStatus(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useAdminRevenue() {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.revenue],
    queryFn: () => AdminService.getBookingsRevenue(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useAdminReportsStatus() {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.reportsStatus],
    queryFn: () => AdminService.getReportsStatus(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useAdminAnalytics(range = '7d') {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.analytics(range)],
    queryFn: () => AdminService.getAnalytics(range),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

export function useAdminRecentReports(limit = 5) {
  return useQuery({
    queryKey: [...QUERY_KEYS.admin.recentReports(limit)],
    queryFn: async () => {
      const data = await AdminService.getReports({ limit });
      return Array.isArray(data) ? data : data?.items || [];
    },
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

// ==========================================
// 3. TENANT DASHBOARD QUERIES
// ==========================================

/** Tenant Rentals: 30s cache */
export function useTenantRentals() {
  return useQuery({
    queryKey: [...QUERY_KEYS.tenant.rentals],
    queryFn: () => TenantService.getRentals(),
    staleTime: STALE_TIMES.DASHBOARD,
  });
}

/** Tenant Favorites: 5m cache (Semi-static) */
export function useTenantFavorites() {
  return useQuery({
    queryKey: [...QUERY_KEYS.tenant.favorites],
    queryFn: () => TenantService.getFavorites(),
    staleTime: STALE_TIMES.STATIC,
  });
}

/** Tenant Saved Searches: 5m cache (Semi-static) */
export function useTenantSavedSearches() {
  return useQuery({
    queryKey: [...QUERY_KEYS.tenant.savedSearches],
    queryFn: () => TenantService.getSavedSearches(),
    staleTime: STALE_TIMES.STATIC,
  });
}

/** Featured Properties: 5m cache */
export function useFeaturedProperties(limit = 6) {
  return useQuery({
    queryKey: [...QUERY_KEYS.properties({ limit })],
    queryFn: () => propertyService.getProperties({ limit }),
    staleTime: STALE_TIMES.STATIC,
  });
}

// ==========================================
// 4. NOTIFICATIONS QUERIES & MUTATIONS
// ==========================================

function hasActiveAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('dary_logged_out') === 'true') return false;
  return Boolean(localStorage.getItem('dary_access_token') || localStorage.getItem('dary_user'));
}

/** Notifications list with 10s freshness and 15s auto-polling */
export function useNotifications(page = 1, limit = 50, params?: { isRead?: boolean | string; event?: string }) {
  return useQuery({
    queryKey: ['notifications', page, limit, params?.isRead, params?.event],
    queryFn: async () => {
      const res = await NotificationService.getNotifications({ page, limit, ...params });
      const items = Array.isArray(res) ? res : res?.items || [];
      // Attach meta and unreadCount as properties to the array for convenience
      (items as any).meta = res?.meta;
      (items as any).unreadCount = res?.unreadCount ?? 0;
      (items as any).total = res?.total ?? items.length;
      return items;
    },
    enabled: hasActiveAuthSession(),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000, // 15-second background polling for live updates
  });
}

/** Real-time Unread Notifications Count (polls every 15s across all roles) */
export function useUnreadNotificationsCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const res = await NotificationService.getNotifications({ page: 1, limit: 10 });
      return res?.unreadCount ?? 0;
    },
    enabled: hasActiveAuthSession(),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000, // 15-second background polling
  });
}

/** Mutation: Mark Notification Read with auto-invalidation */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Mutation: Mark All Notifications Read with auto-invalidation */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Mutation: Delete Single Notification by ID with auto-invalidation */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Mutation: Delete All Read Notifications with auto-invalidation */
export function useDeleteAllReadNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => NotificationService.deleteAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
