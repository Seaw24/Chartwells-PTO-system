import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const KIND = {
  success: { icon: CheckCircle2, fg: 'var(--c-success)' },
  error: { icon: AlertTriangle, fg: 'var(--c-danger)' },
  info: { icon: Info, fg: 'var(--c-navy-600)' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, { kind = 'success', duration = 3600 } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((t) => [...t, { id, message, kind }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0">
          {toasts.map((t) => {
            const c = KIND[t.kind] || KIND.info;
            const Icon = c.icon;
            return (
              <div
                key={t.id}
                role="status"
                className="pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-lift animate-slide-in-right"
              >
                <Icon size={18} style={{ color: c.fg }} className="mt-0.5 shrink-0" />
                <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-ink-mute hover:text-ink"
                  aria-label="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx.toast;
}
