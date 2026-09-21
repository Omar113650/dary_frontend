import { ApiClient } from './apiClient';
import type { User, UserProfile } from './authService';

export interface ProfileMeResponse {
  success?: boolean;
  message?: string;
  data?: any;
  user?: User;
  profile?: UserProfile;
}

export class ProfileService {
  /**
   * Fetches current authenticated user and profile via GET /profile/me.
   */
  static async getMyProfile(): Promise<any> {
    const res = await ApiClient.get<ProfileMeResponse>('/profile/me');
    // Defensive extraction
    const payload = res?.data || res;
    return payload;
  }

  /**
   * Updates user profile via PUT /profile/me.
   * NOTE: As per API requirements, this is isolated and only executed
   * with explicitly provided payload matching verified backend fields.
   */
  static async updateProfile(data: Record<string, any>): Promise<any> {
    return ApiClient.put<any>('/profile/me', data);
  }

  /**
   * Uploads profile avatar via PATCH /profile/avatar (multipart/form-data).
   */
  static async uploadAvatar(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    return ApiClient.patch<any>('/profile/avatar', formData);
  }

  /**
   * Deletes profile avatar via DELETE /profile/avatar.
   */
  static async deleteAvatar(): Promise<any> {
    return ApiClient.delete<any>('/profile/avatar');
  }

  /**
   * Fetches public profile for a specific user via GET /profile/:userId.
   */
  static async getPublicProfile(userId: string): Promise<any> {
    return ApiClient.get<any>(`/profile/${userId}`);
  }
}
