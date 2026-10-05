import { ApiClient } from './apiClient';
import { isPropertyDeletedOrArchived } from './propertyService';

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
  pendingRevenue?: number;
  completedBookings?: number;
  pendingBookings?: number;
  totalProperties?: number;
  avgRevenuePerProperty?: number;
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
  rejectionReason?: string;
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
  status: 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CLOSED' | 'CANCELLED' | string;
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

  private static computeOwnerBookingPrice(b: any, prop?: any): number {
    if (typeof b?.totalPrice === 'number' && !Number.isNaN(b.totalPrice)) {
      return b.totalPrice;
    }
    const pricePerBed = Number(
      b?.room?.pricePerBed || b?.room?.monthlyRent || prop?.startingPrice || prop?.price || 0
    );
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
   * 2. GET /dashboard/owner/bookings/status
   * Returns booking status counts for the owner (with fallback to property bookings if endpoint returns 500)
   */
  static async getBookingsStatus(): Promise<any> {
    try {
      const res = await ApiClient.get<any>('/dashboard/owner/bookings/status');
      return res?.data?.status ?? res?.data?.data?.status ?? res?.data ?? res;
    } catch {
      try {
        const props = await this.getMyProperties();
        const bookingsArrays = await Promise.all(
          props.map((p) => this.getPropertyBookings(p.id).catch(() => []))
        );
        const all = bookingsArrays.flat();
        const counts = {
          total: all.length,
          pending: 0,
          contacted: 0,
          confirmed: 0,
          closed: 0,
          cancelled: 0,
        };
        for (const b of all) {
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
   * 3. GET /dashboard/owner/bookings/revenue
   * Returns booking revenue metrics for the owner (with fallback if endpoint returns 500)
   */
  static async getRevenue(): Promise<any> {
    try {
      const res = await ApiClient.get<any>('/dashboard/owner/bookings/revenue');
      return res?.data?.data ?? res?.data ?? res;
    } catch {
      try {
        const props = await this.getMyProperties();
        const bookingsWithProp = await Promise.all(
          props.map(async (p) => {
            const bks = await this.getPropertyBookings(p.id).catch(() => []);
            return bks.map((b) => ({ booking: b, prop: p }));
          })
        );
        const all = bookingsWithProp.flat();
        const closedItems = all.filter(
          ({ booking }) => String(booking?.status || '').toUpperCase() === 'CLOSED'
        );
        const pendingItems = all.filter(({ booking }) =>
          ['PENDING', 'CONTACTED', 'CONFIRMED'].includes(String(booking?.status || '').toUpperCase())
        );
        const totalRevenue = closedItems.reduce(
          (sum, { booking, prop }) => sum + this.computeOwnerBookingPrice(booking, prop),
          0
        );
        const pendingRevenue = pendingItems.reduce(
          (sum, { booking, prop }) => sum + this.computeOwnerBookingPrice(booking, prop),
          0
        );
        const totalProperties = props.length;
        const avgRevenuePerProperty =
          totalProperties > 0 ? Math.round(totalRevenue / totalProperties) : 0;

        return {
          totalRevenue,
          pendingRevenue,
          completedBookings: closedItems.length,
          pendingBookings: pendingItems.length,
          totalProperties,
          avgRevenuePerProperty,
          currency: 'ج.م',
        };
      } catch {
        return {
          totalRevenue: 0,
          pendingRevenue: 0,
          completedBookings: 0,
          pendingBookings: 0,
          totalProperties: 0,
          avgRevenuePerProperty: 0,
          currency: 'ج.م',
        };
      }
    }
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
    return data.filter((item: any) => !isPropertyDeletedOrArchived(item));
  }

  /**
   * 6. GET /booking/property/:propertyId
   * Confirmed endpoint: Owner bookings against one of their properties
   */
  static async getPropertyBookings(propertyId: string): Promise<OwnerPropertyBookingItem[]> {
    try {
      const res = await ApiClient.get<any>(`/booking/property/${propertyId}`);
      const data = res?.data?.bookings || res?.data || res?.bookings || res;
      return Array.isArray(data) ? data : [];
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        try {
          const res = await ApiClient.get<any>(`/bookings/property/${propertyId}`);
          const data = res?.data?.bookings || res?.data || res?.bookings || res;
          return Array.isArray(data) ? data : [];
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  /**
   * Get single booking by ID
   */
  static async getBookingById(bookingId: string): Promise<any> {
    try {
      const res = await ApiClient.get<any>(`/booking/${bookingId}`);
      return res?.data?.booking || res?.data || res?.booking || res || null;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        try {
          const res = await ApiClient.get<any>(`/bookings/${bookingId}`);
          return res?.data?.booking || res?.data || res?.booking || res || null;
        } catch {
          return null;
        }
      }
      return null;
    }
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
    try {
      const res = await ApiClient.patch<any>(`/booking/${bookingId}/status`, payload);
      return res?.data?.booking || res?.data || res?.booking || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.patch<any>(`/bookings/${bookingId}/status`, payload);
        return res?.data?.booking || res?.data || res?.booking || res;
      }
      throw e;
    }
  }
}

