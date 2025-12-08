
import React, { useState, useMemo } from 'react';
import { Invoice, Asociado, Vehicle, Office, CompanyInfo, Client, Category, Remesa, Dispatch } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { SendIcon, TruckIcon, CheckCircleIcon, ClipboardListIcon, ArchiveBoxIcon, PrinterIcon, ArrowsRightLeftIcon } from '../icons/Icons';
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
    onDispatchVehicle: (vehicleId: string) => Promise<Remesa | null>;
    companyInfo: CompanyInfo;
    currentUser: any;
}

type Tab = 'salidas' | 'entradas' | 'historial';

const DespachosView: React.FC<DespachosViewProps> = (props) => {
    const { 
        invoices, asociados, vehicles, offices, clients, categories,
        companyInfo, currentUser
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

    // SHARED / PDF State
    const [showDocumentDispatch, setShowDocumentDispatch] = useState<Dispatch | null>(null);

    // --- COMPUTED DATA ---

    const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name || 'Desconocida';

    // 1. SALIDAS: Invoices pending dispatch from CURRENT office
    const pendingOutboundInvoices = useMemo(() => {
        return invoices.filter(inv => 
            inv.shippingStatus === 'Pendiente para Despacho' && 
            inv.status === 'Activa' && 
            inv.guide.originOfficeId === currentUser.officeId
        );
    }, [invoices, currentUser.officeId]);

    // 2. ENTRADAS: Dispatches coming TO current office with status 'En Tránsito'
    const pendingInboundDispatches = useMemo(() => {
        return dispatches.filter(d => 
            d.destinationOfficeId === currentUser.officeId && 
            d.status === 'En Tránsito'
        );
    }, [dispatches, currentUser.officeId]);

    // 3. HISTORIAL: All dispatches involved with current office
    const dispatchHistory = useMemo(() => {
        return dispatches.filter(d => 
            d.originOfficeId === currentUser.officeId || 
            d.destinationOfficeId === currentUser.officeId
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dispatches, currentUser.officeId]);


    // --- HANDLERS: SALIDAS ---

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
            setShowDocumentDispatch(newDispatch); // Show PDF immediately
        }
    };

    // --- HANDLERS: ENTRADAS ---

    const handleOpenVerification = (dispatch: Dispatch) => {
        setDispatchToVerify(dispatch);
        setVerifiedInvoiceIds([]); // Start clean
        setIsVerificationModalOpen(true);
    };

    const handleToggleVerifyInvoice = (invoiceId: string) => {
        setVerifiedInvoiceIds(prev => 
            prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
        );
    };

    const handleConfirmReception = async () => {
        if (!dispatchToVerify) return;
        await handleReceiveDispatch(dispatchToVerify.id, verifiedInvoiceIds);
        setIsVerificationModalOpen(false);
        setDispatchToVerify(null);
    };

    // --- RENDER ---

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
            {/* Tabs Navigation */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex border-b dark:border-gray-700">
                <TabButton id="salidas" label="Salidas (Por Enviar)" icon={SendIcon} count={pendingOutboundInvoices.length} />
                <TabButton id="entradas" label="Entradas (Por Recibir)" icon={ClipboardListIcon} count={pendingInboundDispatches.length} />
                <TabButton id="historial" label="Historial Global" icon={ArchiveBoxIcon} />
            </div>

            {/* --- TAB: SALIDAS --- */}
            {activeTab === 'salidas' && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Generar Nuevo Despacho</CardTitle>
                            <Button 
                                onClick={() => setIsDispatchFormOpen(true)} 
                                disabled={selectedInvoiceIds.length === 0}
                            >
                                <TruckIcon className="w-4 h-4 mr-2" />
                                Procesar Despacho ({selectedInvoiceIds.length})
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Seleccione las facturas y procese el despacho. La oficina de destino se selecciona al final.</p>
                    </CardHeader>
                    
                    <div className="overflow-x-auto mt-4">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input 
                                            type="checkbox" 
                                            onChange={handleSelectAll} 
                                            checked={pendingOutboundInvoices.length > 0 && selectedInvoiceIds.length === pendingOutboundInvoices.length}
                                            className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino (Factura)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Peso</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {pendingOutboundInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedInvoiceIds.includes(inv.id)}
                                                onChange={() => handleToggleInvoice(inv.id)}
                                                className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{inv.clientName}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            {getOfficeName(inv.guide.destinationOfficeId)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{inv.date}</td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">{calculateInvoiceChargeableWeight(inv).toFixed(2)} Kg</td>
                                    </tr>
                                ))}
                                {pendingOutboundInvoices.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No hay facturas pendientes para despacho.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* --- TAB: ENTRADAS --- */}
            {activeTab === 'entradas' && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Recepción y Verificación de Carga</CardTitle>
                                <p className="text-sm text-gray-500">Confirme la llegada física de la mercancía enviada desde otras sucursales.</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => window.location.reload()} title="Actualizar Datos">
                                <ArrowsRightLeftIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {pendingInboundDispatches.length > 0 ? pendingInboundDispatches.map(dispatch => {
                            const vehicle = vehicles.find(v => v.id === dispatch.vehicleId);
                            const invoiceCount = dispatch.invoiceIds.length;
                            
                            return (
                                <div key={dispatch.id} className="border dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono font-bold text-lg">{dispatch.dispatchNumber}</span>
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">En Tránsito</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            <strong>Origen:</strong> {getOfficeName(dispatch.originOfficeId)}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            <strong>Fecha:</strong> {new Date(dispatch.date).toLocaleDateString()}
                                        </p>
                                        <div className="my-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                                            <p><strong>Vehículo:</strong> {vehicle ? `${vehicle.modelo} (${vehicle.placa})` : 'N/A'}</p>
                                            <p><strong>Conductor:</strong> {vehicle?.driver || 'N/A'}</p>
                                            <p className="mt-1 font-semibold">{invoiceCount} Encomiendas</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => handleOpenVerification(dispatch)} className="w-full mt-2">
                                        <ClipboardListIcon className="w-4 h-4 mr-2" />
                                        Verificar Carga
                                    </Button>
                                </div>
                            )
                        }) : (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                <CheckCircleIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                <p>No hay despachos en tránsito hacia esta oficina.</p>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* --- TAB: HISTORIAL --- */}
            {activeTab === 'historial' && (
                <Card>
                    <CardHeader><CardTitle>Historial de Despachos</CardTitle></CardHeader>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {dispatchHistory.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-mono text-sm font-medium">{d.dispatchNumber}</td>
                                        <td className="px-6 py-4 text-sm">{new Date(d.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm">{getOfficeName(d.originOfficeId)}</td>
                                        <td className="px-6 py-4 text-sm">{getOfficeName(d.destinationOfficeId)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                d.status === 'Recibido' ? 'bg-green-100 text-green-800' : 
                                                d.status === 'Anulado' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => setShowDocumentDispatch(d)}>
                                                <PrinterIcon className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {dispatchHistory.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">Sin historial registrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* MODAL 1: Generate Dispatch (Salidas) */}
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

            {/* MODAL 2: Verify Reception (Entradas) */}
            {isVerificationModalOpen && dispatchToVerify && (
                <Modal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} title={`Verificar Despacho ${dispatchToVerify.dispatchNumber}`} size="lg">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Marque las facturas que ha recibido físicamente y están en buen estado.
                        </p>
                        <div className="max-h-96 overflow-y-auto border rounded-lg divide-y dark:border-gray-700">
                            {invoices.filter(inv => dispatchToVerify.invoiceIds.includes(inv.id)).map(inv => (
                                <div key={inv.id} className="p-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => handleToggleVerifyInvoice(inv.id)}>
                                    <input 
                                        type="checkbox" 
                                        checked={verifiedInvoiceIds.includes(inv.id)}
                                        readOnly
                                        className="h-5 w-5 text-green-600 rounded focus:ring-green-500 mr-4"
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="font-bold">{inv.invoiceNumber}</span>
                                            <span className="text-sm font-semibold">{inv.guide.merchandise.reduce((s,m)=>s+m.quantity,0)} Pzas</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{inv.clientName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                            <p><strong>Nota:</strong> Las facturas NO marcadas se reportarán como "Faltantes".</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="secondary" onClick={() => setIsVerificationModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleConfirmReception} disabled={verifiedInvoiceIds.length === 0}>
                                Confirmar Recepción ({verifiedInvoiceIds.length})
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL 3: PDF Document */}
            {showDocumentDispatch && (
                <DispatchDocumentModal
                    isOpen={!!showDocumentDispatch}
                    onClose={() => setShowDocumentDispatch(null)}
                    dispatch={showDocumentDispatch}
                    invoices={invoices.filter(i => showDocumentDispatch.invoiceIds.includes(i.id))}
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
