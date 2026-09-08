import { useCatalog } from "../../context/CatalogContext.jsx";
import React from "react";
import { usePresence } from "../../hooks/motion.jsx";
import { Avatar } from "./Avatar.jsx";
import { firstName } from "../../utils/constants.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { ChevronDown as Vendor_ChevronDown } from "lucide-react";
import { Search as Vendor_Search } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
export function PersonPicker({
  people: people,
  value: value,
  onChange: onChange,
  allLabel = "All people",
  className = "",
}) {
  const { teamById: teamById } = useCatalog(),
    [o, c] = React.useState(!1),
    [l, u] = React.useState(""),
    h = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(o, 120);
  React.useEffect(() => {
    if (!o) return;
    const k = (m) => {
        h.current && !h.current.contains(m.target) && c(!1);
      },
      v = (m) => m.key === "Escape" && c(!1);
    return (
      document.addEventListener("mousedown", k),
      document.addEventListener("keydown", v),
      () => {
        (document.removeEventListener("mousedown", k),
          document.removeEventListener("keydown", v));
      }
    );
  }, [o]);
  const p =
      value && value !== "all" ? people.find((k) => k.id === value) : null,
    y = people.filter((k) => k.name.toLowerCase().includes(l.toLowerCase())),
    g = (k) => {
      (onChange(k), c(!1), u(""));
    };
  return (
    <div ref={h} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => c((k) => !k)}
        aria-haspopup="listbox"
        aria-expanded={o}
        className={`flex h-8 items-center gap-2 rounded-btn border bg-card px-2.5 text-xs font-semibold transition-colors hover:bg-panel ${p ? "border-accent/50 text-ink" : "border-line text-ink-soft"}`}
      >
        {p ? (
          <>
            <Avatar name={p.name} id={p.id} size="xs" />
            <span className="max-w-[8rem] truncate">{firstName(p.name)}</span>
          </>
        ) : (
          <>
            <Vendor_Users size={14} className="text-ink-mute" />
            {allLabel}
          </>
        )}
        <Vendor_ChevronDown size={14} className="text-ink-mute" />
      </button>
      {mounted && (
        <div
          className={`absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-card border border-line bg-card p-2 shadow-pop ${closing ? "pointer-events-none animate-scale-out" : "animate-scale-in"}`}
        >
          <div className="relative mb-1.5">
            <Vendor_Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              autoFocus={!0}
              value={l}
              onChange={(k) => u(k.target.value)}
              onKeyDown={(k) => {
                k.key === "Enter" && y[0] && g(y[0].id);
              }}
              placeholder="Search people…"
              className="w-full rounded-btn border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto scrollbar-slim"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === "all"}
                onClick={() => g("all")}
                className="flex w-full items-center gap-2.5 rounded-btn px-2 py-1.5 text-left text-sm hover:bg-panel"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-panel text-ink-mute">
                  <Vendor_Users size={13} />
                </span>
                <span className="flex-1 font-medium text-ink">{allLabel}</span>
                {value === "all" && (
                  <Vendor_Check size={14} className="text-accent-ink" />
                )}
              </button>
            </li>
            {y.map((k) => {
              var v;
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={k.id === value}
                    onClick={() => g(k.id)}
                    className="flex w-full items-center gap-2.5 rounded-btn px-2 py-1.5 text-left hover:bg-panel"
                  >
                    <Avatar name={k.name} id={k.id} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {k.name}
                      </span>
                      <span className="block text-[11px] text-ink-mute">
                        {((v = teamById(k.team)) == null ? void 0 : v.name) ||
                          "All teams"}
                      </span>
                    </span>
                    {k.id === value && (
                      <Vendor_Check
                        size={14}
                        className="shrink-0 text-accent-ink"
                      />
                    )}
                  </button>
                </li>
              );
            })}
            {y.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-ink-mute">
                {"No people match “"}
                {l}
                {"”."}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
