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

const DELETED_NOTIFS_STORAGE_KEY = 'dary_deleted_notif_ids';
const READ_NOTIFS_STORAGE_KEY = 'dary_read_notif_ids';
const MARK_ALL_READ_TS_KEY = 'dary_mark_all_read_ts';

function getStoredIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredIdSet(key: string, set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(set).slice(-500);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    // ignore storage errors
  }
}

export class NotificationService {
  static markLocalDeleted(ids: string[]) {
    const set = getStoredIdSet(DELETED_NOTIFS_STORAGE_KEY);
    ids.forEach((id) => {
      if (id) set.add(String(id));
    });
    saveStoredIdSet(DELETED_NOTIFS_STORAGE_KEY, set);
  }

  static markLocalRead(ids: string[]) {
    const set = getStoredIdSet(READ_NOTIFS_STORAGE_KEY);
    ids.forEach((id) => {
      if (id) set.add(String(id));
    });
    saveStoredIdSet(READ_NOTIFS_STORAGE_KEY, set);
  }

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
    const safeLimit = Math.min(params?.limit || 50, 50);
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
    const rawList: any[] =
      (Array.isArray(dataObj?.data) ? dataObj.data : null) ||
      (Array.isArray(dataObj?.notifications) ? dataObj.notifications : null) ||
      (Array.isArray(dataObj?.items) ? dataObj.items : null) ||
      (Array.isArray(dataObj) ? dataObj : []);

    const deletedIds = getStoredIdSet(DELETED_NOTIFS_STORAGE_KEY);
    const readIds = getStoredIdSet(READ_NOTIFS_STORAGE_KEY);
    const markAllReadTs =
      typeof window !== 'undefined' ? Number(localStorage.getItem(MARK_ALL_READ_TS_KEY) || 0) : 0;

    // Filter out locally deleted items and apply local read status
    const list: NotificationItem[] = rawList
      .filter((n: any) => {
        const id = String(n?.id || n?._id || '');
        return id && !deletedIds.has(id);
      })
      .map((n: any) => {
        const id = String(n?.id || n?._id || '');
        const createdTs = n?.createdAt ? new Date(n.createdAt).getTime() : 0;
        const locallyRead =
          readIds.has(id) || (markAllReadTs > 0 && createdTs > 0 && createdTs <= markAllReadTs);
        const isRead = Boolean(n?.isRead || n?.read || locallyRead);
        return {
          ...n,
          id,
          isRead,
          read: isRead,
        };
      });

    const actualUnreadInList = list.filter((n: any) => !n.isRead && !n.read).length;

    const rawMeta = dataObj?.meta || res?.meta || {};
    // Always trust the actual unread count in the filtered list when all notifications fit in the page (or if backend meta is stale/higher)
    const accurateUnreadCount =
      rawList.length < safeLimit
        ? actualUnreadInList
        : rawMeta.unreadCount !== undefined
        ? Math.min(Number(rawMeta.unreadCount), actualUnreadInList)
        : actualUnreadInList;

    const accurateTotal =
      rawList.length < safeLimit
        ? list.length
        : Math.max(list.length, (Number(rawMeta.total) || list.length) - deletedIds.size);

    const meta: NotificationMeta = {
      total: accurateTotal,
      unreadCount: accurateUnreadCount,
      page: params?.page || 1,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(accurateTotal / safeLimit)),
    };

    return {
      items: list,
      data: list,
      meta,
      total: accurateTotal,
      unreadCount: accurateUnreadCount,
    };
  }

  /**
   * 2. PATCH /notifications/read-all (or /notification/read-all)
   * Mark All Notifications As Read for logged-in user
   */
  static async markAllAsRead(): Promise<{ success: boolean }> {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MARK_ALL_READ_TS_KEY, String(Date.now()));
      } catch {}
    }
    try {
      const res = await this.requestWithFallback<any>('/read-all', {
        method: 'PATCH',
      });
      return res?.data || res || { success: true };
    } catch {
      return { success: true };
    }
  }

  /**
   * 3. PATCH /notifications/:id/read (or /notification/:id/read)
   * Mark Single Notification As Read
   */
  static async markAsRead(id: string): Promise<NotificationItem> {
    this.markLocalRead([id]);
    const res = await this.requestWithFallback<any>(`/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
    return res?.data?.data || res?.data || res;
  }

  /**
   * 4. DELETE /notifications/read (or /notification/read)
   * Delete All Read Notifications for logged-in user
   */
  static async deleteAllRead(readIdsToTrack?: string[]): Promise<{ success: boolean }> {
    if (readIdsToTrack && readIdsToTrack.length > 0) {
      this.markLocalDeleted(readIdsToTrack);
    }
    try {
      const res = await this.requestWithFallback<any>('/read', {
        method: 'DELETE',
      });
      return res?.data || res || { success: true };
    } catch {
      return { success: true };
    }
  }

  /**
   * 5. DELETE /notifications/:id (or /notification/:id)
   * Delete Single Notification by UUID
   */
  static async deleteNotification(id: string): Promise<{ success: boolean }> {
    this.markLocalRead([id]);
    this.markLocalDeleted([id]);
    // Also mark as read on backend before/during delete so backend unreadCount cache is decremented even if DELETE doesn't decrement it
    await this.requestWithFallback<any>(`/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    }).catch(() => null);

    try {
      const res = await this.requestWithFallback<any>(`/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res?.data || res || { success: true };
    } catch {
      return { success: true };
    }
  }

  /**
   * 6. Delete All Notifications (both read and unread)
   */
  static async deleteAllNotifications(allIds: string[]): Promise<{ success: boolean }> {
    if (allIds.length > 0) {
      this.markLocalRead(allIds);
      this.markLocalDeleted(allIds);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MARK_ALL_READ_TS_KEY, String(Date.now()));
      } catch {}
    }
    await this.markAllAsRead().catch(() => null);
    await this.deleteAllRead(allIds).catch(() => null);
    await Promise.allSettled(
      allIds.slice(0, 25).map((id) =>
        this.requestWithFallback<any>(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
      )
    );
    return { success: true };
  }
}

