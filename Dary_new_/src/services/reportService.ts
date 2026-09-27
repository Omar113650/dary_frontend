import { ApiClient } from './apiClient';

export interface CreateReportPayload {
  reportedType: 'property' | 'user' | 'spam' | 'fraud';
  reportedPropertyId?: string;
  reportedUserId?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reportedType: 'property' | 'user' | 'spam' | 'fraud' | string;
  reportedPropertyId?: string | null;
  reportedUserId?: string | null;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | string;
  status: 'PENDING' | 'RESOLVED' | string;
  resolvedById?: string | null;
  resolutionNotes?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
  reportedProperty?: {
    id?: string;
    title?: string;
    ownerId?: string;
    [key: string]: any;
  } | null;
  reportedUser?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    [key: string]: any;
  } | null;
  reporter?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    [key: string]: any;
  } | null;
  resolvedBy?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export class ReportService {
  /**
   * 1. POST /report (with fallback /reports)
   * Create a new report
   * Validates target according to backend Zod refine:
   * - property reports require reportedPropertyId and omit reportedUserId
   * - other reports require reportedUserId and omit reportedPropertyId
   */
  static async createReport(payload: CreateReportPayload): Promise<ReportItem> {
    const cleanPayload: any = {
      reportedType: payload.reportedType,
      description: payload.description?.trim(),
      priority: payload.priority
        ? payload.priority.toLowerCase() === 'urgent'
          ? 'high'
          : payload.priority.toLowerCase()
        : 'medium',
    };

    if (payload.reportedType === 'property') {
      if (payload.reportedPropertyId) {
        cleanPayload.reportedPropertyId = payload.reportedPropertyId;
      }
    } else {
      if (payload.reportedUserId) {
        cleanPayload.reportedUserId = payload.reportedUserId;
      }
    }

    try {
      const res = await ApiClient.post<any>('/report', cleanPayload);
      return res?.data?.data || res?.data || res;
    } catch (e: any) {
      if (e?.status === 404) {
        const res = await ApiClient.post<any>('/reports', cleanPayload);
        return res?.data?.data || res?.data || res;
      }
      throw e;
    }
  }

  /**
   * 2. GET /report/my (with fallback /reports/my)
   * Get Current User Reports
   */
  static async getMyReports(): Promise<ReportItem[]> {
    try {
      const res = await ApiClient.get<any>('/report/my');
      const list = res?.data?.reports || res?.data?.data || res?.data || res?.reports || res;
      return Array.isArray(list) ? list : [];
    } catch (e: any) {
      if (e?.status === 404) {
        try {
          const res = await ApiClient.get<any>('/reports/my');
          const list = res?.data?.reports || res?.data?.data || res?.data || res?.reports || res;
          return Array.isArray(list) ? list : [];
        } catch {
          return [];
        }
      }
      return [];
    }
  }

  /**
   * 3. GET /report/:id (with fallback /reports/:id)
   * Get Report by ID
   */
  static async getReportById(id: string): Promise<ReportItem | null> {
    try {
      const res = await ApiClient.get<any>(`/report/${id}`);
      return res?.data?.data || res?.data?.report || res?.data || res?.report || res;
    } catch (e: any) {
      if (e?.status === 404) {
        const res = await ApiClient.get<any>(`/reports/${id}`);
        return res?.data?.data || res?.data?.report || res?.data || res?.report || res;
      }
      throw e;
    }
  }

  /**
   * 4. GET /report (with fallback /reports)
   * Get All Reports (Admin)
   */
  static async getAllReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    reportedType?: string;
    priority?: string;
  }): Promise<{
    data: ReportItem[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.reportedType) query.append('reportedType', params.reportedType);
    if (params?.priority) {
      const p = params.priority.toLowerCase() === 'urgent' ? 'high' : params.priority.toLowerCase();
      query.append('priority', p);
    }
    const queryStr = query.toString() ? `?${query.toString()}` : '';

    let res: any;
    try {
      res = await ApiClient.get<any>(`/report${queryStr}`);
    } catch (e: any) {
      if (e?.status === 404) {
        res = await ApiClient.get<any>(`/reports${queryStr}`);
      } else {
        throw e;
      }
    }

    const dataObj = res?.data || res;
    const list = Array.isArray(dataObj?.data)
      ? dataObj.data
      : Array.isArray(dataObj?.reports)
      ? dataObj.reports
      : Array.isArray(dataObj)
      ? dataObj
      : [];

    const total = dataObj?.meta?.total ?? dataObj?.total ?? list.length;
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const totalPages = dataObj?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));

    return {
      data: list,
      meta: dataObj?.meta || { total, page, limit, totalPages },
    };
  }

  /**
   * 5. PATCH /report/:id/priority (with fallback /reports/:id/priority)
   * Change Report Priority
   */
  static async changePriority(
    id: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string
  ): Promise<ReportItem> {
    const norm = priority.toLowerCase() === 'urgent' ? 'high' : priority.toLowerCase();
    try {
      const res = await ApiClient.patch<any>(`/report/${id}/priority`, { priority: norm });
      return res?.data?.data || res?.data || res;
    } catch (e: any) {
      if (e?.status === 404) {
        const res = await ApiClient.patch<any>(`/reports/${id}/priority`, { priority: norm });
        return res?.data?.data || res?.data || res;
      }
      throw e;
    }
  }

  /**
   * 6. PATCH /report/:id/resolve (with fallback /reports/:id/resolve)
   * Resolve Report with resolutionNotes
   */
  static async resolveReport(id: string, resolutionNotes?: string): Promise<ReportItem> {
    const notes =
      resolutionNotes && resolutionNotes.trim().length > 0
        ? resolutionNotes.trim()
        : 'تمت المراجعة والتسوية بنجاح';
    try {
      const res = await ApiClient.patch<any>(`/report/${id}/resolve`, { resolutionNotes: notes });
      return res?.data?.data || res?.data || res;
    } catch (e: any) {
      if (e?.status === 404) {
        const res = await ApiClient.patch<any>(`/reports/${id}/resolve`, { resolutionNotes: notes });
        return res?.data?.data || res?.data || res;
      }
      throw e;
    }
  }
}
