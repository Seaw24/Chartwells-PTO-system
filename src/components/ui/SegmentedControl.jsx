import React from "react";
export function SegmentedControl({
  options: options,
  value: value,
  onChange: onChange,
  size = "md",
  className = "",
}) {
  const i = size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
    o = React.useRef(null),
    c = React.useRef({}),
    [l, u] = React.useState(null),
    [h, d] = React.useState(!1);
  return (
    React.useLayoutEffect(() => {
      const f = o.current,
        p = () => {
          const k = c.current[value],
            v = k
              ? {
                  left: k.offsetLeft,
                  width: k.offsetWidth,
                }
              : null;
          u((m) =>
            (m == null ? void 0 : m.left) === (v == null ? void 0 : v.left) &&
            (m == null ? void 0 : m.width) === (v == null ? void 0 : v.width)
              ? m
              : v,
          );
        };
      p();
      const y = requestAnimationFrame(() => d(!0)),
        g = f ? new ResizeObserver(p) : null;
      return (
        g == null || g.observe(f),
        () => {
          (cancelAnimationFrame(y), g == null || g.disconnect());
        }
      );
    }, [value, options]),
    (
      <div
        ref={o}
        className={`relative inline-flex rounded-btn border border-line bg-panel p-0.5 ${className}`}
        role="tablist"
      >
        {l && (
          <span
            aria-hidden="true"
            className={`absolute inset-y-0.5 z-0 rounded-chip bg-card shadow-card ring-1 ring-line ${h ? "transition-[translate,width] duration-[220ms] ease-quart" : ""}`}
            style={{
              left: 0,
              width: l.width,
              translate: `${l.left}px 0`,
            }}
          />
        )}
        {options.map((LocalComponent_f) => {
          const p = LocalComponent_f.value === value;
          return (
            <button
              ref={(y) => {
                c.current[LocalComponent_f.value] = y;
              }}
              role="tab"
              aria-selected={p}
              onClick={() => onChange(LocalComponent_f.value)}
              className={`press relative z-10 inline-flex items-center gap-1.5 rounded-chip px-3 font-semibold ${i} ${p ? "text-ink" : "text-ink-mute hover:text-ink"}`}
              key={LocalComponent_f.value}
            >
              {LocalComponent_f.icon && <LocalComponent_f.icon size={15} />}
              {LocalComponent_f.label}
            </button>
          );
        })}
      </div>
    )
  );
}
