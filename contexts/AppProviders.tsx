
import React, { ReactNode } from 'react';
import ToastProvider from '../components/ui/ToastProvider';
import { AuthProvider } from './AuthContext';
import { DataProvider } from './DataContext';
import { ConfigProvider } from './ConfigContext';
import { SystemProvider } from './SystemContext';
import { ConfirmationProvider } from './ConfirmationContext';
import { PdfDownloadProvider } from './PdfDownloadContext';

const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <ToastProvider>
            <ConfirmationProvider>
                <AuthProvider>
                    <SystemProvider>
                        <ConfigProvider>
                            <DataProvider>
                                <PdfDownloadProvider>
                                    {children}
                                </PdfDownloadProvider>
                            </DataProvider>
                        </ConfigProvider>
                    </SystemProvider>
                </AuthProvider>
            </ConfirmationProvider>
        </ToastProvider>
    );
};

export default AppProviders;
