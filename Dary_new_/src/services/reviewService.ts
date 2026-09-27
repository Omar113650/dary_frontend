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
  updatedAt?: string;
  property?: {
    id?: string;
    title?: string;
    city?: string;
    ownerId?: string;
    [key: string]: any;
  };
  tenant?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
    [key: string]: any;
  };
  owner?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ReviewResponseMeta {
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  averagePropertyRating?: number;
  averageOwnerRating?: number;
}

export interface PropertyReviewsResult {
  data: ReviewItem[];
  meta: ReviewResponseMeta;
}

export class ReviewService {
  /**
   * Helper to execute endpoint with fallback between singular and plural route (/review vs /reviews)
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

    // Primary path (/review/...) and alternative (/reviews/...)
    const primary = path.startsWith('/review') ? path : `/review${path}`;
    const secondary = primary.startsWith('/reviews')
      ? primary.replace('/reviews', '/review')
      : primary.replace('/review', '/reviews');

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
   * 1. POST /review
   * Create Review (Tenant only, on CLOSED booking)
   * body: { bookingId, propertyRating, ownerRating, comment }
   */
  static async createReview(payload: CreateReviewPayload): Promise<ReviewItem> {
    const res = await this.requestWithFallback<any>('/review', {
      method: 'POST',
      body: payload,
    });
    return res?.data?.data || res?.data || res;
  }

  /**
   * 2. GET /review/property/:propertyId
   * Get Property Approved Reviews + Meta (averagePropertyRating, averageOwnerRating)
   */
  static async getPropertyReviews(
    propertyId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PropertyReviewsResult> {
    const cleanId = String(propertyId || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return { data: [], meta: { total: 0, averagePropertyRating: 0, averageOwnerRating: 0 } };
    }

    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(Math.max(1, Number(params.page))));
    if (params?.limit) query.append('limit', String(Math.max(1, Math.min(100, Number(params.limit)))));

    const res = await this.requestWithFallback<any>(`/review/property/${encodeURIComponent(cleanId)}`, {
      method: 'GET',
      query,
    });

    const dataObj = res?.data || res;
    const list = Array.isArray(dataObj?.data)
      ? dataObj.data
      : Array.isArray(dataObj)
      ? dataObj
      : [];

    const meta = dataObj?.meta || {
      total: list.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: 1,
      averagePropertyRating: 0,
      averageOwnerRating: 0,
    };

    return {
      data: list,
      meta,
    };
  }

  /**
   * 3. GET /review/owner/:ownerId
   * Get Owner Reviews
   */
  static async getOwnerReviews(
    ownerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<{ data: ReviewItem[]; meta: ReviewResponseMeta }> {
    const cleanId = String(ownerId || '').trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
      return { data: [], meta: { total: 0, totalPages: 1 } };
    }

    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(Math.max(1, Number(params.page))));
    if (params?.limit) query.append('limit', String(Math.max(1, Math.min(100, Number(params.limit)))));

    const res = await this.requestWithFallback<any>(`/review/owner/${encodeURIComponent(cleanId)}`, {
      method: 'GET',
      query,
    });

    const dataObj = res?.data || res;
    const list = Array.isArray(dataObj?.data)
      ? dataObj.data
      : Array.isArray(dataObj)
      ? dataObj
      : [];

    const meta = dataObj?.meta || {
      total: list.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: 1,
    };

    return {
      data: list,
      meta,
    };
  }

  /**
   * 4. GET /review/my
   * Get Logged-in Tenant's Own Reviews
   */
  static async getMyReviews(params?: { page?: number; limit?: number }): Promise<ReviewItem[]> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await this.requestWithFallback<any>('/review/my', {
      method: 'GET',
      query,
    });

    const list = res?.data?.data || res?.data || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 5. GET /review/pending
   * Admin: Get Pending Reviews awaiting moderation
   */
  static async getPendingReviews(params?: { page?: number; limit?: number }): Promise<{
    reviews: ReviewItem[];
    data: ReviewItem[];
    total: number;
    meta?: ReviewResponseMeta;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    try {
      const res = await this.requestWithFallback<any>('/review/pending', {
        method: 'GET',
        query,
      });

      const list =
        (Array.isArray(res?.data?.data) ? res.data.data : null) ||
        (Array.isArray(res?.data) ? res.data : null) ||
        (Array.isArray(res?.reviews) ? res.reviews : null) ||
        (Array.isArray(res) ? res : []);

      return {
        reviews: list,
        data: list,
        total: res?.meta?.total ?? res?.total ?? list.length,
        meta: res?.meta,
      };
    } catch {
      // Fallback to GET /review?status=PENDING
      const fallbackQuery = new URLSearchParams();
      fallbackQuery.append('status', 'PENDING');
      if (params?.page) fallbackQuery.append('page', String(params.page));
      if (params?.limit) fallbackQuery.append('limit', String(params.limit));

      const res = await this.requestWithFallback<any>('/review', {
        method: 'GET',
        query: fallbackQuery,
      });

      const dataObj = res?.data || res;
      const list = Array.isArray(dataObj?.data)
        ? dataObj.data
        : Array.isArray(dataObj)
        ? dataObj
        : [];

      return {
        reviews: list,
        data: list,
        total: dataObj?.meta?.total ?? list.length,
        meta: dataObj?.meta,
      };
    }
  }

  /**
   * 6. GET /review
   * Admin: Get All Reviews with optional filters (status, propertyId, ownerId, page, limit)
   */
  static async getAllReviews(params?: {
    page?: number;
    limit?: number;
    status?: string;
    propertyId?: string;
    ownerId?: string;
  }): Promise<{
    reviews: ReviewItem[];
    data: ReviewItem[];
    total: number;
    totalPages: number;
    meta: ReviewResponseMeta;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.propertyId) query.append('propertyId', params.propertyId);
    if (params?.ownerId) query.append('ownerId', params.ownerId);

    const res = await this.requestWithFallback<any>('/review', {
      method: 'GET',
      query,
    });

    const dataObj = res?.data || res;
    const list = Array.isArray(dataObj?.data)
      ? dataObj.data
      : Array.isArray(dataObj?.reviews)
      ? dataObj.reviews
      : Array.isArray(dataObj)
      ? dataObj
      : [];

    const total = dataObj?.meta?.total ?? dataObj?.total ?? list.length;
    const limit = params?.limit || dataObj?.meta?.limit || 20;
    const totalPages = dataObj?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));

    return {
      reviews: list,
      data: list,
      total,
      totalPages,
      meta: dataObj?.meta || { total, totalPages, page: params?.page || 1, limit },
    };
  }

  /**
   * 7. PATCH /review/:id/moderate
   * Admin: Approve, Reject, or Unapprove (Pending) a review
   * body: { status: 'APPROVED' | 'REJECTED' | 'PENDING' }
   */
  static async moderateReview(
    reviewId: string,
    status: 'APPROVED' | 'REJECTED' | 'PENDING' | string
  ): Promise<ReviewItem> {
    const res = await this.requestWithFallback<any>(`/review/${encodeURIComponent(reviewId)}/moderate`, {
      method: 'PATCH',
      body: { status },
    });
    return res?.data?.data || res?.data || res;
  }

  /**
   * Helper: Approve Review
   */
  static async acceptReview(reviewId: string): Promise<ReviewItem> {
    return this.moderateReview(reviewId, 'APPROVED');
  }

  /**
   * Helper: Reject Review
   */
  static async rejectReview(reviewId: string): Promise<ReviewItem> {
    return this.moderateReview(reviewId, 'REJECTED');
  }

  /**
   * Helper: Revoke Approval / Unapprove (Return review to PENDING status)
   */
  static async unapproveReview(reviewId: string): Promise<ReviewItem> {
    return this.moderateReview(reviewId, 'PENDING');
  }

  /**
   * 8. DELETE /review/:id
   * Admin: Permanently delete a review
   */
  static async deleteReview(reviewId: string): Promise<any> {
    return this.requestWithFallback<any>(`/review/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
    });
  }
}
