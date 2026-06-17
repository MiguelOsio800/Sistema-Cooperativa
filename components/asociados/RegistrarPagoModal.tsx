import React, { useState, useEffect, useMemo } from 'react';
import { PagoAsociado, Asociado, ReciboPagoAsociado, CompanyInfo } from '../../types';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { PlusIcon, TrashIcon } from '../icons/Icons';

interface RegistrarPagoModalProps {
    isOpen: boolean;
    onClose: () => void;
    asociado: Asociado;
    pagosPendientes: PagoAsociado[];
    onSaveRecibo: (recibo: ReciboPagoAsociado) => void;
    onUpdatePago?: (pago: PagoAsociado) => void;
    companyInfo: CompanyInfo;
    recibosAsociado: ReciboPagoAsociado[];
}

type DetallePago = {
    tipo: string;
    banco?: string;
    referencia?: string;
    monto: number;
}

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RegistrarPagoModal: React.FC<RegistrarPagoModalProps> = ({ isOpen, onClose, asociado, pagosPendientes, onSaveRecibo, onUpdatePago, companyInfo, recibosAsociado }) => {
    const [selectedPagoIds, setSelectedPagoIds] = useState<string[]>([]);
    const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
    const [detallesPago, setDetallesPago] = useState<DetallePago[]>([{ tipo: 'Transferencia', monto: 0 }]);
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

    const getOriginalAmount = (p: PagoAsociado) => Math.abs((p.tasaCambio && p.montoUsd) ? (p.montoUsd * p.tasaCambio) : p.montoBs);

    const getCuotaInfo = (p: PagoAsociado) => {
        if (!p.cuotas || p.cuotas === '1/1' || p.cuotas.toLowerCase() === 'única') return null;
        const match = p.cuotas.match(/^(\d+)\/(\d+)$/);
        if (!match) return null;
        const paid = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        const remaining = total - paid;
        if (remaining <= 1) return null; // If 1 or 0 left, equivalent to total
        
        const currentAmount = getOriginalAmount(p);
        const valuePerCuota = currentAmount / remaining;
        return { remaining, valuePerCuota };
    };

    const totalAPagar = useMemo(() => {
        return selectedPagoIds.reduce((sum, id) => sum + (paymentAmounts[id] || 0), 0);
    }, [selectedPagoIds, paymentAmounts]);

    const totalPagado = useMemo(() => {
        return detallesPago.reduce((sum, d) => sum + (Number(d.monto) || 0), 0);
    }, [detallesPago]);

    // If totalAPagar is negative (Coop owes Socio), we expect the user to enter a positive payment amount.
    // We compare the absolute values to see if the payment matches the debt.
    const isCoopDebt = false; // Logic simplified since amounts are absolute
    const expectedPayment = Math.abs(totalAPagar);
    const diferencia = expectedPayment - totalPagado;

    useEffect(() => {
        if (isOpen) {
            // Pre-select all pending payments when modal opens
            setSelectedPagoIds(pagosPendientes.map(p => p.id));
            const initialAmounts: Record<string, number> = {};
            pagosPendientes.forEach(p => {
                initialAmounts[p.id] = getOriginalAmount(p);
            });
            setPaymentAmounts(initialAmounts);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    
    useEffect(() => {
        // When total to pay changes, update the first payment detail amount automatically
        if (detallesPago.length === 1) {
            setDetallesPago([{ ...detallesPago[0], monto: expectedPayment }]);
        }
    }, [expectedPayment]);

    const handlePaymentAmountChange = (pagoId: string, amount: number) => {
        setPaymentAmounts(prev => ({ ...prev, [pagoId]: amount }));
    };

    const handleTogglePago = (pagoId: string) => {
        setSelectedPagoIds(prev =>
            prev.includes(pagoId) ? prev.filter(id => id !== pagoId) : [...prev, pagoId]
        );
    };

    const handleDetalleChange = (index: number, field: keyof DetallePago, value: string | number) => {
        const newDetalles = [...detallesPago];
        (newDetalles[index] as any)[field] = value;
        setDetallesPago(newDetalles);
    };
    
    const addDetalle = () => {
        setDetallesPago([...detallesPago, { tipo: 'Transferencia', monto: 0 }]);
    };
    
    const removeDetalle = (index: number) => {
        setDetallesPago(detallesPago.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        // Handle precision issues by rounding difference to 2 decimals
        if (Math.abs(diferencia) > 0.01) {
            alert('El monto pagado debe ser igual al total a pagar.');
            return;
        }
        if (selectedPagoIds.length === 0) {
            alert('Debe seleccionar al menos un concepto a pagar.');
            return;
        }

        const bcvRate = companyInfo.bcvRate || 1;
        const fullyPaidIds: string[] = [];
        const conceptosPagados: { descripcion: string; montoBs: number }[] = [];

        // Determine partial payments and execute them
        for (const id of selectedPagoIds) {
            const pago = pagosPendientes.find(p => p.id === id);
            if (!pago) continue;

            const originalAmount = getOriginalAmount(pago);
            const paidAmount = paymentAmounts[id] || 0;
            
            if (paidAmount > 0) {
                conceptosPagados.push({ descripcion: pago.concepto, montoBs: paidAmount });
            }

            if (paidAmount >= originalAmount - 0.01) {
                fullyPaidIds.push(id);
                // Also update to Pagado locally/remotely in case JSON-Server is used and backend doesn't side-effect it
                if (onUpdatePago) {
                    let finalCuotas = pago.cuotas;
                    const match = (pago.cuotas || '').match(/^(\d+)\/(\d+)$/);
                    if (match) {
                        finalCuotas = `${match[2]}/${match[2]}`;
                    }
                    await onUpdatePago({ ...pago, status: 'Pagado', cuotas: finalCuotas });
                }
            } else if (onUpdatePago) {
                // Partial payment
                const newMontoBs = pago.montoBs > 0 ? pago.montoBs - (pago.tasaCambio ? paidAmount : paidAmount) : pago.montoBs + paidAmount;
                const newMontoUsd = pago.montoUsd ? (pago.montoUsd > 0 ? pago.montoUsd - (paidAmount / pago.tasaCambio!) : pago.montoUsd + (paidAmount / pago.tasaCambio!)) : pago.montoUsd;

                const match = (pago.cuotas || '0/1').match(/^(\d+)\/(\d+)$/);
                let newCuotas = pago.cuotas;
                if (match) {
                    const currentPagadas = parseInt(match[1]);
                    const limitCuotas = parseInt(match[2]);
                    const remaining = limitCuotas - currentPagadas;
                    if (remaining > 0) {
                        const valuePerCuota = originalAmount / remaining;
                        const cuotasToPayRound = Math.round(paidAmount / valuePerCuota);
                        const cuotasPaid = Math.max(1, cuotasToPayRound);
                        newCuotas = `${Math.min(currentPagadas + cuotasPaid, limitCuotas - 1)}/${limitCuotas}`;
                    }
                }

                await onUpdatePago({
                    ...pago,
                    montoBs: newMontoBs,
                    montoUsd: newMontoUsd,
                    cuotas: newCuotas,
                });
            }
        }

        const nextNumber = recibosAsociado.length > 0 
            ? Math.max(...recibosAsociado.map(r => parseInt(r.comprobanteNumero || '0', 10))) + 1 
            : 1;

        const payloadDetalles = [
            ...detallesPago,
            { tipo: 'SYS_CONCEPTOS', referencia: JSON.stringify(conceptosPagados), monto: 0 }
        ];

        const recibo: Omit<ReciboPagoAsociado, 'id'> = {
            comprobanteNumero: String(nextNumber).padStart(6, '0'),
            asociadoId: asociado.id,
            fechaPago: fechaPago,
            montoTotalBs: totalAPagar,
            montoTotalUsd: bcvRate > 0 ? totalAPagar / bcvRate : 0,
            tasaBcv: bcvRate,
            pagosIds: fullyPaidIds, // Only fully paid IDs are passed to be closed
            conceptosPagados: conceptosPagados,
            detallesPago: payloadDetalles,
        };
        onSaveRecibo(recibo as ReciboPagoAsociado);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Pago para ${asociado.nombre}`} size="2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Conceptos a Pagar */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Conceptos a Pagar</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border p-2 rounded-md">
                        {pagosPendientes.map(pago => (
                            <label key={pago.id} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                                <div className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedPagoIds.includes(pago.id)}
                                        onChange={() => handleTogglePago(pago.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="ml-3 flex-grow flex justify-between text-sm">
                                        <span>{pago.concepto} {pago.cuotas && pago.cuotas !== "1/1" ? `(Cuotas: ${pago.cuotas})` : ''}</span>
                                        <div className="text-right">
                                            <span className="font-semibold block">
                                                {formatCurrency(getOriginalAmount(pago))}
                                            </span>
                                            {pago.tasaCambio && pago.montoUsd && (
                                                <span className="text-[10px] text-gray-500 block">
                                                    ${Math.abs(pago.montoUsd).toFixed(2)} x {pago.tasaCambio}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedPagoIds.includes(pago.id) && (
                                    <div className="mt-2 pl-7 flex flex-col space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Abonar (Bs):</span>
                                            <div className="flex items-center space-x-2">
                                                {getCuotaInfo(pago) && (
                                                    <select
                                                        onChange={(e) => {
                                                            const numCuotas = parseInt(e.target.value, 10);
                                                            if (!isNaN(numCuotas) && numCuotas > 0) {
                                                                handlePaymentAmountChange(pago.id, getCuotaInfo(pago)!.valuePerCuota * numCuotas);
                                                            }
                                                            e.target.value = ''; // reset after selection
                                                        }}
                                                        className="text-xs px-2 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 rounded hover:bg-primary-200 outline-none cursor-pointer"
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Abonar N Cuotas...</option>
                                                        {Array.from({ length: getCuotaInfo(pago)!.remaining }, (_, i) => i + 1).map((n) => (
                                                            <option key={n} value={n}>{n} Cuota{n > 1 ? 's' : ''}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handlePaymentAmountChange(pago.id, getOriginalAmount(pago));
                                                    }}
                                                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300"
                                                >
                                                    Total
                                                </button>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={paymentAmounts[pago.id] || ''}
                                                    onChange={e => handlePaymentAmountChange(pago.id, Number(e.target.value))}
                                                    className="w-28 border border-gray-300 p-1 rounded-md text-right focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                                    max={getOriginalAmount(pago)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Detalles del Pago */}
                <div className="space-y-3">
                     <h3 className="font-semibold text-lg">Detalles del Pago</h3>
                     <Input label="Fecha de Pago" type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
                     <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                         {detallesPago.map((detalle, index) => (
                             <div key={index} className="p-3 border rounded-md relative space-y-2">
                                 {detallesPago.length > 1 && (
                                    <button onClick={() => removeDetalle(index)} className="absolute top-1 right-1 text-red-500 hover:text-red-700">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                 )}
                                <Select label="Forma de Pago" value={detalle.tipo} onChange={e => handleDetalleChange(index, 'tipo', e.target.value)}>
                                    <option>Transferencia</option>
                                    <option>Efectivo Bs.</option>
                                    <option>Efectivo Divisa</option>
                                    <option>Pago Móvil</option>
                                </Select>
                                <Input label="Banco" value={detalle.banco || ''} onChange={e => handleDetalleChange(index, 'banco', e.target.value)} />
                                <Input label="Referencia" value={detalle.referencia || ''} onChange={e => handleDetalleChange(index, 'referencia', e.target.value)} />
                                <Input label="Monto" type="number" step="0.01" value={detalle.monto} onChange={e => handleDetalleChange(index, 'monto', Number(e.target.value))} required />
                             </div>
                         ))}
                     </div>
                     <Button variant="secondary" size="sm" onClick={addDetalle} className="w-full">
                        <PlusIcon className="w-4 h-4 mr-1"/> Añadir otra forma de pago
                     </Button>
                </div>
            </div>

            {/* Totales y Submit */}
            <div className="mt-6 pt-4 border-t dark:border-gray-700 space-y-2">
                <div className="flex justify-between font-semibold text-lg">
                    <span>{isCoopDebt ? 'Total a Pagar al Socio:' : 'Total a Pagar a la Coop:'}</span>
                    <span className={isCoopDebt ? 'text-red-600' : ''}>{formatCurrency(expectedPayment)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                    <span>Total Pagado:</span>
                    <span>{formatCurrency(totalPagado)}</span>
                </div>
                <div className={`flex justify-between font-bold text-xl p-2 rounded-md ${diferencia === 0 ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'}`}>
                    <span>Diferencia:</span>
                    <span>{formatCurrency(diferencia)}</span>
                </div>
            </div>

             <div className="flex justify-end space-x-2 pt-4 mt-4">
                <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={diferencia !== 0 || selectedPagoIds.length === 0}>Confirmar Pago</Button>
            </div>
        </Modal>
    );
};

export default RegistrarPagoModal;