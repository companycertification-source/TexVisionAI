/**
 * Authentication Context & Provider
 * 
 * Provides authentication state management using Supabase Auth.
 * Includes session persistence, protected routes, and user context.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { auditLog } from '../services/auditService';

// User type
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'inspector' | 'admin' | 'viewer';
    createdAt: string;
}

// Auth state
interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Auth context type
interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<boolean>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    demoLogin: () => void;
    clearError: () => void;
}

// Default state
const defaultState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session storage key
const SESSION_KEY = 'weldvision_auth_session';
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>(defaultState);

    // Check for existing session on mount and listen for auth state changes
    useEffect(() => {
        checkSession();

        // Set up auth state change listener for OAuth redirects
        if (isSupabaseConfigured() && supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (event, session) => {
                    console.log('[Auth] onAuthStateChange event:', event, 'session:', !!session);

                    if (event === 'SIGNED_IN' && session?.user) {
                        console.log('[Auth] User signed in via OAuth:', session.user.email);
                        const user: AuthUser = {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata?.full_name ||
                                session.user.user_metadata?.name ||
                                session.user.email?.split('@')[0] || 'User',
                            role: session.user.user_metadata?.role || 'inspector',
                            createdAt: session.user.created_at,
                        };

                        setState({
                            user,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                        });

                        // Audit log
                        auditLog.loginSuccess(user);
                    } else if (event === 'SIGNED_OUT') {
                        console.log('[Auth] User signed out');
                        setState({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                        });
                    } else if (event === 'TOKEN_REFRESHED') {
                        console.log('[Auth] Token refreshed');
                        // Session is still valid, no state change needed
                    }
                }
            );

            // Cleanup subscription on unmount
            return () => {
                subscription.unsubscribe();
            };
        }
    }, []);

    // Check stored session
    const checkSession = async () => {
        try {
            // First check Supabase session
            if (isSupabaseConfigured() && supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setState({
                        user: {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                            role: session.user.user_metadata?.role || 'inspector',
                            createdAt: session.user.created_at,
                        },
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                    return;
                }
            }

            // Fallback: Check localStorage session (for demo mode)
            const storedSession = localStorage.getItem(SESSION_KEY);
            if (storedSession) {
                const session = JSON.parse(storedSession);
                const now = Date.now();

                // Check if session is expired
                if (session.expiresAt && now < session.expiresAt) {
                    setState({
                        user: session.user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });
                    return;
                } else {
                    // Session expired, clear it
                    localStorage.removeItem(SESSION_KEY);
                }
            }

            // No valid session
            setState({
                ...defaultState,
                isLoading: false,
            });
        } catch (error) {
            console.error('Session check failed:', error);
            setState({
                ...defaultState,
                isLoading: false,
            });
        }
    };

    // Login with Supabase
    const login = async (email: string, password: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            // Validate inputs
            if (!email || !password) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Email and password are required',
                }));
                return false;
            }

            if (!isValidEmail(email)) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Please enter a valid email address',
                }));
                return false;
            }

            if (password.length < 6) {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Password must be at least 6 characters',
                }));
                return false;
            }

            // Use Supabase if configured
            if (isSupabaseConfigured() && supabase) {
                console.log('[Auth] Attempting Supabase login for:', email);
                const startTime = Date.now();
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                console.log(`[Auth] Supabase login response in ${Date.now() - startTime}ms`);

                if (error) {
                    setState(prev => ({
                        ...prev,
                        isLoading: false,
                        error: error.message === 'Invalid login credentials'
                            ? 'Invalid email or password'
                            : error.message,
                    }));
                    return false;
                }

                if (data.user) {
                    const user: AuthUser = {
                        id: data.user.id,
                        email: data.user.email || '',
                        name: data.user.user_metadata?.name || email.split('@')[0] || 'User',
                        role: data.user.user_metadata?.role || 'inspector',
                        createdAt: data.user.created_at,
                    };

                    setState({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null,
                    });

                    // Audit log
                    auditLog.loginSuccess(user);

                    return true;
                }
            }

            // Fallback: Demo mode with local storage
            // For demo, accept any valid email format with password "demo123"
            if (password === 'demo123') {
                const user: AuthUser = {
                    id: 'demo-' + Date.now(),
                    email,
                    name: email.split('@')[0] || 'User',
                    role: 'inspector',
                    createdAt: new Date().toISOString(),
                };

                // Store session with expiry
                const session = {
                    user,
                    expiresAt: Date.now() + SESSION_TIMEOUT_MS,
                };
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));

                setState({
                    user,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });

                // Audit log
                auditLog.loginSuccess(user);

                return true;
            }

            // Audit log failed login
            auditLog.loginFailure(email, 'Invalid credentials');

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Invalid email or password',
            }));
            return false;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: message,
            }));
            return false;
        }
    };

    // Demo login (quick access)
    const demoLogin = () => {
        const user: AuthUser = {
            id: 'demo-inspector',
            email: 'demo@weldvision.ai',
            name: 'Demo Inspector',
            role: 'inspector',
            createdAt: new Date().toISOString(),
        };

        // Store session with expiry
        const session = {
            user,
            expiresAt: Date.now() + SESSION_TIMEOUT_MS,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
        });

        // Audit log
        auditLog.loginSuccess(user);
    };

    // Google OAuth login
    const loginWithGoogle = async (): Promise<void> => {
        console.log('[Auth] loginWithGoogle called');
        console.log('[Auth] isSupabaseConfigured:', isSupabaseConfigured());
        console.log('[Auth] supabase:', !!supabase);

        if (!isSupabaseConfigured() || !supabase) {
            const error = 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
            console.error('[Auth]', error);
            setState(prev => ({
                ...prev,
                error,
            }));
            return;
        }

        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));
            console.log('[Auth] Starting OAuth flow...');

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });

            console.log('[Auth] OAuth response:', { data, error });

            if (error) {
                console.error('[Auth] OAuth error:', error);
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error.message,
                }));
            } else {
                console.log('[Auth] OAuth initiated, redirecting...');
            }
            // Note: On success, the page will redirect to Google
            // After returning, the useEffect will pick up the session
        } catch (error) {
            console.error('[Auth] OAuth exception:', error);
            const message = error instanceof Error ? error.message : 'Google login failed';
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: message,
            }));
        }
    };

    // Logout
    const logout = async () => {
        console.log('[Auth] logout function called');
        const currentUser = state.user;

        // 1. Immediately update UI state to avoid hanging the user
        console.log('[Auth] Clearing local state immediately...');
        setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });

        // 2. Clear local storage keys
        console.log('[Auth] Clearing storage keys...');
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('sb-token');
        localStorage.removeItem('supabase.auth.token');

        // Clear all keys starting with 'sb-' (Supabase typical keys)
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        });

        try {
            // 3. Attempt Supabase signOut (non-blocking or with short timeout)
            if (isSupabaseConfigured() && supabase) {
                console.log('[Auth] Triggering Supabase signOut (background)...');

                // We fire and forget this, or use a race to avoid hanging session
                const signOutPromise = supabase.auth.signOut().then(({ error }) => {
                    if (error) console.error('[Auth] Supabase signOut error:', error);
                    else console.log('[Auth] Supabase signOut completed in background');
                });

                // Wait max 1.5 seconds for Supabase, then move on anyway
                await Promise.race([
                    signOutPromise,
                    new Promise(resolve => setTimeout(resolve, 1500))
                ]);
            }

            // 4. Audit log
            if (currentUser) {
                console.log('[Auth] Recording logout audit log...');
                auditLog.logout(currentUser).catch(e => console.error('Audit log error:', e));
            }

            // 5. Final redirection hint (optional, but good for SPA)
            console.log('[Auth] Logout sequence finalized');
        } catch (error) {
            console.error('[Auth] Logout catch block error:', error);
        }
    };

    // Clear error
    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                loginWithGoogle,
                logout,
                demoLogin,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Email validation helper
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export default AuthProvider;
