
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { CompanyInfo, User, Role, Office, Category, ShippingType, PaymentMethod, Permissions, ExpenseCategory, CuentaContable } from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import { PLAN_DE_CUENTAS_INICIAL } from '../data/contabilidad';

type ConfigContextType = {
    companyInfo: CompanyInfo;
    categories: Category[];
    users: User[];
    roles: Role[];
    offices: Office[];
    shippingTypes: ShippingType[];
    paymentMethods: PaymentMethod[];
    expenseCategories: ExpenseCategory[];
    cuentasContables: CuentaContable[];
    userPermissions: Permissions;
    isLoading: boolean;
    handleLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
    handleLogout: () => Promise<void>;
    handleCompanyInfoSave: (info: CompanyInfo) => Promise<void>;
    handleSaveUser: (user: User) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    handleSaveRole: (role: Role) => Promise<void>;
    onDeleteRole: (roleId: string) => Promise<void>;
    onUpdateRolePermissions: (roleId: string, permissions: Permissions) => Promise<void>;
    handleSaveCategory: (category: Category) => Promise<void>;
    onDeleteCategory: (categoryId: string) => Promise<void>;
    handleSaveOffice: (office: Office) => Promise<void>;
    onDeleteOffice: (officeId: string) => Promise<void>;
    handleSaveShippingType: (shippingType: ShippingType) => Promise<void>;
    onDeleteShippingType: (shippingTypeId: string) => Promise<void>;
    handleSavePaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
    onDeletePaymentMethod: (paymentMethodId: string) => Promise<void>;
    handleSaveExpenseCategory: (category: ExpenseCategory) => Promise<void>;
    onDeleteExpenseCategory: (categoryId: string) => Promise<void>;
    handleSaveCuentaContable: (cuenta: CuentaContable) => Promise<void>;
    handleDeleteCuentaContable: (cuentaId: string) => Promise<void>;
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const FALLBACK_COMPANY_INFO: CompanyInfo = {
    name: 'Sistema de Gestión',
    rif: 'J-000000000',
    address: 'Sin Conexión al Servidor',
    phone: '',
};

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { isAuthenticated, currentUser, setIsAuthenticated, setCurrentUser, refreshUser } = useAuth();
    const hasLoadedRef = useRef(false);

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: 'Cargando...', rif: '', address: '', phone: '' });
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [offices, setOffices] = useState<Office[]>([]);
    const [shippingTypes, setShippingTypes] = useState<ShippingType[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [cuentasContables, setCuentasContables] = useState<CuentaContable[]>([]);
    const [userPermissions, setUserPermissions] = useState<Permissions>({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchSafe = useCallback(async <T,>(endpoint: string, fallbackValue: T): Promise<T> => {
        try {
            return await apiFetch<T>(endpoint);
        } catch (error: any) {
            return fallbackValue;
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            hasLoadedRef.current = false;
            fetchSafe<CompanyInfo>('/company-info', FALLBACK_COMPANY_INFO).then(setCompanyInfo);
            setIsLoading(false);
            return;
        }

        // Si ya cargamos para este usuario, no repetir para evitar bucles
        if (hasLoadedRef.current || !currentUser) return;

        const fetchConfigData = async () => {
            try {
                setIsLoading(true);
                hasLoadedRef.current = true;
                
                const isAdmin = ['role-admin', 'role-tech'].includes(currentUser.roleId);
                const perms = currentUser.permissions || {};

                // 1. Carga de datos base (Empresa y Oficinas)
                const [infoData, officesData] = await Promise.all([
                    fetchSafe<CompanyInfo>('/company-info', FALLBACK_COMPANY_INFO),
                    fetchSafe<Office[]>('/offices', [])
                ]);
                setCompanyInfo(infoData);
                setOffices(officesData);

                // 2. Carga condicional por permisos (Evita 403)
                const promises: Promise<any>[] = [];

                if (isAdmin || perms['categories.view']) promises.push(fetchSafe('/categories', []).then(setCategories));
                if (isAdmin || perms['shipping-types.view']) promises.push(fetchSafe('/shipping-types', []).then(setShippingTypes));
                if (isAdmin || perms['payment-methods.view']) promises.push(fetchSafe('/payment-methods', []).then(setPaymentMethods));
                if (isAdmin || perms['config.users.manage']) promises.push(fetchSafe('/users', []).then(setUsers));

                // Gestión de roles (Usa /roles/me si no es admin)
                if (isAdmin || perms['config.roles.manage'] || perms['config.roles.view']) {
                    promises.push(fetchSafe<Role[]>('/roles', []).then(setRoles));
                } else {
                    promises.push(fetchSafe<Role>('/roles/me', { id: currentUser.roleId, name: 'Mi Rol', permissions: perms } as Role).then(r => setRoles([r])));
                }

                if (isAdmin || perms['plan-contable.view']) {
                    promises.push(fetchSafe('/cuentas-contables', PLAN_DE_CUENTAS_INICIAL).then(setCuentasContables));
                    promises.push(fetchSafe('/expense-categories', []).then(setExpenseCategories));
                }

                await Promise.all(promises);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfigData();
    }, [isAuthenticated, currentUser?.id, fetchSafe]); // Solo re-ejecutar si cambia el ID del usuario o el estado de auth

    useEffect(() => {
        if (currentUser) {
            const role = roles.find(r => r.id === currentUser.roleId);
            setUserPermissions(role?.permissions || currentUser.permissions || {});
        }
    }, [currentUser, roles]);

    const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
        const data = await apiFetch<{ accessToken: string, refreshToken: string, user: User }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            hasLoadedRef.current = false; // Reset ref para nueva carga
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setIsAuthenticated(false);
        setCurrentUser(null);
        hasLoadedRef.current = false;
        window.location.hash = '';
    };

    const handleCompanyInfoSave = async (info: CompanyInfo) => {
        const saved = await apiFetch<CompanyInfo>('/company-info', { method: 'PUT', body: JSON.stringify(info) });
        setCompanyInfo(saved);
        addToast({ type: 'success', title: 'Éxito', message: 'Configuración actualizada.' });
    };

    const onUpdateRolePermissions = async (roleId: string, permissions: Permissions) => {
        const updatedRole = await apiFetch<Role>(`/roles/${roleId}/permissions`, { 
            method: 'PUT', 
            body: JSON.stringify({ permissions }) 
        });
        setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
        if (currentUser?.roleId === roleId) {
            await refreshUser();
        }
        addToast({ type: 'success', title: 'Permisos', message: 'Rol actualizado.' });
    };

    // Funciones auxiliares simplificadas
    const handleAuxSave = async <T extends {id?: string}>(item: T, path: string, setter: any) => {
        const isUpdating = !!item.id;
        const saved = await apiFetch<T>(isUpdating ? `${path}/${item.id}` : path, { 
            method: isUpdating ? 'PUT' : 'POST', 
            body: JSON.stringify(item) 
        });
        setter((prev: T[]) => isUpdating ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved]);
    };

    return (
        <ConfigContext.Provider value={{
            companyInfo, categories, users, roles, offices, shippingTypes, paymentMethods, expenseCategories, cuentasContables,
            userPermissions, isLoading,
            handleLogin, handleLogout, handleCompanyInfoSave, onUpdateRolePermissions,
            handleSaveUser: (u) => handleAuxSave(u, '/users', setUsers),
            onDeleteUser: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }).then(() => setUsers(p => p.filter(u => u.id !== id))),
            handleSaveRole: (r) => handleAuxSave(r, '/roles', setRoles),
            onDeleteRole: (id) => apiFetch(`/roles/${id}`, { method: 'DELETE' }).then(() => setRoles(p => p.filter(r => r.id !== id))),
            handleSaveCategory: (c) => handleAuxSave(c, '/categories', setCategories),
            onDeleteCategory: (id) => apiFetch(`/categories/${id}`, { method: 'DELETE' }).then(() => setCategories(p => p.filter(i => i.id !== id))),
            handleSaveOffice: (o) => handleAuxSave(o, '/offices', setOffices),
            onDeleteOffice: (id) => apiFetch(`/offices/${id}`, { method: 'DELETE' }).then(() => setOffices(p => p.filter(i => i.id !== id))),
            handleSaveShippingType: (s) => handleAuxSave(s, '/shipping-types', setShippingTypes),
            onDeleteShippingType: (id) => apiFetch(`/shipping-types/${id}`, { method: 'DELETE' }).then(() => setShippingTypes(p => p.filter(i => i.id !== id))),
            handleSavePaymentMethod: (p) => handleAuxSave(p, '/payment-methods', setPaymentMethods),
            onDeletePaymentMethod: (id) => apiFetch(`/payment-methods/${id}`, { method: 'DELETE' }).then(() => setPaymentMethods(p => p.filter(i => i.id !== id))),
            handleSaveExpenseCategory: (e) => handleAuxSave(e, '/expense-categories', setExpenseCategories),
            onDeleteExpenseCategory: (id) => apiFetch(`/expense-categories/${id}`, { method: 'DELETE' }).then(() => setExpenseCategories(p => p.filter(i => i.id !== id))),
            handleSaveCuentaContable: (c) => handleAuxSave(c, '/cuentas-contables', setCuentasContables),
            handleDeleteCuentaContable: (id) => apiFetch(`/cuentas-contables/${id}`, { method: 'DELETE' }).then(() => setCuentasContables(p => p.filter(i => i.id !== id)))
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within a ConfigProvider');
    return context;
};
