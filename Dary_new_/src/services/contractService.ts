import { ApiClient } from './apiClient';

export interface ContractItem {
  id: string;
  bookingId: string;
  contractNumber?: string;
  draftPdfUrl?: string;
  tenantSignedPdfUrl?: string;
  tenantSignedAt?: string;
  ownerSignedPdfUrl?: string;
  ownerSignedAt?: string;
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'ACTIVE' | 'CANCELLED' | string;
  reviewedByAdminId?: string;
  createdAt?: string;
  updatedAt?: string;
  booking?: any;
  [key: string]: any;
}

export class ContractService {
  /**
   * 1. POST /contract
   * Create a new contract
   */
  static async createContract(bookingId: string, contractNumber?: string): Promise<any> {
    const res = await ApiClient.post<any>('/contract', { bookingId, contractNumber });
    return res?.data || res;
  }

  /**
   * 2. PATCH /contract/:id/send
   * Send Contract PDF (multipart/form-data)
   */
  static async sendContract(id: string, pdfFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    const res = await ApiClient.patch<any>(`/contract/${id}/send`, formData);
    return res?.data || res;
  }

  /**
   * 3. PATCH /contract/:id/tenant-sign
   * Tenant Sign Contract (multipart/form-data)
   */
  static async tenantSignContract(id: string, pdfFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    const res = await ApiClient.patch<any>(`/contract/${id}/tenant-sign`, formData);
    return res?.data || res;
  }

  /**
   * 4. PATCH /contract/:id/owner-sign
   * Owner Sign Contract (multipart/form-data)
   */
  static async ownerSignContract(id: string, pdfFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    const res = await ApiClient.patch<any>(`/contract/${id}/owner-sign`, formData);
    return res?.data || res;
  }

  /**
   * 5. GET /contract/:id
   * Get Contract by ID
   */
  static async getContract(id: string): Promise<ContractItem | null> {
    const res = await ApiClient.get<any>(`/contract/${id}`);
    return res?.data?.contract || res?.data || res?.contract || res;
  }

  /**
   * 6. GET /contract/booking/:bookingId
   * Get Contract By Booking ID
   */
  static async getContractByBooking(bookingId: string): Promise<ContractItem | null> {
    const res = await ApiClient.get<any>(`/contract/booking/${bookingId}`);
    return res?.data?.contract || res?.data || res?.contract || res;
  }

  /**
   * 7. PATCH /contract/:id/activate
   * Activate Contract
   */
  static async activateContract(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/contract/${id}/activate`);
    return res?.data || res;
  }

  /**
   * 8. GET /contract
   * Get All Contracts (Admin)
   */
  static async getAllContracts(params?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/contract${queryStr}`);
    return res?.data || res;
  }

  /**
   * 9. PATCH /contract/:id/cancel
   * Cancel Contract
   */
  static async cancelContract(id: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/contract/${id}/cancel`);
    return res?.data || res;
  }
}
