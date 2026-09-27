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
  district?: string;
  governorate?: string;
  propertyType?: string;
  propertyClass?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED' | string;
  isAvailable?: boolean;
  startingPrice?: number;
  price?: number;
  currency?: string;
  rooms?: number;
  rooms_?: any[];
  owner?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    whatsappPhone?: string;
    avatar?: string;
  };
  ownerId?: string;
  images?: Array<{ url?: string; isPrimary?: boolean; publicId?: string; category?: string } | string>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface AdminPropertiesQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  city?: string;
  propertyType?: string;
  sort?: string;
  order?: 'asc' | 'desc' | string;
}

export interface AdminBookingItem {
  id: string;
  propertyId: string;
  property?: {
    id?: string;
    title?: string;
    address?: string;
    city?: string;
    [key: string]: any;
  };
  roomId?: string;
  room?: {
    id?: string;
    roomNumber?: string;
    type?: string;
    roomType?: string;
    pricePerBed?: number;
    monthlyRent?: number;
    [key: string]: any;
  };
  tenantId?: string;
  tenant?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
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

export interface CalendarQueryParams {
  page?: number;
  limit?: number;
  cursor?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
  status?: string;
  search?: string;
  propertyId?: string;
  roomId?: string;
  tenantId?: string;
  assignedAdminId?: string;
  sort?: string;
  order?: 'asc' | 'desc' | string;
  minPrice?: number;
  maxPrice?: number;
  bedsRequested?: number;
}

export interface AdminBookingsQueryParams {
  page?: number;
  limit?: number;
  cursor?: string;
  status?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc' | string;
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  roomId?: string;
  tenantId?: string;
  assignedAdminId?: string;
}

export class AdminService {
  /**
   * GET /dashboard/reports/status or /report/status
   */
  static async getReportsStatus(): Promise<any> {
    try {
      const res = await ApiClient.get<any>('/dashboard/reports/status');
      return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
    } catch {
      try {
        const res = await ApiClient.get<any>('/report/status');
        return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
      } catch {
        return [];
      }
    }
  }

  /**
   * GET /report or /reports or /dashboard/reports
   */
  static async getReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    reportedType?: string;
    priority?: string;
  }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.reportedType) query.append('reportedType', params.reportedType);
    if (params?.priority) query.append('priority', params.priority);
    const queryStr = query.toString() ? `?${query.toString()}` : '';

    const candidates = [
      `/report${queryStr}`,
      `/reports${queryStr}`,
      `/dashboard/reports${queryStr}`,
    ];

    for (const url of candidates) {
      try {
        const res = await ApiClient.get<any>(url);
        if (res) {
          return res?.data || res;
        }
      } catch (err: any) {
        if (err?.status === 404 || err?.status === 400) continue;
        throw err;
      }
    }

    return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
  }

  /**
   * PATCH /report/:id/priority
   */
  static async updateReportPriority(
    id: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string
  ): Promise<any> {
    const norm = priority.toLowerCase() === 'urgent' ? 'high' : priority.toLowerCase();
    try {
      const res = await ApiClient.patch<any>(`/report/${id}/priority`, { priority: norm });
      return res?.data || res;
    } catch {
      const res = await ApiClient.patch<any>(`/reports/${id}/priority`, { priority: norm });
      return res?.data || res;
    }
  }

  /**
   * PATCH /report/:id/resolve
   */
  static async resolveReport(id: string, resolutionNotes?: string): Promise<any> {
    const notes =
      resolutionNotes && resolutionNotes.trim().length > 0
        ? resolutionNotes.trim()
        : 'تمت المراجعة والتسوية بنجاح';
    try {
      const res = await ApiClient.patch<any>(`/report/${id}/resolve`, { resolutionNotes: notes });
      return res?.data || res;
    } catch {
      const res = await ApiClient.patch<any>(`/reports/${id}/resolve`, { resolutionNotes: notes });
      return res?.data || res;
    }
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
   * Supports offset/cursor pagination, status, search, and sorting
   */
  static async getBookings(params?: AdminBookingsQueryParams): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.cursor) query.append('cursor', params.cursor);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.order) query.append('order', params.order);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.propertyId) query.append('propertyId', params.propertyId);
    if (params?.roomId) query.append('roomId', params.roomId);
    if (params?.tenantId) query.append('tenantId', params.tenantId);
    if (params?.assignedAdminId) query.append('assignedAdminId', params.assignedAdminId);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/bookings${queryStr}`);
    return res?.data ?? res;
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
   * Supports pagination, status, search, and sorting
   */
  static async getProperties(params?: AdminPropertiesQueryParams): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.city) query.append('city', params.city);
    if (params?.propertyType) query.append('propertyType', params.propertyType);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.order) query.append('order', params.order);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/properties${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * GET /properties/pending
   * Get pending properties requiring admin review
   */
  static async getPendingProperties(params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/properties/pending${queryStr}`);
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * DELETE /properties/:id
   * Soft deletes a property listing
   */
  static async deleteProperty(id: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/properties/${id}`);
    return res?.data || res;
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
    try {
      const res = await ApiClient.get<any>(`/dashboard/users${queryStr}`);
      return res?.data?.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)
        ? res.data.data
        : res?.data ?? res;
    } catch {
      const res = await ApiClient.get<any>(`/auth/users${queryStr}`);
      return res?.data?.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)
        ? res.data.data
        : res?.data ?? res;
    }
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
   * POST /auth/create-admin (or /admin/users)
   * Directly creates an active, verified admin in database without OTP
   */
  static async createAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    roleName?: string;
  }): Promise<any> {
    try {
      const res = await ApiClient.post<any>('/auth/create-admin', data);
      return res?.data || res;
    } catch (err: any) {
      if (err?.status === 404) {
        try {
          const res = await ApiClient.post<any>('/admin/users', data);
          return res?.data || res;
        } catch {
          const res = await ApiClient.post<any>('/auth/admin', data);
          return res?.data || res;
        }
      }
      throw err;
    }
  }

  /**
   * GET /dashboard/booking/calendar
   * Supports offset/cursor pagination, date filtering, status, search, and sorting
   */
  static async getBookingCalendar(
    paramsOrStartDate?: string | CalendarQueryParams,
    maybeEndDate?: string
  ): Promise<any> {
    const query = new URLSearchParams();
    if (typeof paramsOrStartDate === 'string') {
      if (paramsOrStartDate) query.append('startDate', paramsOrStartDate);
      if (maybeEndDate) query.append('endDate', maybeEndDate);
    } else if (paramsOrStartDate && typeof paramsOrStartDate === 'object') {
      const p = paramsOrStartDate;
      if (p.page) query.append('page', p.page.toString());
      if (p.limit) query.append('limit', p.limit.toString());
      if (p.cursor) query.append('cursor', p.cursor);
      if (p.startDate) query.append('startDate', p.startDate);
      if (p.endDate) query.append('endDate', p.endDate);
      if (p.month !== undefined) query.append('month', p.month.toString());
      if (p.year !== undefined) query.append('year', p.year.toString());
      if (p.status) query.append('status', p.status);
      if (p.search) query.append('search', p.search);
      if (p.propertyId) query.append('propertyId', p.propertyId);
      if (p.roomId) query.append('roomId', p.roomId);
      if (p.tenantId) query.append('tenantId', p.tenantId);
      if (p.assignedAdminId) query.append('assignedAdminId', p.assignedAdminId);
      if (p.sort) query.append('sort', p.sort);
      if (p.order) query.append('order', p.order);
      if (p.minPrice !== undefined) query.append('minPrice', p.minPrice.toString());
      if (p.maxPrice !== undefined) query.append('maxPrice', p.maxPrice.toString());
      if (p.bedsRequested !== undefined) query.append('bedsRequested', p.bedsRequested.toString());
    }
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/dashboard/booking/calendar${queryStr}`);
    return res?.data ?? res;
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
   * GET /booking/:id
   * Get single booking by ID with full relations
   */
  static async getBookingById(id: string): Promise<any> {
    try {
      const res = await ApiClient.get<any>(`/booking/${id}`);
      return res?.data?.booking || res?.data || res?.booking || res || null;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        try {
          const res = await ApiClient.get<any>(`/bookings/${id}`);
          return res?.data?.booking || res?.data || res?.booking || res || null;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * PATCH /booking/:id/status
   * Changes booking status (CONTACTED, CLOSED, CANCELLED)
   */
  static async updateBookingStatus(id: string, status: 'CONTACTED' | 'CLOSED' | 'CANCELLED', note?: string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/booking/${id}/status`, { status, note });
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.patch<any>(`/bookings/${id}/status`, { status, note });
        return res?.data || res;
      }
      throw e;
    }
  }

  /**
   * PATCH /booking/:id/assign
   * Assigns booking to current admin
   */
  static async assignBooking(id: string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/booking/${id}/assign`);
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.patch<any>(`/bookings/${id}/assign`);
        return res?.data || res;
      }
      throw e;
    }
  }
}

