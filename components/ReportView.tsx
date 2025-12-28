import React, { useState } from 'react';
import { InspectionReport, ItemMaster } from '../types';
import {
  ArrowLeft, Printer, Share2, Download, AlertCircle, CheckCircle, ShieldAlert,
  BadgeCheck, Shirt, Ruler, Activity, Calendar, LayoutGrid, Eye, EyeOff, BarChart3,
  Layers, Camera, ChevronRight, FileText, CheckSquare, XCircle, AlertOctagon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

interface ReportViewProps {
  report: InspectionReport;
  summary: string;
  previewUrls?: string[];
  referenceItem?: ItemMaster | undefined; // Changed from null to undefined to match App.tsx likely
  history?: InspectionReport[];
  isProcessing?: boolean;
  onReset?: () => void;
  onSave?: (report: InspectionReport) => void;
  onAddImages?: (files: File[]) => void;
  onBack?: () => void; // Helper if used internally or passed from parent
}

export const ReportView: React.FC<ReportViewProps> = ({
  report,
  summary,
  previewUrls,
  referenceItem,
  history,
  isProcessing,
  onReset,
  onSave,
  onAddImages,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'details' | 'defects'>('summary');

  const { inspection_header, lot_assessment, images } = report;
  const decision = lot_assessment.lot_status?.toUpperCase() || 'PENDING';
  const isRejected = decision.includes('REJECT');

  // Metrics
  const totalItems = lot_assessment.total_items_inspected || 0;
  const majorCount = images.reduce((acc, img) => acc + img.defects.filter(d => d.severity === 'major').length, 0);
  const minorCount = images.reduce((acc, img) => acc + img.defects.filter(d => d.severity === 'minor').length, 0);
  const totalDefects = majorCount + minorCount + images.reduce((acc, img) => acc + img.defects.filter(d => d.severity === 'critical').length, 0);
  const defectRate = totalItems > 0 ? (totalDefects / totalItems) * 100 : 0;

  const handlePrint = () => window.print();

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto space-y-6 pb-24 font-sans print:p-0 print:max-w-none">

      {/* Top Navigation */}
      <div className="flex justify-between items-center print:hidden">
        <button
          onClick={onReset || onBack}
          className="flex items-center text-gray-500 hover:text-blue-600 font-medium transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Inspection
        </button>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium shadow-sm transition"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition">
            <Share2 className="w-4 h-4" /> Share Report
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">

        {/* Status Banner */}
        <div className={`
          p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b
          ${isRejected ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}
          print:bg-white print:border-b-2 print:border-black
        `}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-gray-900">
                {inspection_header.style_number || 'Unknown Style'}
              </h1>
              {decision === 'ACCEPT' || decision === 'ACCEPTED' ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200 uppercase flex items-center gap-1">
                  <BadgeCheck className="w-4 h-4" /> Accepted
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200 uppercase flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Rejected
                </span>
              )}
            </div>
            <p className="text-gray-500 font-medium flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" /> {new Date(inspection_header.inspection_date_time).toLocaleString()}
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">PO: {inspection_header.po_number}</span>
            </p>
          </div>

          <div className="flex gap-6 text-right print:hidden">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Defect Rate</p>
              <p className={`text-2xl font-black ${defectRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                {defectRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Grade</p>
              <p className="text-2xl font-black text-gray-900">
                {isRejected ? 'F' : 'A'}
              </p>
            </div>
          </div>
        </div>

        {/* AI Summary Section */}
        <div className="p-6 bg-slate-50 border-b border-gray-100 print:bg-white print:p-0 print:border-none print:mt-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mt-1 print:hidden">
              <Activity className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">AI Executive Summary</h3>
              <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                {summary || "No summary generated."}
              </p>
            </div>
          </div>
        </div>

        {/* Content Tabs (Not in Print) */}
        {!isProcessing && (
          <div className="flex border-b border-gray-100 print:hidden">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Defect Analysis
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Measurements & Specs
            </button>
            <button
              onClick={() => setActiveTab('defects')}
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'defects' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Image Gallery ({images.length})
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-8">

              {/* Defect Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-800 uppercase">Major Defects</span>
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-3xl font-black text-orange-700">{majorCount}</span>
                  <p className="text-xs text-orange-600 mt-1">Require rework</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-yellow-800 uppercase">Minor Defects</span>
                    <AlertOctagon className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span className="text-3xl font-black text-yellow-700">{minorCount}</span>
                  <p className="text-xs text-yellow-600 mt-1">Acceptable limit: {inspection_header.spec_limits || '4.0'}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-red-800 uppercase">Critical</span>
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-3xl font-black text-red-700">
                    {images.reduce((acc, img) => acc + img.defects.filter(d => d.severity === 'critical').length, 0)}
                  </span>
                  <p className="text-xs text-red-600 mt-1">Zero tolerance</p>
                </div>
              </div>

              {/* Defect List */}
              <div>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-gray-500" /> Detected Issues
                </h3>
                {lot_assessment.defect_summary.length > 0 ? (
                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-6 py-3">Defect Type</th>
                          <th className="px-6 py-3">Count</th>
                          <th className="px-6 py-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lot_assessment.defect_summary.map((defect, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-gray-900 capitalize">
                              {defect.class.replace(/_/g, ' ')}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-gray-100 font-bold text-gray-700 min-w-[30px]">
                                {defect.count}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600 italic">
                              {defect.description || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">No defects detected in this lot.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-blue-500" /> Measurement Data
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Fabric Condition</span>
                      <span className="font-mono font-bold text-gray-900">Normal</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Pattern Match</span>
                      <span className="font-mono font-bold text-gray-900">Good</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shade Consistency</span>
                      <span className="font-mono font-bold text-green-600">Pass</span>
                    </div>
                  </div>
                </div>

                {referenceItem && (
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Shirt className="w-5 h-5 text-purple-500" /> Product Specs
                    </h3>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                      <h4 className="font-bold text-purple-900">{referenceItem.name}</h4>
                      <p className="text-sm text-purple-700 mt-1">{referenceItem.description}</p>

                      <div className="mt-4 flex gap-4 text-xs">
                        <div className="p-2 bg-white rounded border border-purple-200">
                          <span className="block text-purple-400 uppercase font-bold text-[10px]">Material</span>
                          <span className="font-bold text-purple-900">Cotton 100%</span>
                        </div>
                        <div className="p-2 bg-white rounded border border-purple-200">
                          <span className="block text-purple-400 uppercase font-bold text-[10px]">GSM</span>
                          <span className="font-bold text-purple-900">180</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'defects' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="group relative rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-gray-900">
                  <img src={report.imageUrls?.[idx] || ''} alt={`Inspection ${idx}`} className="w-full h-64 object-cover opacity-90 group-hover:opacity-100 transition" />

                  {/* Overlay Badges */}
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    {img.defects.map((d, dIdx) => (
                      <span key={dIdx} className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        {d.class.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-white font-bold text-sm">Image #{idx + 1}</p>
                    <p className="text-gray-300 text-xs">{img.defects.length} Issues Detected</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};