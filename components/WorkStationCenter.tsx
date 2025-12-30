import React, { useState, useEffect, useMemo } from 'react';
import { WorkStation } from '../types';
import { Plus, Edit2, Save, X, Trash2, Factory, Search, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { getWorkStations, saveWorkStation, deleteWorkStation } from '../services/scheduleService';

interface WorkStationCenterProps {
    onBack: () => void;
}

export const WorkStationCenter: React.FC<WorkStationCenterProps> = ({ onBack }) => {
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

    const handleCreateNew = () => {
        const newStation: WorkStation = {
            id: '', // Will be assigned by backend or logic
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
            loadWorkStations(); // Reload list
        }
    };

    const handleSave = async () => {
        if (editForm && editForm.name && editForm.code) {
            // If creating new, and ID is empty, assign one for mock purpose/backend
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
                            {editForm.id ? 'Edit Work Station' : 'New Work Station'}
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
                                placeholder="e.g. Cutting Line A"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Station Code</label>
                            <input
                                type="text"
                                value={editForm.code}
                                onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. WS-CUT-01"
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

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${editForm.is_active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                            >
                                {editForm.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                <span className="font-bold text-sm">{editForm.is_active ? 'Active' : 'Inactive'}</span>
                            </button>
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
                            Save Station
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fadeIn pb-24">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h1 className="text-2xl font-black text-gray-900">Work Station Center</h1>
                        </div>
                        <p className="text-gray-500 font-medium ml-8">Manage production lines and inspection points</p>
                    </div>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-md transition"
                    >
                        <Plus className="w-5 h-5" />
                        New Station
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mt-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-12 text-center text-gray-500">Loading work stations...</div>
                ) : filteredStations.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                        <Factory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No Work Stations Found</h3>
                        <p className="text-gray-500">Try adjusting your search or create a new station.</p>
                    </div>
                ) : (
                    filteredStations.map(station => (
                        <div key={station.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition group overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <Factory className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${station.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {station.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1">{station.name}</h3>
                                <code className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{station.code}</code>

                                {station.description && (
                                    <p className="mt-4 text-sm text-gray-600 line-clamp-2">{station.description}</p>
                                )}
                            </div>

                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
                                <button
                                    onClick={() => handleEdit(station)}
                                    className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                    <Edit2 className="w-4 h-4" /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(station.id)}
                                    className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {renderEditModal()}
        </div>
    );
};
