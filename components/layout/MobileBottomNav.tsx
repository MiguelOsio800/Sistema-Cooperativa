import React, { useState } from 'react';
import { Page, Permissions, User } from '../../types';
import { ReceiptIcon, UsersIcon, PlusIcon, BarChartIcon, LogOutIcon, XIcon } from '../icons/Icons';

interface MobileBottomNavProps {
    currentPage: Page;
    permissions: Permissions;
    currentUser: User;
    onLogout: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
    currentPage,
    permissions,
    currentUser,
    onLogout
}) => {
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const isInvoicesActive = currentPage === 'invoices' || currentPage === 'edit-invoice';
    const isClientesActive = currentPage === 'clientes';
    const isCreateInvoiceActive = currentPage === 'shipping-guide';
    const isReportsActive = currentPage === 'reports' || currentPage === 'report-detail';

    const handleCreateInvoiceClick = () => {
        // If already on shipping-guide, take them back to home/dashboard
        if (currentPage === 'shipping-guide') {
            window.location.hash = 'dashboard';
            return;
        }

        const isAdminOrTech = ['role-admin', 'role-tech'].includes(currentUser?.roleId || '');
        const canAccessShipping = isAdminOrTech || permissions['shipping-guide.view'] !== false;

        if (canAccessShipping) {
            window.location.hash = 'shipping-guide';
        } else {
            // Si no tiene acceso o no puede llevarlo a crear factura, lo lleva a inicio
            window.location.hash = 'dashboard';
        }
    };

    return (
        <>
            {/* Modal de confirmación para salir (sin usar window.confirm) */}
            {showLogoutModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
                    onClick={() => setShowLogoutModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl border border-gray-100 dark:border-gray-700 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
                            <LogOutIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">¿Cerrar sesión?</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-5">
                            Tu sesión de trabajo se cerrará de forma segura.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowLogoutModal(false);
                                    onLogout();
                                }}
                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-md shadow-red-600/30"
                            >
                                Sí, Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Barra de Navegación Inferior Móvil */}
            <nav 
                className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1"
                aria-label="Navegación Móvil"
            >
                <div className="grid grid-cols-5 items-end px-2 max-w-md mx-auto">
                    {/* Botón 1: Facturar */}
                    <button
                        type="button"
                        onClick={() => { window.location.hash = 'invoices'; }}
                        className={`flex flex-col items-center justify-center py-1.5 transition-colors duration-150 ${
                            isInvoicesActive 
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        <ReceiptIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] tracking-tight">Facturar</span>
                    </button>

                    {/* Botón 2: Clientes */}
                    <button
                        type="button"
                        onClick={() => { window.location.hash = 'clientes'; }}
                        className={`flex flex-col items-center justify-center py-1.5 transition-colors duration-150 ${
                            isClientesActive 
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        <UsersIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] tracking-tight">Clientes</span>
                    </button>

                    {/* Botón 3 Central: (+) Crear Factura / Inicio */}
                    <div className="relative flex flex-col items-center justify-center -top-4">
                        <button
                            type="button"
                            onClick={handleCreateInvoiceClick}
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 active:scale-95 focus:outline-none border-4 border-white dark:border-gray-900 ${
                                isCreateInvoiceActive
                                    ? 'bg-emerald-700 shadow-emerald-700/50 ring-2 ring-emerald-500'
                                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/40'
                            }`}
                            title="Crear Factura / Guía de Envío"
                            aria-label="Crear Factura"
                        >
                            <PlusIcon className="w-7 h-7 stroke-[2.5]" />
                        </button>
                        <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-tight mt-0.5">
                            {isCreateInvoiceActive ? 'Inicio' : 'Crear'}
                        </span>
                    </div>

                    {/* Botón 4: Reportes */}
                    <button
                        type="button"
                        onClick={() => { window.location.hash = 'reports'; }}
                        className={`flex flex-col items-center justify-center py-1.5 transition-colors duration-150 ${
                            isReportsActive 
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                        <BarChartIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] tracking-tight">Reportes</span>
                    </button>

                    {/* Botón 5: Salir */}
                    <button
                        type="button"
                        onClick={() => setShowLogoutModal(true)}
                        className="flex flex-col items-center justify-center py-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
                        title="Cerrar sesión"
                    >
                        <LogOutIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] tracking-tight">Salir</span>
                    </button>
                </div>
            </nav>
        </>
    );
};

export default MobileBottomNav;
