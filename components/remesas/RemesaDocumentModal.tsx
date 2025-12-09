
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
        return acc;
    }, { pza: 0 });


    const handleDownloadPdf = () => {
        const input = document.getElementById('remesa-to-print');
        if (!input) return;

        const a4Width = 794; 
        const a4Height = 1123;

        html2canvas(input, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            width: a4Width,
            windowWidth: 1200,
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
    const originOfficeName = remesaInvoices.length > 0 ? getOfficeName(remesaInvoices[0].guide.originOfficeId) : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Liquidación Remesa # ${remesa.remesaNumber}`} size="4xl">
            {/* Wrapper to handle scrolling for the fixed-width document */}
            <div className="flex justify-center bg-gray-100 dark:bg-gray-800 py-4 rounded-lg overflow-auto max-h-[75vh]">
                {/* Fixed A4 Size Container */}
                <div 
                    id="remesa-to-print" 
                    className="bg-white text-black font-mono text-[11px] leading-tight printable-area shadow-xl"
                    style={{ 
                        width: '794px', 
                        minHeight: '1123px', 
                        padding: '40px', 
                        boxSizing: 'border-box'
                    }}
                >
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4 text-black">
                        <div className="w-1/2">
                            <h1 className="font-bold text-sm text-black">ASOCIACION COOPERATIVA MIXTA</h1>
                            <h1 className="font-bold text-sm text-black">FRATERNIDAD DEL TRANSPORTE, R.L.</h1>
                            <p className="text-black text-[10px]">RIF: {companyInfo.rif}</p>
                            <p className="text-black text-[10px]">OFICINA: {originOfficeName.toUpperCase()}</p>
                        </div>
                        <div className="text-right w-1/2 text-black">
                            <h2 className="font-bold text-base text-black">REMESA DE ASOCIADO</h2>
                            <p className="text-black"><strong>LIQUIDACION #:</strong> {remesa.remesaNumber}</p>
                            <p className="text-black"><strong>Emisión:</strong> {new Date().toLocaleDateString('es-VE')}</p>
                            <p className="text-black"><strong>Hora:</strong> {new Date().toLocaleTimeString('es-VE')}</p>
                            <p className="text-black"><strong>Página:</strong> 1</p>
                        </div>
                    </div>

                    <div className="text-center font-bold text-[11px] mb-2 text-black border-t border-b border-gray-300 py-1">
                        ENCOMIENDAS RECIBIDAS
                    </div>
                    <div className="text-center text-[10px] mb-4 text-black">
                        Desde: {new Date(remesa.date).toLocaleDateString('es-VE')} Hasta: {new Date(remesa.date).toLocaleDateString('es-VE')}
                    </div>

                    {/* Info Block */}
                    <div className="mb-4 text-black p-2 border border-gray-300 rounded text-[10px]">
                        <p className="text-black"><strong>ASOCIADO:</strong> {asociado?.codigo} - {asociado?.nombre}</p>
                        <p className="text-black"><strong>ORIGEN:</strong> {originOfficeName.toUpperCase()}</p>
                        {vehicle && <p className="text-black"><strong>CHOFER:</strong> {vehicle.driver}, <strong>Vehículo:</strong> {vehicle.modelo}, <strong>Color:</strong> {vehicle.color}, <strong>Placa:</strong> {vehicle.placa}</p>}
                    </div>

                    {/* Invoices Table - FIXED LAYOUT */}
                    <table className="w-full border-collapse mb-2 text-black table-fixed text-[11px]">
                        <thead className="border-t-2 border-b-2 border-black">
                            <tr>
                                <th className="text-left py-1 text-black w-[12%]">FACTURA</th>
                                <th className="text-left py-1 text-black w-[14%]">ORIGEN</th>
                                <th className="text-center py-1 text-black w-[5%]">TP</th>
                                <th className="text-center py-1 text-black w-[6%]">Pzas</th>
                                <th className="text-left pl-2 py-1 text-black w-[27%]">Encomienda</th>
                                <th className="text-right py-1 text-black w-[12%]">Pagado</th>
                                <th className="text-right py-1 text-black w-[12%]">Credito</th>
                                <th className="text-right py-1 text-black w-[12%]">Destino</th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {remesaInvoices.map(inv => {
                                const totalPackages = inv.guide.merchandise.reduce((sum, m) => sum + m.quantity, 0);
                                const desc = inv.guide.merchandise[0]?.description || 'PAQUETE';
                                const amount = inv.totalAmount;
                                const isPagado = inv.guide.paymentType === 'flete-pagado';
                                
                                return (
                                    <tr key={inv.id} className="text-black">
                                        <td className="py-1 text-black font-mono">{inv.invoiceNumber.replace('F-','')}</td>
                                        <td className="py-1 text-black truncate pr-1">{getOfficeName(inv.guide.originOfficeId)}</td>
                                        <td className="py-1 text-center text-black">01</td>
                                        <td className="py-1 text-center text-black font-bold">{totalPackages}</td>
                                        <td className="py-1 text-black pl-2 truncate">{desc}</td>
                                        <td className="py-1 text-right text-black">{isPagado ? formatCurrency(amount) : '0.00'}</td>
                                        <td className="py-1 text-right text-black">0.00</td>
                                        <td className="py-1 text-right text-black">{!isPagado ? formatCurrency(amount) : '0.00'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t border-black font-bold text-black">
                            <tr>
                                <td colSpan={3} className="py-1 text-right text-black pr-2">Total piezas</td>
                                <td className="py-1 text-center text-black">{topTableTotals.pza}</td>
                                <td className="py-1"></td>
                                <td className="py-1 text-right text-black">{formatCurrency(financials.pagado.flete + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva)}</td>
                                <td className="py-1 text-right text-black">0.00</td>
                                <td className="py-1 text-right text-black">{formatCurrency(financials.destino.flete + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Subtotals Lines */}
                    <div className="flex justify-between border-b border-dotted border-black py-1 font-bold text-black mt-2 text-[10px]">
                        <span className="text-black">SUB TOTALES -&gt;</span>
                        <div className="flex gap-8 w-[36%] justify-end">
                            <span className="text-black w-[45%] text-right">{formatCurrency(financials.pagado.flete + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva)}</span>
                            <span className="text-black w-[45%] text-right">{formatCurrency(financials.destino.flete + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between border-b-2 border-black py-1 font-bold mb-4 text-black text-[10px]">
                        <span className="text-black">TOTALES -&gt;</span>
                        <div className="flex gap-8 w-[36%] justify-end">
                            <span className="text-black w-[45%] text-right">{formatCurrency(financials.pagado.flete + financials.pagado.seguro + financials.pagado.ipostel + financials.pagado.manejo + financials.pagado.iva)}</span>
                            <span className="text-black w-[45%] text-right">{formatCurrency(financials.destino.flete + financials.destino.seguro + financials.destino.ipostel + financials.destino.manejo + financials.destino.iva)}</span>
                        </div>
                    </div>

                    {/* Financial Breakdown Table - FIXED LAYOUT */}
                    <table className="w-full border-collapse mb-4 text-black table-fixed text-[10px]">
                        <thead className="border-b border-black font-bold">
                            <tr>
                                <th className="text-left py-1 text-black w-[8%]"></th>
                                <th className="text-right py-1 text-black w-[10%]">Flete</th>
                                <th className="text-right py-1 text-black w-[8%]">Viajes</th>
                                <th className="text-right py-1 text-black w-[8%]">Sobres</th>
                                <th className="text-right py-1 text-black w-[10%]">Seguro</th>
                                <th className="text-right py-1 text-black w-[10%]">Ipostel</th>
                                <th className="text-right py-1 text-black w-[10%]">Manejo</th>
                                <th className="text-right py-1 text-black w-[10%]">I.V.A.</th>
                                <th className="text-right py-1 text-black w-[13%]">Favor Coop.</th>
                                <th className="text-right py-1 text-black w-[13%]">Favor Soc.</th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            <tr>
                                <td className="font-bold py-1 text-black">Pagado</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.flete)}</td>
                                <td className="text-right py-1 text-black">0.00</td>
                                <td className="text-right py-1 text-black">0.00</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.seguro)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.ipostel)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.manejo)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.iva)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.favorCooperativa)}</td>
                                <td className="text-right py-1 font-bold text-black">{formatCurrency(financials.pagado.favorAsociado)}</td>
                            </tr>
                            <tr className="border-b border-black">
                                <td className="font-bold py-1 text-black">Destino</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.flete)}</td>
                                <td className="text-right py-1 text-black">0.00</td>
                                <td className="text-right py-1 text-black">0.00</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.seguro)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.ipostel)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.manejo)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.iva)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.favorCooperativa)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.destino.favorAsociado)}</td>
                            </tr>
                            <tr className="font-bold">
                                <td className="py-1 text-black">Total Bs.</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.flete + financials.destino.flete)}</td>
                                <td className="text-right py-1 text-black">0.00</td>
                                <td className="text-right py-1 text-black">0.00</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.seguro + financials.destino.seguro)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.ipostel + financials.destino.ipostel)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.manejo + financials.destino.manejo)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.iva + financials.destino.iva)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.favorCooperativa + financials.destino.favorCooperativa)}</td>
                                <td className="text-right py-1 text-black">{formatCurrency(financials.pagado.favorAsociado + financials.destino.favorAsociado)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Summary Section */}
                    <div className="grid grid-cols-2 gap-8 mt-4 text-black text-[10px]">
                        {/* Left Side: Summary of Deductions/Destino */}
                        <div className="pr-4">
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Destino</span><span className="text-black">{formatCurrency(financials.totalDestino)}</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Coop.</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Seguro</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Ipostel</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Manejo</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">I.V.A.</span><span className="text-black">0.00</span></div>
                        </div>

                        {/* Right Side: Totals for Associate */}
                        <div className="pl-4 border-l border-gray-300">
                            <div className="flex justify-between py-1 border-b border-dotted border-gray-400 text-black">
                                <span className="text-black">SUB TOTAL</span>
                                <span className="line-through decoration-double text-black">0.00</span>
                            </div>
                            <div className="flex justify-between py-1 font-bold text-black">
                                <span className="text-black">TOTAL SOCIO (PAGADOS)</span>
                                <span className="text-black">{formatCurrency(financials.pagado.favorAsociado)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-black">
                                <span className="text-black">SUB TOTAL</span>
                                <span className="text-black">{formatCurrency(financials.pagado.favorAsociado)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Regalias</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Prestamos</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 text-black"><span className="text-black">Creditos</span><span className="text-black">0.00</span></div>
                            <div className="flex justify-between py-1 border-t border-black font-bold text-black">
                                <span className="text-black">SUB TOTAL</span>
                                <span className="text-black">{formatCurrency(financials.pagado.favorAsociado)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-t-2 border-black font-bold text-[11px] mt-2 text-black bg-gray-50 p-1">
                                <span className="text-black">Cuenta por cobrar al asociado:</span>
                                <span className="text-black">{formatCurrency(financials.pagado.favorAsociado)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-[10px] text-black">
                                <span className="text-black">Referencia $:</span>
                                <span className="text-black">{companyInfo.bcvRate ? (financials.pagado.favorAsociado / companyInfo.bcvRate).toFixed(2) : '0.00'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 mb-16 text-black text-[10px]">
                        <p className="font-bold text-black">OBSERVACIONES:</p>
                        <p className="text-black">Tp:01=Pagado 02=Cobro a destino 03=Credito</p>
                    </div>

                    <div className="grid grid-cols-2 gap-16 mt-8 text-black text-[10px]">
                        <div className="border-t border-black text-center pt-2">
                            <p className="text-black font-bold">ASOCIADO</p>
                            <p className="text-[9px] text-gray-600">Firma y Cédula</p>
                        </div>
                        <div className="border-t border-black text-center pt-2">
                            <p className="font-bold text-black">EGLET REYNA</p>
                            <p className="text-black">Oficinista</p>
                        </div>
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
