import React, { useState, useMemo } from 'react';
import { ItemMaster, InspectionReport } from '../types';
import { Search, Plus, Shirt, Edit2, Save, X, ArrowLeft, Trash2, QrCode, CheckSquare, ListChecks, Upload, ShoppingBag, Tag, Factory, ImagePlus, ThumbsUp, ThumbsDown, Activity, AlertCircle, History, Scale, ChevronDown, Filter, Ruler, Scissors } from 'lucide-react';
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
      const code = r.inspection_header.style_number; // Updated to style_number
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

      // Sum defect rates (calculate manually if not present)
      const totalDefectRate = itemReports.reduce((sum, r) => {
        if (r.performance_insights?.supplier_performance?.current_lot_defect_rate_percent) {
          return sum + r.performance_insights.supplier_performance.current_lot_defect_rate_percent;
        }
        // Fallback calculation
        const defectCount = r.lot_assessment.defect_summary.reduce((acc, d) => acc + d.count, 0);
        const totalItems = r.lot_assessment.total_items_inspected || 1;
        const rate = (defectCount / totalItems) * 100;
        return sum + rate;
      }, 0);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'main' | 'accepted' | 'rejected' | 'accepted_front' | 'accepted_back' | 'reference_front' | 'reference_back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;

        if (target === 'main') {
          setEditForm(prev => prev ? ({ ...prev, reference_image_url: result }) : null);
        } else if (target === 'reference_front') {
          setEditForm(prev => prev ? ({ ...prev, reference_image_front_url: result }) : null);
        } else if (target === 'reference_back') {
          setEditForm(prev => prev ? ({ ...prev, reference_image_back_url: result }) : null);
        } else if (target === 'accepted_front') {
          setEditForm(prev => {
            if (!prev) return null;
            return {
              ...prev,
              standard_images: {
                ...prev.standard_images,
                accepted: prev.standard_images?.accepted || [],
                rejected: prev.standard_images?.rejected || [],
                accepted_front: result
              }
            };
          });
        } else if (target === 'accepted_back') {
          setEditForm(prev => {
            if (!prev) return null;
            return {
              ...prev,
              standard_images: {
                ...prev.standard_images,
                accepted: prev.standard_images?.accepted || [],
                rejected: prev.standard_images?.rejected || [],
                accepted_back: result
              }
            };
          });
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
              <Shirt className="w-6 h-6 text-blue-600" />
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
                      <span className="text-sm font-medium flex items-center gap-1"><Tag className="w-3 h-3 text-green-600" /> Finished Garment</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="item_type"
                        checked={editForm.item_type === 'buy'}
                        onChange={() => setEditForm({ ...editForm, item_type: 'buy' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium flex items-center gap-1"><ShoppingBag className="w-3 h-3 text-orange-600" /> Fabric / Trim</span>
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
                    placeholder="e.g. Cotton Crew Neck T-Shirt"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Style No / SKU</label>
                    <input
                      type="text"
                      value={editForm.code}
                      onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. SH-2024-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">UOM</label>
                    <input
                      type="text"
                      value={editForm.uom || ''}
                      onChange={e => setEditForm({ ...editForm, uom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. pcs, m, yds"
                    />
                  </div>
                </div>

                {/* Dimensions Field - Conditional based on item type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    {editForm.item_type === 'buy' ? 'Width (inch) × Length (m)' : 'Size Range'}
                  </label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editForm.dimensions || ''}
                      onChange={e => setEditForm({ ...editForm, dimensions: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={editForm.item_type === 'buy' ? 'e.g. 58" × 100m' : 'e.g. S - XXL'}
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
                    <option value="Tops">Tops</option>
                    <option value="Bottoms">Bottoms</option>
                    <option value="Outerwear">Outerwear</option>
                    <option value="Dresses">Dresses</option>
                    <option value="Fabric - Knits">Fabric - Knits</option>
                    <option value="Fabric - Wovens">Fabric - Wovens</option>
                    <option value="Trims">Trims</option>
                    <option value="Accessories">Accessories</option>
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

                {/* Main Reference Image (Style Reference) - Optional */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Style Reference Image <span className="font-normal text-gray-400">(Optional)</span>
                  </label>

                  {editForm.reference_image_url ? (
                    <div className="relative h-32 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={editForm.reference_image_url} alt="Reference" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 hidden">
                        <Shirt className="w-8 h-8" />
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
                            onClick={() => setEditForm({ ...editForm, reference_image_url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=300' })}
                            className="h-20 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition overflow-hidden bg-gray-50"
                          >
                            <img
                              src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=300"
                              alt="Cotton Shirt"
                              className="w-full h-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, reference_image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=300' })}
                            className="h-20 rounded-lg border-2 border-gray-200 hover:border-blue-500 transition overflow-hidden bg-gray-50"
                          >
                            <img
                              src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=300"
                              alt="Fabric Roll"
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

                {/* Visual Standards - Conditional based on Item Type */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <ImagePlus className="w-4 h-4 text-blue-600" />
                    Visual Standards (Analysis Context)
                  </label>

                  {/* Finished Garment: Front/Back images */}
                  {editForm.item_type === 'sell' ? (
                    <div className="space-y-4">
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-100">
                        <strong>Finished Garment:</strong> Upload both front and back acceptable reference images for complete quality comparison.
                      </p>

                      {/* Acceptable Front/Back */}
                      <div>
                        <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" /> ACCEPTABLE - Front & Back
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Front Image */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Front View</span>
                            {editForm.standard_images?.accepted_front ? (
                              <div className="relative aspect-square bg-white border-2 border-green-300 rounded-lg overflow-hidden group shadow-sm">
                                <img src={editForm.standard_images.accepted_front} alt="Front Acceptable" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => setEditForm(prev => prev ? ({
                                    ...prev,
                                    standard_images: { ...prev.standard_images, accepted: prev.standard_images?.accepted || [], rejected: prev.standard_images?.rejected || [], accepted_front: undefined }
                                  }) : null)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[10px] py-1 text-center font-bold">FRONT</div>
                              </div>
                            ) : (
                              <label className="aspect-square flex flex-col items-center justify-center border-2 border-green-300 border-dashed rounded-lg bg-green-50/50 hover:bg-green-100 cursor-pointer transition">
                                <Plus className="w-5 h-5 text-green-600" />
                                <span className="text-[10px] text-green-600 font-medium mt-1">Add Front</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'accepted_front')} />
                              </label>
                            )}
                          </div>

                          {/* Back Image */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Back View</span>
                            {editForm.standard_images?.accepted_back ? (
                              <div className="relative aspect-square bg-white border-2 border-green-300 rounded-lg overflow-hidden group shadow-sm">
                                <img src={editForm.standard_images.accepted_back} alt="Back Acceptable" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => setEditForm(prev => prev ? ({
                                    ...prev,
                                    standard_images: { ...prev.standard_images, accepted: prev.standard_images?.accepted || [], rejected: prev.standard_images?.rejected || [], accepted_back: undefined }
                                  }) : null)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-green-600/80 text-white text-[10px] py-1 text-center font-bold">BACK</div>
                              </div>
                            ) : (
                              <label className="aspect-square flex flex-col items-center justify-center border-2 border-green-300 border-dashed rounded-lg bg-green-50/50 hover:bg-green-100 cursor-pointer transition">
                                <Plus className="w-5 h-5 text-green-600" />
                                <span className="text-[10px] text-green-600 font-medium mt-1">Add Back</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'accepted_back')} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rejected Images - Standard */}
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
                  ) : (
                    /* Fabric/Trim Items: Standard single images */
                    <div className="space-y-4">
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-100">
                        <strong>Fabric/Trim Item:</strong> Upload up to 2 acceptable reference images (front view only).
                      </p>

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
                  )}
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
                      placeholder="Add new check (e.g. Check stitching)"
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
                  <Shirt className="w-12 h-12" />
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
                    <span className="bg-white/90 text-gray-700 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wide border border-gray-200">
                      {item.uom}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-grow">
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{item.code}</p>
                </div>

                {/* Stats (if available) - Improved Layout */}
                {stats && (
                  <div className="mt-auto pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Defect Rate</span>
                      <span className={`font-bold ${stats.avgDefectRate > 5 ? 'text-red-500' : 'text-green-600'}`}>
                        {stats.avgDefectRate.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Total Inspections</span>
                      <span className="font-bold text-gray-700">{stats.total}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg transition"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};