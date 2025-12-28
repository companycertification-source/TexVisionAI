import React, { useState, useEffect } from 'react';
import { MetaData, ItemMaster } from '../types';
import { Upload, User, ShieldCheck, X, Plus, Camera, Building2, Calculator, Ruler, Shirt, Printer, Minus, QrCode, Layers, ArrowRight, ArrowLeft, Check, AlertCircle, Settings2, ChevronDown, FileText, Clock, Zap, Search } from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';

// Image limits for cost optimization (batch processing requires 4+ images)
const MIN_IMAGES = 1;
const MAX_IMAGES = 8;

interface InspectionFormProps {
  onSubmit: (meta: MetaData, files: File[]) => void;
  isAnalyzing: boolean;
  inspectorName: string;
  suppliers: string[];
  items?: ItemMaster[];
  onItemSelect?: (item: ItemMaster | null) => void;
}

// Pre-filled mock metadata for Textile context
const INITIAL_META: MetaData = {
  inspection_type: 'incoming',
  supplier_name: 'FabriCo Ltd',
  brand: 'FabriCo',
  style_number: '',
  po_number: '',
  invoice_number: '',
  inspector_name: '',
  spec_limits: 'No oil stains, holes, or color shading. Check for weaving defects.',
  lot_size: undefined,
  sample_size: undefined,
  aql_level: 'II',
  aql_major: 2.5,
  aql_minor: 4.0,
  inspection_mode: 'quick' // Default to Quick mode for cost savings
};

// --- ISO 2859-1 (ANSI/ASQ Z1.4) AQL Tables ---

// Lot Size Ranges (Upper bounds)
const LOT_RANGES = [8, 15, 25, 50, 90, 150, 280, 500, 1200, 3200, 10000, 35000, 150000, 500000, Infinity];

// Code Letters Table [Level][RangeIndex]
const CODE_LETTERS: Record<string, string[]> = {
  I: ['A', 'A', 'B', 'C', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'],
  II: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q'],
  III: ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'Q'] // Q is typical max
};

// Sample Sizes
const SAMPLE_SIZES: Record<string, number> = {
  A: 2, B: 3, C: 5, D: 8, E: 13, F: 20, G: 32, H: 50, J: 80, K: 125, L: 200, M: 315, N: 500, P: 800, Q: 1250
};

// Acceptance Points for Common AQLs [Code][AQL] -> {ac, re}
const AC_RE_TABLE: Record<string, Record<string, { ac: number, re: number }>> = {
  'A': { '0.65': { ac: 0, re: 1 }, '1.0': { ac: 0, re: 1 }, '1.5': { ac: 0, re: 1 }, '2.5': { ac: 0, re: 1 }, '4.0': { ac: 0, re: 1 }, '6.5': { ac: 0, re: 1 } },
  'B': { '0.65': { ac: 0, re: 1 }, '1.0': { ac: 0, re: 1 }, '1.5': { ac: 0, re: 1 }, '2.5': { ac: 0, re: 1 }, '4.0': { ac: 0, re: 1 }, '6.5': { ac: 1, re: 2 } },
  'C': { '0.65': { ac: 0, re: 1 }, '1.0': { ac: 0, re: 1 }, '1.5': { ac: 0, re: 1 }, '2.5': { ac: 0, re: 1 }, '4.0': { ac: 1, re: 2 }, '6.5': { ac: 1, re: 2 } },
  'D': { '0.65': { ac: 0, re: 1 }, '1.0': { ac: 0, re: 1 }, '1.5': { ac: 0, re: 1 }, '2.5': { ac: 1, re: 2 }, '4.0': { ac: 1, re: 2 }, '6.5': { ac: 2, re: 3 } },
  'E': { '0.65': { ac: 0, re: 1 }, '1.0': { ac: 0, re: 1 }, '1.5': { ac: 1, re: 2 }, '2.5': { ac: 1, re: 2 }, '4.0': { ac: 2, re: 3 }, '6.5': { ac: 3, re: 4 } },
  'F': { '0.65': { ac: 0, re: 1 }, '1.0': { ac: 1, re: 2 }, '1.5': { ac: 1, re: 2 }, '2.5': { ac: 2, re: 3 }, '4.0': { ac: 3, re: 4 }, '6.5': { ac: 5, re: 6 } },
  'G': { '0.65': { ac: 1, re: 2 }, '1.0': { ac: 1, re: 2 }, '1.5': { ac: 2, re: 3 }, '2.5': { ac: 3, re: 4 }, '4.0': { ac: 5, re: 6 }, '6.5': { ac: 7, re: 8 } },
  'H': { '0.65': { ac: 1, re: 2 }, '1.0': { ac: 2, re: 3 }, '1.5': { ac: 3, re: 4 }, '2.5': { ac: 5, re: 6 }, '4.0': { ac: 7, re: 8 }, '6.5': { ac: 10, re: 11 } },
  'J': { '0.65': { ac: 2, re: 3 }, '1.0': { ac: 3, re: 4 }, '1.5': { ac: 5, re: 6 }, '2.5': { ac: 7, re: 8 }, '4.0': { ac: 10, re: 11 }, '6.5': { ac: 14, re: 15 } },
  'K': { '0.65': { ac: 3, re: 4 }, '1.0': { ac: 5, re: 6 }, '1.5': { ac: 7, re: 8 }, '2.5': { ac: 10, re: 11 }, '4.0': { ac: 14, re: 15 }, '6.5': { ac: 21, re: 22 } },
  'L': { '0.65': { ac: 5, re: 6 }, '1.0': { ac: 7, re: 8 }, '1.5': { ac: 10, re: 11 }, '2.5': { ac: 14, re: 15 }, '4.0': { ac: 21, re: 22 }, '6.5': { ac: 21, re: 22 } },
  'M': { '0.65': { ac: 7, re: 8 }, '1.0': { ac: 10, re: 11 }, '1.5': { ac: 14, re: 15 }, '2.5': { ac: 21, re: 22 }, '4.0': { ac: 21, re: 22 }, '6.5': { ac: 21, re: 22 } },
  'N': { '0.65': { ac: 10, re: 11 }, '1.0': { ac: 14, re: 15 }, '1.5': { ac: 21, re: 22 }, '2.5': { ac: 21, re: 22 }, '4.0': { ac: 21, re: 22 }, '6.5': { ac: 21, re: 22 } },
  'P': { '0.65': { ac: 14, re: 15 }, '1.0': { ac: 21, re: 22 }, '1.5': { ac: 21, re: 22 }, '2.5': { ac: 21, re: 22 }, '4.0': { ac: 21, re: 22 }, '6.5': { ac: 21, re: 22 } },
  'Q': { '0.65': { ac: 21, re: 22 }, '1.0': { ac: 21, re: 22 }, '1.5': { ac: 21, re: 22 }, '2.5': { ac: 21, re: 22 }, '4.0': { ac: 21, re: 22 }, '6.5': { ac: 21, re: 22 } }
};

interface AQLResult {
  sampleSize: number;
  code: string;
  major: { ac: number, re: number };
  minor: { ac: number, re: number };
}

const calculateAqlPlan = (lotSize: number, level: 'I' | 'II' | 'III' = 'II', majorAql: number = 2.5, minorAql: number = 4.0): AQLResult => {
  const rangeIndex = LOT_RANGES.findIndex(limit => lotSize <= limit);
  const idx = rangeIndex === -1 ? LOT_RANGES.length - 1 : rangeIndex;

  const letters = CODE_LETTERS[level];
  const code = (letters && letters[idx]) ? letters[idx] : 'A';

  const sampleSize = SAMPLE_SIZES[code] || 2;
  const majorKey = String(majorAql);
  const minorKey = String(minorAql);

  const row = AC_RE_TABLE[code] || AC_RE_TABLE['A'];
  if (!row) return { sampleSize, code, major: { ac: 0, re: 1 }, minor: { ac: 0, re: 1 } };

  const majorLimits = row[majorKey] || { ac: 0, re: 1 };
  const minorLimits = row[minorKey] || { ac: 0, re: 1 };

  return { sampleSize, code, major: majorLimits, minor: minorLimits };
};


const STEPS = [
  { id: 1, title: 'Context', icon: User },
  { id: 2, title: 'Item', icon: Shirt },
  { id: 3, title: 'Sampling', icon: Ruler },
  { id: 4, title: 'Inspection', icon: Camera },
];

export const InspectionForm: React.FC<InspectionFormProps> = ({ onSubmit, isAnalyzing, inspectorName, suppliers, items = [], onItemSelect }) => {
  const [meta, setMeta] = useState<MetaData>({ ...INITIAL_META, inspector_name: inspectorName });
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [aqlPlan, setAqlPlan] = useState<AQLResult | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);

  // Tag Printing State
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [tagQuantity, setTagQuantity] = useState(4);

  // Plan Printing State
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Rate limiting for API calls (3 second cooldown)
  const { isLimited, cooldownRemaining, startCooldown } = useRateLimit(3000);

  useEffect(() => {
    if (meta.inspector_name !== inspectorName) {
      setMeta(prev => ({ ...prev, inspector_name: inspectorName }));
    }
  }, [inspectorName, meta.inspector_name]);

  useEffect(() => {
    if (meta.sample_size && meta.sample_size > 0 && tagQuantity !== meta.sample_size) {
      setTagQuantity(meta.sample_size);
    }
  }, [meta.sample_size, tagQuantity]);

  useEffect(() => {
    if (meta.lot_size && meta.lot_size > 0) {
      const plan = calculateAqlPlan(
        meta.lot_size,
        meta.aql_level || 'II',
        meta.aql_major || 2.5,
        meta.aql_minor || 4.0
      );

      // Only update if plan actually changes
      if (!aqlPlan || aqlPlan.sampleSize !== plan.sampleSize || aqlPlan.code !== plan.code) {
        setAqlPlan(plan);
        setMeta(prev => ({
          ...prev,
          sample_size: plan.sampleSize,
          acceptance_limits: {
            major_ac: plan.major.ac,
            major_re: plan.major.re,
            minor_ac: plan.minor.ac,
            minor_re: plan.minor.re
          }
        }));
      }
    } else {
      if (aqlPlan !== null) setAqlPlan(null);
    }
  }, [meta.lot_size, meta.aql_level, meta.aql_major, meta.aql_minor, aqlPlan]);

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMeta((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === 'inspection_type' && value === 'finished_goods') {
        newData.supplier_name = '';
      }
      return newData;
    });
  };

  const handleMasterItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsDropdownOpen(false);
    if (itemId) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        setMeta(prev => ({
          ...prev,
          style_number: item.code,
          brand: prev.brand || 'Internal',
          spec_limits: item.specifications || prev.spec_limits,
          aql_level: item.aql_config?.level || 'II',
          aql_major: item.aql_config?.major || 2.5,
          aql_minor: item.aql_config?.minor || 4.0,
        }));
        if (onItemSelect) onItemSelect(item);
      }
    } else {
      if (onItemSelect) onItemSelect(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);

      // Enforce MAX_IMAGES limit
      const remainingSlots = MAX_IMAGES - files.length;
      const filesToAdd = newFiles.slice(0, remainingSlots);

      if (filesToAdd.length < newFiles.length) {
        console.warn(`Only ${filesToAdd.length} of ${newFiles.length} images added (max ${MAX_IMAGES} allowed)`);
      }

      if (filesToAdd.length > 0) {
        const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
        setFiles(prev => [...prev, ...filesToAdd]);
        setPreviewUrls(prev => [...prev, ...newPreviews]);
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const url = prev[index];
      if (typeof url === 'string') {
        URL.revokeObjectURL(url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimited) return; // Prevent rapid submissions
    if (files.length > 0) {
      startCooldown();
      onSubmit(meta, files);
    }
  };

  const clearSupplier = () => setMeta(prev => ({ ...prev, supplier_name: '' }));
  const toggleTagsModal = () => setShowTagsModal(!showTagsModal);
  const handlePrintTags = () => window.print();

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: if (meta.inspection_type === 'incoming' && !meta.supplier_name) return false; return true;
      case 2: if (!meta.po_number || !meta.style_number) return false; return true;
      case 3: if (!meta.lot_size) return false; return true;
      case 4: return files.length >= MIN_IMAGES;
      default: return true;
    }
  };

  const nextStep = () => validateStep(currentStep) && setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const isFinishedGoods = meta.inspection_type === 'finished_goods';
  const selectedItem = items.find(i => i.id === selectedItemId);

  // QR Data Generation for URL
  const qrBaseUrl = "https://texvision.ai/"; // Updated URL
  const queryParams = new URLSearchParams();
  if (meta.po_number) queryParams.append("po", meta.po_number);
  if (meta.batch_lot_number) queryParams.append("batch", meta.batch_lot_number);
  if (meta.style_number) queryParams.append("style", meta.style_number);
  queryParams.append("mode", meta.inspection_type);
  if (meta.supplier_name) queryParams.append("sup", meta.supplier_name);

  const qrData = `${qrBaseUrl}?${queryParams.toString()}`;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          ></div>

          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg' :
                    isCompleted ? 'bg-green-500 border-green-500 text-white' :
                      'bg-white border-gray-300 text-gray-400'
                    }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] sm:text-xs font-bold transition-colors ${isActive ? 'text-blue-700' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative min-h-[400px] flex flex-col">
        {/* Step 1: Context */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pb-4">
              <h2 className="text-lg font-bold text-gray-900">Step 1: Context & Source</h2>
              <p className="text-sm text-gray-500">Define the type of inspection and the source.</p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-black">Inspection Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['incoming', 'finished_goods', 'in_process'].map((type) => (
                  <label key={type} className={`flex flex-col items-center justify-center gap-2 cursor-pointer p-4 rounded-lg border transition ${meta.inspection_type === type ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="inspection_type"
                      value={type}
                      checked={meta.inspection_type === type}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <span className="font-bold text-sm capitalize">{type.replace('_', ' ')}</span>
                    {meta.inspection_type === type && <Check className="w-4 h-4 text-blue-600" />}
                  </label>
                ))}
              </div>
            </div>

            {!isFinishedGoods && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-bold text-black mb-1">Supplier / Factory <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="supplier_name"
                      list="suppliers-list"
                      value={meta.supplier_name}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black"
                      placeholder="Select or enter factory info"
                    />
                    <datalist id="suppliers-list">
                      {suppliers.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <button type="button" onClick={clearSupplier} className="px-3 bg-gray-50 hover:bg-gray-100 text-blue-600 rounded-lg border border-gray-300">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-black mb-1">Inspector</label>
              <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                <User className="w-5 h-5" />
                <span className="font-medium">{inspectorName}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Product */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pb-4">
              <h2 className="text-lg font-bold text-gray-900">Step 2: Item Details</h2>
              <p className="text-sm text-gray-500">Identify the fabric or garment style.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">Select Item (Optional)</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full pl-3 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-left flex items-center gap-3 shadow-sm hover:border-gray-400 transition"
                >
                  {selectedItem ? (
                    <>
                      {selectedItem.reference_image_url ? (
                        <img
                          src={selectedItem.reference_image_url}
                          alt={selectedItem.name}
                          className="w-8 h-8 rounded object-cover border border-gray-200"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-gray-200 ${selectedItem.reference_image_url ? 'hidden' : ''}`}>
                        <Shirt className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-grow">
                        <div className="font-bold text-gray-900">{selectedItem.name}</div>
                        <div className="text-xs text-gray-500">{selectedItem.code}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-200 border-dashed"><Shirt className="w-4 h-4 text-gray-300" /></div>
                      <span className="text-gray-500">-- Select Master Item --</span>
                    </>
                  )}
                  <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                    <div
                      className="p-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-600 border-b border-gray-50 flex items-center gap-3"
                      onClick={() => handleMasterItemChange('')}
                    >
                      <div className="w-8 h-8 flex items-center justify-center"><X className="w-4 h-4 text-gray-400" /></div>
                      <span>-- Manual Entry --</span>
                    </div>
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`p-3 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors ${selectedItemId === item.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50'}`}
                        onClick={() => handleMasterItemChange(item.id)}
                      >
                        {item.reference_image_url ? (
                          <img
                            src={item.reference_image_url}
                            alt="Thumb"
                            className="w-10 h-10 rounded object-cover border border-gray-200 bg-white"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded bg-gray-100 flex items-center justify-center border border-gray-200 ${item.reference_image_url ? 'hidden' : ''}`}>
                          <Shirt className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <div className={`font-bold ${selectedItemId === item.id ? 'text-blue-900' : 'text-gray-900'}`}>{item.name}</div>
                          <div className="text-xs text-gray-500">{item.code} • <span className="uppercase text-[10px] font-bold bg-gray-100 px-1 rounded">{item.category}</span></div>
                        </div>
                        {selectedItemId === item.id && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">Style Number / Ref <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="style_number"
                  value={meta.style_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. SHIRT-2401"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={meta.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Brand Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1">{isFinishedGoods ? 'Production Order #' : 'PO Number'} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="po_number"
                  value={meta.po_number}
                  onChange={handleChange}
                  placeholder={isFinishedGoods ? "e.g. CUT-3444" : "e.g. PO-8892"}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Batch / Roll No.</label>
                <input
                  type="text"
                  name="batch_lot_number"
                  value={meta.batch_lot_number || ''}
                  onChange={handleChange}
                  placeholder="Scan or enter roll/batch"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sampling & Standards */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pb-4">
              <h2 className="text-lg font-bold text-gray-900">Step 3: Sampling & Standards</h2>
              <p className="text-sm text-gray-500">Calculate sample size using ISO 2859-1 (AQL).</p>
            </div>

            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-bold text-blue-900 mb-1">Lot Size (Units/Rolls) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                    <input
                      type="number"
                      name="lot_size"
                      value={meta.lot_size || ''}
                      onChange={handleChange}
                      min="1"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Total units"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-blue-900 mb-1">Required Sample Size</label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                    <input
                      type="number"
                      name="sample_size"
                      value={meta.sample_size || ''}
                      onChange={handleChange}
                      min="1"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold text-blue-700"
                    />
                  </div>
                  {aqlPlan && (
                    <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      ISO 2859-1 (Level {meta.aql_level}, Code {aqlPlan.code})
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-blue-200/50">
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 uppercase">AQL Configuration</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-1">Inspection Level</label>
                    <select
                      name="aql_level"
                      value={meta.aql_level || 'II'}
                      onChange={handleChange}
                      className="w-full text-xs py-1.5 pl-2 border border-blue-200 rounded bg-white"
                    >
                      <option value="I">I (Relaxed)</option>
                      <option value="II">II (Normal)</option>
                      <option value="III">III (Tight)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-1">Major AQL</label>
                    <select
                      name="aql_major"
                      value={meta.aql_major || 2.5}
                      onChange={(e) => setMeta(p => ({ ...p, aql_major: parseFloat(e.target.value) }))}
                      className="w-full text-xs py-1.5 pl-2 border border-blue-200 rounded bg-white"
                    >
                      <option value="0.65">0.65</option>
                      <option value="1.0">1.0</option>
                      <option value="1.5">1.5</option>
                      <option value="2.5">2.5</option>
                      <option value="4.0">4.0</option>
                      <option value="6.5">6.5</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-1">Minor AQL</label>
                    <select
                      name="aql_minor"
                      value={meta.aql_minor || 4.0}
                      onChange={(e) => setMeta(p => ({ ...p, aql_minor: parseFloat(e.target.value) }))}
                      className="w-full text-xs py-1.5 pl-2 border border-blue-200 rounded bg-white"
                    >
                      <option value="1.0">1.0</option>
                      <option value="1.5">1.5</option>
                      <option value="2.5">2.5</option>
                      <option value="4.0">4.0</option>
                      <option value="6.5">6.5</option>
                    </select>
                  </div>
                </div>
                {aqlPlan && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]">
                    <div className="bg-white/60 p-2 rounded border border-blue-100">
                      <span className="block font-bold text-blue-900">Major Defects</span>
                      <span className="text-green-700 font-bold">Ac: {aqlPlan.major.ac}</span> <span className="text-gray-400">|</span> <span className="text-red-600 font-bold">Re: {aqlPlan.major.re}</span>
                    </div>
                    <div className="bg-white/60 p-2 rounded border border-blue-100">
                      <span className="block font-bold text-blue-900">Minor Defects</span>
                      <span className="text-green-700 font-bold">Ac: {aqlPlan.minor.ac}</span> <span className="text-gray-400">|</span> <span className="text-red-600 font-bold">Re: {aqlPlan.minor.re}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">Specification Limits</label>
              <textarea
                name="spec_limits"
                value={meta.spec_limits}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Traceability Tags</h4>
                <p className="text-xs text-gray-500">Print labels for sampled items.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition text-sm font-medium"
                >
                  <FileText className="w-4 h-4" /> Print Plan
                </button>
                <button
                  type="button"
                  onClick={toggleTagsModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition text-sm font-medium"
                >
                  <QrCode className="w-4 h-4" /> Generate Tags
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Inspection */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center pb-2">
              <h2 className="text-lg font-bold text-gray-900">Step 4: Visual Capture</h2>
              <p className="text-sm text-gray-500">Capture or upload images of the sampled items.</p>
            </div>

            {/* Inspection Mode Toggle */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <span className="text-sm font-bold text-gray-700">Analysis Mode:</span>
              <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  type="button"
                  onClick={() => setMeta(prev => ({ ...prev, inspection_mode: 'quick' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${meta.inspection_mode === 'quick'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Zap className="w-4 h-4" />
                  Quick
                  <span className="text-[10px] opacity-80">(Fast & Cost-Effective)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeta(prev => ({ ...prev, inspection_mode: 'detailed' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${meta.inspection_mode === 'detailed'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Search className="w-4 h-4" />
                  Detailed
                  <span className="text-[10px] opacity-80">(High Accuracy)</span>
                </button>
              </div>
            </div>

            {/* Image Count Status */}
            <div className={`flex items-center justify-between p-3 rounded-lg text-sm border ${files.length >= MIN_IMAGES
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
              <div className="flex items-center gap-2">
                {files.length >= MIN_IMAGES ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="font-medium">
                  {files.length} of {MIN_IMAGES}-{MAX_IMAGES} images
                </span>
              </div>
              <span className="text-xs opacity-80">
                {files.length < MIN_IMAGES
                  ? `Add ${MIN_IMAGES - files.length} more image(s)`
                  : files.length >= MAX_IMAGES
                    ? 'Maximum reached'
                    : `${MAX_IMAGES - files.length} slots remaining`}
              </span>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                    <img
                      src={url}
                      alt={`Queue ${idx}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-full flex items-center justify-center text-gray-400">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-90 hover:bg-red-600 transition shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                      {files[idx]?.name || 'Image'}
                    </div>
                  </div>
                ))}

                {files.length < MAX_IMAGES && (
                  <div className="flex flex-col gap-2">
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition min-h-[80px]">
                      <Plus className="w-5 h-5 text-gray-400" />
                      <span className="text-[10px] text-gray-500 mt-1">Upload</span>
                      <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*" />
                    </label>
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition min-h-[80px]">
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span className="text-[10px] text-gray-500 mt-1">Camera</span>
                      <input type="file" capture="environment" className="hidden" onChange={handleFileChange} accept="image/*" />
                    </label>
                  </div>
                )}
              </div>
            )}

            {files.length === 0 && (
              <div className={`flex flex-col md:flex-row gap-4`}>
                <div className="flex-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-white hover:bg-blue-50 transition cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        Select photos
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Upload {MIN_IMAGES}-{MAX_IMAGES} images</p>
                  </div>
                  <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
                </div>

                <div className="flex-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-white hover:bg-blue-50 transition cursor-pointer relative">
                  <div className="space-y-1 text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        Take Photo
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Capture sample images</p>
                  </div>
                  <input type="file" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${currentStep === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white transition shadow-lg ${validateStep(currentStep)
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200'
                : 'bg-gray-300 cursor-not-allowed shadow-none'
                }`}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={files.length < MIN_IMAGES || isAnalyzing}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-white transition shadow-lg ${files.length >= MIN_IMAGES && !isAnalyzing
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-200 transform hover:-translate-y-0.5'
                : 'bg-gray-300 cursor-not-allowed shadow-none'
                }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing ({files.length})...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Run Inspection
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* TAGS MODAL */}
      {showTagsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto no-print-bg">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 no-print">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" /> Print Traceability Tags
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintTags}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={toggleTagsModal}
                  className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto bg-gray-100 printable-area">
              <div className="grid grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
                {Array.from({ length: tagQuantity }).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl border border-gray-300 shadow-sm flex gap-4 print:break-inside-avoid print:border-gray-800">
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded p-1">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`}
                        alt="QR"
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-lg text-black leading-tight mb-1">SAMPLE #{i + 1}</h4>
                        <span className="bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {meta.inspection_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-xs text-black font-mono mt-2">
                        <p><span className="text-gray-500">PO:</span> <span className="font-bold">{meta.po_number}</span></p>
                        <p><span className="text-gray-500">Style:</span> <span className="font-bold">{meta.style_number}</span></p>
                        <p><span className="text-gray-500">Date:</span> <span>{new Date().toLocaleDateString()}</span></p>
                        {meta.batch_lot_number && <p><span className="text-gray-500">Batch:</span> <span>{meta.batch_lot_number}</span></p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center text-gray-500 text-xs no-print">
                <p>Showing {tagQuantity} tags based on sample size.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto no-print-bg">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 no-print">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Inspection Plan
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintTags}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto printable-area">
              <div className="border-2 border-black p-8 bg-white print:border-black">
                <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                  <div>
                    <h1 className="text-3xl font-black text-black uppercase tracking-tight">Inspection Plan</h1>
                    <p className="text-gray-600 font-bold mt-1">Ref: {meta.po_number} / {meta.style_number}</p>
                  </div>
                  <div className="text-right">
                    <div className="bg-black text-white font-bold px-3 py-1 inline-block mb-1">
                      {meta.inspection_type.toUpperCase().replace('_', ' ')}
                    </div>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="font-bold text-gray-500 uppercase text-xs mb-2 border-b border-gray-200 pb-1">Context</h4>
                    <dl className="grid grid-cols-[80px_1fr] gap-y-1 text-sm">
                      <dt className="text-gray-500">Factory:</dt>
                      <dd className="font-bold">{meta.supplier_name}</dd>
                      <dt className="text-gray-500">Brand:</dt>
                      <dd className="font-bold">{meta.brand}</dd>
                      <dt className="text-gray-500">Inspector:</dt>
                      <dd className="font-bold">{inspectorName}</dd>
                      <dt className="text-gray-500">Item:</dt>
                      <dd className="font-bold">{selectedItem?.name || 'N/A'}</dd>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-500 uppercase text-xs mb-2 border-b border-gray-200 pb-1">Sampling (ISO 2859-1)</h4>
                    <dl className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                      <dt className="text-gray-500">Lot Size:</dt>
                      <dd className="font-bold">{meta.lot_size} units</dd>
                      <dt className="text-gray-500">Sample Size:</dt>
                      <dd className="font-bold text-blue-600">{meta.sample_size} units</dd>
                      <dt className="text-gray-500">AQL Level:</dt>
                      <dd className="font-bold">Level {meta.aql_level} (Code {aqlPlan?.code})</dd>
                    </dl>
                    {aqlPlan && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-100 p-2 rounded">
                          <span className="block font-bold text-gray-500 text-[10px]">MAJOR ({meta.aql_major})</span>
                          <span className="font-bold text-black">Ac: {aqlPlan.major.ac} | Re: {aqlPlan.major.re}</span>
                        </div>
                        <div className="bg-gray-100 p-2 rounded">
                          <span className="block font-bold text-gray-500 text-[10px]">MINOR ({meta.aql_minor})</span>
                          <span className="font-bold text-black">Ac: {aqlPlan.minor.ac} | Re: {aqlPlan.minor.re}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-500 uppercase text-xs mb-2 border-b border-gray-200 pb-1">Quality Standards & Spec Limits</h4>
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm font-mono text-black whitespace-pre-wrap">
                    {meta.spec_limits || "No specific limits defined."}
                  </div>
                </div>

                <div className="mt-12 pt-4 border-t-2 border-black flex justify-between text-xs text-gray-400">
                  <span>TexVision AI System</span>
                  <span>QMS-FORM-001 rev.2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles for Printing */}
      <style>{`
        @media print {
          body > *:not(.fixed) {
            display: none !important;
          }
          .no-print, .no-print-bg {
            display: none !important;
          }
           /* Ensure modal content is visible and takes up full width */
          .fixed {
            position: relative !important;
            inset: auto !important;
            z-index: auto !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
           /* Reset specific modal containers */
          .fixed > div {
             box-shadow: none !important;
             max-width: none !important;
             width: 100% !important;
             max-height: none !important;
          }
           /* Make the scrollable content area visible */
          .printable-area {
             overflow: visible !important;
             padding: 0 !important;
          }
        }
      `}</style>

    </div>
  );
};