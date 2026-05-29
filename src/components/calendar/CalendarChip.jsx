import { ptoTypeById, firstName, userById } from '../../utils/constants';

// Design notes: One PTO entry on a day. Colour = type (leading dot + tint), pattern
//   = status: approved is a solid tinted fill, pending is a dashed outline with a
//   lighter fill (matches Float's confirmed-vs-tentative bars). The fill + border
//   transition on --dur-base, so when a request is approved elsewhere the chip
//   visibly settles from dashed to solid instead of snapping. Never a side-stripe.
// References: Float allocation bars (solid vs outline); DESIGN.md chip spec; 6px chip radius.
export default function CalendarChip({ request, onClick, dense = false, highlighted = false }) {
  const type = ptoTypeById(request.type);
  const user = userById(request.userId);
  const pending = request.status === 'pending';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(request);
      }}
      className={`flex w-full items-center gap-1.5 truncate rounded-chip px-1.5 text-left text-[11px] font-medium leading-tight transition-[background,border-color,box-shadow] duration-[180ms] ease-out hover:shadow-card ${
        dense ? 'py-0.5' : 'py-1'
      } ${highlighted ? 'shadow-lift ring-2 ring-accent-strong ring-offset-1' : ''}`}
      style={{
        background: `color-mix(in oklch, ${type.color} ${pending ? 9 : 16}%, var(--c-card))`,
        border: pending
          ? `1px dashed color-mix(in oklch, ${type.color} 55%, transparent)`
          : `1px solid color-mix(in oklch, ${type.color} 30%, transparent)`,
      }}
      title={`${user?.name} · ${type.name} · ${request.status}`}
      aria-label={`${user?.name}, ${type.name}, ${request.status}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: type.color }} />
      <span className="truncate text-ink">{firstName(user?.name)}</span>
    </button>
  );
}
