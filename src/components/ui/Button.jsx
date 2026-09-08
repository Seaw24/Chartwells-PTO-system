export const BUTTON_VARIANTS = {
  primary: "bg-accent-strong text-white shadow-btn hover:bg-accent-hover",
  navy: "bg-navy text-navy-fg shadow-btn hover:bg-navy-700",
  success: "bg-success-strong text-white shadow-btn hover:bg-success-ink",
  outline: "border border-line bg-card text-ink shadow-card hover:bg-panel",
  danger:
    "border border-danger/55 text-danger-ink bg-card hover:bg-danger-soft",
  ghost: "text-ink-soft hover:bg-panel hover:text-ink",
};
export const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-9 w-9",
};
export function Button({
  as: LocalComponent_as = "button",
  variant = "primary",
  size = "md",
  className = "",
  children: children,
  ...i
}) {
  return (
    <LocalComponent_as
      className={`press inline-flex items-center justify-center rounded-btn font-semibold disabled:pointer-events-none disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...i}
    >
      {children}
    </LocalComponent_as>
  );
}
