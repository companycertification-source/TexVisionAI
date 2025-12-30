/**
 * Schedule Service
 * 
 * Handles work stations, inspection schedules, and scheduled inspection tracking
 * for In-Process Inspections.
 */

import { supabase } from './supabaseClient';
import { WorkStation, InspectionSchedule, ScheduledInspection } from '../types';

// Shift time ranges (in 24h format)
export const SHIFT_TIMES = {
    morning: { start: 6, end: 14 },    // 6AM - 2PM
    afternoon: { start: 14, end: 22 }, // 2PM - 10PM
    night: { start: 22, end: 6 }       // 10PM - 6AM (next day)
};

export const SHIFT_LABELS = {
    morning: 'Morning (6AM - 2PM)',
    afternoon: 'Afternoon (2PM - 10PM)',
    night: 'Night (10PM - 6AM)'
};

// Helper to check if supabase is initialized
function ensureSupabase() {
    if (!supabase) {
        throw new Error('Supabase client not initialized');
    }
    return supabase;
}

// ==================== Work Stations ====================

export async function getWorkStations(): Promise<WorkStation[]> {
    try {
        const client = ensureSupabase();
        const { data, error } = await client
            .from('work_stations')
            .select('*')
            .order('name');

        if (error) {
            console.error('[scheduleService] Error fetching work stations:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[scheduleService] getWorkStations error:', error);
        return [];
    }
}

export async function saveWorkStation(workStation: Partial<WorkStation>): Promise<boolean> {
    try {
        const { id, ...wsData } = workStation;

        if (id) {
            // Update existing
            const client = ensureSupabase();
            const { error } = await client
                .from('work_stations')
                .update(wsData)
                .eq('id', id);

            if (error) {
                console.error('[scheduleService] Error updating work station:', error);
                return false;
            }
        } else {
            // Insert new
            const client = ensureSupabase();
            const { error } = await client
                .from('work_stations')
                .insert([wsData]);

            if (error) {
                console.error('[scheduleService] Error creating work station:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('[scheduleService] saveWorkStation error:', error);
        return false;
    }
}

export async function deleteWorkStation(id: string): Promise<boolean> {
    try {
        const client = ensureSupabase();
        const { error } = await client
            .from('work_stations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[scheduleService] Error deleting work station:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[scheduleService] deleteWorkStation error:', error);
        return false;
    }
}

// ==================== Inspection Schedules ====================

export async function getSchedules(workStationId?: string): Promise<InspectionSchedule[]> {
    try {
        const client = ensureSupabase();
        let query = client
            .from('inspection_schedules')
            .select(`
        *,
        work_station:work_stations(*)
      `);

        if (workStationId) {
            query = query.eq('work_station_id', workStationId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[scheduleService] Error fetching schedules:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[scheduleService] getSchedules error:', error);
        return [];
    }
}

export async function saveSchedule(schedule: Partial<InspectionSchedule>): Promise<boolean> {
    try {
        const { id, work_station, ...scheduleData } = schedule;

        if (id) {
            const client = ensureSupabase();
            const { error } = await client
                .from('inspection_schedules')
                .update(scheduleData)
                .eq('id', id);

            if (error) {
                console.error('[scheduleService] Error updating schedule:', error);
                return false;
            }
        } else {
            const client = ensureSupabase();
            const { error } = await client
                .from('inspection_schedules')
                .insert([scheduleData]);

            if (error) {
                console.error('[scheduleService] Error creating schedule:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('[scheduleService] saveSchedule error:', error);
        return false;
    }
}

// ==================== Scheduled Inspections ====================

export async function getScheduledInspections(
    date: string,
    shift?: 'morning' | 'afternoon' | 'night'
): Promise<ScheduledInspection[]> {
    try {
        const client = ensureSupabase();
        let query = client
            .from('scheduled_inspections')
            .select(`
        *,
        schedule:inspection_schedules(
          *,
          work_station:work_stations(*)
        )
      `)
            .eq('shift_date', date)
            .order('expected_time');

        if (shift) {
            // Filter by schedule's shift
            query = query.eq('schedule.shift', shift);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[scheduleService] Error fetching scheduled inspections:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[scheduleService] getScheduledInspections error:', error);
        return [];
    }
}

export async function markInspectionComplete(
    scheduledId: string,
    inspectionId: string,
    inspector: string
): Promise<boolean> {
    try {
        const client = ensureSupabase();
        const { error } = await client
            .from('scheduled_inspections')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                completed_by: inspector,
                inspection_id: inspectionId
            })
            .eq('id', scheduledId);

        if (error) {
            console.error('[scheduleService] Error marking complete:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[scheduleService] markInspectionComplete error:', error);
        return false;
    }
}

/**
 * Generate scheduled inspection slots for a given date based on active schedules
 */
export async function generateDailySchedule(date: string): Promise<boolean> {
    try {
        // Get all active schedules
        const client = ensureSupabase();
        const { data: schedules, error: scheduleError } = await client
            .from('inspection_schedules')
            .select('*')
            .eq('is_active', true);

        if (scheduleError || !schedules) {
            console.error('[scheduleService] Error fetching schedules for generation:', scheduleError);
            return false;
        }

        const newSlots: Partial<ScheduledInspection>[] = [];

        for (const schedule of schedules) {
            const shiftTimes = SHIFT_TIMES[schedule.shift as keyof typeof SHIFT_TIMES];
            const intervalMinutes = schedule.interval_minutes || 60;

            // Calculate inspection times for this schedule
            let currentHour = shiftTimes.start;
            const endHour = shiftTimes.end;

            // Handle night shift crossing midnight
            const isNightShift = schedule.shift === 'night';
            const hoursInShift = isNightShift ? 8 : (endHour - currentHour);
            const slotsCount = Math.floor((hoursInShift * 60) / intervalMinutes);

            for (let i = 0; i < slotsCount; i++) {
                const minutesOffset = i * intervalMinutes;
                const hours = Math.floor(minutesOffset / 60);
                const minutes = minutesOffset % 60;

                let slotHour = (currentHour + hours) % 24;
                const slotDate = isNightShift && slotHour < 6
                    ? new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    : date;

                const expectedTime = new Date(`${slotDate}T${String(slotHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

                newSlots.push({
                    schedule_id: schedule.id,
                    shift_date: date,
                    expected_time: expectedTime.toISOString(),
                    status: 'pending'
                });
            }
        }

        if (newSlots.length > 0) {
            if (!supabase) {
                console.error('[scheduleService] Supabase client not initialized');
                return false;
            }

            // Delete existing slots for this date first (to allow regeneration)
            const client = ensureSupabase();
            await client
                .from('scheduled_inspections')
                .delete()
                .eq('shift_date', date)
                .eq('status', 'pending');

            // Insert new slots
            const { error } = await client
                .from('scheduled_inspections')
                .insert(newSlots);

            if (error) {
                console.error('[scheduleService] Error inserting slots:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('[scheduleService] generateDailySchedule error:', error);
        return false;
    }
}

/**
 * Get current shift based on time
 */
export function getCurrentShift(): 'morning' | 'afternoon' | 'night' {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
}

/**
 * Check if an expected time is overdue
 */
export function isOverdue(expectedTime: string): boolean {
    return new Date(expectedTime) < new Date();
}
