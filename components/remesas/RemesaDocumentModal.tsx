
import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Remesa, Invoice, Asociado, Vehicle, Client, CompanyInfo, Office, Category, Merchandise } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon } from '../icons/Icons';
import { calculateDetailedRemesaFinancials } from '../../utils/financials';


interface RemesaDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    remesa: Remesa;
    invoices: Invoice[];
    asociados: Asociado[];
    vehicles: Vehicle[];
    clients: Client[];
    companyInfo: CompanyInfo;
    offices: Office[];
    categories: Category[];
}

const RemesaDocumentModal: React.FC<RemesaDocumentModalProps> = ({
    isOpen, onClose, remesa, invoices, asociados, vehicles, clients, companyInfo, offices
}) => {

    const formatCurrency = (amount: number) => amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const asociado = asociados.find(a => a.id === remesa.asociadoId);
    const vehicle = vehicles.find(v => v.id === remesa.vehicleId);
    const remesaInvoices = invoices.filter(inv => remesa.invoiceIds.includes(inv.id));
    
    // Calculate specific financials for the report structure
    const financials = useMemo(() => calculateDetailedRemesaFinancials(remesaInvoices, companyInfo), [remesaInvoices, companyInfo]);

    // Totals for the top table
    const topTableTotals = remesaInvoices.reduce((acc, inv) => {
        const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
        acc.pza += totalPackages;
        acc.flete += inv.guide.merchandise.reduce((sum, m) => {
             // Rough approximation of item freight for display, total matches bottom table
             return sum + ((m.weight * (companyInfo.costPerKg || 0)) * m.quantity);
        }, 0); 
        return acc;
    }, { pza: 0, flete: 0 });


    const handleDownloadPdf = () => {
        const input = document.getElementById('remesa-to-print');
        if (!input) return;

        const originalBackgroundColor = input.style.backgroundColor;
        input.style.backgroundColor = 'white';

        html2canvas(input, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            windowWidth: input.scrollWidth,
            windowHeight: input.scrollHeight
        }).then(canvas => {
            input.style.backgroundColor = originalBackgroundColor;

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
            
            pdf.save(`remesa_${remesa.remesaNumber}.pdf`);
        });
    };

    if (!isOpen) return null;

    const getOfficeName = (id: string) => offices.find(o => o.id === id)?.name || id;
    // Assuming origin is same for all in remesa (usually current office)
    const originOfficeName = remesaInvoices.length > 0 ? getOfficeName(remesaInvoices[0].guide.originOfficeId) : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Liquidación Remesa # ${remesa.remesaNumber}`} size="4xl">
            <div id="remesa-to-print" className="bg-white text-black font-mono text-[10px] leading-tight printable-area p-8">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="font-bold text-sm">ASOCIACION COOPERATIVA MIXTA</h1>
                        <h1 className="font-bold text-sm">FRATERNIDAD DEL TRANSPORTE, R.L.</h1>
                        <p>RIF: {companyInfo.rif}</p>
                        <p>OFICINA: {originOfficeName.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="font-bold text-lg">REMESA DE ASOCIADO</h2>
                        <p><strong>LIQUIDACION #:</strong> {remesa.remesaNumber}</p>
                        <p><strong>Emisión:</strong> {new Date().toLocaleDateString('es-VE')}</p>
                        <p><strong>Hora:</strong> {new Date().toLocaleTimeString('es-VE')}</p>
                        <p><strong>Página:</strong> 1</p>
                    </div>
                </div>

                <div className="text-center font-bold text-xs mb-2">
                    ENCOMIENDAS RECIBIDAS
                </div>
                <div className="text-center text-[10px] mb-4">
                    Desde: {new Date(remesa.date).toLocaleDateString('es-VE')} Hasta: {new Date(remesa.date).toLocaleDateString('es-VE')}
                </div>

                {/* Info Block */}
                <div className="mb-4">
                    <p><strong>ASOCIADO:</strong> {asociado?.codigo} - {asociado?.nombre}</p>
                    <p><strong>ORIGEN:</strong> {originOfficeName.toUpperCase()}</p>
                    {vehicle && <p><strong>CHOFER:</strong> {vehicle.driver}, <strong>Vehículo:</strong> {vehicle.modelo}, <strong>Color:</strong> {vehicle.color}, <strong>Placa:</strong> {vehicle.placa}</p>}
                </div>

                {/* Invoices Table */}
                <table className="w-full border-collapse mb-2">
                    <thead className="border-t-2 border-b-2 border-black">
                        <tr>
                            <th className="text-left py-1">FACTURA</th>
                            <th className="text-left py-1">ORIGEN</th>
                            <th className="text-center py-1">TP</th>
                            <th className="text-center py-1">Pzas</th>
                            <th className="text-left py-1">Encomienda</th>
                            <th className="text-right py-1">Pagado</th>
                            <th className="text-right py-1">Credito</th>
                            <th className="text-right py-1">Destino</th>
                        </tr>
                    </thead>
                    <tbody>
                        {remesaInvoices.map(inv => {
                            const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
                            const desc = inv.guide.merchandise[0]?.description.substring(0, 20) || 'PAQUETE';
                            const amount = inv.totalAmount;
                            const isPagado = inv.guide.paymentType === 'flete-pagado';
                            
                            return (
                                <tr key={inv.id}>
                                    <td className="py-1">{inv.invoiceNumber.replace('F-','')}</td>
                                    <td className="py-1">{getOfficeName(inv.guide.originOfficeId).substring(0, 15)}</td>
                                    <td className="py-1 text-center">01</td>
                                    <td className="py-1 text-center">{totalPackages}</td>
                                    <td className="py-1">{desc}</td>
                                    <td className="py-1 text-right">{isPagado ? formatCurrency(amount) : '0.00'}</td>
                                    <td className="py-1 text-right">0.00</td>
                                    <td className="py-1 text-right">{!isPagado ? formatCurrency(amount) : '0.00'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-black font-bold">
                        <tr>
                            <td colSpan={3} className="py-1 text-right">Total piezas</td>
                            <td className="py-1 text-center">{topTableTotals.pza}</td>
                            <td className="py-1"></td>
                            <td className="py-1 text-right">{formatCurrency(financials.pagado.flete + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva)}</td>
                            <td className="py-1 text-right">0.00</td>
                            <td className="py-1 text-right">{formatCurrency(financials.destino.flete + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Subtotals Lines */}
                <div className="flex justify-between border-b border-dotted border-black py-1 font-bold">
                    <span>SUB TOTALES -&gt;</span>
                    <span className="mr-32">{formatCurrency(financials.pagado.flete + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva)}</span>
                    <span>{formatCurrency(financials.destino.flete + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</span>
                </div>
                <div className="flex justify-between border-b-2 border-black py-1 font-bold mb-6">
                    <span>TOTALES -&gt;</span>
                    <span className="mr-32">{formatCurrency(financials.pagado.flete + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva)}</span>
                    <span>{formatCurrency(financials.destino.flete + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</span>
                </div>

                {/* Financial Breakdown Table */}
                <table className="w-full border-collapse mb-4">
                    <thead className="border-b border-black font-bold">
                        <tr>
                            <th className="text-left py-1"></th>
                            <th className="text-right py-1">Flete</th>
                            <th className="text-right py-1">Viajes</th>
                            <th className="text-right py-1">Sobres</th>
                            <th className="text-right py-1">Seguro</th>
                            <th className="text-right py-1">Ipostel</th>
                            <th className="text-right py-1">Manejo</th>
                            <th className="text-right py-1">I.V.A.</th>
                            <th className="text-right py-1">Favor de Cooperat.</th>
                            <th className="text-right py-1">Favor de Asociado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="font-bold py-1">Pagado</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.flete)}</td>
                            <td className="text-right py-1">0.00</td>
                            <td className="text-right py-1">0.00</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.seguro)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.ipostel)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.manejo)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.iva)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.favorCooperativa)}</td>
                            <td className="text-right py-1 font-bold">{formatCurrency(financials.pagado.favorAsociado)}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="font-bold py-1">Destino</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.flete)}</td>
                            <td className="text-right py-1">0.00</td>
                            <td className="text-right py-1">0.00</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.seguro)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.ipostel)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.manejo)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.iva)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.favorCooperativa)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.destino.favorAsociado)}</td>
                        </tr>
                        <tr className="font-bold">
                            <td className="py-1">Total Bs.</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.flete + financials.destino.flete)}</td>
                            <td className="text-right py-1">0.00</td>
                            <td className="text-right py-1">0.00</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.seguro + financials.destino.seguro)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.ipostel + financials.destino.ipostel)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.manejo + financials.destino.manejo)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.iva + financials.destino.iva)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.favorCooperativa + financials.destino.favorCooperativa)}</td>
                            <td className="text-right py-1">{formatCurrency(financials.pagado.favorAsociado + financials.destino.favorAsociado)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Summary Section */}
                <div className="grid grid-cols-2 gap-8 mt-4">
                    {/* Left Side: Summary of Deductions/Destino */}
                    <div>
                        <div className="flex justify-between py-1"><span>Destino</span><span>{formatCurrency(financials.totalDestino)}</span></div>
                        <div className="flex justify-between py-1"><span>Coop.</span><span>0.00</span></div>
                        <div className="flex justify-between py-1"><span>Seguro</span><span>0.00</span></div>
                        <div className="flex justify-between py-1"><span>Ipostel</span><span>0.00</span></div>
                        <div className="flex justify-between py-1"><span>Manejo</span><span>0.00</span></div>
                        <div className="flex justify-between py-1"><span>I.V.A.</span><span>0.00</span></div>
                    </div>

                    {/* Right Side: Totals for Associate */}
                    <div>
                        <div className="flex justify-between py-1 border-b border-dotted border-gray-400">
                            <span>SUB TOTAL</span>
                            <span className="line-through decoration-double">0.00</span>
                        </div>
                        <div className="flex justify-between py-1 font-bold">
                            <span>TOTAL SOCIO (PAGADOS)</span>
                            <span>{formatCurrency(financials.pagado.favorAsociado)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span>SUB TOTAL</span>
                            <span>{formatCurrency(financials.pagado.favorAsociado)}</span>
                        </div>
                        <div className="flex justify-between py-1"><span>Regalias</span><span>0.00</span></div>
                        <div className="flex justify-between py-1"><span>Prestamos</span><span>0.00</span></div>
                        <div className="flex justify-between py-1"><span>Creditos</span><span>0.00</span></div>
                        <div className="flex justify-between py-1 border-t border-black font-bold">
                            <span>SUB TOTAL</span>
                            <span>{formatCurrency(financials.pagado.favorAsociado)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t-2 border-black font-bold text-sm mt-2">
                            <span>Cuenta por cobrar al asociado:</span>
                            <span>{formatCurrency(financials.pagado.favorAsociado)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-[10px]">
                            <span>Referencia $:</span>
                            <span>{companyInfo.bcvRate ? (financials.pagado.favorAsociado / companyInfo.bcvRate).toFixed(2) : '0.00'}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 mb-16">
                    <p className="font-bold">OBSERVACIONES:</p>
                    <p>Tp:01=Pagado 02=Cobro a destino 03=Credito</p>
                </div>

                <div className="grid grid-cols-2 gap-16 mt-8">
                    <div className="border-t border-black text-center pt-2">
                        <p>Asociado</p>
                    </div>
                    <div className="border-t border-black text-center pt-2">
                        <p className="font-bold">EGLET REYNA</p>
                        <p>Oficinista</p>
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

export default RemesaDocumentModal;
