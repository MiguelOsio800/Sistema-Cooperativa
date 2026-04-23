
import React, { useState, useMemo } from 'react';
import Card, { CardTitle } from '../ui/Card';
import { Report, Permissions, Invoice, Office, CompanyInfo } from '../../types';
import { FileTextIcon, BuildingOfficeIcon, TruckIcon, BanknotesIcon } from '../icons/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { calculateFinancialDetails } from '../../utils/financials';
import Select from '../ui/Select';

const ReportCard: React.FC<{ report: Report; onSelect: () => void }> = ({ report, onSelect }) => (
    <button
        onClick={onSelect}
        className="text-left p-4 bg-white dark:bg-gray-800/50 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
        <div className="flex items-center">
            <FileTextIcon className="h-6 w-6 mr-4 text-primary-500" />
            <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{report.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ver datos y exportar</p>
            </div>
        </div>
    </button>
);


const ReportsView: React.FC<{ reports: Report[]; invoices: Invoice[]; offices: Office[]; companyInfo: CompanyInfo }> = ({ reports, invoices, offices, companyInfo }) => {
    const { currentUser, hasGlobalAccess } = useAuth();
    const { userPermissions } = useConfig();
    
    const [selectedOfficeId, setSelectedOfficeId] = useState<string>('all');

    const filteredInvoices = useMemo(() => {
        if (selectedOfficeId === 'all') return invoices;
        return invoices.filter(inv => inv.guide.originOfficeId === selectedOfficeId);
    }, [invoices, selectedOfficeId]);

    const stats = useMemo(() => {
        const total = filteredInvoices.reduce((sum, inv) => {
            if (inv.status === 'Anulada') return sum;
            const financials = calculateFinancialDetails(inv.guide, companyInfo);
            return sum + financials.freight;
        }, 0);
        const count = filteredInvoices.filter(inv => inv.status !== 'Anulada').length;
        return { total, count };
    }, [filteredInvoices, companyInfo]);

    const handleReportSelect = (reportId: string) => {
        window.location.hash = `report-detail/${reportId}/${selectedOfficeId}`;
    };

    const allowedReports = reports.filter(report => {
        if (report.id === 'reporte_asociados') {
            return userPermissions['reports.associates.view'];
        }
        return true; // All other reports are visible to anyone with access to the Reports module
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes y Estadísticas</h1>
                    <p className="text-gray-500 dark:text-gray-400">Consulte la información detallada de su operación.</p>
                </div>

                {hasGlobalAccess && (
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 pl-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm min-w-[280px]">
                        <BuildingOfficeIcon className="h-5 w-5 text-primary-500" />
                        <div className="flex-1">
                            <Select 
                                value={selectedOfficeId} 
                                onChange={e => setSelectedOfficeId(e.target.value)}
                                className="!border-0 !ring-0 !py-1 !shadow-none font-bold text-gray-700 dark:text-gray-200 bg-transparent"
                            >
                                <option value="all">Todas las Sucursales</option>
                                {offices.map(office => (
                                    <option key={office.id} value={office.id}>{office.name}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="flex items-center p-4">
                    <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 mr-4">
                        <TruckIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Facturas Emitidas</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.count}</p>
                    </div>
                </Card>
                <Card className="flex items-center p-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mr-4 shrink-0">
                        <BanknotesIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Ingresos Totales (Base)</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">Bs. {stats.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                    </div>
                </Card>
                <Card className="flex items-center p-4">
                    <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 mr-4 shrink-0">
                        <BuildingOfficeIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Oficina</p>
                        <p className="text-[13px] sm:text-sm font-bold text-gray-900 dark:text-white uppercase leading-tight line-clamp-2" title={selectedOfficeId === 'all' ? 'Todas las Sucursales' : offices.find(o => o.id === selectedOfficeId)?.name}>
                            {selectedOfficeId === 'all' ? 'Todas las Sucursales' : offices.find(o => o.id === selectedOfficeId)?.name || 'Sucursal'}
                        </p>
                    </div>
                </Card>
            </div>

            <Card>
                <CardTitle>Reportes del Sistema</CardTitle>
                <p className="text-gray-500 dark:text-gray-400 mt-1 mb-6">Seleccione un reporte para visualizar sus datos.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allowedReports.map((report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            onSelect={() => handleReportSelect(report.id)}
                        />
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default ReportsView;
