// Design notes: The modal read of one teammate — identity, live status, balance bars,
//   and history, in the same order as the self Profile so there's nothing new to learn.
//   memberStatus (below) is shared with the team cards.
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDataSource } from '../../data/dataSource';
import { useToday } from '../../data/today';
import { PTO_TYPES, teamById, ptoTypeById } from '../../utils/constants';
import { requestDays, requestLines, requestRangeLabel, requestStart, requestTypeLabel } from '../../utils/requestHelpers';
import Avatar from '../ui/Avatar';
import RolePill from '../ui/RolePill';
import StatusChip from '../ui/StatusChip';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import EmptyState from '../ui/EmptyState';
import { CalendarX } from 'lucide-react';

// Design notes: One "where are they right now" line, color + dot, never colour alone.
//   Text uses the -ink tones so the label clears AA on light; the dot keeps the vivid
//   base (or the PTO type's own colour) so it still pops at a glance.
export function memberStatus(member, requests, holidays, todayIso) {
  const onPto = requests.find(
    (r) =>
      r.userId === member.id &&
      r.status === 'approved' &&
      requestLines(r).some((line) => line.start <= todayIso && line.end >= todayIso)
  );
  if (onPto) {
    const line = requestLines(onPto).find((l) => l.start <= todayIso && l.end >= todayIso);
    return { label: `On PTO · ${ptoTypeById(line?.type)?.name}`, tone: 'var(--c-accent-ink)', dot: ptoTypeById(line?.type)?.color };
  }
  if (holidays.some((h) => h.date === todayIso)) {
    return { label: 'Off today · Holiday', tone: 'var(--c-warning-ink)', dot: 'var(--c-warning)' };
  }
  return { label: 'In office', tone: 'var(--c-success-ink)', dot: 'var(--c-success)' };
}

export default function EmployeeProfile({ member }) {
  const navigate = useNavigate();
  const { requestsForUser, usedFor, grantFor, normalDaysOffFor, getRequests, getHolidays } = useDataSource();
  const todayIso = useToday();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    Promise.all([
      requestsForUser(member.id),
      getRequests(),
      getHolidays(),
      Promise.all(PTO_TYPES.map((t) => usedFor(member.id, t.id))),
      Promise.all(PTO_TYPES.map((t) => grantFor(member.id, t.id))),
      normalDaysOffFor(member.id),
    ]).then(([history, requests, holidays, usedList, grantList, normalDaysOff]) => {
      if (!alive) return;
      const usedByType = {};
      const grantByType = {};
      PTO_TYPES.forEach((t, i) => {
        usedByType[t.id] = usedList[i];
        grantByType[t.id] = grantList[i];
      });
      setData({ history, requests, holidays, usedByType, grantByType, normalDaysOff });
    });
    return () => { alive = false; };
  }, [member.id]);

  if (data === null) return null;

  const { requests, holidays, usedByType, grantByType, normalDaysOff } = data;
  // Newest on the left, oldest on the right (scroll right to go back in time).
  const history = [...data.history].sort((a, b) => (requestStart(a) < requestStart(b) ? 1 : -1));
  const status = memberStatus(member, requests, holidays, todayIso);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} id={member.id} size="lg" />
        <div>
          <p className="text-lg font-bold text-ink">{member.name}</p>
          <p className="text-sm text-ink-mute">{member.email}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <RolePill role={member.role} size="xs" />
            <span className="text-xs text-ink-mute">{teamById(member.team)?.name || 'All teams'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-btn bg-panel px-3 py-2 text-sm font-medium" style={{ color: status.tone }}>
        <span className="h-2 w-2 rounded-full" style={{ background: status.dot }} />
        {status.label}
      </div>

      {/* Balances */}
      <div className="space-y-2.5">
        {PTO_TYPES.map((t) => {
          const total = grantByType[t.id];
          const used = usedByType[t.id];
          return (
            <div key={t.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <PtoTypeIcon typeId={t.id} size={13} style={{ color: t.color }} /> {t.name}
                </span>
                <span className="tabular text-ink-mute">{total - used}/{total}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel">
                <div className="h-full rounded-full" style={{ width: `${(used / total) * 100}%`, background: t.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* History — horizontal scroll of every request (any status). Clicking one opens it
          in Approvals so an approver can act in one move. */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-bold text-ink">Request history</p>
          {history.length > 1 && <p className="text-[11px] text-ink-mute">Recent first · scroll → for older</p>}
        </div>
        {history.length === 0 ? (
          <EmptyState icon={CalendarX} title="No requests" description="This person hasn't requested time off." className="py-8" />
        ) : (
          <div className="-mx-1 flex gap-3 overflow-x-auto scrollbar-slim px-1 pb-1">
            {history.map((r) => {
              const lines = requestLines(r);
              const type = ptoTypeById(lines[0]?.type);
              const color = type?.color || 'var(--c-ink-mute)';
              const days = requestDays(r, normalDaysOff);
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => navigate(`/approvals?req=${r.id}`)}
                  className="flex w-[190px] shrink-0 flex-col gap-2 rounded-card border border-line bg-card p-3 text-left shadow-card transition-shadow duration-[180ms] hover:shadow-lift"
                  title="Open in Approvals"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-btn"
                      style={{ background: `color-mix(in oklch, ${color} 12%, var(--c-card))`, color }}
                    >
                      <PtoTypeIcon typeId={type?.id} size={16} />
                    </span>
                    <StatusChip status={r.status} size="xs" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{requestTypeLabel(r)}</p>
                    <p className="text-xs text-ink-soft">{requestRangeLabel(r)}</p>
                  </div>
                  <p className="text-[11px] text-ink-mute">
                    <span className="font-medium text-ink-soft tabular">{days}</span> charged day{days === 1 ? '' : 's'}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
