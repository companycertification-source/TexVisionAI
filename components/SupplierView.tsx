import React, { useState, useMemo } from 'react';
import { InspectionReport } from '../types';
import { Search, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Building2, TrendingUp, Calendar, ChevronRight, Activity, PieChart, BarChart2, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Package, Award, Layers } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';

interface SupplierViewProps {
  history: InspectionReport[];
  onBack: () => void;
  onViewReport: (report: InspectionReport) => void;
}

interface SupplierStats {
  name: string;
  totalLots: number;
  rejectedLots: number;
  acceptedWithRemarks: number;
  avgDefectRate: number;
  lastInspection: string;
  grade: 'A' | 'B' | 'C' | 'D';
}

type SortKey = keyof SupplierStats;

const CHART_COLORS = ['#3b82f6', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#f59e0b', '#6366f1'];

export const SupplierView: React.FC<SupplierViewProps> = ({ history, onBack, onViewReport }) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'grade', // Default sort by grade to show best performers first (Ascending A->D)
    direction: 'asc',
  });

  // --- Main Supplier List Logic ---

  // 1. Filter raw history
  const filteredHistory = useMemo(() => {
    return history.filter(report => {
      const reportDate = new Date(report.inspection_header.inspection_date_time).toISOString().split('T')[0] || '';
      const matchesDate = filterDate ? reportDate >= filterDate : true;
      return matchesDate;
    });
  }, [history, filterDate]);

  // 2. Aggregate data by supplier
  const supplierStats = useMemo(() => {
    const statsMap = new Map<string, {
      total: number;
      rejected: number;
      remarks: number;
      defectRateSum: number;
      defectRateCount: number;
      lastDate: string;
    }>();

    filteredHistory.forEach(report => {
      const name = report.inspection_header.supplier_name;
      const current = statsMap.get(name) || {
        total: 0,
        rejected: 0,
        remarks: 0,
        defectRateSum: 0,
        defectRateCount: 0,
        lastDate: ''
      };

      current.total += 1;

      const status = report.lot_assessment.lot_status as string;
      if (status === 'reject' || status === 'rejected') {
        current.rejected += 1;
      } else if (status === 'accept_with_remarks' || status === 'accepted_with_minor_defects') {
        current.remarks += 1;
      }

      const defectRate = report.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0;
      current.defectRateSum += defectRate;
      current.defectRateCount += 1;

      if (!current.lastDate || new Date(report.inspection_header.inspection_date_time) > new Date(current.lastDate)) {
        current.lastDate = report.inspection_header.inspection_date_time;
      }

      statsMap.set(name, current);
    });

    const results: SupplierStats[] = [];
    statsMap.forEach((data, name) => {
      if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return;
      }

      const rejectionRate = data.rejected / data.total;
      const avgRate = data.defectRateCount > 0 ? (data.defectRateSum / data.defectRateCount) : 0;

      // Grade Calculation Logic
      let grade: 'A' | 'B' | 'C' | 'D' = 'A';
      if (rejectionRate > 0.1 || avgRate > 5) {
        grade = 'D';
      } else if (rejectionRate > 0.05 || avgRate > 2) {
        grade = 'C';
      } else if (avgRate > 1) {
        grade = 'B';
      }

      results.push({
        name: name,
        totalLots: data.total,
        rejectedLots: data.rejected,
        acceptedWithRemarks: data.remarks,
        avgDefectRate: avgRate,
        lastInspection: data.lastDate,
        grade: grade
      });
    });

    return results;
  }, [filteredHistory, searchTerm]);

  // 3. Global Stats Calculation
  const globalStats = useMemo(() => {
    if (supplierStats.length === 0) return null;

    const totalLots = supplierStats.reduce((acc, curr) => acc + curr.totalLots, 0);
    const totalRejected = supplierStats.reduce((acc, curr) => acc + curr.rejectedLots, 0);
    // Weighted average defect rate based on lot volume
    const weightedDefectRate = supplierStats.reduce((acc, curr) => acc + (curr.avgDefectRate * curr.totalLots), 0) / (totalLots || 1);

    // Suppliers with > 0 rejections or high defect rate
    const riskySuppliers = supplierStats.filter(s => s.grade === 'C' || s.grade === 'D').length;

    return {
      totalLots,
      totalRejected,
      weightedDefectRate,
      riskySuppliers,
      supplierCount: supplierStats.length
    };
  }, [supplierStats]);

  // 4. Sort
  const sortedStats = useMemo(() => {
    return [...supplierStats].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [supplierStats, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    // For Grade, ascending means A -> D (Good -> Bad), so default asc makes sense for "Best"
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else {
      // Default directions per key type
      if (key === 'grade') direction = 'asc'; // A first
      else direction = 'desc'; // High numbers first
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-gray-400 ml-1" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600 ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-600 ml-1" />;
  };

  const getGradeBadge = (grade: string) => {
    const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 shadow-sm";
    switch (grade) {
      case 'A': return <div className={`${baseClasses} bg-green-100 text-green-700 border-green-200`}>A</div>;
      case 'B': return <div className={`${baseClasses} bg-blue-100 text-blue-700 border-blue-200`}>B</div>;
      case 'C': return <div className={`${baseClasses} bg-yellow-100 text-yellow-700 border-yellow-200`}>C</div>;
      case 'D': return <div className={`${baseClasses} bg-red-100 text-red-700 border-red-200`}>D</div>;
      default: return <div className={`${baseClasses} bg-gray-100 text-gray-500`}>-</div>;
    }
  };

  // --- Drill Down View Logic ---

  const supplierDetail = useMemo(() => {
    if (!selectedSupplier) return null;

    const supplierReports = history
      .filter(r => r.inspection_header.supplier_name === selectedSupplier)
      .sort((a, b) => new Date(a.inspection_header.inspection_date_time).getTime() - new Date(b.inspection_header.inspection_date_time).getTime());

    // Trend Data for Line Chart
    const trendData = supplierReports.map(r => ({
      date: new Date(r.inspection_header.inspection_date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      defectRate: r.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0,
      status: r.lot_assessment.lot_status
    }));

    // Top Defects for Bar Chart
    const defectCounts: Record<string, number> = {};
    supplierReports.forEach(r => {
      r.images.forEach(img => {
        img.defects.forEach(d => {
          const cls = d.class.replace(/_/g, ' ');
          defectCounts[cls] = (defectCounts[cls] || 0) + d.count;
        });
      });
    });

    const defectData = Object.entries(defectCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    // Defect Mix Trend (Stacked Bar Data) - Last 10 inspections
    const defectKeysSet = new Set<string>();
    const defectMixTrend = supplierReports.slice(-10).map(r => {
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

    // Overall Risk Calculation (Match with List Logic)
    const total = supplierReports.length;
    const rejections = supplierReports.filter(r => r.lot_assessment.lot_status.includes('reject')).length;
    const avgRate = supplierReports.reduce((acc, curr) => acc + (curr.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0), 0) / total;

    let riskLevel = 'Low';
    let riskColor = 'text-green-600';
    let grade = 'A';

    if (rejections / total > 0.1 || avgRate > 5) {
      riskLevel = 'High';
      riskColor = 'text-red-600';
      grade = 'D';
    } else if (rejections / total > 0.05 || avgRate > 2) {
      riskLevel = 'Medium';
      riskColor = 'text-orange-500';
      grade = 'C';
    } else if (avgRate > 1) {
      riskLevel = 'Moderate';
      riskColor = 'text-blue-600';
      grade = 'B';
    }

    return {
      reports: supplierReports.reverse(),
      trendData,
      defectData,
      riskLevel,
      riskColor,
      grade,
      avgRate,
      defectMixTrend,
      defectKeys
    };
  }, [selectedSupplier, history]);


  if (selectedSupplier && supplierDetail) {
    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
          <div>
            <button onClick={() => setSelectedSupplier(null)} className="flex items-center text-sm text-gray-500 hover:text-blue-700 mb-2 transition font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Vendors
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-gray-400" />
              {selectedSupplier}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">Risk Assessment:</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${supplierDetail.riskColor}`}>
                {supplierDetail.riskLevel === 'Low' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {supplierDetail.riskLevel} Risk (Grade {supplierDetail.grade})
              </span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-center">
              <span className="block text-xl font-bold text-blue-700">{supplierDetail.reports.length}</span>
              <span className="text-xs text-blue-600 font-medium">Inspections</span>
            </div>
            <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-center">
              <span className="block text-xl font-bold text-red-700">
                {supplierDetail.reports.filter(r => r.lot_assessment.lot_status.includes('reject')).length}
              </span>
              <span className="text-xs text-red-600 font-medium">Rejections</span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Defect Rate Trend
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={supplierDetail.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value: number | undefined) => [`${(value || 0).toFixed(1)}%`, 'Defect Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="defectRate"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-orange-600" />
              Common Defect Types
            </h3>
            {supplierDetail.defectData.length > 0 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierDetail.defectData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={24}>
                      {supplierDetail.defectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                No defects recorded yet.
              </div>
            )}
          </div>

          {/* New Stacked Bar Chart for Defect Types Over Time */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Defect Evolution by Type (Last 10 Inspections)
            </h3>
            {supplierDetail.defectMixTrend.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierDetail.defectMixTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    {supplierDetail.defectKeys.map((key, index) => (
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
        </div>

        {/* Inspection Log Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Inspection Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">PO Number</th>
                  <th className="px-6 py-3 font-semibold">Product/Brand</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Defect Rate</th>
                  <th className="px-6 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierDetail.reports.map((report, idx) => {
                  const status = report.lot_assessment.lot_status as string;
                  const defectRate = report.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0;
                  return (
                    <tr key={idx} className="hover:bg-blue-50 transition cursor-pointer group" onClick={() => onViewReport(report)}>
                      <td className="px-6 py-4 text-gray-900">
                        {new Date(report.inspection_header.inspection_date_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">{report.inspection_header.po_number}</td>
                      <td className="px-6 py-4 text-gray-800">{report.inspection_header.brand}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${status.includes('reject') ? 'bg-red-100 text-red-800' :
                          status.includes('remarks') ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {status.includes('reject') ? 'Reject' : status.includes('remarks') ? 'Warning' : 'Accept'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono font-bold ${defectRate > 2 ? 'text-red-600' : 'text-gray-600'}`}>
                          {defectRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 opacity-0 group-hover:opacity-100 transition">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Render ---

  // --- Pagination ---
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters/sort change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate, sortConfig]);

  // Paginated data
  const paginatedStats = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedStats.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedStats, currentPage]);

  const totalPages = Math.ceil(sortedStats.length / ITEMS_PER_PAGE);

  return (
    <div className="animate-fadeIn space-y-6">

      {/* Global Performance Dashboard */}
      {globalStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Active Vendors</span>
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-gray-900">{globalStats.supplierCount}</span>
            </div>
            <span className="text-xs text-gray-400 mt-2">Across supply chain</span>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Avg Defect Rate</span>
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-gray-900">{globalStats.weightedDefectRate.toFixed(1)}%</span>
            </div>
            <span className="text-xs text-gray-400 mt-2">Weighted average</span>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">Rejection Vol.</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-red-600">{globalStats.totalRejected}</span>
              <span className="text-sm text-gray-400 font-medium mb-1">/ {globalStats.totalLots} Lots</span>
            </div>
            <span className="text-xs text-gray-400 mt-2">Total failed lots</span>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase">At Risk</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-orange-600">{globalStats.riskySuppliers}</span>
            </div>
            <span className="text-xs text-orange-600 mt-2 font-medium">Vendors require attention</span>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="w-full md:w-auto">
            <button onClick={onBack} className="flex items-center text-sm text-gray-500 hover:text-blue-700 mb-2 transition font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Center</h1>
            <p className="text-sm text-gray-500">Monitor vendor quality performance</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full"
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400 pointer-events-none">
                <span className="text-[10px] uppercase font-bold">Since:</span>
              </div>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-14 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 w-full"
              />
            </div>
          </div>
        </div>

        {sortedStats.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No vendor data found</h3>
            <p className="text-gray-500 text-sm">Perform inspections to populate this list.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none"
                      onClick={() => requestSort('grade')}
                    >
                      <div className="flex items-center">Risk Grade {getSortIcon('grade')}</div>
                    </th>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center">Vendor {getSortIcon('name')}</div>
                    </th>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none text-center"
                      onClick={() => requestSort('totalLots')}
                    >
                      <div className="flex items-center justify-center">Total Lots {getSortIcon('totalLots')}</div>
                    </th>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none text-center"
                      onClick={() => requestSort('rejectedLots')}
                    >
                      <div className="flex items-center justify-center text-red-600">Rejected {getSortIcon('rejectedLots')}</div>
                    </th>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none text-center"
                      onClick={() => requestSort('acceptedWithRemarks')}
                    >
                      <div className="flex items-center justify-center text-yellow-600">Warnings {getSortIcon('acceptedWithRemarks')}</div>
                    </th>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none"
                      onClick={() => requestSort('avgDefectRate')}
                    >
                      <div className="flex items-center">Avg Defect Rate {getSortIcon('avgDefectRate')}</div>
                    </th>
                    <th
                      className="px-6 py-3 font-semibold cursor-pointer hover:bg-gray-100 transition select-none text-right"
                      onClick={() => requestSort('lastInspection')}
                    >
                      <div className="flex items-center justify-end">Last Active {getSortIcon('lastInspection')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedStats.map((stat, idx) => (
                    <tr key={idx} className="bg-white hover:bg-blue-50 transition cursor-pointer" onClick={() => setSelectedSupplier(stat.name)}>
                      <td className="px-6 py-4">
                        {getGradeBadge(stat.grade)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {stat.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {stat.totalLots}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${stat.rejectedLots > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                          {stat.rejectedLots}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${stat.acceptedWithRemarks > 0 ? 'text-yellow-600' : 'text-gray-300'}`}>
                          {stat.acceptedWithRemarks}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-grow w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stat.avgDefectRate > 5 ? 'bg-red-500' : stat.avgDefectRate > 2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(stat.avgDefectRate * 5, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono w-12">{stat.avgDefectRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 text-xs">
                        {new Date(stat.lastInspection).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="text-xs text-gray-500">
                  Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, sortedStats.length)}</span> of <span className="font-medium">{sortedStats.length}</span> results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        p = currentPage - 2 + i;
                        if (p > totalPages) p = totalPages - (4 - i);
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${currentPage === p
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};