import { ApiClient } from './apiClient';
import type { User, UserProfile } from './authService';

export interface ProfileMeResponse {
  success?: boolean;
  message?: string;
  data?: any;
  user?: User;
  profile?: UserProfile;
}

export interface UpsertProfilePayload {
  gender?: 'MALE' | 'FEMALE';
  birthDate?: string; // YYYY-MM-DD
  nationality?: string;
  university?: string;
  faculty?: string;
  country?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
}

export class ProfileService {
  /**
   * Fetches current authenticated user and profile via GET /profile/me (with fallback to /profile).
   */
  static async getMyProfile(): Promise<any> {
    try {
      const res = await ApiClient.get<ProfileMeResponse>('/profile/me');
      return res?.data || res;
    } catch (e: any) {
      if (e?.status === 404 || e?.statusCode === 404) {
        const res = await ApiClient.get<ProfileMeResponse>('/profile');
        return res?.data || res;
      }
      throw e;
    }
  }

  /**
   * Updates user profile via PUT /profile (with fallback to PUT /profile/me and PATCH /profile).
   * Matches backend upsertProfileSchema.
   */
  static async updateProfile(data: UpsertProfilePayload | Record<string, any>): Promise<any> {
    try {
      const res = await ApiClient.put<any>('/profile', data);
      return res?.data || res;
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        try {
          const res = await ApiClient.put<any>('/profile/me', data);
          return res?.data || res;
        } catch (err2: any) {
          if (err2?.status === 404 || err2?.statusCode === 404) {
            const res = await ApiClient.patch<any>('/profile', data);
            return res?.data || res;
          }
          throw err2;
        }
      }
      throw err;
    }
  }

  /**
   * Uploads profile avatar via PATCH /profile/avatar (with fallback to POST /profile/avatar).
   */
  static async uploadAvatar(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await ApiClient.patch<any>('/profile/avatar', formData);
      return res?.data || res;
    } catch (err: any) {
      if (err?.status === 404 || err?.statusCode === 404) {
        const res = await ApiClient.post<any>('/profile/avatar', formData);
        return res?.data || res;
      }
      throw err;
    }
  }

  /**
   * Deletes profile avatar via DELETE /profile/avatar.
   */
  static async deleteAvatar(): Promise<any> {
    const res = await ApiClient.delete<any>('/profile/avatar');
    return res?.data || res;
  }

  /**
   * Fetches public profile for a specific user via GET /profile/:userId.
   */
  static async getPublicProfile(userId: string): Promise<any> {
    const res = await ApiClient.get<any>(`/profile/${userId}`);
    return res?.data || res;
  }
}
