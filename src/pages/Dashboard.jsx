// Design notes: Role-aware landing. Balances first, then role panels: admins see team
//   coverage + a pending-approvals shortcut; god-admin gets operational status tiles
//   (icon + number + context line, linking onward) instead of bare hero numbers. The
//   navy "Request time off" card is the one bold accent surface, earning its weight.
// References: Deel home cards; Linear/Height dashboard density; avoids the hero-metric cliché.
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek } from 'date-fns';
import {
  CalendarPlus,
  ArrowRight,
  CalendarRange,
  Clock3,
  Plane,
  AlertOctagon,
} from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import { useRequestModal } from '../components/requests/RequestModalProvider';
import { canApprove, isGodAdmin, firstName, ptoTypeById, teamById, TEAMS } from '../utils/constants';
import {
  toDate,
  toISO,
  fmtMedium,
  fmtShort,
  relativeTime,
  rangesOverlap,
  fmtLong,
} from '../utils/dateHelpers';
import BalanceCards from '../components/requests/BalanceCards';
import StatusChip from '../components/ui/StatusChip';
import PtoTypePill from '../components/ui/PtoTypePill';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import MiniCalendar from '../components/calendar/MiniCalendar';
import PtoTypeIcon from '../components/ui/PtoTypeIcon';

export default function Dashboard() {
  const ctx = useDemoContext();
  const { activeUser, todayIso, requestsForUser } = ctx;
  const { openRequest } = useRequestModal();

  const greeting = getGreeting();
  const myRequests = requestsForUser(activeUser.id);
  const upcoming = myRequests
    .filter((r) => r.status === 'approved' && toDate(r.end) >= toDate(todayIso))
    .sort((a, b) => (a.start > b.start ? 1 : -1))
    .slice(0, 3);
  const activity = [...myRequests]
    .sort((a, b) => ((a.decidedAt || a.submittedAt) < (b.decidedAt || b.submittedAt) ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-mute">{greeting},</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-bold tracking-tight text-ink">{activeUser.name.split(' ')[0]}</h2>
          <p className="text-sm text-ink-mute">{fmtLong(todayIso)}</p>
        </div>
      </header>

      <BalanceCards userId={activeUser.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {canApprove(activeUser.role) && <AdminPanels ctx={ctx} />}
          {isGodAdmin(activeUser.role) && <GodAdminPanels ctx={ctx} />}

          <Panel
            title="Upcoming time off"
            icon={Plane}
            action={<Link to="/calendar" className="text-xs font-semibold text-accent hover:text-accent-hover">Open calendar</Link>}
          >
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarRange}
                title="Nothing on the books"
                description="You have no approved time off coming up."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-line-soft">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-btn"
                      style={{ background: `color-mix(in oklch, ${ptoTypeById(r.type)?.color} 12%, var(--c-card))`, color: ptoTypeById(r.type)?.color }}
                    >
                      <PtoTypeIcon typeId={r.type} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{fmtMedium(r.start)}{r.start !== r.end ? ` – ${fmtShort(r.end)}` : ''}</p>
                      <p className="text-xs text-ink-mute">{ptoTypeById(r.type)?.name}</p>
                    </div>
                    <StatusChip status={r.status} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent activity" icon={Clock3}>
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-mute">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ptoTypeById(r.type)?.color }} />
                    <p className="flex-1 text-ink-soft">
                      {activityText(r, ctx)}
                      <span className="ml-1.5 text-[11px] text-ink-mute">{relativeTime(r.decidedAt || r.submittedAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Aside */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-card bg-navy p-5 text-navy-fg shadow-raised">
            {/* Dot-grid texture echoes the login screen — the two navy surfaces rhyme. */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, var(--c-navy-fg) 1px, transparent 0)',
                backgroundSize: '22px 22px',
              }}
            />
            <div className="relative">
              <p className="eyebrow text-navy-fg-mute">Need a break?</p>
              <p className="mt-2 text-[17px] font-bold leading-snug">Request time off in under a minute.</p>
              <Button variant="primary" className="mt-4 w-full" onClick={() => openRequest()}>
                <CalendarPlus size={17} /> Request Time Off
              </Button>
            </div>
          </div>

          <Panel title="This month" compact>
            <MiniCalendar userId={activeUser.id} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---- Admin panels ---- */
function AdminPanels({ ctx }) {
  const { activeUser, pendingForApprover, teamMembers, todayIso, requests, balanceFor } = ctx;
  const team = activeUser.role === 'admin' ? activeUser.team : null;
  const members = teamMembers(team).filter((u) => u.role === 'employee' || u.id !== activeUser.id);
  const pending = pendingForApprover(activeUser);
  const oldest = pending.reduce((acc, r) => (!acc || r.submittedAt < acc.submittedAt ? r : acc), null);

  const wkStart = toISO(startOfWeek(toDate(todayIso)));
  const wkEnd = toISO(endOfWeek(toDate(todayIso)));
  const outThisWeek = members.filter((m) =>
    requests.some((r) => r.userId === m.id && r.status === 'approved' && rangesOverlap(r.start, r.end, wkStart, wkEnd))
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-card border border-line bg-card p-5 shadow-card">
        <p className="eyebrow">Team this week</p>
        <p className="mt-2.5 text-[26px] font-bold leading-none tabular text-ink">
          {outThisWeek.length}<span className="ml-1.5 text-sm font-medium text-ink-mute">of {members.length} out</span>
        </p>
        <div className="mt-3.5 flex min-h-[2rem] items-center">
          {outThisWeek.length === 0 ? (
            <p className="text-[13px] text-ink-mute">Everyone's in this week.</p>
          ) : (
            <div className="flex -space-x-2">
              {outThisWeek.slice(0, 6).map((m) => (
                <Avatar key={m.id} name={m.name} id={m.id} size="sm" ring />
              ))}
            </div>
          )}
        </div>
      </div>

      <Link
        to="/approvals"
        className="group flex flex-col justify-between rounded-card border border-line bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-lift"
      >
        <div>
          <p className="eyebrow">Pending approvals</p>
          <p className="mt-2.5 text-[26px] font-bold leading-none tabular" style={{ color: pending.length ? 'var(--c-accent-ink)' : 'var(--c-ink)' }}>
            {pending.length}
          </p>
          {oldest && <p className="mt-2 text-xs text-ink-mute">Oldest {relativeTime(oldest.submittedAt)}</p>}
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-ink">
          Review <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="rounded-card border border-line bg-card p-5 shadow-card sm:col-span-2">
        <p className="eyebrow mb-3">Team balances</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Member</th>
                <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Vacation</th>
                <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Sick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {members.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-panel/60">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={m.name} id={m.id} size="xs" />
                      <span className="font-medium text-ink">{m.name}</span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular font-semibold text-ink-soft">{balanceFor(m.id, 'vacation')}</td>
                  <td className="py-2.5 text-right tabular font-semibold text-ink-soft">{balanceFor(m.id, 'sick')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---- God admin panels ---- */
function GodAdminPanels({ ctx }) {
  const { requests, outOnDay, todayIso, blackouts, teamMembers } = ctx;
  const totalPending = requests.filter((r) => r.status === 'pending').length;
  const outToday = outOnDay(todayIso);
  const upcomingBlackouts = blackouts.filter((b) => toDate(b.end) >= toDate(todayIso));

  const oldestPending = requests
    .filter((r) => r.status === 'pending')
    .reduce((a, r) => (!a || r.submittedAt < a.submittedAt ? r : a), null);
  const nextBlackout = upcomingBlackouts[0];

  // Operational status tiles: number + icon + a context line so each reads as a
  // glanceable status, not a decorative hero metric. Pending/blackout link onward.
  const stats = [
    {
      label: 'Pending requests',
      value: totalPending,
      icon: Clock3,
      tone: totalPending ? 'var(--c-accent-ink)' : 'var(--c-ink)',
      context: oldestPending ? `Oldest ${relativeTime(oldestPending.submittedAt)}` : 'All caught up',
      to: totalPending ? '/approvals' : null,
    },
    {
      label: 'Out today',
      value: outToday.length,
      icon: Plane,
      tone: 'var(--c-ink)',
      context: outToday.length ? outToday.map((r) => firstName(r.user?.name)).slice(0, 3).join(', ') : 'Everyone in',
    },
    {
      label: 'Upcoming blackouts',
      value: upcomingBlackouts.length,
      icon: AlertOctagon,
      tone: upcomingBlackouts.length ? 'var(--c-danger-ink)' : 'var(--c-ink)',
      context: nextBlackout ? `Next ${fmtShort(nextBlackout.start)}` : 'None scheduled',
      to: upcomingBlackouts.length ? '/calendar' : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Tag = s.to ? Link : 'div';
          return (
            <Tag
              key={s.label}
              {...(s.to ? { to: s.to } : {})}
              className={`group relative flex items-start gap-3.5 rounded-card border border-line bg-card p-5 shadow-card ${
                s.to ? 'transition-shadow duration-200 hover:shadow-lift' : ''
              }`}
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
                style={{ background: `color-mix(in oklch, ${s.tone} 12%, var(--c-card))`, color: s.tone }}
              >
                <s.icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[26px] font-bold leading-none tabular" style={{ color: s.tone }}>{s.value}</p>
                <p className="mt-1.5 text-[13px] font-semibold text-ink">{s.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-ink-mute">{s.context}</p>
              </div>
              {s.to && (
                <ArrowRight
                  size={15}
                  className="absolute right-4 top-4 text-ink-mute transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-ink"
                />
              )}
            </Tag>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEAMS.map((t) => {
          const members = teamMembers(t.id);
          const out = outOnDay(todayIso, t.id);
          return (
            <div key={t.id} className="rounded-card border border-line bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <span className="text-[11px] font-medium text-ink-mute">{members.length} people</span>
              </div>
              <p className="mt-2.5 text-[13px] text-ink-soft">
                <span className="text-lg font-bold tabular text-ink">{out.length}</span> out today
              </p>
            </div>
          );
        })}
      </div>

      {upcomingBlackouts.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-card border border-danger/30 bg-danger-soft px-4 py-3">
          <AlertOctagon size={16} className="mt-0.5 shrink-0 text-danger-ink" />
          <div className="text-sm">
            <p className="font-semibold text-ink">Upcoming blackout periods</p>
            <ul className="mt-0.5 space-y-0.5 text-ink-soft">
              {upcomingBlackouts.map((b) => (
                <li key={b.start}>{fmtShort(b.start)}–{fmtShort(b.end)}: {b.reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- shared ---- */
function Panel({ title, icon: Icon, action, compact, children }) {
  return (
    <section className="rounded-card border border-line bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon && <Icon size={15} className="text-ink-mute" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function activityText(r, ctx) {
  const type = ptoTypeById(r.type)?.name;
  const range = `${fmtShort(r.start)}${r.start !== r.end ? `–${fmtShort(r.end)}` : ''}`;
  if (r.status === 'approved') {
    const decider = ctx.users.find((u) => u.id === r.decidedBy);
    const by = decider && decider.id !== r.userId ? <> by {firstName(decider.name)}</> : null;
    return <>Your {type} request for {range} was approved{by}.</>;
  }
  if (r.status === 'denied') return <>Your {type} request for {range} was denied.</>;
  if (r.status === 'cancelled') return <>You cancelled your {type} request for {range}.</>;
  return <>You requested {type} for {range}. Awaiting approval.</>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
