// Design notes: A triage queue. Pending vs Recent Decisions as two tabs; god-admin gets
//   a sticky select-all/bulk-approve bar that stays in reach while scrolling a long
//   queue. "Inbox zero" is the celebrated empty state. Count pills use accent-strong/ink
//   for AA. Recent decisions stay undoable for 24h so a misclick is never final.
// References: approval-queue UX research; Linear inbox density.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { differenceInHours } from 'date-fns';
import { Inbox, RotateCcw, CheckCheck, Search, ArrowDownUp, SearchX } from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import { useToast } from '../components/ui/Toast';
import { isGodAdmin, userById, firstName, ptoTypeById, teamById, TEAMS } from '../utils/constants';
import { fmtRange, relativeTime, toDate, fmtTime, businessDays } from '../utils/dateHelpers';
import ApprovalCard from '../components/requests/ApprovalCard';
import PersonRequestsPanel from '../components/requests/PersonRequestsPanel';
import RequestDetailModal from '../components/requests/RequestDetailModal';
import EmptyState from '../components/ui/EmptyState';
import StatusChip from '../components/ui/StatusChip';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

export default function Approvals() {
  const { activeUser, todayIso, pendingForApprover, recentDecisionsBy, approveRequest, denyRequest, approveMany, undoDecision } = useDemoContext();
  const toast = useToast();
  const god = isGodAdmin(activeUser.role);

  const [tab, setTab] = useState('pending');
  const [teamFilter, setTeamFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('oldest');
  const [personId, setPersonId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [params, setParams] = useSearchParams();

  // Deep-link from elsewhere (e.g. a person's history on the Team page): open that
  // request's detail widget, then clear the param so a refresh doesn't reopen it.
  useEffect(() => {
    const reqId = params.get('req');
    if (!reqId) return;
    setDetailId(reqId);
    setParams({}, { replace: true });
  }, [params, setParams]);

  const pendingAll = pendingForApprover(activeUser);
  const teamScoped = useMemo(
    () => (god && teamFilter !== 'all' ? pendingAll.filter((r) => userById(r.userId)?.team === teamFilter) : pendingAll),
    [pendingAll, god, teamFilter]
  );

  // Search by employee name or PTO type, then sort. Lets an approver find one request in
  // a long queue (oldest-first by default so the most overdue surfaces).
  const pending = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = teamScoped.filter((r) => {
      if (!q) return true;
      const hay = `${userById(r.userId)?.name} ${ptoTypeById(r.type)?.name}`.toLowerCase();
      return hay.includes(q);
    });
    const byAge = (a, b) => (a.submittedAt < b.submittedAt ? -1 : 1);
    return [...list].sort((a, b) =>
      sort === 'oldest' ? byAge(a, b)
      : sort === 'newest' ? -byAge(a, b)
      : businessDays(b.start, b.end) - businessDays(a.start, a.end)
    );
  }, [teamScoped, query, sort]);

  const decisions = recentDecisionsBy(activeUser);

  const toggleSel = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleApprove = (r) => {
    approveRequest(r.id, activeUser.id);
    toast(`Approved ${firstName(userById(r.userId)?.name)}'s request.`, { kind: 'success' });
  };
  const handleDeny = (r, reason) => {
    denyRequest(r.id, activeUser.id, reason);
    toast(`Denied ${firstName(userById(r.userId)?.name)}'s request.`, { kind: 'info' });
  };
  const bulkApprove = () => {
    approveMany([...selected], activeUser.id);
    toast(`Approved ${selected.size} request${selected.size === 1 ? '' : 's'}.`, { kind: 'success' });
    setSelected(new Set());
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        <Tab active={tab === 'pending'} onClick={() => setTab('pending')} count={pendingAll.length}>Pending</Tab>
        <Tab active={tab === 'recent'} onClick={() => setTab('recent')}>Recent Decisions</Tab>
      </div>

      {tab === 'pending' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or type…"
              aria-label="Search pending requests"
              className="w-full rounded-btn border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-1.5 rounded-btn border border-line bg-card pl-2.5 text-ink-soft">
            <ArrowDownUp size={14} className="text-ink-mute" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort requests"
              className="bg-transparent py-2 pr-2 text-xs font-semibold text-ink focus:outline-none"
            >
              <option value="oldest">Oldest first</option>
              <option value="newest">Newest first</option>
              <option value="longest">Longest first</option>
            </select>
          </label>
          {god && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              aria-label="Filter by team"
              className="rounded-btn border border-line bg-card px-3 py-2 text-sm font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="all">All teams</option>
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {tab === 'pending' ? (
        pending.length === 0 ? (
          teamScoped.length > 0 ? (
            <EmptyState icon={SearchX} title="No matches" description={`Nothing matches “${query}”. Clear the search to see all ${teamScoped.length} pending.`} />
          ) : (
            <EmptyState icon={Inbox} title="Inbox zero" description="No requests are waiting on you right now." />
          )
        ) : (
          <>
            {god && (
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-card border border-line bg-card/95 px-4 py-2.5 shadow-card backdrop-blur">
                <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={selected.size === pending.length && pending.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(pending.map((r) => r.id)) : new Set())}
                  />
                  Select all
                  {selected.size > 0 && <span className="text-ink-mute">· {selected.size} selected</span>}
                </label>
                {selected.size > 0 && (
                  <Button variant="success" size="sm" onClick={bulkApprove}>
                    <CheckCheck size={15} /> Approve {selected.size}
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-3">
              {pending.map((r) => (
                <ApprovalCard
                  key={r.id}
                  request={r}
                  onApprove={handleApprove}
                  onDeny={handleDeny}
                  selectable={god}
                  selected={selected.has(r.id)}
                  onToggleSelect={() => toggleSel(r.id)}
                  onOpenPerson={setPersonId}
                  onOpenDetail={(req) => setDetailId(req.id)}
                />
              ))}
            </div>
          </>
        )
      ) : decisions.length === 0 ? (
        <EmptyState icon={CheckCheck} title="No recent decisions" description="Approvals and denials you make appear here for 30 days." />
      ) : (
        <div className="space-y-2">
          {decisions.map((r) => {
            const undoable = r.decidedAt && differenceInHours(toDate(todayIso), toDate(r.decidedAt)) <= 24;
            const employee = userById(r.userId);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-card p-3.5 shadow-card">
                <button
                  type="button"
                  onClick={() => setPersonId(employee?.id)}
                  className="group/d flex min-w-0 flex-1 items-center gap-3 text-left"
                  title="View all requests"
                >
                  <Avatar name={employee?.name} id={employee?.id} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink transition-colors group-hover/d:text-accent-ink">{employee?.name}</p>
                    <p className="text-xs text-ink-mute">
                      {ptoTypeById(r.type)?.name} · {fmtRange(r.start, r.end)}
                    </p>
                  </div>
                </button>
                <StatusChip status={r.status} size="xs" />
                <span className="text-xs text-ink-mute">{r.decidedAt && fmtTime(r.decidedAt)}</span>
                {undoable && r.status === 'approved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      undoDecision(r.id);
                      toast('Approval reverted to pending.', { kind: 'info' });
                    }}
                  >
                    <RotateCcw size={13} /> Undo
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PersonRequestsPanel
        userId={personId}
        open={!!personId}
        onClose={() => setPersonId(null)}
        onOpenRequest={(id) => { setPersonId(null); setDetailId(id); }}
      />
      <RequestDetailModal
        requestId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onOpenPerson={(id) => { setDetailId(null); setPersonId(id); }}
      />
    </div>
  );
}

function Tab({ active, onClick, count, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-btn px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-navy text-navy-fg' : 'text-ink-soft hover:bg-panel'
      }`}
    >
      {children}
      {count != null && count > 0 && (
        <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-accent-strong text-white' : 'bg-accent-soft text-accent-ink'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
