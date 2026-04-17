'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'success' | 'error';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  addToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'success',
    };

    setToasts((previous) => [...previous, toast]);

    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed right-4 bottom-4 z-100 flex w-full max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6'>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] backdrop-blur ${
              toast.variant === 'success'
                ? 'border-emerald-200 bg-white text-slate-900'
                : 'border-rose-200 bg-white text-slate-900'
            }`}
            role='status'
            aria-live='polite'
          >
            <p
              className={`text-sm font-semibold ${toast.variant === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}
            >
              {toast.title}
            </p>
            {toast.description ? <p className='mt-1 text-sm text-slate-600'>{toast.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
