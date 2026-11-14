import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Floating Viewport */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none pb-safe">
        {toasts.map((toast) => {
          const bg =
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-600 text-emerald-100 shadow-emerald-950/60'
              : toast.type === 'error'
              ? 'bg-red-950/95 border-red-600 text-red-100 shadow-red-950/60'
              : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-black/60';

          const icon =
            toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            );

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-bottom-3 fade-in duration-200 ${bg}`}
            >
              <div className="flex items-center gap-2.5">
                {icon}
                <span className="leading-snug">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

