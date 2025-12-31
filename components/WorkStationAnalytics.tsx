import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Calendar, Filter, Download } from 'lucide-react';
import { getWorkStationAnalytics } from '../services/scheduleService';

interface WorkStationAnalyticsProps {
    onBack?: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const WorkStationAnalytics: React.FC<WorkStationAnalyticsProps> = ({ onBack }) => {
    const [dateRange, setDateRange] = useState('7d'); // 7d, 30d
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        // Calculate dates
        const end = new Date();
        const start = new Date();
        if (dateRange === '7d') start.setDate(end.getDate() - 7);
        if (dateRange === '30d') start.setDate(end.getDate() - 30);

        const result = await getWorkStationAnalytics(
            start.toISOString().split('T')[0] as string,
            end.toISOString().split('T')[0] as string
        );
        setData(result);
        setIsLoading(false);
    };

    // Derived stats
    const totalInspections = data.reduce((acc, curr) => acc + curr.total, 0);
    const totalCompleted = data.reduce((acc, curr) => acc + curr.completed, 0);
    const completionRate = totalInspections > 0 ? Math.round((totalCompleted / totalInspections) * 100) : 0;

    const shiftData = [
        { name: 'Morning', value: data.reduce((acc, curr) => acc + curr.shifts.morning, 0) },
        { name: 'Afternoon', value: data.reduce((acc, curr) => acc + curr.shifts.afternoon, 0) },
        { name: 'Night', value: data.reduce((acc, curr) => acc + curr.shifts.night, 0) }
    ];

    if (isLoading) {
        return <div className="p-12 flex justify-center text-gray-400">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setDateRange('7d')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${dateRange === '7d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        Last 7 Days
                    </button>
                    <button
                        onClick={() => setDateRange('30d')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${dateRange === '30d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        Last 30 Days
                    </button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Total Inspections</div>
                    <div className="text-3xl font-bold text-gray-900">{totalInspections}</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Completion Rate</div>
                    <div className="text-3xl font-bold text-blue-600">{completionRate}%</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Active Stations</div>
                    <div className="text-3xl font-bold text-purple-600">{data.length}</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Inspections per Station</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="stationName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={32} />
                                <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Shift Distribution</h3>
                    <div className="h-80 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={shiftData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {shiftData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Stacked Workstation Activity */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Workload by Shift & Station</h3>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f3f4f6" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                            <YAxis type="category" dataKey="stationName" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }} />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="shifts.morning" name="Morning" stackId="a" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
                            <Bar dataKey="shifts.afternoon" name="Afternoon" stackId="a" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={24} />
                            <Bar dataKey="shifts.night" name="Night" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default WorkStationAnalytics;
