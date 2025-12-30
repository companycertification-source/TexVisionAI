/**
 * Schedule Monitor Component
 * 
 * Real-time monitoring dashboard for In-Process Inspections.
 * Shows scheduled vs completed inspections in a matrix/timeline view.
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
    Settings,
    Plus,
    Check
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

type ShiftType = 'morning' | 'afternoon' | 'night';

const SHIFT_HOURS: Record<ShiftType, number[]> = {
    morning: [6, 7, 8, 9, 10, 11, 12, 13],
    afternoon: [14, 15, 16, 17, 18, 19, 20, 21],
    night: [22, 23, 0, 1, 2, 3, 4, 5]
};

const SHIFT_TIMES: Record<ShiftType, string> = {
    morning: '(06:00 - 14:00)',
    afternoon: '(14:00 - 22:00)',
    night: '(22:00 - 06:00)'
};

export const ScheduleMonitor: React.FC<ScheduleMonitorProps> = ({
    onBack,
    onStartInspection,
    onConfigureSchedules
}) => {
    // Determine initial shift based on current time
    const initialShift = getCurrentShift() as ShiftType;

    const [scheduledInspections, setScheduledInspections] = useState<ScheduledInspection[]>([]);
    const [workStations, setWorkStations] = useState<WorkStation[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
    const [activeShift, setActiveShift] = useState<ShiftType>(initialShift);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch ALL scheduled inspections for the day (or specific logic for night shift spanning days)
            // For simplicity, we fetch all and filter client-side for the matrix if needed, 
            // but the service filter helps reduce payload
            const [inspections, stations] = await Promise.all([
                getScheduledInspections(selectedDate, activeShift),
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
    }, [selectedDate, activeShift]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Live clock & Auto-refresh
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const refresher = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => {
            clearInterval(timer);
            clearInterval(refresher);
        };
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

    // --- Statistics ---
    const stats = {
        total: scheduledInspections.length,
        completed: scheduledInspections.filter(i => i.status === 'completed').length,
        pending: scheduledInspections.filter(i => i.status === 'pending' && !isOverdue(i.expected_time)).length,
        overdue: scheduledInspections.filter(i => i.status === 'pending' && isOverdue(i.expected_time)).length,
        missed: scheduledInspections.filter(i => i.status === 'missed').length
    };

    // --- Render Helpers ---

    const getHourLabel = (hour: number) => {
        return `${hour.toString().padStart(2, '0')}:00`;
    };

    // Find inspection for a specific station at a specific hour
    const findInspection = (stationId: string, hour: number) => {
        return scheduledInspections.find(i => {
            if (i.schedule?.work_station_id !== stationId) return false;
            const d = new Date(i.expected_time);
            return d.getHours() === hour;
        });
    };

    return (
        <div className="animate-fadeIn p-2 md:p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-7 h-7 text-blue-600" />
                            Routine Monitor
                        </h1>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-xl font-bold shadow-lg">
                        {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                    </div>

                    <button
                        onClick={handleGenerateSchedule}
                        disabled={isGenerating}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition whitespace-nowrap hidden md:flex items-center gap-2 font-medium text-sm"
                        title="Generate Schedule"
                    >
                        <Plus className="w-4 h-4" />
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className={`p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition ${isLoading ? 'animate-spin' : ''}`}
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Shift Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-8 bg-gray-100 p-1.5 rounded-xl w-full md:w-fit">
                {(['morning', 'afternoon', 'night'] as ShiftType[]).map((shift) => (
                    <button
                        key={shift}
                        onClick={() => setActiveShift(shift)}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeShift === shift
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-white/50'
                            }`}
                    >
                        {SHIFT_LABELS[shift]} <span className="opacity-75 text-xs ml-1 font-normal hidden sm:inline">{SHIFT_TIMES[shift]}</span>
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 rounded-xl p-5 border border-green-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-green-700">{stats.completed}</h3>
                        <p className="text-sm font-medium text-green-600 mt-1">Completed</p>
                    </div>
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-green-200 group-hover:scale-110 transition tablet:w-16 tablet:h-16" />
                </div>

                <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-yellow-700">{stats.pending}</h3>
                        <p className="text-sm font-medium text-yellow-600 mt-1">Pending Now</p>
                    </div>
                    <Timer className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-yellow-200 group-hover:scale-110 transition tablet:w-16 tablet:h-16" />
                </div>

                <div className="bg-red-50 rounded-xl p-5 border border-red-100 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-bold text-red-700">{stats.overdue + stats.missed}</h3>
                        <p className="text-sm font-medium text-red-600 mt-1">Overdue / Missed</p>
                    </div>
                    <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 text-red-200 group-hover:scale-110 transition tablet:w-16 tablet:h-16" />
                </div>
            </div>

            {/* Matrix View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-gray-200 text-left">
                                <th className="py-4 px-6 font-bold text-gray-500 text-xs uppercase tracking-wider sticky left-0 bg-slate-50 z-10 w-64 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    STATION
                                </th>
                                {SHIFT_HOURS[activeShift].map(hour => (
                                    <th key={hour} className={`py-4 px-4 font-bold text-xs uppercase tracking-wider text-center w-24 ${currentTime.getHours() === hour ? 'bg-blue-50 text-blue-600' : 'text-gray-500'
                                        }`}>
                                        {getHourLabel(hour)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {workStations.map((station) => (
                                <tr key={station.id} className="hover:bg-gray-50/50 transition">
                                    {/* Station Column */}
                                    <td className="py-4 px-6 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center gap-3">
                                            <div className="hidden md:flex w-10 h-10 rounded-lg bg-indigo-50 items-center justify-center text-indigo-600">
                                                <Factory className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{station.name}</div>
                                                <div className="text-xs text-slate-400">Freq: Every 1h</div>
                                                {/* NOTE: Assuming 1h for UI, ideally from station config */}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Time Slots */}
                                    {SHIFT_HOURS[activeShift].map(hour => {
                                        const inspection = findInspection(station.id, hour);
                                        const nowHour = currentTime.getHours();
                                        const isPast = activeShift === 'night'
                                            ? (hour < 12 && nowHour >= 12) || (hour < nowHour && nowHour < 12) || (hour > 12 && nowHour > 12 && hour < nowHour)
                                            : hour < nowHour;
                                        const isCurrent = hour === nowHour;

                                        return (
                                            <td key={hour} className={`p-4 text-center ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                                                {inspection ? (
                                                    // Inspection exists
                                                    <div className="flex justify-center group relative">
                                                        {inspection.status === 'completed' ? (
                                                            <button className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition shadow-sm">
                                                                <Check className="w-5 h-5" />
                                                            </button>
                                                        ) : inspection.status === 'missed' ? (
                                                            <button className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition shadow-sm animate-pulse">
                                                                <AlertCircle className="w-5 h-5" />
                                                            </button>
                                                        ) : isOverdue(inspection.expected_time) ? (
                                                            <button
                                                                onClick={() => onStartInspection?.(station.id, station.name, inspection.id)}
                                                                className="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-md animate-pulse"
                                                                title="Overdue - Start Now"
                                                            >
                                                                <AlertCircle className="w-5 h-5" />
                                                            </button>
                                                        ) : (
                                                            // Pending (Future or Current)
                                                            <button
                                                                onClick={() => onStartInspection?.(station.id, station.name, inspection.id)}
                                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition shadow-sm ${isCurrent
                                                                        ? 'bg-yellow-400 text-white hover:bg-yellow-500 ring-4 ring-yellow-100'
                                                                        : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                                    }`}
                                                                title="Pending - Start"
                                                            >
                                                                <Clock className="w-5 h-5" />
                                                            </button>
                                                        )}

                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20">
                                                            {inspection.status === 'completed' ? `Completed by ${inspection.completed_by}` :
                                                                inspection.status === 'pending' ? 'Scheduled' : 'Missed'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // No inspection scheduled
                                                    <div className="flex justify-center">
                                                        <div className={`w-10 h-10 rounded-lg ${isPast ? 'bg-gray-100' : 'bg-gray-50 border border-gray-100 border-dashed'}`}></div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {workStations.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-gray-500">
                                        No work stations configured.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-right text-xs text-gray-400 mt-2">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
            </div>
        </div>
    );
};

export default ScheduleMonitor;
