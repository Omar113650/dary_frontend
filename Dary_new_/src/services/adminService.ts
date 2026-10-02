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
   * Helper to extract booking items array from any response format
   */
  private static extractBookingsArray(raw: any): AdminBookingItem[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data?.bookings)) return raw.data.bookings;
    if (Array.isArray(raw?.data?.items)) return raw.data.items;
    if (Array.isArray(raw?.data?.data)) return raw.data.data;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.bookings)) return raw.bookings;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
  }

  /**
   * Helper to calculate booking price if totalPrice is missing
   */
  private static computeBookingPrice(b: any): number {
    if (typeof b?.totalPrice === 'number' && !Number.isNaN(b.totalPrice)) {
      return b.totalPrice;
    }
    const pricePerBed = Number(b?.room?.pricePerBed || b?.room?.monthlyRent || b?.property?.startingPrice || b?.property?.price || 0);
    const beds = Number(b?.bedsRequested || 1);
    const months = Number(
      b?.monthsCount ||
        (b?.startDate && b?.endDate
          ? Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 1)
    );
    return pricePerBed * beds * months;
  }

  /**
   * GET /dashboard/analytics?range=7d
   * Falls back to computing analytics metrics from properties, users, and bookings if endpoint errors (e.g. 500)
   */
  static async getAnalytics(range: string = '7d'): Promise<any> {
    try {
      const res = await ApiClient.get<any>(`/dashboard/analytics?range=${encodeURIComponent(range)}`);
      return res?.data?.data ?? res?.data ?? res;
    } catch {
      try {
        const [propsRes, usersRes, bookingsRes] = await Promise.allSettled([
          this.getProperties({ limit: 200 }),
          this.getUsers({ limit: 200 }),
          this.getBookings({ limit: 500 }),
        ]);

        const propsList =
          propsRes.status === 'fulfilled'
            ? (Array.isArray(propsRes.value)
                ? propsRes.value
                : propsRes.value?.properties || propsRes.value?.items || propsRes.value?.data || [])
            : [];
        const usersList =
          usersRes.status === 'fulfilled'
            ? (Array.isArray(usersRes.value)
                ? usersRes.value
                : usersRes.value?.users || usersRes.value?.items || usersRes.value?.data || [])
            : [];
        const bookingsList =
          bookingsRes.status === 'fulfilled' ? this.extractBookingsArray(bookingsRes.value) : [];

        let totalBeds = 0;
        let occupiedBeds = 0;
        if (Array.isArray(propsList)) {
          for (const p of propsList) {
            const rooms = p?.rooms_ || p?.rooms;
            if (Array.isArray(rooms)) {
              for (const r of rooms) {
                const tb = Number(r?.totalBeds || 0);
                const ab = Number(r?.availableBeds ?? tb);
                totalBeds += tb;
                occupiedBeds += Math.max(0, tb - ab);
              }
            }
          }
        }
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentUsersCount = Array.isArray(usersList)
          ? usersList.filter((u: any) => u?.createdAt && new Date(u.createdAt).getTime() >= sevenDaysAgo).length
          : 0;
        const activeUsersCount = Array.isArray(usersList)
          ? usersList.filter((u: any) => String(u?.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length
          : 0;

        return {
          occupancyRate,
          dailyActiveUsers: activeUsersCount,
          bookingVolume: bookingsList.length,
          userGrowth: recentUsersCount || (Array.isArray(usersList) ? usersList.length : 0),
          newUsers: recentUsersCount,
          period: range,
        };
      } catch {
        return {
          occupancyRate: 0,
          dailyActiveUsers: 0,
          bookingVolume: 0,
          userGrowth: 0,
          period: range,
        };
      }
    }
  }

  /**
   * GET /dashboard/bookings/status
   * Falls back to aggregating status counts from /dashboard/bookings or /booking if endpoint returns 500
   */
  static async getBookingsStatus(): Promise<any> {
    try {
      const res = await ApiClient.get<any>('/dashboard/bookings/status');
      return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
    } catch {
      try {
        const raw = await this.getBookings({ limit: 500 });
        const list = this.extractBookingsArray(raw);
        const counts = {
          total: list.length,
          pending: 0,
          contacted: 0,
          confirmed: 0,
          closed: 0,
          cancelled: 0,
        };
        for (const b of list) {
          const st = String(b?.status || '').toUpperCase();
          if (st === 'PENDING') counts.pending++;
          else if (st === 'CONTACTED') counts.contacted++;
          else if (st === 'CONFIRMED') counts.confirmed++;
          else if (st === 'CLOSED') counts.closed++;
          else if (st === 'CANCELLED') counts.cancelled++;
        }
        return counts;
      } catch {
        return { total: 0, pending: 0, contacted: 0, confirmed: 0, closed: 0, cancelled: 0 };
      }
    }
  }

  /**
   * GET /dashboard/bookings/revenue
   * Falls back to computing totalRevenue (CLOSED only) & pendingRevenue (PENDING, CONTACTED, CONFIRMED)
   */
  static async getBookingsRevenue(): Promise<any> {
    try {
      const res = await ApiClient.get<any>('/dashboard/bookings/revenue');
      return res?.data?.data ?? res?.data ?? res;
    } catch {
      try {
        const raw = await this.getBookings({ limit: 500 });
        const list = this.extractBookingsArray(raw);
        const totalRevenue = list
          .filter((b) => String(b?.status || '').toUpperCase() === 'CLOSED')
          .reduce((sum, b) => sum + this.computeBookingPrice(b), 0);
        const pendingRevenue = list
          .filter((b) => ['PENDING', 'CONTACTED', 'CONFIRMED'].includes(String(b?.status || '').toUpperCase()))
          .reduce((sum, b) => sum + this.computeBookingPrice(b), 0);
        return { totalRevenue, pendingRevenue, currency: 'ج.م' };
      } catch {
        return { totalRevenue: 0, pendingRevenue: 0, currency: 'ج.م' };
      }
    }
  }

  /**
   * GET /dashboard/bookings
   * Supports offset/cursor pagination, status, search, and sorting (with fallback to /booking)
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
    try {
      const res = await ApiClient.get<any>(`/dashboard/bookings${queryStr}`);
      return res?.data ?? res;
    } catch {
      const res = await ApiClient.get<any>(`/booking${queryStr}`);
      return res?.data ?? res;
    }
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
   * Changes booking status (PENDING, CONTACTED, CONFIRMED, CLOSED, CANCELLED)
   */
  static async updateBookingStatus(
    id: string,
    status: 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CLOSED' | 'CANCELLED',
    note?: string
  ): Promise<any> {
    const payload: { status: string; note?: string } = { status };
    if (note && note.trim()) {
      payload.note = note.trim();
    }
    try {
      const res = await ApiClient.patch<any>(`/booking/${id}/status`, payload);
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.patch<any>(`/bookings/${id}/status`, payload);
        return res?.data || res;
      }
      throw e;
    }
  }

  /**
   * PATCH /contract/:contractId/activate
   * Activates a signed contract and automatically transitions booking to CLOSED
   */
  static async activateContract(contractId: string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/contract/${contractId}/activate`);
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.patch<any>(`/contracts/${contractId}/activate`);
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

