import { useMemo } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { Check, X, Ban, Clock } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { PTO_TYPES, DEFAULT_BALANCES, ptoTypeById, userById, teamById } from '../../utils/constants';
import { fmtRange, businessDays, toDate } from '../../utils/dateHelpers';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import RolePill from '../ui/RolePill';
import StatusChip from '../ui/StatusChip';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import EmptyState from '../ui/EmptyState';
import { CalendarX } from 'lucide-react';

// Design notes: The Outlook-style "click a person, see everything they've requested" view
//   an approver asked for. Top: a horizontal year track placing every request by date so
//   you read at a glance when this person is off and how the year clusters; lanes stack to
//   avoid overlap. Below: a horizontal scroll of cards for every request, ALL statuses
//   (approved solid, pending dashed, denied/cancelled muted) so context isn't hidden.
//   Same colour=type / pattern=status language as the calendar, so nothing new to learn.
// References: Outlook "scheduling assistant" person view; Float single-resource timeline.

const STATUS_ICON = { approved: Check, pending: Clock, denied: X, cancelled: Ban };
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function PersonRequestsPanel({ userId, open, onClose, onOpenRequest }) {
  const { requestsForUser, balanceFor } = useDemoContext();
  const member = userById(userId);
  const requests = userId ? requestsForUser(userId) : [];

  // Pick the year with the most activity for the timeline (seed data is 2026).
  const year = useMemo(() => {
    if (!requests.length) return new Date().getFullYear();
    const counts = {};
    requests.forEach((r) => { const y = toDate(r.start).getFullYear(); counts[y] = (counts[y] || 0) + 1; });
    return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  }, [requests]);

  // Position each in-year request on a horizontal track, packing into lanes so overlapping
  // ranges don't collide.
  const { lanes, laneCount } = useMemo(() => {
    const yStart = new Date(year, 0, 1);
    const yDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365;
    const inYear = requests
      .filter((r) => toDate(r.start).getFullYear() === year || toDate(r.end).getFullYear() === year)
      .map((r) => {
        const s = Math.max(0, differenceInCalendarDays(toDate(r.start), yStart));
        const e = Math.min(yDays - 1, differenceInCalendarDays(toDate(r.end), yStart));
        return { ...r, l: (s / yDays) * 100, w: ((e - s + 1) / yDays) * 100, s, e };
      })
      .sort((a, b) => a.s - b.s);

    const laneEnds = []; // last day index occupied per lane
    const placed = inYear.map((r) => {
      let lane = laneEnds.findIndex((end) => r.s > end);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(r.e); }
      else laneEnds[lane] = r.e;
      return { ...r, lane };
    });
    return { lanes: placed, laneCount: Math.max(laneEnds.length, 1) };
  }, [requests, year]);

  const sorted = useMemo(
    () => [...requests].sort((a, b) => (a.start < b.start ? -1 : 1)),
    [requests]
  );

  if (!member) return null;

  return (
    <Modal open={open} onClose={onClose} title="Time-off history" size="xl">
      <div className="space-y-5">
        {/* Identity + balances */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} id={member.id} size="lg" />
            <div>
              <p className="text-lg font-bold text-ink">{member.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <RolePill role={member.role} size="xs" />
                <span className="text-xs text-ink-mute">{teamById(member.team)?.name || 'All teams'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PTO_TYPES.map((t) => {
              const total = DEFAULT_BALANCES[t.id];
              const left = balanceFor(member.id, t.id);
              return (
                <span
                  key={t.id}
                  className="flex items-center gap-1.5 rounded-chip border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink-soft"
                  title={`${t.name}: ${left} of ${total} left`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  <span className="font-mono tabular text-ink">{left}</span>
                  <span className="text-ink-mute">/{total}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Horizontal year timeline */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-mute">{year} at a glance</p>
            <span className="text-[11px] text-ink-mute">solid = approved · dashed = pending</span>
          </div>
          <div className="overflow-x-auto scrollbar-slim rounded-card border border-line bg-card p-3">
            <div className="min-w-[560px]">
              {/* month grid + labels */}
              <div className="relative" style={{ height: `${laneCount * 26 + 8}px` }}>
                <div className="absolute inset-0 flex">
                  {MONTHS.map((m, i) => (
                    <div key={i} className="flex-1 border-l border-line-soft first:border-l-0" />
                  ))}
                </div>
                {lanes.length === 0 && (
                  <p className="absolute inset-0 grid place-items-center text-xs text-ink-mute">No time off recorded in {year}.</p>
                )}
                {lanes.map((r) => {
                  const type = ptoTypeById(r.type);
                  const decided = r.status === 'denied' || r.status === 'cancelled';
                  const pending = r.status === 'pending';
                  const Icon = STATUS_ICON[r.status];
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => onOpenRequest?.(r.id)}
                      className="absolute flex h-[22px] items-center gap-1 overflow-hidden rounded-chip px-1.5 text-[10px] font-semibold transition-shadow hover:shadow-lift"
                      style={{
                        top: `${r.lane * 26 + 2}px`,
                        left: `${r.l}%`,
                        width: `calc(${r.w}% - 2px)`,
                        minWidth: '16px',
                        color: decided ? 'var(--c-ink-mute)' : `color-mix(in oklch, ${type.color} 72%, var(--c-ink))`,
                        background: decided
                          ? 'var(--c-panel)'
                          : `color-mix(in oklch, ${type.color} ${pending ? 12 : 22}%, var(--c-card))`,
                        border: pending
                          ? `1px dashed color-mix(in oklch, ${type.color} 55%, transparent)`
                          : decided
                          ? '1px solid var(--c-line)'
                          : `1px solid color-mix(in oklch, ${type.color} 32%, transparent)`,
                      }}
                      title={`${type.name} · ${fmtRange(r.start, r.end)} · ${r.status}`}
                    >
                      <Icon size={10} className="shrink-0" strokeWidth={2.5} />
                      <span className="truncate">{type.name}</span>
                    </button>
                  );
                })}
              </div>
              {/* month labels */}
              <div className="mt-1 flex border-t border-line-soft pt-1">
                {MONTHS.map((m, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] font-medium text-ink-mute">{m}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All requests, horizontal */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-mute">
            All requests <span className="text-ink-mute/70">({sorted.length})</span>
          </p>
          {sorted.length === 0 ? (
            <EmptyState icon={CalendarX} title="No requests" description="This person hasn't requested time off yet." className="py-8" />
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-slim px-1 pb-1">
              {sorted.map((r) => {
                const type = ptoTypeById(r.type);
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => onOpenRequest?.(r.id)}
                    className="flex w-[210px] shrink-0 flex-col gap-2 rounded-card border border-line bg-card p-3 text-left shadow-card transition-shadow duration-[180ms] hover:shadow-lift"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-btn"
                        style={{ background: `color-mix(in oklch, ${type.color} 12%, var(--c-card))`, color: type.color }}
                      >
                        <PtoTypeIcon typeId={type.id} size={16} />
                      </span>
                      <StatusChip status={r.status} size="xs" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{type.name}</p>
                      <p className="text-xs text-ink-soft">{fmtRange(r.start, r.end)}</p>
                    </div>
                    <p className="text-[11px] text-ink-mute">
                      <span className="font-medium text-ink-soft tabular">{businessDays(r.start, r.end)}</span> business day{businessDays(r.start, r.end) === 1 ? '' : 's'}
                      {r.decidedBy && ` · by ${userById(r.decidedBy)?.name?.split(' ')[0]}`}
                    </p>
                    {r.status === 'denied' && r.denialReason && (
                      <p className="rounded-chip bg-danger-soft px-2 py-1 text-[11px] text-danger-ink">{r.denialReason}</p>
                    )}
                    {r.note && r.status !== 'denied' && (
                      <p className="line-clamp-2 text-[11px] italic text-ink-mute">“{r.note}”</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
