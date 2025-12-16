/**
 * Audit Logger Service
 * 
 * Provides compliance-ready audit logging for security-sensitive actions.
 * Logs are stored locally and can be synced to Supabase for persistence.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Audit event types
export type AuditEventType =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOGOUT'
    | 'SESSION_EXPIRED'
    | 'INSPECTION_STARTED'
    | 'INSPECTION_COMPLETED'
    | 'REPORT_APPROVED'
    | 'REPORT_REJECTED'
    | 'REPORT_MODIFIED'
    | 'ITEM_CREATED'
    | 'ITEM_UPDATED'
    | 'ITEM_DELETED'
    | 'DATA_EXPORTED'
    | 'ERROR_OCCURRED';

// Audit log entry
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    eventType: AuditEventType;
    userId: string;
    userEmail: string;
    userName: string;
    action: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
}

// Local storage key
const AUDIT_LOG_KEY = 'weldvision_audit_log';
const MAX_LOCAL_LOGS = 500; // Keep last 500 entries locally

/**
 * Generate unique ID for audit entry
 */
const generateId = (): string => {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Get current timestamp in ISO format
 */
const getTimestamp = (): string => {
    return new Date().toISOString();
};

/**
 * Get stored audit logs from localStorage
 */
export const getLocalAuditLogs = (): AuditLogEntry[] => {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Save audit log to localStorage
 */
const saveLocalLog = (entry: AuditLogEntry): void => {
    try {
        const logs = getLocalAuditLogs();
        logs.unshift(entry); // Add to beginning

        // Keep only last MAX_LOCAL_LOGS entries
        const trimmed = logs.slice(0, MAX_LOCAL_LOGS);
        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Failed to save audit log:', error);
    }
};

/**
 * Save audit log to Supabase (if configured)
 */
const saveRemoteLog = async (entry: AuditLogEntry): Promise<boolean> => {
    if (!isSupabaseConfigured() || !supabase) {
        return false;
    }

    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert([{
                id: entry.id,
                timestamp: entry.timestamp,
                event_type: entry.eventType,
                user_id: entry.userId,
                user_email: entry.userEmail,
                user_name: entry.userName,
                action: entry.action,
                details: entry.details,
                ip_address: entry.ipAddress,
                user_agent: entry.userAgent,
                success: entry.success,
            }]);

        return !error;
    } catch {
        return false;
    }
};

/**
 * Main audit logging function
 */
export const logAuditEvent = async (
    eventType: AuditEventType,
    action: string,
    user: { id: string; email: string; name: string } | null,
    details: Record<string, unknown> = {},
    success: boolean = true
): Promise<void> => {
    const entry: AuditLogEntry = {
        id: generateId(),
        timestamp: getTimestamp(),
        eventType,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || 'unknown',
        userName: user?.name || 'Unknown User',
        action,
        details,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        success,
    };

    // Always save locally first
    saveLocalLog(entry);

    // Attempt to save remotely (non-blocking)
    saveRemoteLog(entry).catch(() => {
        // Silent fail for remote logging
    });
};

/**
 * Convenience functions for common audit events
 */
export const auditLog = {
    // Authentication events
    loginSuccess: (user: { id: string; email: string; name: string }) =>
        logAuditEvent('LOGIN_SUCCESS', 'User logged in successfully', user, {}),

    loginFailure: (email: string, reason: string) =>
        logAuditEvent('LOGIN_FAILURE', 'Login attempt failed', null, { email, reason }, false),

    logout: (user: { id: string; email: string; name: string }) =>
        logAuditEvent('LOGOUT', 'User logged out', user, {}),

    sessionExpired: (userId: string) =>
        logAuditEvent('SESSION_EXPIRED', 'Session expired', { id: userId, email: '', name: '' }, {}),

    // Inspection events
    inspectionStarted: (
        user: { id: string; email: string; name: string },
        details: { supplier: string; poNumber: string; imageCount: number }
    ) => logAuditEvent('INSPECTION_STARTED', 'Inspection started', user, details),

    inspectionCompleted: (
        user: { id: string; email: string; name: string },
        details: { supplier: string; poNumber: string; status: string; defectsFound: number }
    ) => logAuditEvent('INSPECTION_COMPLETED', 'Inspection completed', user, details),

    // Report events  
    reportApproved: (
        user: { id: string; email: string; name: string },
        details: { poNumber: string; supplier: string }
    ) => logAuditEvent('REPORT_APPROVED', 'Report approved', user, details),

    reportRejected: (
        user: { id: string; email: string; name: string },
        details: { poNumber: string; supplier: string; reason?: string }
    ) => logAuditEvent('REPORT_REJECTED', 'Report rejected', user, details),

    reportModified: (
        user: { id: string; email: string; name: string },
        details: { poNumber: string; changes: string[] }
    ) => logAuditEvent('REPORT_MODIFIED', 'Report modified', user, details),

    // Item master events
    itemCreated: (
        user: { id: string; email: string; name: string },
        details: { itemId: string; itemCode: string; itemName: string }
    ) => logAuditEvent('ITEM_CREATED', 'Item created', user, details),

    itemUpdated: (
        user: { id: string; email: string; name: string },
        details: { itemId: string; itemCode: string; changes: string[] }
    ) => logAuditEvent('ITEM_UPDATED', 'Item updated', user, details),

    itemDeleted: (
        user: { id: string; email: string; name: string },
        details: { itemId: string; itemCode: string }
    ) => logAuditEvent('ITEM_DELETED', 'Item deleted', user, details),

    // Error events
    error: (
        user: { id: string; email: string; name: string } | null,
        details: { error: string; component?: string; stack?: string }
    ) => logAuditEvent('ERROR_OCCURRED', 'Error occurred', user, details, false),
};

/**
 * Get audit logs with optional filtering
 */
export const getAuditLogs = async (options?: {
    eventType?: AuditEventType;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}): Promise<AuditLogEntry[]> => {
    let logs = getLocalAuditLogs();

    // Apply filters
    if (options?.eventType) {
        logs = logs.filter(l => l.eventType === options.eventType);
    }
    if (options?.userId) {
        logs = logs.filter(l => l.userId === options.userId);
    }
    if (options?.startDate) {
        logs = logs.filter(l => l.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
        logs = logs.filter(l => l.timestamp <= options.endDate!);
    }
    if (options?.limit) {
        logs = logs.slice(0, options.limit);
    }

    return logs;
};

/**
 * Clear local audit logs (for testing/cleanup)
 */
export const clearLocalAuditLogs = (): void => {
    localStorage.removeItem(AUDIT_LOG_KEY);
};

/**
 * Export audit logs as JSON (for compliance reports)
 */
export const exportAuditLogs = (): string => {
    const logs = getLocalAuditLogs();
    return JSON.stringify(logs, null, 2);
};

export default auditLog;
