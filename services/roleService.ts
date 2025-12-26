/**
 * Role Service
 * 
 * Handles user role management with Supabase.
 * Roles: admin, manager, inspector, viewer
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export type UserRole = 'admin' | 'manager' | 'inspector' | 'viewer';

export interface UserRoleRecord {
    id: string;
    user_id: string;
    email: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
    assigned_by: string | null;
}

export interface RolePermissions {
    canCreateInspection: boolean;
    canViewAllInspections: boolean;
    canViewOwnInspections: boolean;
    canEditInspection: boolean;
    canDeleteInspection: boolean;
    canManageUsers: boolean;
    canViewPerformance: boolean;
    canManageItems: boolean;
    canManageVendors: boolean;
}

// Permission matrix for each role
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    admin: {
        canCreateInspection: true,
        canViewAllInspections: true,
        canViewOwnInspections: true,
        canEditInspection: true,
        canDeleteInspection: true,
        canManageUsers: true,
        canViewPerformance: true,
        canManageItems: true,
        canManageVendors: true,
    },
    manager: {
        canCreateInspection: false,
        canViewAllInspections: true,
        canViewOwnInspections: true,
        canEditInspection: false,
        canDeleteInspection: false,
        canManageUsers: false,
        canViewPerformance: true,
        canManageItems: true,
        canManageVendors: true,
    },
    inspector: {
        canCreateInspection: true,
        canViewAllInspections: false,
        canViewOwnInspections: true,
        canEditInspection: true, // Own only - enforced at data level
        canDeleteInspection: false,
        canManageUsers: false,
        canViewPerformance: true, // Own only
        canManageItems: false,
        canManageVendors: false,
    },
    viewer: {
        canCreateInspection: false,
        canViewAllInspections: true,
        canViewOwnInspections: true,
        canEditInspection: false,
        canDeleteInspection: false,
        canManageUsers: false,
        canViewPerformance: true,
        canManageItems: false,
        canManageVendors: false,
    },
};

/**
 * Get permissions for a role
 */
export const getPermissions = (role: UserRole): RolePermissions => {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: UserRole, permission: keyof RolePermissions): boolean => {
    return ROLE_PERMISSIONS[role]?.[permission] ?? false;
};

/**
 * Get the current user's role from the database
 */
export const getCurrentUserRole = async (): Promise<UserRole | null> => {
    if (!isSupabaseConfigured() || !supabase) {
        console.warn('[Role] Supabase not configured, defaulting to viewer');
        return 'viewer';
    }

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error('[Role] Auth error:', authError);
            return 'viewer';
        }

        if (!user) {
            console.log('[Role] No authenticated user');
            return null;
        }

        console.log('[Role] Fetching role for user:', user.email, 'id:', user.id);

        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (error) {
            console.error('[Role] Database error:', error.code, error.message);

            // If no role found, user might be new - create default role
            if (error.code === 'PGRST116') {
                console.log('[Role] No role found for user, creating default viewer role');
                await createDefaultRole(user.id, user.email || '');
                return 'viewer';
            }

            // Table doesn't exist
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.error('[Role] user_roles table does not exist! Run the SQL migration.');
                return 'viewer';
            }

            return 'viewer'; // Default to viewer on error
        }

        console.log('[Role] User role fetched:', data?.role);
        return data?.role as UserRole || 'viewer';
    } catch (error) {
        console.error('[Role] Error getting user role:', error);
        return 'viewer';
    }
};

/**
 * Create default role for a new user
 */
export const createDefaultRole = async (userId: string, email: string): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) {
        return false;
    }

    try {
        const { error } = await supabase
            .from('user_roles')
            .insert({
                user_id: userId,
                email: email,
                role: 'viewer', // Default role for new users
            });

        if (error) {
            // Ignore duplicate key errors (role already exists)
            if (error.code === '23505') {
                return true;
            }
            console.error('[Role] Error creating default role:', error);
            return false;
        }

        console.log('[Role] Created default viewer role for:', email);
        return true;
    } catch (error) {
        console.error('[Role] Error creating default role:', error);
        return false;
    }
};

/**
 * Get all users with their roles (admin only)
 */
export const getAllUsersWithRoles = async (): Promise<UserRoleRecord[]> => {
    if (!isSupabaseConfigured() || !supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Role] Error fetching all users:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[Role] Error fetching all users:', error);
        return [];
    }
};

/**
 * Update a user's role (admin only)
 */
export const updateUserRole = async (
    userId: string,
    newRole: UserRole
): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured() || !supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        // Get current admin user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }

        const { error } = await supabase
            .from('user_roles')
            .update({
                role: newRole,
                updated_at: new Date().toISOString(),
                assigned_by: user.id
            })
            .eq('user_id', userId);

        if (error) {
            console.error('[Role] Error updating role:', error);
            return { success: false, error: error.message };
        }

        console.log('[Role] Updated user role to:', newRole);
        return { success: true };
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
    }
};

/**
 * Check if current user is admin
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
    const role = await getCurrentUserRole();
    return role === 'admin';
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
    const names: Record<UserRole, string> = {
        admin: 'Administrator',
        manager: 'Manager',
        inspector: 'Inspector',
        viewer: 'Viewer',
    };
    return names[role] || role;
};

/**
 * Get role badge color
 */
export const getRoleBadgeColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
        admin: 'bg-red-100 text-red-800 border-red-200',
        manager: 'bg-purple-100 text-purple-800 border-purple-200',
        inspector: 'bg-blue-100 text-blue-800 border-blue-200',
        viewer: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[role] || colors.viewer;
};
