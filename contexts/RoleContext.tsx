/**
 * Role Context
 * 
 * Provides role-based access control throughout the app.
 * Wraps the app and provides current user's role and permissions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    UserRole,
    RolePermissions,
    getCurrentUserRole,
    getPermissions,
    createDefaultRole
} from '../services/roleService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface RoleContextType {
    role: UserRole | null;
    permissions: RolePermissions | null;
    isLoading: boolean;
    isAdmin: boolean;
    isManager: boolean;
    isInspector: boolean;
    isViewer: boolean;
    hasPermission: (permission: keyof RolePermissions) => boolean;
    refreshRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRole = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setRole('viewer'); // Default for demo mode
            setIsLoading(false);
            return;
        }

        try {
            console.log('[RoleContext] Calling getCurrentUserRole...');

            // Create a timeout promise
            const timeoutPromise = new Promise<null>((resolve) =>
                setTimeout(() => {
                    console.warn('[RoleContext] Role fetch timed out after 7s');
                    resolve(null);
                }, 7000)
            );

            // Fetch role with timeout protection
            const userRole = await Promise.race([
                getCurrentUserRole(),
                timeoutPromise
            ]) as UserRole | null;

            console.log('[RoleContext] Role assigned after fetch/timeout:', userRole);
            setRole(userRole || 'viewer'); // Fallback to viewer if timeout or null
        } catch (error) {
            console.error('[RoleContext] Error fetching role:', error);
            setRole('viewer');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        fetchRole();

        if (!supabase) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // Create default role for new users
                await createDefaultRole(session.user.id, session.user.email || '');
                await fetchRole();
            } else if (event === 'SIGNED_OUT') {
                setRole(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchRole]);

    const permissions = role ? getPermissions(role) : null;

    const hasPermission = useCallback((permission: keyof RolePermissions): boolean => {
        if (!permissions) return false;
        return permissions[permission] ?? false;
    }, [permissions]);

    const value: RoleContextType = {
        role,
        permissions,
        isLoading,
        isAdmin: role === 'admin',
        isManager: role === 'manager',
        isInspector: role === 'inspector',
        isViewer: role === 'viewer',
        hasPermission,
        refreshRole: fetchRole,
    };

    return (
        <RoleContext.Provider value={value}>
            {children}
        </RoleContext.Provider>
    );
};

/**
 * Hook to access role context
 */
export const useRole = (): RoleContextType => {
    const context = useContext(RoleContext);
    if (context === undefined) {
        throw new Error('useRole must be used within a RoleProvider');
    }
    return context;
};

/**
 * Component that only renders children if user has required permission
 */
export const RequirePermission: React.FC<{
    permission: keyof RolePermissions;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ permission, children, fallback = null }) => {
    const { hasPermission, isLoading } = useRole();

    if (isLoading) {
        return null;
    }

    if (!hasPermission(permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

/**
 * Component that only renders children if user has one of the required roles
 */
export const RequireRole: React.FC<{
    roles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}> = ({ roles, children, fallback = null }) => {
    const { role, isLoading } = useRole();

    if (isLoading) {
        return null;
    }

    if (!role || !roles.includes(role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
