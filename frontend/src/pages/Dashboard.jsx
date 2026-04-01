import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Dashboard() {
    const [file, setFile] = useState(null);
    const [plants, setPlants] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState('');
    const [selectedAggregate, setSelectedAggregate] = useState('');
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Fetch plants/aggregates for the manual override dropdowns
    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const { data } = await api.get('/plants');
            setPlants(data);
        } catch (err) {
            console.error('Failed to fetch plants', err);
        }
    };

    const processSelectedFile = (selectedFile) => {
        setFile(selectedFile);
        setResults(null);
        setError('');

        // Auto-detection logic (Frontend side)
        if (plants.length > 0) {
            let detPlant = plants[0];

            for (const p of plants) {
                const shortName = p.name.replace('CTE ', '').toLowerCase();
                if (selectedFile.name.toLowerCase().includes(shortName) ||
                    selectedFile.name.toLowerCase().includes(p.name.toLowerCase())) {
                    detPlant = p;
                    break;
                }
            }

            setSelectedPlant(detPlant.id);

            if (detPlant.aggregates && detPlant.aggregates.length > 0) {
                let detAgg = detPlant.aggregates[0];
                for (const agg of detPlant.aggregates) {
                    if (selectedFile.name.toLowerCase().includes(agg.name.toLowerCase())) {
                        detAgg = agg;
                        break;
                    }
                }
                setSelectedAggregate(detAgg.id);
            } else {
                setSelectedAggregate('');
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            processSelectedFile(e.target.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async (type = 'excel') => {
        if (!file) {
            setError('Vă rugăm să selectați un fișier mai întâi.');
            return;
        }

        if (!selectedAggregate) {
            setError('Selectați un agregat valabil pentru a prelua limitele (Setări).');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('excelFile', file);
        formData.append('manualAggregateId', selectedAggregate);
        formData.append('verificationType', type);

        try {
            const response = await api.post('/reports/verify', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResults(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'A apărut o eroare la procesarea fișierului.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportXlsx = async () => {
        if (!file) {
            setError('Vă rugăm să selectați un fișier mai întâi.');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('excelFile', file);

        try {
            const response = await api.post('/reports/export', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                responseType: 'blob' // Important pentru download fisier binar
            });

            // Generare link temporar pentru declansarea descarcarii din browser
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Formatam un nume corect
            let exportName = file.name;
            if (exportName.toLowerCase().endsWith('.xlsm')) {
                exportName = exportName.substring(0, exportName.length - 5) + '.xlsx';
            } else if (!exportName.toLowerCase().endsWith('.xlsx')) {
                exportName += '.xlsx';
            }
            
            exportName = exportName.replace('.xlsx', '_Curatat.xlsx');
            
            link.setAttribute('download', exportName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

        } catch (err) {
            setError('A apărut o eroare la exportarea și curățarea fișierului.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLimit = (noxa, value) => {
        if (!results) return;
        setResults({
            ...results,
            activeLimits: {
                ...results.activeLimits,
                [noxa]: Number(value)
            }
        });
    };

    const saveLimitsFromDashboard = async () => {
        if (!selectedAggregate || !results?.activeLimits) return;
        try {
            await api.put(`/aggregates/${selectedAggregate}/limits`, { limits: results.activeLimits });
            alert('Limitele au fost actualizate cu succes!');
            // Re-fetch plants to keep the global state in sync if needed
            fetchPlants();
        } catch (err) {
            alert('Eroare la salvare: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSaveToHistory = async () => {
        if (!results || !file || !selectedAggregate || !selectedPlant) return;

        const month = window.prompt("Introduceți luna și anul pentru acest raport (ex: Ianuarie 2026):");
        if (!month) return; // user cancelled prompt

        try {
            await api.post('/reports/history', {
                plantId: selectedPlant,
                aggregateId: selectedAggregate,
                reportMonth: month,
                fileName: file.name,
                exceedances: results.exceedances || [],
                discrepancies: results.discrepancies || [],
                siteMismatches: results.siteMismatches || [],
                downtimeRecords: results.downtimeRecords || [],
                activeLimits: results.activeLimits || {}
            });
            alert('Raportul a fost salvat cu succes în istoric!');
        } catch (err) {
            alert('Eroare: ' + (err.response?.data?.message || err.message));
        }
    };

    // Derived state for dropdowns
    const currentPlantObj = plants.find(p => p.id === selectedPlant);
    const currentAggregates = currentPlantObj?.aggregates || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        📊 Verificare Raportare Emisii
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Încărcați fișierul Excel de Mediu. Sistemul va încerca să detecteze automat centrala și agregatul din nume, dar le puteți ajusta manual dacă denumirea din Excel este atipică.
                    </p>
                </div>
            </div>

            {/* File Upload Section */}
            <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-8 border border-gray-200">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Upload document (.xlsx, .xls, .xlsm)
                        </label>
                        <div 
                            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                        <span>Incarca un fisier</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx, .xls, .xlsm" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">Excel pana in 10MB</p>
                            </div>
                        </div>
                        {file && (
                            <p className="mt-2 text-sm text-blue-600 font-medium flex items-center">
                                📂 Detectat: {file.name}
                            </p>
                        )}
                    </div>

                    {/* Context Confirmation */}
                    {file && (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mt-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span title="💡">💡</span>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800">
                                        Verifică dacă detectarea este corectă
                                    </h3>
                                    <div className="mt-2 text-sm text-blue-700 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">

                                        <div>
                                            <label className="block text-xs font-medium text-blue-800">Confirmă Centrala evaluată:</label>
                                            <select
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                                                value={selectedPlant}
                                                onChange={(e) => {
                                                    setSelectedPlant(e.target.value);
                                                    const newPlant = plants.find(p => p.id === e.target.value);
                                                    setSelectedAggregate(newPlant?.aggregates?.[0]?.id || '');
                                                }}
                                            >
                                                {plants.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-blue-800">Confirmă Agregatul evaluat:</label>
                                            <select
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                                                value={selectedAggregate}
                                                onChange={(e) => setSelectedAggregate(e.target.value)}
                                            >
                                                {currentAggregates.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                                {currentAggregates.length === 0 && (
                                                    <option value="">Niciun agregat configurat</option>
                                                )}
                                            </select>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                            A apărut o eroare: {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => handleUpload('excel')}
                            disabled={loading || !file || !selectedAggregate}
                            className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? 'Se procesează...' : 'Execută Verificarea Excel'}
                        </button>
                        <button
                            onClick={() => handleUpload('site')}
                            disabled={loading || !file || !selectedAggregate}
                            className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? 'Se procesează...' : '🌐 Execută Verificarea Site ELCEN'}
                        </button>
                    </div>

                    {/* Export Clean XLSX */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                        <button
                            onClick={handleExportXlsx}
                            disabled={loading || !file}
                            className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-800 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            title="Descarca macheta actuala ca un fisier .xlsx normal, fara macro-uri sau butoane de comanda."
                        >
                            ⬇️ Descarcă Raport Curățat (.xlsx)
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {results && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                    <div className={`px-4 py-5 sm:px-6 border-b ${results.isEmptySheet ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                        <h3 className={`text-lg leading-6 font-medium ${results.isEmptySheet ? 'text-orange-900' : 'text-green-900'}`}>
                            {results.isEmptySheet ? '⚠️ Tab Fără Date' : '✅ Verificare Completă'}
                        </h3>
                        <p className={`mt-1 max-w-2xl text-sm ${results.isEmptySheet ? 'text-orange-800' : 'text-green-800'}`}>
                            Fișier analizat cu succes. Tab-ul (Sheet) evaluat automat a fost: <span className="font-bold bg-white/50 px-1 rounded">"{results.evaluatedSheet}"</span>
                        </p>
                    </div>

                    <div className="px-4 py-5 sm:p-6">

                        {results.isEmptySheet ? (
                            <div className="bg-orange-100 text-orange-800 p-6 rounded-md flex flex-col items-center justify-center text-center">
                                <span className="text-4xl mb-4" title="📭">📭</span>
                                <h4 className="text-lg font-bold mb-2">Nu s-au găsit date de emisii</h4>
                                <p className="max-w-md">Pentru acest agregat nu au fost completate date de emisii în tab-ul evaluat. Agregatul a fost probabil oprit pe toată durata lunii sau denumirea coloanelor nu corespunde formatului așteptat.</p>
                            </div>
                        ) : (
                            <>

                                {results.verificationType === 'excel' && (
                                    <>
                                        <h4 className="text-md font-medium text-gray-900 mb-4 border-t pt-4">Verificări Alerte - Valori și Medii (Excel)</h4>

                                        {results.exceedances.length > 0 ? (
                                            <div className="space-y-3 mb-6">
                                                {results.exceedances.map((exc, idx) => (
                                                    <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded flex">
                                                        <div className="flex-shrink-0">
                                                            <span title="⚠️">⚠️</span>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-yellow-800" dangerouslySetInnerHTML={{ __html: exc.replace(/\*\*/g, '<b>') }}></p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 text-green-800 p-4 rounded flex items-center mb-6">
                                                ✅ Nicio valoare (orară sau medie zilnică) NU a depășit grila de limitări din configurare.
                                            </div>
                                        )}

                                        <h4 className="text-md font-medium text-gray-900 mb-4 border-t pt-4">Verificare Acuratețe - Calcul Medii Zilnice</h4>

                                        {results.discrepancies && results.discrepancies.length > 0 ? (
                                            <div className="space-y-3 mb-6">
                                                {results.discrepancies.map((disc, idx) => (
                                                    <div key={`disc-${idx}`} className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded flex">
                                                        <div className="flex-shrink-0">
                                                            <span title="📉">📉</span>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-orange-800" dangerouslySetInnerHTML={{ __html: disc.replace(/\*\*/g, '<b>') }}></p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 text-green-800 p-4 rounded flex items-center mb-6">
                                                ✅ Mediile matematice zilnice raportate (tabelul 2) corespund exact cu mediile calculate din valorile orare.
                                            </div>
                                        )}

                                        {results.downtimeRecords && results.downtimeRecords.length > 0 && (
                                            <div className="mb-6 border-t pt-4">
                                                <h4 className="text-md font-medium text-gray-900 mb-4">Monitorizare Nefuncționare (Lipsă Date)</h4>
                                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <span title="ℹ️">ℹ️</span>
                                                        </div>
                                                        <div className="ml-3 w-full">
                                                            <p className="text-sm text-blue-800 font-medium">
                                                                Agregatul a înregistrat {results.downtimeRecords.length} ore de nefuncționare (fără nicio o valoare raportată) pe parcursul lunii.
                                                            </p>
                                                            <details className="mt-2 text-sm text-blue-700 cursor-pointer">
                                                                <summary className="font-medium outline-none hover:text-blue-900">
                                                                    Vezi detaliile și perioadele {results.downtimeRecords.length > 50 ? "(afișând primele 50)" : ""}
                                                                </summary>
                                                                <div className="mt-2 bg-white/50 p-2 rounded max-h-48 overflow-y-auto">
                                                                    <ul className="list-disc pl-5 space-y-1">
                                                                        {results.downtimeRecords.slice(0, 50).map((record, idx) => (
                                                                            <li key={`downtime-${idx}`} dangerouslySetInnerHTML={{ __html: record.replace(/\*\*/g, '<b>') }}></li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {results.verificationType === 'site' && (
                                    <>
                                        <h4 className="text-md font-medium text-gray-900 mb-4 border-t pt-4">🌐 Verificare Site Public (ELCEN)</h4>

                                        {results.siteMismatches && results.siteMismatches.length > 0 ? (
                                            <div className="space-y-3 mb-6">
                                                {results.siteMismatches.map((mismatch, idx) => (
                                                    <div key={`mism-${idx}`} className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex">
                                                        <div className="flex-shrink-0">
                                                            <span title="🌍">🌍</span>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm text-red-800" dangerouslySetInnerHTML={{ __html: mismatch.replace(/\*\*/g, '<b>') }}></p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-blue-50 text-blue-800 p-4 rounded flex items-center mb-6">
                                                🌐 Toate mediile zilnice evaluate corespund EXACT cu datele raportate public pe site-ul ELCEN pentru centrala curentă.
                                            </div>
                                        )}
                                    </>
                                )}
                            </> // Inchidere Fragment isEmptySheet
                        )}

                        {!results.isEmptySheet && (
                            <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 border border-gray-200 rounded">
                                <span className="text-sm text-gray-700">
                                    Validarea s-a încheiat.<br /> Dacă sunteți de acord cu rezultatele, puteți arhiva raportul în baza de date pentru consultare viitoare.
                                </span>
                                <button
                                    onClick={handleSaveToHistory}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    💾 Salvează în Istoric
                                </button>
                            </div>
                        )}

                        <details className="mt-6 border border-gray-200 rounded p-4 text-sm text-gray-600 bg-gray-50 cursor-pointer">
                            <summary className="font-medium text-gray-800 outline-none">
                                Vezi limitele (Referință) folosite la evaluare
                            </summary>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Object.entries(results.activeLimits || {})
                                    .sort(([keyA], [keyB]) => {
                                        const order = ['SO2', 'Nox', 'Pulberi', 'CO', 'O2', 'Umiditate mas', 'Temperatura', 'Presiune'];
                                        let idxA = order.indexOf(keyA);
                                        let idxB = order.indexOf(keyB);
                                        if (idxA === -1) idxA = 999;
                                        if (idxB === -1) idxB = 999;
                                        return idxA - idxB;
                                    })
                                    .map(([key, val]) => (
                                        <div key={key} className="bg-white p-2 rounded border border-gray-200 text-center flex flex-col items-center">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">{key}</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={val}
                                                onChange={(e) => handleUpdateLimit(key, e.target.value)}
                                                className="block w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-1 px-2 border"
                                            />
                                        </div>
                                    ))}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={saveLimitsFromDashboard}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    💾 Salvează noile limite
                                </button>
                            </div>
                        </details>

                    </div>
                </div>
            )}

        </div>
    );
}
