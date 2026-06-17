
import React, { useState, useMemo } from 'react';
import { Asociado, CompanyInfo, Remesa, PagoAsociado, Invoice, ShippingType } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';
import { useConfig } from '../../contexts/ConfigContext';
import { calculateDetailedRemesaFinancials } from '../../utils/financials';
import Select from '../ui/Select';

interface GenerarDeudaProduccionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (pago: PagoAsociado) => Promise<void>;
    asociado: Asociado;
    remesas: Remesa[];
    invoices: Invoice[];
    shippingTypes: ShippingType[];
    companyInfo: CompanyInfo;
}

type DebtType = 'pasajeros' | 'carga';

const formatCurrency = (amount: number) => amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const GenerarDeudaProduccionModal: React.FC<GenerarDeudaProduccionModalProps> = ({ isOpen, onClose, onGenerate, asociado, remesas, invoices, shippingTypes, companyInfo }) => {
    const { addToast } = useToast();
    const [debtType, setDebtType] = useState<DebtType>('pasajeros');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for Pasajeros
    const [pasajerosTarifa, setPasajerosTarifa] = useState<'divisa' | 'bs'>('divisa');
    const bcvRate = companyInfo.bcvRate || 1;

    // State for Carga
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [calculation, setCalculation] = useState<{ total: number; debt: number; debtsByRemesa?: { remesaNumber: string; debt: number; }[] } | null>(null);

    const handleCalculateCarga = () => {
        if (!startDate || !endDate) {
            addToast({ type: 'warning', title: 'Fechas Requeridas', message: 'Por favor, seleccione un rango de fechas.' });
            return;
        }

        // Filtramos las remesas que pertenecen al asociado y están en el rango de fechas
        const relevantRemesas = remesas.filter(remesa => {
            if (String(remesa.asociadoId) !== String(asociado.id)) return false;
            
            const remesaDateStr = remesa.date.split('T')[0];
            const startStr = startDate.split('T')[0];
            const endStr = endDate.split('T')[0];
            return remesaDateStr >= startStr && remesaDateStr <= endStr;
        });

        let totalFacturado = 0;
        let totalNetBalance = 0;
        const debtsByRemesa: { remesaNumber: string, debt: number }[] = [];

        relevantRemesas.forEach(remesa => {
            totalFacturado += remesa.totalAmount;
            
            const remesaInvoices = invoices.filter(inv => remesa.invoiceIds.includes(inv.id));
            
            const financials = calculateDetailedRemesaFinancials(remesaInvoices, companyInfo, shippingTypes, asociado);
            
            // If saldoFinal is > 0, it means the driver owes the cooperative
            if (financials.saldoFinal > 0) {
                totalNetBalance += financials.saldoFinal;
                debtsByRemesa.push({ remesaNumber: remesa.remesaNumber || remesa.id, debt: financials.saldoFinal });
            }
        });

        // The debt is now only the sum of positive balances
        setCalculation({ total: totalFacturado, debt: totalNetBalance, debtsByRemesa });
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let newPago: Omit<PagoAsociado, 'id' | 'reciboId'> | null = null;
        
        if (debtType === 'pasajeros') {
            const montoBs = pasajerosTarifa === 'divisa' ? 50 * bcvRate : 70 * bcvRate;
            newPago = {
                asociadoId: asociado.id,
                concepto: `Producción de Pasajeros (Tarifa ${pasajerosTarifa === 'divisa' ? '$50' : '$70'})`,
                cuotas: 'Única',
                montoBs: montoBs,
                montoUsd: montoBs / bcvRate,
                tasaCambio: bcvRate,
                status: 'Pendiente',
                fecha: new Date().toISOString().split('T')[0]
            };

            setIsSubmitting(true);
            try {
                await onGenerate(newPago as PagoAsociado);
                addToast({ type: 'success', title: 'Deuda Generada', message: `Se generó la deuda por ${newPago.concepto}` });
                onClose();
            } catch (error: any) {
                addToast({ type: 'error', title: 'Error', message: error.message || 'No se pudo generar la deuda.' });
            } finally {
                setIsSubmitting(false);
            }

        } else { // Carga
            if (!calculation || calculation.debt === 0 || !calculation.debtsByRemesa || calculation.debtsByRemesa.length === 0) {
                addToast({ type: 'warning', title: 'Cálculo Requerido', message: 'Debe calcular la deuda antes de generarla o el saldo neto es 0.' });
                return;
            }
            
            setIsSubmitting(true);
            try {
                // Generate a debt for each remesa where Destino > Pagado
                for (const remesaDebt of calculation.debtsByRemesa) {
                    const individualPago = {
                        asociadoId: asociado.id,
                        concepto: `Producción de Carga - Remesa N° ${remesaDebt.remesaNumber}`,
                        cuotas: 'Única',
                        montoBs: remesaDebt.debt,
                        montoUsd: remesaDebt.debt / bcvRate,
                        tasaCambio: bcvRate,
                        status: 'Pendiente',
                        fecha: new Date().toISOString().split('T')[0]
                    };
                    await onGenerate(individualPago as PagoAsociado);
                }
                addToast({ type: 'success', title: 'Deudas Generadas', message: `Se generaron ${calculation.debtsByRemesa.length} deudas por remesas.` });
                onClose();
            } catch (error: any) {
                addToast({ type: 'error', title: 'Error', message: error.message || 'No se pudieron generar las deudas.' });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Generar Deuda por Producción para ${asociado.nombre}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Debt Type Selector */}
                <div className="flex rounded-md shadow-sm">
                    <button type="button" onClick={() => setDebtType('pasajeros')} className={`px-4 py-2 text-sm font-medium border rounded-l-md w-1/2 ${debtType === 'pasajeros' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50'}`}>
                        Transporte de Pasajeros
                    </button>
                    <button type="button" onClick={() => setDebtType('carga')} className={`px-4 py-2 text-sm font-medium border rounded-r-md w-1/2 ${debtType === 'carga' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50'}`}>
                        Transporte de Carga
                    </button>
                </div>

                {/* Pasajeros Section */}
                {debtType === 'pasajeros' && (
                    <div className="p-4 border rounded-md dark:border-gray-600 space-y-3">
                        <h3 className="font-semibold">Tarifa Fija para Pasajeros</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Seleccione la tarifa a aplicar para generar la deuda.</p>
                        <Select label="Tarifa" value={pasajerosTarifa} onChange={e => setPasajerosTarifa(e.target.value as any)}>
                            <option value="divisa">Pago en Divisa Física ($50.00)</option>
                            <option value="bs">Pago en Bolívares ($70.00 equiv.)</option>
                        </Select>
                         <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-center">
                            <p className="text-sm">Monto a registrar en Bolívares:</p>
                            <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                {formatCurrency(pasajerosTarifa === 'divisa' ? 50 * bcvRate : 70 * bcvRate)}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Carga Section */}
                {debtType === 'carga' && (
                    <div className="p-4 border rounded-md dark:border-gray-600 space-y-3">
                        <h3 className="font-semibold">Cálculo Semanal para Carga</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Seleccione el rango de fechas para calcular la producción del asociado.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Desde" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <Input label="Hasta" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <Button type="button" variant="secondary" onClick={handleCalculateCarga} className="w-full">Calcular Producción</Button>
                        {calculation && (
                             <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-center">
                                <p className="text-sm">Total Facturado en período: Bs. {formatCurrency(calculation.total)}</p>
                                <p className="text-sm mt-2">Monto de Deuda Calculado:</p>
                                <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                    {formatCurrency(calculation.debt)}
                                </p>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700 mt-6">
                    <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Generando...' : 'Generar Deuda'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default GenerarDeudaProduccionModal;
