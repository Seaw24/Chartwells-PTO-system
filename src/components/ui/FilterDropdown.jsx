import React from "react";
import { usePresence } from "../../hooks/motion.jsx";
import { ChevronDown as Vendor_ChevronDown } from "lucide-react";
import { Search as Vendor_Search } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
export function FilterDropdown({
  options: options,
  value: value,
  onChange: onChange,
  leadingIcon: LocalComponent_leadingIcon,
  size = "md",
  align = "right",
  ariaLabel: ariaLabel,
  searchable = "auto",
  searchPlaceholder = "Search…",
  className = "",
}) {
  const [h, d] = React.useState(!1),
    [f, p] = React.useState(""),
    y = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(h, 120),
    v = options.find((_) => _.value === value) ?? options[0],
    m = searchable === !0 || (searchable === "auto" && options.length > 7);
  (React.useEffect(() => {
    if (!h) return;
    const _ = (S) => {
        y.current && !y.current.contains(S.target) && d(!1);
      },
      j = (S) => {
        S.key === "Escape" && d(!1);
      };
    return (
      document.addEventListener("mousedown", _),
      document.addEventListener("keydown", j),
      () => {
        (document.removeEventListener("mousedown", _),
          document.removeEventListener("keydown", j));
      }
    );
  }, [h]),
    React.useEffect(() => {
      h || p("");
    }, [h]));
  const x = size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
    b = React.useMemo(() => {
      const _ = f.trim().toLowerCase();
      return !m || !_
        ? options
        : options.filter((j) => j.label.toLowerCase().includes(_));
    }, [options, f, m]),
    N = (_) => {
      (onChange(_), d(!1));
    };
  return (
    <div ref={y} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => d((_) => !_)}
        aria-haspopup="listbox"
        aria-expanded={h}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-2 rounded-btn border border-line bg-card px-3 font-semibold text-ink-soft transition-colors hover:bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${x} ${h ? "bg-panel" : ""}`}
      >
        {LocalComponent_leadingIcon && (
          <LocalComponent_leadingIcon
            size={15}
            className="shrink-0 text-ink-mute"
          />
        )}
        <span className="max-w-[10rem] truncate text-ink">
          {v == null ? void 0 : v.label}
        </span>
        <Vendor_ChevronDown
          size={14}
          className={`shrink-0 text-ink-mute transition-transform duration-150 ${h ? "rotate-180" : ""}`}
        />
      </button>
      {mounted && (
        <div
          className={`absolute z-50 mt-1.5 min-w-[13rem] origin-top rounded-card border border-line bg-card p-1 shadow-pop ${closing ? "pointer-events-none animate-scale-out" : "animate-scale-in"} ${align === "right" ? "right-0" : "left-0"}`}
        >
          {m && (
            <div className="relative p-1 pb-1.5">
              <Vendor_Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
              />
              <input
                autoFocus={!0}
                value={f}
                onChange={(_) => p(_.target.value)}
                onKeyDown={(_) => {
                  _.key === "Enter" && b[0] && N(b[0].value);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-btn border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
              />
            </div>
          )}
          <div
            role="listbox"
            aria-label={ariaLabel}
            className="scrollbar-slim max-h-[min(60vh,18rem)] overflow-y-auto"
          >
            {b.map((_) => {
              const j = _.value === value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={j}
                  onClick={() => N(_.value)}
                  className={`press flex w-full items-center gap-2.5 rounded-btn px-2.5 py-2 text-left text-sm ${j ? "bg-accent-soft/70 text-accent-ink" : "text-ink hover:bg-panel"}`}
                  key={_.value}
                >
                  <span
                    className={`min-w-0 flex-1 truncate ${j ? "font-semibold" : "font-medium"}`}
                  >
                    {_.label}
                  </span>
                  {_.hint != null && (
                    <span
                      className={`shrink-0 tabular text-[11px] ${j ? "text-accent-ink/70" : "text-ink-mute"}`}
                    >
                      {_.hint}
                    </span>
                  )}
                  <Vendor_Check
                    size={15}
                    strokeWidth={2.5}
                    className={`shrink-0 text-accent-ink transition-opacity ${j ? "opacity-100" : "opacity-0"}`}
                  />
                </button>
              );
            })}
            {b.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-ink-mute">
                {"No matches for “"}
                {f.trim()}
                {"”."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
