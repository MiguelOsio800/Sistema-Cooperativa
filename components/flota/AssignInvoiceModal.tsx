
import React, { useState, useMemo } from 'react';
import { Invoice, Vehicle, Office } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { calculateInvoiceChargeableWeight } from '../../utils/financials';
import { ExclamationTriangleIcon, TruckIcon } from '../icons/Icons';

interface AssignInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (invoiceIds: string[]) => void;
    vehicle: Vehicle;
    availableInvoices: Invoice[];
    allInvoices: Invoice[]; // all invoices to calculate current load
    offices: Office[];
}

const AssignInvoiceModal: React.FC<AssignInvoiceModalProps> = ({ isOpen, onClose, onAssign, vehicle, availableInvoices, allInvoices, offices }) => {
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

    const { currentLoadKg, selectedInvoicesWeight, newTotalLoad, isOverloaded } = useMemo(() => {
        // Calculate what is already on the truck
        const currentLoadKg = allInvoices
            .filter(i => i.vehicleId === vehicle.id)
            .reduce((sum, inv) => sum + calculateInvoiceChargeableWeight(inv), 0);
        
        // Calculate what is being selected
        const selectedInvoicesWeight = selectedInvoiceIds.reduce((sum, id) => {
            const invoice = availableInvoices.find(inv => inv.id === id);
            return sum + (invoice ? calculateInvoiceChargeableWeight(invoice) : 0);
        }, 0);
        
        const newTotalLoad = currentLoadKg + selectedInvoicesWeight;
        const isOverloaded = vehicle.capacidadCarga > 0 && newTotalLoad > vehicle.capacidadCarga;

        return { currentLoadKg, selectedInvoicesWeight, newTotalLoad, isOverloaded };
    }, [allInvoices, availableInvoices, selectedInvoiceIds, vehicle]);


    const handleToggleInvoice = (invoiceId: string) => {
        setSelectedInvoiceIds(prev =>
            prev.includes(invoiceId)
                ? prev.filter(id => id !== invoiceId)
                : [...prev, invoiceId]
        );
    };

    const handleAssignClick = () => {
        if (selectedInvoiceIds.length > 0) {
            onAssign(selectedInvoiceIds);
        }
    };

    const getOfficeName = (officeId: string) => offices.find(o => o.id === officeId)?.name || officeId;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Asignar Envíos a ${vehicle.modelo} - ${vehicle.placa}`}>
            <div className="space-y-4">
                {/* Stats Header */}
                <div className={`p-3 rounded-lg border ${isOverloaded ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TruckIcon className={`w-5 h-5 ${isOverloaded ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className={`font-semibold ${isOverloaded ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                            Capacidad del Vehículo: {vehicle.capacidadCarga} Kg
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-center">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                            <p className="text-gray-500 text-xs">Carga Actual</p>
                            <p className="font-bold">{currentLoadKg.toFixed(2)} Kg</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                            <p className="text-gray-500 text-xs">Selección</p>
                            <p className="font-bold text-blue-600">+{selectedInvoicesWeight.toFixed(2)} Kg</p>
                        </div>
                        <div className={`bg-white dark:bg-gray-800 p-2 rounded shadow-sm border ${isOverloaded ? 'border-red-500' : 'border-transparent'}`}>
                            <p className="text-gray-500 text-xs">Total Final</p>
                            <p className={`font-bold ${isOverloaded ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>
                                {newTotalLoad.toFixed(2)} Kg
                            </p>
                        </div>
                    </div>
                    {isOverloaded && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            <span>El vehículo excede su capacidad registrada, pero puede continuar.</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {availableInvoices.length > 0 ? availableInvoices.map(invoice => {
                        const weight = calculateInvoiceChargeableWeight(invoice);
                        return (
                            <div
                                key={invoice.id}
                                onClick={() => handleToggleInvoice(invoice.id)}
                                className={`p-3 border rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                                    selectedInvoiceIds.includes(invoice.id)
                                    ? 'bg-green-50 dark:bg-green-900/30 border-green-400 ring-2 ring-green-300'
                                    : 'bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <div>
                                    <p className="font-semibold text-primary-600 dark:text-primary-400">{invoice.invoiceNumber}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{invoice.clientName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm">{getOfficeName(invoice.guide.destinationOfficeId)}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{weight.toFixed(2)} kg</p>
                                </div>
                            </div>
                        )
                    }) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No hay facturas listas para despacho.</p>
                    )}
                </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 mt-2 border-t dark:border-gray-700">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                {/* Button is NOT disabled when overloaded, only when empty */}
                <Button onClick={handleAssignClick} disabled={selectedInvoiceIds.length === 0}>
                    Asignar ({selectedInvoiceIds.length}) Envíos
                </Button>
            </div>
        </Modal>
    );
};

export default AssignInvoiceModal;
