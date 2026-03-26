
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { 
    Invoice, Client, Vehicle, Expense, InventoryItem, Asset, AssetCategory, Supplier,
    PaymentStatus, ShippingStatus, MasterStatus, Asociado, Certificado, PagoAsociado, ReciboPagoAsociado, Remesa, AsientoManual, Dispatch 
} from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import { deriveInventoryFromInvoices } from '../utils/inventory';

type DataContextType = {
    invoices: Invoice[];
    clients: Client[];
    suppliers: Supplier[];
    vehicles: Vehicle[];
    expenses: Expense[];
    inventory: InventoryItem[];
    assets: Asset[];
    assetCategories: AssetCategory[];
    asociados: Asociado[];
    certificados: Certificado[];
    pagosAsociados: PagoAsociado[];
    recibosPagoAsociados: ReciboPagoAsociado[];
    remesas: Remesa[];
    dispatches: Dispatch[]; 
    asientosManuales: AsientoManual[];
    isLoading: boolean;
    handleSaveClient: (client: Client) => Promise<void>;
    handleDeleteClient: (clientId: string) => Promise<void>;
    handleSaveSupplier: (supplier: Supplier) => Promise<void>;
    handleDeleteSupplier: (supplierId: string) => Promise<void>;
    handleSaveInvoice: (invoice: any) => Promise<Invoice | null>;
    handleCreateCreditNote: (invoiceId: string, reason: string) => Promise<void>;
    handleCreateDebitNote: (invoiceId: string, reason: string) => Promise<void>;
    handleUpdateInvoice: (updatedInvoice: Invoice) => Promise<Invoice | null>;
    handleUpdateInvoiceStatuses: (invoiceId: string, newStatuses: any) => Promise<void>;
    handleDeleteInvoice: (invoiceId: string) => Promise<void>;
    handleSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    handleDeleteVehicle: (vehicleId: string) => Promise<void>;
    handleAssignToVehicle: (invoiceIds: string[], vehicleId: string) => Promise<void>;
    handleUnassignInvoice: (invoiceId: string) => Promise<void>;
    handleDispatchVehicle: (vehicleId: string) => Promise<Remesa | null>;
    handleFinalizeTrip: (vehicleId: string) => Promise<void>;
    handleSaveExpense: (expense: Expense) => Promise<void>;
    handleDeleteExpense: (expenseId: string) => Promise<void>;
    handleSaveAsset: (asset: Asset) => Promise<void>;
    handleDeleteAsset: (assetId: string) => Promise<void>;
    handleSaveAssetCategory: (category: AssetCategory) => Promise<void>;
    handleDeleteAssetCategory: (categoryId: string) => Promise<void>;
    handleSaveAsociado: (asociado: Asociado) => Promise<Asociado>;
    handleDeleteAsociado: (asociadoId: string) => Promise<void>;
    handleSaveCertificado: (certificado: Certificado) => Promise<void>;
    handleDeleteCertificado: (certificadoId: string) => Promise<void>;
    handleSavePagoAsociado: (pago: PagoAsociado) => Promise<void>;
    handleDeletePagoAsociado: (pagoId: string) => Promise<void>;
    handleSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    handleDeleteRemesa: (remesaId: string) => Promise<void>;
    handleSaveAsientoManual: (asiento: AsientoManual) => Promise<void>;
    handleDeleteAsientoManual: (asientoId: string) => Promise<void>;
    handleCreateDispatch: (invoiceIds: string[], vehicleId: string, destinationOfficeId: string) => Promise<Dispatch | null>;
    handleReceiveDispatch: (dispatchId: string, verifiedInvoiceIds: string[]) => Promise<void>;
    handleGenerateMassiveDebt: (debtData: any) => Promise<void>;
    fetchAsociadoData: (asociadoId: string) => Promise<void>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { isAuthenticated, currentUser } = useAuth();
    const dataLoadedForUserRef = useRef<string | null>(null);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
    const [asociados, setAsociados] = useState<Asociado[]>([]);
    const [certificados, setCertificados] = useState<Certificado[]>([]);
    const [pagosAsociados, setPagosAsociados] = useState<PagoAsociado[]>([]);
    const [recibosPagoAsociados, setRecibosPagoAsociados] = useState<ReciboPagoAsociado[]>([]);
    const [remesas, setRemesas] = useState<Remesa[]>([]);
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [asientosManuales, setAsientosManuales] = useState<AsientoManual[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSafe = useCallback(async <T,>(endpoint: string, fallbackValue: T): Promise<T> => {
        try {
            return await apiFetch<T>(endpoint);
        } catch (error: any) {
            return fallbackValue;
        }
    }, []);
    
    useEffect(() => {
        if (!isAuthenticated) {
            dataLoadedForUserRef.current = null;
            setIsLoading(false);
            return;
        }
    }, [isAuthenticated]);

    const fetchData = useCallback(async () => {
        if (!isAuthenticated || !currentUser) return;
        
        try {
            setIsLoading(true);
            dataLoadedForUserRef.current = currentUser?.id || 'authed';
            
            const isAdmin = ['role-admin', 'role-tech'].includes(currentUser.roleId);
            const perms = (currentUser as any).Role?.permissions || currentUser.permissions || {};
            const promises: Promise<any>[] = [];

            if (isAdmin || perms['invoices.view']) promises.push(fetchSafe<Invoice[]>('/invoices', []).then(d => { setInvoices(d); setInventory(deriveInventoryFromInvoices(d)); }));
            if (isAdmin || perms['clientes.view']) promises.push(fetchSafe<Client[]>('/clients', []).then(setClients));
            if (isAdmin || perms['proveedores.view']) promises.push(fetchSafe<Supplier[]>('/suppliers', []).then(setSuppliers));
            if (isAdmin || perms['flota.view']) promises.push(fetchSafe<Vehicle[]>('/vehicles', []).then(setVehicles));
            if (isAdmin || perms['remesas.view']) promises.push(fetchSafe<Remesa[]>('/remesas', []).then(setRemesas));
            if (isAdmin || perms['despachos.view']) promises.push(fetchSafe<Dispatch[]>('/dispatches', []).then(setDispatches));
            if (isAdmin || perms['libro-contable.view']) {
                promises.push(fetchSafe<Expense[]>('/expenses', []).then(setExpenses));
                promises.push(fetchSafe<AsientoManual[]>('/asientos-manuales', []).then(setAsientosManuales));
            }
            
            if (isAdmin || perms['inventario-bienes.view']) {
                promises.push(fetchSafe<Asset[]>('/assets', []).then(setAssets));
                promises.push(fetchSafe<AssetCategory[]>('/asset-categories', []).then(setAssetCategories));
            }

            if (isAdmin || perms['asociados.view']) {
                const asocsResponse = await fetchSafe<any>('/asociados', { data: [], total: 0 });
                const asocs = Array.isArray(asocsResponse) ? asocsResponse : (asocsResponse.data || []);
                setAsociados(asocs);
                promises.push(fetchSafe<ReciboPagoAsociado[]>('/asociados/recibos', []).then(setRecibosPagoAsociados));
            }

            await Promise.all(promises);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, currentUser, fetchSafe, addToast]);

    useEffect(() => {
        if (!isAuthenticated) return;
        if (dataLoadedForUserRef.current === currentUser?.id || !currentUser) return;
        fetchData();
    }, [isAuthenticated, currentUser?.id, fetchData]);

    const handleGenericSave = async <T extends { id?: string; }>(item: T, endpoint: string, stateSetter: React.Dispatch<React.SetStateAction<T[]>>): Promise<T> => {
        const isUpdating = !!item.id;
        const method = isUpdating ? 'PUT' : 'POST';
        const url = isUpdating ? `${endpoint}/${item.id}` : endpoint;
        
        const payload = { ...item };
        if (!isUpdating) {
            delete payload.id;
        }

        const saved = await apiFetch<T>(url, { method, body: JSON.stringify(payload) });
        stateSetter(prev => isUpdating ? prev.map(i => (i as any).id === saved.id ? saved : i) : [saved, ...prev]);
        return saved;
    };

    return (
        <DataContext.Provider value={{
            invoices, clients, suppliers, vehicles, expenses, inventory, assets, assetCategories, 
            asociados, certificados, pagosAsociados, recibosPagoAsociados, remesas, dispatches, asientosManuales, isLoading,
            handleSaveClient: (c) => handleGenericSave(c, '/clients', setClients),
            handleDeleteClient: (id) => apiFetch(`/clients/${id}`, { method: 'DELETE' }).then(() => setClients(p => p.filter(i => i.id !== id))),
            handleSaveSupplier: (s) => handleGenericSave(s, '/suppliers', setSuppliers),
            handleDeleteSupplier: (id) => apiFetch(`/suppliers/${id}`, { method: 'DELETE' }).then(() => setSuppliers(p => p.filter(i => i.id !== id))),
            handleSaveInvoice: async (d) => {
                const inv = await apiFetch<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(d) });
                setInvoices(p => [inv, ...p]);
                return inv;
            },
            handleCreateCreditNote: async (id, r) => { await apiFetch(`/invoices/${id}/credit-note`, { method: 'POST', body: JSON.stringify({ motivo: r }) }); },
            handleCreateDebitNote: async (id, r) => { await apiFetch(`/invoices/${id}/debit-note`, { method: 'POST', body: JSON.stringify({ motivo: r }) }); },
            handleUpdateInvoice: async (d) => {
                const inv = await apiFetch<Invoice>(`/invoices/${d.id}`, { method: 'PUT', body: JSON.stringify(d) });
                if (inv && inv.id) {
                    setInvoices(p => p.map(i => i.id === inv.id ? inv : i));
                    return inv;
                }
                return null;
            },
            handleUpdateInvoiceStatuses: async (id, s) => {
                const current = invoices.find(i => i.id === id);
                const inv = await apiFetch<Invoice>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify({...current, ...s}) });
                setInvoices(p => p.map(i => i.id === id ? inv : i));
            },
            handleDeleteInvoice: async (id) => { await apiFetch(`/invoices/${id}`, { method: 'DELETE' }); setInvoices(p => p.map(i => i.id === id ? {...i, status: 'Anulada'} : i)); },
            handleSaveVehicle: (v) => handleGenericSave(v, '/vehicles', setVehicles),
            handleDeleteVehicle: async (id) => {
                try {
                    await apiFetch(`/vehicles/${id}`, { method: 'DELETE' });
                    setVehicles(p => p.filter(i => i.id !== id));
                    // El toast de éxito ya lo maneja la vista, así que no hace falta ponerlo aquí.
                } catch (error: any) {
                    console.error('Error deleting vehicle:', error);
                    throw error; // Lanzamos el error para que la vista lo atrape y muestre el Toast rojo
                }
            },
            handleAssignToVehicle: async (ids, vId) => {
                const resp = await apiFetch<{updatedInvoices: Invoice[]}>(`/vehicles/${vId}/assign-invoices`, { method: 'POST', body: JSON.stringify({invoiceIds: ids}) });
                const updatedInvoices = resp.updatedInvoices || [];
                if (Array.isArray(updatedInvoices)) {
                    const map = new Map(updatedInvoices.map(i => [i.id, i]));
                    setInvoices(p => p.map(i => map.get(i.id) || i));
                }
            },
            handleUnassignInvoice: async (id) => {
                const inv = invoices.find(i => i.id === id);
                const resp = await apiFetch<{updatedInvoice: Invoice}>(`/vehicles/${inv?.vehicleId}/unassign-invoice`, { method: 'POST', body: JSON.stringify({invoiceId: id}) });
                if (resp && resp.updatedInvoice) {
                    setInvoices(p => p.map(i => i.id === id ? resp.updatedInvoice : i));
                }
            },
            handleDispatchVehicle: async (vId) => {
                const resp = await apiFetch<{newRemesa: Remesa, updatedVehicle: Vehicle, updatedInvoices: Invoice[]}>(`/vehicles/${vId}/dispatch`, { method: 'POST' });
                setVehicles(p => p.map(v => v.id === vId ? resp.updatedVehicle : v));
                const updatedInvoices = resp.updatedInvoices || [];
                if (Array.isArray(updatedInvoices)) {
                    const map = new Map(updatedInvoices.map(i => [i.id, i]));
                    setInvoices(p => p.map(i => map.get(i.id) || i));
                }
                setRemesas(p => [resp.newRemesa, ...p]);
                return resp.newRemesa;
            },
            handleFinalizeTrip: async (vId) => {
                const resp = await apiFetch<{updatedVehicle: Vehicle, updatedInvoices: Invoice[]}>(`/vehicles/${vId}/finalize-trip`, { method: 'POST' });
                setVehicles(p => p.map(v => v.id === vId ? resp.updatedVehicle : v));
                const updatedInvoices = resp.updatedInvoices || [];
                if (Array.isArray(updatedInvoices)) {
                    const map = new Map(updatedInvoices.map(i => [i.id, i]));
                    setInvoices(p => p.map(i => map.get(i.id) || i));
                }
            },
            handleSaveExpense: (e) => handleGenericSave(e, '/expenses', setExpenses),
            handleDeleteExpense: (id) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }).then(() => setExpenses(p => p.filter(i => i.id !== id))),
            handleSaveAsset: (a) => handleGenericSave(a, '/assets', setAssets),
            handleDeleteAsset: (id) => apiFetch(`/assets/${id}`, { method: 'DELETE' }).then(() => setAssets(p => p.filter(i => i.id !== id))),
            handleSaveAssetCategory: (c) => handleGenericSave(c, '/asset-categories', setAssetCategories),
            handleDeleteAssetCategory: (id) => apiFetch(`/asset-categories/${id}`, { method: 'DELETE' }).then(() => setAssetCategories(p => p.filter(i => i.id !== id))),
            handleSaveAsociado: (a) => handleGenericSave(a, '/asociados', setAsociados),
            handleDeleteAsociado: (id) => apiFetch(`/asociados/${id}`, { method: 'DELETE' }).then(() => setAsociados(p => p.filter(i => i.id !== id))),
            handleSaveCertificado: async (c) => {
                await handleGenericSave(c, '/asociados/certificados', setCertificados);
                addToast({ type: 'success', title: 'Certificado Guardado', message: 'El certificado se ha guardado correctamente.' });
            },
            handleDeleteCertificado: async (id) => {
                await apiFetch(`/asociados/certificados/${id}`, { method: 'DELETE' });
                setCertificados(p => p.filter(i => i.id !== id));
                addToast({ type: 'success', title: 'Certificado Eliminado', message: 'El certificado ha sido eliminado.' });
            },
            handleSavePagoAsociado: (p) => handleGenericSave(p, '/asociados/pagos', setPagosAsociados),
            handleDeletePagoAsociado: (id) => apiFetch(`/asociados/pagos/${id}`, { method: 'DELETE' }).then(() => setPagosAsociados(p => p.filter(i => i.id !== id))),
            handleSaveRecibo: (r) => handleGenericSave(r, '/asociados/recibos', setRecibosPagoAsociados),
            handleDeleteRemesa: (id) => apiFetch(`/remesas/${id}`, { method: 'DELETE' }).then(() => setRemesas(p => p.filter(i => i.id !== id))),
            handleSaveAsientoManual: async (a) => {
                const body = {
                    date: a.fecha,
                    description: a.descripcion,
                    entries: a.entries.map(e => ({
                        cuentaContableId: e.cuentaId,
                        debe: e.debe,
                        haber: e.haber
                    }))
                };
                const saved = await apiFetch<AsientoManual>('/asientos-manuales', { method: 'POST', body: JSON.stringify(body) });
                setAsientosManuales(p => [saved, ...p]);
                addToast({ type: 'success', title: 'Asiento Guardado', message: 'El asiento contable se sincronizó con el backend.' });
            },
            handleDeleteAsientoManual: async (id) => { 
                await apiFetch(`/asientos-manuales/${id}`, { method: 'DELETE' });
                setAsientosManuales(p => p.filter(a => a.id !== id)); 
            },
            handleCreateDispatch: async (ids, vId, dId) => {
                const resp = await apiFetch<any>('/dispatches', { method: 'POST', body: JSON.stringify({invoiceIds: ids, vehicleId: vId, destinationOfficeId: dId, originOfficeId: currentUser?.officeId}) });
                
                // Si el backend devuelve el objeto de despacho directamente (como indica el usuario)
                // o si lo devuelve envuelto en { dispatch, updatedInvoices }
                const dispatchData = resp.dispatch || resp;
                const updatedInvoices = resp.updatedInvoices || [];

                if (Array.isArray(updatedInvoices) && updatedInvoices.length > 0) {
                    const map = new Map(updatedInvoices.map((i: any) => [i.id, i]));
                    setInvoices(p => p.map(i => map.get(i.id) || i));
                }

                setDispatches(prev => [dispatchData, ...prev]);
                return dispatchData;
            },
            handleReceiveDispatch: async (dId, ids) => {
                const resp = await apiFetch<{updatedDispatch: Dispatch, updatedInvoices: Invoice[]}>(`/dispatches/receive/${dId}`, { method: 'POST', body: JSON.stringify({verifiedInvoiceIds: ids, receivedBy: currentUser?.name}) });
                setDispatches(p => p.map(d => d.id === dId ? resp.updatedDispatch : d));
                const updatedInvoices = resp.updatedInvoices || [];
                if (Array.isArray(updatedInvoices)) {
                    const map = new Map(updatedInvoices.map(i => [i.id, i]));
                    setInvoices(p => p.map(i => map.get(i.id) || i));
                }
            },
            handleGenerateMassiveDebt: async (d) => { 
                // Ensure payload has montoBs if it only has monto
                const payload = { 
                    ...d, 
                    montoBs: (d as any).montoBs || (d as any).monto,
                    montoUsd: (d as any).montoUsd || ((d as any).monto / (d.tasaCambio || 1))
                };
                
                const resp = await apiFetch<any>('/asociados/deuda-masiva', { method: 'POST', body: JSON.stringify(payload) }); 
                
                // Handle different response formats: { newPayments: [] }, { data: [] }, or []
                let rawPayments: any[] = [];
                if (Array.isArray(resp)) {
                    rawPayments = resp;
                } else if (resp && resp.newPayments && Array.isArray(resp.newPayments)) {
                    rawPayments = resp.newPayments;
                } else if (resp && resp.data && Array.isArray(resp.data)) {
                    rawPayments = resp.data;
                }

                // Normalize payments to match PagoAsociado interface
                const newPayments: PagoAsociado[] = rawPayments.map(p => ({
                    id: String(p.id || p._id),
                    asociadoId: String(p.asociadoId || p.asociado_id),
                    concepto: p.concepto || payload.concepto,
                    cuotas: p.cuotas || payload.cuotas,
                    montoBs: Number(p.montoBs || p.monto_bs || p.monto || payload.montoBs),
                    montoUsd: Number(p.montoUsd || p.monto_usd || payload.montoUsd),
                    tasaCambio: Number(p.tasaCambio || p.tasa_cambio || payload.tasaCambio),
                    status: p.status || 'Pendiente',
                    reciboId: p.reciboId || p.recibo_id,
                    fecha: p.fecha || p.fecha_generacion || (payload as any).fecha || new Date().toISOString().split('T')[0]
                }));

                if (newPayments.length > 0) {
                    setPagosAsociados(prev => [...newPayments, ...prev]);
                } else {
                    // If no payments returned, refresh all data to be sure
                    await fetchData();
                }
                addToast({ type: 'success', title: 'Cargos Generados', message: `Se han generado cargos para ${d.asociadoIds?.length || 'los'} socios.` });
            },
            fetchAsociadoData: useCallback(async (asociadoId: string) => {
                const [debts, certs] = await Promise.all([
                    fetchSafe<PagoAsociado[]>(`/asociados/${asociadoId}/deudas`, []),
                    fetchSafe<Certificado[]>(`/asociados/${asociadoId}/certificados`, [])
                ]);
                setPagosAsociados(prev => [...prev.filter(p => p.asociadoId !== asociadoId), ...debts]);
                setCertificados(prev => [...prev.filter(c => !certs.find(cert => cert.id === c.id)), ...certs]);
            }, [fetchSafe])
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};
