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
    MoreHorizontal,
    BarChart3,
    Eye,
    CalendarClock
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
        lines: workStations.filter(w => w.name.toLowerCase().includes('line')).length,
        singles: workStations.filter(w => !w.name.toLowerCase().includes('line')).length
    };

    const handleCreateNew = () => {
        const newStation: WorkStation = {
            id: '',
            name: '',
            code: '',
            description: '',
            is_active: true
        };
        setEditForm(newStation);
        setIsEditing(true);
    };

    const handleEdit = (station: WorkStation) => {
        setEditForm({ ...station });
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this work station?")) {
            await deleteWorkStation(id);
            loadWorkStations();
        }
    };

    const handleSave = async () => {
        if (editForm && editForm.name && editForm.code) {
            const stationToSave = { ...editForm };
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
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Factory className="w-6 h-6 text-blue-600" />
                            {editForm.id ? 'Edit Work Station' : 'New Station'}
                        </h2>
                        <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Station Name</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Line A"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Station Code</label>
                            <input
                                type="text"
                                value={editForm.code}
                                onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. WS-LN-A"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                            <textarea
                                value={editForm.description || ''}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Optional description..."
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active_toggle"
                                checked={editForm.is_active}
                                onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="active_toggle" className="text-sm font-medium text-gray-700">Station Active</label>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!editForm.name || !editForm.code}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                            const isLine = station.name.toLowerCase().includes('line');

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
                                                    // Quick toggle
                                                    saveWorkStation({ ...station, is_active: !station.is_active });
                                                    loadWorkStations();
                                                }}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${station.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-3 mt-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span>Building {Math.floor(Math.random() * 3) + 1}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span>Every {isLine ? '1 hour' : '2 hours'}</span>
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
