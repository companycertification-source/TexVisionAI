/**
 * Admin Panel
 * 
 * User management interface for administrators.
 * Allows viewing all users and assigning roles.
 */

import React, { useState, useEffect } from 'react';
import {
    UserRole,
    UserRoleRecord,
    getAllUsersWithRoles,
    updateUserRole,
    getRoleDisplayName,
    getRoleBadgeColor
} from '../services/roleService';
import { useRole } from '../contexts/RoleContext';
import {
    Users,
    Shield,
    Search,
    RefreshCw,
    Check,
    X,
    ChevronDown,
    AlertCircle,
    UserCog
} from 'lucide-react';

const AVAILABLE_ROLES: UserRole[] = ['admin', 'manager', 'inspector', 'viewer'];

interface AdminPanelProps {
    onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const { isAdmin, role: currentUserRole } = useRole();
    const [users, setUsers] = useState<UserRoleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllUsersWithRoles();
            setUsers(data);
        } catch (err) {
            setError('Failed to load users');
            console.error('[AdminPanel] Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        setIsSaving(true);
        const result = await updateUserRole(userId, newRole);
        setIsSaving(false);

        if (result.success) {
            setUsers(prev => prev.map(u =>
                u.user_id === userId ? { ...u, role: newRole } : u
            ));
            setEditingUserId(null);
            setPendingRole(null);
        } else {
            setError(result.error || 'Failed to update role');
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <Shield className="w-16 h-16 text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-600">You don't have permission to access admin settings.</p>
                <p className="text-sm text-gray-500 mt-2">Current role: {getRoleDisplayName(currentUserRole || 'viewer')}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserCog className="w-6 h-6" />
                        <div>
                            <h2 className="text-lg font-bold">User Management</h2>
                            <p className="text-slate-300 text-sm">{users.length} users registered</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchUsers}
                            disabled={isLoading}
                            className="p-2 hover:bg-white/10 rounded-lg transition"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* User List */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading users...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                        <Users className="w-12 h-12 mb-2 opacity-50" />
                        <span>{searchQuery ? 'No users match your search' : 'No users found'}</span>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.email}</div>
                                                <div className="text-xs text-gray-500 font-mono">{user.user_id.slice(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingUserId === user.user_id ? (
                                            <div className="relative">
                                                <select
                                                    value={pendingRole || user.role}
                                                    onChange={(e) => setPendingRole(e.target.value as UserRole)}
                                                    className="appearance-none bg-white border border-blue-300 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                                                >
                                                    {AVAILABLE_ROLES.map(r => (
                                                        <option key={r} value={r}>{getRoleDisplayName(r)}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                                                {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                                {getRoleDisplayName(user.role)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingUserId === user.user_id ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleRoleChange(user.user_id, pendingRole || user.role)}
                                                    disabled={isSaving}
                                                    className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                                                    title="Save"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingUserId(null);
                                                        setPendingRole(null);
                                                    }}
                                                    className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                                    title="Cancel"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditingUserId(user.user_id);
                                                    setPendingRole(user.role);
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Change Role
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                        Showing {filteredUsers.length} of {users.length} users
                    </span>
                    <div className="flex items-center gap-4">
                        {AVAILABLE_ROLES.map(r => (
                            <span key={r} className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${r === 'admin' ? 'bg-red-500' :
                                        r === 'manager' ? 'bg-purple-500' :
                                            r === 'inspector' ? 'bg-blue-500' : 'bg-gray-400'
                                    }`}></span>
                                {users.filter(u => u.role === r).length} {getRoleDisplayName(r)}s
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
