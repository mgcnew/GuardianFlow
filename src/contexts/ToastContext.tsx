import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

const ICONS: Record<ToastType, string> = {
    success: 'check_circle',
    error:   'error',
    warning: 'warning',
    info:    'info',
};

const COLORS: Record<ToastType, string> = {
    success: 'bg-emerald-500',
    error:   'bg-rose-500',
    warning: 'bg-amber-500',
    info:    'bg-primary',
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: number) => {
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++nextId;
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
        timers.current.set(id, setTimeout(() => dismiss(id), 4500));
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto relative flex items-center gap-3 min-w-[280px] max-w-sm px-4 py-3 rounded-2xl shadow-xl text-white animate-in slide-in-from-bottom-4 fade-in duration-300 ${COLORS[t.type]}`}
                    >
                        <span className="material-symbols-outlined text-[20px] shrink-0">{ICONS[t.type]}</span>
                        <p className="text-sm font-semibold leading-snug flex-1">{t.message}</p>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="ml-1 opacity-70 hover:opacity-100 transition-opacity shrink-0"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
