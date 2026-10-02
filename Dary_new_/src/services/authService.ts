import { ApiClient } from './apiClient';

export interface UserRole {
  role?: {
    name?: string;
  };
  name?: string;
}

export interface UserProfile {
  id?: string;
  userId?: string;
  gender?: string;
  birthDate?: string;
  nationality?: string;
  university?: string;
  faculty?: string;
  country?: string;
  city?: string;
  address?: string;
  bio?: string;
  [key: string]: any;
}

export interface User {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsappPhone?: string;
  avatar?: string | null;
  role?: string;
  roles?: (string | UserRole)[];
  userRoles?: UserRole[];
  status?: string;
  isVerified?: boolean;
  profile?: UserProfile | null;
  createdAt?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  email?: string;
  phone?: string;
  identifier?: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email?: string;
  password: string;
  phone: string;
  whatsappPhone?: string;
  roles: 'tenant' | 'owner';
}

export interface VerifyOtpData {
  email: string;
  otp: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  data?: {
    user?: User;
    [key: string]: any;
  };
  user?: User;
}

export class AuthService {
  /**
   * 1. POST /auth/login
   * Body: { email?, phone?, password }
   * Backend verifies ACTIVE status, deletes old refresh tokens, persists 1 hashed refreshToken (7d),
   * and returns/sets accessToken (15m) + refreshToken (7d).
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const rawIdentifier = (
      credentials.identifier ||
      credentials.email ||
      credentials.phone ||
      ''
    ).trim();

    const isEmail = rawIdentifier.includes('@');
    const cleanEmail = isEmail ? rawIdentifier.toLowerCase() : undefined;
    let cleanPhone = !isEmail
      ? rawIdentifier.replace(/\s+/g, '')
      : credentials.phone?.trim().replace(/\s+/g, '');

    if (cleanPhone && /^01[0125]\d{8}$/.test(cleanPhone)) {
      cleanPhone = `+2${cleanPhone}`;
    }

    // Format phone into a standard valid email format for `email` field so strict backend
    // validation middlewares (requiring a valid email string) allow the request through to loginUser
    const syntheticPhoneEmail = cleanPhone
      ? `phone_${cleanPhone.startsWith('+') ? `plus_${cleanPhone.slice(1)}` : cleanPhone}@dary.com`
      : undefined;

    const payload: Record<string, string> = {
      email: cleanEmail || syntheticPhoneEmail || rawIdentifier,
      password: credentials.password,
    };
    if (cleanPhone) {
      payload.phone = cleanPhone;
    }

    const res = await ApiClient.post<AuthResponse>('/auth/login', payload);
    const raw = res as any;
    const tokens = raw?.data?.tokens || raw?.tokens;
    const accessToken = tokens?.accessToken || raw?.data?.accessToken || raw?.accessToken;
    const refreshToken = tokens?.refreshToken || raw?.data?.refreshToken || raw?.refreshToken;
    if (accessToken || refreshToken) {
      ApiClient.setTokens(accessToken, refreshToken);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dary_logged_out');
      } catch {}
    }
    return res;
  }

  /**
   * 2. POST /auth/register
   * Body: { firstName, lastName, email?, password, phone, whatsappPhone?, roles }
   */
  static async register(data: RegisterData): Promise<any> {
    const payload: any = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      password: data.password,
      phone: data.phone.trim(),
      roles: data.roles,
    };
    if (data.email && data.email.trim()) {
      payload.email = data.email.trim().toLowerCase();
    }
    if (data.whatsappPhone && data.whatsappPhone.trim()) {
      payload.whatsappPhone = data.whatsappPhone.trim();
    }
    return ApiClient.post<any>('/auth/register', payload);
  }

  /**
   * 3. POST /auth/verify-otp
   * Body: { email, otp, type: "EMAIL_VERIFICATION" }
   */
  static async verifyOtp(data: VerifyOtpData & { type?: string; code?: string }): Promise<any> {
    const otpValue = (data.otp || data.code || '').trim();
    return ApiClient.post<any>('/auth/verify-otp', {
      email: data.email.trim().toLowerCase(),
      otp: otpValue,
      type: data.type || 'EMAIL_VERIFICATION',
    });
  }

  /**
   * 4. POST /auth/resend-otp
   * Body: { email, type: "EMAIL_VERIFICATION" }
   */
  static async resendOtp(email: string, type = 'EMAIL_VERIFICATION'): Promise<any> {
    return ApiClient.post<any>('/auth/resend-otp', {
      email: email.trim().toLowerCase(),
      type,
    });
  }

  /**
   * 5. POST /auth/logout
   * Uses optionalAuthMiddleware on backend so logout succeeds even if the 15m accessToken expired.
   * Permanently deletes the user's refreshToken row (deleteMany) and clears auth cookies.
   */
  static async logout(): Promise<void> {
    try {
      const refreshToken = ApiClient.getRefreshToken();
      await ApiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch (err) {
      console.warn('[AuthService] Logout request warning:', err);
    } finally {
      ApiClient.clearTokens();
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('dary_user');
          localStorage.setItem('dary_logged_out', 'true');
        } catch {}
      }
    }
  }

  /**
   * 6. POST /auth/refresh-token
   * Rotates both accessToken (15m) and refreshToken (7d) in-place on the single DB row.
   */
  static async refreshToken(): Promise<boolean> {
    return ApiClient.refreshAuth();
  }

  /**
   * 7. GET /profile/me
   * Fetches the current authenticated user profile.
   */
  static async getMe(): Promise<User> {
    const res = await ApiClient.get<any>('/profile/me');
    const profile = res?.data?.profile || res?.profile || res?.data || res;
    const user = profile?.user || profile;

    const userRoles = user?.userRoles || profile?.userRoles || [];
    const extractedRoles: string[] = userRoles
      .map((ur: any) => ur?.role?.name || ur?.name || (typeof ur === 'string' ? ur : null))
      .filter(Boolean);

    const primaryRole =
      extractedRoles.includes('super_admin') ? 'super_admin' :
      extractedRoles.includes('admin') ? 'admin' :
      extractedRoles.includes('owner') ? 'owner' :
      extractedRoles.includes('tenant') ? 'tenant' :
      user?.role || profile?.role || 'tenant';

    return {
      id: user?.id || profile?.userId,
      ...user,
      profile: profile,
      role: primaryRole,
      roles: extractedRoles.length > 0 ? extractedRoles : (user?.roles || [primaryRole]),
      userRoles,
    } as User;
  }

  /**
   * 8. POST /auth/forget-password
   * Body: { email }
   */
  static async forgotPassword(email: string): Promise<any> {
    return ApiClient.post<any>('/auth/forget-password', {
      email: email.trim().toLowerCase(),
    });
  }

  /**
   * 9. POST /auth/reset-password
   * Body: { userId, resetToken, newPassword }
   * Backend deletes user's refreshToken (deleteMany) and invalidates session cache immediately.
   */
  static async resetPassword(data: {
    userId: string;
    resetToken: string;
    newPassword: string;
  }): Promise<any> {
    const res = await ApiClient.post<any>('/auth/reset-password', {
      userId: data.userId.trim(),
      resetToken: data.resetToken.trim(),
      newPassword: data.newPassword,
    });
    // Backend revokes/deletes all refresh tokens on password reset — clear local session state
    ApiClient.clearTokens();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dary_user');
      } catch {}
    }
    return res;
  }

  /**
   * 10. DELETE /auth/delete
   * Deletes the authenticated user's own account, removes refreshToken in DB, and clears cache.
   */
  static async deleteAccount(): Promise<any> {
    const res = await ApiClient.delete<any>('/auth/delete');
    ApiClient.clearTokens();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dary_user');
        localStorage.setItem('dary_logged_out', 'true');
      } catch {}
    }
    return res;
  }
}
