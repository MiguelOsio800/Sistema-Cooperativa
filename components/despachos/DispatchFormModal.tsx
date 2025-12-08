
import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Asociado, Vehicle, Office } from '../../types';

interface DispatchFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (vehicleId: string, destinationOfficeId: string) => void;
    asociados: Asociado[];
    vehicles: Vehicle[];
    invoiceCount: number;
    offices: Office[];
}

const DispatchFormModal: React.FC<DispatchFormModalProps> = ({ isOpen, onClose, onConfirm, asociados, vehicles, invoiceCount, offices }) => {
    const [selectedAsociadoId, setSelectedAsociadoId] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedDestinationId, setSelectedDestinationId] = useState('');

    const availableVehicles = useMemo(() => {
        if (!selectedAsociadoId) return [];
        // SHOW ALL VEHICLES, DO NOT FILTER BY STATUS
        return vehicles.filter(v => v.asociadoId === selectedAsociadoId);
    }, [vehicles, selectedAsociadoId]);

    const handleSubmit = () => {
        if (selectedVehicleId && selectedDestinationId) {
            onConfirm(selectedVehicleId, selectedDestinationId);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generar Despacho Inter-Oficina">
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    Se van a despachar <strong>{invoiceCount}</strong> encomiendas. Configure el destino y el transporte.
                </p>

                <Select 
                    label="Oficina de Destino / Ruta"
                    value={selectedDestinationId}
                    onChange={e => setSelectedDestinationId(e.target.value)}
                    required
                >
                    <option value="">-- Seleccionar Destino --</option>
                    {offices.map(office => (
                        <option key={office.id} value={office.id}>{office.name}</option>
                    ))}
                </Select>

                <Select 
                    label="Asociado / Conductor" 
                    value={selectedAsociadoId} 
                    onChange={e => setSelectedAsociadoId(e.target.value)}
                >
                    <option value="">-- Seleccionar Asociado --</option>
                    {asociados.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                    ))}
                </Select>

                <Select 
                    label="Vehículo" 
                    value={selectedVehicleId} 
                    onChange={e => setSelectedVehicleId(e.target.value)}
                    disabled={!selectedAsociadoId}
                >
                    <option value="">-- Seleccionar Vehículo --</option>
                    {availableVehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.modelo} - {v.placa} ({v.driver}) {v.status !== 'Disponible' ? `(${v.status})` : ''}</option>
                    ))}
                </Select>

                <div className="flex justify-end pt-4 space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={!selectedVehicleId || !selectedDestinationId}>
                        Confirmar y Generar Documento
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default DispatchFormModal;
