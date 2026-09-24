import { ApiClient } from './apiClient';

export interface CreateReviewPayload {
  bookingId: string;
  propertyRating: number;
  ownerRating: number;
  comment?: string;
}

export interface ReviewItem {
  id: string;
  bookingId: string;
  tenantId: string;
  propertyId: string;
  ownerId: string;
  propertyRating: number;
  ownerRating: number;
  comment?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  moderatedById?: string | null;
  createdAt?: string;
  property?: any;
  tenant?: any;
  owner?: any;
  [key: string]: any;
}

export class ReviewService {
  /**
   * 1. POST /review
   * Create Property Review
   */
  static async createReview(payload: CreateReviewPayload): Promise<any> {
    const res = await ApiClient.post<any>('/review', payload);
    return res?.data || res;
  }

  /**
   * 2. GET /review/property/:propertyId
   * Get Property Reviews
   */
  static async getPropertyReviews(propertyId: string, params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/review/property/${propertyId}${queryStr}`);
    return res?.data || res;
  }

  /**
   * 3. GET /review/owner/:ownerId
   * Get Owner Reviews
   */
  static async getOwnerReviews(ownerId: string, params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/review/owner/${ownerId}${queryStr}`);
    return res?.data || res;
  }

  /**
   * 4. GET /review/my
   * Get My Reviews
   */
  static async getMyReviews(params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/review/my${queryStr}`);
    return res?.data || res;
  }

  /**
   * 5. GET /review/pending
   * Get Pending Reviews (Admin)
   */
  static async getPendingReviews(params?: { page?: number; limit?: number }): Promise<any> {
    const candidates = [
      '/review?status=PENDING',
      '/dashboard/reviews?status=PENDING',
      '/review/my',
      '/review',
    ];

    for (const url of candidates) {
      try {
        const res = await ApiClient.get<any>(url);
        if (res) {
          const list =
            (Array.isArray(res?.reviews) ? res.reviews : null) ||
            (Array.isArray(res?.data) ? res.data : null) ||
            (Array.isArray(res?.items) ? res.items : null) ||
            (Array.isArray(res) ? res : []);
          return {
            reviews: list.filter((r: any) => !r.status || r.status === 'PENDING'),
            total: list.length,
          };
        }
      } catch (err: any) {
        // If 404 or 400 route mismatch, try next candidate
        if (err?.status === 404 || err?.status === 400) {
          continue;
        }
        throw err;
      }
    }

    // Default clean empty response if no endpoint active
    return { reviews: [], total: 0 };
  }

  /**
   * 6. PATCH /review/:id/moderate -> accept review
   */
  static async acceptReview(id: string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/review/${id}/moderate`, { status: 'APPROVED' });
      return res?.data || res;
    } catch {
      const res = await ApiClient.patch<any>(`/review/${id}/status`, { status: 'APPROVED' });
      return res?.data || res;
    }
  }

  /**
   * 7. PATCH /review/:id/moderate -> reject review
   */
  static async rejectReview(id: string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/review/${id}/moderate`, { status: 'REJECTED' });
      return res?.data || res;
    } catch {
      const res = await ApiClient.patch<any>(`/review/${id}/status`, { status: 'REJECTED' });
      return res?.data || res;
    }
  }

  /**
   * 8. GET /review
   * Get All Reviews (Admin)
   */
  static async getAllReviews(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const candidates = [
      params?.status ? `/review?status=${params.status}` : '/review',
      '/dashboard/reviews',
      '/review/my',
    ];

    for (const url of candidates) {
      try {
        const res = await ApiClient.get<any>(url);
        if (res) {
          const list =
            (Array.isArray(res?.reviews) ? res.reviews : null) ||
            (Array.isArray(res?.data) ? res.data : null) ||
            (Array.isArray(res?.items) ? res.items : null) ||
            (Array.isArray(res) ? res : []);
          return { reviews: list, total: list.length };
        }
      } catch (err: any) {
        if (err?.status === 404 || err?.status === 400) {
          continue;
        }
        throw err;
      }
    }

    return { reviews: [], total: 0 };
  }
}
