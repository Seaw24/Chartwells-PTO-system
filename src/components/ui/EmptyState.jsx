export function EmptyState({
  icon: LocalComponent_icon,
  title: title,
  description: description,
  action: action,
  className = "",
}) {
  return (
    <div
      className={`animate-fade-rise flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-line bg-panel">
        {LocalComponent_icon && (
          <LocalComponent_icon
            size={22}
            className="text-ink-mute"
            strokeWidth={1.75}
          />
        )}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
