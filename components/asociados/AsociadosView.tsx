
import React, { useState, useEffect, useCallback } from 'react';
import { Asociado, Vehicle, Certificado, PagoAsociado, ReciboPagoAsociado, Permissions, CompanyInfo } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { SearchIcon, PlusIcon, UserIcon, ArrowLeftIcon, PlusCircleIcon, TrashIcon } from '../icons/Icons';
import AsociadoDetailView from './AsociadoDetailView';
import GenerarDeudaMasivaModal from './GenerarDeudaMasivaModal';
import { useToast } from '../ui/ToastProvider';
import { useData } from '../../contexts/DataContext';
import { apiFetch } from '../../utils/api';
import ConfirmationModal from '../ui/ConfirmationModal';

interface AsociadosGestionViewProps {
    asociados: Asociado[];
    onSaveAsociado: (asociado: Asociado) => Promise<void>;
    onDeleteAsociado: (asociadoId: string) => Promise<void>;
    vehicles: Vehicle[];
    onSaveVehicle: (vehicle: Vehicle) => Promise<void>;
    onDeleteVehicle: (vehicleId: string) => Promise<void>;
    certificados: Certificado[];
    onSaveCertificado: (certificado: Certificado) => Promise<void>;
    onDeleteCertificado: (certificadoId: string) => Promise<void>;
    pagos: PagoAsociado[];
    onSavePago: (pago: PagoAsociado) => Promise<void>;
    onDeletePago: (pagoId: string) => Promise<void>;
    recibos: ReciboPagoAsociado[];
    onSaveRecibo: (recibo: ReciboPagoAsociado) => Promise<void>;
    permissions: Permissions;
    companyInfo: CompanyInfo;
}

const AsociadosGestionView: React.FC<AsociadosGestionViewProps> = (props) => {
    const { permissions, onSaveAsociado, onDeleteAsociado, onSavePago } = props;
    const { handleGenerateMassiveDebt } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsociado, setSelectedAsociado] = useState<Asociado | null>(null);
    const [isMassiveDebtModalOpen, setIsMassiveDebtModalOpen] = useState(false);
    
    // Pagination and Loading State
    const [asociadosData, setAsociadosData] = useState<Asociado[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    
    // Confirmation Modal State
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [asociadoToDelete, setAsociadoToDelete] = useState<string | null>(null);

    const { addToast } = useToast();

    const fetchAsociados = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch<any>(`/asociados?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`);
            if (res && res.data) {
                setAsociadosData(res.data);
                setTotal(res.total || 0);
            } else if (Array.isArray(res)) {
                setAsociadosData(res);
                setTotal(res.length);
            }
        } catch (error) {
            console.error('Error fetching asociados:', error);
            addToast({ type: 'error', title: 'Error', message: 'No se pudieron cargar los asociados.' });
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, searchTerm, addToast]);

    useEffect(() => {
        fetchAsociados();
    }, [fetchAsociados]);

    const handleSelectAsociado = (asociado: Asociado) => {
        setSelectedAsociado(asociado);
    };
    
    const handleCreateNew = () => {
        const newAsociado: Asociado = {
            id: '',
            codigo: '',
            nombre: '',
            cedula: '',
            fechaNacimiento: new Date().toISOString().split('T')[0],
            fechaIngreso: new Date().toISOString().split('T')[0],
            telefono: '',
            correoElectronico: '',
            direccion: '',
            observaciones: '',
            status: 'Activo',
        };
        setSelectedAsociado(newAsociado);
    };

    const handleBackToList = () => {
        setSelectedAsociado(null);
        fetchAsociados(); // Refresh data when going back
    };
    
    const handleGenerateMassiveDebtSubmit = async (debtData: {
        concepto: string,
        cuotas: string,
        montoBs: number,
        montoUsd: number,
        fechaVencimiento: string,
        applyTo: 'Activo' | 'Todos'
    }) => {
        await handleGenerateMassiveDebt(debtData);
        setIsMassiveDebtModalOpen(false);
    };

    const confirmDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setAsociadoToDelete(id);
        setIsConfirmDeleteOpen(true);
    };

    const executeDelete = async () => {
        if (!asociadoToDelete) return;
        setIsLoading(true);
        try {
            await onDeleteAsociado(asociadoToDelete);
            addToast({ type: 'success', title: 'Eliminado', message: 'Asociado eliminado correctamente.' });
            fetchAsociados();
        } catch (error: any) {
            console.error('Error deleting asociado:', error);
            addToast({ 
                type: 'error', 
                title: 'Error', 
                message: error.message || 'No se pudo eliminar el asociado.' 
            });
        } finally {
            setIsLoading(false);
            setIsConfirmDeleteOpen(false);
            setAsociadoToDelete(null);
        }
    };

    
    if (selectedAsociado) {
        return <AsociadoDetailView 
            asociado={selectedAsociado} 
            onBack={handleBackToList}
            onSaveAsociado={onSaveAsociado}
            onDeleteAsociado={onDeleteAsociado}
            vehicles={props.vehicles}
            onSaveVehicle={props.onSaveVehicle}
            onDeleteVehicle={props.onDeleteVehicle}
            certificados={props.certificados}
            onSaveCertificado={props.onSaveCertificado}
            onDeleteCertificado={props.onDeleteCertificado}
            permissions={props.permissions}
        />
    }

    return (
        <div className="space-y-4">
             <Button variant="secondary" onClick={() => window.location.hash = 'asociados'}>
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Volver al Módulo de Asociados
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <CardTitle>Búsqueda de Asociados</CardTitle>
                         <div className="flex items-center gap-2">
                            {permissions['asociados.create'] && (
                                <Button onClick={() => setIsMassiveDebtModalOpen(true)} variant="secondary">
                                    <PlusCircleIcon className="w-4 h-4 mr-2" /> Generar Deuda Masiva
                                </Button>
                            )}
                            {permissions['asociados.create'] && (
                                 <Button onClick={handleCreateNew}>
                                    <PlusIcon className="w-4 h-4 mr-2" /> Nuevo Asociado
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 max-w-lg">
                        <Input 
                            label=""
                            id="search-asociados" 
                            placeholder="Buscar por código, nombre o cédula..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            icon={<SearchIcon className="w-4 h-4 text-gray-400"/>} 
                        />
                    </div>
                </CardHeader>

                <div className="mt-4 space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : asociadosData.length > 0 ? asociadosData.map(asociado => (
                         <div key={asociado.id} 
                            className="p-4 border dark:border-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer group"
                            onClick={() => handleSelectAsociado(asociado)}
                         >
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                    <UserIcon className="w-6 h-6 text-gray-600 dark:text-gray-400"/>
                                </div>
                                <div>
                                    <p className="font-bold text-primary-600 dark:text-primary-400">{asociado.nombre}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Código: {asociado.codigo} - C.I: {asociado.cedula}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${asociado.status === 'Activo' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                    {asociado.status}
                                </span>
                                {permissions['asociados.delete'] && (
                                    <Button 
                                        variant="danger"
                                        size="sm"
                                        className="!p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => confirmDelete(asociado.id, e)}
                                        title="Eliminar Asociado"
                                        disabled={isLoading || !asociado.id}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No se encontraron asociados.</p>
                            {searchTerm && <p className="text-sm">Intente con otro término de búsqueda.</p>}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {!isLoading && total > limit && (
                    <div className="flex justify-between items-center mt-6 pt-4 border-t dark:border-gray-700">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total}
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                            >
                                Anterior
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * limit >= total || isLoading}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
            <GenerarDeudaMasivaModal
                isOpen={isMassiveDebtModalOpen}
                onClose={() => setIsMassiveDebtModalOpen(false)}
                onGenerate={handleGenerateMassiveDebtSubmit}
                companyInfo={props.companyInfo}
            />
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                title="Eliminar Asociado"
                message="¿Estás seguro de que deseas eliminar este asociado? Esta acción no se puede deshacer."
                onConfirm={executeDelete}
                onCancel={() => {
                    setIsConfirmDeleteOpen(false);
                    setAsociadoToDelete(null);
                }}
            />
        </div>
    );
};

export default AsociadosGestionView;
