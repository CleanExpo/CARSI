'use client';

import * as React from 'react';

import {
  Toast as ToastRoot,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

type ToastVariant = 'default' | 'destructive';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
  variant: ToastVariant;
}

type ToastContextValue = {
  toasts: ToastItem[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = 'default' }: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);

      window.setTimeout(() => {
        dismiss(id);
      }, 4500);

      return id;
    },
    [dismiss]
  );

  const ctx: ToastContextValue = React.useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss]
  );

  return React.createElement(
    ToastContext.Provider,
    { value: ctx },
    children,
    React.createElement(
      RadixToastProvider,
      null,
      React.createElement(ToastViewport, null),
      ...toasts.map((t) =>
        React.createElement(
          ToastRoot,
          {
            key: t.id,
            variant: t.variant,
            open: true,
            onOpenChange: (open: boolean) => {
              if (!open) dismiss(t.id);
            },
          },
          React.createElement(
            'div',
            { className: 'flex flex-col gap-1' },
            React.createElement(ToastTitle, null, t.title),
            t.description ? React.createElement(ToastDescription, null, t.description) : null
          ),
          React.createElement(ToastClose, null)
        )
      )
    )
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <AppToastProvider>.');
  }
  return ctx;
}

