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
  reportedType: string;
  reportedPropertyId?: string | null;
  reportedUserId?: string | null;
  description?: string | null;
  priority: 'low' | 'medium' | 'high' | string;
  status: 'PENDING' | 'RESOLVED' | string;
  resolvedById?: string | null;
  resolutionNotes?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
  reportedProperty?: any;
  reporter?: any;
  resolvedBy?: any;
  [key: string]: any;
}

export class ReportService {
  /**
   * 1. POST /report
   * Create a new report
   */
  static async createReport(payload: CreateReportPayload): Promise<any> {
    const res = await ApiClient.post<any>('/report', payload);
    return res?.data || res;
  }

  /**
   * 2. GET /report/my
   * Get My Reports
   */
  static async getMyReports(): Promise<ReportItem[]> {
    const res = await ApiClient.get<any>('/report/my');
    const list = res?.data?.reports || res?.data || res?.reports || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 3. GET /report/:id
   * Get Report by ID
   */
  static async getReportById(id: string): Promise<ReportItem | null> {
    const res = await ApiClient.get<any>(`/report/${id}`);
    return res?.data?.report || res?.data || res?.report || res;
  }

  /**
   * 4. GET /report
   * Get All Reports for Admin
   */
  static async getAllReports(params?: {
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
    const res = await ApiClient.get<any>(`/report${queryStr}`);
    return res?.data || res;
  }

  /**
   * 5. PATCH /report/:id/priority
   * Change Report Priority
   */
  static async changePriority(id: string, priority: 'low' | 'medium' | 'high' | 'urgent' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string): Promise<any> {
    const norm = priority.toLowerCase() === 'urgent' ? 'high' : priority.toLowerCase();
    const res = await ApiClient.patch<any>(`/report/${id}/priority`, { priority: norm });
    return res?.data || res;
  }

  /**
   * 6. PATCH /report/:id/resolve
   * Resolve Report
   */
  static async resolveReport(id: string, resolutionNotes?: string): Promise<any> {
    const notes = resolutionNotes && resolutionNotes.trim().length > 0 ? resolutionNotes.trim() : 'تمت المراجعة والتسوية بنجاح';
    const res = await ApiClient.patch<any>(`/report/${id}/resolve`, { resolutionNotes: notes });
    return res?.data || res;
  }
}
