import React, { useState, useMemo } from 'react';
import { ItemMaster, InspectionReport } from '../types';
import { Search, Plus, Package, Edit2, Save, X, ArrowLeft, Trash2, QrCode, CheckSquare, ListChecks, Upload, ShoppingBag, Tag, Factory, ImagePlus, ThumbsUp, ThumbsDown, Activity, AlertCircle, History, Scale, ChevronDown, Filter, Ruler } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ItemCenterProps {
  items: ItemMaster[];
  history: InspectionReport[];
  suppliers: string[]; // New prop for supplier dropdown
  onBack: () => void;
  onSaveItem: (item: ItemMaster) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const ItemCenter: React.FC<ItemCenterProps> = ({ items, history, suppliers, onBack, onSaveItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ItemMaster | null>(null);
  const [showQrFor, setShowQrFor] = useState<string | null>(null);
  const [newCheckpoint, setNewCheckpoint] = useState('');

  // Supplier Dropdown State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Derive categories from items
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category || 'Uncategorized'));
    return ['All', ...Array.from(cats).sort()];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return items.filter(i => {
      const matchesCategory = selectedCategory === 'All' || (i.category || 'Uncategorized') === selectedCategory;
      const matchesSearch = !term || (
        (i.name && i.name.toLowerCase().includes(term)) ||
        (i.code && i.code.toLowerCase().includes(term)) ||
        (i.category && i.category.toLowerCase().includes(term))
      );
      return matchesCategory && matchesSearch;
    });
  }, [items, searchTerm, selectedCategory]);

  // Optimize: Pre-calculate stats for all items once when history or items change
  const itemStatsMap = useMemo(() => {
    const map = new Map();

    // Group reports by product code first
    const reportsByCode: Record<string, InspectionReport[]> = {};
    history.forEach(r => {
      const code = r.inspection_header.product_code;
      if (!reportsByCode[code]) reportsByCode[code] = [];
      reportsByCode[code].push(r);
    });

    items.forEach(item => {
      const itemReports = reportsByCode[item.code] || [];
      const total = itemReports.length;

      if (total === 0) {
        map.set(item.code, null);
        return;
      }

      const passed = itemReports.filter(r => r.lot_assessment.lot_status === 'accept').length;
      const passRate = (passed / total) * 100;

      // Sum defect rates
      const totalDefectRate = itemReports.reduce((sum, r) =>
        sum + (r.performance_insights?.supplier_performance?.current_lot_defect_rate_percent || 0), 0);
      const avgDefectRate = totalDefectRate / total;

      // Top defects aggregation
      const defectCounts: Record<string, number> = {};
      itemReports.forEach(r => {
        r.lot_assessment.defect_summary.forEach(d => {
          const name = d.class.replace(/_/g, ' ');
          defectCounts[name] = (defectCounts[name] || 0) + d.count;
        });
      });

      const topDefects = Object.entries(defectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      map.set(item.code, { total, passRate, avgDefectRate, topDefects });
    });

    return map;
  }, [history, items]);

  const handleCreateNew = () => {
    const newItem: ItemMaster = {
      id: Date.now().toString(),
      name: '',
      code: '',
      category: '',
      item_type: 'sell', // Default to finished good
      uom: '',
      dimensions: '',
      description: '',
      specifications: '',
      quality_checkpoints: [],
      reference_image_url: '',
      standard_images: { accepted: [], rejected: [] },
      aql_config: { level: 'II', major: 2.5, minor: 4.0 }
    };
    setEditForm(newItem);
    setIsEditing(true);
    setIsSupplierDropdownOpen(false);
    setSupplierSearch('');
  };

  const handleEdit = (item: ItemMaster) => {
    setEditForm({
      ...item,
      item_type: item.item_type || 'sell',
      quality_checkpoints: item.quality_checkpoints || [],
      standard_images: item.standard_images || { accepted: [], rejected: [] },
      aql_config: item.aql_config || { level: 'II', major: 2.5, minor: 4.0 }
    });
    setIsEditing(true);
    setIsSupplierDropdownOpen(false);
    setSupplierSearch('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this master item? This cannot be undone.")) {
      if (onDeleteItem) onDeleteItem(id);
    }
  };

  const handleSave = () => {
    if (editForm && editForm.name && editForm.code) {
      onSaveItem(editForm);
      setIsEditing(false);
      setEditForm(null);
      setNewCheckpoint('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'accepted' | 'rejected') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        if (target === 'main') {
          setEditForm(prev => prev ? ({ ...prev, reference_image_url: result }) : null);
        } else if (target === 'accepted') {
          setEditForm(prev => {
            if (!prev) return null;
            const current = prev.standard_images?.accepted || [];
            if (current.length >= 2) {
              alert("Maximum 2 acceptable reference images allowed.");
              return prev;
            }
            return {
              ...prev,
              standard_images: {
                ...prev.standard_images,
                accepted: [...current, result],
                rejected: prev.standard_images?.rejected || []
              }
            };
          });
        } else if (target === 'rejected') {
          setEditForm(prev => {
            if (!prev) return null;
            const current = prev.standard_images?.rejected || [];
            if (current.length >= 2) {
              alert("Maximum 2 rejected reference images allowed.");
              return prev;
            }
            return {
              ...prev,
              standard_images: {
                ...prev.standard_images,
                accepted: prev.standard_images?.accepted || [],
                rejected: [...current, result]
              }
            };
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeStandardImage = (type: 'accepted' | 'rejected', index: number) => {
    setEditForm(prev => {
      if (!prev || !prev.standard_images) return prev;
      const list = [...prev.standard_images[type]];
      list.splice(index, 1);
      return {
        ...prev,
        standard_images: {
          ...prev.standard_images,
          [type]: list
        }
      };
    });
  };

  const addCheckpoint = () => {
    if (newCheckpoint.trim() && editForm) {
      setEditForm({
        ...editForm,
        quality_checkpoints: [...(editForm.quality_checkpoints || []), newCheckpoint.trim()]
      });
      setNewCheckpoint('');
    }
  };

  const removeCheckpoint = (index: number) => {
    if (editForm && editForm.quality_checkpoints) {
      const updated = [...editForm.quality_checkpoints];
      updated.splice(index, 1);
      setEditForm({ ...editForm, quality_checkpoints: updated });
    }
  };

  // --- Modal Edit Form ---
  const renderEditModal = () => {
    if (!isEditing || !editForm) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              {editForm.id && items.some(i => i.id === editForm.id) ? 'Edit Master Item' : 'New Master Item'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">

                {/* Item Type Selector */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Item Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="item_type"
                        checked={editForm.item_type === 'sell'}
                        onChange={() => setEditForm({ ...editForm, item_type: 'sell' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium flex items-center gap-1"><Tag className="w-3 h-3 text-green-600" /> Finished Good (Sell)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="item_type"
                        checked={editForm.item_type === 'buy'}
                        onChange={() => setEditForm({ ...editForm, item_type: 'buy' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium flex items-center gap-1"><ShoppingBag className="w-3 h-3 text-orange-600" /> Raw Material (Buy)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. E6013 Electrode"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Item Code / SKU</label>
                    <input
                      type="text"
                      value={editForm.code}
                      onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. E6013-3.2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">UOM</label>
                    <input
                      type="text"
                      value={editForm.uom || ''}
                      onChange={e => setEditForm({ ...editForm, uom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. kg, pcs, roll"
                    />
                  </div>
                </div>

                {/* Dimensions Field */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Product Dimensions</label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editForm.dimensions || ''}
                      onChange={e => setEditForm({ ...editForm, dimensions: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Diameter: 3.2mm, Length: 350mm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Select Category --</option>
                    <option value="Electrodes">Electrodes</option>
                    <option value="Wire">Wire</option>
                    <option value="Flux">Flux</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Preferred Supplier - Conditional with Searchable Dropdown */}
                {editForm.item_type === 'buy' && (
                  <div className="animate-fadeIn relative">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Factory className="w-3 h-3" /> Preferred Supplier
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                        className="w-full px-3 py-2 border border-orange-200 bg-orange-50 rounded-lg focus:ring-2 focus:ring-orange-500 text-left flex items-center justify-between"
                      >
                        <span className={`block truncate ${!editForm.preferred_supplier ? 'text-gray-500' : 'text-gray-900'}`}>
                          {editForm.preferred_supplier || "-- Select Supplier --"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </button>

                      {isSupplierDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          <div className="sticky top-0 z-10 bg-white p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                              <input
                                type="text"
                                className="w-full pl-7 pr-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500"
                                placeholder="Search suppliers..."
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          <div
                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-orange-50 text-gray-500 italic"
                            onClick={() => {
                              setEditForm({ ...editForm, preferred_supplier: undefined });
                              setIsSupplierDropdownOpen(false);
                              setSupplierSearch('');
                            }}
                          >
                            -- None --
                          </div>

                          {suppliers
                            .filter(s => s.toLowerCase().includes(supplierSearch.toLowerCase()))
                            .map((supplier) => (
                              <div
                                key={supplier}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-orange-50 ${editForm.preferred_supplier === supplier ? 'bg-orange-100 text-orange-900 font-medium' : 'text-gray-900'}`}
                                onClick={() => {
                                  setEditForm({ ...editForm, preferred_supplier: supplier });
                                  setIsSupplierDropdownOpen(false);
                                  setSupplierSearch('');
                                }}
                              >
                                <span className="block truncate">{supplier}</span>
                                {editForm.preferred_supplier === supplier && (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            ))
                          }

                          {suppliers.filter(s => s.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                            <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500">
                              No suppliers found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                {/* Main Reference Image (Catalogue Cover) - Optional */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Catalogue Cover Image <span className="font-normal text-gray-400">(Optional)</span>
                  </label>

                  {editForm.reference_image_url ? (
                    <div className="relative h-32 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={editForm.reference_image_url} alt="Reference" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 hidden">
                        <Package className="w-8 h-8" />
                      </div>
                      <button
                        onClick={() => setEditForm({ ...editForm, reference_image_url: '' })}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-80 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Preset Image Options */}
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Choose a default image:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, reference_image_url: 'https://images.unsplash.com/photo-1563289069-42b4d45d3412?auto=format&fit=crop&q=80&w=300' })}
                            className="h-20 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition overflow-hidden bg-gray-50"
                          >
                            <img
                              src="https://images.unsplash.com/photo-1563289069-42b4d45d3412?auto=format&fit=crop&q=80&w=300"
                              alt="Electrode"
                              className="w-full h-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, reference_image_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=300' })}
                            className="h-20 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition overflow-hidden bg-gray-50"
                          >
                            <img
                              src="https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=300"
                              alt="Welding"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        </div>
                      </div>

                      {/* Custom Upload Option */}
                      <label className="flex flex-col items-center justify-center gap-2 h-16 px-4 py-2 bg-gray-50 border border-gray-300 border-dashed rounded-lg hover:bg-blue-50 transition cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">Or upload custom image</span>
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'main')} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* AQL Settings */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <label className="block text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    AQL Standards (ISO 2859-1)
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-purple-800 mb-1">Level</label>
                      <select
                        value={editForm.aql_config?.level || 'II'}
                        onChange={e => setEditForm({
                          ...editForm,
                          aql_config: { ...(editForm.aql_config || { major: 2.5, minor: 4.0 }), level: e.target.value as any }
                        })}
                        className="w-full px-2 py-1.5 text-sm border border-purple-200 rounded bg-white focus:ring-2 focus:ring-purple-400"
                      >
                        <option value="I">Level I (Relaxed)</option>
                        <option value="II">Level II (Normal)</option>
                        <option value="III">Level III (Tight)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-800 mb-1">AQL Major</label>
                      <select
                        value={editForm.aql_config?.major || 2.5}
                        onChange={e => setEditForm({
                          ...editForm,
                          aql_config: { ...(editForm.aql_config || { level: 'II', minor: 4.0 }), major: parseFloat(e.target.value) }
                        })}
                        className="w-full px-2 py-1.5 text-sm border border-purple-200 rounded bg-white focus:ring-2 focus:ring-purple-400"
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
                      <label className="block text-xs font-bold text-purple-800 mb-1">AQL Minor</label>
                      <select
                        value={editForm.aql_config?.minor || 4.0}
                        onChange={e => setEditForm({
                          ...editForm,
                          aql_config: { ...(editForm.aql_config || { level: 'II', major: 2.5 }), minor: parseFloat(e.target.value) }
                        })}
                        className="w-full px-2 py-1.5 text-sm border border-purple-200 rounded bg-white focus:ring-2 focus:ring-purple-400"
                      >
                        <option value="1.0">1.0</option>
                        <option value="1.5">1.5</option>
                        <option value="2.5">2.5</option>
                        <option value="4.0">4.0</option>
                        <option value="6.5">6.5</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-600 mt-2 italic">Defines sample sizes and acceptance limits for inspections of this item.</p>
                </div>

                {/* Visual Standards - 2x2 Grid */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                    Visual Standards (Analysis Context)
                  </label>

                  <div className="space-y-4">
                    {/* Accepted Images */}
                    <div>
                      <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> ACCEPTABLE (Max 2)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(editForm.standard_images?.accepted || []).map((img, idx) => (
                          <div key={idx} className="relative aspect-square bg-white border border-green-200 rounded overflow-hidden group">
                            <img src={img} alt="Acceptable Standard" className="w-full h-full object-cover" />
                            <button onClick={() => removeStandardImage('accepted', idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        {(!editForm.standard_images?.accepted || editForm.standard_images.accepted.length < 2) && (
                          <label className="aspect-square flex flex-col items-center justify-center border border-green-200 border-dashed rounded bg-green-50/50 hover:bg-green-100 cursor-pointer transition">
                            <Plus className="w-4 h-4 text-green-600" />
                            <span className="text-[10px] text-green-600">Add Good</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'accepted')} />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Rejected Images */}
                    <div>
                      <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" /> UNACCEPTABLE (Max 2)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(editForm.standard_images?.rejected || []).map((img, idx) => (
                          <div key={idx} className="relative aspect-square bg-white border border-red-200 rounded overflow-hidden group">
                            <img src={img} alt="Rejected Standard" className="w-full h-full object-cover" />
                            <button onClick={() => removeStandardImage('rejected', idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        {(!editForm.standard_images?.rejected || editForm.standard_images.rejected.length < 2) && (
                          <label className="aspect-square flex flex-col items-center justify-center border border-red-200 border-dashed rounded bg-red-50/50 hover:bg-red-100 cursor-pointer transition">
                            <Plus className="w-4 h-4 text-red-600" />
                            <span className="text-[10px] text-red-600">Add Defect</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'rejected')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <label className="block text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <ListChecks className="w-4 h-4" />
                    Quality Parameters (Checkpoints)
                  </label>
                  <div className="space-y-2 mb-3 max-h-[150px] overflow-y-auto">
                    {editForm.quality_checkpoints?.map((check, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-blue-100 text-sm">
                        <span className="flex items-center gap-2"><CheckSquare className="w-3 h-3 text-green-500" /> {check}</span>
                        <button onClick={() => removeCheckpoint(idx)} className="text-red-400 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!editForm.quality_checkpoints || editForm.quality_checkpoints.length === 0) && (
                      <p className="text-xs text-blue-400 italic">No specific checkpoints added yet.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCheckpoint}
                      onChange={e => setNewCheckpoint(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCheckpoint()}
                      className="flex-grow text-sm px-3 py-1.5 border border-blue-200 rounded focus:outline-none focus:border-blue-400"
                      placeholder="Add new check (e.g. Check tip coating)"
                    />
                    <button onClick={addCheckpoint} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded font-medium hover:bg-blue-700">Add</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">General Specifications (Context)</label>
                  <textarea
                    value={editForm.specifications}
                    onChange={e => setEditForm({ ...editForm, specifications: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-gray-50"
                    rows={4}
                    placeholder="Overall description of quality standards."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200">
              <Save className="w-4 h-4" /> Save Item Master
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn h-full flex flex-col">
      {renderEditModal()}

      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Item Master Catalogue</h1>
            <p className="text-sm text-gray-500">Manage products, specifications, and QR codes</p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, code, category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="mr-2 text-sm font-bold text-gray-400 flex items-center gap-1">
          <Filter className="w-4 h-4" /> Filter:
        </div>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat
              ? 'bg-slate-800 text-white shadow-md transform scale-105'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
          >
            {cat}
            {cat !== 'All' && (
              <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {items.filter(i => (i.category || 'Uncategorized') === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        {filteredItems.map(item => {
          const stats = itemStatsMap.get(item.code);
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group relative flex flex-col">

              {/* QR Code Overlay (Hidden by default) */}
              {showQrFor === item.id && (
                <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                  <button
                    onClick={() => setShowQrFor(null)}
                    className="absolute top-2 right-2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(item.code)}`}
                    alt="QR Code"
                    className="w-40 h-40 border-2 border-white shadow-lg rounded-lg mb-4"
                  />
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <p className="text-gray-500 font-mono text-sm">{item.code}</p>
                  <button className="mt-4 text-blue-600 text-xs font-bold hover:underline" onClick={() => window.print()}>
                    Print Label
                  </button>
                </div>
              )}

              {/* Image Area */}
              <div className="h-48 bg-gray-100 relative overflow-hidden border-b border-gray-100">
                {item.reference_image_url ? (
                  <img
                    src={item.reference_image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-gray-300 ${item.reference_image_url ? 'hidden' : ''}`}>
                  <Package className="w-12 h-12" />
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowQrFor(item.id); }}
                    className="bg-white/90 p-1.5 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-white shadow-sm transition"
                    title="View QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wide">
                    {item.category}
                  </span>
                  {item.uom && (
                    <span className="bg-blue-600/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wide">
                      {item.uom}
                    </span>
                  )}
                  {(item.standard_images?.accepted?.length || 0) > 0 && (
                    <span className="bg-green-600/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wide flex items-center gap-1">
                      <ImagePlus className="w-3 h-3" /> Standards
                    </span>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5 flex-grow flex flex-col">
                <div className="mb-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{item.name}</h3>
                    {item.item_type === 'buy' ? (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 uppercase font-bold tracking-wide whitespace-nowrap">Buy</span>
                    ) : (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 uppercase font-bold tracking-wide whitespace-nowrap">Sell</span>
                    )}
                  </div>
                  <p className="text-gray-500 font-mono text-xs">{item.code}</p>

                  {/* Dimensions Display */}
                  {item.dimensions && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <Ruler className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{item.dimensions}</span>
                    </p>
                  )}
                </div>

                {item.item_type === 'buy' && item.preferred_supplier && (
                  <div className="mb-3 flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                    <Factory className="w-3 h-3 mt-0.5 text-gray-400" />
                    <span className="truncate" title={item.preferred_supplier}>{item.preferred_supplier}</span>
                  </div>
                )}

                {/* Stats / Performance Summary Section */}
                {stats ? (
                  <div className="mb-3 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase mb-2">
                      <Activity className="w-3 h-3" /> Inspection History
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center border-b border-gray-200 pb-2 mb-2">
                      <div>
                        <div className="text-[10px] text-gray-400">Total</div>
                        <div className="font-bold text-sm">{stats.total}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Pass Rate</div>
                        <div className={`font-bold text-sm ${stats.passRate >= 90 ? 'text-green-600' : stats.passRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {stats.passRate.toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Avg Defects</div>
                        <div className={`font-bold text-sm ${stats.avgDefectRate < 2 ? 'text-green-600' : 'text-orange-600'}`}>
                          {stats.avgDefectRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {stats.topDefects.length > 0 && (
                      <div className="text-xs text-gray-500 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 text-orange-400 flex-shrink-0" />
                        <span className="truncate">Top: {stats.topDefects.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 bg-gray-50/50 rounded-lg p-3 border border-dashed border-gray-200 text-center">
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                      <History className="w-3 h-3" /> No inspection history
                    </p>
                  </div>
                )}

                <div className="flex-grow">
                  {item.quality_checkpoints && item.quality_checkpoints.length > 0 ? (
                    <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50">
                      <p className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center gap-1">
                        <ListChecks className="w-3 h-3" /> {item.quality_checkpoints.length} Checkpoints
                      </p>
                      <ul className="space-y-1">
                        {item.quality_checkpoints.slice(0, 3).map((cp, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="mt-0.5 w-1 h-1 rounded-full bg-blue-400 flex-shrink-0"></span>
                            <span className="truncate">{cp}</span>
                          </li>
                        ))}
                        {item.quality_checkpoints.length > 3 && (
                          <li className="text-[10px] text-blue-500 pl-2.5 font-medium">+ {item.quality_checkpoints.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-2">No specific checkpoints defined.</p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 p-2 rounded transition"
                  title="Delete Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition shadow-sm"
                >
                  <Edit2 className="w-3 h-3" /> Manage Details
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State Add Card */}
        <div
          onClick={handleCreateNew}
          className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-500 cursor-pointer transition min-h-[350px]"
        >
          <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg">Add New Item</h3>
          <p className="text-sm opacity-70">Define specs & checkpoints</p>
        </div>
      </div>
    </div>
  );
};