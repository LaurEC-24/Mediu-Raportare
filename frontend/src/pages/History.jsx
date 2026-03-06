import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function History() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/history');
            setReports(data);
            setError('');
        } catch (err) {
            setError('Nu s-a putut încărca istoricul rapoartelor.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Ești sigur că vrei să ștergi acest raport din istoric? Această acțiune este ireversibilă.')) return;
        try {
            await api.delete(`/reports/history/${id}`);
            setReports(reports.filter(r => r.id !== id));
        } catch (err) {
            alert('Eroare la stergere.');
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-600">Se încarcă istoricul...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate mb-6">
                ⏳ Istoric Raportări Salvate
            </h2>

            {error && <div className="text-red-600 mb-4">{error}</div>}

            {reports.length === 0 ? (
                <div className="bg-white shadow px-4 py-12 sm:rounded-lg text-center text-gray-500 border">
                    Nu există niciun raport salvat în baza de date momentan. Confirmați rapoarte din Dashboard folosind butonul "Salvează în Istoric".
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {reports.map((report) => (
                            <li key={report.id}>
                                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-blue-600 truncate flex items-center">
                                                <FileText className="w-4 h-4 mr-2" />
                                                {report.reportMonth} - {report.plant?.name} ({report.aggregate?.name})
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Fișier Sursă: {report.fileName}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-xs text-gray-500">
                                                {new Date(report.createdAt).toLocaleDateString()}
                                            </span>
                                            <button
                                                onClick={() => toggleExpand(report.id)}
                                                className="text-gray-400 hover:text-blue-600 p-1"
                                                title="Vezi detalii"
                                            >
                                                {expandedId === report.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                                title="Șterge raport"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Obiectul de detalii Extins */}
                                    {expandedId === report.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 gap-4 text-sm bg-gray-50 p-4 rounded text-gray-700">

                                            <div>
                                                <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Depășiri Limite ({report.exceedances?.length || 0})</h4>
                                                {report.exceedances?.length > 0 ? (
                                                    <ul className="list-disc pl-5 space-y-1 text-red-700">
                                                        {report.exceedances.map((ex, i) => <li key={i} dangerouslySetInnerHTML={{ __html: ex.replace(/\*\*/g, '<b>') }} />)}
                                                    </ul>
                                                ) : <span className="text-green-600">Nicio depășire înregistrată.</span>}
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Discrepanțe Medie Zilnică ({report.discrepancies?.length || 0})</h4>
                                                {report.discrepancies?.length > 0 ? (
                                                    <ul className="list-disc pl-5 space-y-1 text-orange-700">
                                                        {report.discrepancies.map((ex, i) => <li key={i} dangerouslySetInnerHTML={{ __html: ex.replace(/\*\*/g, '<b>') }} />)}
                                                    </ul>
                                                ) : <span className="text-green-600">Calculele matematice au fost în regulă.</span>}
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2">Ore de nefuncționare ({report.downtimeRecords?.length || 0})</h4>
                                                {report.downtimeRecords?.length > 0 ? (
                                                    <details className="cursor-pointer text-blue-700">
                                                        <summary className="font-medium outline-none">Afișează detaliat</summary>
                                                        <ul className="list-disc pl-5 pt-2 space-y-1 mt-1 bg-white p-2 border">
                                                            {report.downtimeRecords.slice(0, 50).map((ex, i) => <li key={i} dangerouslySetInnerHTML={{ __html: ex.replace(/\*\*/g, '<b>') }} />)}
                                                            {report.downtimeRecords.length > 50 && <li>...și încă {report.downtimeRecords.length - 50}</li>}
                                                        </ul>
                                                    </details>
                                                ) : <span>Nu s-au înregistrat ruperi de date.</span>}
                                            </div>

                                            {report.siteMismatches?.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 border-b pb-1 mb-2 text-red-800">Alarme Scraper ELCEN</h4>
                                                    <ul className="list-disc pl-5 space-y-1 text-red-700">
                                                        {report.siteMismatches.map((ex, i) => <li key={i} dangerouslySetInnerHTML={{ __html: ex.replace(/\*\*/g, '<b>') }} />)}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="col-span-1 mt-2">
                                                <h4 className="font-semibold text-gray-900 mb-1">Limitele aplicate la momentul evaluării:</h4>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {Object.entries(report.activeLimits || {}).map(([noxa, val]) => (
                                                        <span key={noxa} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            {noxa}: {val}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
