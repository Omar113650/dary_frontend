export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export interface RequestOptions extends RequestInit {
  data?: any;
  params?: Record<string, any> | URLSearchParams;
  _retry?: boolean;
  timeout?: number;
}

export class ApiError extends Error {
  code: string;
  status: number;
  data?: any;

  constructor(message: string, code = 'API_ERROR', status = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  private static accessToken: string | null =
    typeof window !== 'undefined' ? localStorage.getItem('dary_access_token') : null;
  private static refreshToken: string | null =
    typeof window !== 'undefined' ? localStorage.getItem('dary_refresh_token') : null;
  private static clockSkewSeconds = 0;
  private static lastRefreshTimestamp = 0;
  private static sessionDead = false;
  private static refreshPromise: Promise<boolean> | null = null;
  private static inFlightGetRequests = new Map<string, Promise<any>>();
  private static inFlightMutations = new Map<string, Promise<any>>();
  private static recentMutations = new Map<string, { result: any; timestamp: number }>();

  private static decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  /**
   * Save tokens both in-memory and in localStorage for persistence.
   */
  static setTokens(accessToken?: string | null, refreshToken?: string | null) {
    if (accessToken || refreshToken) {
      this.sessionDead = false;
    }
    if (accessToken) {
      this.accessToken = accessToken;
      const payload = this.decodeJwtPayload(accessToken);
      if (payload?.iat) {
        const clientNow = Math.floor(Date.now() / 1000);
        this.clockSkewSeconds = payload.iat - clientNow;
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dary_access_token', accessToken);
          localStorage.removeItem('dary_logged_out');
        } catch {}
      }
    }
    if (refreshToken) {
      this.refreshToken = refreshToken;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('dary_refresh_token', refreshToken);
          localStorage.removeItem('dary_logged_out');
        } catch {}
      }
    }
  }

  /**
   * Clear all stored tokens.
   */
  static clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.lastRefreshTimestamp = 0;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('dary_access_token');
        localStorage.removeItem('dary_refresh_token');
      } catch {}
    }
  }

  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dary_access_token');
        if (stored !== null) {
          this.accessToken = stored;
          return stored;
        }
      } catch {}
    }
    return this.accessToken;
  }

  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dary_refresh_token');
        if (stored !== null) {
          this.refreshToken = stored;
          return stored;
        }
      } catch {}
    }
    return this.refreshToken;
  }

  /**
   * Optimization helper: decodes JWT payload to check if exp timestamp is within bufferSeconds.
   * Accounts for client/server clock skew and avoids rapid back-to-back refresh loops.
   */
  static isAccessTokenExpired(token?: string | null, bufferSeconds = 30): boolean {
    const t = token || this.getAccessToken();
    if (!t) return true;
    // Prevent rapid proactive refresh loops if a token was just refreshed in the last 10 seconds
    if (Date.now() - this.lastRefreshTimestamp < 10_000) {
      return false;
    }
    const payload = this.decodeJwtPayload(t);
    if (!payload) return true;
    if (!payload.exp) return false;
    const adjustedNow = Math.floor(Date.now() / 1000) + this.clockSkewSeconds;
    return payload.exp <= adjustedNow + bufferSeconds;
  }

  /**
   * Mutex lock for token refreshing.
   * If multiple concurrent requests receive 401, they will all wait for
   * this single execution rather than firing multiple refresh requests
   * (which would invalidate the single rotated refresh_tokens row on the backend).
   */
  static async refreshAuth(): Promise<boolean> {
    // Do not spam /auth/refresh-token if refresh already failed or user explicitly logged out
    if (
      this.sessionDead ||
      (typeof window !== 'undefined' && localStorage.getItem('dary_logged_out') === 'true')
    ) {
      return false;
    }

    // If another request or tab just rotated the token within the last 5 seconds and it's valid, reuse it
    const currentAccess = this.getAccessToken();
    if (
      currentAccess &&
      Date.now() - this.lastRefreshTimestamp < 5_000 &&
      !this.isAccessTokenExpired(currentAccess, 5)
    ) {
      return true;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.executeRefresh();
    }
    return this.refreshPromise;
  }

  private static async executeRefresh(): Promise<boolean> {
    try {
      const payload: Record<string, any> = {};
      const storedRefreshToken = this.getRefreshToken();
      if (storedRefreshToken) {
        payload.refreshToken = storedRefreshToken;
      }

      const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Only wipe tokens if the server explicitly rejected the refresh token (401 / 403)
        if (res.status === 401 || res.status === 403) {
          this.sessionDead = true;
          this.clearTokens();
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('dary_logged_out', 'true');
            } catch {}
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
        }
        return false;
      }

      const json = await res.json().catch(() => null);
      const tokens = json?.data?.tokens || json?.tokens;
      const newAccessToken = tokens?.accessToken || json?.data?.accessToken || json?.accessToken;
      const newRefreshToken = tokens?.refreshToken || json?.data?.refreshToken || json?.refreshToken;

      this.sessionDead = false;
      if (newAccessToken || newRefreshToken) {
        this.setTokens(newAccessToken, newRefreshToken);
      }
      this.lastRefreshTimestamp = Date.now();

      // Update cached user roles/status if returned by refresh endpoint
      const refreshedUser = json?.data?.user || json?.user;
      if (refreshedUser?.id && typeof window !== 'undefined') {
        try {
          const existingRaw = localStorage.getItem('dary_user');
          const existingUser = existingRaw ? JSON.parse(existingRaw) : {};
          const primaryRole =
            refreshedUser.role ||
            (Array.isArray(refreshedUser.roles) ? refreshedUser.roles[0] : undefined) ||
            existingUser.role;
          localStorage.setItem(
            'dary_user',
            JSON.stringify({
              ...existingUser,
              ...refreshedUser,
              role: primaryRole,
            })
          );
        } catch {
          // Ignore storage errors
        }
      }

      return true;
    } catch {
      // Network error during refresh — do not wipe valid tokens
      return false;
    } finally {
      this.refreshPromise = null;
    }
  }

  static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { data, params, headers: customHeaders, _retry = false, ...customOptions } = options;

    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const headers = new Headers(customHeaders);

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Protected endpoint check - don't refresh on auth-specific routes
    const isAuthEndpoint =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/register') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/refresh-token') ||
      endpoint.includes('/auth/verify-otp') ||
      endpoint.includes('/auth/resend-otp') ||
      endpoint.includes('/auth/forget-password') ||
      endpoint.includes('/auth/reset-password');

    // Attach Bearer token as secondary / fallback transport alongside cookies
    let currentToken = this.getAccessToken();
    let proactiveRefreshAttempted = false;
    if (currentToken && !isAuthEndpoint && !_retry && this.isAccessTokenExpired(currentToken, 30)) {
      proactiveRefreshAttempted = true;
      await this.refreshAuth();
      currentToken = this.getAccessToken();
    }

    const tokenUsedForRequest = currentToken;
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const timeoutMs = options.timeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    const config: RequestInit = {
      ...customOptions,
      credentials: 'include',
      headers,
      signal: customOptions.signal || controller.signal,
    };

    if (data !== undefined) {
      if (isFormData) {
        config.body = data;
      } else if (typeof data === 'string') {
        config.body = data;
      } else {
        config.body = JSON.stringify(data);
      }
    }

    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams =
        params instanceof URLSearchParams
          ? params
          : new URLSearchParams(
              Object.entries(params)
                .filter(([_, v]) => v !== undefined && v !== null)
                .map(([k, v]) => [k, String(v)])
            );
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const method = (customOptions.method || 'GET').toUpperCase();
    const isGet = method === 'GET' && data === undefined;
    const getRequestKey = isGet ? url : null;

    if (getRequestKey && this.inFlightGetRequests.has(getRequestKey)) {
      return this.inFlightGetRequests.get(getRequestKey) as Promise<T>;
    }

    // Mutating request signature for deduplication (POST, PUT, PATCH, DELETE)
    let mutationKey: string | null = null;
    if (!isGet) {
      let serializedData = '';
      if (isFormData) {
        serializedData = 'form-data';
      } else if (typeof data === 'string') {
        serializedData = data;
      } else if (data) {
        try {
          serializedData = JSON.stringify(data);
        } catch {
          serializedData = String(data);
        }
      }
      mutationKey = `${method}:${url}:${serializedData}`;

      // A: If exact same mutation is ALREADY running (in-flight), return the running promise!
      // This immediately stops double submissions across the entire application.
      if (this.inFlightMutations.has(mutationKey)) {
        return this.inFlightMutations.get(mutationKey) as Promise<T>;
      }

      // B: If exact same mutation completed < 600ms ago, return recent result (prevents rapid double-clicks)
      const recent = this.recentMutations.get(mutationKey);
      if (recent && Date.now() - recent.timestamp < 600) {
        return Promise.resolve(recent.result as T);
      }
    }

    const executeRequest = async (): Promise<T> => {
      try {
        const response = await fetch(url, config);
        const json = await response.json().catch(() => null);

        if (!response.ok) {
          let message =
            json?.message ||
            json?.error?.message ||
            response.statusText ||
            'Request failed';
          
          if (json?.errors && Array.isArray(json.errors) && json.errors.length > 0) {
            const details = json.errors.map((e: any) => e.message || `${e.path || e.field}: ${e.message}`).join(', ');
            message = `${message}: ${details}`;
          } else if (json?.details) {
            message = `${message}: ${typeof json.details === 'string' ? json.details : JSON.stringify(json.details)}`;
          }

          const code = json?.code || json?.error?.code || 'HTTP_ERROR';

          // Protected endpoint check - don't refresh on auth-specific routes
          const isAuthEndpoint =
            endpoint.includes('/auth/login') ||
            endpoint.includes('/auth/register') ||
            endpoint.includes('/auth/logout') ||
            endpoint.includes('/auth/refresh-token') ||
            endpoint.includes('/auth/verify-otp') ||
            endpoint.includes('/auth/resend-otp') ||
            endpoint.includes('/auth/forget-password') ||
            endpoint.includes('/auth/reset-password');

          // Check if backend authMiddleware rejected user due to immediate MemoryCache status update (SUSPENDED / INACTIVE / DELETED)
          const lowerMsg = String(message || '').toLowerCase();
          const lowerCode = String(code || '').toLowerCase();
          const isAccountSuspendedOrDeleted =
            !isAuthEndpoint &&
            (response.status === 403 || response.status === 401) &&
            (lowerMsg.includes('suspended') ||
              lowerMsg.includes('inactive') ||
              lowerMsg.includes('disabled') ||
              lowerMsg.includes('banned') ||
              lowerMsg.includes('user not found') ||
              lowerMsg.includes('account deleted') ||
              lowerMsg.includes('معلق') ||
              lowerMsg.includes('موقوف') ||
              lowerMsg.includes('محظور') ||
              lowerMsg.includes('غير نشط') ||
              lowerCode.includes('suspended') ||
              lowerCode.includes('account_inactive') ||
              lowerCode.includes('user_suspended') ||
              json?.data?.status === 'SUSPENDED' ||
              json?.data?.status === 'INACTIVE');

          if (isAccountSuspendedOrDeleted) {
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('auth:expired', {
                  detail: { reason: 'suspended', message },
                })
              );
            }
            throw new ApiError(message, code, response.status, json);
          }

          if (response.status === 401 && !isAuthEndpoint && !_retry) {
            // If another concurrent request already rotated the single refresh_tokens row while this request was in-flight,
            // reuse the newly stored accessToken immediately without hitting /auth/refresh-token a second time.
            const latestToken = this.getAccessToken();
            if (
              latestToken &&
              latestToken !== tokenUsedForRequest &&
              !this.isAccessTokenExpired(latestToken, 5)
            ) {
              return this.request<T>(endpoint, { ...options, _retry: true });
            }

            // Only attempt refresh if proactive refresh didn't already just fail on this exact request
            const refreshed = proactiveRefreshAttempted ? false : await this.refreshAuth();
            if (refreshed) {
              // Re-try the exact original request once with new token
              return this.request<T>(endpoint, { ...options, _retry: true });
            } else {
              // Refresh failed permanently (token deleted / expired in DB)
              this.clearTokens();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:expired'));
              }
            }
          }

          throw new ApiError(message, code, response.status, json);
        }

        // Cache recent successful mutation for 600ms debounce
        if (mutationKey) {
          this.recentMutations.set(mutationKey, { result: json, timestamp: Date.now() });
          setTimeout(() => {
            if (mutationKey) this.recentMutations.delete(mutationKey);
          }, 1000);
        }

        return json as T;
      } catch (error: any) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error?.name === 'AbortError') {
          throw new ApiError(
            'انتهت مهلة انتظار الخادم. يرجى المحاولة مرة أخرى.',
            'TIMEOUT_ERROR',
            408
          );
        }
        throw new ApiError(
          error?.message || 'Network error occurred. Please check your connection.',
          'NETWORK_ERROR',
          0
        );
      } finally {
        if (getRequestKey) {
          this.inFlightGetRequests.delete(getRequestKey);
        }
        if (mutationKey) {
          this.inFlightMutations.delete(mutationKey);
        }
        clearTimeout(timeoutId);
      }
    };

    const fetchPromise = executeRequest();
    if (getRequestKey) {
      this.inFlightGetRequests.set(getRequestKey, fetchPromise);
    }
    if (mutationKey) {
      this.inFlightMutations.set(mutationKey, fetchPromise);
    }
    return fetchPromise;
  }

  static get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', data });
  }

  static put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', data });
  }

  static patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', data });
  }

  static delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
