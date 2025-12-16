

import React, { useState, useMemo } from 'react';
import { InspectionReport } from '../types';
import { Calendar, Search, FileText, ChevronRight, ArrowLeft, Layers, BarChart3, PieChart as PieIcon, TrendingUp, AlertOctagon, CheckCircle2, XCircle, Clock, Filter, ImageOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface HistoryViewProps {
  history: InspectionReport[];
  onViewReport: (report: InspectionReport) => void;
  onBack: () => void;
}

type ShiftType = 'All' | 'Morning' | 'Afternoon' | 'Night';

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onViewReport, onBack }) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterShift, setFilterShift] = useState<ShiftType>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Helper to determine shift
  const getShift = (dateStr: string): 'Morning' | 'Afternoon' | 'Night' => {
    const date = new Date(dateStr);
    const hour = date.getHours();

    // Morning: 06:00 - 13:59
    // Afternoon: 14:00 - 21:59
    // Night: 22:00 - 05:59
    if (hour >= 6 && hour < 14) return 'Morning';
    if (hour >= 14 && hour < 22) return 'Afternoon';
    return 'Night';
  };

  const getShiftBadge = (shift: string) => {
    switch (shift) {
      case 'Morning': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">SHIFT A (AM)</span>;
      case 'Afternoon': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">SHIFT B (PM)</span>;
      case 'Night': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">SHIFT C (NIGHT)</span>;
      default: return null;
    }
  };

  // --- Analytics Calculations ---
  const analytics = useMemo(() => {
    const totalInspections = history.length;
    if (totalInspections === 0) return null;

    let passed = 0;
    let rejected = 0;
    let flagged = 0;
    let totalDefects = 0;
    const defectCounts: Record<string, number> = {};
    const timelineMap: Record<string, number> = {};

    history.forEach(r => {
      // Status Counts
      const status = r.lot_assessment.lot_status;
      if (status === 'accept') passed++;
      else if (status.includes('reject')) rejected++;
      else flagged++;

      // Defect Aggregation
      const rDefects = r.lot_assessment.defect_summary || [];
      rDefects.forEach(d => {
        totalDefects += d.count;
        defectCounts[d.class] = (defectCounts[d.class] || 0) + d.count;
      });

      // Timeline (simplify to Date only)
      const dateKey = new Date(r.inspection_header.inspection_date_time).toLocaleDateString();
      timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
    });

    // Top Defect
    const sortedDefects = Object.entries(defectCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

    const topDefect = sortedDefects.length > 0 ? sortedDefects[0]?.name : 'None';

    // Timeline Data (Sort by date)
    const timelineData = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 active days

    return {
      total: totalInspections,
      passRate: ((passed / totalInspections) * 100).toFixed(1),
      rejectRate: ((rejected / totalInspections) * 100).toFixed(1),
      avgDefectsPerLot: (totalDefects / totalInspections).toFixed(1),
      topDefect,
      defectDistribution: sortedDefects.slice(0, 5),
      timelineData
    };
  }, [history]);

  // --- List Filtering ---
  const filteredHistory = useMemo(() => {
    return history.filter(report => {
      const reportDate = new Date(report.inspection_header.inspection_date_time).toISOString().split('T')[0];
      const matchesDate = filterDate ? reportDate === filterDate : true;

      const shift = getShift(report.inspection_header.inspection_date_time);
      const matchesShift = filterShift === 'All' ? true : shift === filterShift;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        report.inspection_header.po_number.toLowerCase().includes(searchLower) ||
        report.inspection_header.supplier_name.toLowerCase().includes(searchLower) ||
        (report.inspection_header.batch_lot_number || '').toLowerCase().includes(searchLower) ||
        (report.inspection_header.product_code || '').toLowerCase().includes(searchLower);

      return matchesDate && matchesShift && matchesSearch;
    }).sort((a, b) => new Date(b.inspection_header.inspection_date_time).getTime() - new Date(a.inspection_header.inspection_date_time).getTime());
  }, [history, filterDate, filterShift, searchTerm]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-fit";
    switch (status) {
      case 'accept':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Accept</span>;
      case 'accept_with_remarks':
      case 'accepted_with_minor_defects':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Remarks</span>;
      case 'reject':
      case 'rejected':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Reject</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6'];

  // --- Pagination ---
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterShift, searchTerm]);

  // Paginated data
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredHistory, currentPage]);

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

  return (
    <div className="animate-fadeIn space-y-8 pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-auto">
          <button onClick={onBack} className="flex items-center text-sm text-gray-500 hover:text-blue-700 mb-2 transition font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-blue-600" />
            Inspection Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">Daily records filtered by date, shift, and results.</p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* KPI Cards */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Inspections</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{analytics.total}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pass Rate</p>
                <p className="text-2xl font-black text-green-600 mt-1">{analytics.passRate}%</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rejection Rate</p>
                <p className="text-2xl font-black text-red-600 mt-1">{analytics.rejectRate}%</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-red-600">
                <XCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Defect</p>
                <p className="text-lg font-bold text-orange-600 mt-1 truncate max-w-[120px]" title={analytics.topDefect}>{analytics.topDefect}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
                <AlertOctagon className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Inspection Volume (Recent)
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-purple-600" />
              Defect Distribution
            </h3>
            <div className="h-[250px] w-full flex items-center justify-center">
              {analytics.defectDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.defectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.defectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm">No defect data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Item Inspection Ledger
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full xl:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search PO, Item, Batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full shadow-sm"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 w-full shadow-sm"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value as ShiftType)}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full shadow-sm appearance-none bg-white"
              >
                <option value="All">All Shifts</option>
                <option value="Morning">Morning (06:00 - 14:00)</option>
                <option value="Afternoon">Afternoon (14:00 - 22:00)</option>
                <option value="Night">Night (22:00 - 06:00)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 p-4 rounded-full shadow-sm inline-block mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No records found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your date or shift filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Thumbnail</th>
                    <th className="px-6 py-4 font-semibold">Date & Shift</th>
                    <th className="px-6 py-4 font-semibold">PO Number</th>
                    <th className="px-6 py-4 font-semibold">Item & Supplier</th>
                    <th className="px-6 py-4 font-semibold">Result</th>
                    <th className="px-6 py-4 font-semibold">Defects</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedHistory.map((report, idx) => {
                    const shift = getShift(report.inspection_header.inspection_date_time);
                    return (
                      <tr key={idx} className="bg-white hover:bg-blue-50 transition cursor-pointer group" onClick={() => onViewReport(report)}>
                        <td className="px-6 py-4">
                          <div className="relative w-14 h-14 rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-gray-50">
                            {report.imageUrls && report.imageUrls.length > 0 ? (
                              <>
                                <img
                                  src={report.imageUrls[0]}
                                  alt="Thumb"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                <div className="hidden w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                                  <FileText className="w-6 h-6" />
                                </div>
                                {report.imageUrls.length > 1 && (
                                  <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-tl-md flex items-center">
                                    <Layers className="w-2.5 h-2.5 mr-1" /> {report.imageUrls.length}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{new Date(report.inspection_header.inspection_date_time).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-mono text-gray-600">{new Date(report.inspection_header.inspection_date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="mt-1">
                            {getShiftBadge(shift)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-gray-900 font-medium">{report.inspection_header.po_number}</div>
                          <div className="text-xs text-gray-500">{report.inspection_header.batch_lot_number || "No Batch ID"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 text-xs mb-0.5">{report.inspection_header.product_code || 'Unknown Item'}</div>
                          <div className="text-gray-600 text-xs font-medium max-w-[180px] truncate" title={report.inspection_header.supplier_name}>
                            {report.inspection_header.supplier_name || "Internal Production"}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                            {report.inspection_header.inspection_type?.replace('_', ' ') || 'General'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(report.lot_assessment.lot_status)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${report.lot_assessment.defect_summary.reduce((acc, curr) => acc + curr.count, 0) > 0
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                            <AlertOctagon className="w-3 h-3" />
                            {report.lot_assessment.defect_summary.reduce((acc, curr) => acc + curr.count, 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewReport(report); }}
                            className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            View Report <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="text-xs text-gray-500">
                  Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredHistory.length)}</span> of <span className="font-medium">{filteredHistory.length}</span> results
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
