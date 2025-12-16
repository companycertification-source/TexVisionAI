import React, { useState, useMemo, useEffect } from 'react';
import { InspectionReport } from '../types';
import { Search, ArrowLeft, User, CheckCircle2, XCircle, TrendingUp, BarChart3, Award, Calendar, ChevronRight, UserCheck, Layers } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

interface InspectorViewProps {
  history: InspectionReport[];
  currentInspector: string;
  onBack: () => void;
  onViewReport: (report: InspectionReport) => void;
}

const CHART_COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#6366f1'];

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const inspectorData = payload.find((p: any) => p.dataKey === 'defectRate');
    const globalData = payload.find((p: any) => p.dataKey === 'globalAvg');

    const inspectorVal = inspectorData ? inspectorData.value : 0;
    const globalVal = globalData ? globalData.value : 0;
    const diff = inspectorVal - globalVal;

    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm z-50 min-w-[180px]">
        <p className="font-bold text-gray-900 mb-2 pb-1 border-b border-gray-100">{label}</p>
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="text-gray-600">Inspector:</span>
          </div>
          <span className="font-bold text-gray-900">{inspectorVal.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span className="text-gray-600">Global Avg:</span>
          </div>
          <span className="font-bold text-gray-900">{globalVal.toFixed(1)}%</span>
        </div>
        <div className={`pt-2 border-t border-gray-100 font-bold text-xs flex justify-between items-center ${diff > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          <span>Variance:</span>
          <span>{diff > 0 ? `+${diff.toFixed(1)}% (Above)` : `${diff.toFixed(1)}% (Below)`}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const InspectorView: React.FC<InspectorViewProps> = ({ history, currentInspector, onBack, onViewReport }) => {
  const [selectedInspector, setSelectedInspector] = useState<string>(currentInspector);
  const [searchTerm, setSearchTerm] = useState('');

  // Get list of unique inspectors
  const inspectors = useMemo(() => {
    const names = new Set(history.map(h => h.inspection_header.inspector_name).filter(Boolean));
    return Array.from(names).sort();
  }, [history]);

  // Aggregate stats for the selected inspector
  const stats = useMemo(() => {
    if (!selectedInspector) return null;

    const inspectorReports = history
      .filter(r => r.inspection_header.inspector_name === selectedInspector)
      .sort((a, b) => new Date(a.inspection_header.inspection_date_time).getTime() - new Date(b.inspection_header.inspection_date_time).getTime());

    const total = inspectorReports.length;
    if (total === 0) return null;

    const rejected = inspectorReports.filter(r => r.lot_assessment.lot_status.includes('reject')).length;
    const passed = inspectorReports.filter(r => r.lot_assessment.lot_status === 'accept').length;

    // Calculate Average Defect Rate found by this inspector (Strictness)
    const defectRateSum = inspectorReports.reduce((acc, curr) =>
      acc + (curr.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0), 0);
    const avgDefectRate = defectRateSum / total;

    // Global Stats for comparison
    const allDefectRateSum = history.reduce((acc, curr) =>
      acc + (curr.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0), 0);
    const globalAvgDefectRate = history.length > 0 ? allDefectRateSum / history.length : 0;

    // Trend Data (Last 10 inspections)
    const trendData = inspectorReports.slice(-10).map(r => ({
      date: new Date(r.inspection_header.inspection_date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      defectRate: r.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0,
      globalAvg: parseFloat(globalAvgDefectRate.toFixed(2))
    }));

    // Defect Mix (Stacked) - Last 10
    const defectKeysSet = new Set<string>();
    const defectMixTrend = inspectorReports.slice(-10).map(r => {
      const entry: any = {
        date: new Date(r.inspection_header.inspection_date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      };
      r.lot_assessment.defect_summary.forEach(d => {
        const key = d.class.replace(/_/g, ' ');
        defectKeysSet.add(key);
        entry[key] = d.count;
      });
      return entry;
    });
    const defectKeys = Array.from(defectKeysSet);

    return {
      reports: inspectorReports.reverse(), // Show newest first in list
      total,
      rejected,
      passRate: ((passed / total) * 100).toFixed(1),
      rejectionRate: ((rejected / total) * 100).toFixed(1),
      avgDefectRate: avgDefectRate.toFixed(2),
      globalAvgDefectRate: globalAvgDefectRate.toFixed(2),
      trendData,
      defectMixTrend,
      defectKeys
    };
  }, [history, selectedInspector]);

  // Handle case where logged in user might not have history yet, but is in the list
  useEffect(() => {
    if (!inspectors.includes(selectedInspector) && inspectors.length > 0 && selectedInspector !== currentInspector) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedInspector(inspectors[0]!);
    }
  }, [inspectors, selectedInspector, currentInspector]);

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="w-full md:w-auto">
            <button onClick={onBack} className="flex items-center text-sm text-gray-500 hover:text-blue-700 mb-2 transition font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-8 h-8 text-indigo-600" />
              Inspector Performance
            </h1>
            <p className="text-sm text-gray-500">Track accuracy, consistency, and workload</p>
          </div>

          {/* Inspector Selector */}
          <div className="w-full md:w-64">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Inspector</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedInspector}
                onChange={(e) => setSelectedInspector(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-indigo-500"
              >
                {inspectors.map(name => (
                  <option key={name} value={name}>
                    {name} {name === currentInspector ? '(You)' : ''}
                  </option>
                ))}
                {!inspectors.includes(currentInspector) && (
                  <option value={currentInspector}>{currentInspector} (You)</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {stats ? (
          <div className="space-y-6">

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-indigo-800 uppercase">Total Inspections</span>
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-3xl font-black text-indigo-900">{stats.total}</span>
                <span className="text-xs text-indigo-600 font-medium">Lifetime inspections</span>
              </div>

              <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-green-800 uppercase">Approval Rate</span>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-3xl font-black text-green-900">{stats.passRate}%</span>
                <span className="text-xs text-green-600 font-medium">{stats.total - stats.rejected} approved lots</span>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-red-800 uppercase">Rejection Rate</span>
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <span className="text-3xl font-black text-red-900">{stats.rejectionRate}%</span>
                <span className="text-xs text-red-600 font-medium">{stats.rejected} rejected lots</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-600 uppercase">Strictness (Avg Defect %)</span>
                  <Award className="w-4 h-4 text-gray-500" />
                </div>
                <span className="text-3xl font-black text-gray-900">{stats.avgDefectRate}%</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 font-medium">Global Avg: {stats.globalAvgDefectRate}%</span>
                  {parseFloat(stats.avgDefectRate) > parseFloat(stats.globalAvgDefectRate) ? (
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded font-bold">Stricter</span>
                  ) : (
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-bold">Lenient</span>
                  )}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Defect Detection Trend (Last 10 Inspections)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="defectRate"
                      name="Inspector Found %"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="globalAvg"
                      name="Global Avg %"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* New Stacked Bar Chart for Defect Mix */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Defect Mix Analysis (Last 10 Inspections)
              </h3>
              {stats.defectMixTrend.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.defectMixTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      {stats.defectKeys.map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="a"
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          barSize={40}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                  No defect data available for trend analysis.
                </div>
              )}
            </div>

            {/* Recent History Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Inspection History</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 w-full"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">PO Number</th>
                      <th className="px-6 py-3 font-semibold">Supplier</th>
                      <th className="px-6 py-3 font-semibold text-center">Outcome</th>
                      <th className="px-6 py-3 font-semibold text-right">Defect %</th>
                      <th className="px-6 py-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.reports
                      .filter(r => r.inspection_header.po_number.includes(searchTerm) || r.inspection_header.supplier_name.includes(searchTerm))
                      .map((report, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50 transition cursor-pointer group" onClick={() => onViewReport(report)}>
                          <td className="px-6 py-4 text-gray-900">
                            {new Date(report.inspection_header.inspection_date_time).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-600">{report.inspection_header.po_number}</td>
                          <td className="px-6 py-4 text-gray-800 max-w-[200px] truncate">{report.inspection_header.supplier_name}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${report.lot_assessment.lot_status.includes('reject') ? 'bg-red-100 text-red-800' :
                              report.lot_assessment.lot_status.includes('remarks') ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {report.lot_assessment.lot_status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            {report.performance_insights?.supplier_performance?.current_lot_defect_rate_percent.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 inline-block transition" />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No data found</h3>
            <p className="text-gray-500 text-sm">No inspections recorded for this user yet.</p>
          </div>
        )}

      </div>
    </div>
  );
};