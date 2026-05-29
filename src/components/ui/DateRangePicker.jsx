import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isSameMonth, isSameDay, addMonths, addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { monthGrid, toDate, toISO, WEEKDAYS, fmtMonthYear } from '../../utils/dateHelpers';
import { isDayInAnyWindow, isBlackoutDay, windowsForType } from '../../utils/policyEngine';
import { ptoTypeById } from '../../utils/constants';

// Design notes: Inline two-tap range picker (first tap = start, second = end, auto-
//   orders). Hardened from v1 into a real ARIA grid: one roving tabindex, full keyboard
//   nav (arrows = day/week, Home/End = week edge, PageUp/Dn = month, Enter/Space =
//   pick), and disabled days stay focusable (aria-disabled) so traversal never traps —
//   the APG date-grid pattern, no new dependency. Prop interface unchanged.
// References: WAI-ARIA APG date picker dialog; shadcn/react-day-picker keyboard behaviour.
export default function DateRangePicker({ value, onChange, typeId, todayIso, allowPast = false }) {
  const type = ptoTypeById(typeId);
  const restricted = !!type?.restrictedDates;

  // For a window-restricted type (vacation), open on the first available window instead
  // of today's month — otherwise the user lands on an all-disabled grid with no clue
  // where to go. Honour an explicit prefilled start over this default.
  const initialIso = (() => {
    const base = value?.start || todayIso;
    if (restricted && !value?.start && !isDayInAnyWindow(base, typeId)) {
      const w = windowsForType(typeId);
      if (w?.length) return w[0].start;
    }
    return toISO(toDate(base));
  })();

  const [cursor, setCursor] = useState(() => toDate(initialIso));
  const [focusIso, setFocusIso] = useState(initialIso);
  const gridRef = useRef(null);
  const moveByKeyRef = useRef(false);

  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const today = toDate(todayIso);
  const yesterday = new Date(today.getTime() - 864e5);

  const startD = value?.start ? toDate(value.start) : null;
  const endD = value?.end ? toDate(value.end) : null;

  function dayState(d) {
    const iso = toISO(d);
    const isPast = d < (allowPast ? yesterday : today);
    const blackout = isBlackoutDay(iso, typeId);
    const outOfWindow = restricted && !isDayInAnyWindow(iso, typeId);
    const disabled = isPast || blackout || outOfWindow;
    const inRange = startD && endD && d >= startD && d <= endD;
    const isStart = startD && isSameDay(d, startD);
    const isEnd = endD && isSameDay(d, endD);
    return { iso, disabled, blackout, outOfWindow, inRange, isStart, isEnd, isToday: isSameDay(d, today) };
  }

  function pick(d) {
    const { disabled, iso } = dayState(d);
    if (disabled) return;
    // Start a new range when nothing is started or a full range already exists. v1 set
    // end=start on the first tap, which made end truthy and reset on every later tap —
    // so a multi-day range could never be selected. Leaving end empty fixes that: the
    // first tap marks the start, the second completes (auto-ordered).
    if (!value?.start || (value.start && value.end)) {
      onChange({ start: iso, end: '' });
      return;
    }
    if (toDate(iso) < toDate(value.start)) onChange({ start: iso, end: value.start });
    else onChange({ start: value.start, end: iso });
  }

  // Keyboard grid navigation. Moving focus across a month edge follows the cursor.
  function onKeyDown(e) {
    const cur = toDate(focusIso);
    let next = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(cur, -1); break;
      case 'ArrowRight': next = addDays(cur, 1); break;
      case 'ArrowUp': next = addDays(cur, -7); break;
      case 'ArrowDown': next = addDays(cur, 7); break;
      case 'Home': next = startOfWeek(cur, { weekStartsOn: 0 }); break;
      case 'End': next = endOfWeek(cur, { weekStartsOn: 0 }); break;
      case 'PageUp': next = addMonths(cur, -1); break;
      case 'PageDown': next = addMonths(cur, 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(cur);
        return;
      default:
        return;
    }
    e.preventDefault();
    moveByKeyRef.current = true;
    if (!isSameMonth(next, cursor)) setCursor(next);
    setFocusIso(toISO(next));
  }

  // After a keyboard move, pull DOM focus to the newly focused cell.
  useEffect(() => {
    if (!moveByKeyRef.current) return;
    moveByKeyRef.current = false;
    gridRef.current?.querySelector(`[data-iso="${focusIso}"]`)?.focus();
  }, [focusIso]);

  function goMonth(delta) {
    const m = addMonths(cursor, delta);
    setCursor(m);
    // Keep the roving cell inside the visible month.
    if (!isSameMonth(toDate(focusIso), m)) setFocusIso(toISO(m));
  }

  return (
    <div className="rounded-card border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="grid h-8 w-8 place-items-center rounded-btn text-ink-soft hover:bg-panel"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-ink" aria-live="polite">{fmtMonthYear(cursor)}</span>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="grid h-8 w-8 place-items-center rounded-btn text-ink-soft hover:bg-panel"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        role="grid"
        aria-label="Choose dates"
        ref={gridRef}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-px text-center"
      >
        {WEEKDAYS.map((w) => (
          <div key={w} role="columnheader" className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
            {w[0]}
          </div>
        ))}
        {days.map((d) => {
          const s = dayState(d);
          const dim = !isSameMonth(d, cursor);
          const isFocusCell = s.iso === focusIso;
          return (
            <button
              key={s.iso}
              type="button"
              data-iso={s.iso}
              role="gridcell"
              tabIndex={isFocusCell ? 0 : -1}
              aria-disabled={s.disabled || undefined}
              aria-selected={s.isStart || s.isEnd || s.inRange || undefined}
              aria-label={`${format(d, 'EEEE, MMMM d, yyyy')}${s.blackout ? ', blackout, unavailable' : s.outOfWindow ? ', outside allowed window' : ''}`}
              onClick={() => pick(d)}
              onFocus={() => setFocusIso(s.iso)}
              title={s.blackout ? 'Blackout period — unavailable' : s.outOfWindow ? 'Outside the allowed window' : undefined}
              className={[
                'relative flex h-9 items-center justify-center rounded-chip text-sm font-medium transition-colors duration-[120ms]',
                s.inRange ? 'bg-accent-soft' : '',
                s.isStart ? 'rounded-l-btn' : '',
                s.isEnd ? 'rounded-r-btn' : '',
                s.isStart || s.isEnd ? '!bg-accent-strong !text-white font-bold' : '',
                s.disabled ? 'cursor-not-allowed text-ink-mute/45' : 'hover:bg-panel text-ink',
                dim && !s.inRange ? 'opacity-40' : '',
                s.blackout ? 'hatch-danger' : '',
              ].join(' ')}
            >
              {format(d, 'd')}
              {s.isToday && !s.isStart && !s.isEnd && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent-strong" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 px-1 text-[11px] text-ink-mute">
        Tip: use arrow keys to move, Enter to pick start then end.
      </p>
    </div>
  );
}
