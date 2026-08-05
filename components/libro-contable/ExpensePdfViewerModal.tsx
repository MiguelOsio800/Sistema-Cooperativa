import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Expense, CompanyInfo } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, XIcon, PrinterIcon, PackageIcon } from '../icons/Icons';

interface ExpensePdfViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense: Expense | null;
    companyInfo: CompanyInfo;
}

const ExpensePdfViewerModal: React.FC<ExpensePdfViewerModalProps> = ({ 
    isOpen, onClose, expense, companyInfo 
}) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const formatCurrency = (amount: number) => `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    useEffect(() => {
        if (isOpen && expense) {
            setIsLoading(true);
            const timer = setTimeout(() => {
                generatePdfBlob();
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setPdfUrl(null);
        }
    }, [isOpen, expense]);

    const generatePdfBlob = async () => {
        const input = document.getElementById('expense-pdf-source');
        if (!input) {
            setIsLoading(false);
            return;
        }

        try {
            const canvas = await html2canvas(input, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: 1200, 
                width: 794,
                x: 0,
                y: 0,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            console.error("Error generating PDF preview:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!pdfUrl || !expense) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `comprobante-egreso-${expense.id}.pdf`;
        link.click();
    };

    if (!expense) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Visualizar Comprobante de Egreso`} size="4xl">
            <div className="flex flex-col h-[75vh]">
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                    <p className="text-sm text-gray-500">Vista previa del documento generado.</p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose} size="sm">
                            <XIcon className="w-4 h-4 mr-2" /> Cerrar
                        </Button>
                        <Button onClick={handleDownload} disabled={isLoading} size="sm">
                            <DownloadIcon className="w-4 h-4 mr-2" /> Descargar
                        </Button>
                    </div>
                </div>

                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative flex justify-center items-center border dark:border-gray-700">
                    {isLoading ? (
                        <div className="text-center">
                            <PrinterIcon className="w-12 h-12 text-primary-500 animate-pulse mx-auto mb-2" />
                            <p className="text-gray-600 dark:text-gray-300 font-medium">Generando PDF...</p>
                        </div>
                    ) : (
                        pdfUrl && (
                            <iframe 
                                src={pdfUrl} 
                                className="w-full h-full" 
                                title="Visor de Comprobante"
                            />
                        )
                    )}
                </div>
            </div>

            {/* Hidden Source Container for PDF Generation */}
            <div style={{ position: 'absolute', left: '-10000px', top: 0, visibility: 'visible' }}>
                <div 
                    id="expense-pdf-source" 
                    className="bg-white text-black shadow-xl"
                    style={{ 
                        width: '794px', 
                        minHeight: '1123px', 
                        padding: '40px', 
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff' 
                    }} 
                >
                    {/* Header Section */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-8">
                        <div className="flex items-center gap-4">
                            {companyInfo.logoUrl ? (
                                <img src={companyInfo.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                            ) : (
                                <div className="p-2 border rounded"><PackageIcon className="h-12 w-12 text-gray-600" /></div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold uppercase text-gray-900 leading-none mb-1">{companyInfo.name}</h1>
                                <p className="text-[12px] font-bold text-gray-700">RIF: {companyInfo.rif}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-black uppercase tracking-wide text-gray-800">COMPROBANTE DE EGRESO</h2>
                            <p className="text-sm text-gray-600 mt-2"><strong>Fecha:</strong> {expense.date.split('T')[0]}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                            <h3 className="font-bold text-sm text-gray-700 mb-2 border-b pb-1">Detalles del Proveedor</h3>
                            {expense.supplierName || expense.supplierRif ? (
                                <div className="text-sm space-y-1">
                                    {expense.supplierName && <p><span className="font-semibold w-24 inline-block">Nombre:</span> {expense.supplierName}</p>}
                                    {expense.supplierRif && <p><span className="font-semibold w-24 inline-block">RIF/CI:</span> {expense.supplierRif}</p>}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No especificado</p>
                            )}
                        </div>

                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                            <h3 className="font-bold text-sm text-gray-700 mb-2 border-b pb-1">Detalles del Egreso</h3>
                            <div className="text-sm space-y-3">
                                <div className="flex gap-2">
                                    <span className="font-semibold w-24">Categoría:</span> 
                                    <span className="flex-1 bg-white px-2 py-1 border rounded">{expense.category}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-semibold w-24">Descripción:</span> 
                                    <p className="flex-1 bg-white px-2 py-1 border rounded min-h-[6rem] whitespace-pre-wrap break-words overflow-hidden">{expense.description}</p>
                                </div>
                                <div className="flex justify-between items-center bg-gray-200 p-3 rounded-lg mt-4">
                                    <span className="font-bold text-lg">MONTO TOTAL:</span>
                                    <span className="font-black text-xl text-gray-900">{formatCurrency(expense.amount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-32 pt-8 grid grid-cols-3 gap-8 px-4">
                        <div>
                            <div className="border-b border-black w-full mb-2"></div>
                            <p className="text-[11px] font-bold text-center text-black">Preparado por</p>
                        </div>
                        <div>
                            <div className="border-b border-black w-full mb-2"></div>
                            <p className="text-[11px] font-bold text-center text-black">Aprobado por</p>
                        </div>
                        <div>
                            <div className="border-b border-black w-full mb-2"></div>
                            <p className="text-[11px] font-bold text-center text-black">Recibe Conforme</p>
                            <p className="text-[9px] text-center text-gray-600">(Firma y Cédula)</p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ExpensePdfViewerModal;
