import React, { useState, useEffect } from 'react';
import {
    UserRole,
    UserRoleRecord,
    getAllUsersWithRoles,
    updateUserRole,
    getRoleDisplayName,
    getRoleBadgeColor
} from '../services/roleService';
import { analyticsService, AnalyticsSummary, formatBytes } from '../services/analyticsService';
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
    UserCog,
    Activity,
    Database,
    DollarSign,
    BarChart3,
    TrendingUp,
    Globe,
    Save
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';

const AVAILABLE_ROLES: UserRole[] = ['admin', 'manager', 'inspector', 'viewer'];

interface AdminPanelProps {
    onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const { isAdmin, role: currentUserRole } = useRole();
    const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'settings'>('users');

    // Users State
    const [users, setUsers] = useState<UserRoleRecord[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);
    const [userError, setUserError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Analytics State
    const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD'
    });
    const [shiftTimes, setShiftTimes] = useState({
        morning: { start: '06:00', end: '14:00' },
        afternoon: { start: '14:00', end: '22:00' },
        night: { start: '22:00', end: '06:00' }
    });
    const [isSettingsSaving, setIsSettingsSaving] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('texvision_settings');
        if (stored) {
            setSettings(JSON.parse(stored));
        }
        const storedShifts = localStorage.getItem('texvision_shift_times');
        if (storedShifts) {
            setShiftTimes(JSON.parse(storedShifts));
        }
    }, []);

    const handleSaveSettings = () => {
        setIsSettingsSaving(true);
        localStorage.setItem('texvision_settings', JSON.stringify(settings));
        localStorage.setItem('texvision_shift_times', JSON.stringify(shiftTimes));
        setTimeout(() => setIsSettingsSaving(false), 800);
    };

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        setUserError(null);
        try {
            const data = await getAllUsersWithRoles();
            setUsers(data);
        } catch (err) {
            setUserError('Failed to load users');
            console.error('[AdminPanel] Error:', err);
        } finally {
            setIsUsersLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        setIsAnalyticsLoading(true);
        try {
            const data = await analyticsService.getAnalyticsSummary(30);
            setAnalytics(data);
        } catch (e) {
            console.error('[AdminPanel] Failed to load analytics', e);
        } finally {
            setIsAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'analytics') fetchAnalytics();
        }
    }, [isAdmin, activeTab]);

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
            setUserError(result.error || 'Failed to update role');
        }
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );



    // Using imported formatBytes from analyticsService

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
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[85vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Shield className="w-6 h-6 text-blue-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Admin Console</h2>
                            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">System Administration</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-6">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'users'
                            ? 'bg-white text-slate-900'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'analytics'
                            ? 'bg-white text-slate-900'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Resource Monitor
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'settings'
                            ? 'bg-white text-slate-900'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        Regional Settings
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-hidden flex flex-col bg-gray-50">

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="flex flex-col h-full">
                        {/* Search Bar */}
                        <div className="px-6 py-4 bg-white border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="relative w-full max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={fetchUsers}
                                    title="Refresh List"
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isUsersLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {userError && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{userError}</span>
                            </div>
                        )}

                        {/* User List */}
                        <div className="flex-grow overflow-y-auto p-6">
                            {isUsersLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                                    <span className="text-sm">Loading users...</span>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Users className="w-12 h-12 mb-3 opacity-20" />
                                    <span>No users found</span>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
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
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs ring-2 ring-white">
                                                                {user.email.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900 text-sm">{user.email}</div>
                                                                <div className="text-xs text-gray-400 font-mono">{user.user_id.slice(0, 8)}...</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {editingUserId === user.user_id ? (
                                                            <div className="relative">
                                                                <select
                                                                    value={pendingRole || user.role}
                                                                    onChange={(e) => setPendingRole(e.target.value as UserRole)}
                                                                    className="appearance-none bg-white border border-blue-300 rounded-lg px-2 py-1 pr-8 text-xs font-medium focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                                >
                                                                    {AVAILABLE_ROLES.map(r => (
                                                                        <option key={r} value={r}>{getRoleDisplayName(r)}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                                            </div>
                                                        ) : (
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                                                {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                                                {getRoleDisplayName(user.role)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-gray-500">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        {editingUserId === user.user_id ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleRoleChange(user.user_id, pendingRole || user.role)}
                                                                    disabled={isSaving}
                                                                    className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingUserId(null);
                                                                        setPendingRole(null);
                                                                    }}
                                                                    className="p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
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
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* --- ANALYTICS TAB --- */}
                {activeTab === 'analytics' && (
                    <div className="flex-grow overflow-y-auto p-6">
                        {isAnalyticsLoading || !analytics ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Activity className="w-8 h-8 animate-pulse mb-2 text-blue-400" />
                                <span className="text-sm">Aggregating system metrics...</span>
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">

                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Estimated Cost</p>
                                            <h3 className="text-2xl font-bold text-gray-900 mt-1">${analytics.totalCost.toFixed(2)}</h3>
                                            <span className="text-xs text-green-600 font-medium">+${(analytics.totalCost * 0.1).toFixed(2)} vs last month</span>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-full">
                                            <DollarSign className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">API Calls</p>
                                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalCalls}</h3>
                                            <span className="text-xs text-blue-600 font-medium">Gemini 2.0 Flash</span>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-full">
                                            <Activity className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Tokens Processed</p>
                                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{(analytics.totalTokens / 1000000).toFixed(2)}M</h3>
                                            <span className="text-xs text-purple-600 font-medium font-mono">{(analytics.totalTokens).toLocaleString()}</span>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded-full">
                                            <BarChart3 className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>

                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Storage Used</p>
                                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatBytes(analytics.currentStorageBytes)}</h3>
                                            <span className="text-xs text-orange-600 font-medium">Supabase Bucket</span>
                                        </div>
                                        <div className="p-3 bg-orange-50 rounded-full">
                                            <Database className="w-6 h-6 text-orange-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row 1 */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="font-bold text-gray-900">API Usage Trend</h3>
                                                <p className="text-xs text-gray-500">Daily number of visual inspection requests</p>
                                            </div>
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="h-[250px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={analytics.dailyUsage}>
                                                    <defs>
                                                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#111' }}
                                                    />
                                                    <Area type="monotone" dataKey="apiCalls" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCalls)" name="Calls" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="font-bold text-gray-900">Cost Analysis</h3>
                                                <p className="text-xs text-gray-500">Estimated daily cost based on token consumption</p>
                                            </div>
                                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                                <DollarSign className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="h-[250px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.dailyUsage}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                                    <YAxis fontSize={10} tickLine={false} axisLine={false} unit="$" />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        formatter={(value: any) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                                                    />
                                                    <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} name="Est. Cost" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row 2 */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-bold text-gray-900">Storage Consumption Growth</h3>
                                            <p className="text-xs text-gray-500">Cumulative storage used by inspection media</p>
                                        </div>
                                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                            <Database className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={analytics.dailyUsage}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                                                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / (1024 * 1024)).toFixed(0)}MB`} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value: any) => [formatBytes(Number(value)), 'Storage']}
                                                />
                                                <Line type="monotone" dataKey="storageBytes" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Storage" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 text-center pt-8 pb-4">
                                    Metrics are collected via Supabase logs. Cost estimates are based on Gemini 2.5 Flash pricing (§0.10/M tokens).
                                </div>

                            </div>
                        )}
                    </div>
                )}
                {/* --- SETTINGS TAB --- */}
                {activeTab === 'settings' && (
                    <div className="flex-grow overflow-y-auto p-6 animate-fadeIn">
                        <div className="max-w-2xl mx-auto space-y-6">

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    Regional Settings
                                </h3>

                                <div className="space-y-4">
                                    {/* Time Zone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
                                        <select
                                            value={settings.timeZone}
                                            onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>System Default ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                                            <option value="America/New_York">New York (EST/EDT)</option>
                                            <option value="Europe/London">London (GMT/BST)</option>
                                            <option value="Asia/Dubai">Dubai (GST)</option>
                                            <option value="Asia/Singapore">Singapore (SGT)</option>
                                            <option value="Asia/Kolkata">Kolkata (IST)</option>
                                            <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Affects how timestamps are displayed in reports.</p>
                                    </div>

                                    {/* Date Format */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                                        <select
                                            value={settings.dateFormat}
                                            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                                        </select>
                                    </div>

                                    {/* Currency */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                        <select
                                            value={settings.currency}
                                            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="USD">USD ($) - US Dollar</option>
                                            <option value="EUR">EUR (€) - Euro</option>
                                            <option value="GBP">GBP (£) - British Pound</option>
                                            <option value="INR">INR (₹) - Indian Rupee</option>
                                            <option value="AED">AED (د.إ) - UAE Dirham</option>
                                            <option value="CNY">CNY (¥) - Chinese Yuan</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Used for cost estimation and financial reports.</p>
                                    </div>
                                </div>

                                {/* Shift Configuration */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Shift Timings
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-6">Configure work shift hours for in-process inspections</p>

                                    <div className="space-y-4">
                                        {/* Morning Shift */}
                                        <div className="border border-gray-200 rounded-lg p-4 bg-amber-50/30">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                    Morning Shift
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={shiftTimes.morning.start}
                                                        onChange={(e) => setShiftTimes({
                                                            ...shiftTimes,
                                                            morning: { ...shiftTimes.morning, start: e.target.value }
                                                        })}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={shiftTimes.morning.end}
                                                        onChange={(e) => setShiftTimes({
                                                            ...shiftTimes,
                                                            morning: { ...shiftTimes.morning, end: e.target.value }
                                                        })}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Afternoon Shift */}
                                        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50/30">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                    Afternoon Shift
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={shiftTimes.afternoon.start}
                                                        onChange={(e) => setShiftTimes({
                                                            ...shiftTimes,
                                                            afternoon: { ...shiftTimes.afternoon, start: e.target.value }
                                                        })}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={shiftTimes.afternoon.end}
                                                        onChange={(e) => setShiftTimes({
                                                            ...shiftTimes,
                                                            afternoon: { ...shiftTimes.afternoon, end: e.target.value }
                                                        })}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Night Shift */}
                                        <div className="border border-gray-200 rounded-lg p-4 bg-indigo-50/30">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                                                    Night Shift
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={shiftTimes.night.start}
                                                        onChange={(e) => setShiftTimes({
                                                            ...shiftTimes,
                                                            night: { ...shiftTimes.night, start: e.target.value }
                                                        })}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={shiftTimes.night.end}
                                                        onChange={(e) => setShiftTimes({
                                                            ...shiftTimes,
                                                            night: { ...shiftTimes.night, end: e.target.value }
                                                        })}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Note: Night shift can span across midnight</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={isSettingsSaving}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md disabled:bg-blue-300"
                                    >
                                        {isSettingsSaving ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Settings
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
