
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { CompanyInfo, User, Role, Office, Category, ShippingType, PaymentMethod, Permissions, ExpenseCategory, CuentaContable } from '../types';
import { useToast } from '../components/ui/ToastProvider';
import { useSystem } from './SystemContext';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';
import { PLAN_DE_CUENTAS_INICIAL } from '../data/contabilidad';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants';

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
    loginImageUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb122c2a6?q=80&w=2070&auto=format&fit=crop'
};

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { addToast } = useToast();
    const { logAction } = useSystem();
    const { isAuthenticated, currentUser, setIsAuthenticated, setCurrentUser } = useAuth();

    // Initial state with a loading placeholder
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

    // Helper function to safely fetch data that might be restricted (403) or missing (404)
    const fetchSafe = useCallback(async <T,>(endpoint: string, fallbackValue: T): Promise<T> => {
        try {
            return await apiFetch<T>(endpoint);
        } catch (error: any) {
            if (error.message && (
                error.message.includes('403') ||
                error.message.includes('401') ||
                error.message.includes('404') ||
                error.message.includes('No tiene los permisos') ||
                error.message.includes('Failed to fetch')
            )) {
                return fallbackValue;
            }
            console.warn(`Error fetching ${endpoint}:`, error.message);
            return fallbackValue;
        }
    }, []);

    useEffect(() => {
        const fetchConfigData = async () => {
            if (isAuthenticated && currentUser) {
                try {
                    setIsLoading(true);
                    
                    const isAdmin = currentUser.roleId === 'role-admin';
                    const isTech = currentUser.roleId === 'role-tech';
                    const hasFullAccess = isAdmin || isTech;

                    const [
                        infoData, 
                        categoriesData,
                        officesData,
                        shippingTypesData,
                        paymentMethodsData,
                    ] = await Promise.all([
                        fetchSafe<CompanyInfo>('/company-info', FALLBACK_COMPANY_INFO),
                        fetchSafe<Category[]>('/categories', []),
                        fetchSafe<Office[]>('/offices', []),
                        fetchSafe<ShippingType[]>('/shipping-types', []),
                        fetchSafe<PaymentMethod[]>('/payment-methods', []),
                    ]);

                    setCompanyInfo(infoData);
                    setCategories(categoriesData);
                    setOffices(officesData);
                    setShippingTypes(shippingTypesData);
                    setPaymentMethods(paymentMethodsData);

                    // Fetch Protected Data based on roles
                    if (hasFullAccess) {
                        const [usersData, rolesData] = await Promise.all([
                            fetchSafe<User[]>('/users', []),
                            fetchSafe<Role[]>('/roles', []),
                        ]);
                        setUsers(usersData);
                        setRoles(rolesData);
                    } else {
                        // For non-admins, ensure current user's role is loaded to check permissions
                        const myRole = await fetchSafe<Role>(`/roles/${currentUser.roleId}`, { id: currentUser.roleId, name: 'User', permissions: {} });
                        setRoles([myRole]);
                    }

                    // Fetch Accounting Data (Available to Admins, Techs, Accountants)
                    const isAccountant = currentUser.roleId === 'role-accountant';
                    if (hasFullAccess || isAccountant) {
                         const [expCatsData, cuentasData] = await Promise.all([
                            fetchSafe<ExpenseCategory[]>('/expense-categories', []),
                            fetchSafe<CuentaContable[]>('/cuentas-contables', PLAN_DE_CUENTAS_INICIAL),
                        ]);
                        setExpenseCategories(expCatsData);
                        setCuentasContables(cuentasData);
                    } else {
                        // Regular users need expense categories for petty cash
                        const expCatsData = await fetchSafe<ExpenseCategory[]>('/expense-categories', []);
                        setExpenseCategories(expCatsData);
                    }

                } catch (error: any) {
                    addToast({ type: 'error', title: 'Error de Configuración', message: `No se pudo cargar la configuración: ${error.message}` });
                } finally {
                    setIsLoading(false);
                }
            } else if (!isAuthenticated) {
                // Fetch public config (Company Info for login screen)
                try {
                    const infoData = await fetchSafe<CompanyInfo>('/company-info', FALLBACK_COMPANY_INFO);
                    setCompanyInfo(infoData);
                } catch(e) {
                    setCompanyInfo(FALLBACK_COMPANY_INFO);
                }
                setIsLoading(false);
            }
        };

        fetchConfigData();
    }, [isAuthenticated, currentUser, fetchSafe, addToast]);

    // Calculate permissions whenever roles or current user changes
    useEffect(() => {
        if (currentUser && roles.length > 0) {
            const userRole = roles.find(r => r.id === currentUser.roleId);
            if (userRole) {
                // If role exists in DB, use its permissions
                setUserPermissions(userRole.permissions);
            } else if (DEFAULT_ROLE_PERMISSIONS[currentUser.roleId]) {
                // Fallback to hardcoded permissions if role not found in DB (e.g. initial setup)
                setUserPermissions(DEFAULT_ROLE_PERMISSIONS[currentUser.roleId]);
            } else {
                setUserPermissions({});
            }
        } else {
            setUserPermissions({});
        }
    }, [currentUser, roles]);


    const handleLogin = async (username: string, password: string, rememberMe: boolean) => {
        try {
            const data = await apiFetch<{ accessToken: string, refreshToken: string, user: User }>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            if (data.accessToken && data.user) {
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                if (rememberMe) {
                    localStorage.setItem('rememberedUser', username);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                
                setCurrentUser(data.user);
                setIsAuthenticated(true);
                addToast({ type: 'success', title: 'Bienvenido', message: `Has iniciado sesión como ${data.user.name}` });
            } else {
                throw new Error('Respuesta inválida del servidor');
            }
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error de Autenticación', message: error.message || 'Credenciales inválidas' });
            throw error; // Re-throw to let the LoginView handle UI state
        }
    };

    const handleLogout = async () => {
        try {
            // Optional: Call logout endpoint if backend invalidates tokens
            await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setIsAuthenticated(false);
            setCurrentUser(null);
            setUserPermissions({});
            window.location.hash = '';
        }
    };

    // --- Generic CRUD Handlers ---

    const handleGenericSave = async <T extends { id?: string }>(item: T, endpoint: string, setter: React.Dispatch<React.SetStateAction<T[]>>, itemType: string) => {
        const isUpdating = !!item.id;
        const url = isUpdating ? `${endpoint}/${item.id}` : endpoint;
        const method = isUpdating ? 'PUT' : 'POST';
        
        // Remove ID from body for creation if it's empty
        const bodyToSend = { ...item };
        if (!isUpdating) delete (bodyToSend as any).id;

        try {
            const savedItem = await apiFetch<T>(url, { method, body: JSON.stringify(bodyToSend) });
            setter(prev => isUpdating ? prev.map(i => i.id === savedItem.id ? savedItem : i) : [...prev, savedItem]);
            
            if (currentUser) logAction(currentUser, isUpdating ? `ACTUALIZAR_${itemType.toUpperCase()}` : `CREAR_${itemType.toUpperCase()}`, `${itemType} guardado: ${(item as any).name || 'Item'}`, savedItem.id);
            addToast({ type: 'success', title: 'Guardado', message: `${itemType} guardado exitosamente.` });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const handleGenericDelete = async (id: string, endpoint: string, setter: React.Dispatch<React.SetStateAction<any[]>>, itemType: string) => {
        try {
            await apiFetch(`${endpoint}/${id}`, { method: 'DELETE' });
            setter(prev => prev.filter(i => i.id !== id));
            if (currentUser) logAction(currentUser, `ELIMINAR_${itemType.toUpperCase()}`, `${itemType} eliminado (ID: ${id})`, id);
            addToast({ type: 'success', title: 'Eliminado', message: `${itemType} eliminado exitosamente.` });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        }
    };

    // Specific Handlers utilizing Generic Handlers
    const handleCompanyInfoSave = async (info: CompanyInfo) => {
        try {
            const savedInfo = await apiFetch<CompanyInfo>('/company-info', { method: 'PUT', body: JSON.stringify(info) });
            setCompanyInfo(savedInfo);
            if (currentUser) logAction(currentUser, 'CONFIG_EMPRESA', 'Actualizó información de la empresa');
            addToast({ type: 'success', title: 'Empresa', message: 'Información actualizada.' });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const handleSaveUser = (user: User) => handleGenericSave(user, '/users', setUsers, 'Usuario');
    const onDeleteUser = (id: string) => handleGenericDelete(id, '/users', setUsers, 'Usuario');
    
    const handleSaveRole = (role: Role) => handleGenericSave(role, '/roles', setRoles, 'Rol');
    const onDeleteRole = (id: string) => handleGenericDelete(id, '/roles', setRoles, 'Rol');
    
    const onUpdateRolePermissions = async (roleId: string, permissions: Permissions) => {
        try {
            const updatedRole = await apiFetch<Role>(`/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) });
            setRoles(prev => prev.map(r => r.id === roleId ? updatedRole : r));
            
            // If updating current user's role, update local permissions immediately
            if (currentUser && currentUser.roleId === roleId) {
                setUserPermissions(updatedRole.permissions);
            }
            if (currentUser) logAction(currentUser, 'ACTUALIZAR_PERMISOS', `Actualizó permisos del rol ${updatedRole.name}`, roleId);
            addToast({ type: 'success', title: 'Permisos', message: 'Permisos actualizados correctamente.' });
        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        }
    };

    const handleSaveCategory = (category: Category) => handleGenericSave(category, '/categories', setCategories, 'Categoría');
    const onDeleteCategory = (id: string) => handleGenericDelete(id, '/categories', setCategories, 'Categoría');
    
    const handleSaveOffice = (office: Office) => handleGenericSave(office, '/offices', setOffices, 'Oficina');
    const onDeleteOffice = (id: string) => handleGenericDelete(id, '/offices', setOffices, 'Oficina');
    
    const handleSaveShippingType = (st: ShippingType) => handleGenericSave(st, '/shipping-types', setShippingTypes, 'Tipo Envío');
    const onDeleteShippingType = (id: string) => handleGenericDelete(id, '/shipping-types', setShippingTypes, 'Tipo Envío');
    
    const handleSavePaymentMethod = (pm: PaymentMethod) => handleGenericSave(pm, '/payment-methods', setPaymentMethods, 'Forma Pago');
    const onDeletePaymentMethod = (id: string) => handleGenericDelete(id, '/payment-methods', setPaymentMethods, 'Forma Pago');
    
    const handleSaveExpenseCategory = (ec: ExpenseCategory) => handleGenericSave(ec, '/expense-categories', setExpenseCategories, 'Cat. Gasto');
    const onDeleteExpenseCategory = (id: string) => handleGenericDelete(id, '/expense-categories', setExpenseCategories, 'Cat. Gasto');

    const handleSaveCuentaContable = (cuenta: CuentaContable) => handleGenericSave(cuenta, '/cuentas-contables', setCuentasContables, 'Cuenta Contable');
    const handleDeleteCuentaContable = (id: string) => handleGenericDelete(id, '/cuentas-contables', setCuentasContables, 'Cuenta Contable');

    return (
        <ConfigContext.Provider value={{
            companyInfo, categories, users, roles, offices, shippingTypes, paymentMethods, expenseCategories, cuentasContables,
            userPermissions, isLoading,
            handleLogin, handleLogout, handleCompanyInfoSave,
            handleSaveUser, onDeleteUser,
            handleSaveRole, onDeleteRole, onUpdateRolePermissions,
            handleSaveCategory, onDeleteCategory,
            handleSaveOffice, onDeleteOffice,
            handleSaveShippingType, onDeleteShippingType,
            handleSavePaymentMethod, onDeletePaymentMethod,
            handleSaveExpenseCategory, onDeleteExpenseCategory,
            handleSaveCuentaContable, handleDeleteCuentaContable
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
