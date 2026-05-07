import React, { useState, useEffect } from 'react';
import { CompanyInfo } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { SettingsIcon, SaveIcon } from '../icons/Icons';

interface ParametrosGeneralesProps {
    companyInfo: CompanyInfo;
    onSave: (info: CompanyInfo) => Promise<void>;
}

const ParametrosGenerales: React.FC<ParametrosGeneralesProps> = ({ companyInfo, onSave }) => {
    const ensureRules = (baseRules: any) => {
        const defaultRules = {
            entidadTipo: 'Socio' as const,
            categorias: {
                expreso: { socio: 0, cooperativa: 100 },
                mudanza: { socio: 0, cooperativa: 100 },
                afiliado: { socio: 0, cooperativa: 100 },
                no_afiliado: { socio: 0, cooperativa: 100 },
                credito: { socio: 0, cooperativa: 100 },
            }
        };
        if (!baseRules || !baseRules.categorias) return defaultRules;
        return {
            entidadTipo: baseRules.entidadTipo || 'Socio',
            categorias: {
                expreso: baseRules.categorias.expreso || defaultRules.categorias.expreso,
                mudanza: baseRules.categorias.mudanza || defaultRules.categorias.mudanza,
                afiliado: baseRules.categorias.afiliado || defaultRules.categorias.afiliado,
                no_afiliado: baseRules.categorias.no_afiliado || defaultRules.categorias.no_afiliado,
                credito: baseRules.categorias.credito || defaultRules.categorias.credito,
            }
        };
    };

    const [info, setInfo] = useState<CompanyInfo>(() => ({
        ...companyInfo,
        remittanceRules: ensureRules(companyInfo.remittanceRules)
    }));

    const [ivaActivo, setIvaActivo] = useState<boolean>(false);

    useEffect(() => {
        setInfo({
            ...companyInfo,
            remittanceRules: ensureRules(companyInfo.remittanceRules)
        });
    }, [companyInfo]);

    useEffect(() => {
        const storedIva = localStorage.getItem('ivaActivo');
        if (storedIva === 'true') {
            setIvaActivo(true);
        }
    }, []);

    const handleIvaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setIvaActivo(isChecked);
        localStorage.setItem('ivaActivo', String(isChecked));
    };

    const getRules = () => {
        const defaultRules = {
            entidadTipo: 'Socio' as const,
            categorias: {
                expreso: { socio: 0, cooperativa: 100 },
                mudanza: { socio: 0, cooperativa: 100 },
                afiliado: { socio: 0, cooperativa: 100 },
                no_afiliado: { socio: 0, cooperativa: 100 },
                credito: { socio: 0, cooperativa: 100 },
            }
        };
        if (!info.remittanceRules || !info.remittanceRules.categorias) return defaultRules;
        
        return {
            entidadTipo: info.remittanceRules.entidadTipo || 'Socio',
            categorias: {
                expreso: info.remittanceRules.categorias.expreso || defaultRules.categorias.expreso,
                mudanza: info.remittanceRules.categorias.mudanza || defaultRules.categorias.mudanza,
                afiliado: info.remittanceRules.categorias.afiliado || defaultRules.categorias.afiliado,
                no_afiliado: info.remittanceRules.categorias.no_afiliado || defaultRules.categorias.no_afiliado,
                credito: info.remittanceRules.categorias.credito || defaultRules.categorias.credito,
            }
        };
    };

    const handleRemittanceRuleChange = (field: string, value: any) => {
        setInfo((prev) => {
            const currentRules = getRules();
            return {
                ...prev,
                remittanceRules: {
                    ...currentRules,
                    [field]: value
                }
            };
        });
    };

    const handleCategoryChange = (category: string, field: 'socio' | 'cooperativa', rawValue: string) => {
        let val = parseFloat(rawValue);
        if (isNaN(val)) val = 0;

        setInfo((prev) => {
            const currentRules = getRules();
            
            let newValueSocio = field === 'socio' ? val : 100 - val;
            let newValueCooperativa = field === 'cooperativa' ? val : 100 - val;

            // Ensure bounds
            if (newValueSocio > 100) newValueSocio = 100;
            if (newValueSocio < 0) newValueSocio = 0;
            if (newValueCooperativa > 100) newValueCooperativa = 100;
            if (newValueCooperativa < 0) newValueCooperativa = 0;

            const categoryKey = category as keyof typeof currentRules.categorias;
            if (currentRules.categorias[categoryKey]) {
                currentRules.categorias[categoryKey].socio = newValueSocio;
                currentRules.categorias[categoryKey].cooperativa = newValueCooperativa;
            }

            return {
                ...prev,
                remittanceRules: currentRules
            };
        });
    };

    const handleSubmit = async () => {
        await onSave({ ...info, remittanceRules: getRules() });
    };

    const rules = getRules();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center">
                    <SettingsIcon className="w-6 h-6 mr-3 text-primary-500" />
                    <CardTitle>Configuraciones y Parámetros Globales</CardTitle>
                </div>
            </CardHeader>
            <div className="space-y-8 p-4">
                {/* Reglas de Repartición de Remesas */}
                <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Reglas de Repartición de Remesas</h3>
                    <div className="max-w-sm mb-6">
                        <Select
                            label="Tipo de Entidad Múltiple"
                            value={rules.entidadTipo}
                            onChange={(e) => handleRemittanceRuleChange('entidadTipo', e.target.value)}
                        >
                            <option value="Socio">Socio / Cooperativa</option>
                            <option value="Empresa">100% Empresa</option>
                        </Select>
                    </div>

                    {rules.entidadTipo === 'Empresa' ? (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        Modo Empresa Activo: El 100% de las remesas se calculará a favor de la empresa. Los cálculos de socio quedan anulados.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(['expreso', 'mudanza', 'afiliado', 'no_afiliado', 'credito'] as const).map(category => (
                                <div key={category} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 capitalize mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">{category.replace('_', ' ')}</h4>
                                    <div className="space-y-4">
                                        <Input
                                            type="number"
                                            label="% Socio"
                                            value={rules.categorias[category]?.socio ?? 0}
                                            onChange={(e) => handleCategoryChange(category, 'socio', e.target.value)}
                                            min={0}
                                            max={100}
                                        />
                                        <Input
                                            type="number"
                                            label="% Empresa/Cooperativa"
                                            value={rules.categorias[category]?.cooperativa ?? 0}
                                            onChange={(e) => handleCategoryChange(category, 'cooperativa', e.target.value)}
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Settings Frontend */}
                <section>
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Ajustes Locales (Este Equipo)</h3>
                    <div className="flex items-center space-x-3 mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <input
                            type="checkbox"
                            id="ivaToggle"
                            checked={ivaActivo ?? false}
                            onChange={handleIvaChange}
                            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="ivaToggle" className="text-sm font-medium text-gray-900 cursor-pointer">
                            Activar cálculo de IVA en Facturación
                        </label>
                    </div>
                </section>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSubmit}>
                        <SaveIcon className="w-5 h-5 mr-2" />
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default ParametrosGenerales;
