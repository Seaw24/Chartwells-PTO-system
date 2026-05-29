// Design notes: View toggle. The active segment is a raised card "thumb" on a
//   panel track (shadow-card + hairline ring) so the current view is unmistakable
//   at a glance; inactive segments stay quiet until hover.
// References: Linear/Raycast segmented toggles; the chip radius token (6px).
export default function SegmentedControl({ options, value, onChange, size = 'md', className = '' }) {
  const pad = size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm';
  return (
    <div className={`inline-flex rounded-btn border border-line bg-panel p-0.5 ${className}`} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-chip px-3 font-semibold transition-colors duration-[120ms] ease-out ${pad} ${
              active ? 'bg-card text-ink shadow-card ring-1 ring-line' : 'text-ink-mute hover:text-ink'
            }`}
          >
            {opt.icon && <opt.icon size={15} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
