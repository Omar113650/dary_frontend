import { ApiClient } from './apiClient';

export interface CreateTicketPayload {
  category: string;
  subject: string;
  description: string;
}

export interface SupportTicketItem {
  id: string;
  userId?: string;
  assignedAdminId?: string | null;
  category: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ARCHIVED' | 'CLOSED' | string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  user?: any;
  assignedAdmin?: any;
  messages?: any[];
  [key: string]: any;
}

export interface TicketMessageItem {
  id: string;
  ticketId?: string;
  senderId?: string;
  senderRole?: string;
  senderName?: string;
  message?: string;
  content?: string;
  createdAt?: string;
  attachments?: Array<{ url: string; type?: string; publicId?: string } | any>;
  sender?: any;
  [key: string]: any;
}

export class SupportTicketService {
  /**
   * 1. POST /support-ticket
   * Create Ticket
   */
  static async createTicket(payload: CreateTicketPayload): Promise<any> {
    const res = await ApiClient.post<any>('/support-ticket', payload);
    return res?.data || res;
  }

  /**
   * 2. GET /support-ticket/my
   * Get Current User Tickets
   */
  static async getMyTickets(params?: { page?: number; limit?: number }): Promise<SupportTicketItem[]> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    const res = await ApiClient.get<any>(`/support-ticket/my${queryStr}`);
    const list = res?.data?.tickets || res?.data || res?.tickets || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 3. GET /support-ticket/:id
   * Get Ticket by ID
   */
  static async getTicketById(id: string): Promise<SupportTicketItem | null> {
    const res = await ApiClient.get<any>(`/support-ticket/${id}`);
    return res?.data?.ticket || res?.data || res?.ticket || res;
  }

  /**
   * 4. GET /support-ticket (or fallback /tickets, /dashboard/tickets)
   * Get All Tickets (Admin)
   */
  static async getAllTickets(params?: { page?: number; limit?: number; status?: string; category?: string }): Promise<any> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    const queryStr = query.toString() ? `?${query.toString()}` : '';
    try {
      const res = await ApiClient.get<any>(`/support-ticket${queryStr}`);
      return res?.data?.tickets || res?.data?.items || res?.data || res?.tickets || res;
    } catch (e: any) {
      if (e?.status === 404) {
        try {
          const res = await ApiClient.get<any>(`/tickets${queryStr}`);
          return res?.data?.tickets || res?.data?.items || res?.data || res?.tickets || res;
        } catch {
          const res = await ApiClient.get<any>(`/dashboard/tickets${queryStr}`);
          return res?.data?.tickets || res?.data?.items || res?.data || res?.tickets || res;
        }
      }
      throw e;
    }
  }

  /**
   * 4b. GET ticket messages (thread)
   */
  static async getTicketMessages(ticketId: string): Promise<TicketMessageItem[]> {
    try {
      const res = await ApiClient.get<any>(`/support-ticket/${ticketId}`);
      const data = res?.data?.ticket?.messages || res?.data?.messages || res?.ticket?.messages || res?.messages || res?.data || res;
      return Array.isArray(data) ? data : [];
    } catch {
      try {
        const res = await ApiClient.get<any>(`/tickets/${ticketId}`);
        const data = res?.data?.ticket?.messages || res?.data?.messages || res?.ticket?.messages || res?.messages || res?.data || res;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  }

  /**
   * 5. POST /support-ticket/:id/messages
   * User/Admin Send Message with optional attachments
   */
  static async sendMessage(ticketId: string, message: string, attachments?: File[]): Promise<any> {
    const formData = new FormData();
    if (message) formData.append('message', message);
    if (attachments && attachments.length > 0) {
      attachments.forEach((file) => formData.append('attachments', file));
    }
    try {
      const res = await ApiClient.post<any>(`/support-ticket/${ticketId}/messages`, formData);
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404) {
        const res = await ApiClient.post<any>(`/tickets/${ticketId}/messages`, formData);
        return res?.data || res;
      }
      throw e;
    }
  }

  /**
   * 6. PATCH /support-ticket/:id/status
   * Update Ticket Status (OPEN, INVESTIGATING, RESOLVED, ARCHIVED, CLOSED)
   */
  static async updateTicketStatus(id: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ARCHIVED' | 'CLOSED' | string): Promise<any> {
    try {
      const res = await ApiClient.patch<any>(`/support-ticket/${id}/status`, { status });
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404) {
        const res = await ApiClient.patch<any>(`/tickets/${id}/status`, { status });
        return res?.data || res;
      }
      throw e;
    }
  }
}
