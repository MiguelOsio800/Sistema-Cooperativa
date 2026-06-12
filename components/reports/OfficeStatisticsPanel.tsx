import React, { useState, useEffect } from 'react';
import { XIcon, BuildingOfficeIcon, BanknotesIcon, DocumentTextIcon, BarChartIcon } from '../icons/Icons';
import { apiFetch } from '../../utils/api';
import CurrencyDisplay from '../ui/CurrencyDisplay';

interface OfficeStatistic {
    id: string;
    name: string;
    stats: {
        totalInvoices: number;
        totalExpenses: number;
        revenue: number;
    };
}

interface OfficeStatisticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const OfficeStatisticsPanel: React.FC<OfficeStatisticsPanelProps> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<OfficeStatistic[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setIsLoading(true);
        setError(null);

        const fetchStatistics = async () => {
            try {
                // Fetch to endpoint /api/offices/statistics
                const response = await apiFetch<OfficeStatistic[]>('/offices/statistics', { method: 'GET' });
                if (isMounted) {
                    setData(response || []);
                    setIsLoading(false);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError('Error al obtener estadísticas de las oficinas. ' + (err.message || ''));
                    setIsLoading(false);
                }
            }
        };

        fetchStatistics();

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 overflow-hidden z-50">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Slide-over panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex">
                <div className="w-screen max-w-md transform transition-transform ease-in-out duration-300 translate-x-0 bg-white dark:bg-gray-800 shadow-xl flex flex-col">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                                <BarChartIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Estadísticas por Oficina
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex flex-col justify-center items-center h-full space-y-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                <p className="text-gray-500 dark:text-gray-400">Cargando estadísticas...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="font-medium">Ha ocurrido un error</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        ) : data.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No hay datos estadísticos disponibles.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {data.map((office) => (
                                    <div key={office.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                            <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                                            {office.name}
                                        </h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                    <DocumentTextIcon className="w-4 h-4" /> Facturas Totales
                                                </p>
                                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                    {office.stats.totalInvoices}
                                                </p>
                                            </div>
                                            
                                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                    <BanknotesIcon className="w-4 h-4" /> Gastos Totales
                                                </p>
                                                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                                    <CurrencyDisplay amount={office.stats.totalExpenses} />
                                                </p>
                                            </div>

                                            <div className="col-span-2 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                    <BarChartIcon className="w-4 h-4" /> Ingresos (Revenue)
                                                </p>
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    <CurrencyDisplay amount={office.stats.revenue} />
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfficeStatisticsPanel;
