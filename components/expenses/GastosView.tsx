import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Supplier, Office, User, Permissions } from '../../types';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { TrashIcon, PlusCircleIcon, CreditCardIcon, BuildingOfficeIcon, SearchIcon } from '../icons/Icons';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../../contexts/ConfirmationContext';
import usePagination from '../../hooks/usePagination';
import PaginationControls from '../ui/PaginationControls';

interface GastosViewProps {
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    suppliers: Supplier[];
    offices: Office[];
    currentUser: User;
    permissions: Permissions;
    onSaveExpense: (expense: Expense) => Promise<void>;
    onDeleteExpense: (expenseId: string) => Promise<void>;
    bcvRate?: number;
}

interface ExpenseFormLine {
    id: string;
    date: string;
    supplierId: string;
    supplierName: string;
    categoryId: string;
    categoryName: string;
    description: string;
    amountBs: string;
}

const ITEMS_PER_PAGE = 10;

export const GastosView: React.FC<GastosViewProps> = ({
    expenses,
    expenseCategories,
    suppliers,
    offices,
    currentUser,
    permissions,
    onSaveExpense,
    onDeleteExpense,
    bcvRate = 746.63
}) => {
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    // Office Selection
    const userOffice = offices.find(o => o.id === currentUser.officeId || o.name === currentUser.officeId);
    const hasManageAll = permissions['expenses.manage_all_offices'] || permissions['config.users.manage'] || currentUser.roleId === 'role-admin' || currentUser.roleId === 'role-tech';

    const [selectedOfficeId, setSelectedOfficeId] = useState<string>(
        hasManageAll ? '' : (userOffice?.id || currentUser.officeId || '')
    );

    // Helper for local YYYY-MM-DD
    const getTodayLocalStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper for displaying dates without UTC shift
    const formatDateDisplay = (dateStr?: string) => {
        if (!dateStr) return '-';
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    };

    const todayStr = getTodayLocalStr();

    // Multi-line form state
    const [lines, setLines] = useState<ExpenseFormLine[]>([
        {
            id: 'line-1',
            date: todayStr,
            supplierId: '',
            supplierName: '',
            categoryId: '',
            categoryName: '',
            description: '',
            amountBs: ''
        }
    ]);

    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Handle adding a line
    const handleAddLine = () => {
        setLines(prev => [
            ...prev,
            {
                id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                date: todayStr,
                supplierId: '',
                supplierName: '',
                categoryId: '',
                categoryName: '',
                description: '',
                amountBs: ''
            }
        ]);
    };

    // Handle removing a line
    const handleRemoveLine = (id: string) => {
        if (lines.length === 1) {
            addToast({ type: 'warning', title: 'Atención', message: 'Debe haber al menos una línea en el registro.' });
            return;
        }
        setLines(prev => prev.filter(l => l.id !== id));
    };

    // Handle updating field in line
    const handleUpdateLine = (id: string, field: keyof ExpenseFormLine, value: string) => {
        setLines(prev => prev.map(line => {
            if (line.id !== id) return line;

            const updated = { ...line, [field]: value };

            if (field === 'supplierId') {
                const supp = suppliers.find(s => s.id === value);
                updated.supplierName = supp ? supp.name : value;
            }

            if (field === 'categoryId') {
                const cat = expenseCategories.find(c => c.id === value);
                updated.categoryName = cat ? cat.name : value;
            }

            return updated;
        }));
    };

    // Save all lines
    const handleSaveAllExpenses = async (e: React.FormEvent) => {
        e.preventDefault();

        // Target Office ID
        const targetOfficeId = selectedOfficeId || userOffice?.id || currentUser.officeId || 'OFICINA-CENTRAL';

        // Validate
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const amount = parseFloat(line.amountBs);
            if (!line.date) {
                addToast({ type: 'error', title: 'Error de Validación', message: `Fila ${i + 1}: Indique la fecha del gasto.` });
                return;
            }
            if (!line.description.trim()) {
                addToast({ type: 'error', title: 'Error de Validación', message: `Fila ${i + 1}: Indique una descripción.` });
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                addToast({ type: 'error', title: 'Error de Validación', message: `Fila ${i + 1}: Ingrese un monto mayor a 0.` });
                return;
            }
        }

        setIsSaving(true);
        try {
            for (const line of lines) {
                const newExpense: Partial<Expense> = {
                    date: line.date,
                    description: line.description.trim(),
                    amount: parseFloat(line.amountBs),
                    category: line.categoryName || 'General',
                    registeredBy: currentUser.username,
                    status: 'Pagado'
                };

                if (line.categoryId && line.categoryId !== 'cat-general') {
                    newExpense.categoryId = line.categoryId;
                }
                if (targetOfficeId && targetOfficeId !== 'OFICINA-CENTRAL') {
                    newExpense.officeId = targetOfficeId;
                }
                if (line.supplierId) {
                    newExpense.supplierId = line.supplierId;
                }
                if (line.supplierName) {
                    newExpense.supplierName = line.supplierName;
                }

                await onSaveExpense(newExpense as Expense);
            }

            addToast({ type: 'success', title: 'Gastos Registrados', message: `Se registraron ${lines.length} gasto(s) exitosamente.` });
            
            // Reset form
            setLines([
                {
                    id: 'line-1',
                    date: todayStr,
                    supplierId: '',
                    supplierName: '',
                    categoryId: '',
                    categoryName: '',
                    description: '',
                    amountBs: ''
                }
            ]);
        } catch (err: any) {
            console.error(err);
            addToast({ type: 'error', title: 'Error al Guardar', message: err.message || 'No se pudieron registrar los gastos.' });
        } finally {
            setIsSaving(false);
        }
    };

    // Filtered Expenses List
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            if (selectedOfficeId && exp.officeId !== selectedOfficeId) {
                const targetOff = offices.find(o => o.id === selectedOfficeId || o.name === selectedOfficeId);
                if (exp.officeId !== targetOff?.id && exp.officeId !== targetOff?.name) {
                    return false;
                }
            }

            if (filterCategory && exp.categoryId !== filterCategory) {
                return false;
            }

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const desc = (exp.description || '').toLowerCase();
                const supp = (exp.supplierName || '').toLowerCase();
                const cat = (exp.categoryName || '').toLowerCase();
                if (!desc.includes(term) && !supp.includes(term) && !cat.includes(term)) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedOfficeId, filterCategory, searchTerm, offices]);

    const { paginatedData, currentPage, totalPages, setCurrentPage, totalItems } = usePagination(filteredExpenses, ITEMS_PER_PAGE);

    // Calculate total amount in filtered expenses
    const totalAmountBs = useMemo(() => {
        return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }, [filteredExpenses]);

    // Handle Delete
    const handleDelete = async (expenseId: string, desc: string) => {
        const ok = await confirm({
            title: '¿Eliminar Gasto?',
            message: `¿Está seguro de que desea eliminar el gasto "${desc}"? Esta acción no se puede deshacer.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (ok) {
            try {
                await onDeleteExpense(expenseId);
                addToast({ type: 'success', title: 'Gasto Eliminado', message: 'El gasto ha sido eliminado correctamente.' });
            } catch (err: any) {
                console.error(err);
                addToast({ type: 'error', title: 'Error', message: err.message || 'No se pudo eliminar el gasto.' });
            }
        }
    };

    if (!permissions['gastos.view'] && !permissions['libro-contable.view']) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                    <p className="text-sm text-gray-500">No tienes permisos para acceder al módulo de gastos.</p>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Top Status Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCardIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
                        Gastos por Oficina
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Añada y gestione los gastos operativos de forma independiente para cada oficina o sucursal.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* BCV Rate Badge */}
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Dólar (BCV): {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </div>

                    {/* Office Context Switcher */}
                    {hasManageAll ? (
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                            <BuildingOfficeIcon className="w-4 h-4 text-gray-500 ml-1" />
                            <select
                                value={selectedOfficeId}
                                onChange={e => setSelectedOfficeId(e.target.value)}
                                className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none pr-2 cursor-pointer"
                            >
                                <option value="">Todas las Oficinas</option>
                                {offices.map(off => (
                                    <option key={off.id} value={off.id}>{off.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                            Oficina: {userOffice?.name || currentUser.officeId || 'Mi Oficina'}
                        </div>
                    )}
                </div>
            </div>

            {/* Card 1: Registro de Gastos Form */}
            {permissions['gastos.create'] !== false && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center w-full">
                            <div>
                                <CardTitle>Registro de Gastos</CardTitle>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Añada los gastos de forma rápida seleccionando Proveedor, Categoría y Monto.
                                </p>
                            </div>
                            <Button 
                                type="button" 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleAddLine}
                                title="Añadir otra línea de gasto"
                            >
                                <PlusCircleIcon className="w-4 h-4 mr-1 text-blue-600" />
                                Añadir Fila
                            </Button>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSaveAllExpenses} className="space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50">
                                        <th className="py-2 px-3 w-36">FECHA</th>
                                        <th className="py-2 px-3 w-48">PROVEEDOR</th>
                                        <th className="py-2 px-3 w-48">CATEGORÍA</th>
                                        <th className="py-2 px-3">DESCRIPCIÓN</th>
                                        <th className="py-2 px-3 w-36">MONTO (BS)</th>
                                        <th className="py-2 px-3 w-16 text-center">ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {lines.map((line, index) => (
                                        <tr key={line.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30">
                                            <td className="py-2 px-2 align-top">
                                                <input
                                                    type="date"
                                                    value={line.date}
                                                    readOnly
                                                    disabled
                                                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium cursor-not-allowed select-none"
                                                    title="La fecha se fija automáticamente al día actual del registro"
                                                />
                                            </td>
                                            <td className="py-2 px-2 align-top">
                                                <select
                                                    value={line.supplierId}
                                                    onChange={e => handleUpdateLine(line.id, 'supplierId', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                                                >
                                                    <option value="">Seleccione Proveedor...</option>
                                                    {suppliers.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-2 align-top">
                                                <select
                                                    value={line.categoryId}
                                                    onChange={e => handleUpdateLine(line.id, 'categoryId', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                                                >
                                                    <option value="">Seleccione Categoría...</option>
                                                    {expenseCategories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-2 align-top">
                                                <input
                                                    type="text"
                                                    placeholder="Descripción del gasto"
                                                    value={line.description}
                                                    onChange={e => handleUpdateLine(line.id, 'description', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                                                    required
                                                />
                                            </td>
                                            <td className="py-2 px-2 align-top">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={line.amountBs}
                                                    onChange={e => handleUpdateLine(line.id, 'amountBs', e.target.value)}
                                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none text-right"
                                                    required
                                                />
                                            </td>
                                            <td className="py-2 px-2 text-center align-top">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLine(line.id)}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                                    title="Eliminar fila"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2 border-t dark:border-gray-700">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar Gasto'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Card 2: Gastos Registrados Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                        <div>
                            <CardTitle>Gastos Registrados</CardTitle>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Histórico de egresos registrados {selectedOfficeId ? 'para la oficina seleccionada' : 'globalmente'}.
                            </p>
                        </div>
                        <div className="text-right bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block">Total Gastos (Filtrados)</span>
                            <span className="text-base font-black text-red-600 dark:text-red-400">
                                Bs. {totalAmountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </CardHeader>

                {/* Filter bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-2 mb-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <Input
                        label="Buscar Gasto"
                        id="search-gastos"
                        placeholder="Buscar por descripción, proveedor..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        icon={<SearchIcon className="w-4 h-4 text-gray-400" />}
                    />

                    <Select
                        label="Filtrar por Categoría"
                        id="category-filter"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="">Todas las Categorías</option>
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </Select>

                    {hasManageAll && (
                        <Select
                            label="Filtrar por Oficina"
                            id="office-list-filter"
                            value={selectedOfficeId}
                            onChange={e => setSelectedOfficeId(e.target.value)}
                        >
                            <option value="">Todas las Oficinas</option>
                            {offices.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </Select>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">FECHA</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">PROVEEDOR</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">CATEGORÍA</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">DESCRIPCIÓN</th>
                                {hasManageAll && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">OFICINA</th>}
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">MONTO (BS)</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            {paginatedData.map(exp => {
                                const supplierName = exp.supplierName || suppliers.find(s => s.id === exp.supplierId)?.name || '-';
                                const categoryName = exp.categoryName || expenseCategories.find(c => c.id === exp.categoryId)?.name || 'General';
                                const officeObj = offices.find(o => o.id === exp.officeId || o.name === exp.officeId);
                                const officeName = officeObj?.name || exp.officeId || 'General';

                                return (
                                    <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {formatDateDisplay(exp.date)}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                            {supplierName}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                {categoryName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                                            {exp.description}
                                        </td>
                                        {hasManageAll && (
                                            <td className="px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                {officeName}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-right font-black text-red-600 dark:text-red-400 whitespace-nowrap">
                                            Bs. {(exp.amount || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-center whitespace-nowrap">
                                            {permissions['gastos.delete'] !== false && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(exp.id, exp.description)}
                                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                                    title="Eliminar gasto"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {paginatedData.length === 0 && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No se encontraron gastos registrados para esta oficina o criterio.
                        </div>
                    )}
                </div>

                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            </Card>
        </div>
    );
};

export default GastosView;
