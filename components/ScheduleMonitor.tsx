/**
 * Schedule Monitor Component
 * 
 * Real-time monitoring dashboard for In-Process Inspections.
 * Shows scheduled vs completed inspections in a matrix/timeline view.
 * Matches specific UI requirements: Routine Monitor with Shift Matrix.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar,
    Clock,
    Check,
    AlertTriangle,
    RefreshCw,
    Factory,
    Play as PlayIcon,
    ArrowLeft,
    Plus as PlusIcon,
    Wrench,
    MoreHorizontal
} from 'lucide-react';
import {
    getScheduledInspections,
    getWorkStations,
    generateDailySchedule
} from '../services/scheduleService';
import { ScheduledInspection, WorkStation } from '../types';

interface ScheduleMonitorProps {
    onBack: () => void;
    onStartInspection?: (workStationId: string, workStationName: string, scheduledId?: string) => void;
    onConfigureSchedules?: () => void;
}

type ShiftType = 'morning' | 'afternoon' | 'night';

// Helper to get current shift based on time - Inlined to avoid circular dependency
const getCurrentShift = (): ShiftType => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
};

const SHIFT_LABELS = {
    morning: 'Morning (6AM - 2PM)',
    afternoon: 'Afternoon (2PM - 10PM)',
    night: 'Night (10PM - 6AM)'
};

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

const ScheduleMonitor: React.FC<ScheduleMonitorProps> = ({
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
            const [inspections, stations] = await Promise.all([
                getScheduledInspections(selectedDate, activeShift),
                getWorkStations()
            ]);
            setScheduledInspections(inspections);
            // Sort stations: Production Lines first? Or Alphabetical?
            const sortedStations = [...stations].sort((a, b) => {
                const aIsLine = a.type === 'production_line' || a.name.includes('Line');
                const bIsLine = b.type === 'production_line' || b.name.includes('Line');
                if (aIsLine && !bIsLine) return -1;
                if (!aIsLine && bIsLine) return 1;
                return a.name.localeCompare(b.name);
            });
            setWorkStations(sortedStations);
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

    // --- Render Helpers (Moved UP to avoid TDZ) ---

    // Pure helper
    const getHourLabel = (hour: number) => {
        return `${hour.toString().padStart(2, '0')}:00`;
    };

    // Helper to determine if a slot should be active based on frequency
    const shouldShowSlot = (station: WorkStation, hourIndex: number) => {
        const freq = station.frequency || '1h';
        if (freq === '1h') return true;
        if (freq === '30m') return true;
        if (freq === '2h') return hourIndex % 2 === 0;
        if (freq === '4h') return hourIndex % 4 === 0;
        if (freq === 'shift') return hourIndex === 0;
        return true;
    };

    // State-dependent helper
    const findInspection = (stationId: string, hour: number) => {
        return scheduledInspections.find(i => {
            if (i.schedule?.work_station_id !== stationId) return false;
            const d = new Date(i.expected_time);
            return d.getHours() === hour;
        });
    };

    // --- Statistics (Moved DOWN because it uses helpers) ---
    const calculateStats = () => {
        let completed = 0;
        let pending = 0;
        let overdue = 0;
        const currentHours = SHIFT_HOURS[activeShift];
        const currentHourIndex = currentHours.indexOf(currentTime.getHours());

        workStations.forEach(station => {
            currentHours.forEach((hour, index) => {
                if (shouldShowSlot(station, index)) { // Now safe!
                    const inspection = findInspection(station.id, hour); // Now safe!
                    if (inspection && inspection.status === 'completed') {
                        completed++;
                    } else {
                        const isPast = index < currentHourIndex;
                        const isNow = index === currentHourIndex;
                        if (isPast) {
                            overdue++;
                        } else {
                            pending++;
                        }
                    }
                }
            });
        });
        return { completed, pending, overdue };
    };

    const currentStats = calculateStats();

    return (
        <div className="animate-fadeIn p-4 md:p-6 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-white rounded-full transition text-gray-500 hover:shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <RefreshCw className="w-6 h-6 text-blue-600" />
                            Routine Monitor
                        </h1>
                        <div className="flex items-center gap-2 text-gray-500 text-sm mt-1 font-medium">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-mono text-xl font-bold shadow-lg shadow-slate-200 tracking-wider">
                        {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>

                    <button className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-200 hover:bg-green-100 transition shadow-sm">
                        <PlayIcon className="w-5 h-5 fill-current" />
                    </button>

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className={`p-2.5 bg-white text-gray-400 border border-gray-200 rounded-xl hover:text-gray-600 hover:bg-gray-50 transition shadow-sm ${isLoading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="text-right text-xs text-gray-300 mb-4 font-medium">
                Last refresh: {lastRefresh.toLocaleTimeString()}
            </div>

            {/* Shift Tabs */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="flex items-center bg-gray-200/50 p-1.5 rounded-xl flex-1 md:flex-none">
                    {(['morning', 'afternoon', 'night'] as ShiftType[]).map((shift) => (
                        <button
                            key={shift}
                            onClick={() => setActiveShift(shift)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeShift === shift
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            {shift === 'morning' ? 'Shift A (Morning)' : shift === 'afternoon' ? 'Shift B (Afternoon)' : 'Shift C (Night)'}
                            <span className={`block text-[10px] font-normal mt-0.5 ${activeShift === shift ? 'text-blue-200' : 'text-gray-400'}`}>
                                {SHIFT_TIMES[shift]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex flex-col justify-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">{currentStats.completed}</div>
                        <div className="text-xs font-bold text-green-600 uppercase tracking-wide opacity-80">Completed</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex flex-col justify-center">
                        <div className="text-3xl font-bold text-amber-600 mb-1">{currentStats.pending}</div>
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wide opacity-80">Pending Now</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex flex-col justify-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">{currentStats.overdue}</div>
                        <div className="text-xs font-bold text-red-600 uppercase tracking-wide opacity-80">Overdue</div>
                    </div>
                </div>
            </div>

            {/* Matrix View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="py-5 px-6 font-bold text-gray-400 text-xs uppercase tracking-wider text-left w-64">
                                    STATION
                                </th>
                                {SHIFT_HOURS[activeShift].map(hour => {
                                    const isCurrentHour = currentTime.getHours() === hour;
                                    return (
                                        <th key={hour} className={`py-5 px-4 font-bold text-xs tracking-wider text-center w-24 relative ${isCurrentHour ? 'bg-blue-50/50' : ''}`}>
                                            {isCurrentHour && (
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                                            )}
                                            <span className={isCurrentHour ? 'text-blue-600' : 'text-gray-500'}>
                                                {getHourLabel(hour)}
                                            </span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {workStations.map((station) => {
                                const isLine = station.type === 'production_line' || (!station.type && station.name.includes('Line'));
                                return (
                                    <tr key={station.id} className="group hover:bg-slate-50/50 transition-colors">
                                        {/* Station Column */}
                                        <td className="py-4 px-6 bg-white group-hover:bg-slate-50/50 transition-colors border-r border-gray-50">
                                            <div className="flex items-center gap-3">
                                                {isLine ? (
                                                    <Factory className="w-5 h-5 text-purple-500" />
                                                ) : (
                                                    <Wrench className="w-5 h-5 text-blue-500" />
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{station.name}</div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        Every {station.frequency || '1h'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Time Slots */}
                                        {SHIFT_HOURS[activeShift].map((hour, index) => {
                                            const nowHour = currentTime.getHours();
                                            const currentShiftHours = SHIFT_HOURS[activeShift];
                                            const currentHourIndex = currentShiftHours.indexOf(nowHour);
                                            const slotHourIndex = index;

                                            // Status logic logic
                                            const isPastSlot = currentHourIndex !== -1 && slotHourIndex < currentHourIndex;
                                            const isFutureSlot = currentHourIndex !== -1 && slotHourIndex > currentHourIndex;
                                            const isCurrentSlot = nowHour === hour;

                                            const showSlot = shouldShowSlot(station, index);
                                            const inspection = findInspection(station.id, hour);

                                            return (
                                                <td key={hour} className={`p-3 text-center align-middle border-r border-gray-50/50 last:border-0 ${isCurrentSlot ? 'bg-blue-50/30' : ''}`}>
                                                    {!showSlot ? (
                                                        // Empty slot (frequency skip)
                                                        <div className="w-12 h-12 mx-auto rounded-xl bg-gray-50 border border-gray-100 border-dashed"></div>
                                                    ) : (
                                                        // Active slot
                                                        <div className="flex justify-center">
                                                            {inspection && inspection.status === 'completed' ? (
                                                                // Completed: Green
                                                                <div className="w-10 h-10 rounded-lg bg-green-500 text-white flex items-center justify-center shadow-sm shadow-green-200 group/item relative cursor-default">
                                                                    <Check className="w-5 h-5" strokeWidth={3} />
                                                                    {/* Tooltip */}
                                                                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover/item:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                                                        Done: {new Date(inspection.completed_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            ) : isPastSlot ? (
                                                                // Overdue: Red
                                                                <button
                                                                    onClick={() => onStartInspection?.(station.id, station.name, inspection?.id)}
                                                                    className="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-200 hover:bg-red-600 hover:scale-105 transition-all animate-pulse"
                                                                >
                                                                    <AlertTriangle className="w-5 h-5" strokeWidth={2.5} />
                                                                </button>
                                                            ) : (
                                                                // Pending (Current or Future): Yellow/Amber
                                                                <button
                                                                    onClick={() => isCurrentSlot || isPastSlot ? onStartInspection?.(station.id, station.name, inspection?.id) : null}
                                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${isCurrentSlot
                                                                        ? 'bg-amber-400 text-white shadow-md shadow-amber-200 hover:bg-amber-500 hover:scale-105'
                                                                        : 'bg-gray-100 text-gray-400'
                                                                        }`}
                                                                >
                                                                    <Clock className="w-5 h-5" strokeWidth={2.5} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend / Info */}
            <div className="flex justify-end gap-6 mt-6 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div> Completed
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-400"></div> Pending
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500"></div> Overdue
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gray-50 border border-gray-200 border-dashed"></div> No Schedule
                </div>
            </div>
        </div>
    );
};

export default ScheduleMonitor;
