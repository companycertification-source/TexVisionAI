/**
 * Mock Data for In-Process Inspection Schedules
 * Used for demo/development purposes
 */

import { WorkStation, InspectionSchedule, ScheduledInspection } from '../types';

export const MOCK_WORK_STATIONS: WorkStation[] = [
    {
        id: 'ws-001',
        code: 'CUT-01',
        name: 'Cutting Station 1',
        description: 'Main fabric cutting area',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'ws-002',
        code: 'SEW-01',
        name: 'Sewing Line A',
        description: 'Primary sewing production line',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'ws-003',
        code: 'SEW-02',
        name: 'Sewing Line B',
        description: 'Secondary sewing production line',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'ws-004',
        code: 'FIN-01',
        name: 'Finishing Station',
        description: 'Final inspection and finishing',
        is_active: true,
        created_at: new Date().toISOString()
    },
    {
        id: 'ws-005',
        code: 'QC-01',
        name: 'Quality Check Point',
        description: 'In-line quality control station',
        is_active: true,
        created_at: new Date().toISOString()
    }
];

export const MOCK_INSPECTION_SCHEDULES: InspectionSchedule[] = [
    {
        id: 'sch-001',
        work_station_id: 'ws-001',
        shift: 'morning',
        frequency_per_hour: 0.5,
        interval_minutes: 120,
        is_active: true,
        work_station: MOCK_WORK_STATIONS[0]
    },
    {
        id: 'sch-002',
        work_station_id: 'ws-002',
        shift: 'morning',
        frequency_per_hour: 1,
        interval_minutes: 60,
        is_active: true,
        work_station: MOCK_WORK_STATIONS[1]
    },
    {
        id: 'sch-003',
        work_station_id: 'ws-002',
        shift: 'afternoon',
        frequency_per_hour: 1,
        interval_minutes: 60,
        is_active: true,
        work_station: MOCK_WORK_STATIONS[1]
    },
    {
        id: 'sch-004',
        work_station_id: 'ws-003',
        shift: 'morning',
        frequency_per_hour: 0.67,
        interval_minutes: 90,
        is_active: true,
        work_station: MOCK_WORK_STATIONS[2]
    },
    {
        id: 'sch-005',
        work_station_id: 'ws-004',
        shift: 'afternoon',
        frequency_per_hour: 0.5,
        interval_minutes: 120,
        is_active: true,
        work_station: MOCK_WORK_STATIONS[3]
    }
];

// Generate mock scheduled inspections for today
function generateMockScheduledInspections(): ScheduledInspection[] {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const inspections: ScheduledInspection[] = [];

    // Morning shift (6 AM - 2 PM)
    const morningSchedules = MOCK_INSPECTION_SCHEDULES.filter(s => s.shift === 'morning');
    morningSchedules.forEach((schedule, idx) => {
        const baseHour = 6 + (idx * 2);
        for (let i = 0; i < 3; i++) {
            const hour = baseHour + (i * 2);
            if (hour < 14) {
                const expectedTime = new Date(`${today}T${String(hour).padStart(2, '0')}:00:00`);
                const isPast = expectedTime < new Date();

                inspections.push({
                    id: `si-${inspections.length + 1}`,
                    schedule_id: schedule.id,
                    shift_date: today,
                    expected_time: expectedTime.toISOString(),
                    status: isPast ? (Math.random() > 0.3 ? 'completed' : 'pending') : 'pending',
                    completed_at: (isPast && Math.random() > 0.3 ? new Date(expectedTime.getTime() + 15 * 60000).toISOString() : undefined) as string | undefined,
                    completed_by: isPast && Math.random() > 0.3 ? 'Demo Inspector' : undefined,
                    schedule: schedule
                });
            }
        }
    });

    // Afternoon shift (2 PM - 10 PM)
    const afternoonSchedules = MOCK_INSPECTION_SCHEDULES.filter(s => s.shift === 'afternoon');
    afternoonSchedules.forEach((schedule, idx) => {
        const baseHour = 14 + idx;
        for (let i = 0; i < 4; i++) {
            const hour = baseHour + (i * 2);
            if (hour < 22) {
                const expectedTime = new Date(`${today}T${String(hour).padStart(2, '0')}:00:00`);
                const isPast = expectedTime < new Date();

                inspections.push({
                    id: `si-${inspections.length + 1}`,
                    schedule_id: schedule.id,
                    shift_date: today,
                    expected_time: expectedTime.toISOString(),
                    status: isPast ? (Math.random() > 0.4 ? 'completed' : 'pending') : 'pending',
                    completed_at: (isPast && Math.random() > 0.4 ? new Date(expectedTime.getTime() + 20 * 60000).toISOString() : undefined) as string | undefined,
                    completed_by: isPast && Math.random() > 0.4 ? 'Demo Inspector' : undefined,
                    schedule: schedule
                });
            }
        }
    });

    return inspections.sort((a, b) =>
        new Date(a.expected_time).getTime() - new Date(b.expected_time).getTime()
    );
}

export const MOCK_SCHEDULED_INSPECTIONS = generateMockScheduledInspections();
