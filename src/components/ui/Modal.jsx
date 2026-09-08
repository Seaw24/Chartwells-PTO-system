import React from "react";
import { usePresence } from "../../hooks/motion.jsx";
import ReactDOM from "react-dom";
import { X as Vendor_X } from "lucide-react";
export function Modal({
  open: open,
  onClose: onClose,
  title: title,
  children: children,
  size = "md",
  footer: footer,
}) {
  const o = React.useRef(null),
    c = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(open);
  if (
    (React.useEffect(() => {
      if (!open) return;
      c.current = document.activeElement;
      const d = (p) => {
        (p.key === "Escape" && (onClose == null || onClose()),
          p.key === "Tab" && trapModalFocus(p, o.current));
      };
      (document.addEventListener("keydown", d),
        (document.body.style.overflow = "hidden"));
      const f = setTimeout(() => {
        var y, g;
        (g =
          ((y = o.current) == null
            ? void 0
            : y.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
              )) || o.current) == null || g.focus();
      }, 30);
      return () => {
        var p, y;
        (document.removeEventListener("keydown", d),
          (document.body.style.overflow = ""),
          clearTimeout(f),
          (y = (p = c.current) == null ? void 0 : p.focus) == null ||
            y.call(p));
      };
    }, [open, onClose]),
    !mounted)
  )
    return null;
  const h = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };
  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[58] flex items-end justify-center p-0 sm:items-center sm:p-4 ${closing ? "pointer-events-none" : ""}`}
    >
      <div
        className={`absolute inset-0 bg-navy/30 backdrop-blur-[2px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={o}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${h[size]} max-h-[92vh] overflow-hidden rounded-t-modal bg-card shadow-pop sm:rounded-modal ${closing ? "animate-slide-out-down sm:animate-scale-out" : "animate-slide-in-up sm:animate-scale-in"}`}
      >
        {title && (
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="press grid h-8 w-8 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-ink"
              aria-label="Close dialog"
            >
              <Vendor_X size={18} />
            </button>
          </header>
        )}
        <div className="scrollbar-slim max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface/60 px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
export function trapModalFocus(e, t) {
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
