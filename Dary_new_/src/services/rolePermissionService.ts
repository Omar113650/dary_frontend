import { ApiClient } from './apiClient';

export interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rolePermissions?: any[];
  [key: string]: any;
}

export interface PermissionItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export class RolePermissionService {
  // ==========================================
  // ROLES (4 Endpoints)
  // ==========================================
  /**
   * 1. GET /roles
   * Get All Roles
   */
  static async getAllRoles(): Promise<RoleItem[]> {
    const res = await ApiClient.get<any>('/roles');
    const list = res?.data?.roles || res?.data || res?.roles || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 2. GET /roles/user/:userId
   * Get User Roles
   */
  static async getUserRoles(userId: string): Promise<any[]> {
    const res = await ApiClient.get<any>(`/roles/user/${userId}`);
    const list = res?.data?.roles || res?.data || res?.roles || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 3. POST /roles/remove
   * Remove Role from User
   */
  static async removeRole(userId: string, roleName: string): Promise<any> {
    const res = await ApiClient.post<any>('/roles/remove', { userId, roleName });
    return res?.data || res;
  }

  /**
   * 4. POST /roles
   * Create Role
   */
  static async createRole(name: string, description?: string): Promise<any> {
    const res = await ApiClient.post<any>('/roles', { name, description });
    return res?.data || res;
  }

  /**
   * 5. POST /roles/assign
   * Assign Role to User
   */
  static async assignRole(userId: string, roleName: string): Promise<any> {
    const res = await ApiClient.post<any>('/roles/assign', { userId, roleName });
    return res?.data || res;
  }

  // ==========================================
  // PERMISSIONS (7 Endpoints)
  // ==========================================
  /**
   * 1. GET /permissions
   * Get All Permissions
   */
  static async getAllPermissions(): Promise<PermissionItem[]> {
    const res = await ApiClient.get<any>('/permissions');
    const list = res?.data?.permissions || res?.data || res?.permissions || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 2. POST /permissions
   * Create Permission
   */
  static async createPermission(name: string, description?: string): Promise<any> {
    const res = await ApiClient.post<any>('/permissions', { name, description });
    return res?.data || res;
  }

  /**
   * 3. PATCH /permissions/:id
   * Update Permission
   */
  static async updatePermission(id: string, name?: string, description?: string): Promise<any> {
    const res = await ApiClient.patch<any>(`/permissions/${id}`, { name, description });
    return res?.data || res;
  }

  /**
   * 4. DELETE /permissions/:id
   * Delete Permission
   */
  static async deletePermission(id: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/permissions/${id}`);
    return res?.data || res;
  }

  /**
   * 5. POST /permissions/assign-to-role
   * Assign Permissions To Role
   */
  static async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<any> {
    const res = await ApiClient.post<any>('/permissions/assign-to-role', { roleId, permissionIds });
    return res?.data || res;
  }

  /**
   * 6. GET /permissions/role/:roleId
   * Get Role Permissions
   */
  static async getRolePermissions(roleId: string): Promise<PermissionItem[]> {
    const res = await ApiClient.get<any>(`/permissions/role/${roleId}`);
    const list = res?.data?.permissions || res?.data || res?.permissions || res;
    return Array.isArray(list) ? list : [];
  }

  /**
   * 7. DELETE /permissions/role/:roleId/:permissionId
   * Remove Permission From Role
   */
  static async removePermissionFromRole(roleId: string, permissionId: string): Promise<any> {
    const res = await ApiClient.delete<any>(`/permissions/role/${roleId}/${permissionId}`);
    return res?.data || res;
  }
}
