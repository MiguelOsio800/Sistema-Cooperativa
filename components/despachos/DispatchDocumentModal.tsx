
import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dispatch, Invoice, Vehicle, CompanyInfo, Office, Asociado } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon, PrinterIcon } from '../icons/Icons';
import { calculateInvoiceChargeableWeight } from '../../utils/financials';

interface DispatchDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    dispatch: Dispatch;
    invoices: Invoice[];
    vehicle: Vehicle;
    asociado: Asociado;
    companyInfo: CompanyInfo;
    offices: Office[];
}

const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DispatchDocumentModal: React.FC<DispatchDocumentModalProps> = ({
    isOpen, onClose, dispatch, invoices, vehicle, asociado, companyInfo, offices
}) => {

    const originOffice = offices.find(o => o.id === dispatch.originOfficeId);
    
    // Sort invoices by destination to group them visually if needed, though usually listed sequentially
    const sortedInvoices = [...invoices].sort((a, b) => a.guide.destinationOfficeId.localeCompare(b.guide.destinationOfficeId));

    const totalPackages = sortedInvoices.reduce((sum, inv) => sum + inv.guide.merchandise.reduce((s, m) => s + m.quantity, 0), 0);
    const totalWeight = sortedInvoices.reduce((sum, inv) => sum + calculateInvoiceChargeableWeight(inv), 0);
    const totalAmount = sortedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const handleDownloadPdf = () => {
        const input = document.getElementById('dispatch-to-print');
        if (!input) return;

        html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgHeight = pdfWidth / ratio;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`Despacho_${dispatch.dispatchNumber}.pdf`);
        });
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Guía de Despacho # ${dispatch.dispatchNumber}`} size="4xl">
            <div id="dispatch-to-print" className="bg-white text-black font-sans p-10 leading-tight printable-area">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                    <div className="flex items-center gap-4">
                        {companyInfo.logoUrl && (
                            <img src={companyInfo.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                        )}
                        <div>
                            <h1 className="font-bold text-xl uppercase text-black">{companyInfo.name}</h1>
                            <p className="text-sm text-black">RIF: {companyInfo.rif}</p>
                            <p className="text-sm text-black">{companyInfo.address}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="font-bold text-xl uppercase text-black">ENCOMIENDAS RECIBIDAS</h2>
                        <p className="font-mono text-lg font-bold text-black">Nº CONTROL: {dispatch.dispatchNumber}</p>
                        <p className="text-sm text-black">Fecha: {new Date(dispatch.date).toLocaleDateString('es-VE')}</p>
                        <p className="text-sm text-black">Origen: <strong>{originOffice?.name || 'N/A'}</strong></p>
                    </div>
                </div>

                {/* Transport Info */}
                <div className="mb-6 p-4 border border-black rounded-sm bg-gray-50">
                    <h3 className="font-bold border-b border-black mb-2 pb-1 text-black">DATOS DE TRANSPORTE</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p className="text-black"><strong>Conductor:</strong> {vehicle.driver}</p>
                        <p className="text-black"><strong>Asociado:</strong> {asociado.nombre} ({asociado.codigo})</p>
                        <p className="text-black"><strong>Vehículo:</strong> {vehicle.modelo} - {vehicle.color}</p>
                        <p className="text-black"><strong>Placa:</strong> {vehicle.placa}</p>
                    </div>
                </div>

                {/* Main Table - Strict Black Text */}
                <table className="w-full border-collapse mb-6 text-sm">
                    <thead>
                        <tr className="bg-gray-200 border-t-2 border-b-2 border-black">
                            <th className="text-left py-2 px-2 text-black font-bold">Nº Factura</th>
                            <th className="text-left py-2 px-2 text-black font-bold">Nº Control</th>
                            <th className="text-left py-2 px-2 text-black font-bold">Destinatario / Oficina Destino</th>
                            <th className="text-center py-2 px-2 text-black font-bold">Piezas</th>
                            <th className="text-right py-2 px-2 text-black font-bold">Peso (Kg)</th>
                            <th className="text-right py-2 px-2 text-black font-bold">Monto Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInvoices.map((inv, index) => {
                            const piezas = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
                            const peso = calculateInvoiceChargeableWeight(inv);
                            const destOfficeName = offices.find(o => o.id === inv.guide.destinationOfficeId)?.name || 'N/A';
                            
                            return (
                                <tr key={inv.id} className="border-b border-gray-300">
                                    <td className="py-2 px-2 font-mono text-black">{inv.invoiceNumber}</td>
                                    <td className="py-2 px-2 text-black">{inv.controlNumber}</td>
                                    <td className="py-2 px-2">
                                        <div className="font-bold text-black">{inv.guide.receiver.name}</div>
                                        <div className="text-xs text-black">{destOfficeName}</div>
                                    </td>
                                    <td className="py-2 px-2 text-center text-black">{piezas}</td>
                                    <td className="py-2 px-2 text-right text-black">{peso.toFixed(2)}</td>
                                    <td className="py-2 px-2 text-right text-black">{formatCurrency(inv.totalAmount)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t-2 border-black font-bold bg-gray-100">
                        <tr>
                            <td colSpan={3} className="py-2 px-2 text-right uppercase text-black">Total General</td>
                            <td className="py-2 px-2 text-center text-black">{totalPackages}</td>
                            <td className="py-2 px-2 text-right text-black">{totalWeight.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right text-black">{formatCurrency(totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Signatures */}
                <div className="mt-16 grid grid-cols-2 gap-20 px-8">
                    <div className="text-center">
                        <div className="border-b border-black mb-2"></div>
                        <p className="font-bold text-black">DESPACHADO POR</p>
                        <p className="text-xs text-black">{originOffice?.name}</p>
                    </div>
                    <div className="text-center">
                        <div className="border-b border-black mb-2"></div>
                        <p className="font-bold text-black">RECIBIDO POR</p>
                        <p className="text-xs text-black">Firma y Sello Oficina Destino</p>
                    </div>
                </div>
                
                <div className="mt-12 text-center text-[10px] text-gray-500">
                    <p>Este documento certifica la transferencia de custodia de la mercancía listada.</p>
                </div>

            </div>
            <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700">
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
                <Button type="button" onClick={handleDownloadPdf}>
                    <PrinterIcon className="w-4 h-4 mr-2" />Imprimir Despacho
                </Button>
            </div>
        </Modal>
    );
};

export default DispatchDocumentModal;
