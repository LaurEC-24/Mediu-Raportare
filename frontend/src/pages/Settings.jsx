import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trash2, Plus } from 'lucide-react';

export default function Settings() {
    const [plants, setPlants] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState('');
    const [selectedAggregate, setSelectedAggregate] = useState('');

    // Create state
    const [newPlantName, setNewPlantName] = useState('');
    const [newAggregateName, setNewAggregateName] = useState('');

    // Limits internal state (for editing)
    const [currentLimits, setCurrentLimits] = useState({});

    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const { data } = await api.get('/plants');
            setPlants(data);

            // Auto-select if empty and data exists
            if (data.length > 0 && !selectedPlant) {
                setSelectedPlant(data[0].id);
                if (data[0].aggregates?.length > 0) {
                    setSelectedAggregate(data[0].aggregates[0].id);
                    setCurrentLimits(data[0].aggregates[0].limits);
                }
            } else if (selectedPlant) {
                // Keep selection and re-sync limits
                const existingPlant = data.find(p => p.id === selectedPlant);
                if (existingPlant && existingPlant.aggregates.length > 0) {
                    const existingAgg = existingPlant.aggregates.find(a => a.id === selectedAggregate) || existingPlant.aggregates[0];
                    setSelectedAggregate(existingAgg.id);
                    setCurrentLimits(existingAgg.limits);
                } else {
                    setSelectedAggregate('');
                    setCurrentLimits({});
                }
            }
        } catch (err) {
            console.error('Failed to fetch plants', err);
        }
    };

    const handlePlantChange = (e) => {
        const pId = e.target.value;
        setSelectedPlant(pId);
        const plantObj = plants.find(p => p.id === pId);

        if (plantObj?.aggregates?.length > 0) {
            setSelectedAggregate(plantObj.aggregates[0].id);
            setCurrentLimits(plantObj.aggregates[0].limits);
        } else {
            setSelectedAggregate('');
            setCurrentLimits({});
        }
    };

    const handleAggregateChange = (e) => {
        const aId = e.target.value;
        setSelectedAggregate(aId);

        const plantObj = plants.find(p => p.id === selectedPlant);
        const aggObj = plantObj?.aggregates?.find(a => a.id === aId);

        if (aggObj) {
            setCurrentLimits(aggObj.limits);
        }
    };

    const handleLimitChange = (noxa, value) => {
        setCurrentLimits(prev => ({
            ...prev,
            [noxa]: Number(value)
        }));
    };

    const handleToggleParameter = (noxa) => {
        setCurrentLimits(prev => {
            const newLimits = { ...prev };
            if (newLimits.hasOwnProperty(noxa)) {
                // Remove parameter from being evaluated
                delete newLimits[noxa];
            } else {
                // Add parameter with a default value
                newLimits[noxa] = 0;
            }
            return newLimits;
        });
    };

    const ALL_PARAMETERS = ['SO2', 'Nox', 'Pulberi', 'CO', 'O2', 'Umiditate mas', 'Temperatura', 'Presiune'];

    const saveLimits = async () => {
        try {
            await api.put(`/aggregates/${selectedAggregate}/limits`, { limits: currentLimits });
            alert('Limitele au fost salvate cu succes!');
            fetchPlants(); // Reload
        } catch (err) {
            alert('Eroare la salvare: ' + (err.response?.data?.message || err.message));
        }
    };

    // CREATE Plant
    const handleCreatePlant = async () => {
        if (!newPlantName) return;
        try {
            const res = await api.post('/plants', { name: newPlantName });
            setNewPlantName('');
            await fetchPlants();
            setSelectedPlant(res.data.id);
        } catch (err) {
            alert('Eroare: ' + (err.response?.data?.message || err.message));
        }
    };

    // CREATE Aggregate
    const handleCreateAggregate = async () => {
        if (!newAggregateName || !selectedPlant) return;
        try {
            const res = await api.post(`/plants/${selectedPlant}/aggregates`, { name: newAggregateName });
            setNewAggregateName('');
            await fetchPlants();
            setSelectedAggregate(res.data.id);
        } catch (err) {
            alert('Eroare: ' + (err.response?.data?.message || err.message));
        }
    }

    // DELETE Plant
    const handleDeletePlant = async () => {
        if (!selectedPlant) return;
        const confirm = window.confirm("Sigur doriti sa stergeti ACEASTA CENTRALA si toate agregatele asociate?");
        if (confirm) {
            try {
                await api.delete(`/plants/${selectedPlant}`);
                setSelectedPlant('');
                setSelectedAggregate('');
                setCurrentLimits({});
                fetchPlants();
            } catch (err) {
                alert('Eroare la stergere centrala: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    // DELETE Aggregate
    const handleDeleteAggregate = async () => {
        if (!selectedAggregate) return;
        const confirm = window.confirm("Sigur doriti sa stergeti acest agregat?");
        if (confirm) {
            try {
                await api.delete(`/aggregates/${selectedAggregate}`);
                setSelectedAggregate('');
                setCurrentLimits({});
                fetchPlants();
            } catch (err) {
                alert('Eroare la stergere');
            }
        }
    };

    const currentPlantObj = plants.find(p => p.id === selectedPlant);
    const currentAggregates = currentPlantObj?.aggregates || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        ⚙️ Setări Limite Generale (Centrale și Agregate)
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Structura a fost modernizată: limitele sunt atașate strict de Centrală și de Agregat.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Structural Management */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Plant Selection */}
                    <div className="bg-white shadow sm:rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">1. Gestiune Centrală</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selectează Centrala</label>
                                <select
                                    value={selectedPlant}
                                    onChange={handlePlantChange}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border"
                                >
                                    {plants.length === 0 && <option value="">--- Fara Date ---</option>}
                                    {plants.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedPlant && (
                                <div className="pt-2">
                                    <button onClick={handleDeletePlant} className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded text-red-700 bg-red-50 hover:bg-red-100">
                                        <Trash2 className="w-4 h-4 mr-2" /> Șterge Centrala Curentă
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-xs text-gray-500 mb-1">Adaugă Centrală Nouă</label>
                                <div className="flex space-x-2">
                                    <input type="text" value={newPlantName} onChange={(e) => setNewPlantName(e.target.value)} placeholder="Centrala X..." className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-2 border" />
                                    <button onClick={handleCreatePlant} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700">
                                        <Plus className="w-4 h-4 mr-1" /> Adaugă
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Aggregate Selection */}
                    <div className="bg-white shadow sm:rounded-lg p-6 border border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">2. Gestiune Agregat</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Selectează Agregatul</label>
                                <select
                                    value={selectedAggregate}
                                    onChange={handleAggregateChange}
                                    disabled={!selectedPlant}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border disabled:bg-gray-100"
                                >
                                    {currentAggregates.length === 0 && <option value="">--- Niciun agregat ---</option>}
                                    {currentAggregates.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedAggregate && (
                                <div className="pt-2">
                                    <button onClick={handleDeleteAggregate} className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded text-red-700 bg-red-50 hover:bg-red-100">
                                        <Trash2 className="w-4 h-4 mr-2" /> Șterge Agregatul Curent
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-xs text-gray-500 mb-1">Adaugă Agregat Nou la Centrală</label>
                                <div className="flex space-x-2">
                                    <input disabled={!selectedPlant} type="text" value={newAggregateName} onChange={(e) => setNewAggregateName(e.target.value)} placeholder="Agregat X..." className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-2 border disabled:bg-gray-100" />
                                    <button disabled={!selectedPlant} onClick={handleCreateAggregate} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                        <Plus className="w-4 h-4 mr-1" /> Adaugă
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column - Limits Editor */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow sm:rounded-lg border border-gray-200 h-full flex flex-col">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Editează Limite
                            </h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Formular de editare doar pentru agregatul curent selectat.
                            </p>
                        </div>

                        <div className="p-6 flex-1">
                            {!selectedAggregate ? (
                                <div className="text-center text-gray-500 py-12">
                                    Selectați sau adăugați un agregat pentru a îi edita limitele.
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {ALL_PARAMETERS.map(noxa => {
                                            const isActive = currentLimits.hasOwnProperty(noxa);
                                            return (
                                                <div key={noxa} className={`p-4 rounded-md border ${isActive ? 'bg-white border-blue-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <label className={`text-sm font-semibold flex items-center gap-2 cursor-pointer select-none ${isActive ? 'text-blue-800' : 'text-gray-500'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isActive}
                                                                onChange={() => handleToggleParameter(noxa)}
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                            />
                                                            {noxa}
                                                        </label>
                                                        {isActive ? (
                                                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Activ</span>
                                                        ) : (
                                                            <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Ignorat</span>
                                                        )}
                                                    </div>

                                                    {isActive ? (
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">
                                                                Limită Maximă Admisă
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={currentLimits[noxa]}
                                                                onChange={(e) => handleLimitChange(noxa, e.target.value)}
                                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 border"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-gray-400 italic py-2">
                                                            Acest parametru nu va fi căutat sau evaluat în raportările Excel.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-6 border-t border-gray-200">
                                        <button
                                            onClick={saveLimits}
                                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            💾 Salvează Limitele pentru acest Agregat
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
