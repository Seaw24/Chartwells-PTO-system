import React from "react";
import { usePresence } from "../../hooks/motion.jsx";
import ReactDOM from "react-dom";
import { X as Vendor_X } from "lucide-react";
export function Drawer({
  open: open,
  onClose: onClose,
  title: title,
  subtitle: subtitle,
  icon: icon,
  children: children,
  footer: footer,
  width = "sm:max-w-md",
}) {
  const l = React.useRef(null),
    u = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(open);
  return (
    React.useEffect(() => {
      if (!open) return;
      u.current = document.activeElement;
      const f = (y) => {
        (y.key === "Escape" && (onClose == null || onClose()),
          y.key === "Tab" && trapDrawerFocus(y, l.current));
      };
      (document.addEventListener("keydown", f),
        (document.body.style.overflow = "hidden"));
      const p = setTimeout(() => {
        var g, k;
        (k =
          ((g = l.current) == null
            ? void 0
            : g.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              )) || l.current) == null || k.focus();
      }, 30);
      return () => {
        var y, g;
        (document.removeEventListener("keydown", f),
          (document.body.style.overflow = ""),
          clearTimeout(p),
          (g = (y = u.current) == null ? void 0 : y.focus) == null ||
            g.call(y));
      };
    }, [open, onClose]),
    mounted
      ? ReactDOM.createPortal(
          <div
            className={`fixed inset-0 z-[58] ${closing ? "pointer-events-none" : ""}`}
          >
            <div
              className={`absolute inset-0 bg-navy/30 backdrop-blur-[2px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
              onClick={onClose}
              aria-hidden="true"
            />
            <div
              ref={l}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              className={`absolute inset-0 flex flex-col bg-card shadow-pop outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full ${closing ? "animate-slide-out-down sm:animate-slide-out-right" : "animate-slide-in-up sm:animate-slide-in-right"} ${width}`}
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {icon}
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold tracking-tight text-ink">
                      {title}
                    </h2>
                    {subtitle && (
                      <p className="truncate text-xs text-ink-mute">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="press grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-ink"
                  aria-label="Close"
                >
                  <Vendor_X size={18} />
                </button>
              </header>
              <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5">
                {children}
              </div>
              {footer && (
                <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface/60 px-5 py-3.5">
                  {footer}
                </footer>
              )}
            </div>
          </div>,
          document.body,
        )
      : null
  );
}
export function trapDrawerFocus(e, t) {
  if (!t) return;
  const n = t.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!n.length) return;
  const r = n[0],
    s = n[n.length - 1];
  e.shiftKey && document.activeElement === r
    ? (e.preventDefault(), s.focus())
    : !e.shiftKey &&
      document.activeElement === s &&
      (e.preventDefault(), r.focus());
}
