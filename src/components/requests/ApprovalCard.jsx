import { useState } from 'react';
import { Check, X, Users, History } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { userById, firstName, teamById, ptoTypeById, DEFAULT_BALANCES } from '../../utils/constants';
import { fmtRange, businessDays, relativeTime, toDate } from '../../utils/dateHelpers';
import { conflictsFor } from '../../utils/policyEngine';
import { differenceInCalendarDays } from 'date-fns';
import Avatar from '../ui/Avatar';
import PtoTypePill from '../ui/PtoTypePill';
import Button from '../ui/Button';

// Design notes: A decision needs no extra clicks to make — balance, conflicts, note,
//   and how long it's waited are all on the card (decision support, per approval-UX
//   research). Age drives an escalating ink colour on "Submitted X ago". Deny expands
//   an inline reason (required) with Ctrl/Cmd+Enter to confirm for fast triage.
// References: HR approval queues (Charlie/BambooHR); "managers are low on time".
export default function ApprovalCard({ request, onApprove, onDeny, selectable, selected, onToggleSelect, onOpenPerson, onOpenDetail }) {
  const { balanceFor, requests, users, todayIso } = useDemoContext();
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState('');

  const employee = userById(request.userId);
  const type = ptoTypeById(request.type);
  const days = businessDays(request.start, request.end);
  const balance = balanceFor(request.userId, request.type);
  const conflicts = conflictsFor({
    draft: { start: request.start, end: request.end },
    requests,
    users,
    selfId: request.userId,
    teamId: employee?.team,
  });

  const ageDays = Math.abs(differenceInCalendarDays(toDate(todayIso), toDate(request.submittedAt)));
  const urgency = ageDays >= 5 ? 'var(--c-danger-ink)' : ageDays >= 2 ? 'var(--c-warning-ink)' : 'var(--c-ink-mute)';

  return (
    <div
      onClick={() => onOpenDetail?.(request)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpenDetail?.(request); }
      }}
      aria-label={`Open ${employee?.name}'s ${type.name} request`}
      className="cursor-pointer rounded-card border border-line bg-card p-5 shadow-card transition-shadow duration-[180ms] hover:shadow-lift"
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1.5 h-4 w-4 shrink-0 accent-accent"
            aria-label={`Select ${employee?.name}'s request`}
          />
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenPerson?.(employee?.id); }}
          className="shrink-0 rounded-full focus-visible:outline-none"
          aria-label={`View ${employee?.name}'s time-off history`}
          title="View all requests"
        >
          <Avatar name={employee?.name} id={employee?.id} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenPerson?.(employee?.id); }}
              className="group/name text-left"
              title="View all requests"
            >
              <p className="inline-flex items-center gap-1 font-bold text-ink transition-colors group-hover/name:text-accent-ink">
                {employee?.name}
                <History size={13} className="text-ink-mute opacity-0 transition-opacity group-hover/name:opacity-100" />
              </p>
              <p className="text-xs text-ink-mute">{teamById(employee?.team)?.name}</p>
            </button>
            <span className="text-xs font-medium" style={{ color: urgency }}>
              Submitted {relativeTime(request.submittedAt)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <PtoTypePill typeId={request.type} size="sm" />
            <span className="font-medium text-ink">{fmtRange(request.start, request.end)}</span>
            <span className="text-ink-mute tabular">· {days} day{days === 1 ? '' : 's'}</span>
          </div>

          {/* Balance + conflicts */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-btn bg-panel px-3 py-2 text-xs">
              <span className="text-ink-mute">Balance: </span>
              <b className="text-ink">{firstName(employee?.name)} has {balance}/{DEFAULT_BALANCES[request.type]} {type.name.toLowerCase()} left</b>
            </div>
            <div className={`rounded-btn px-3 py-2 text-xs ${conflicts.length ? 'bg-warning-soft text-ink-soft' : 'bg-panel text-ink-mute'}`}>
              <span className="flex items-center gap-1.5">
                <Users size={13} className={conflicts.length ? 'text-warning-ink' : 'text-ink-mute'} />
                {conflicts.length === 0
                  ? 'No teammates off then'
                  : `${conflicts.map((c) => firstName(c.user.name)).join(', ')} also off`}
              </span>
            </div>
          </div>

          {request.note && (
            <p className="mt-2.5 rounded-btn border border-line-soft bg-card px-3 py-2 text-sm text-ink-soft">
              “{request.note}”
            </p>
          )}

          {/* Actions */}
          {!denying ? (
            <div className="mt-4 flex items-center gap-2">
              <Button variant="success" size="sm" onClick={(e) => { e.stopPropagation(); onApprove(request); }}>
                <Check size={15} /> Approve
              </Button>
              <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setDenying(true); }}>
                <X size={15} /> Deny
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-2 animate-fade-up" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && reason.trim()) onDeny(request, reason.trim());
                }}
                rows={2}
                autoFocus
                placeholder="Reason for denial (required)…"
                className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-danger focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setDenying(false); setReason(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!reason.trim()}
                  onClick={() => onDeny(request, reason.trim())}
                >
                  Confirm denial
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
