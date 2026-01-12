
import { ShippingGuide, CompanyInfo, Financials, Invoice } from '../types';

/**
 * Calculates all financial details for a given shipping guide.
 * This centralized function ensures consistency across the application.
 * @param guide The shipping guide containing all merchandise and shipping details.
 * @param companyInfo The company's configuration, including cost per kg.
 * @returns A Financials object with all calculated values.
 */
export const calculateFinancialDetails = (guide: ShippingGuide, companyInfo: CompanyInfo): Financials => {
    // Return zeroed financials if there's no merchandise or guide
    if (!guide || !guide.merchandise) {
        return { freight: 0, insuranceCost: 0, handling: 0, discount: 0, subtotal: 0, ipostel: 0, iva: 0, igtf: 0, total: 0 };
    }

    // NUEVO: Flete es el monto manual ingresado
    const freight = parseFloat(String(guide.baseFreightAmount)) || 0;

    // Calculate discount from freight value
    const discountPercentage = parseFloat(String(guide.discountPercentage)) || 0;
    const discountAmount = guide.hasDiscount
        ? freight * (discountPercentage / 100)
        : 0;

    const freightAfterDiscount = freight - discountAmount;
    
    // Insurance is calculated on the declared value
    const declaredValue = parseFloat(String(guide.declaredValue)) || 0;
    const insurancePercentage = parseFloat(String(guide.insurancePercentage)) || 0;
    const insuranceCost = guide.hasInsurance ? declaredValue * (insurancePercentage / 100) : 0;
    
    // NUEVO: El campo costPerKg ahora se usa como cargo fijo por Manejo/Guía
    const handling = parseFloat(String(companyInfo.costPerKg)) || 0;

    const subtotal = freightAfterDiscount + insuranceCost + handling;
    
    // Cálculo del Peso Total
    const totalWeight = guide.merchandise.reduce((acc, item) => {
        return acc + (parseFloat(String(item.weight)) || 0) * (parseFloat(String(item.quantity)) || 1);
    }, 0);

    /**
     * REGLA REFINADA DE IPOSTEL:
     * - Si el peso es 0: No se calcula (valor mínimo).
     * - Si el peso está entre 0.1 y 30.99 kg: Se calcula el 6% del flete.
     * - Si el peso es 31 kg o más: No se calcula (valor mínimo).
     */
    const ipostel = (totalWeight >= 0.1 && totalWeight <= 30.99) 
        ? (freight * 0.06) 
        : 0.000001;
    
    // IVA is now 0 as per cooperative rules
    const iva = 0;

    const preIgtfTotal = subtotal + ipostel + iva;

    // IGTF (3%) is applied if the payment currency is USD
    const igtf = guide.paymentCurrency === 'USD' ? preIgtfTotal * 0.03 : 0;
    
    const total = preIgtfTotal + igtf;

    return { freight, insuranceCost, handling, discount: discountAmount, subtotal, ipostel, iva, igtf, total };
};


/**
 * Calculates the total chargeable weight for a given invoice.
 * @param invoice The invoice object.
 * @returns The total chargeable weight in Kg.
 */
export const calculateInvoiceChargeableWeight = (invoice: Invoice): number => {
    if (!invoice || !invoice.guide || !invoice.guide.merchandise) {
        return 0;
    }
    return invoice.guide.merchandise.reduce((acc, item) => {
        const realWeight = parseFloat(String(item.weight)) || 0;
        const length = parseFloat(String(item.length)) || 0;
        const width = parseFloat(String(item.width)) || 0;
        const height = parseFloat(String(item.height)) || 0;
        const quantity = parseFloat(String(item.quantity)) || 1;
        const volumetricWeight = (length * width * height) / 5000;
        return acc + Math.max(realWeight, volumetricWeight) * quantity;
    }, 0);
};

export interface DetailedFinancials {
    pagado: {
        flete: number;
        viajes: number;
        sobres: number;
        seguro: number;
        ipostel: number;
        manejo: number;
        iva: number;
        favorCooperativa: number;
        favorAsociado: number;
    };
    destino: {
        flete: number;
        viajes: number;
        sobres: number;
        seguro: number;
        ipostel: number;
        manejo: number;
        iva: number;
        favorCooperativa: number;
        favorAsociado: number;
    };
    totalDestino: number; // Total amount to be collected at destination (for reference)
}

export const calculateDetailedRemesaFinancials = (invoices: Invoice[], companyInfo: CompanyInfo): DetailedFinancials => {
    const init = { flete: 0, viajes: 0, sobres: 0, seguro: 0, ipostel: 0, manejo: 0, iva: 0, favorCooperativa: 0, favorAsociado: 0 };
    
    const result: DetailedFinancials = {
        pagado: { ...init },
        destino: { ...init },
        totalDestino: 0
    };

    invoices.forEach(inv => {
        const fin = calculateFinancialDetails(inv.guide, companyInfo);
        const target = inv.guide.paymentType === 'flete-pagado' ? result.pagado : result.destino;

        target.flete += fin.freight;
        target.seguro += fin.insuranceCost;
        target.ipostel += fin.ipostel;
        target.manejo += fin.handling;
        target.iva += fin.iva;
        
        // Business Logic for Distribution:
        // Cooperativa gets 25% of Freight
        // Asociado gets 75% of Freight MINUS deductions (Ipostel, Seguro, Manejo, IVA)
        
        const coopShare = fin.freight * 0.25;
        const deductions = fin.ipostel + fin.insuranceCost + fin.handling + fin.iva;
        const associateShare = fin.freight - coopShare - deductions;

        target.favorCooperativa += coopShare;
        target.favorAsociado += associateShare;

        if (inv.guide.paymentType === 'flete-destino') {
            result.totalDestino += fin.total;
        }
    });

    return result;
};
