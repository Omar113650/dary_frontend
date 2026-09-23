import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/authService';
import { ApiClient } from '../services/apiClient';
import type { User, LoginCredentials } from '../services/authService';

export interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isTenant: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function extractUserRole(user: any): string | null {
  if (!user) return null;
  const u = user.user || user.profile?.user || user;

  // Collect all possible role strings from the user object
  const foundRoles: string[] = [];
  if (typeof u.role === 'string' && u.role) foundRoles.push(u.role.toLowerCase());
  if (typeof user.role === 'string' && user.role) foundRoles.push(user.role.toLowerCase());

  const rolesArr = u.roles || user.roles || u.userRoles || user.userRoles;
  if (Array.isArray(rolesArr)) {
    for (const r of rolesArr) {
      if (typeof r === 'string' && r) {
        foundRoles.push(r.toLowerCase());
      } else if (r?.role?.name) {
        foundRoles.push(r.role.name.toLowerCase());
      } else if (r?.name) {
        foundRoles.push(r.name.toLowerCase());
      }
    }
  }

  // Check priority strictly: super_admin -> admin -> owner -> tenant
  if (foundRoles.some((r) => r === 'super_admin' || r === 'superadmin')) return 'super_admin';
  if (foundRoles.some((r) => r === 'admin')) return 'admin';
  if (foundRoles.some((r) => r === 'owner' || r === 'landlord')) return 'owner';
  if (foundRoles.some((r) => r === 'tenant' || r === 'student' || r === 'user')) return 'tenant';

  return 'tenant';
}

export function isUserSuperAdmin(user: any): boolean {
  if (!user) return false;
  const role = extractUserRole(user);
  return role === 'super_admin';
}

export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  const role = extractUserRole(user);
  return role === 'super_admin' || role === 'admin';
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('dary_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem('dary_user');
      return cached ? extractUserRole(JSON.parse(cached)) : null;
    } catch {
      return null;
    }
  });

  // Fast start: if no token exists, or if user is already cached, don't show full-page blocking spinner
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('dary_access_token');
    const cached = localStorage.getItem('dary_user');
    // If no token, user is definitely guest -> don't block
    if (!token) return false;
    // If we have both token and cached user, render instantly! (Revalidate in background)
    if (cached) return false;
    // Token exists but no cached profile -> need to load
    return true;
  });

  const saveUserLocally = (userData: User | null) => {
    if (typeof window === 'undefined') return;
    if (userData && userData.id) {
      try {
        localStorage.setItem('dary_user', JSON.stringify(userData));
      } catch {}
    } else {
      try {
        localStorage.removeItem('dary_user');
      } catch {}
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const userData = await AuthService.getMe();
      if (userData && userData.id) {
        setUser(userData);
        setRole(extractUserRole(userData));
        saveUserLocally(userData);
      } else {
        setUser(null);
        setRole(null);
        saveUserLocally(null);
      }
    } catch (err: any) {
      // If server returned 401 or 403, or invalid session, clear local storage immediately
      if (err?.status === 401 || err?.status === 403) {
        setUser(null);
        setRole(null);
        saveUserLocally(null);
        ApiClient.clearTokens();
      } else {
        const token = typeof window !== 'undefined' ? localStorage.getItem('dary_access_token') : null;
        if (!token) {
          setUser(null);
          setRole(null);
          saveUserLocally(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleExpired = () => {
      setUser(null);
      setRole(null);
      saveUserLocally(null);
      ApiClient.clearTokens();
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => {
      window.removeEventListener('auth:expired', handleExpired);
    };
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials): Promise<User | null> => {
    setIsLoading(true);
    try {
      const res = await AuthService.login(credentials);
      // Attempt to load full user details
      let authenticatedUser: User | null = res?.data?.user || res?.user || null;
      if (!authenticatedUser || !authenticatedUser.id) {
        try {
          authenticatedUser = await AuthService.getMe();
        } catch {
          // getMe fallback
        }
      }
      if (authenticatedUser && authenticatedUser.id) {
        setUser(authenticatedUser);
        setRole(extractUserRole(authenticatedUser));
        saveUserLocally(authenticatedUser);
      } else {
        await refreshUser();
      }
      return authenticatedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
    } finally {
      setUser(null);
      setRole(null);
      saveUserLocally(null);
      setIsLoading(false);
    }
  };

  const isSuperAdmin = isUserSuperAdmin(user) || role === 'super_admin';
  const isAdmin = isSuperAdmin || isUserAdmin(user) || role === 'admin';
  const isOwner = !isAdmin && (role === 'owner' || role === 'landlord');
  const isTenant = !isAdmin && !isOwner;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        isTenant,
        isOwner,
        isAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
