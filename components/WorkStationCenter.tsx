import React, { useState, useEffect, useMemo } from 'react';
import { WorkStation } from '../types';
import {
    Plus,
    Edit2,
    Save,
    X,
    Trash2,
    Factory,
    Search,
    ArrowLeft,
    Wrench,
    Building2,
    Clock,
    MapPin,
    BarChart3,
    Eye,
    CalendarClock,
    LayoutGrid
} from 'lucide-react';
import { getWorkStations, saveWorkStation, deleteWorkStation } from '../services/scheduleService';

interface WorkStationCenterProps {
    onBack: () => void;
}

export const WorkStationCenter: React.FC<WorkStationCenterProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<'stations' | 'shifts'>('stations');
    const [workStations, setWorkStations] = useState<WorkStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<WorkStation | null>(null);

    // Load workstations on mount
    useEffect(() => {
        loadWorkStations();
    }, []);

    const loadWorkStations = async () => {
        setIsLoading(true);
        const data = await getWorkStations();
        setWorkStations(data);
        setIsLoading(false);
    };

    const filteredStations = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return workStations.filter(ws =>
            ws.name.toLowerCase().includes(term) ||
            ws.code.toLowerCase().includes(term)
        );
    }, [workStations, searchTerm]);

    const stats = {
        total: workStations.length,
        active: workStations.filter(w => w.is_active).length,
        lines: workStations.filter(w => w.type === 'production_line' || w.name.toLowerCase().includes('line')).length,
        singles: workStations.filter(w => w.type === 'workstation' || (!w.name.toLowerCase().includes('line') && !w.type)).length
    };

    const handleCreateNew = () => {
        const newStation: WorkStation = {
            id: '',
            name: '',
            code: '',
            description: '',
            is_active: true,
            type: 'production_line',
            location: '',
            frequency: '1h'
        };
        setEditForm(newStation);
        setIsEditing(true);
    };

    const handleEdit = (station: WorkStation) => {
        setEditForm({
            ...station,
            type: station.type || (station.name.toLowerCase().includes('line') ? 'production_line' : 'workstation'),
            frequency: station.frequency || '1h',
            location: station.location || 'Building 1'
        });
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this work station?")) {
            await deleteWorkStation(id);
            loadWorkStations();
        }
    };

    const handleSave = async () => {
        if (editForm && editForm.name) {
            const stationToSave = { ...editForm };

            // Auto-generate code if missing
            if (!stationToSave.code) {
                stationToSave.code = stationToSave.name.toUpperCase().replace(/\s+/g, '-');
            }

            if (!stationToSave.id) {
                stationToSave.id = `ws-${Date.now()}`;
            }

            const success = await saveWorkStation(stationToSave);
            if (success) {
                setIsEditing(false);
                setEditForm(null);
                loadWorkStations();
            } else {
                alert('Failed to save work station');
            }
        }
    };

    const renderEditModal = () => {
        if (!isEditing || !editForm) return null;

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-blue-600" />
                            {editForm.id ? 'Edit Station' : 'New Station'}
                        </h2>
                        <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Station Name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">
                                Station Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-400 text-sm"
                                placeholder="e.g., Line A or WS-01"
                                autoFocus
                            />
                        </div>

                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-2">Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, type: 'production_line' })}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all border ${editForm.type === 'production_line'
                                            ? 'bg-gray-100 text-gray-900 border-gray-200'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        } ${
                                        // Specific styling to match screenshot: Left one looks selected in screenshot design style?
                                        // Actually screenshot shows 'Workstation' selected (Blue) and 'Production Line' unselected.
                                        // I'll invert logic to match generic "Active = Blue"
                                        editForm.type === 'production_line' ? '' : ''
                                        }`}
                                    style={editForm.type === 'production_line' ? { backgroundColor: '#f3f4f6', borderColor: 'transparent' } : {}}
                                >
                                    <Factory className="w-4 h-4" />
                                    Production Line
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, type: 'workstation' })}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all border ${editForm.type === 'workstation'
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <Wrench className="w-4 h-4" />
                                    Workstation
                                </button>
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={editForm.location || ''}
                                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder-gray-400 text-sm"
                                    placeholder="e.g., Building 1"
                                />
                            </div>
                        </div>

                        {/* Inspection Frequency */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">Inspection Frequency</label>
                            <div className="relative">
                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={editForm.frequency || '1h'}
                                    onChange={e => setEditForm({ ...editForm, frequency: e.target.value })}
                                    className="w-full pl-10 pr-8 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition text-sm font-medium text-gray-700"
                                >
                                    <option value="30m">Every 30 Minutes</option>
                                    <option value="1h">Every 1 Hour</option>
                                    <option value="2h">Every 2 Hours</option>
                                    <option value="4h">Every 4 Hours</option>
                                    <option value="shift">Once per Shift</option>
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-bold text-sm transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!editForm.name}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md hover:shadow-lg transition transform active:scale-95 disabled:opacity-50 disabled:transform-none"
                        >
                            <Save className="w-4 h-4" />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fadeIn p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Work Stations & Shifts</h1>
                        <p className="text-gray-500 font-medium mt-1">Manage stations and shift timings</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 font-bold flex items-center gap-2 transition hover:bg-pink-100">
                        <Eye className="w-5 h-5" />
                    </button>
                    <button className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold flex items-center gap-2 transition hover:bg-indigo-100">
                        <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Station
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('stations')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm border ${activeTab === 'stations'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                >
                    <Factory className="w-5 h-5" />
                    Stations ({workStations.length})
                </button>
                <button
                    onClick={() => setActiveTab('shifts')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm border ${activeTab === 'shifts'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        }`}
                >
                    <CalendarClock className="w-5 h-5" />
                    Shifts (3)
                </button>
            </div>

            {activeTab === 'stations' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl shadow-sm">
                            <h3 className="text-4xl font-bold text-blue-700 mb-1">{stats.total}</h3>
                            <p className="text-sm font-bold text-blue-600">Total Stations</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 p-5 rounded-xl shadow-sm">
                            <h3 className="text-4xl font-bold text-green-700 mb-1">{stats.active}</h3>
                            <p className="text-sm font-bold text-green-600">Active</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 p-5 rounded-xl shadow-sm">
                            <h3 className="text-4xl font-bold text-purple-700 mb-1">{stats.lines}</h3>
                            <p className="text-sm font-bold text-purple-600">Production Lines</p>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl shadow-sm">
                            <h3 className="text-4xl font-bold text-orange-700 mb-1">{stats.singles}</h3>
                            <p className="text-sm font-bold text-orange-600">Workstations</p>
                        </div>
                    </div>

                    {/* Stations Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            <div className="col-span-full py-20 flex justify-center text-gray-400">Loading...</div>
                        ) : filteredStations.map((station) => {
                            const isLine = station.type === 'production_line' || (!station.type && station.name.toLowerCase().includes('line'));

                            return (
                                <div key={station.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-xl ${isLine ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {isLine ? <Factory className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">{station.name}</h3>
                                                    <p className="text-xs text-gray-500">{isLine ? 'Production Line' : 'Workstation'}</p>
                                                </div>
                                            </div>

                                            {/* Toggle Switch */}
                                            <div
                                                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${station.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                                                onClick={() => {
                                                    saveWorkStation({ ...station, is_active: !station.is_active });
                                                    loadWorkStations();
                                                }}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${station.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-3 mt-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin className="w-4 h-4 text-gray-400" />
                                                <span>{station.location || 'Building 1'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span>{
                                                    station.frequency === '30m' ? 'Every 30 Minutes' :
                                                        station.frequency === '2h' ? 'Every 2 Hours' :
                                                            station.frequency === '4h' ? 'Every 4 Hours' :
                                                                station.frequency === 'shift' ? 'Once per Shift' :
                                                                    'Every 1 hour'
                                                }</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3 bg-gray-50/50 rounded-b-xl">
                                        <button
                                            onClick={() => handleEdit(station)}
                                            className="flex-1 py-2 text-sm font-semibold text-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-transparent"
                                        >
                                            <Edit2 className="w-4 h-4 inline-block mr-2" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(station.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {activeTab === 'shifts' && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                    <CalendarClock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-bold text-gray-900">Shift Configuration</h3>
                    <p className="mt-2">Morning (06:00 - 14:00) • Afternoon (14:00 - 22:00) • Night (22:00 - 06:00)</p>
                    <p className="text-sm text-gray-400 mt-1">Global shift settings can be configured in admin panel.</p>
                </div>
            )}

            {renderEditModal()}
        </div>
    );
};
