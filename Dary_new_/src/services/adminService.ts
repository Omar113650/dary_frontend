import { ApiClient } from './apiClient';

export interface AdminStatusCount {
  status: string;
  count: number;
  [key: string]: any;
}

export interface AdminAnalyticsMetrics {
  userGrowth?: number;
  bookingVolume?: number;
  revenueMetrics?: any;
  occupancyRate?: number;
  dailyActiveUsers?: number;
  period?: string;
  [key: string]: any;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  roles?: Array<string | { name?: string; role?: { name?: string } }>;
  userRoles?: Array<{ name?: string; role?: { name?: string } }>;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;
  isVerified?: boolean;
  emailVerified?: boolean;
  phone?: string;
  createdAt?: string;
  lastLogin?: string;
  [key: string]: any;
}

export interface AdminPropertyItem {
  id: string;
  title: string;
  description?: string;
  address?: string;
  city?: string;
  governorate?: string;
  propertyType?: string;
  propertyClass?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED' | string;
  isAvailable?: boolean;
  price?: number;
  currency?: string;
  owner?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  ownerId?: string;
  images?: Array<{ url?: string; isPrimary?: boolean } | string>;
  createdAt?: string;
  [key: string]: any;
}

export interface AdminBookingItem {
  id: string;
  propertyId: string;
  property?: {
    id?: string;
    title?: string;
    address?: string;
    city?: string;
  };
  roomId?: string;
  room?: {
    id?: string;
    roomNumber?: string;
    type?: string;
  };
  tenantId?: string;
  tenant?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  ownerId?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CONTACTED' | 'CLOSED' | 'CANCELLED' | string;
  bedsRequested?: number;
  startDate?: string;
  endDate?: string;
  totalPrice?: number;
  createdAt?: string;
  [key: string]: any;
}

export interface AdminReportItem {
  id: string;
  title?: string;
  description?: string;
  reason?: string;
  targetType?: 'PROPERTY' | 'USER' | 'BOOKING' | 'SYSTEM' | string;
  targetId?: string;
  reportedBy?: {
    id?: string;
    name?: string;
    email?: string;
  };
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status?: 'PENDING' | 'IN_REVIEW' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' | string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface AdminCalendarBookingEvent {
  id?: string;
  bookingId?: string;
  propertyId?: string;
  propertyTitle?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  tenantName?: string;
  [key: string]: any;
}

export class AdminService {
  /**
   * GET /dashboard/reports/status
   */
  static async getReportsStatus(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/reports/status');
    return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/reports
   */
  static async getReports(params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/reports${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * PATCH /report/:id/priority
   */
  static async updateReportPriority(id: string, priority: 'low' | 'medium' | 'high' | 'urgent' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string): Promise<any> {
    const norm = priority.toLowerCase() === 'urgent' ? 'high' : priority.toLowerCase();
    const res = await ApiClient.patch<any>(`/report/${id}/priority`, { priority: norm });
    return res?.data || res;
  }

  /**
   * PATCH /report/:id/resolve
   */
  static async resolveReport(id: string, resolutionNotes?: string): Promise<any> {
    const notes = resolutionNotes && resolutionNotes.trim().length > 0 ? resolutionNotes.trim() : 'تمت المراجعة والتسوية بنجاح';
    const res = await ApiClient.patch<any>(`/report/${id}/resolve`, { resolutionNotes: notes });
    return res?.data || res;
  }

  /**
   * GET /dashboard/analytics?range=7d
   */
  static async getAnalytics(range: string = '7d'): Promise<any> {
    const res = await ApiClient.get<any>(`/dashboard/analytics?range=${encodeURIComponent(range)}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/bookings/status
   */
  static async getBookingsStatus(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/bookings/status');
    return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/bookings/revenue
   */
  static async getBookingsRevenue(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/bookings/revenue');
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/bookings
   */
  static async getBookings(params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/bookings${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/properties/status
   */
  static async getPropertiesStatus(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/properties/status');
    return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/properties
   */
  static async getProperties(params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/properties${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/users/status
   */
  static async getUsersStatus(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/users/status');
    return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/users
   */
  static async getUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.order) query.append('order', params.order);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/users${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * PATCH /auth/users/:id/status
   */
  static async updateUserStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<any> {
    const res = await ApiClient.patch<any>(`/auth/users/${id}/status`, { status });
    return res?.data || res;
  }

  /**
   * POST /roles/assign
   */
  static async assignRole(userId: string, roleName: string): Promise<any> {
    const res = await ApiClient.post<any>('/roles/assign', { userId, roleName });
    return res?.data || res;
  }

  /**
   * GET /dashboard/booking/calendar
   */
  static async getBookingCalendar(startDate?: string, endDate?: string): Promise<any> {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/booking/calendar${queryStr}`);
    return res?.data?.bookings?.bookings ?? res?.data?.bookings ?? res?.data?.data ?? res?.data ?? res;
  }

  /**
   * GET /dashboard/calendar/summary
   */
  static async getCalendarSummary(propertyId?: string, roomId?: string): Promise<any> {
    const query = new URLSearchParams();
    if (propertyId) query.append('propertyId', propertyId);
    if (roomId) query.append('roomId', roomId);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/calendar/summary${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * PATCH /properties/:id/review
   * Approves or rejects a property listing
   */
  static async reviewProperty(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/${id}/review`, { status, rejectionReason });
    return res?.data || res;
  }

  /**
   * PATCH /properties/:id/suspend
   * Suspends a property listing
   */
  static async suspendProperty(id: string, reason?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/${id}/suspend`, { reason });
    return res?.data || res;
  }

  /**
   * PATCH /properties/:id/availability
   * Toggles property availability
   */
  static async togglePropertyAvailability(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/properties/${id}/availability`);
    return res?.data || res;
  }

  /**
   * PATCH /booking/:id/status
   * Changes booking status (CONTACTED, CLOSED, CANCELLED)
   */
  static async updateBookingStatus(id: string, status: 'CONTACTED' | 'CLOSED' | 'CANCELLED', note?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/booking/${id}/status`, { status, note });
    return res?.data || res;
  }

  /**
   * PATCH /booking/:id/assign
   * Assigns booking to current admin
   */
  static async assignBooking(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/booking/${id}/assign`);
    return res?.data || res;
  }
}

