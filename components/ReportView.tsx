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
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-500" /> Inspection Images & Findings
                </h3>
                <span className="text-sm text-gray-500">{images.length} image{images.length !== 1 ? 's' : ''} analyzed</span>
              </div>

              {images.map((img, idx) => {
                const imageUrl = previewUrls?.[idx] || report.imageUrls?.[idx] || '';
                const hasDefects = img.defects.length > 0;
                const criticalDefects = img.defects.filter(d => d.severity === 'critical');
                const majorDefects = img.defects.filter(d => d.severity === 'major');
                const minorDefects = img.defects.filter(d => d.severity === 'minor');

                return (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
                    {/* Image Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-lg">
                            <Camera className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">Image #{idx + 1}</h4>
                            <p className="text-xs text-gray-500">
                              Status: <span className={`font-bold ${img.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                                {img.status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {criticalDefects.length > 0 && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
                              {criticalDefects.length} Critical
                            </span>
                          )}
                          {majorDefects.length > 0 && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200">
                              {majorDefects.length} Major
                            </span>
                          )}
                          {minorDefects.length > 0 && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                              {minorDefects.length} Minor
                            </span>
                          )}
                          {!hasDefects && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> No Issues
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Image and Findings Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                      {/* Image Display */}
                      <div className="space-y-3">
                        <div className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-inner">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`Inspection ${idx + 1}`}
                              className="w-full h-auto object-contain max-h-96"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="w-full h-64 flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Image not available</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* OCR Results */}
                        {img.ocr_results && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <h5 className="text-xs font-bold text-blue-900 uppercase mb-2 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Detected Text
                            </h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {img.ocr_results.brand && (
                                <div>
                                  <span className="text-blue-600 font-medium">Brand:</span>
                                  <span className="ml-1 text-gray-700">{img.ocr_results.brand}</span>
                                </div>
                              )}
                              {img.ocr_results.style_number && (
                                <div>
                                  <span className="text-blue-600 font-medium">Style:</span>
                                  <span className="ml-1 text-gray-700">{img.ocr_results.style_number}</span>
                                </div>
                              )}
                              {img.ocr_results.batch_lot_number && (
                                <div>
                                  <span className="text-blue-600 font-medium">Batch:</span>
                                  <span className="ml-1 text-gray-700">{img.ocr_results.batch_lot_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Findings List */}
                      <div className="space-y-3">
                        <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                          Detected Issues ({img.defects.length})
                        </h5>

                        {hasDefects ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {img.defects.map((defect, dIdx) => (
                              <div
                                key={dIdx}
                                className={`p-4 rounded-lg border-l-4 ${defect.severity === 'critical' ? 'bg-red-50 border-red-500' :
                                    defect.severity === 'major' ? 'bg-orange-50 border-orange-500' :
                                      'bg-yellow-50 border-yellow-500'
                                  }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h6 className={`font-bold text-sm capitalize ${defect.severity === 'critical' ? 'text-red-900' :
                                        defect.severity === 'major' ? 'text-orange-900' :
                                          'text-yellow-900'
                                      }`}>
                                      {defect.class.replace(/_/g, ' ')}
                                    </h6>
                                    <p className={`text-xs mt-1 ${defect.severity === 'critical' ? 'text-red-700' :
                                        defect.severity === 'major' ? 'text-orange-700' :
                                          'text-yellow-700'
                                      }`}>
                                      {defect.description}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 ml-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${defect.severity === 'critical' ? 'bg-red-200 text-red-900' :
                                        defect.severity === 'major' ? 'bg-orange-200 text-orange-900' :
                                          'bg-yellow-200 text-yellow-900'
                                      }`}>
                                      {defect.severity}
                                    </span>
                                    {defect.count > 1 && (
                                      <span className="text-xs font-bold text-gray-600">
                                        ×{defect.count}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Location indicators */}
                                {defect.locations && defect.locations.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {defect.locations.slice(0, 3).map((loc, locIdx) => (
                                      <span key={locIdx} className="text-[10px] px-2 py-0.5 bg-white/60 rounded border border-gray-300 text-gray-600">
                                        Location {locIdx + 1}
                                      </span>
                                    ))}
                                    {defect.locations.length > 3 && (
                                      <span className="text-[10px] px-2 py-0.5 bg-white/60 rounded border border-gray-300 text-gray-600">
                                        +{defect.locations.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-bold text-green-900">No defects detected</p>
                            <p className="text-xs text-green-700 mt-1">This image passed inspection</p>
                          </div>
                        )}

                        {/* Item Counts */}
                        {img.counts && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-gray-500">Visible Items:</span>
                                <span className="ml-2 font-bold text-gray-900">{img.counts.visible_items || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Cartons:</span>
                                <span className="ml-2 font-bold text-gray-900">{img.counts.visible_cartons || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {images.length === 0 && (
                <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No images available for this inspection</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};