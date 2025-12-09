
import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dispatch, Invoice, Vehicle, CompanyInfo, Office, Asociado } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon } from '../icons/Icons';
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
    
    // Sort invoices by destination to group them visually
    const sortedInvoices = [...invoices].sort((a, b) => a.guide.destinationOfficeId.localeCompare(b.guide.destinationOfficeId));

    const totalPackages = sortedInvoices.reduce((sum, inv) => sum + inv.guide.merchandise.reduce((s, m) => s + m.quantity, 0), 0);
    const totalWeight = sortedInvoices.reduce((sum, inv) => sum + calculateInvoiceChargeableWeight(inv), 0);
    const totalAmount = sortedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const handleDownloadPdf = () => {
        const input = document.getElementById('dispatch-to-print');
        if (!input) return;

        // Use standard A4 dimensions at 96 DPI approx
        const a4Width = 794; 
        
        html2canvas(input, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            width: a4Width, // Force the canvas width
            windowWidth: 1200, // Simulate a desktop browser width
            x: 0,
            y: 0
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight; // Fix for multipage
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
            {/* Wrapper to handle scrolling for the fixed-width document */}
            <div className="flex justify-center bg-gray-100 dark:bg-gray-800 py-4 rounded-lg overflow-auto max-h-[75vh]">
                {/* Fixed A4 Size Container */}
                <div 
                    id="dispatch-to-print" 
                    className="bg-white text-black font-mono text-[11px] leading-tight printable-area shadow-xl"
                    style={{ 
                        width: '794px', 
                        minHeight: '1123px', 
                        padding: '40px', 
                        boxSizing: 'border-box'
                    }}
                >
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 text-black">
                        <div className="w-1/2">
                            <h1 className="font-bold text-sm text-black uppercase">{companyInfo.name}</h1>
                            <p className="text-[10px] text-black">RIF: {companyInfo.rif}</p>
                            <p className="text-[10px] text-black">{companyInfo.address}</p>
                        </div>
                        <div className="text-right w-1/2 text-black">
                            <h2 className="font-bold text-base uppercase text-black">ENCOMIENDAS RECIBIDAS</h2>
                            <p className="font-bold text-black">Nº CONTROL: {dispatch.dispatchNumber}</p>
                            <p className="text-black">Fecha: {new Date(dispatch.date).toLocaleDateString('es-VE')}</p>
                            <p className="text-black">Origen: {originOffice?.name || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="text-center font-bold text-[11px] mb-2 text-black border-t border-b border-black py-1 uppercase">
                        Manifiesto de Carga Inter-Oficina
                    </div>

                    {/* Transport Info */}
                    <div className="mb-4 text-black p-2 border border-black rounded-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <p className="text-black"><strong>Conductor:</strong> {vehicle.driver}</p>
                            <p className="text-black"><strong>Asociado:</strong> {asociado.nombre} ({asociado.codigo})</p>
                            <p className="text-black"><strong>Vehículo:</strong> {vehicle.modelo} - {vehicle.color}</p>
                            <p className="text-black"><strong>Placa:</strong> {vehicle.placa}</p>
                        </div>
                    </div>

                    {/* Main Table - Fixed Layout */}
                    <table className="w-full border-collapse mb-6 text-[11px] text-black table-fixed">
                        <thead className="border-t-2 border-b-2 border-black">
                            <tr>
                                <th className="text-left py-1 text-black w-[15%]">Nº Factura</th>
                                <th className="text-left py-1 text-black w-[15%]">Nº Control</th>
                                <th className="text-left py-1 text-black w-[25%] pl-2">Destinatario</th>
                                <th className="text-left py-1 text-black w-[20%]">Oficina Destino</th>
                                <th className="text-center py-1 text-black w-[8%]">Pzas</th>
                                <th className="text-right py-1 text-black w-[17%]">Monto Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {sortedInvoices.map((inv) => {
                                const piezas = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
                                const destOfficeName = offices.find(o => o.id === inv.guide.destinationOfficeId)?.name || 'N/A';
                                
                                return (
                                    <tr key={inv.id} className="border-b border-gray-300 text-black">
                                        <td className="py-1 text-black font-mono">{inv.invoiceNumber}</td>
                                        <td className="py-1 text-black">{inv.controlNumber}</td>
                                        <td className="py-1 text-black truncate pl-2">{inv.guide.receiver.name}</td>
                                        <td className="py-1 text-black truncate">{destOfficeName}</td>
                                        <td className="py-1 text-center text-black">{piezas}</td>
                                        <td className="py-1 text-right text-black">{formatCurrency(inv.totalAmount)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-2 border-black font-bold text-black bg-gray-100">
                            <tr>
                                <td colSpan={4} className="py-1 text-right uppercase text-black pr-2">Total General</td>
                                <td className="py-1 text-center text-black">{totalPackages}</td>
                                <td className="py-1 text-right text-black">{formatCurrency(totalAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="flex justify-between text-[10px] mb-8 font-bold border-t border-black pt-2">
                         <span>Total Peso Carga: {totalWeight.toFixed(2)} Kg</span>
                         <span>Total Facturas: {sortedInvoices.length}</span>
                    </div>

                    {/* Signatures */}
                    <div className="mt-16 grid grid-cols-2 gap-20 px-8 text-black text-[10px]">
                        <div className="text-center text-black">
                            <div className="border-b border-black mb-2"></div>
                            <p className="font-bold text-black">DESPACHADO POR</p>
                            <p className="text-[9px] text-black">{originOffice?.name}</p>
                        </div>
                        <div className="text-center text-black">
                            <div className="border-b border-black mb-2"></div>
                            <p className="font-bold text-black">RECIBIDO POR</p>
                            <p className="text-[9px] text-black">Firma y Sello Oficina Destino</p>
                        </div>
                    </div>
                    
                    <div className="mt-12 text-center text-[9px] text-gray-500">
                        <p className="text-black">Este documento certifica la transferencia de custodia de la mercancía listada.</p>
                    </div>

                </div>
            </div>
            <div className="flex justify-end space-x-3 p-4 border-t dark:border-gray-700">
                <Button type="button" variant="secondary" onClick={onClose}>
                    <XIcon className="w-4 h-4 mr-2" />Cerrar
                </Button>
                <Button type="button" onClick={handleDownloadPdf}>
                    <DownloadIcon className="w-4 h-4 mr-2" />Descargar PDF
                </Button>
            </div>
        </Modal>
    );
};

export default DispatchDocumentModal;
