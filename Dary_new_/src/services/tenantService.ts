import { ApiClient } from './apiClient';

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

export interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  content?: string;
  isRead?: boolean;
  read?: boolean;
  channel?: string;
  event?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SupportTicketItem {
  id: string;
  category?: string;
  subject?: string;
  description?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ARCHIVED' | 'CLOSED' | string;
  createdAt?: string;
  updatedAt?: string;
  messages?: any[];
  [key: string]: any;
}

export interface TicketMessageItem {
  id: string;
  ticketId?: string;
  senderId?: string;
  senderRole?: string;
  senderName?: string;
  message?: string;
  content?: string;
  createdAt?: string;
  attachments?: any[];
  [key: string]: any;
}

export class TenantService {
  // ==========================================
  // RENTALS (GET /dashboard/rentals & /booking/my fallback)
  // ==========================================
  static async getRentals(): Promise<RentalBooking[]> {
    try {
      const res = await ApiClient.get<any>('/dashboard/rentals');
      const list =
        (Array.isArray(res?.data) ? res.data : null) ||
        (Array.isArray(res?.data?.data) ? res.data.data : null) ||
        (Array.isArray(res?.data?.rentals) ? res.data.rentals : null) ||
        (Array.isArray(res?.data?.bookings) ? res.data.bookings : null) ||
        (Array.isArray(res?.rentals) ? res.rentals : null) ||
        (Array.isArray(res?.bookings) ? res.bookings : null) ||
        (Array.isArray(res) ? res : null);
      if (Array.isArray(list)) return list;
    } catch (e) {
      console.warn('[TenantService] /dashboard/rentals failed, attempting /booking/my fallback:', e);
    }
    try {
      const res2 = await ApiClient.get<any>('/booking/my');
      const list2 =
        (Array.isArray(res2?.data) ? res2.data : null) ||
        (Array.isArray(res2?.data?.data) ? res2.data.data : null) ||
        (Array.isArray(res2?.data?.bookings) ? res2.data.bookings : null) ||
        (Array.isArray(res2?.bookings) ? res2.bookings : null) ||
        (Array.isArray(res2) ? res2 : null);
      if (Array.isArray(list2)) return list2;
    } catch (e) {
      console.warn('[TenantService] /booking/my fallback failed:', e);
    }
    return [];
  }

  /**
   * Cancels a tenant booking with a mandatory note.
   */
  static async cancelBooking(bookingId: string, note: string): Promise<any> {
    return ApiClient.patch(`/booking/${bookingId}/cancel`, { note });
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
    return ApiClient.post('/booking', { propertyId, ...payload });
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
