import { PTO_TYPES } from '../../utils/constants';

// Design notes: Reads as two clauses — colour = type, pattern = status — so the
//   calendar needs no decoding. The status swatches mirror the real chip styling
//   (solid fill = approved, dashed outline = pending, hatch = blackout).
// References: DESIGN.md chip spec; Float legend pattern.
export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-card px-4 py-2.5 text-xs">
      {PTO_TYPES.map((t) => (
        <span key={t.id} className="flex items-center gap-1.5 text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
          {t.name}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-3 text-ink-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-5 rounded-chip border border-ink-mute/40 bg-panel" /> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-5 rounded-chip border border-dashed border-ink-mute/55" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-5 rounded-chip hatch-danger" /> Blackout
        </span>
      </span>
    </div>
  );
}
