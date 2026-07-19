import React, { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Invoice } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { DownloadIcon } from '../icons/Icons';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface GuiaPorteModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
}

export const GuiaPorteModal: React.FC<GuiaPorteModalProps> = ({ isOpen, onClose, invoice }) => {
    const { companyInfo, shippingTypes } = useConfig();
    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const formatInvoiceNumber = (num: string) => num?.startsWith('F-') ? num : `F-${num || ''}`;
    const formatCurrency = (amount: number) => `Bs. ${(amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleDownloadPdf = async () => {
        const input = printRef.current;
        if (!input) return;

        setIsDownloading(true);
        try {
            const canvas = await html2canvas(input, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            // 'l' para landscape o 'p' para portrait. El formato excel parece más ancho que alto.
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfImgHeight);

            pdf.save(`guia-porte-${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!isOpen) return null;

    const sender = invoice.guide?.sender || {};
    const receiver = invoice.guide?.receiver || {};
    const merchandise = invoice.guide?.merchandise || [];
    const firstMerch = merchandise[0] || {} as any;
    
    const shippingType = shippingTypes.find(s => s.id === invoice.guide?.shippingTypeId);
    const shippingTypeName = shippingType ? shippingType.name : 'TRASLADO TERRESTRE';
    
    const totalPieces = merchandise.reduce((sum, m) => sum + (m.quantity || 1), 0);
    const totalWeight = merchandise.reduce((sum, m) => sum + (m.weight || 0), 0);

    const formatShortDate = (d?: string) => {
        if (!d) return '';
        try {
            return new Intl.DateTimeFormat('es-VE', { 
                day: '2-digit', month: '2-digit', year: 'numeric' 
            }).format(new Date(d));
        } catch {
            return '';
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Guía Porte - ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="4xl">
            <div className="flex justify-end mb-4 border-b pb-4 dark:border-gray-700">
                <Button 
                    variant="primary" 
                    onClick={handleDownloadPdf} 
                    disabled={isDownloading}
                >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    {isDownloading ? 'Generando PDF...' : 'Descargar Guía Porte'}
                </Button>
            </div>

            <div className="overflow-x-auto bg-gray-100 p-4 dark:bg-gray-800 rounded-lg">
                <div 
                    ref={printRef} 
                    className="bg-white p-6 mx-auto text-black"
                    style={{ width: '1000px', fontFamily: 'Arial, sans-serif' }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            {companyInfo.logoUrl ? (
                                <img src={companyInfo.logoUrl} alt="Logo" className="h-16 object-contain" crossOrigin="anonymous" />
                            ) : (
                                <div className="h-16 w-16 bg-gray-200 flex items-center justify-center font-bold text-gray-500 rounded-full">
                                    LOGO
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-black text-blue-800 tracking-wider">
                                    {companyInfo.name || 'ASOCIACION COOPERATIVA MIXTA'}
                                </h1>
                                <p className="text-sm font-bold text-gray-700">
                                    Habilitado Postal: {companyInfo.postalLicense || companyInfo.rif}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-lg font-bold text-blue-800">GUIA PORTE</h2>
                            <p className="font-bold">FECHA: {formatShortDate(invoice.date)}</p>
                        </div>
                    </div>

                    {/* Table 1: Info General */}
                    <table className="w-full border-collapse border border-blue-800 text-xs mb-2">
                        <tbody>
                            <tr className="bg-blue-100/50">
                                <td className="border border-blue-800 p-1 font-bold">N° DE CONTRATO</td>
                                <td className="border border-blue-800 p-1 font-bold">OFICINA ORIGEN</td>
                                <td className="border border-blue-800 p-1 font-bold">TIPO DE MERCANCIA</td>
                                <td className="border border-blue-800 p-1 font-bold" colSpan={2}>TIPO DE SERVICIO</td>
                                <td className="border border-blue-800 p-1 font-bold bg-pink-100 text-center text-red-600">CORRELATIVO</td>
                            </tr>
                            <tr>
                                <td className="border border-blue-800 p-1">{companyInfo.postalLicense || ''}</td>
                                <td className="border border-blue-800 p-1 uppercase">{invoice.Office?.name || invoice.guide?.originOfficeId || ''}</td>
                                <td className="border border-blue-800 p-1 uppercase">PAQUETE</td>
                                <td className="border border-blue-800 p-1 uppercase" colSpan={2}>{shippingTypeName}</td>
                                <td className="border border-blue-800 p-1 text-center font-bold text-red-600 text-sm">
                                    {invoice.invoiceNumber}
                                </td>
                            </tr>
                            <tr className="bg-blue-100/50">
                                <td className="border border-blue-800 p-1 font-bold" colSpan={3}>NOMBRE Y APELLIDO O RAZON SOCIAL</td>
                                <td className="border border-blue-800 p-1 font-bold">RIF</td>
                                <td className="border border-blue-800 p-1 font-bold" colSpan={2}>TELEFONO 1:</td>
                            </tr>
                            <tr>
                                <td className="border border-blue-800 p-1 uppercase" colSpan={3}>{sender.name}</td>
                                <td className="border border-blue-800 p-1 uppercase">{sender.idNumber}</td>
                                <td className="border border-blue-800 p-1" colSpan={2}>{sender.phone}</td>
                            </tr>
                            <tr className="bg-blue-100/50">
                                <td className="border border-blue-800 p-1 font-bold" colSpan={2}>CIUDAD DESTINO</td>
                                <td className="border border-blue-800 p-1 font-bold">LOCALIDAD</td>
                                <td className="border border-blue-800 p-1 font-bold text-center" colSpan={2}>TIPO DE ENTREGA O DESPACHO</td>
                                <td className="border border-blue-800 p-1 font-bold">TELEFONO 2:</td>
                            </tr>
                            <tr>
                                <td className="border border-blue-800 p-1 uppercase" colSpan={2}>{/* Destino oficina name */ invoice.guide?.destinationOfficeId || ''}</td>
                                <td className="border border-blue-800 p-1 uppercase">{invoice.guide?.specificDestination || ''}</td>
                                <td className="border border-blue-800 p-1 text-center font-bold text-[10px]">
                                    PUERTA A PUERTA {invoice.guide?.paymentType === 'flete-destino' ? '(X)' : ''}
                                </td>
                                <td className="border border-blue-800 p-1 text-center font-bold text-[10px]">
                                    OFICINA {invoice.guide?.paymentType !== 'flete-destino' ? '(X)' : ''}
                                </td>
                                <td className="border border-blue-800 p-1">{receiver.phone}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Table 2: Paquetes */}
                    <table className="w-full border-collapse border border-blue-800 text-xs mb-2">
                        <tbody>
                            <tr className="bg-blue-100/50 text-center">
                                <td className="border border-blue-800 p-1 font-bold w-16">PIEZAS</td>
                                <td className="border border-blue-800 p-1 font-bold w-20">PESO KG</td>
                                <td className="border border-blue-800 p-1 font-bold">CLASE DE BULTO</td>
                                <td className="border border-blue-800 p-1 font-bold">NOMBRE RECEPTOR</td>
                                <td className="border border-blue-800 p-1 font-bold w-24">N° PRECINTO</td>
                            </tr>
                            <tr className="text-center h-12 align-top">
                                <td className="border border-blue-800 p-1">{totalPieces}</td>
                                <td className="border border-blue-800 p-1">{totalWeight}</td>
                                <td className="border border-blue-800 p-1 uppercase">{firstMerch.description || 'Mercancía'}</td>
                                <td className="border border-blue-800 p-1 uppercase text-left">{receiver.name}</td>
                                <td className="border border-blue-800 p-1"></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Table 3: Firmas y Finanzas */}
                    <div className="flex gap-2">
                        {/* Firmas (Izquierda) */}
                        <div className="w-2/3">
                            <table className="w-full border-collapse border border-blue-800 text-xs h-full">
                                <tbody>
                                    <tr className="bg-blue-100/50 text-center">
                                        <td className="border border-blue-800 p-1 font-bold w-1/2">NOMBRE Y APELLIDO DEL REMITENTE</td>
                                        <td className="border border-blue-800 p-1 font-bold">FIRMA</td>
                                        <td className="border border-blue-800 p-1 font-bold">FECHA DE ENTREGA</td>
                                    </tr>
                                    <tr className="h-12 text-center align-bottom">
                                        <td className="border border-blue-800 p-1 uppercase">{sender.name}</td>
                                        <td className="border border-blue-800 p-1"></td>
                                        <td className="border border-blue-800 p-1">{formatShortDate(invoice.date)}</td>
                                    </tr>
                                    <tr className="bg-blue-100/50 text-center">
                                        <td className="border border-blue-800 p-1 font-bold">NOMBRE Y APELLIDO DEL RECEPTOR</td>
                                        <td className="border border-blue-800 p-1 font-bold">FIRMA</td>
                                        <td className="border border-blue-800 p-1 font-bold">FECHA DE RECEPCION</td>
                                    </tr>
                                    <tr className="h-12 text-center align-bottom">
                                        <td className="border border-blue-800 p-1 uppercase">{receiver.name}</td>
                                        <td className="border border-blue-800 p-1"></td>
                                        <td className="border border-blue-800 p-1"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Sello (Medio) */}
                        <div className="w-1/6 border border-blue-800 flex flex-col">
                            <div className="bg-blue-100/50 border-b border-blue-800 p-1 font-bold text-center text-xs">
                                SELLO
                            </div>
                            <div className="flex-1"></div>
                        </div>

                        {/* Finanzas (Derecha) */}
                        <div className="w-1/4">
                            <table className="w-full border-collapse border border-blue-800 text-xs">
                                <tbody>
                                    <tr className="bg-blue-100/50">
                                        <td className="border border-blue-800 p-1 font-bold text-center" colSpan={2}>VALOR FLETE</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-blue-800 p-1 font-bold bg-blue-100/20 text-[10px]">BASE IMPONIBLE</td>
                                        <td className="border border-blue-800 p-1 text-right">{formatCurrency(invoice.montoFlete || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-blue-800 p-1 font-bold bg-blue-100/20 text-[10px]">SEGURO MERCANCIA</td>
                                        <td className="border border-blue-800 p-1 text-right">{formatCurrency(invoice.insuranceAmount || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-blue-800 p-1 font-bold bg-blue-100/20 text-[10px]">FRANQUEO POSTAL</td>
                                        <td className="border border-blue-800 p-1 text-right">{formatCurrency(invoice.ipostelFee || 0)}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-blue-800 p-1 font-bold bg-blue-100/50">TOTAL BS</td>
                                        <td className="border border-blue-800 p-1 text-right font-bold bg-blue-100/50">{formatCurrency(invoice.totalAmount || 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
