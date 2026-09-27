import { ApiClient } from './apiClient';

export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermissionJoin {
  roleId?: string;
  permissionId: string;
  permission: Permission;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  rolePermissions?: RolePermissionJoin[];
  createdAt?: string;
  updatedAt?: string;
}

export class RbacService {
  /**
   * GET /roles
   * Retrieves all roles with their associated permissions
   */
  static async getRoles(): Promise<RoleItem[]> {
    try {
      const res = await ApiClient.get<any>('/roles');
      const list = res?.data?.data || res?.data || res;
      return Array.isArray(list) ? list : [];
    } catch (err: any) {
      // Fallback for different API wrappers
      if (err?.status === 404) {
        const res = await ApiClient.get<any>('/role');
        const list = res?.data?.data || res?.data || res;
        return Array.isArray(list) ? list : [];
      }
      throw err;
    }
  }

  /**
   * POST /roles
   * Creates a new system role
   */
  static async createRole(data: { name: string; description?: string }): Promise<RoleItem> {
    const res = await ApiClient.post<any>('/roles', data);
    return res?.data?.data || res?.data || res;
  }

  /**
   * POST /roles/assign
   * Assigns a role to a user
   */
  static async assignRole(userId: string, roleName: string): Promise<{ message: string }> {
    const res = await ApiClient.post<any>('/roles/assign', { userId, roleName });
    return res?.data || res;
  }

  /**
   * POST /roles/remove
   * Removes a role from a user
   */
  static async removeRole(userId: string, roleName: string): Promise<{ message: string }> {
    const res = await ApiClient.post<any>('/roles/remove', { userId, roleName });
    return res?.data || res;
  }

  /**
   * GET /roles/user/:userId
   * Retrieves role names for a user
   */
  static async getUserRoles(userId: string): Promise<string[]> {
    const res = await ApiClient.get<any>(`/roles/user/${userId}`);
    const list = res?.data?.data || res?.data || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * GET /permissions
   * Retrieves all registered permissions in the system
   */
  static async getPermissions(): Promise<Permission[]> {
    try {
      const res = await ApiClient.get<any>('/permissions');
      const list = res?.data?.data || res?.data || res;
      return Array.isArray(list) ? list : [];
    } catch (err: any) {
      if (err?.status === 404) {
        const res = await ApiClient.get<any>('/permission');
        const list = res?.data?.data || res?.data || res;
        return Array.isArray(list) ? list : [];
      }
      throw err;
    }
  }

  /**
   * POST /permissions
   * Creates a new individual permission
   */
  static async createPermission(data: { name: string; description?: string }): Promise<Permission> {
    const res = await ApiClient.post<any>('/permissions', data);
    return res?.data?.data || res?.data || res;
  }

  /**
   * PATCH /permissions/:id
   * Updates an existing permission
   */
  static async updatePermission(id: string, data: { name?: string; description?: string }): Promise<Permission> {
    const res = await ApiClient.patch<any>(`/permissions/${id}`, data);
    return res?.data?.data || res?.data || res;
  }

  /**
   * DELETE /permissions/:id
   * Removes an existing permission
   */
  static async deletePermission(id: string): Promise<{ message: string }> {
    const res = await ApiClient.delete<any>(`/permissions/${id}`);
    return res?.data || res;
  }

  /**
   * POST /permissions/assign-to-role
   * Bulk assigns a list of permission IDs to a role
   */
  static async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<{ message: string }> {
    const res = await ApiClient.post<any>('/permissions/assign-to-role', { roleId, permissionIds });
    return res?.data || res;
  }

  /**
   * GET /permissions/role/:roleId
   * Retrieves all permissions assigned to a specific role
   */
  static async getRolePermissions(roleId: string): Promise<Permission[]> {
    const res = await ApiClient.get<any>(`/permissions/role/${roleId}`);
    const list = res?.data?.data || res?.data || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * DELETE /permissions/role/:roleId/:permissionId
   * Removes a specific permission from a role
   */
  static async removePermissionFromRole(roleId: string, permissionId: string): Promise<{ message: string }> {
    const res = await ApiClient.delete<any>(`/permissions/role/${roleId}/${permissionId}`);
    return res?.data || res;
  }
}
