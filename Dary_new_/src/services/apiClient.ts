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
  private static refreshPromise: Promise<boolean> | null = null;
  private static inFlightGetRequests = new Map<string, Promise<any>>();

  /**
   * Save tokens both in-memory and in localStorage for persistence.
   */
  static setTokens(accessToken?: string | null, refreshToken?: string | null) {
    if (accessToken) {
      this.accessToken = accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dary_access_token', accessToken);
      }
    }
    if (refreshToken) {
      this.refreshToken = refreshToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('dary_refresh_token', refreshToken);
      }
    }
  }

  /**
   * Clear all stored tokens.
   */
  static clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dary_access_token');
      localStorage.removeItem('dary_refresh_token');
    }
  }

  static getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('dary_access_token');
    }
    return this.accessToken;
  }

  static getRefreshToken(): string | null {
    if (!this.refreshToken && typeof window !== 'undefined') {
      this.refreshToken = localStorage.getItem('dary_refresh_token');
    }
    return this.refreshToken;
  }

  /**
   * Mutex lock for token refreshing.
   * If multiple concurrent requests receive 401, they will all wait for
   * this single execution rather than firing multiple refresh requests
   * (which would revoke single-use refresh tokens on the backend).
   */
  static async refreshAuth(): Promise<boolean> {
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
        this.clearTokens();
        return false;
      }

      const json = await res.json().catch(() => null);
      const newAccessToken = json?.data?.tokens?.accessToken;
      const newRefreshToken = json?.data?.tokens?.refreshToken;

      if (newAccessToken || newRefreshToken) {
        this.setTokens(newAccessToken, newRefreshToken);
      }

      return true;
    } catch {
      this.clearTokens();
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

    // Attach Bearer token as secondary / fallback transport alongside cookies
    const currentToken = this.getAccessToken();
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const timeoutMs = options.timeout ?? 12000;
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

    const isGet = (!customOptions.method || customOptions.method.toUpperCase() === 'GET') && data === undefined;
    const requestKey = isGet ? url : null;

    if (requestKey && this.inFlightGetRequests.has(requestKey)) {
      return this.inFlightGetRequests.get(requestKey) as Promise<T>;
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
            endpoint.includes('/auth/refresh-token') ||
            endpoint.includes('/auth/verify-otp') ||
            endpoint.includes('/auth/forget-password') ||
            endpoint.includes('/auth/reset-password');

          if (response.status === 401 && !isAuthEndpoint && !_retry) {
            const refreshed = await this.refreshAuth();
            if (refreshed) {
              // Re-try the exact original request once with new token
              return this.request<T>(endpoint, { ...options, _retry: true });
            } else {
              // Refresh failed permanently (token revoked / expired)
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:expired'));
              }
            }
          }

          throw new ApiError(message, code, response.status, json);
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
        if (requestKey) {
          this.inFlightGetRequests.delete(requestKey);
        }
        clearTimeout(timeoutId);
      }
    };

    const fetchPromise = executeRequest();
    if (requestKey) {
      this.inFlightGetRequests.set(requestKey, fetchPromise);
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
