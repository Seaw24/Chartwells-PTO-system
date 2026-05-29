// Design notes: One button vocabulary so "submit" looks identical everywhere.
//   Solid fills use the -strong tokens (accent/success) so white labels clear
//   AA 4.5:1 — the bright --c-accent is reserved for indicators, not fills.
//   Transitions ride the shared --dur-base / --ease tokens.
// References: Linear button restraint; Vercel/Geist "color only when it means something".
const VARIANTS = {
  primary: 'bg-accent-strong text-white shadow-btn hover:bg-accent-hover',
  navy: 'bg-navy text-navy-fg shadow-btn hover:bg-navy-700',
  success: 'bg-success-strong text-white shadow-btn hover:bg-success-ink',
  outline: 'border border-line bg-card text-ink shadow-card hover:bg-panel',
  danger: 'border border-danger/55 text-danger-ink bg-card hover:bg-danger-soft',
  ghost: 'text-ink-soft hover:bg-panel hover:text-ink',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9',
};

export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-btn font-semibold transition-[background,box-shadow,transform,color] duration-[180ms] ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
