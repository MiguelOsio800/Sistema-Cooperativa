
import React, { useState, useMemo } from 'react';
import { Invoice, Asociado, Vehicle, Office, CompanyInfo, Client, Category, Remesa, Dispatch, Permissions } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { SendIcon, TruckIcon, CheckCircleIcon, ClipboardListIcon, ArchiveBoxIcon, PrinterIcon, ArrowsRightLeftIcon, ClockIcon, ExclamationTriangleIcon, EyeIcon } from '../icons/Icons';
import { calculateInvoiceChargeableWeight } from '../../utils/financials';
import { useToast } from '../ui/ToastProvider';
import Modal from '../ui/Modal';
import DispatchFormModal from './DispatchFormModal';
import DispatchDocumentModal from './DispatchDocumentModal';
import { useData } from '../../contexts/DataContext';

interface DespachosViewProps {
    invoices: Invoice[];
    asociados: Asociado[];
    vehicles: Vehicle[];
    offices: Office[];
    clients: Client[];
    categories: Category[];
    onAssignToVehicle: (invoiceIds: string[], vehicleId: string) => Promise<void>;
    onDispatchVehicle: (vehicleId: string, invoiceIds: string[], exchangeRate: number, asociadoId: string) => Promise<Remesa | null>;
    companyInfo: CompanyInfo;
    currentUser: any;
    permissions: Permissions;
}

type Tab = 'salidas' | 'entradas' | 'seguimiento' | 'historial';

const DespachosView: React.FC<DespachosViewProps> = (props) => {
    const { 
        invoices, asociados, vehicles, offices, clients, categories,
        companyInfo, currentUser, permissions
    } = props;

    const { handleCreateDispatch, handleReceiveDispatch, dispatches } = useData();
    const { addToast } = useToast();
    
    // State
    const [activeTab, setActiveTab] = useState<Tab>('salidas');
    
    // SALIDAS State
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
    const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false);
    
    // ENTRADAS State
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [dispatchToVerify, setDispatchToVerify] = useState<Dispatch | null>(null);
    const [verifiedInvoiceIds, setVerifiedInvoiceIds] = useState<string[]>([]);

    // SEGUIMIENTO State
    const [selectedTraceDispatch, setSelectedTraceDispatch] = useState<Dispatch | null>(null);

    // SHARED / PDF State
    const [showDocumentDispatch, setShowDocumentDispatch] = useState<Dispatch | null>(null);

    // --- COMPUTED DATA ---

    const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name || 'Desconocida';

    // 1. SALIDAS: Invoices pending dispatch
    const pendingOutboundInvoices = useMemo(() => {
        return invoices.filter(inv => 
            inv.shippingStatus === 'Pendiente para Despacho' && 
            inv.status === 'Activa'
        );
    }, [invoices]);

    // 2. ENTRADAS: Dispatches coming TO current office
    const pendingInboundDispatches = useMemo(() => {
        const userOfficeId = currentUser.officeId;
        if (!Array.isArray(dispatches)) return [];
        return dispatches.filter(d => 
            d.status === 'En Tránsito' &&
            (!userOfficeId || d.destinationOfficeId === userOfficeId)
        );
    }, [dispatches, currentUser.officeId]);

    // 3. SEGUIMIENTO: Dispatches SENT BY current office
    const mySentDispatches = useMemo(() => {
        const userOfficeId = currentUser.officeId;
        if (!Array.isArray(dispatches)) return [];
        return dispatches.filter(d => 
            !userOfficeId || d.originOfficeId === userOfficeId
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dispatches, currentUser.officeId]);

    // 4. HISTORIAL: All dispatches
    const dispatchHistory = useMemo(() => {
        const userOfficeId = currentUser.officeId;
        if (!Array.isArray(dispatches)) return [];
        return dispatches.filter(d => 
            !userOfficeId || 
            d.originOfficeId === userOfficeId || 
            d.destinationOfficeId === userOfficeId
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dispatches, currentUser.officeId]);


    // --- HANDLERS ---

    const handleSelectAll = () => {
        if (selectedInvoiceIds.length === pendingOutboundInvoices.length) {
            setSelectedInvoiceIds([]);
        } else {
            setSelectedInvoiceIds(pendingOutboundInvoices.map(inv => inv.id));
        }
    };

    const handleToggleInvoice = (id: string) => {
        setSelectedInvoiceIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCreateDispatchSubmit = async (vehicleId: string, destinationOfficeId: string) => {
        const newDispatch = await handleCreateDispatch(selectedInvoiceIds, vehicleId, destinationOfficeId);
        if (newDispatch) {
            setIsDispatchFormOpen(false);
            setSelectedInvoiceIds([]);
            setShowDocumentDispatch(newDispatch);
        }
    };

    const handleOpenVerification = (dispatch: Dispatch) => {
        setDispatchToVerify(dispatch);
        setVerifiedInvoiceIds([]);
        setIsVerificationModalOpen(true);
    };

    const handleToggleVerifyInvoice = (id: string) => {
        setVerifiedInvoiceIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleConfirmReception = async () => {
        if (!dispatchToVerify) return;
        await handleReceiveDispatch(dispatchToVerify.id, verifiedInvoiceIds);
        setIsVerificationModalOpen(false);
        setDispatchToVerify(null);
    };

    // --- RENDER HELPERS ---

    const TabButton: React.FC<{ id: Tab, label: string, icon: React.ElementType, count?: number }> = ({ id, label, icon: Icon, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-gray-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
        >
            <Icon className="w-5 h-5 mr-2" />
            {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === id ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-700'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-wrap border-b dark:border-gray-700">
                <TabButton id="salidas" label="Por Enviar" icon={SendIcon} count={pendingOutboundInvoices.length} />
                <TabButton id="entradas" label="Por Recibir" icon={ClipboardListIcon} count={pendingInboundDispatches.length} />
                <TabButton id="seguimiento" label="Seguimiento Envíos" icon={TruckIcon} />
                <TabButton id="historial" label="Historial Global" icon={ArchiveBoxIcon} />
            </div>

            {/* TAB: SALIDAS */}
            {activeTab === 'salidas' && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Facturas para Despacho</CardTitle>
                            {permissions['despachos.create'] && (
                                <Button onClick={() => setIsDispatchFormOpen(true)} disabled={selectedInvoiceIds.length === 0}>
                                    <TruckIcon className="w-4 h-4 mr-2" /> Generar Despacho ({selectedInvoiceIds.length})
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left"><input type="checkbox" onChange={handleSelectAll} checked={pendingOutboundInvoices.length > 0 && selectedInvoiceIds.length === pendingOutboundInvoices.length} /></th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Factura</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Destino</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Peso</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {pendingOutboundInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4"><input type="checkbox" checked={selectedInvoiceIds.includes(inv.id)} onChange={() => handleToggleInvoice(inv.id)} /></td>
                                        <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">{inv.clientName}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{getOfficeName(inv.guide.destinationOfficeId)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-mono">{calculateInvoiceChargeableWeight(inv).toFixed(2)} Kg</td>
                                    </tr>
                                ))}
                                {pendingOutboundInvoices.length === 0 && (<tr><td colSpan={5} className="text-center py-8 text-gray-500">No hay facturas pendientes.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* TAB: ENTRADAS */}
            {activeTab === 'entradas' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingInboundDispatches.length > 0 ? pendingInboundDispatches.map(dispatch => (
                        <div key={dispatch.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm border-l-4 border-blue-500">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">{dispatch.dispatchNumber}</span>
                                <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">En Tránsito</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Desde:</strong> {getOfficeName(dispatch.originOfficeId)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300"><strong>Fecha:</strong> {new Date(dispatch.date).toLocaleDateString()}</p>
                            <div className="mt-4">
                                <Button onClick={() => handleOpenVerification(dispatch)} className="w-full">
                                    <ClipboardListIcon className="w-4 h-4 mr-2" /> Verificar y Recibir
                                </Button>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full text-center py-20 text-gray-500">No hay despachos por recibir.</div>
                    )}
                </div>
            )}

            {/* TAB: SEGUIMIENTO */}
            {activeTab === 'seguimiento' && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rastreo de Despachos Enviados</CardTitle>
                            <p className="text-sm text-gray-500">Verifique si las oficinas de destino han recibido la mercancía que usted envió.</p>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Control</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Destino</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Progreso</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Estado Confirmación</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {mySentDispatches.map(d => {
                                        const isReceived = d.status === 'Recibido';
                                        const hasNovelty = isReceived && d.receivedBy?.includes('CONVEDAD'); 

                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{d.dispatchNumber}</td>
                                                <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{getOfficeName(d.destinationOfficeId)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${isReceived ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}></div>
                                                        <div className="flex-1 h-1 bg-gray-200 rounded-full w-20 relative">
                                                            <div className={`absolute top-0 left-0 h-1 rounded-full ${isReceived ? 'bg-green-500 w-full' : 'bg-blue-500 w-1/2'}`}></div>
                                                        </div>
                                                        <div className={`w-3 h-3 rounded-full ${isReceived ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {!isReceived ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                            <ClockIcon className="w-3 h-3 mr-1" /> Pendiente en Destino
                                                        </span>
                                                    ) : hasNovelty ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                                            <ExclamationTriangleIcon className="w-3 h-3 mr-1" /> Recibido con Novedad
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                                            <CheckCircleIcon className="w-3 h-3 mr-1" /> Confirmado Conforme
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="secondary" size="sm" onClick={() => setSelectedTraceDispatch(d)} title="Ver Detalle de Seguimiento">
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: HISTORIAL - FIXED TEXT VISIBILITY */}
            {activeTab === 'historial' && (
                <Card>
                    <CardHeader><CardTitle>Historial Global de Despachos</CardTitle></CardHeader>
                    <div className="overflow-x-auto mt-2">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Control</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Ruta</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {dispatchHistory.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-primary-700 dark:text-primary-400">{d.dispatchNumber}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200 font-medium">{new Date(d.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-xs font-semibold text-gray-800 dark:text-gray-100">
                                            <span className="uppercase">{getOfficeName(d.originOfficeId)}</span> 
                                            <span className="mx-2 text-gray-400">➔</span> 
                                            <span className="uppercase">{getOfficeName(d.destinationOfficeId)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm border ${
                                                d.status === 'Recibido' 
                                                ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                                                : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                            }`}>{d.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => setShowDocumentDispatch(d)} className="hover:text-primary-600 shadow-sm border border-gray-200 dark:border-gray-600">
                                                <PrinterIcon className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {dispatchHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No hay registros históricos disponibles.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* MODALS remain unchanged */}
            {selectedTraceDispatch && (
                <Modal isOpen={!!selectedTraceDispatch} onClose={() => setSelectedTraceDispatch(null)} title="Detalle de Rastreo Logístico" size="lg">
                    <div className="space-y-6 text-gray-900 dark:text-gray-100">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700">
                            <div>
                                <h4 className="font-bold text-lg text-primary-600 dark:text-primary-400">{selectedTraceDispatch.dispatchNumber}</h4>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Envío Inter-Oficina</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold">{getOfficeName(selectedTraceDispatch.destinationOfficeId)}</p>
                                <p className="text-xs text-gray-500">Oficina de Destino</p>
                            </div>
                        </div>

                        <div className="relative pl-8 border-l-2 border-primary-100 dark:border-gray-700 space-y-8">
                            <div className="relative">
                                <div className="absolute -left-[41px] bg-green-500 text-white p-1 rounded-full ring-4 ring-white dark:ring-gray-800"><CheckCircleIcon className="w-4 h-4"/></div>
                                <p className="font-bold text-sm">Salida de Oficina</p>
                                <p className="text-xs text-gray-500">{new Date(selectedTraceDispatch.date).toLocaleString()}</p>
                                <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">Mercancía despachada correctamente desde {getOfficeName(selectedTraceDispatch.originOfficeId)}.</p>
                            </div>
                            <div className="relative">
                                <div className={`absolute -left-[41px] p-1 rounded-full ring-4 ring-white dark:ring-gray-800 ${selectedTraceDispatch.status === 'Recibido' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white animate-bounce'}`}>
                                    <TruckIcon className="w-4 h-4"/>
                                </div>
                                <p className="font-bold text-sm">En Tránsito</p>
                                <p className="text-xs text-gray-500">Camino al destino...</p>
                            </div>
                            <div className="relative">
                                <div className={`absolute -left-[41px] p-1 rounded-full ring-4 ring-white dark:ring-gray-800 ${selectedTraceDispatch.status === 'Recibido' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <CheckCircleIcon className="w-4 h-4"/>
                                </div>
                                <p className="font-bold text-sm">Recepción en Destino</p>
                                {selectedTraceDispatch.status === 'Recibido' ? (
                                    <>
                                        <p className="text-xs text-gray-500">{new Date(selectedTraceDispatch.receivedDate || '').toLocaleString()}</p>
                                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                                            <p className="text-xs font-bold text-green-800 dark:text-green-300">RECIBIDO POR: {selectedTraceDispatch.receivedBy?.split('(')[0]}</p>
                                            <p className="text-xs mt-1 text-green-700 dark:text-green-400">La oficina de destino ha confirmado la llegada de la carga.</p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">Pendiente por procesar en la oficina receptora.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedTraceDispatch(null)}>Cerrar Rastreo</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {isDispatchFormOpen && (
                <DispatchFormModal
                    isOpen={isDispatchFormOpen}
                    onClose={() => setIsDispatchFormOpen(false)}
                    onConfirm={handleCreateDispatchSubmit}
                    asociados={asociados}
                    vehicles={vehicles}
                    invoiceCount={selectedInvoiceIds.length}
                    offices={offices}
                />
            )}

            {isVerificationModalOpen && dispatchToVerify && (
                <Modal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} title={`Verificar Despacho ${dispatchToVerify.dispatchNumber}`} size="lg">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Marque las facturas recibidas físicamente.</p>
                        <div className="max-h-60 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                            {invoices.filter(inv => (dispatchToVerify.invoiceIds || []).includes(inv.id)).map(inv => (
                                <div key={inv.id} className="p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => handleToggleVerifyInvoice(inv.id)}>
                                    <input type="checkbox" checked={verifiedInvoiceIds.includes(inv.id)} readOnly className="h-5 w-5 text-green-600 rounded mr-4" />
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 dark:text-white">{inv.invoiceNumber}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">{inv.clientName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsVerificationModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleConfirmReception} disabled={verifiedInvoiceIds.length === 0}>Finalizar Recepción</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {showDocumentDispatch && (
                <DispatchDocumentModal
                    isOpen={!!showDocumentDispatch}
                    onClose={() => setShowDocumentDispatch(null)}
                    dispatch={showDocumentDispatch}
                    invoices={invoices.filter(i => (showDocumentDispatch.invoiceIds || []).includes(i.id))}
                    vehicle={vehicles.find(v => v.id === showDocumentDispatch.vehicleId) || {} as Vehicle}
                    asociado={asociados.find(a => a.id === vehicles.find(v => v.id === showDocumentDispatch.vehicleId)?.asociadoId) || {} as any}
                    companyInfo={companyInfo}
                    offices={offices}
                />
            )}
        </div>
    );
};

export default DespachosView;
