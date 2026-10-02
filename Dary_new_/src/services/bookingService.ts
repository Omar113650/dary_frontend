import { ApiClient } from './apiClient';

export interface BookingPayload {
  propertyId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  bedsRequested?: number;
  monthsCount?: number;
  note?: string;
}

export interface BookingQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  propertyId?: string;
  roomId?: string;
  assignedAdminId?: string;
  tenantId?: string;
  search?: string;
  cursor?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC' | string;
}

export interface BookingItem {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  monthsCount?: number;
  totalPrice?: number;
  bedsRequested?: number;
  assignedAdminId?: string | null;
  assignedAdmin?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  status: 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CLOSED' | 'CANCELLED' | string;
  note?: string | null;
  contactedAt?: string | null;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  property?: {
    id: string;
    title?: string;
    city?: string;
    district?: string;
    address?: string;
    price?: number;
    startingPrice?: number;
    images?: any[];
    primaryImage?: string;
    owner?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      whatsappPhone?: string;
    };
    [key: string]: any;
  };
  room?: {
    id: string;
    roomType?: string;
    type?: string;
    pricePerBed?: number;
    totalBeds?: number;
    availableBeds?: number;
    photoUrl?: string;
    [key: string]: any;
  };
  tenant?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    whatsappPhone?: string;
    email?: string;
    avatar?: string;
  };
  contract?: {
    id: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export class BookingService {
  /**
   * Helper to perform request with /booking and fallback to /bookings on 404
   */
  private static async requestWithFallback<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: any,
    config?: any
  ): Promise<T> {
    const singlePath = `/booking${path}`;
    const pluralPath = `/bookings${path}`;
    try {
      if (method === 'get') return await ApiClient.get<T>(singlePath, config);
      if (method === 'post') return await ApiClient.post<T>(singlePath, data, config);
      if (method === 'patch') return await ApiClient.patch<T>(singlePath, data, config);
      return await ApiClient.delete<T>(singlePath, config);
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        if (method === 'get') return await ApiClient.get<T>(pluralPath, config);
        if (method === 'post') return await ApiClient.post<T>(pluralPath, data, config);
        if (method === 'patch') return await ApiClient.patch<T>(pluralPath, data, config);
        return await ApiClient.delete<T>(pluralPath, config);
      }
      throw err;
    }
  }

  /**
   * 1. POST /booking
   * Create a new booking reservation
   */
  static async createBooking(payload: BookingPayload): Promise<any> {
    const res = await this.requestWithFallback<any>('post', '', payload);
    return res?.data || res;
  }

  /**
   * 2. GET /booking/my
   * Get My Bookings (Tenant)
   */
  static async getMyBookings(): Promise<BookingItem[]> {
    try {
      const res = await this.requestWithFallback<any>('get', '/my');
      const list = res?.data?.bookings || res?.data?.data || res?.data || res?.bookings || res;
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('[BookingService.getMyBookings] Error:', e);
      return [];
    }
  }

  /**
   * 3. GET /booking/:id
   * Get Single Booking By ID with complete details (tenant, property, room, admin, contract)
   */
  static async getBookingById(id: string): Promise<BookingItem | null> {
    try {
      const res = await this.requestWithFallback<any>('get', `/${id}`);
      return res?.data?.booking || res?.data || res?.booking || res || null;
    } catch (err) {
      console.error(`[BookingService.getBookingById] Failed for id ${id}:`, err);
      return null;
    }
  }

  /**
   * 4. PATCH /booking/:id/cancel
   * Cancel Booking (Tenant or Admin)
   */
  static async cancelBooking(id: string, note?: string): Promise<any> {
    const res = await this.requestWithFallback<any>('patch', `/${id}/cancel`, { note });
    return res?.data || res;
  }

  /**
   * 5. GET /booking/property/:propertyId
   * Get Owner Bookings for a Property
   */
  static async getOwnerBookings(propertyId: string): Promise<BookingItem[]> {
    try {
      const res = await this.requestWithFallback<any>('get', `/property/${propertyId}`);
      const list = res?.data?.bookings || res?.data || res?.bookings || res;
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn(`[BookingService.getOwnerBookings] Error for ${propertyId}:`, e);
      return [];
    }
  }

  /**
   * 6. GET /booking
   * Get All Bookings (Admin) with full query filters and pagination
   */
  static async getAllBookings(params?: BookingQueryParams): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.propertyId) query.append('propertyId', params.propertyId);
    if (params?.roomId) query.append('roomId', params.roomId);
    if (params?.assignedAdminId) query.append('assignedAdminId', params.assignedAdminId);
    if (params?.tenantId) query.append('tenantId', params.tenantId);
    if (params?.search) query.append('search', params.search);
    if (params?.cursor) query.append('cursor', params.cursor);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.order) query.append('order', params.order);

    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await this.requestWithFallback<any>('get', queryStr);
    return res?.data || res;
  }

  /**
   * 7. PATCH /booking/:id/assign
   * Assign Admin to Booking
   */
  static async assignBooking(id: string): Promise<any> {
    const res = await this.requestWithFallback<any>('patch', `/${id}/assign`);
    return res?.data || res;
  }

  /**
   * 8. PATCH /booking/:id/status
   * Change Booking Status (PENDING, CONTACTED, CONFIRMED, CLOSED, CANCELLED)
   */
  static async changeBookingStatus(
    id: string,
    status: 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CLOSED' | 'CANCELLED' | string,
    note?: string
  ): Promise<any> {
    const payload: { status: string; note?: string } = { status };
    if (note && note.trim()) {
      payload.note = note.trim();
    } else if (status === 'CANCELLED') {
      payload.note = 'تم الإلغاء';
    }
    const res = await this.requestWithFallback<any>('patch', `/${id}/status`, payload);
    return res?.data || res;
  }

  /**
   * 9. PATCH /contract/:contractId/activate
   * Activate a signed contract (automatically sets booking to CLOSED on backend)
   */
  static async activateContract(contractId: string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/contract/${contractId}/activate`);
      return res?.data || res;
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        const res = await ApiClient.patch<any>(`/contracts/${contractId}/activate`);
        return res?.data || res;
      }
      throw err;
    }
  }
}
