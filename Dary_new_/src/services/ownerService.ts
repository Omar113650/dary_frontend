import { ApiClient } from './apiClient';

export interface OwnerPropertyStatusItem {
  status: string;
  count: number;
  [key: string]: any;
}

export interface OwnerBookingStatusItem {
  status: string;
  count: number;
  [key: string]: any;
}

export interface OwnerRevenueSummary {
  totalRevenue?: number;
  currency?: string;
  monthlyRevenue?: Array<{
    month?: string | number;
    year?: number;
    revenue?: number;
    [key: string]: any;
  }>;
  bookingsCount?: number;
  [key: string]: any;
}

export interface OwnerCalendarEvent {
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

export interface OwnerPropertyItem {
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
  rooms?: any[];
  images?: Array<{ url?: string; isPrimary?: boolean } | string>;
  primaryImage?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface OwnerPropertyBookingItem {
  id: string;
  propertyId: string;
  roomId?: string;
  status: 'PENDING' | 'CONTACTED' | 'CLOSED' | 'CANCELLED' | string;
  bedsRequested?: number;
  startDate?: string;
  endDate?: string;
  tenant?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  createdAt?: string;
  [key: string]: any;
}

export class OwnerService {
  /**
   * 1. GET /dashboard/owner/properties/status
   * Returns property status counts for the owner
   */
  static async getPropertiesStatus(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/owner/properties/status');
    return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
  }

  /**
   * 2. GET /dashboard/owner/bookings/status
   * Returns booking status counts for the owner
   */
  static async getBookingsStatus(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/owner/bookings/status');
    return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
  }

  /**
   * 3. GET /dashboard/owner/bookings/revenue
   * Returns booking revenue metrics for the owner
   */
  static async getRevenue(): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/owner/bookings/revenue');
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * 4. GET /dashboard/owner/calendar/summary
   * Returns owner calendar summary
   */
  static async getCalendarSummary(params?: { days?: number }): Promise<any> {
    const res = await ApiClient.get<any>('/dashboard/owner/calendar/summary', { params });
    return res?.data?.data ?? res?.data ?? res;
  }

  /**
   * 5. GET /properties/my
   * Confirmed owner-specific property listing endpoint
   */
  static async getMyProperties(): Promise<OwnerPropertyItem[]> {
    const res = await ApiClient.get<any>('/properties/my');
    const data =
      (Array.isArray(res?.data?.properties) ? res.data.properties : null) ||
      (Array.isArray(res?.data?.data) ? res.data.data : null) ||
      (Array.isArray(res?.data?.items) ? res.data.items : null) ||
      (Array.isArray(res?.data) ? res.data : null) ||
      (Array.isArray(res?.properties) ? res.properties : null) ||
      (Array.isArray(res) ? res : []);
    return data;
  }

  /**
   * 6. GET /booking/property/:propertyId
   * Confirmed endpoint: Owner bookings against one of their properties
   */
  static async getPropertyBookings(propertyId: string): Promise<OwnerPropertyBookingItem[]> {
    const res = await ApiClient.get<any>(`/booking/property/${propertyId}`);
    const data = res?.data?.bookings || res?.data || res?.bookings || res;
    return Array.isArray(data) ? data : [];
  }

  /**
   * 7. POST /properties
   * Confirmed endpoint: Create a new student housing property listing
   */
  static async createProperty(formData: FormData): Promise<any> {
    const res = await ApiClient.post<any>('/properties', formData);
    return res?.data?.property || res?.data || res?.property || res;
  }

  /**
   * 8. PATCH /booking/:id/status
   * Confirmed endpoint: Update booking status by owner/admin
   */
  static async updateBookingStatus(
    bookingId: string,
    status: string,
    note?: string
  ): Promise<any> {
    const payload: any = { status };
    if (note && note.trim()) {
      payload.note = note.trim();
    } else if (status === 'CANCELLED') {
      payload.note = 'تم الإلغاء من قبل مالك العقار';
    }
    const res = await ApiClient.patch<any>(`/booking/${bookingId}/status`, payload);
    return res?.data?.booking || res?.data || res?.booking || res;
  }
}

