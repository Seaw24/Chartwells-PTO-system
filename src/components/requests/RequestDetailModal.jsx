import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Users, CalendarSearch, History } from 'lucide-react';
import { useDataSource } from '../../data/dataSource';
import { useCurrentUser } from '../../data/session';
import { userById, teamById, ptoTypeById, firstName } from '../../utils/constants';
import { fmtRange, relativeTime, fmtTime } from '../../utils/dateHelpers';
import { conflictsFor } from '../../utils/policyEngine';
import { canDecideRequest, lineDays, requestDays, requestLines, requestRangeLabel, requestTypeIds, requestTypeLabel } from '../../utils/requestHelpers';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import RolePill from '../ui/RolePill';
import StatusChip from '../ui/StatusChip';
import PtoTypePill from '../ui/PtoTypePill';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

// Design notes: The single source of truth for one request, opened from the approvals
//   queue or a person's history (any status). Everything the approver needs to decide is
//   here — balance, conflicts, note, history — plus the actions (Approve / Deny inline) when
//   they're allowed to act, and "See in calendar" which deep-links the calendar to this
//   request's dates with its range marked. Behind it, the backdrop blurs (Modal default).
// References: Linear issue peek; the feedback's "pop-up widget, blur behind, see in calendar".
export default function RequestDetailModal({ requestId, open, onClose, onOpenPerson, onChanged }) {
  const activeUser = useCurrentUser();
  const { getRequests, getUsers, balanceFor, grantFor, normalDaysOffFor, approveRequest, denyRequest } = useDataSource();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState('');

  // Reset the inline deny flow whenever the modal opens on a different request.
  useEffect(() => { setDenying(false); setReason(''); }, [requestId, open]);

  useEffect(() => {
    let alive = true;
    if (!open || !requestId) {
      setData(null);
      return () => { alive = false; };
    }
    setData(null);
    Promise.all([getRequests(), getUsers()]).then(([requests, users]) => {
      const req = requests.find((r) => r.id === requestId);
      if (!req) {
        if (alive) setData({ requests, users, req: null, balance: null });
        return;
      }
      const typeIds = requestTypeIds(req);
      Promise.all([
        Promise.all(typeIds.map((typeId) => balanceFor(req.userId, typeId))),
        Promise.all(typeIds.map((typeId) => grantFor(req.userId, typeId))),
        normalDaysOffFor(req.userId),
      ]).then(([balanceList, grantList, normalDaysOff]) => {
        if (!alive) return;
        const balances = {};
        const grants = {};
        typeIds.forEach((typeId, i) => {
          balances[typeId] = balanceList[i];
          grants[typeId] = grantList[i];
        });
        setData({ requests, users, req, balances, grants, normalDaysOff });
      });
    });
    return () => { alive = false; };
  }, [requestId, open]);

  if (!data || !data.req) return null;

  const { requests, users, req, balances, grants, normalDaysOff } = data;
  const employee = userById(req.userId);
  const lines = requestLines(req);
  const typeIds = requestTypeIds(req);
  const days = requestDays(req, normalDaysOff);
  const decider = userById(req.decidedBy);
  const conflicts = conflictsFor({
    draft: req,
    requests,
    users,
    selfId: req.userId,
    teamId: employee?.team,
  });
  const canAct =
    req.status === 'pending' &&
    canDecideRequest(activeUser, req, users);

  const seeInCalendar = () => { onClose?.(); navigate(`/calendar?req=${req.id}`); };
  const approve = () => {
    approveRequest(req.id).then(() => {
      toast(`Approved ${firstName(employee?.name)}'s request.`, { kind: 'success' });
      onChanged?.();
      onClose?.();
    });
  };
  const confirmDeny = () => {
    if (!reason.trim()) return;
    denyRequest(req.id, reason.trim()).then(() => {
      toast(`Denied ${firstName(employee?.name)}'s request.`, { kind: 'info' });
      onChanged?.();
      onClose?.();
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Request details" size="md">
      <div className="space-y-4">
        {/* Who */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenPerson?.(employee?.id)}
            className="group/p flex items-center gap-3 text-left"
            title="View time-off history"
          >
            <Avatar name={employee?.name} id={employee?.id} size="md" />
            <div>
              <p className="inline-flex items-center gap-1 font-bold text-ink transition-colors group-hover/p:text-accent-ink">
                {employee?.name}
                {onOpenPerson && <History size={13} className="text-ink-mute opacity-0 transition-opacity group-hover/p:opacity-100" />}
              </p>
              <p className="text-xs text-ink-mute">{teamById(employee?.team)?.name || 'All teams'}</p>
            </div>
          </button>
          <StatusChip status={req.status} />
        </div>

        {/* Facts */}
        <dl className="space-y-2.5 rounded-card border border-line bg-surface/60 px-4 py-3 text-sm">
          <Row label="Request"><span className="font-medium text-ink">{requestTypeLabel(req)}</span></Row>
          <Row label="Dates"><span className="font-medium text-ink">{requestRangeLabel(req)}</span></Row>
          <Row label="Length"><span className="tabular text-ink">{days} charged day{days === 1 ? '' : 's'}</span></Row>
          <Row label="Balance">
            <span className="text-ink-soft">
              {typeIds.map((typeId) => {
                const type = ptoTypeById(typeId);
                return (
                  <span key={typeId} className="ml-2 first:ml-0">
                    <b className="text-ink tabular">{balances[typeId]}/{grants[typeId]}</b> {type?.name.toLowerCase()}
                  </span>
                );
              })}
            </span>
          </Row>
          <Row label="Submitted"><span className="text-ink-soft">{relativeTime(req.submittedAt)}</span></Row>
          {decider && req.decidedAt && (
            <Row label={req.status === 'approved' ? 'Approved by' : 'Decided by'}>
              <span className="text-ink-soft">{decider.name} · {fmtTime(req.decidedAt)}</span>
            </Row>
          )}
        </dl>

        {lines.length > 1 && (
          <div className="space-y-1.5 rounded-card border border-line bg-card px-3 py-2 text-sm">
            {lines.map((line, index) => (
              <div key={`${line.type}-${line.start}-${index}`} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <PtoTypePill typeId={line.type} size="xs" />
                  <span className="truncate text-ink-soft">{fmtRange(line.start, line.end)}</span>
                </span>
                <span className="shrink-0 text-xs tabular text-ink-mute">{lineDays(line, normalDaysOff)}d</span>
              </div>
            ))}
          </div>
        )}

        {/* Conflicts */}
        <div className={`flex items-center gap-2 rounded-card px-3 py-2 text-xs ${conflicts.length ? 'bg-warning-soft text-ink-soft' : 'bg-panel text-ink-mute'}`}>
          <Users size={14} className={conflicts.length ? 'text-warning-ink' : 'text-ink-mute'} />
          {conflicts.length === 0
            ? 'No teammates are off during these dates.'
            : `${conflicts.map((c) => firstName(c.user.name)).join(', ')} also off then.`}
        </div>

        {/* Note / denial */}
        {req.note && (
          <p className="rounded-card border border-line-soft bg-card px-3 py-2 text-sm italic text-ink-soft">“{req.note}”</p>
        )}
        {req.status === 'denied' && req.denialReason && (
          <p className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger-ink"><b>Denied:</b> {req.denialReason}</p>
        )}

        {/* Actions */}
        {denying ? (
          <div className="space-y-2 animate-fade-up">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') confirmDeny(); }}
              rows={2}
              autoFocus
              placeholder="Reason for denial (required)…"
              className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-danger focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDenying(false); setReason(''); }}>Cancel</Button>
              <Button variant="danger" size="sm" disabled={!reason.trim()} onClick={confirmDeny}>Confirm denial</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button variant="outline" size="sm" onClick={seeInCalendar}>
              <CalendarSearch size={15} /> See in calendar
            </Button>
            {canAct && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={() => setDenying(true)}>
                  <X size={15} /> Deny
                </Button>
                <Button variant="success" size="sm" onClick={approve}>
                  <Check size={15} /> Approve
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4">
    <dt className="text-ink-mute">{label}</dt>
    <dd className="text-right">{children}</dd>
  </div>
);
