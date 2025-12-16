import React, { useState, useEffect } from 'react';
import { MetaData, ItemMaster } from '../types';
import { Upload, User, ShieldCheck, X, Plus, Camera, Building2, Calculator, Ruler, Package, Printer, Minus, QrCode, Layers, ArrowRight, ArrowLeft, Check, AlertCircle, Settings2, ChevronDown, FileText, Clock } from 'lucide-react';
import { useRateLimit } from '../hooks/useRateLimit';

interface InspectionFormProps {
  onSubmit: (meta: MetaData, files: File[]) => void;
  isAnalyzing: boolean;
  inspectorName: string;
  suppliers: string[];
  items?: ItemMaster[];
  onItemSelect?: (item: ItemMaster | null) => void;
}

// Pre-filled mock metadata
const INITIAL_META: MetaData = {
  inspection_type: 'incoming',
  supplier_name: 'Shanghai Industries (Pvt) Ltd.',
  brand: 'Shanghai Industries',
  product_code: '',
  po_number: '',
  invoice_number: '',
  inspector_name: '',
  spec_limits: 'No torn or wet cartons. Minor dents allowed if electrodes not exposed.',
  lot_size: undefined,
  sample_size: undefined,
  aql_level: 'II',
  aql_major: 2.5,
  aql_minor: 4.0
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
  { id: 2, title: 'Product', icon: Package },
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMeta(prev => ({ ...prev, inspector_name: inspectorName }));
    }
  }, [inspectorName, meta.inspector_name]);

  useEffect(() => {
    if (meta.sample_size && meta.sample_size > 0 && tagQuantity !== meta.sample_size) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAqlPlan(plan);
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
          product_code: item.code,
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
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);
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
      case 2: if (!meta.po_number || !meta.product_code) return false; return true;
      case 3: if (!meta.lot_size) return false; return true;
      case 4: return files.length > 0;
      default: return true;
    }
  };

  const nextStep = () => validateStep(currentStep) && setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const isFinishedGoods = meta.inspection_type === 'finished_goods';
  const selectedItem = items.find(i => i.id === selectedItemId);

  // QR Data Generation for URL
  const qrBaseUrl = "https://weld-vision.isoxpert.com/";
  const queryParams = new URLSearchParams();
  if (meta.po_number) queryParams.append("po", meta.po_number);
  if (meta.batch_lot_number) queryParams.append("batch", meta.batch_lot_number);
  if (meta.product_code) queryParams.append("sku", meta.product_code);
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
                {['incoming', 'finished_goods', 'loose_packed'].map((type) => (
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
                <label className="block text-sm font-bold text-black mb-1">Supplier Name <span className="text-red-500">*</span></label>
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
                      placeholder="Select or enter new supplier"
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
              <h2 className="text-lg font-bold text-gray-900">Step 2: Traceability Details</h2>
              <p className="text-sm text-gray-500">Identify the product and batch information.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-1">Select Benchmark Item (Optional)</label>
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
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-grow">
                        <div className="font-bold text-gray-900">{selectedItem.name}</div>
                        <div className="text-xs text-gray-500">{selectedItem.code}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center border border-gray-200 border-dashed"><Package className="w-4 h-4 text-gray-300" /></div>
                      <span className="text-gray-500">-- Select Benchmark Item --</span>
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
                          <Package className="w-5 h-5 text-gray-400" />
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
                <label className="block text-sm font-bold text-black mb-1">Product Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="product_code"
                  value={meta.product_code}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="SKU / Item Code"
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
                  placeholder={isFinishedGoods ? "e.g. PROD-24-999" : "e.g. PO-24001"}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-1">Batch / Lot</label>
                <input
                  type="text"
                  name="batch_lot_number"
                  value={meta.batch_lot_number || ''}
                  onChange={handleChange}
                  placeholder="Scan or enter batch"
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sampling & Standards */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            {/* ... same as previous ... */}
            <div className="text-center pb-4">
              <h2 className="text-lg font-bold text-gray-900">Step 3: Sampling & Standards</h2>
              <p className="text-sm text-gray-500">Calculate sample size using ISO 2859-1 (AQL).</p>
            </div>

            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-bold text-blue-900 mb-1">Total Lot Size <span className="text-red-500">*</span></label>
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
                  </div>
                  <input type="file" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm border border-yellow-100">
                <AlertCircle className="w-4 h-4" />
                Please upload at least one image to proceed with analysis.
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-auto pt-6 flex justify-between border-t border-gray-100">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${currentStep === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white shadow-sm transition ${!validateStep(currentStep) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                }`}
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={files.length === 0 || isAnalyzing || isLimited}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-bold text-white shadow-sm transition ${files.length === 0 || isAnalyzing || isLimited ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
                }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : isLimited ? (
                <>
                  <Clock className="w-4 h-4" />
                  Wait {cooldownRemaining}s...
                </>
              ) : (
                <>Run Analysis <Check className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Printable Tags Modal Overlay */}
      {showTagsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn overflow-auto print:p-0 print:bg-white print:static print:block">
          <style>
            {`
                @media print {
                  @page { margin: 0.5cm; size: A4 portrait; }
                  body { margin: 0; padding: 0; }
                  body * { visibility: hidden; }
                  #printable-tags-container, #printable-tags-container * { visibility: visible; }
                  #printable-tags-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; }
                  .no-print-modal { display: none !important; }
                  .page-break-inside-avoid { page-break-inside: avoid; }
                }
              `}
          </style>

          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:max-h-none print:rounded-none">

            {/* Modal Header - Hidden in Print */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl no-print-modal">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                Generate Traceability Tags
              </h3>
              <button onClick={toggleTagsModal} className="p-2 hover:bg-gray-200 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Controls - Hidden in Print */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 sm:items-center bg-white no-print-modal">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Print Qty:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => setTagQuantity(Math.max(1, tagQuantity - 1))} className="p-2 hover:bg-gray-100 border-r border-gray-300 text-gray-600"><Minus className="w-4 h-4" /></button>
                  <input
                    type="number"
                    value={tagQuantity}
                    onChange={(e) => setTagQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center font-mono font-bold text-gray-800 focus:outline-none py-1.5"
                  />
                  <button onClick={() => setTagQuantity(tagQuantity + 1)} className="p-2 hover:bg-gray-100 border-l border-gray-300 text-gray-600"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTagQuantity(meta.sample_size || 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 transition"
                  title="Set to AQL Sample Size"
                >
                  <Ruler className="w-3 h-3" />
                  Sample ({meta.sample_size || 0})
                </button>
                <button
                  onClick={() => setTagQuantity(meta.lot_size || 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-purple-50 text-purple-700 rounded hover:bg-purple-100 border border-purple-200 transition"
                  title="Set to Total Lot Size"
                >
                  <Layers className="w-3 h-3" />
                  Full Lot ({meta.lot_size || 0})
                </button>
              </div>
              <div className="flex-grow"></div>
              <button
                onClick={handlePrintTags}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition whitespace-nowrap"
              >
                <Printer className="w-4 h-4" /> Print Tags
              </button>
            </div>

            {/* Scrollable Preview Area / Print Container */}
            <div id="printable-tags-container" className="p-8 overflow-y-auto bg-gray-100 print:bg-white print:overflow-visible print:p-2">
              {tagQuantity > 100 && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm font-medium no-print-modal">
                  Warning: Generating {tagQuantity} tags may slow down the browser. Consider printing in smaller batches.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:w-full">
                {Array.from({ length: Math.min(tagQuantity, 500) }).map((_, i) => (
                  <div key={i} className="bg-white border-2 border-black p-4 break-inside-avoid page-break-inside-avoid flex flex-col relative h-[220px] shadow-sm print:shadow-none print:h-[150px] print:p-2 print:border">
                    {/* Tag Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2 print:pb-1 print:mb-1 print:border-b">
                      <div>
                        <h4 className="font-black text-xl uppercase tracking-tighter leading-none print:text-sm">
                          {isFinishedGoods ? 'FG Tag' : 'Incoming Tag'}
                        </h4>
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest print:text-[7px]">WeldVision AI Quality</p>
                      </div>
                      <div className="text-right leading-none">
                        <span className="block text-2xl font-black print:text-base">{i + 1}</span>
                        <span className="text-[10px] font-bold text-gray-400 print:text-[7px]">OF {tagQuantity}</span>
                      </div>
                    </div>

                    <div className="flex flex-grow gap-2 items-start mt-1">
                      {/* Data Fields - 2 Column Grid */}
                      <div className="flex-grow grid grid-cols-2 gap-x-2 gap-y-1 text-sm print:text-[9px]">
                        {/* PO Number - Remove col-span-2 */}
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-500 print:text-[7px]">
                            {isFinishedGoods ? 'Prod. Order' : 'PO Number'}
                          </span>
                          <span className="block font-mono font-bold text-black border-b border-gray-200 border-dashed truncate">{meta.po_number || '_______'}</span>
                        </div>

                        {/* Date - Moved from footer */}
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-500 print:text-[7px]">Date</span>
                          <span className="block font-mono font-bold text-black border-b border-gray-200 border-dashed truncate">{new Date().toLocaleDateString()}</span>
                        </div>

                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-500 print:text-[7px]">Item Code</span>
                          <span className="block font-bold text-black border-b border-gray-200 border-dashed truncate">{meta.product_code || '_______'}</span>
                        </div>

                        <div>
                          <span className="block text-[10px] uppercase font-bold text-gray-500 print:text-[7px]">Batch / Lot</span>
                          <span className="block font-mono font-bold text-black border-b border-gray-200 border-dashed truncate">{meta.batch_lot_number || '_______'}</span>
                        </div>

                        <div className="col-span-2">
                          <span className="block text-[10px] uppercase font-bold text-gray-500 print:text-[7px]">
                            {isFinishedGoods ? 'Origin' : 'Supplier'}
                          </span>
                          <span className="block font-bold text-black border-b border-gray-200 border-dashed truncate">
                            {isFinishedGoods ? 'Internal' : (meta.supplier_name || '_______')}
                          </span>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="flex-shrink-0 flex flex-col items-center justify-center pt-2">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}`}
                          alt="Tag QR"
                          className="w-20 h-20 border border-black p-0.5 print:w-16 print:h-16"
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-2 border-t border-black flex justify-end items-end print:pt-1 print:border-t">
                      {/* Removed Date div from left side */}
                      <div className="text-right">
                        <div className="h-6 w-20 border-b border-black mb-1 print:h-4 print:w-16 print:mb-0.5"></div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-[7px]">Insp. Initials</span>
                      </div>
                    </div>
                  </div>
                ))}

                {tagQuantity > 500 && (
                  <div className="col-span-full p-8 text-center bg-white border border-dashed border-gray-300">
                    <p className="text-gray-500 font-bold">... {tagQuantity - 500} more tags ...</p>
                    <p className="text-xs text-gray-400">Preview limited to 500 tags for performance.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Inspection Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 animate-fadeIn overflow-auto print:p-0 print:bg-white print:static print:block">
          <style>
            {`
                @media print {
                  body * { visibility: hidden; }
                  #printable-plan-container, #printable-plan-container * { visibility: visible; }
                  #printable-plan-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 40px; background: white; }
                  .no-print-modal { display: none !important; }
                }
              `}
          </style>

          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:max-h-none print:rounded-none">

            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl no-print-modal">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Inspection Plan Details
              </h3>
              <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div id="printable-plan-container" className="p-8 bg-white">
              <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight">Inspection Plan</h1>
                  <p className="text-sm text-gray-500 font-bold uppercase">ISO 2859-1 Sampling Protocol</p>
                </div>
                <div className="text-right text-xs text-gray-500 font-mono">
                  <div>Generated: {new Date().toLocaleDateString()}</div>
                  <div>Inspector: {inspectorName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-400 border-b border-gray-200 mb-2 pb-1">Context</h4>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3"><span className="font-medium text-gray-600">Type:</span> <span className="col-span-2 font-bold capitalize">{meta.inspection_type.replace('_', ' ')}</span></div>
                    <div className="grid grid-cols-3"><span className="font-medium text-gray-600">Supplier:</span> <span className="col-span-2 font-bold">{meta.supplier_name || 'N/A'}</span></div>
                    <div className="grid grid-cols-3"><span className="font-medium text-gray-600">PO Ref:</span> <span className="col-span-2 font-bold">{meta.po_number || 'N/A'}</span></div>
                    <div className="grid grid-cols-3"><span className="font-medium text-gray-600">Batch:</span> <span className="col-span-2 font-bold">{meta.batch_lot_number || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-400 border-b border-gray-200 mb-2 pb-1">Product</h4>
                  <div className="space-y-1 text-sm">
                    <div className="grid grid-cols-3"><span className="font-medium text-gray-600">Code:</span> <span className="col-span-2 font-bold">{meta.product_code || 'N/A'}</span></div>
                    <div className="grid grid-cols-3"><span className="font-medium text-gray-600">Brand:</span> <span className="col-span-2 font-bold">{meta.brand || 'N/A'}</span></div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 print:border-black print:bg-white">
                <h4 className="text-sm font-black uppercase mb-4 flex items-center gap-2"><Ruler className="w-4 h-4" /> Sampling Plan</h4>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-2 border border-gray-300 rounded bg-white">
                    <span className="block text-xs font-bold text-gray-500 uppercase">Lot Size</span>
                    <span className="block text-xl font-black">{meta.lot_size || 0}</span>
                  </div>
                  <div className="p-2 border border-gray-300 rounded bg-white">
                    <span className="block text-xs font-bold text-gray-500 uppercase">Code</span>
                    <span className="block text-xl font-black">{aqlPlan?.code || '-'}</span>
                  </div>
                  <div className="p-2 border border-black rounded bg-gray-100 print:bg-gray-200">
                    <span className="block text-xs font-bold text-gray-900 uppercase">Sample Size</span>
                    <span className="block text-xl font-black">{meta.sample_size || 0}</span>
                  </div>
                  <div className="p-2 border border-gray-300 rounded bg-white">
                    <span className="block text-xs font-bold text-gray-500 uppercase">Level</span>
                    <span className="block text-xl font-black">{meta.aql_level}</span>
                  </div>
                </div>

                {aqlPlan && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="border border-gray-300 rounded p-3 bg-white">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-1">Major Defects (AQL {meta.aql_major})</div>
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-green-700">Accept: {aqlPlan.major.ac}</span>
                        <span className="text-sm font-bold text-red-700">Reject: {aqlPlan.major.re}</span>
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded p-3 bg-white">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-1">Minor Defects (AQL {meta.aql_minor})</div>
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-green-700">Accept: {aqlPlan.minor.ac}</span>
                        <span className="text-sm font-bold text-red-700">Reject: {aqlPlan.minor.re}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <h4 className="text-xs font-bold uppercase text-gray-400 border-b border-gray-200 mb-2 pb-1">Specs & Notes</h4>
                <div className="p-4 border border-gray-200 rounded bg-gray-50 min-h-[100px] text-sm print:bg-white print:border-black">
                  {meta.spec_limits || 'No specific notes defined.'}
                </div>
              </div>

              <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-400 uppercase">
                <div>WeldVision AI Quality Control</div>
                <div className="w-48 border-t border-gray-400 pt-1 text-center">Inspector Signature</div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 no-print-modal">
              <button onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Close</button>
              <button onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};