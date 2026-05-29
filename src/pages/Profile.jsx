// Design notes: A header card (navy banner + overlapping avatar) over a three-up info
//   strip, then balances and full history. Mirrors the team EmployeeProfile vocabulary so
//   "me" and "a teammate" read identically. One primary action: request time off.
// References: Deel/BambooHR profile headers; consistent component vocabulary.
import { Mail, Users2, ShieldCheck, CalendarPlus } from 'lucide-react';
import { useDemoContext } from '../hooks/useDemoContext';
import { useRequestModal } from '../components/requests/RequestModalProvider';
import { teamById, ROLES, ptoTypeById } from '../utils/constants';
import { fmtRange, businessDays } from '../utils/dateHelpers';
import Avatar from '../components/ui/Avatar';
import RolePill from '../components/ui/RolePill';
import StatusChip from '../components/ui/StatusChip';
import Button from '../components/ui/Button';
import BalanceCards from '../components/requests/BalanceCards';
import PtoTypeIcon from '../components/ui/PtoTypeIcon';
import EmptyState from '../components/ui/EmptyState';
import { CalendarX } from 'lucide-react';

export default function Profile() {
  const { activeUser, requestsForUser } = useDemoContext();
  const { openRequest } = useRequestModal();
  const history = requestsForUser(activeUser.id);
  const ytd = history.filter((r) => r.status === 'approved').reduce((s, r) => s + businessDays(r.start, r.end), 0);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
        <div className="h-20 bg-navy" />
        <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar name={activeUser.name} id={activeUser.id} size="lg" className="-mt-8 ring-4 ring-card" />
            <div>
              <h2 className="text-xl font-bold text-ink">{activeUser.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <RolePill role={activeUser.role} size="xs" />
              </div>
            </div>
          </div>
          <Button variant="primary" onClick={() => openRequest()}>
            <CalendarPlus size={17} /> Request Time Off
          </Button>
        </div>
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
          <Info icon={Mail} label="Email" value={activeUser.email} />
          <Info icon={Users2} label="Team" value={teamById(activeUser.team)?.name || 'All teams'} />
          <Info icon={ShieldCheck} label="Days taken (YTD)" value={`${ytd} days`} />
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Your balances</h3>
        <BalanceCards userId={activeUser.id} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Request history</h3>
        {history.length === 0 ? (
          <EmptyState icon={CalendarX} title="No requests yet" description="Your time-off history will show up here." />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
            <ul className="divide-y divide-line-soft">
              {history.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-btn"
                    style={{ background: `color-mix(in oklch, ${ptoTypeById(r.type)?.color} 12%, var(--c-card))`, color: ptoTypeById(r.type)?.color }}
                  >
                    <PtoTypeIcon typeId={r.type} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{ptoTypeById(r.type)?.name}</p>
                    <p className="text-xs text-ink-mute">{fmtRange(r.start, r.end)}</p>
                  </div>
                  <span className="text-xs text-ink-mute tabular">{businessDays(r.start, r.end)}d</span>
                  <StatusChip status={r.status} size="xs" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-card px-6 py-4">
      <span className="grid h-9 w-9 place-items-center rounded-btn bg-panel text-ink-soft">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
