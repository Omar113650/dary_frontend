import { ApiClient } from './apiClient';

export interface BookingPayload {
  propertyId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  bedsRequested: number;
  monthsCount?: number;
  note?: string;
}

export interface BookingItem {
  id: string;
  tenantId: string;
  propertyId: string;
  roomId: string;
  monthsCount: number;
  totalPrice: number;
  bedsRequested: number;
  assignedAdminId?: string | null;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED' | 'CANCELLED' | string;
  note?: string | null;
  contactedAt?: string | null;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  property?: any;
  room?: any;
  tenant?: any;
  contract?: any;
  [key: string]: any;
}

export class BookingService {
  /**
   * 1. POST /booking
   * Create a new booking reservation
   */
  static async createBooking(payload: BookingPayload): Promise<any> {
    const res = await ApiClient.post<any>('/booking', payload);
    return res?.data || res;
  }

  /**
   * 2. GET /booking/my
   * Get My Bookings (Tenant)
   */
  static async getMyBookings(): Promise<BookingItem[]> {
    const res = await ApiClient.get<any>('/booking/my');
    const list = res?.data?.bookings || res?.data?.data || res?.data || res?.bookings || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 3. GET /booking/:id
   * Get Booking By ID
   */
  static async getBookingById(id: string): Promise<BookingItem | null> {
    const res = await ApiClient.get<any>(`/booking/${id}`);
    return res?.data?.booking || res?.data || res?.booking || res;
  }

  /**
   * 4. PATCH /booking/:id/cancel
   * Cancel Booking (Tenant or Admin)
   */
  static async cancelBooking(id: string, note?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/booking/${id}/cancel`, { note });
    return res?.data || res;
  }

  /**
   * 5. GET /booking/property/:propertyId
   * Get Owner Bookings for a Property
   */
  static async getOwnerBookings(propertyId: string): Promise<BookingItem[]> {
    const res = await ApiClient.get<any>(`/booking/property/${propertyId}`);
    const list = res?.data?.bookings || res?.data || res?.bookings || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 6. GET /booking
   * Get All Bookings (Admin)
   */
  static async getAllBookings(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/booking${queryStr}`);
    return res?.data || res;
  }

  /**
   * 7. PATCH /booking/:id/assign
   * Assign Admin to Booking
   */
  static async assignBooking(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/booking/${id}/assign`);
    return res?.data || res;
  }

  /**
   * 8. PATCH /booking/:id/status
   * Change Booking Status (CONTACTED, CLOSED, CANCELLED)
   */
  static async changeBookingStatus(id: string, status: 'CONTACTED' | 'CLOSED' | 'CANCELLED' | string, note?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/booking/${id}/status`, { status, note });
    return res?.data || res;
  }
}
