
import { ShippingGuide, CompanyInfo, Financials, Invoice, ShippingType, Asociado } from '../types';

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

    // Flete es el monto manual ingresado
    const freight = parseFloat(String(guide.baseFreightAmount)) || 0;

    // Calculate discount from freight value
    const discountPercentage = parseFloat(String(guide.discountPercentage)) || 0;
    const discountAmount = guide.hasDiscount
        ? Number(((freight * (discountPercentage / 100))).toFixed(2))
        : 0;

    const freightAfterDiscount = Math.max(0, freight - discountAmount);
    
    // Insurance is calculated on the declared value
    const declaredValue = parseFloat(String(guide.declaredValue)) || 0;
    const insurancePercentage = parseFloat(String(guide.insurancePercentage)) || 0;
    const insuranceCost = guide.hasInsurance ? Number(((declaredValue * (insurancePercentage / 100))).toFixed(2)) : 0;
    
    // Cargo fijo por Manejo/Guía
    const handling = parseFloat(String(companyInfo.costPerKg)) || 0;

    const subtotal = Number((freightAfterDiscount + insuranceCost + handling).toFixed(2));
    
    // Cálculo del Peso Total Real (Cantidad x Peso unitario) para transporte y visualización
    const totalWeight = guide.merchandise.reduce((acc, item) => {
        const unitWeight = parseFloat(String(item.weight)) || 0;
        const qty = parseFloat(String(item.quantity)) || 1;
        return acc + (unitWeight * qty);
    }, 0);

    /**
     * REGLA CANÓNICA DE IPOSTEL:
     * La normativa postal evalúa cada pieza o bulto individual:
     * - Si al menos una mercancía registrada tiene un peso unitario mayor a 0 y menor o igual a 30.99 kg,
     *   la factura aplica el 6% (0.06) sobre el flete neto (freightAfterDiscount).
     * - Si todos los bultos superan 30.99 kg o no hay mercancías válidas, el IPOSTEL es 0 (exento).
     */
    const appliesIpostel = guide.merchandise.some(item => {
        const unitWeight = parseFloat(String(item.weight)) || 0;
        return unitWeight > 0 && unitWeight <= 30.99;
    });
    const ipostel = appliesIpostel 
        ? Number((freightAfterDiscount * 0.06).toFixed(2)) 
        : 0;
    
    // IVA es 0% por cooperativa/régimen de transporte
    const iva = 0;

    const preIgtfTotal = Number((subtotal + ipostel + iva).toFixed(2));

    // IGTF (3%) si el pago es en divisas / USD
    const isUsd = guide.paymentCurrency === 'USD' || (guide.paymentCurrency as string) === 'DIVISA';
    const igtf = isUsd ? Number((preIgtfTotal * 0.03).toFixed(2)) : 0;
    
    const total = Number((preIgtfTotal + igtf).toFixed(2));

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
        const qty = parseFloat(String(item.quantity)) || 1;
        const length = parseFloat(String(item.length)) || 0;
        const width = parseFloat(String(item.width)) || 0;
        const height = parseFloat(String(item.height)) || 0;
        const volumetricWeight = (length * width * height) / 5000;
        return acc + (Math.max(realWeight, volumetricWeight) * qty);
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
    totalDestino: number;
    totalPagado: number;
    cargosDestino: number;
    cargosPagado: number;
    favorSocioPagado: number;
    cooperativeAmount: number;
    saldoFinal: number;
    conceptoSaldo: string;
    modalidadSaldo: 'Destino' | 'Pagado' | 'Iguales';
}

export const calculateDetailedRemesaFinancials = (
    invoices: Invoice[], 
    companyInfo: CompanyInfo, 
    shippingTypes: ShippingType[],
    asociado?: Asociado
): DetailedFinancials => {
    const init = { flete: 0, viajes: 0, sobres: 0, seguro: 0, ipostel: 0, manejo: 0, iva: 0, favorCooperativa: 0, favorAsociado: 0 };
    
    // Paso 1: Segregación de Acumuladores
    const result: DetailedFinancials = {
        pagado: { ...init },
        destino: { ...init },
        totalDestino: 0,
        totalPagado: 0,
        cargosDestino: 0,
        cargosPagado: 0,
        favorSocioPagado: 0,
        cooperativeAmount: 0,
        saldoFinal: 0,
        conceptoSaldo: 'Ceros',
        modalidadSaldo: 'Iguales'
    };

    const isNoAsociado = asociado?.nombre.toLowerCase().includes('no asociado') || asociado?.nombre.toLowerCase().includes('no asociados');

    invoices.forEach(inv => {
        const fin = calculateFinancialDetails(inv.guide, companyInfo);
        
        // Use historical values from invoice if available to prevent recalculation mismatches
        const handling = inv.Montomanejo !== undefined ? inv.Montomanejo : fin.handling;
        const ipostel = inv.ipostelFee !== undefined ? inv.ipostelFee : fin.ipostel;
        const insuranceCost = fin.insuranceCost;
        const iva = fin.iva;
        const totalAmount = inv.totalAmount; 

        // Flete neto es el restante del monto total menos seguro, ipostel, manejo e iva
        const fleteNeto = Math.max(0, totalAmount - (insuranceCost + ipostel + handling + iva));

        // Identifica el tipo de envío y si corresponde a Importación
        const shippingType = shippingTypes.find(st => st.id === inv.guide.shippingTypeId);
        const typeName = (shippingType?.name || inv.guide.shippingTypeId || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const isImportacion = typeName.includes('importaci') || inv.guide.shippingTypeId === 'st-importacion';

        // Identifica la comisión base de la cooperativa (favorCoop):
        // 10% del FLETE NETO para Importación (el 90% del flete neto queda a la oficina/socio),
        // o 15% / 30% del totalAmount según el tipo de envío y asociado para los demás envíos
        let coopPercentage = 0.30; 
        if (isImportacion) {
            coopPercentage = 0.10;
        } else if (!isNoAsociado) {
            if (typeName.includes('franquicia') || typeName.includes('expreso') || typeName.includes('mudanza')) {
                coopPercentage = 0.15;
            }
        }
        
        // En importación la comisión de la cooperativa es el 10% del FLETE NETO
        const favorCoop = isImportacion ? (fleteNeto * coopPercentage) : (totalAmount * coopPercentage);
        
        // Cargos extras son la comisión + todos los demás conceptos (que también son retenidos)
        const cargosExtrasFactura = favorCoop + insuranceCost + ipostel + handling + iva;
        
        // Lo que realmente le queda a favor al socio/oficina de esta factura (el 90% del flete neto en importación)
        const socioShare = totalAmount - cargosExtrasFactura;
        
        const flete = fleteNeto;

        if (inv.guide.paymentType === 'flete-pagado') {
            result.totalPagado += totalAmount;
            result.cargosPagado += cargosExtrasFactura;
            result.favorSocioPagado += socioShare;
            
            // For UI backward compatibility in report tables
            result.pagado.flete += flete;
            result.pagado.seguro += insuranceCost;
            result.pagado.ipostel += ipostel;
            result.pagado.manejo += handling;
            result.pagado.iva += iva;
            result.pagado.favorCooperativa += favorCoop;
            result.pagado.favorAsociado += socioShare;
        } else {
            result.totalDestino += totalAmount;
            result.cargosDestino += cargosExtrasFactura;
            
            // For UI backward compatibility in report tables
            result.destino.flete += flete;
            result.destino.seguro += insuranceCost;
            result.destino.ipostel += ipostel;
            result.destino.manejo += handling;
            result.destino.iva += iva;
            result.destino.favorCooperativa += favorCoop;
            result.destino.favorAsociado += socioShare;
        }
    });

    // Paso 2: Implementación de las 4 Fórmulas Matemáticas
    if (result.totalDestino === 0 && result.totalPagado > 0) {
        // Fórmula 3 (Solo Pagado)
        result.cooperativeAmount = result.cargosPagado;
        result.saldoFinal = -result.favorSocioPagado; // Socio favor = negative
        result.conceptoSaldo = 'Saldo a favor del socio';
        result.modalidadSaldo = 'Pagado';
    } else if (result.totalPagado === 0 && result.totalDestino > 0) {
        // Fórmula 4 (Solo Destino)
        result.cooperativeAmount = result.cargosDestino;
        result.saldoFinal = result.cargosDestino; // Coop favor = positive
        result.conceptoSaldo = 'Saldo a pagar a la cooperativa';
        result.modalidadSaldo = 'Destino';
    } else {
        // Fórmulas 1 y 2 (Mixed)
        const netCoopAmount = result.cargosDestino - result.favorSocioPagado;
        result.cooperativeAmount = netCoopAmount;
        
        if (netCoopAmount > 0) {
            // Fórmula 1: Saldo a favor de la cooperativa
            result.saldoFinal = netCoopAmount;
            result.conceptoSaldo = 'Saldo a pagar a la cooperativa';
            result.modalidadSaldo = 'Destino';
        } else if (netCoopAmount < 0) {
            // Fórmula 2: Saldo a favor del socio
            result.saldoFinal = netCoopAmount; // Keep negative
            result.conceptoSaldo = 'Saldo a favor del socio';
            result.modalidadSaldo = 'Pagado';
        } else {
            result.saldoFinal = 0;
            result.conceptoSaldo = 'Saldo neutral';
            result.modalidadSaldo = 'Iguales';
        }
    }

    return result;
};
