import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ApiError {
    id: string;
    statusCode: number;
    route: string;
    timestamp: number;
    message?: string;
}

interface ApiErrorContextType {
    errors: ApiError[];
    addError: (statusCode: number, route: string, message?: string) => void;
    dismissError: (id: string) => void;
    clearAllErrors: () => void;
}

const ApiErrorContext = createContext<ApiErrorContextType | null>(null);

const AUTO_DISMISS_MS = 5000;

export function ApiErrorProvider({ children }: { children: ReactNode }) {
    const [errors, setErrors] = useState<ApiError[]>([]);

    const addError = useCallback((statusCode: number, route: string, message?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const newError: ApiError = {
            id,
            statusCode,
            route,
            timestamp: Date.now(),
            message,
        };

        setErrors((prev) => [...prev, newError]);

        // Auto-dismiss after timeout
        setTimeout(() => {
            setErrors((prev) => prev.filter((e) => e.id !== id));
        }, AUTO_DISMISS_MS);
    }, []);

    const dismissError = useCallback((id: string) => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const clearAllErrors = useCallback(() => {
        setErrors([]);
    }, []);

    return (
        <ApiErrorContext.Provider value={{ errors, addError, dismissError, clearAllErrors }}>
            {children}
        </ApiErrorContext.Provider>
    );
}

export function useApiError() {
    const context = useContext(ApiErrorContext);
    if (!context) {
        throw new Error('useApiError must be used within an ApiErrorProvider');
    }
    return context;
}
