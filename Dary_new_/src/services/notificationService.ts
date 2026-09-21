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
  createdAt: string;
  [key: string]: any;
}

export class NotificationService {
  /**
   * 1. GET /notifications
   * Get Current User Notifications
   */
  static async getNotifications(params?: { page?: number; limit?: number }): Promise<{ items: NotificationItem[]; total?: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/notifications${queryStr}`);
    const data = res?.data?.notifications || res?.data?.items || res?.data?.data || res?.data || res;
    const items = Array.isArray(data) ? data : (data?.notifications || []);
    return {
      items,
      total: res?.data?.total || res?.data?.meta?.total || items.length,
    };
  }

  /**
   * 2. PATCH /notifications/read-all
   * Mark All Notifications As Read
   */
  static async markAllAsRead(): Promise<any> {
    const res = await ApiClient.patch<any>('/notifications/read-all');
    return res?.data || res;
  }

  /**
   * 3. PATCH /notifications/:id/read
   * Mark Notification As Read
   */
  static async markAsRead(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/notifications/${id}/read`);
    return res?.data || res;
  }

  /**
   * 4. DELETE /notifications/read
   * Delete All Read Notifications
   */
  static async deleteAllRead(): Promise<any> {
    const res = await ApiClient.delete<any>('/notifications/read');
    return res?.data || res;
  }

  /**
   * 5. DELETE /notifications/:id
   * Delete Single Notification
   */
  static async deleteNotification(id: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/notifications/${id}`);
    return res?.data || res;
  }
}
