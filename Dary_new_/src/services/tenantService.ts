import { ApiClient } from './apiClient';
import type { NotificationItem } from './notificationService';
import type { SupportTicketItem, TicketMessageItem } from './supportTicketService';

export interface RentalBooking {
  id: string;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED' | 'CANCELLED' | string;
  bedsRequested?: number;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  contactedAt?: string | null;
  note?: string | null;
  property?: {
    id: string;
    title?: string;
    address?: string;
    city?: string;
    price?: number;
    currency?: string;
    images?: Array<{ url?: string; isPrimary?: boolean } | string>;
    primaryImage?: string;
    [key: string]: any;
  };
  room?: {
    id: string;
    roomType?: string;
    roomNumber?: string;
    price?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface FavoriteItem {
  id?: string;
  userId?: string;
  propertyId?: string;
  createdAt?: string;
  property?: any;
  [key: string]: any;
}

export interface RecentlyViewedItem {
  id?: string;
  userId?: string;
  propertyId?: string;
  viewedAt?: string;
  createdAt?: string;
  property?: any;
  [key: string]: any;
}

export interface SavedSearchItem {
  id: string;
  name?: string;
  city?: string;
  governorate?: string;
  propertyType?: string;
  propertyClass?: string;
  targetTenantType?: string;
  genderAllowed?: string;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  createdAt?: string;
  [key: string]: any;
}

export class TenantService {
  // ==========================================
  // RENTALS (GET /dashboard/rentals & /booking/my fallback)
  // ==========================================
  static async getRentals(): Promise<RentalBooking[]> {
    const combinedMap = new Map<string, RentalBooking>();

    const extractList = (res: any): any[] => {
      const candidate =
        (Array.isArray(res?.data?.bookings) ? res.data.bookings : null) ||
        (Array.isArray(res?.data?.rentals) ? res.data.rentals : null) ||
        (Array.isArray(res?.data?.data) ? res.data.data : null) ||
        (Array.isArray(res?.data?.items) ? res.data.items : null) ||
        (Array.isArray(res?.data) ? res.data : null) ||
        (Array.isArray(res?.bookings) ? res.bookings : null) ||
        (Array.isArray(res?.rentals) ? res.rentals : null) ||
        (Array.isArray(res?.items) ? res.items : null) ||
        (Array.isArray(res) ? res : null);
      return Array.isArray(candidate) ? candidate : [];
    };

    // 1. Fetch from /booking/my (Primary database source for authenticated tenant bookings)
    try {
      const resMy = await ApiClient.get<any>('/booking/my');
      const listMy = extractList(resMy);
      for (const item of listMy) {
        if (item?.id) {
          combinedMap.set(item.id, item);
        }
      }
    } catch (e) {
      console.warn('[TenantService] /booking/my failed:', e);
    }

    // 2. Fetch from /dashboard/rentals (Dashboard aggregated rentals)
    try {
      const resDash = await ApiClient.get<any>('/dashboard/rentals');
      const listDash = extractList(resDash);
      for (const item of listDash) {
        if (item?.id) {
          const existing = combinedMap.get(item.id);
          // If already in map from /booking/my, merge any extra properties from /dashboard/rentals
          combinedMap.set(item.id, { ...item, ...existing });
        }
      }
    } catch (e) {
      console.warn('[TenantService] /dashboard/rentals failed:', e);
    }

    // 3. Fallback: If still empty, check /booking endpoint
    if (combinedMap.size === 0) {
      try {
        const resBk = await ApiClient.get<any>('/booking');
        const listBk = extractList(resBk);
        for (const item of listBk) {
          if (item?.id) combinedMap.set(item.id, item);
        }
      } catch (e) {
        // Ignored
      }
    }

    const result = Array.from(combinedMap.values());
    result.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }

  /**
   * Cancels a tenant booking with a mandatory note.
   */
  static async cancelBooking(bookingId: string, note?: string): Promise<any> {
    try {
      return await ApiClient.patch(`/booking/${bookingId}/cancel`, { note });
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        return await ApiClient.patch(`/bookings/${bookingId}/cancel`, { note });
      }
      throw e;
    }
  }

  /**
   * Fetches single booking details by ID
   */
  static async getBookingById(bookingId: string): Promise<RentalBooking | null> {
    try {
      const res = await ApiClient.get<any>(`/booking/${bookingId}`);
      return res?.data?.booking || res?.data || res?.booking || res || null;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        try {
          const res = await ApiClient.get<any>(`/bookings/${bookingId}`);
          return res?.data?.booking || res?.data || res?.booking || res || null;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  // ==========================================
  // FAVORITES
  // ==========================================
  static async getFavorites(): Promise<FavoriteItem[]> {
    const res = await ApiClient.get<any>('/favorites');
    const data =
      (Array.isArray(res?.data) ? res.data : null) ||
      (Array.isArray(res?.data?.favorites) ? res.data.favorites : null) ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      (Array.isArray(res?.favorites) ? res.favorites : null) ||
      (Array.isArray(res) ? res : []);
    return Array.isArray(data) ? data : [];
  }

  static async addFavorite(propertyId: string): Promise<any> {
    return ApiClient.post(`/favorites/${propertyId}`);
  }

  static async removeFavorite(propertyId: string): Promise<any> {
    return ApiClient.delete(`/favorites/${propertyId}`);
  }

  // ==========================================
  // RECENTLY VIEWED
  // ==========================================
  static async getRecentlyViewed(): Promise<RecentlyViewedItem[]> {
    const res = await ApiClient.get<any>('/dashboard/recently-viewed');
    const data =
      (Array.isArray(res?.data) ? res.data : null) ||
      (Array.isArray(res?.data?.recentlyViewed) ? res.data.recentlyViewed : null) ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      (Array.isArray(res?.recentlyViewed) ? res.recentlyViewed : null) ||
      (Array.isArray(res) ? res : []);
    return Array.isArray(data) ? data : [];
  }

  static async removeRecentlyViewed(propertyId: string): Promise<any> {
    return ApiClient.delete(`/dashboard/recently-viewed/${propertyId}`);
  }

  /**
   * Records that the authenticated user viewed a property.
   * POST /dashboard/recently-viewed/:propertyId
   */
  static async recordRecentlyViewed(propertyId: string): Promise<any> {
    return ApiClient.post(`/dashboard/recently-viewed/${propertyId}`);
  }

  static async clearRecentlyViewed(): Promise<any> {
    return ApiClient.delete('/dashboard/recently-viewed');
  }

  // ==========================================
  // BOOKING REQUEST
  // ==========================================
  /**
   * Creates a new booking/contact request for a property.
   * POST /booking with { propertyId, roomId, startDate, endDate, bedsRequested, note }
   */
  static async createBooking(propertyId: string, payload?: Record<string, any>): Promise<any> {
    try {
      const res = await ApiClient.post<any>('/booking', { propertyId, ...payload });
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.post<any>('/bookings', { propertyId, ...payload });
        return res?.data || res;
      }
      throw e;
    }
  }

  // ==========================================
  // SAVED SEARCHES
  // ==========================================
  static async getSavedSearches(): Promise<SavedSearchItem[]> {
    const res = await ApiClient.get<any>('/saved-searches');
    const data =
      (Array.isArray(res?.data) ? res.data : null) ||
      (Array.isArray(res?.data?.savedSearches) ? res.data.savedSearches : null) ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      (Array.isArray(res?.savedSearches) ? res.savedSearches : null) ||
      (Array.isArray(res) ? res : []);
    return Array.isArray(data) ? data : [];
  }

  static async getSavedSearchById(id: string): Promise<any> {
    return ApiClient.get<any>(`/saved-searches/${id}`);
  }

  static async createSavedSearch(payload: Record<string, any>): Promise<any> {
    return ApiClient.post('/saved-searches', payload);
  }

  static async updateSavedSearch(id: string, payload: Record<string, any>): Promise<any> {
    return ApiClient.put(`/saved-searches/${id}`, payload);
  }

  static async deleteSavedSearch(id: string): Promise<any> {
    return ApiClient.delete(`/saved-searches/${id}`);
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  static async getNotifications(page = 1, limit = 20): Promise<{ items: NotificationItem[]; total?: number }> {
    const res = await ApiClient.get<any>(`/notifications?page=${page}&limit=${limit}`);
    const raw =
      (Array.isArray(res?.data) ? res.data : null) ||
      (Array.isArray(res?.data?.notifications) ? res.data.notifications : null) ||
      (Array.isArray(res?.data?.items) ? res.data.items : null) ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      (Array.isArray(res?.notifications) ? res.notifications : null) ||
      (Array.isArray(res) ? res : []);
    const items = Array.isArray(raw) ? raw : [];
    return {
      items,
      total: res?.data?.total || res?.data?.meta?.total || items.length,
    };
  }

  static async markNotificationAsRead(id: string): Promise<any> {
    return ApiClient.patch(`/notifications/${id}/read`);
  }

  static async markAllNotificationsAsRead(): Promise<any> {
    return ApiClient.patch('/notifications/read-all');
  }

  // ==========================================
  // SUPPORT TICKETS
  // ==========================================
  static async getMyTickets(): Promise<SupportTicketItem[]> {
    const res = await ApiClient.get<any>('/support-ticket/my');
    const data = res?.data?.tickets || res?.data?.data || res?.data || res?.tickets || res;
    return Array.isArray(data) ? data : [];
  }

  static async createTicket(payload: { category: string; subject: string; description: string }): Promise<any> {
    return ApiClient.post('/support-ticket', payload);
  }

  /**
   * Confirmed endpoint: GET /support-ticket/{id}/messages
   */
  static async getTicketMessages(ticketId: string): Promise<TicketMessageItem[]> {
    const res = await ApiClient.get<any>(`/support-ticket/${ticketId}`);
    const data = res?.data?.ticket?.messages || res?.data?.messages || res?.data || res;
    return Array.isArray(data) ? data : [];
  }

  /**
   * POST /support-ticket/:id/messages
   */
  static async sendTicketMessage(ticketId: string, message: string, attachments?: File[]): Promise<any> {
    const formData = new FormData();
    if (message) formData.append('message', message);
    if (attachments && attachments.length > 0) {
      attachments.forEach((file) => formData.append('attachments', file));
    }
    return ApiClient.post(`/support-ticket/${ticketId}/messages`, formData);
  }
}
