import React, { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Invoice } from '../../types';
import { useConfig } from '../../contexts/ConfigContext';
import { DownloadIcon } from '../icons/Icons';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SingleGuiaPorteCard } from '../shipping-guide/GuiasPorteView';

interface GuiaPorteModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: Invoice;
}

export const GuiaPorteModal: React.FC<GuiaPorteModalProps> = ({ isOpen, onClose, invoice }) => {
    const { companyInfo, shippingTypes, offices } = useConfig();
    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const formatInvoiceNumber = (num: string) => num?.startsWith('F-') ? num : `F-${num || ''}`;

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
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfImgHeight = (imgProps.height * (pdfWidth - 10)) / imgProps.width;
            
            // Single Guía Porte fits on top half of A4 portrait
            pdf.addImage(imgData, 'PNG', 5, 5, pdfWidth - 10, Math.min(pdfImgHeight, (pdfHeight / 2) - 10));

            pdf.save(`guia-porte-${formatInvoiceNumber(invoice.invoiceNumber)}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Guía Porte - ${formatInvoiceNumber(invoice.invoiceNumber)}`} size="4xl">
            <div className="flex justify-between items-center mb-4 border-b pb-4 dark:border-gray-700">
                <span className="text-xs text-gray-500 font-medium">Formato A4 Solitario (Mitad Superior)</span>
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
                    className="bg-white p-2 mx-auto text-black"
                    style={{ width: '800px' }}
                >
                    <SingleGuiaPorteCard
                        invoice={invoice}
                        companyInfo={companyInfo}
                        shippingTypes={shippingTypes}
                        offices={offices}
                        isHalfPage={true}
                    />
                </div>
            </div>
        </Modal>
    );
};

