/**
 * Schedule Monitor Component
 * 
 * Real-time monitoring dashboard for In-Process Inspections.
 * Shows scheduled vs completed inspections in a table view.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Timer,
    RefreshCw,
    Factory,
    Play,
    ArrowLeft,
    Filter,
    Settings,
    Plus
} from 'lucide-react';
import {
    getScheduledInspections,
    getWorkStations,
    generateDailySchedule,
    getCurrentShift,
    isOverdue,
    SHIFT_LABELS
} from '../services/scheduleService';
import { ScheduledInspection, WorkStation } from '../types';

interface ScheduleMonitorProps {
    onBack: () => void;
    onStartInspection?: (workStationId: string, workStationName: string, scheduledId?: string) => void;
    onConfigureSchedules?: () => void;
}

type ShiftFilter = 'all' | 'morning' | 'afternoon' | 'night';

export const ScheduleMonitor: React.FC<ScheduleMonitorProps> = ({
    onBack,
    onStartInspection,
    onConfigureSchedules
}) => {
    const [scheduledInspections, setScheduledInspections] = useState<ScheduledInspection[]>([]);
    const [workStations, setWorkStations] = useState<WorkStation[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
    const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [inspections, stations] = await Promise.all([
                getScheduledInspections(selectedDate, shiftFilter === 'all' ? undefined : shiftFilter),
                getWorkStations()
            ]);
            setScheduledInspections(inspections);
            setWorkStations(stations);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('[ScheduleMonitor] Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, shiftFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleGenerateSchedule = async () => {
        setIsGenerating(true);
        try {
            await generateDailySchedule(selectedDate);
            await fetchData();
        } catch (error) {
            console.error('[ScheduleMonitor] Error generating schedule:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const getStatusBadge = (inspection: ScheduledInspection) => {
        if (inspection.status === 'completed') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                </span>
            );
        }

        if (inspection.status === 'missed') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Missed
                </span>
            );
        }

        // Pending - check if overdue
        if (isOverdue(inspection.expected_time)) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Overdue
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                <Timer className="w-3.5 h-3.5" />
                Pending
            </span>
        );
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getShiftBadge = (shift: string) => {
        switch (shift) {
            case 'morning':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">MORNING</span>;
            case 'afternoon':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">AFTERNOON</span>;
            case 'night':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">NIGHT</span>;
            default:
                return null;
        }
    };

    // Summary statistics
    const stats = {
        total: scheduledInspections.length,
        completed: scheduledInspections.filter(i => i.status === 'completed').length,
        pending: scheduledInspections.filter(i => i.status === 'pending').length,
        overdue: scheduledInspections.filter(i => i.status === 'pending' && isOverdue(i.expected_time)).length
    };

    const currentShift = getCurrentShift();

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-6 h-6 text-blue-600" />
                            Inspection Schedule Monitor
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Real-time tracking of In-Process inspections • Current Shift: <span className="font-bold capitalize">{currentShift}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onConfigureSchedules && (
                        <button
                            onClick={onConfigureSchedules}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium transition"
                        >
                            <Settings className="w-4 h-4" />
                            Configure
                        </button>
                    )}
                    <button
                        onClick={handleGenerateSchedule}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold transition disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        {isGenerating ? 'Generating...' : 'Generate Schedule'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total Scheduled</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                    <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
                    <div className="text-sm text-green-600">Completed</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                    <div className="text-2xl font-bold text-blue-700">{stats.pending - stats.overdue}</div>
                    <div className="text-sm text-blue-600">Pending</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                    <div className="text-2xl font-bold text-amber-700">{stats.overdue}</div>
                    <div className="text-sm text-amber-600">Overdue</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={shiftFilter}
                            onChange={(e) => setShiftFilter(e.target.value as ShiftFilter)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Shifts</option>
                            <option value="morning">{SHIFT_LABELS.morning}</option>
                            <option value="afternoon">{SHIFT_LABELS.afternoon}</option>
                            <option value="night">{SHIFT_LABELS.night}</option>
                        </select>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <span className="text-xs text-gray-400 ml-auto">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading schedule...</p>
                    </div>
                ) : scheduledInspections.length === 0 ? (
                    <div className="p-12 text-center">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-700 mb-2">No Scheduled Inspections</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            No inspections scheduled for {new Date(selectedDate).toLocaleDateString()}.
                        </p>
                        <button
                            onClick={handleGenerateSchedule}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold transition"
                        >
                            <Plus className="w-4 h-4" />
                            Generate Schedule for Today
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Work Station</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Shift</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Expected Time</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Inspector</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {scheduledInspections.map((inspection) => {
                                const workStation = inspection.schedule?.work_station;
                                const shift = inspection.schedule?.shift || 'morning';

                                return (
                                    <tr key={inspection.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                    <Factory className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{workStation?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{workStation?.code || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getShiftBadge(shift)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatTime(inspection.expected_time)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(inspection)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {inspection.completed_by ? (
                                                <span className="text-sm text-gray-700">{inspection.completed_by}</span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {inspection.status === 'pending' && onStartInspection && workStation && (
                                                <button
                                                    onClick={() => onStartInspection(workStation.id, workStation.name, inspection.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs font-bold transition"
                                                >
                                                    <Play className="w-3.5 h-3.5" />
                                                    Start
                                                </button>
                                            )}
                                            {inspection.status === 'completed' && (
                                                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-medium transition">
                                                    View
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ScheduleMonitor;
