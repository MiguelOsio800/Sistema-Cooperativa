import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Invoice } from '../types';
import { useConfig } from './ConfigContext';
import { useToast } from '../components/ui/ToastProvider';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { DownloadIcon } from '../components/icons/Icons';
import { SingleGuiaPorteCard } from '../components/shipping-guide/GuiasPorteView';

interface PdfDownloadContextType {
    isDownloading: boolean;
    downloadProgress: { current: number; total: number; percentage: number } | null;
    pdfBlobUrl: string | null;
    isPdfModalOpen: boolean;
    startBatchPdfDownload: (invoices: Invoice[]) => Promise<void>;
    openNativePdfViewer: (invoices: Invoice[]) => Promise<void>;
    closePdfModal: () => void;
}

const PdfDownloadContext = createContext<PdfDownloadContextType | undefined>(undefined);

export const PdfDownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { companyInfo, shippingTypes, offices } = useConfig();
    const { addToast } = useToast();

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; percentage: number } | null>(null);
    const [stagingBatchInvoices, setStagingBatchInvoices] = useState<Invoice[]>([]);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [activeInvoices, setActiveInvoices] = useState<Invoice[]>([]);

    const stagingContainerRef = useRef<HTMLDivElement>(null);

    // Core reusable batch PDF document generator
    const generateBatchPdfDoc = async (itemsToProcess: Invoice[]): Promise<jsPDF> => {
        const total = itemsToProcess.length;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Dynamic scale factor for rendering speed optimization
        const renderScale = total > 20 ? 1.4 : 1.8;

        for (let i = 0; i < total; i += 2) {
            const batchPair = itemsToProcess.slice(i, i + 2);
            setStagingBatchInvoices(batchPair);

            // Allow React to mount batch pair into isolated staging container
            await new Promise(resolve => setTimeout(resolve, 35));

            const container = stagingContainerRef.current;
            if (!container) throw new Error("Contenedor de renderizado en segundo plano no disponible.");

            const cards = Array.from(container.querySelectorAll('.guia-porte-card')) as HTMLElement[];

            if (i > 0) pdf.addPage();

            const currentProcessed = Math.min(i + 2, total);
            setDownloadProgress({
                current: currentProcessed,
                total,
                percentage: Math.round((currentProcessed / total) * 100)
            });

            // Item 1 (Top half)
            if (cards[0]) {
                const canvas1 = await html2canvas(cards[0], { 
                    scale: renderScale, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff' 
                });
                const imgData1 = canvas1.toDataURL('image/jpeg', 0.90);
                const imgProps1 = pdf.getImageProperties(imgData1);
                const pdfImgHeight1 = (imgProps1.height * (pdfWidth - 10)) / imgProps1.width;

                pdf.addImage(imgData1, 'JPEG', 5, 5, pdfWidth - 10, Math.min(pdfImgHeight1, (pdfHeight / 2) - 10));
            }

            // Item 2 (Bottom half, if exists)
            if (cards[1]) {
                const canvas2 = await html2canvas(cards[1], { 
                    scale: renderScale, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: '#ffffff' 
                });
                const imgData2 = canvas2.toDataURL('image/jpeg', 0.90);
                const imgProps2 = pdf.getImageProperties(imgData2);
                const pdfImgHeight2 = (imgProps2.height * (pdfWidth - 10)) / imgProps2.width;

                pdf.addImage(imgData2, 'JPEG', 5, (pdfHeight / 2) + 5, pdfWidth - 10, Math.min(pdfImgHeight2, (pdfHeight / 2) - 10));
            }

            // Yield control to browser main thread
            await new Promise(resolve => setTimeout(resolve, 15));
        }

        return pdf;
    };

    // Fast non-blocking background PDF generator using isolated staging rendering
    const startBatchPdfDownload = async (invoices: Invoice[]) => {
        if (!invoices || invoices.length === 0) return;

        const itemsToProcess = [...invoices];
        const total = itemsToProcess.length;
        setActiveInvoices(itemsToProcess);

        setIsDownloading(true);
        setDownloadProgress({ current: 0, total, percentage: 0 });

        addToast({ 
            type: 'info', 
            title: '⚡ Proceso en Segundo Plano', 
            message: `Generando PDF para ${total} Guía(s) Porte en segundo plano. Puedes cambiar de módulo o seguir navegando.` 
        });

        try {
            const pdf = await generateBatchPdfDoc(itemsToProcess);
            const fileName = total === 1 
                ? `guia-porte-${itemsToProcess[0].invoiceNumber}.pdf` 
                : `guias-porte-lote-${total}-items.pdf`;

            pdf.save(fileName);
            addToast({ 
                type: 'success', 
                title: 'Descarga Completada', 
                message: `Se descargó exitosamente el archivo ${fileName} con ${total} guía(s).` 
            });
        } catch (err: any) {
            console.error(err);
            addToast({ 
                type: 'error', 
                title: 'Error en Segundo Plano', 
                message: err.message || 'Ocurrió un problema durante la generación del PDF.' 
            });
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
            setStagingBatchInvoices([]);
        }
    };

    // Native PDF Viewer
    const openNativePdfViewer = async (invoices: Invoice[]) => {
        if (!invoices || invoices.length === 0) return;
        const total = invoices.length;
        setActiveInvoices(invoices);

        setIsDownloading(true);
        setDownloadProgress({ current: 0, total, percentage: 0 });

        addToast({ 
            type: 'info', 
            title: 'Cargando Visor PDF Nativo', 
            message: `Preparando documento PDF para ${total} guía(s)... Puedes navegar por el sistema mientras carga.` 
        });

        try {
            const pdf = await generateBatchPdfDoc(invoices);
            const blob = pdf.output('blob');
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
            const blobUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(blobUrl);
            setIsPdfModalOpen(true);
        } catch (err: any) {
            console.error(err);
            addToast({ 
                type: 'error', 
                title: 'Error al Abrir Visor PDF', 
                message: err.message || 'Ocurrió un problema al generar el documento.' 
            });
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
            setStagingBatchInvoices([]);
        }
    };

    const closePdfModal = () => setIsPdfModalOpen(false);

    return (
        <PdfDownloadContext.Provider value={{
            isDownloading,
            downloadProgress,
            pdfBlobUrl,
            isPdfModalOpen,
            startBatchPdfDownload,
            openNativePdfViewer,
            closePdfModal
        }}>
            {children}

            {/* Floating Sticky Background Progress Banner - Persistent App-Wide */}
            {isDownloading && downloadProgress && (
                <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white shadow-2xl rounded-xl p-4 border border-blue-500/50 w-80 md:w-96 animate-fade-in pointer-events-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
                            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                                ⚡ Descarga en Segundo Plano
                            </span>
                        </div>
                        <span className="text-xs font-black text-blue-400">
                            {downloadProgress.percentage}%
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-200 mb-2">
                        Procesando {downloadProgress.current} de {downloadProgress.total} Guías Porte...
                    </p>
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden mb-2">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-200" 
                            style={{ width: `${downloadProgress.percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-[11px] text-gray-400">
                        Puedes cambiar de módulo o trabajar sin interrumpir la descarga.
                    </p>
                </div>
            )}

            {/* Native PDF Viewer Modal - Persistent App-Wide */}
            {isPdfModalOpen && pdfBlobUrl && (
                <Modal
                    isOpen={isPdfModalOpen}
                    onClose={closePdfModal}
                    title={`Visor PDF Nativo del Navegador (${activeInvoices.length} Guía${activeInvoices.length > 1 ? 's' : ''})`}
                    size="5xl"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b pb-3 dark:border-gray-700">
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                            📄 Documento PDF listo. Usa los controles nativos para imprimir o descargar.
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    const win = window.open(pdfBlobUrl, '_blank');
                                    if (win) win.focus();
                                }}
                            >
                                Abrir Pestaña Completa
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => startBatchPdfDownload(activeInvoices)}
                            >
                                <DownloadIcon className="w-4 h-4 mr-1.5" />
                                Guardar Archivo PDF
                            </Button>
                        </div>
                    </div>

                    <div className="w-full h-[75vh] bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-inner">
                        <iframe 
                            src={pdfBlobUrl} 
                            className="w-full h-full border-0" 
                            title="Visor PDF Nativo del Navegador" 
                        />
                    </div>
                </Modal>
            )}

            {/* Offscreen Isolated Staging Node for Ultra-Fast html2canvas Rendering - Persistent App-Wide */}
            <div 
                ref={stagingContainerRef} 
                className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 space-y-4 max-w-[850px]"
            >
                {stagingBatchInvoices.map((inv, idx) => (
                    <div key={`staging-${inv.id}-${idx}`} className="bg-white p-2 border border-gray-200">
                        <SingleGuiaPorteCard
                            invoice={inv}
                            companyInfo={companyInfo}
                            shippingTypes={shippingTypes}
                            offices={offices}
                            isHalfPage={true}
                        />
                    </div>
                ))}
            </div>
        </PdfDownloadContext.Provider>
    );
};

export const usePdfDownload = () => {
    const context = useContext(PdfDownloadContext);
    if (!context) {
        throw new Error('usePdfDownload must be used within a PdfDownloadProvider');
    }
    return context;
};
