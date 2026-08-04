import React, { useState, useMemo, useRef } from 'react';
import { Invoice, CompanyInfo, Office, Client, ShippingType, Permissions, User } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { SearchIcon, DownloadIcon, FilePlusIcon, CheckSquareIcon, SquareIcon } from '../icons/Icons';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';
import { useConfig } from '../../contexts/ConfigContext';
import Modal from '../ui/Modal';
import { useToast } from '../ui/ToastProvider';
import { usePdfDownload } from '../../contexts/PdfDownloadContext';

interface GuiasPorteViewProps {
    invoices: Invoice[];
    offices: Office[];
    clients: Client[];
    companyInfo: CompanyInfo;
    permissions: Permissions;
    currentUser?: User;
}

const ITEMS_PER_PAGE = 10;

// Component to render an individual Guía Porte card for print/preview
export const SingleGuiaPorteCard: React.FC<{
    invoice: Invoice;
    companyInfo: CompanyInfo;
    shippingTypes: ShippingType[];
    offices: Office[];
    isHalfPage?: boolean;
}> = ({ invoice, companyInfo, shippingTypes, offices, isHalfPage = true }) => {
    const sender = invoice.guide?.sender || {};
    const receiver = invoice.guide?.receiver || {};
    const merchandise = invoice.guide?.merchandise || [];
    const firstMerch = merchandise[0] || {} as any;
    
    const shippingType = shippingTypes.find(s => s.id === invoice.guide?.shippingTypeId);
    const shippingTypeName = shippingType ? shippingType.name : 'TRASLADO TERRESTRE';
    
    const totalPieces = merchandise.reduce((sum, m) => sum + (m.quantity || 1), 0);
    const totalWeight = merchandise.reduce((sum, m) => sum + (m.weight || 0), 0);

    const originOfficeObj = offices.find(o => o.id === invoice.guide?.originOfficeId || o.name === invoice.guide?.originOfficeId);
    const destOfficeObj = offices.find(o => o.id === invoice.guide?.destinationOfficeId || o.name === invoice.guide?.destinationOfficeId);

    const originOfficeName = originOfficeObj?.name || invoice.Office?.name || invoice.guide?.originOfficeId || 'OFICINA ORIGEN';
    const destOfficeName = destOfficeObj?.name || invoice.guide?.destinationOfficeId || 'OFICINA DESTINO';

    const formatInvoiceNumber = (num?: string) => {
        if (!num) return '';
        return num.startsWith('F-') ? num : `F-${num}`;
    };

    const formatCurrency = (amount: number) => `Bs. ${(amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatShortDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Intl.DateTimeFormat('es-VE', { 
                day: '2-digit', month: '2-digit', year: 'numeric' 
            }).format(new Date(d));
        } catch {
            return d || '';
        }
    };

    return (
        <div 
            className="guia-porte-card bg-white p-4 border border-gray-300 rounded text-black text-xs font-sans select-none"
            style={{ 
                width: '100%', 
                boxSizing: 'border-box',
                fontFamily: 'Arial, Helvetica, sans-serif'
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-blue-900">
                <div className="flex items-center gap-3">
                    {companyInfo.logoUrl ? (
                        <img src={companyInfo.logoUrl} alt="Logo" className="h-10 object-contain max-w-[120px]" crossOrigin="anonymous" />
                    ) : (
                        <div className="h-10 w-12 bg-blue-900 text-white flex items-center justify-center font-bold text-[10px] rounded">
                            COOP
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-black text-blue-900 leading-tight uppercase">
                            {companyInfo.name || 'ASOCIACION COOPERATIVA MIXTA DE TRANSPORTE DE CARGA'}
                        </h1>
                        <p className="text-[10px] font-bold text-gray-700">
                            RIF: {companyInfo.rif || 'J-000000000'} | Habilitado Postal: {companyInfo.postalLicense || companyInfo.rif || ''}
                        </p>
                    </div>
                </div>
                <div className="text-right pl-2">
                    <span className="inline-block bg-blue-900 text-white font-bold px-2 py-0.5 text-xs rounded mb-0.5">
                        GUÍA PORTE
                    </span>
                    <p className="font-bold text-[11px] text-gray-800">FECHA: {formatShortDate(invoice.date)}</p>
                </div>
            </div>

            {/* Tabla 1: Datos de Contrato / Origen / Remitente */}
            <table className="w-full border-collapse border border-blue-900 text-[10px] mb-2">
                <tbody>
                    <tr className="bg-blue-100/70 font-bold text-blue-950 text-center">
                        <td className="border border-blue-900 p-1">N° CONTRATO</td>
                        <td className="border border-blue-900 p-1">OFICINA ORIGEN</td>
                        <td className="border border-blue-900 p-1">TIPO MERCANCÍA</td>
                        <td className="border border-blue-900 p-1" colSpan={2}>TIPO DE SERVICIO</td>
                        <td className="border border-blue-900 p-1 bg-red-100 text-red-700">CORRELATIVO</td>
                    </tr>
                    <tr className="text-center font-semibold">
                        <td className="border border-blue-900 p-1">{companyInfo.postalLicense || companyInfo.rif || 'N/A'}</td>
                        <td className="border border-blue-900 p-1 uppercase">{originOfficeName}</td>
                        <td className="border border-blue-900 p-1 uppercase">PAQUETE / CARGA</td>
                        <td className="border border-blue-900 p-1 uppercase" colSpan={2}>{shippingTypeName}</td>
                        <td className="border border-blue-900 p-1 font-black text-red-600 text-xs bg-red-50">
                            {formatInvoiceNumber(invoice.invoiceNumber)}
                        </td>
                    </tr>
                    <tr className="bg-blue-100/70 font-bold text-blue-950">
                        <td className="border border-blue-900 p-1" colSpan={3}>REMITENTE / RAZÓN SOCIAL</td>
                        <td className="border border-blue-900 p-1">RIF / C.I.</td>
                        <td className="border border-blue-900 p-1" colSpan={2}>TELÉFONO</td>
                    </tr>
                    <tr>
                        <td className="border border-blue-900 p-1 uppercase font-semibold" colSpan={3}>{sender.name || 'N/A'}</td>
                        <td className="border border-blue-900 p-1 uppercase">{sender.idNumber || 'N/A'}</td>
                        <td className="border border-blue-900 p-1" colSpan={2}>{sender.phone || 'N/A'}</td>
                    </tr>
                    <tr className="bg-blue-100/70 font-bold text-blue-950">
                        <td className="border border-blue-900 p-1" colSpan={2}>CIUDAD / OFICINA DESTINO</td>
                        <td className="border border-blue-900 p-1">LOCALIDAD / DIRECCIÓN</td>
                        <td className="border border-blue-900 p-1 text-center" colSpan={2}>TIPO ENTREGA</td>
                        <td className="border border-blue-900 p-1">TELÉFONO DESTINO</td>
                    </tr>
                    <tr>
                        <td className="border border-blue-900 p-1 uppercase font-semibold" colSpan={2}>{destOfficeName}</td>
                        <td className="border border-blue-900 p-1 uppercase">{invoice.guide?.specificDestination || 'OFICINA DESTINO'}</td>
                        <td className="border border-blue-900 p-1 text-center text-[9px] font-bold">
                            PUERTA A PUERTA {invoice.guide?.paymentType === 'flete-destino' ? '(X)' : '( )'}
                        </td>
                        <td className="border border-blue-900 p-1 text-center text-[9px] font-bold">
                            OFICINA {invoice.guide?.paymentType !== 'flete-destino' ? '(X)' : '( )'}
                        </td>
                        <td className="border border-blue-900 p-1">{receiver.phone || 'N/A'}</td>
                    </tr>
                </tbody>
            </table>

            {/* Tabla 2: Paquetes y Receptor */}
            <table className="w-full border-collapse border border-blue-900 text-[10px] mb-2">
                <tbody>
                    <tr className="bg-blue-100/70 font-bold text-blue-950 text-center">
                        <td className="border border-blue-900 p-1 w-16">PIEZAS</td>
                        <td className="border border-blue-900 p-1 w-20">PESO KG</td>
                        <td className="border border-blue-900 p-1">DESCRIPCIÓN DE LA MERCANCÍA</td>
                        <td className="border border-blue-900 p-1">NOMBRE Y APELLIDO RECEPTOR</td>
                        <td className="border border-blue-900 p-1 w-24">N° PRECINTO</td>
                    </tr>
                    <tr className="text-center font-medium">
                        <td className="border border-blue-900 p-1.5 font-bold">{totalPieces}</td>
                        <td className="border border-blue-900 p-1.5 font-bold">{totalWeight}</td>
                        <td className="border border-blue-900 p-1.5 uppercase text-left">{firstMerch.description || 'Mercancía General'}</td>
                        <td className="border border-blue-900 p-1.5 uppercase text-left font-semibold">{receiver.name || 'N/A'}</td>
                        <td className="border border-blue-900 p-1.5">-</td>
                    </tr>
                </tbody>
            </table>

            {/* Tabla 3: Firmas y Finanzas */}
            <div className="grid grid-cols-12 gap-1 text-[10px]">
                {/* Firmas */}
                <div className="col-span-7 border border-blue-900">
                    <table className="w-full border-collapse text-[9px] h-full">
                        <tbody>
                            <tr className="bg-blue-100/70 text-center font-bold text-blue-950">
                                <td className="border-b border-r border-blue-900 p-1 w-1/2">REMITENTE</td>
                                <td className="border-b border-r border-blue-900 p-1">FIRMA</td>
                                <td className="border-b border-blue-900 p-1">FECHA ENTREGA</td>
                            </tr>
                            <tr className="h-8 align-bottom text-center">
                                <td className="border-b border-r border-blue-900 p-1 uppercase font-semibold text-[8px]">{sender.name || ''}</td>
                                <td className="border-b border-r border-blue-900 p-1">_________________</td>
                                <td className="border-b border-blue-900 p-1">{formatShortDate(invoice.date)}</td>
                            </tr>
                            <tr className="bg-blue-100/70 text-center font-bold text-blue-950">
                                <td className="border-b border-r border-blue-900 p-1">RECEPTOR</td>
                                <td className="border-b border-r border-blue-900 p-1">FIRMA</td>
                                <td className="border-b border-blue-900 p-1">FECHA RECEPCIÓN</td>
                            </tr>
                            <tr className="h-8 align-bottom text-center">
                                <td className="border-r border-blue-900 p-1 uppercase font-semibold text-[8px]">{receiver.name || ''}</td>
                                <td className="border-r border-blue-900 p-1">_________________</td>
                                <td className="p-1">___/___/______</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Sello */}
                <div className="col-span-2 border border-blue-900 flex flex-col justify-between text-center">
                    <div className="bg-blue-100/70 border-b border-blue-900 p-1 font-bold text-[9px] text-blue-950">
                        SELLO
                    </div>
                    <div className="flex-1 min-h-[50px] flex items-center justify-center text-[8px] text-gray-400">
                        SELLO DE OFICINA
                    </div>
                </div>

                {/* Finanzas */}
                <div className="col-span-3 border border-blue-900">
                    <table className="w-full border-collapse text-[9px] h-full">
                        <tbody>
                            <tr className="bg-blue-100/70 text-center font-bold text-blue-950">
                                <td className="border-b border-blue-900 p-1" colSpan={2}>VALOR FLETE</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-blue-900 p-0.5 font-bold text-[8px] bg-blue-50">BASE IMP.</td>
                                <td className="border-b border-blue-900 p-0.5 text-right font-medium">{formatCurrency(invoice.montoFlete || 0)}</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-blue-900 p-0.5 font-bold text-[8px] bg-blue-50">SEGURO</td>
                                <td className="border-b border-blue-900 p-0.5 text-right font-medium">{formatCurrency(invoice.insuranceAmount || 0)}</td>
                            </tr>
                            <tr>
                                <td className="border-b border-r border-blue-900 p-0.5 font-bold text-[8px] bg-blue-50">FRANQUEO</td>
                                <td className="border-b border-blue-900 p-0.5 text-right font-medium">{formatCurrency(invoice.ipostelFee || 0)}</td>
                            </tr>
                            <tr className="bg-blue-100/80 font-bold">
                                <td className="border-r border-blue-900 p-1 text-[8px]">TOTAL BS</td>
                                <td className="p-1 text-right text-[10px] text-blue-950 font-black">{formatCurrency(invoice.totalAmount || 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const GuiasPorteView: React.FC<GuiasPorteViewProps> = ({
    invoices,
    offices,
    clients,
    companyInfo,
    permissions,
    currentUser
}) => {
    const { shippingTypes = [] } = useConfig();
    const { addToast } = useToast();

    // Determine user office and permissions
    const userOffice = useMemo(() => {
        if (!currentUser) return undefined;
        return offices.find(o => o.id === currentUser.officeId || o.name === currentUser.officeId);
    }, [offices, currentUser]);

    const hasManageAll = useMemo(() => {
        if (!currentUser) return false;
        return permissions['expenses.manage_all_offices'] === true || 
               permissions['config.users.manage'] === true || 
               ['role-admin', 'role-tech'].includes(currentUser.roleId);
    }, [permissions, currentUser]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOffice, setSelectedOffice] = useState<string>(
        hasManageAll ? '' : (userOffice?.id || currentUser?.officeId || '')
    );
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Selected Invoices for Batch Download
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
    
    // Global PDF Download Context
    const { startBatchPdfDownload, isDownloading, downloadProgress } = usePdfDownload();

    // Modal Preview State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    const printContainerRef = useRef<HTMLDivElement>(null);

    // Active Office Filter ID
    const activeOfficeFilter = hasManageAll ? selectedOffice : (userOffice?.id || currentUser?.officeId || '');

    // Filtered Invoices List
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (inv.status === 'Anulada') return false;

            // Office Filtering (Strictly enforced on frontend if not admin)
            if (activeOfficeFilter) {
                const targetOff = offices.find(o => o.id === activeOfficeFilter || o.name === activeOfficeFilter);
                const isOriginMatch = 
                    inv.guide?.originOfficeId === activeOfficeFilter ||
                    inv.Office?.id === activeOfficeFilter ||
                    inv.Office?.name === activeOfficeFilter ||
                    (targetOff && (inv.guide?.originOfficeId === targetOff.name || inv.Office?.name === targetOff.name));
                
                if (!isOriginMatch) return false;
            }

            if (startDate) {
                const invDate = inv.date.split('T')[0];
                if (invDate < startDate) return false;
            }

            if (endDate) {
                const invDate = inv.date.split('T')[0];
                if (invDate > endDate) return false;
            }

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const invNum = (inv.invoiceNumber || '').toLowerCase();
                const senderName = (inv.guide?.sender?.name || '').toLowerCase();
                const receiverName = (inv.guide?.receiver?.name || '').toLowerCase();
                const senderId = (inv.guide?.sender?.idNumber || '').toLowerCase();
                if (!invNum.includes(term) && !senderName.includes(term) && !receiverName.includes(term) && !senderId.includes(term)) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, activeOfficeFilter, offices, startDate, endDate, searchTerm]);

    const { paginatedData, currentPage, totalPages, setCurrentPage, totalItems } = usePagination(filteredInvoices, ITEMS_PER_PAGE);

    // Selected Invoices List
    const selectedInvoices = useMemo(() => {
        return invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    }, [invoices, selectedInvoiceIds]);

    const allFilteredIds = useMemo(() => filteredInvoices.map(inv => inv.id), [filteredInvoices]);
    const isAllFilteredSelected = useMemo(() => {
        if (allFilteredIds.length === 0) return false;
        return allFilteredIds.every(id => selectedInvoiceIds.includes(id));
    }, [allFilteredIds, selectedInvoiceIds]);

    // Select ALL available/filtered guías (e.g. 214 guías)
    const handleToggleSelectAllFiltered = () => {
        if (isAllFilteredSelected) {
            setSelectedInvoiceIds([]);
        } else {
            setSelectedInvoiceIds(allFilteredIds);
            addToast({ 
                type: 'info', 
                title: 'Selección Completa', 
                message: `Se han seleccionado las ${allFilteredIds.length} guías de porte disponibles.` 
            });
        }
    };

    const handleSelectAllCurrentPage = () => {
        const currentPageIds = paginatedData.map(inv => inv.id);
        const allSelected = currentPageIds.every(id => selectedInvoiceIds.includes(id));
        if (allSelected) {
            setSelectedInvoiceIds(prev => prev.filter(id => !currentPageIds.includes(id)));
        } else {
            setSelectedInvoiceIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
        }
    };

    const handleToggleSelectInvoice = (id: string) => {
        setSelectedInvoiceIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleClearSelection = () => setSelectedInvoiceIds([]);

    // Fast non-blocking background PDF generator using global context
    const handleDownloadBatchPdf = () => {
        if (selectedInvoices.length === 0) return;
        setIsPreviewOpen(false);
        startBatchPdfDownload(selectedInvoices);
    };

    if (!permissions['guias-porte.view']) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                    <p className="text-sm text-gray-500">No tienes permisos para ver el módulo de Guías Porte.</p>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Title Banner */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FilePlusIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        Módulo de Guías Porte
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Seleccione una o varias facturas para previsualizar y descargar sus guías de porte en formato A4 (Individual o Lote).
                    </p>
                </div>
                {selectedInvoiceIds.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" onClick={handleClearSelection}>
                            Limpiar Selección ({selectedInvoiceIds.length})
                        </Button>
                        <Button variant="primary" onClick={() => setIsPreviewOpen(true)}>
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Descargar Guías ({selectedInvoiceIds.length})
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter Bar Card */}
            <Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2">
                    <Input
                        label="Buscar por N° Factura / Cliente / RIF"
                        id="search-guias"
                        placeholder="Ej: F-0001 / Juan Perez..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="w-4 h-4 text-gray-400" />}
                    />

                    {hasManageAll ? (
                        <Select
                            label="Oficina Origen"
                            id="office-filter"
                            value={selectedOffice}
                            onChange={e => setSelectedOffice(e.target.value)}
                        >
                            <option value="">Todas las Oficinas</option>
                            {offices.map(off => (
                                <option key={off.id} value={off.id}>{off.name}</option>
                            ))}
                        </Select>
                    ) : (
                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Oficina Origen
                            </label>
                            <div className="bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 px-3 py-2 rounded-md text-sm font-bold flex items-center justify-between">
                                <span>{userOffice?.name || currentUser?.officeId || 'Mi Oficina'}</span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal ml-2">(Oficina Asignada)</span>
                            </div>
                        </div>
                    )}

                    <Input
                        label="Desde"
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />

                    <Input
                        label="Hasta"
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
            </Card>

            {/* Sticky Action Banner when items are selected */}
            {selectedInvoiceIds.length > 0 && (
                <div className="bg-blue-900 text-white p-3.5 rounded-lg shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 border border-blue-800 transition-all">
                    <div className="flex items-center gap-2.5">
                        <CheckSquareIcon className="w-5 h-5 text-blue-300" />
                        <div>
                            <p className="text-sm font-bold">
                                {selectedInvoiceIds.length} Guía(s) de Porte Seleccionada(s)
                            </p>
                            <p className="text-[11px] text-blue-200">
                                Listas para descarga en lote o impresión masiva sin congelar el navegador
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            className="bg-white text-blue-950 hover:bg-blue-50 font-bold border-0"
                            onClick={() => setIsPreviewOpen(true)}
                        >
                            <DownloadIcon className="w-4 h-4 mr-1.5 text-blue-700" />
                            Vista Previa / Descargar PDF ({selectedInvoiceIds.length})
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-blue-200 hover:text-white hover:bg-blue-800"
                            onClick={handleClearSelection}
                        >
                            Limpiar
                        </Button>
                    </div>
                </div>
            )}

            {/* Table Card */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <div>
                            <CardTitle>Listado de Guías de Porte ({totalItems})</CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {selectedInvoiceIds.length} de {filteredInvoices.length} guía(s) seleccionada(s)
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={isAllFilteredSelected ? "secondary" : "primary"}
                                size="sm"
                                onClick={handleToggleSelectAllFiltered}
                                disabled={filteredInvoices.length === 0}
                            >
                                <CheckSquareIcon className="w-4 h-4 mr-1.5" />
                                {isAllFilteredSelected 
                                    ? "Deseleccionar Todas" 
                                    : `Seleccionar Todas (${filteredInvoices.length})`}
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <button
                                        type="button"
                                        onClick={handleToggleSelectAllFiltered}
                                        className="text-gray-500 dark:text-gray-400 hover:text-blue-600 focus:outline-none flex items-center gap-1"
                                        title={`Seleccionar o deseleccionar las ${filteredInvoices.length} guías disponibles`}
                                    >
                                        {isAllFilteredSelected ? (
                                            <CheckSquareIcon className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <SquareIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">N° Factura</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Remitente</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Destinatario</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Origen</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Destino</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Monto Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            {paginatedData.map(inv => {
                                const isSelected = selectedInvoiceIds.includes(inv.id);
                                const senderName = inv.guide?.sender?.name || 'N/A';
                                const receiverName = inv.guide?.receiver?.name || 'N/A';
                                const originName = inv.Office?.name || inv.guide?.originOfficeId || 'Caracas';
                                const destName = inv.guide?.destinationOfficeId || 'N/A';

                                return (
                                    <tr key={inv.id} className={isSelected ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelectInvoice(inv.id)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-400">
                                            {inv.invoiceNumber.startsWith('F-') ? inv.invoiceNumber : `F-${inv.invoiceNumber}`}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                            {inv.date ? new Date(inv.date).toLocaleDateString('es-VE') : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{senderName}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{receiverName}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{originName}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{destName}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100">
                                            Bs. {(inv.totalAmount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedInvoiceIds([inv.id]);
                                                    setIsPreviewOpen(true);
                                                }}
                                            >
                                                Ver / Descargar
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {paginatedData.length === 0 && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No se encontraron guías porte que coincidan con los filtros.
                        </div>
                    )}
                </div>

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </Card>

            {/* Modal Preview for Batch Download */}
            {isPreviewOpen && selectedInvoices.length > 0 && (
                <Modal
                    isOpen={isPreviewOpen}
                    onClose={() => {
                        if (!isDownloading) setIsPreviewOpen(false);
                    }}
                    title={`Vista Previa de Guías Porte (${selectedInvoices.length} Seleccionada${selectedInvoices.length > 1 ? 's' : ''})`}
                    size="5xl"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-4 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            {selectedInvoices.length === 1 
                                ? 'Formato A4 Solitario (Mitad Hoja Superior)' 
                                : `Formato A4 Lote (${selectedInvoices.length} Guías - 2 por Hoja A4)`}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleDownloadBatchPdf}
                                disabled={isDownloading}
                            >
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                {isDownloading ? 'Generando PDF...' : `Descargar PDF (${selectedInvoices.length})`}
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar during Batch Download */}
                    {downloadProgress && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 p-4 rounded-lg">
                            <div className="flex justify-between text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">
                                <span>Procesando PDF en Lote...</span>
                                <span>{downloadProgress.current} de {downloadProgress.total} guías ({downloadProgress.percentage}%)</span>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-200" 
                                    style={{ width: `${downloadProgress.percentage}%` }}
                                ></div>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                Optimizador de memoria activo: liberando RAM dinámicamente para procesar {downloadProgress.total} documentos sin congelar la pantalla.
                            </p>
                        </div>
                    )}

                    {/* Performance Optimizer Notice for Large Volumes */}
                    {selectedInvoices.length > 10 && (
                        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs font-medium flex items-center justify-between">
                            <span>
                                ⚡ <strong>Modo Alto Rendimiento:</strong> Se muestran las primeras 10 guías en esta vista previa para evitar sobrecargar la pantalla. Al hacer clic en <strong>Descargar PDF</strong>, se procesarán las <strong>{selectedInvoices.length} guías completas</strong>.
                            </span>
                        </div>
                    )}

                    {/* Modal Scrollable Container displaying preview subset */}
                    <div className="overflow-y-auto max-h-[65vh] bg-gray-100 p-6 dark:bg-gray-900 rounded-lg">
                        <div className="space-y-8 max-w-[850px] mx-auto">
                            {selectedInvoices.slice(0, 10).map((inv, index) => (
                                <div key={inv.id} className="bg-white p-2 rounded shadow-sm border border-gray-200">
                                    <div className="text-xs font-bold text-gray-500 mb-1 px-1 flex justify-between">
                                        <span>Guía #{index + 1} de {selectedInvoices.length}</span>
                                        <span>N°: {inv.invoiceNumber}</span>
                                    </div>
                                    <SingleGuiaPorteCard
                                        invoice={inv}
                                        companyInfo={companyInfo}
                                        shippingTypes={shippingTypes}
                                        offices={offices}
                                        isHalfPage={true}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Hidden Complete Printable Container for Native Print */}
            <div 
                ref={printContainerRef} 
                className="printable-area fixed -left-[9999px] top-0 pointer-events-none opacity-0 print:static print:left-auto print:pointer-events-auto print:opacity-100 print:block space-y-8 max-w-[850px] mx-auto"
            >
                {selectedInvoices.map((inv, index) => (
                    <div 
                        key={inv.id} 
                        className="bg-white p-2 rounded border border-gray-200 guia-porte-print-wrapper" 
                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                        <div className="text-xs font-bold text-gray-500 mb-1 px-1 flex justify-between print:hidden">
                            <span>Guía #{index + 1} de {selectedInvoices.length}</span>
                            <span>N°: {inv.invoiceNumber}</span>
                        </div>
                        <SingleGuiaPorteCard
                            invoice={inv}
                            companyInfo={companyInfo}
                            shippingTypes={shippingTypes}
                            offices={offices}
                            isHalfPage={true}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GuiasPorteView;
