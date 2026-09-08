import { ROLE_META } from "../../utils/constants.jsx";
export const _S = {
  navy: {
    fg: "var(--c-navy-fg)",
    bg: "var(--c-navy)",
  },
  accent: {
    fg: "var(--c-accent-ink)",
    bg: "var(--c-accent-soft)",
  },
  neutral: {
    fg: "var(--c-ink-soft)",
    bg: "var(--c-panel)",
  },
};
export const NS = {
  fg: "var(--c-navy-fg)",
  bg: "color-mix(in oklch, var(--c-navy-fg) 15%, transparent)",
};
export function RolePill({
  role: role,
  size = "sm",
  className = "",
  onDark = !1,
}) {
  const s = ROLE_META[role];
  if (!s) return null;
  const i = onDark ? NS : _S[s.tone],
    o = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${o} ${className}`}
      style={{
        color: i.fg,
        background: i.bg,
      }}
    >
      {s.label}
    </span>
  );
}
