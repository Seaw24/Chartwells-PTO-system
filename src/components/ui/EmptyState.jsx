// Design notes: Quiet, adult empty state — a single neutral disc (panel + hairline) with a
//   muted line icon, not a coloured motif. Calm reads more premium than decorative; the
//   title teaches what belongs here and the optional CTA gives the next step.
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-line bg-panel">
        {Icon && <Icon size={22} className="text-ink-mute" strokeWidth={1.75} />}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
