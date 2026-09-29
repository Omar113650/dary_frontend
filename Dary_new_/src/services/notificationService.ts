import { ApiClient } from './apiClient';

export interface NotificationItem {
  id: string;
  userId: string;
  event: string;
  channel: string;
  title: string;
  body: string;
  payload?: any;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  isDelivered?: boolean;
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface NotificationMeta {
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetNotificationsResponse {
  items: NotificationItem[];
  data: NotificationItem[];
  meta: NotificationMeta;
  total: number;
  unreadCount: number;
}

export class NotificationService {
  /**
   * Helper to execute endpoint with fallback between plural and singular route (/notifications vs /notification)
   */
  private static async requestWithFallback<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: any;
      query?: URLSearchParams;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, query } = options;
    const queryStr = query && query.toString() ? `?${query.toString()}` : '';

    const primary = path.startsWith('/notifications') ? path : `/notifications${path}`;
    const secondary = primary.startsWith('/notifications')
      ? primary.replace('/notifications', '/notification')
      : primary.replace('/notification', '/notifications');

    try {
      if (method === 'POST') return await ApiClient.post<T>(`${primary}${queryStr}`, body);
      if (method === 'PATCH') return await ApiClient.patch<T>(`${primary}${queryStr}`, body);
      if (method === 'DELETE') return await ApiClient.delete<T>(`${primary}${queryStr}`);
      return await ApiClient.get<T>(`${primary}${queryStr}`);
    } catch (err: any) {
      if (err?.status === 404) {
        if (method === 'POST') return await ApiClient.post<T>(`${secondary}${queryStr}`, body);
        if (method === 'PATCH') return await ApiClient.patch<T>(`${secondary}${queryStr}`, body);
        if (method === 'DELETE') return await ApiClient.delete<T>(`${secondary}${queryStr}`);
        return await ApiClient.get<T>(`${secondary}${queryStr}`);
      }
      throw err;
    }
  }

  /**
   * 1. GET /notifications (or /notification)
   * Get Current User Notifications with pagination, read filter and event filter
   */
  static async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean | string;
    event?: string;
  }): Promise<GetNotificationsResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    const safeLimit = Math.min(params?.limit || 20, 50);
    query.append('limit', safeLimit.toString());
    if (params?.isRead !== undefined && params?.isRead !== null) {
      query.append('isRead', String(params.isRead));
    }
    if (params?.event) query.append('event', params.event);

    const res = await this.requestWithFallback<any>('', {
      method: 'GET',
      query,
    });

    const dataObj = res?.data || res;
    const list =
      (Array.isArray(dataObj?.data) ? dataObj.data : null) ||
      (Array.isArray(dataObj?.notifications) ? dataObj.notifications : null) ||
      (Array.isArray(dataObj?.items) ? dataObj.items : null) ||
      (Array.isArray(dataObj) ? dataObj : []);

    const meta = dataObj?.meta || {
      total: list.length,
      unreadCount: list.filter((n: any) => !n.isRead && !n.read).length,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: Math.max(1, Math.ceil(list.length / (params?.limit || 20))),
    };

    return {
      items: list,
      data: list,
      meta,
      total: meta.total ?? list.length,
      unreadCount: meta.unreadCount ?? list.filter((n: any) => !n.isRead && !n.read).length,
    };
  }

  /**
   * 2. PATCH /notifications/read-all (or /notification/read-all)
   * Mark All Notifications As Read for logged-in user
   */
  static async markAllAsRead(): Promise<{ success: boolean }> {
    const res = await this.requestWithFallback<any>('/read-all', {
      method: 'PATCH',
    });
    return res?.data || res || { success: true };
  }

  /**
   * 3. PATCH /notifications/:id/read (or /notification/:id/read)
   * Mark Single Notification As Read
   */
  static async markAsRead(id: string): Promise<NotificationItem> {
    const res = await this.requestWithFallback<any>(`/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
    return res?.data?.data || res?.data || res;
  }

  /**
   * 4. DELETE /notifications/read (or /notification/read)
   * Delete All Read Notifications for logged-in user
   */
  static async deleteAllRead(): Promise<{ success: boolean }> {
    const res = await this.requestWithFallback<any>('/read', {
      method: 'DELETE',
    });
    return res?.data || res || { success: true };
  }

  /**
   * 5. DELETE /notifications/:id (or /notification/:id)
   * Delete Single Notification by UUID
   */
  static async deleteNotification(id: string): Promise<{ success: boolean }> {
    const res = await this.requestWithFallback<any>(`/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res?.data || res || { success: true };
  }
}
