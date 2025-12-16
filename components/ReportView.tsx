import React, { useState, useMemo, useRef } from 'react';
import { InspectionReport, Defect, ItemMaster } from '../types';
import { OverlayImage } from './OverlayImage';
import { CheckCircle, AlertTriangle, XCircle, Package, Scan, Activity, ArrowLeft, Save, Download, FileCheck, ThumbsUp, ThumbsDown, TrendingUp, UserCheck, BarChart3, Ruler, AlertOctagon, Filter, ImageOff, ExternalLink, BookOpen, AlertCircle, Plus, Camera, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';

interface ReportViewProps {
  report: InspectionReport;
  summary: string;
  previewUrls: string[];
  referenceItem?: ItemMaster; // New prop for Item Master Context
  history?: InspectionReport[]; // Added history prop for trend analysis
  isProcessing?: boolean; // New prop for loading state
  onReset: () => void;
  onSave: (updatedReport: InspectionReport) => void;
  onAddImages?: (files: File[]) => void; // New prop for adding images
}

const CHART_COLORS = ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#6366f1'];

export const ReportView: React.FC<ReportViewProps> = ({ report, summary, previewUrls, referenceItem, history = [], isProcessing = false, onReset, onSave, onAddImages }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<'accept' | 'accept_with_remarks' | 'reject' | string>(report.lot_assessment.lot_status);
  const [isSaved, setIsSaved] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'minor' | 'major' | 'critical'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe access to image result
  const imageResult = report.images[selectedIndex] || report.images[0];
  const currentImageUrl = previewUrls[selectedIndex] || previewUrls[0];
  const performance = report.performance_insights;

  const filteredDefects = useMemo(() => {
    if (!imageResult) return [];
    if (severityFilter === 'all') return imageResult.defects;
    return imageResult.defects.filter(d => d.severity === severityFilter);
  }, [imageResult, severityFilter]);

  // Defect Trend Analysis Logic
  const defectTrendData = useMemo(() => {
    if (!history || history.length === 0) return null;

    const currentProductCode = report.inspection_header.product_code;

    // Filter history for same product
    const relevantHistory = history
      .filter(h => h.inspection_header.product_code === currentProductCode)
      .sort((a, b) => new Date(a.inspection_header.inspection_date_time).getTime() - new Date(b.inspection_header.inspection_date_time).getTime());

    // Take last 10 inspections
    const recentHistory = relevantHistory.slice(-10);

    if (recentHistory.length === 0) return null;

    const data = recentHistory.map(h => {
      const date = new Date(h.inspection_header.inspection_date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const entry: any = { date };

      h.lot_assessment.defect_summary.forEach(d => {
        // Normalize key
        const key = d.class.replace(/_/g, ' ');
        entry[key] = (entry[key] || 0) + d.count;
      });
      return entry;
    });

    // Collect all unique defect keys present in this slice for the stack
    const keys = new Set<string>();
    data.forEach(d => Object.keys(d).forEach(k => {
      if (k !== 'date') keys.add(k);
    }));

    return { data, keys: Array.from(keys) };
  }, [history, report]);

  // Helper to lookup severity for a defect class from the detailed defects list
  const getSeverityForClass = (defectClass: string) => {
    for (const img of report.images) {
      const d = img.defects.find(def => def.class === defectClass);
      if (d) return d.severity;
    }
    return null;
  };

  const handleSave = () => {
    const updatedReport: InspectionReport = {
      ...report,
      lot_assessment: {
        ...report.lot_assessment,
        lot_status: currentStatus as any
      },
      // Summary remains unchanged as the editable field was removed
    };
    onSave(updatedReport);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleDownload = () => {
    window.print();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onAddImages) {
      const files = Array.from(e.target.files);
      onAddImages(files);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasReferenceStandards = referenceItem && referenceItem.standard_images &&
    (referenceItem.standard_images.accepted.length > 0 || referenceItem.standard_images.rejected.length > 0);

  if (!imageResult) return <div className="p-8 text-center text-gray-500">No image data available in report.</div>;

  return (
    <div className="space-y-6 animate-fadeIn pb-10 print:space-y-4 print:pb-0 print:animate-none relative">

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl h-full min-h-[600px]">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Analyzing New Samples...</h3>
          <p className="text-gray-500">Updating report with additional images</p>
        </div>
      )}

      {/* Print-only Header with QR Code */}
      <div className="hidden print:flex flex-row justify-between items-start mb-8 border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-black mb-1">Inspection Report</h1>
          <p className="text-gray-600 font-medium">WeldVision AI Quality Control</p>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-800">
            <p><span className="font-bold">Supplier:</span> {report.inspection_header.supplier_name}</p>
            <p><span className="font-bold">Date:</span> {new Date(report.inspection_header.inspection_date_time).toLocaleDateString()}</p>
            <p><span className="font-bold">PO Number:</span> {report.inspection_header.po_number}</p>
            <p><span className="font-bold">Batch/Lot:</span> {report.inspection_header.batch_lot_number || 'N/A'}</p>
            <p><span className="font-bold">Inspector:</span> {report.inspection_header.inspector_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ po: report.inspection_header.po_number, batch: report.inspection_header.batch_lot_number, status: report.lot_assessment.lot_status }))}`}
            alt="QR Code"
            className="w-28 h-28 border border-gray-200"
          />
          <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-mono">Scan to verify</span>
        </div>
      </div>

      {/* Interactive Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden">
        <div>
          <button onClick={onReset} className="flex items-center text-sm text-gray-900 hover:text-blue-700 mb-2 transition font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Inspection
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-black">Inspection Report</h1>
            {referenceItem && (
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                <Package className="w-3 h-3" /> {referenceItem.code}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-900 mt-1">
            <span className="font-semibold">{report.inspection_header.supplier_name}</span> • PO: {report.inspection_header.po_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Add Samples Button */}
          {onAddImages && (
            <>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-medium transition"
                disabled={isProcessing}
              >
                <Plus className="w-4 h-4" /> Add Samples
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Grid - In print, we switch to a block layout to ensure everything fits sequentially */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:space-y-6">

        {/* Left Column: Visuals */}
        <div className="lg:col-span-2 space-y-6 print:space-y-4">
          {/* Main Visual */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:border-0 print:shadow-none print:p-0 print:bg-transparent">
            <div className="flex justify-between items-center mb-4 print:hidden">
              <h3 className="font-bold text-black flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-600" />
                Visual Analysis {report.images.length > 1 && <span className="text-gray-400 font-normal">({selectedIndex + 1}/{report.images.length})</span>}
              </h3>
              <span className="text-xs bg-white border border-gray-300 text-black px-2 py-1 rounded font-medium">
                Conf: {(imageResult.ocr_results.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {/* Image Selector / Carousel if multiple */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 print:hidden scrollbar-thin">
              {report.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition ${idx === selectedIndex ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200 opacity-60 hover:opacity-100'
                    }`}
                >
                  <img
                    src={previewUrls[idx]}
                    alt={`Thumb ${idx}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    <ImageOff className="w-6 h-6" />
                  </div>
                </button>
              ))}
              {/* Add Image Tile */}
              {onAddImages && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-16 h-16 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition gap-1"
                  title="Add more samples"
                  disabled={isProcessing}
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[9px] font-bold">ADD</span>
                </button>
              )}
            </div>

            <div className="h-[550px] bg-white rounded-lg border border-dashed border-gray-300 print:border-0 print:h-auto print:min-h-0 print:bg-transparent">
              <OverlayImage
                imageUrl={currentImageUrl || ''}
                overlays={imageResult.overlays}
                referenceStandards={referenceItem?.standard_images} // Pass standards here
              />
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Decision */}
        <div className="space-y-6 print:space-y-4">

          {/* Human Decision Panel */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-blue-100 ring-1 ring-blue-50 print:shadow-none print:border-gray-300 print:ring-0 print:p-0 print:bg-transparent">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 print:mb-2">
              <FileCheck className="w-5 h-5 text-blue-600 print:hidden" />
              Quality Decision
            </h3>

            <div className="space-y-3 mb-6 print:mb-0">
              <div className="grid grid-cols-3 gap-2 print:hidden">
                <button
                  onClick={() => setCurrentStatus('accept')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${currentStatus === 'accept' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  <ThumbsUp className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Accept</span>
                </button>
                <button
                  onClick={() => setCurrentStatus('accept_with_remarks')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${currentStatus === 'accept_with_remarks' ? 'bg-yellow-50 border-yellow-500 text-yellow-700 ring-1 ring-yellow-500' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  <AlertTriangle className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Flagged</span>
                </button>
                <button
                  onClick={() => setCurrentStatus('reject')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${currentStatus === 'reject' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  <ThumbsDown className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Reject</span>
                </button>
              </div>

              {/* Print-only status display */}
              <div className="hidden print:block mb-4">
                <div className={`p-3 border-2 rounded text-center font-bold uppercase text-lg ${currentStatus === 'accept' ? 'border-green-600 text-green-800' :
                  currentStatus === 'reject' ? 'border-red-600 text-red-800' : 'border-yellow-600 text-yellow-800'
                  }`}>
                  Status: {currentStatus.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white transition-all transform active:scale-95 print:hidden ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 shadow-lg'}`}
            >
              {isSaved ? (
                <><CheckCircle className="w-5 h-5" /> Saved Successfully</>
              ) : (
                <><Save className="w-5 h-5" /> Save Decision</>
              )}
            </button>
          </div>

          {/* Counts Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 print:border-gray-300 print:break-inside-avoid">
            <h3 className="font-bold text-black mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600 print:hidden" />
              Counts & Conformity
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white border border-gray-200 p-3 rounded-lg text-center shadow-sm print:border-gray-400">
                <span className="block text-3xl font-bold text-black">{imageResult.counts.visible_cartons}</span>
                <span className="text-xs text-gray-900 font-semibold uppercase">Cartons</span>
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-lg text-center shadow-sm print:border-gray-400">
                <span className="block text-3xl font-bold text-black">{imageResult.counts.visible_packets}</span>
                <span className="text-xs text-gray-900 font-semibold uppercase">Packets</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 print:border-gray-300">
                <span className="text-black font-medium">Product Spec Match</span>
                <span className={report.lot_assessment.conformity_summary.product_match_spec ? "text-green-700 font-bold" : "text-red-600 font-bold"}>
                  {report.lot_assessment.conformity_summary.product_match_spec ? "Pass" : "Fail"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 print:border-gray-300">
                <span className="text-black font-medium">Branding Check</span>
                <span className={report.lot_assessment.conformity_summary.branding_match_spec ? "text-green-700 font-bold" : "text-red-600 font-bold"}>
                  {report.lot_assessment.conformity_summary.branding_match_spec ? "Pass" : "Fail"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-black font-medium">Batch/Dates</span>
                <span className={report.lot_assessment.conformity_summary.batch_and_dates_present ? "text-green-700 font-bold" : "text-red-600 font-bold"}>
                  {report.lot_assessment.conformity_summary.batch_and_dates_present ? "Present" : "Missing"}
                </span>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:border-gray-300 print:break-inside-avoid">
            <h3 className="font-bold text-black mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600 print:hidden" />
              AI Analysis
            </h3>
            {hasReferenceStandards && (
              <div className="mb-2 text-xs font-bold text-blue-600 flex items-center gap-1.5 bg-blue-50 p-2 rounded border border-blue-100">
                <BookOpen className="w-3.5 h-3.5" />
                Reference Standards Applied
              </div>
            )}
            <p className="text-black leading-relaxed text-sm border-l-4 border-purple-500 pl-4 py-1 italic text-gray-600 print:border-purple-600 print:text-black">
              "{summary}"
            </p>
          </div>

          {/* Performance Insights */}
          {performance && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 print:border-gray-300 print:break-inside-avoid">
              <h3 className="font-bold text-black mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-700 print:hidden" />
                Performance Analytics
              </h3>

              <div className="space-y-4">
                {/* Supplier Stats */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 print:border-gray-300 print:bg-transparent">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                      Supplier Trend
                      <TrendingUp className="w-3 h-3 text-gray-400" />
                    </span>
                    {/* Context Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                      {report.inspection_header.inspection_type?.replace(/_/g, " ") || "General"}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>Current Defect Rate</span>
                      <span className="font-bold">{performance.supplier_performance.current_lot_defect_rate_percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${performance.supplier_performance.current_lot_defect_rate_percent > performance.supplier_performance.historical_average_defect_rate_percent ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((performance.supplier_performance.current_lot_defect_rate_percent / 10) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Historical Avg</span>
                      <span>{performance.supplier_performance.historical_average_defect_rate_percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full opacity-50"
                        style={{ width: `${Math.min((performance.supplier_performance.historical_average_defect_rate_percent / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 border-t border-gray-200 pt-2 mt-1 italic">
                    {performance.supplier_performance.current_vs_history_comment || "No historical data available"}
                  </p>
                </div>

                {/* Inspector Stats */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 print:border-gray-300 print:bg-transparent">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                      Inspector Performance
                    </span>
                    <UserCheck className="w-3 h-3 text-gray-400" />
                  </div>

                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-900">{performance.inspector_performance.inspector_name}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded">
                      {performance.inspector_performance.inspections_done_total} Reports
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>Rejection Count</span>
                      <span className="font-bold text-red-600">{performance.inspector_performance.lots_rejected_total}</span>
                    </div>

                    {/* Add Visual Bar for Inspector Defect Rate */}
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                      <span>This Lot Defect %</span>
                      <span className="font-bold">{performance.inspector_performance.current_lot_defect_rate_percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${performance.inspector_performance.current_lot_defect_rate_percent > performance.inspector_performance.average_lot_defect_rate_percent * 1.5
                          ? 'bg-orange-500' // Significantly higher than their average
                          : 'bg-blue-500'
                          }`}
                        style={{ width: `${Math.min((performance.inspector_performance.current_lot_defect_rate_percent / 10) * 100, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                      <span>Avg Defect %</span>
                      <span>{performance.inspector_performance.average_lot_defect_rate_percent.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-400 rounded-full opacity-50"
                        style={{ width: `${Math.min((performance.inspector_performance.average_lot_defect_rate_percent / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 border-t border-gray-200 pt-2 italic">
                    "{performance.inspector_performance.consistency_comment || "Consistent with average"}"
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Detected Product Specs Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 print:border-gray-300 print:break-inside-avoid mt-6">
        <h3 className="font-bold text-black mb-4 flex items-center gap-2">
          <Ruler className="w-5 h-5 text-indigo-600" />
          Detected Product Specs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Grade / Type</span>
            <span className="font-mono font-bold text-gray-900">{imageResult.ocr_results.grade || 'N/A'}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Size / Dim.</span>
            <span className="font-mono font-bold text-gray-900 text-lg text-blue-700">{imageResult.ocr_results.size || 'N/A'}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Batch No.</span>
            <span className="font-mono font-bold text-gray-900">{imageResult.ocr_results.batch_lot_number || 'N/A'}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Brand</span>
            <span className="font-mono font-bold text-gray-900">{imageResult.ocr_results.brand || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Defect Trend Chart */}
      {defectTrendData && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6 print:break-inside-avoid">
          <h3 className="font-bold text-black mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Defect Trend Analysis ({report.inspection_header.product_code})
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={defectTrendData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Legend />
                {defectTrendData.keys.map((key, index) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lot Defect Summary Table */}
      {report.lot_assessment.defect_summary.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 print:border-gray-300 print:shadow-none print:mt-4 print:break-before-auto">
          <div className="p-4 border-b border-gray-200 bg-white print:border-gray-300">
            <h3 className="font-bold text-black flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-600" />
              Lot Defect Summary
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 print:border-gray-300">
                <tr>
                  <th className="px-6 py-3 font-bold print:px-2">Defect Type</th>
                  <th className="px-6 py-3 font-bold print:px-2">Severity</th>
                  <th className="px-6 py-3 font-bold print:px-2">Count</th>
                  <th className="px-6 py-3 font-bold print:px-2">Percentage</th>
                  <th className="px-6 py-3 font-bold print:px-2">Key Characteristic / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.lot_assessment.defect_summary.map((defect, idx) => {
                  const severity = getSeverityForClass(defect.class);
                  return (
                    <tr key={idx} className="bg-white hover:bg-gray-50 transition print:border-gray-300">
                      <td className="px-6 py-4 font-bold text-black capitalize print:px-2">
                        {defect.class.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 print:px-2">
                        {severity ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase border ${severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                            severity === 'major' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}>
                            {severity}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-black print:px-2">{defect.count}</td>
                      <td className="px-6 py-4 text-black print:px-2">{defect.percentage}%</td>
                      <td className="px-6 py-4 text-gray-600 italic print:px-2">
                        {defect.description || "No description provided."}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Defects Table (Per Image) */}
      {imageResult.defects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6 print:border-gray-300 print:shadow-none print:mt-4 print:break-before-auto">
          <div className="p-4 border-b border-gray-200 bg-white print:border-gray-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-black">Detected Defects Log (Selected Image)</h3>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 print:hidden">
              <span className="text-xs font-bold text-gray-400 px-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Filter:</span>
              {(['all', 'critical', 'major', 'minor'] as const).map((sev) => {
                const isActive = severityFilter === sev;
                let activeClass = 'bg-white text-blue-600 shadow-sm border border-gray-200';

                if (isActive) {
                  if (sev === 'critical') activeClass = 'bg-red-50 text-red-700 border border-red-200 shadow-sm';
                  else if (sev === 'major') activeClass = 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm';
                  else if (sev === 'minor') activeClass = 'bg-yellow-50 text-yellow-700 border border-yellow-200 shadow-sm';
                }

                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all border ${isActive
                      ? activeClass
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-black uppercase bg-white border-b border-gray-200 print:border-gray-300">
                <tr>
                  <th className="px-6 py-3 font-bold print:px-2">Type</th>
                  <th className="px-6 py-3 font-bold print:px-2">Severity</th>
                  <th className="px-6 py-3 font-bold print:px-2">Detailed Description</th>
                  <th className="px-6 py-3 font-bold print:px-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {filteredDefects.length > 0 ? (
                  filteredDefects.map((defect, idx) => (
                    <tr key={idx} className="bg-white border-b border-gray-100 hover:bg-blue-50 transition print:break-inside-avoid print:border-gray-300">
                      <td className="px-6 py-4 font-bold text-black capitalize print:px-2">{defect.class.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 print:px-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border print:border-black print:text-black print:bg-transparent ${defect.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          defect.severity === 'major' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                          {defect.severity === 'critical' && <XCircle className="w-3 h-3" />}
                          {defect.severity === 'major' && <AlertTriangle className="w-3 h-3" />}
                          {defect.severity === 'minor' && <AlertCircle className="w-3 h-3" />}
                          {defect.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-black print:px-2">{defect.description}</td>
                      <td className="px-6 py-4 font-mono font-bold text-black print:px-2">{defect.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic bg-gray-50">
                      No defects found with severity "{severityFilter}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};