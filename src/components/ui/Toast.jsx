import React from "react";
import { CircleCheck as Vendor_CircleCheck } from "lucide-react";
import { TriangleAlert as Vendor_TriangleAlert } from "lucide-react";
import { Info as Vendor_Info } from "lucide-react";
import ReactDOM from "react-dom";
import { X as Vendor_X } from "lucide-react";
export const ToastContext = React.createContext(null);
export const TOAST_KINDS = {
  success: {
    icon: Vendor_CircleCheck,
    fg: "var(--c-success)",
  },
  error: {
    icon: Vendor_TriangleAlert,
    fg: "var(--c-danger)",
  },
  info: {
    icon: Vendor_Info,
    fg: "var(--c-navy-600)",
  },
};
export const TOAST_EXIT_MS = 180;
export function ToastProvider({ children: children }) {
  const [t, n] = React.useState([]),
    r = React.useCallback((i) => {
      (n((o) =>
        o.map((c) =>
          c.id === i
            ? {
                ...c,
                leaving: !0,
              }
            : c,
        ),
      ),
        setTimeout(() => n((o) => o.filter((c) => c.id !== i)), TOAST_EXIT_MS));
    }, []),
    s = React.useCallback(
      (i, { kind = "success", duration = 3600 } = {}) => {
        const l = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        return (
          n((u) => [
            ...u,
            {
              id: l,
              message: i,
              kind: kind,
            },
          ]),
          duration && setTimeout(() => r(l), duration),
          l
        );
      },
      [r],
    );
  return (
    <ToastContext.Provider
      value={{
        toast: s,
      }}
    >
      {children}
      {ReactDOM.createPortal(
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col px-4 sm:left-auto sm:right-4 sm:translate-x-0">
          {t.map((i) => {
            const o = TOAST_KINDS[i.kind] || TOAST_KINDS.info,
              LocalComponent_c = o.icon;
            return (
              <div
                className="grid transition-[grid-template-rows,opacity] duration-[180ms] ease-exit"
                style={{
                  gridTemplateRows: i.leaving ? "0fr" : "1fr",
                  opacity: i.leaving ? 0 : 1,
                }}
                key={i.id}
              >
                <div className="overflow-hidden">
                  <div
                    role="status"
                    className={`pointer-events-auto mb-2 flex items-start gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-lift ${i.leaving ? "" : "animate-slide-in-up sm:animate-slide-in-right"}`}
                  >
                    <LocalComponent_c
                      size={18}
                      style={{
                        color: o.fg,
                      }}
                      className="mt-0.5 shrink-0"
                    />
                    <p className="flex-1 text-sm font-medium text-ink">
                      {i.message}
                    </p>
                    <button
                      onClick={() => r(i.id)}
                      className="press text-ink-mute hover:text-ink"
                      aria-label="Dismiss"
                    >
                      <Vendor_X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
export function useToast() {
  const e = React.useContext(ToastContext);
  if (!e) throw new Error("useToast must be used within <ToastProvider>");
  return e.toast;
}
