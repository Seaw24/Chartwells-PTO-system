// Design notes: The highest-leverage surface. Month/Week answer "who is off, when";
//   Timeline answers "are we covered". Toolbar groups navigation (left) and view/
//   filter controls (right) so the eye always knows where each control lives. Views
//   are keyed for a crossfade on switch. Filters stay inline (no modal) per the brief.
// References: Notion Calendar chrome; Float timeline; Google Calendar month grid.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMonths, addWeeks, endOfMonth, endOfWeek, format } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Columns3,
  GanttChartSquare,
  SlidersHorizontal,
  SkipForward,
} from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import { useRequestModal } from '../components/requests/RequestModalProvider';
import { canApprove, PTO_TYPES, userById, firstName, TEAMS } from '../utils/constants';
import { toDate, toISO, fmtMonthYear, fmtRange } from '../utils/dateHelpers';
import SegmentedControl from '../components/ui/SegmentedControl';
import PersonPicker from '../components/ui/PersonPicker';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import StatusChip from '../components/ui/StatusChip';
import PtoTypePill from '../components/ui/PtoTypePill';
import Avatar from '../components/ui/Avatar';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import TeamTimeline from '../components/calendar/TeamTimeline';
import CalendarLegend from '../components/calendar/CalendarLegend';

const STATUSES = [
  { id: 'approved', label: 'Approved' },
  { id: 'pending', label: 'Pending' },
];

export default function CalendarPage() {
  const { activeUser, todayIso, requests, holidays, teamMembers, users } = useDemoContext();
  const { openRequest } = useRequestModal();
  const isApprover = canApprove(activeUser.role);

  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(toDate(todayIso));
  const [typeFilter, setTypeFilter] = useState(new Set(PTO_TYPES.map((t) => t.id)));
  const [statusFilter, setStatusFilter] = useState(new Set(['approved', 'pending']));
  const [teamFilter, setTeamFilter] = useState(activeUser.role === 'admin' ? activeUser.team : 'all');
  const [personFilter, setPersonFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailList, setDetailList] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [params, setParams] = useSearchParams();

  // Deep-link from "See in calendar": jump to the request's month and mark it. We clear
  // the URL param after applying so a refresh doesn't re-trigger, but keep the highlight
  // in state until the user navigates away.
  useEffect(() => {
    const reqId = params.get('req');
    if (!reqId) return;
    const target = requests.find((r) => r.id === reqId);
    if (target) {
      setCursor(toDate(target.start));
      setHighlightId(reqId);
    }
    setParams({}, { replace: true });
  }, [params, requests, setParams]);

  const highlightReq = highlightId ? requests.find((r) => r.id === highlightId) : null;

  // People this viewer may focus on: god sees everyone (narrowed by team filter);
  // admins/employees see their own team.
  const viewablePeople = useMemo(() => {
    if (activeUser.role === 'god_admin') {
      return teamFilter === 'all' ? users : users.filter((u) => u.team === teamFilter);
    }
    return users.filter((u) => u.team === activeUser.team);
  }, [activeUser, teamFilter, users]);

  // Clear the person focus if they leave the viewable set (e.g. god switches team).
  useEffect(() => {
    if (personFilter !== 'all' && !viewablePeople.some((p) => p.id === personFilter)) {
      setPersonFilter('all');
    }
  }, [viewablePeople, personFilter]);

  const focusPerson = personFilter !== 'all' ? userById(personFilter) : null;

  // Base scope by role, then apply filters. The deep-linked highlight is force-included
  // so "See in calendar" always shows the marked request even if the current filters
  // (type/status/person) would otherwise hide it.
  const scoped = useMemo(() => {
    const list = requests.filter((r) => {
      const author = userById(r.userId);
      if (activeUser.role === 'employee') {
        if (author?.team !== activeUser.team) return false;
      } else if (activeUser.role === 'admin') {
        if (author?.team !== activeUser.team) return false;
      } else if (teamFilter !== 'all') {
        if (author?.team !== teamFilter) return false;
      }
      if (personFilter !== 'all' && r.userId !== personFilter) return false;
      if (!typeFilter.has(r.type)) return false;
      if (!statusFilter.has(r.status)) return false;
      return true;
    });
    if (highlightReq && !list.some((r) => r.id === highlightReq.id)) list.push(highlightReq);
    return list;
  }, [requests, activeUser, teamFilter, personFilter, typeFilter, statusFilter, highlightReq]);

  const timelineMembers = useMemo(() => {
    if (focusPerson) return [focusPerson];
    return teamMembers(teamFilter === 'all' ? null : teamFilter);
  }, [teamMembers, teamFilter, focusPerson]);

  const viewOptions = [
    { value: 'month', label: 'Month', icon: CalendarDays },
    { value: 'week', label: 'Week', icon: Columns3 },
    isApprover && { value: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  ].filter(Boolean);

  const periodLabel =
    view === 'month' ? fmtMonthYear(cursor) : `Week of ${format(cursor, 'MMM d, yyyy')}`;

  // The next block of time off after the current period — respects every active filter,
  // so when a person is focused it's literally "their next day off".
  const periodEnd = view === 'month' ? endOfMonth(cursor) : endOfWeek(cursor, { weekStartsOn: 0 });
  const nextOff = scoped
    .filter((r) => toDate(r.start) > periodEnd)
    .sort((a, b) => (a.start < b.start ? -1 : 1))[0] || null;

  function jumpToNextOff() {
    if (!nextOff) return;
    setCursor(toDate(nextOff.start));
    setHighlightId(nextOff.id);
  }

  // Manual period navigation drops any deep-link / jump highlight.
  function goCursor(updater) {
    setHighlightId(null);
    setCursor(updater);
  }

  const toggle = (set, setter, id) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  function handleChipClick(req, list) {
    if (list) setDetailList(list);
    else setDetail(req);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goCursor((c) => (view === 'month' ? addMonths(c, -1) : addWeeks(c, -1)))}
            className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
            aria-label="Previous period"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => goCursor((c) => (view === 'month' ? addMonths(c, 1) : addWeeks(c, 1)))}
            className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
            aria-label="Next period"
          >
            <ChevronRight size={18} />
          </button>
          <Button variant="outline" size="sm" onClick={() => goCursor(toDate(todayIso))}>Today</Button>
          {isApprover && (
            <Button
              variant="outline"
              size="sm"
              onClick={jumpToNextOff}
              disabled={!nextOff}
              title={
                focusPerson
                  ? `Jump to ${firstName(focusPerson.name)}'s next time off`
                  : "Jump to the next day someone's off"
              }
            >
              <SkipForward size={15} />
              <span className="hidden sm:inline">{focusPerson ? `${firstName(focusPerson.name)}'s next off` : 'Next off'}</span>
            </Button>
          )}
          <h2 className="ml-1 text-base font-bold text-ink sm:text-lg">{periodLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          <PersonPicker people={viewablePeople} value={personFilter} onChange={setPersonFilter} />
          <Button variant={showFilters ? 'navy' : 'outline'} size="sm" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal size={15} /> Filters
          </Button>
          <SegmentedControl options={viewOptions} value={view} onChange={setView} size="sm" />
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-card px-4 py-3 animate-fade-up">
          <FilterGroup label="Type">
            {PTO_TYPES.map((t) => (
              <Chip key={t.id} active={typeFilter.has(t.id)} onClick={() => toggle(typeFilter, setTypeFilter, t.id)} color={t.color}>
                {t.name}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Status">
            {STATUSES.map((s) => (
              <Chip key={s.id} active={statusFilter.has(s.id)} onClick={() => toggle(statusFilter, setStatusFilter, s.id)}>
                {s.label}
              </Chip>
            ))}
          </FilterGroup>
          {activeUser.role === 'god_admin' && (
            <FilterGroup label="Team">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="rounded-btn border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
              >
                <option value="all">All teams</option>
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FilterGroup>
          )}
        </div>
      )}

      <CalendarLegend />

      {/* Views — keyed so switching month/week/timeline crossfades (~180ms) rather
          than snapping; cheap perceived-speed win on a repeated action. */}
      <div key={view} className="animate-fade-in">
        {view === 'month' && (
          <MonthView
            monthDate={cursor}
            requests={scoped}
            holidays={holidays}
            todayIso={todayIso}
            highlight={highlightReq}
            onChipClick={handleChipClick}
            onEmptyClick={(d) => openRequest({ start: toISO(d), end: toISO(d) })}
          />
        )}
        {view === 'week' && (
          <WeekView
            anchorDate={cursor}
            requests={scoped}
            holidays={holidays}
            todayIso={todayIso}
            highlight={highlightReq}
            onChipClick={handleChipClick}
            onEmptyClick={(d) => openRequest({ start: toISO(d), end: toISO(d) })}
          />
        )}
        {view === 'timeline' && (
          <TeamTimeline
            anchorDate={cursor}
            members={timelineMembers}
            requests={scoped}
            holidays={holidays}
            todayIso={todayIso}
            highlight={highlightReq}
            onChipClick={handleChipClick}
          />
        )}
      </div>

      {/* Chip detail popover */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Time off" size="sm">
        {detail && <ChipDetail req={detail} users={users} />}
      </Modal>

      {/* Overflow "+N more" list */}
      <Modal open={!!detailList} onClose={() => setDetailList(null)} title="All entries" size="sm">
        {detailList && (
          <ul className="space-y-2">
            {detailList.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setDetailList(null);
                    setDetail(r);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-btn border border-line p-2.5 text-left hover:bg-panel"
                >
                  <Avatar name={userById(r.userId)?.name} id={r.userId} size="xs" />
                  <span className="flex-1 text-sm font-medium text-ink">{userById(r.userId)?.name}</span>
                  <PtoTypePill typeId={r.type} size="xs" showIcon={false} />
                  <StatusChip status={r.status} size="xs" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

function ChipDetail({ req, users }) {
  const approver = users.find((u) => u.id === req.decidedBy);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={userById(req.userId)?.name} id={req.userId} size="md" />
        <div>
          <p className="font-bold text-ink">{userById(req.userId)?.name}</p>
          <p className="text-xs text-ink-mute">{firstName(userById(req.userId)?.name)}'s request</p>
        </div>
      </div>
      <dl className="space-y-2.5 text-sm">
        <Row label="Type"><PtoTypePill typeId={req.type} size="sm" /></Row>
        <Row label="Dates"><span className="font-medium text-ink">{fmtRange(req.start, req.end)}</span></Row>
        <Row label="Status"><StatusChip status={req.status} size="xs" /></Row>
        {approver && <Row label="Decided by"><span className="text-ink">{approver.name}</span></Row>}
        {req.note && <Row label="Note"><span className="text-ink-soft">{req.note}</span></Row>}
      </dl>
    </div>
  );
}

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4">
    <dt className="text-ink-mute">{label}</dt>
    <dd className="text-right">{children}</dd>
  </div>
);

function FilterGroup({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? 'border-ink/15 bg-panel text-ink' : 'border-line text-ink-mute hover:text-ink'
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: active ? color : 'var(--c-line)' }} />}
      {children}
    </button>
  );
}
