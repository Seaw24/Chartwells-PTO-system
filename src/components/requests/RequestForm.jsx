// Design notes: One vertical flow, revealed step by step (type -> dates -> conflicts
//   -> note -> balance) so there's never a wall of fields. The balance card carries a
//   ProgressRing that fills live as the range grows (the only "wow" motion here, and
//   it's functional: it shows the cost of the request as you build it). Conflicts and
//   blackout windows inform, they don't block — matches the product's "never surprise".
// References: Charlie HR / Gusto request flows; the brief's live-balance-ring note.
import { useMemo, useState } from 'react';
import { AlertTriangle, Users, CalendarCheck } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import DateRangePicker from '../ui/DateRangePicker';
import ProgressRing from '../ui/ProgressRing';
import PtoTypePill from '../ui/PtoTypePill';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import { PTO_TYPES, DEFAULT_BALANCES, firstName } from '../../utils/constants';
import { businessDays, fmtRange } from '../../utils/dateHelpers';
import { validateRequest, conflictsFor, describeWindows } from '../../utils/policyEngine';
import { ptoTypeById } from '../../utils/constants';

export default function RequestForm({ prefill = {}, onSubmitted, onCancel }) {
  const {
    activeUser,
    activeUserId,
    todayIso,
    requests,
    requestsForUser,
    balanceFor,
    submitRequest,
    users,
  } = useDemoContext();
  const toast = useToast();

  const [type, setType] = useState(prefill.type || '');
  const [range, setRange] = useState({
    start: prefill.start || '',
    end: prefill.end || prefill.start || '',
  });
  const [note, setNote] = useState('');

  const ptoType = ptoTypeById(type);
  const balance = type ? balanceFor(activeUserId, type) : null;
  const draft = { type, start: range.start, end: range.end, note };

  const validation = useMemo(
    () =>
      validateRequest({
        draft,
        todayIso,
        balance,
        existingRequests: requestsForUser(activeUserId),
      }),
    [type, range.start, range.end, balance, todayIso] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const conflicts = useMemo(
    () =>
      conflictsFor({
        draft,
        requests,
        users,
        selfId: activeUserId,
        teamId: activeUser?.team ?? null,
      }),
    [range.start, range.end, requests] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const days = range.start && range.end ? businessDays(range.start, range.end) : 0;
  const canSubmit = type && range.start && range.end && validation.ok;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    submitRequest(draft);
    toast(`Request submitted for ${fmtRange(range.start, range.end)}.`, { kind: 'success' });
    onSubmitted?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Type selector */}
      <Field label="What kind of time off?">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PTO_TYPES.map((t) => {
            const active = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex flex-col items-start gap-1.5 rounded-card border p-3 text-left transition-all ${
                  active ? 'shadow-card ring-2' : 'border-line hover:border-ink-mute/40'
                }`}
                style={
                  active
                    ? { borderColor: t.color, '--tw-ring-color': `color-mix(in oklch, ${t.color} 35%, transparent)`, background: `color-mix(in oklch, ${t.color} 7%, var(--c-card))` }
                    : undefined
                }
              >
                <PtoTypeIcon typeId={t.id} size={20} strokeWidth={2} style={{ color: t.color }} />
                <span className="text-sm font-semibold text-ink">{t.name}</span>
              </button>
            );
          })}
        </div>
        {ptoType?.restrictedDates && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-btn bg-warning-soft px-3 py-2 text-xs font-medium text-ink-soft">
            <CalendarCheck size={14} className="mt-0.5 shrink-0 text-warning-ink" />
            {ptoType.name} is only available during: {describeWindows(type)}.
          </p>
        )}
      </Field>

      {/* 2. Dates */}
      {type && (
        <Field label="Which dates?" hint={ptoType?.id === 'sick' ? 'Sick leave can be backdated to yesterday.' : undefined}>
          <DateRangePicker
            value={range}
            onChange={setRange}
            typeId={type}
            todayIso={todayIso}
            allowPast={type === 'sick'}
          />
          {range.start && range.end && (
            <div className="mt-2 flex items-center justify-between rounded-btn bg-panel px-3 py-2 text-sm">
              <span className="font-medium text-ink-soft">{fmtRange(range.start, range.end)}</span>
              <span className="font-bold text-ink tabular">
                {days} business day{days === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </Field>
      )}

      {/* 3. Conflict awareness */}
      {conflicts.length > 0 && (
        <div className="rounded-card border border-warning/40 bg-warning-soft px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users size={15} className="text-warning-ink" />
            {conflicts.length} teammate{conflicts.length === 1 ? ' is' : 's are'} also off then
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-ink-soft">
            {conflicts.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span className="font-medium text-ink">{c.user.name}</span>
                <PtoTypePill typeId={c.type} size="xs" showIcon={false} />
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-ink-mute">Heads up only. This won't block your request.</p>
        </div>
      )}

      {/* 4. Notes */}
      {type && (
        <Field
          label="Notes"
          hint={type === 'bereavement' ? "You may include any details you'd like to share (optional)." : 'Optional.'}
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add context for your approver…"
            className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
          />
        </Field>
      )}

      {/* 5. Balance check — ring fills live as the range grows */}
      {type && range.start && range.end && balance != null && (() => {
        const total = DEFAULT_BALANCES[type];
        const used = total - balance;
        const after = validation.remainingAfter;
        const over = after < 0;
        return (
          <div
            className={`flex items-center gap-4 rounded-card border px-4 py-3 text-sm ${
              over ? 'border-danger/40 bg-danger-soft' : 'border-line bg-panel'
            }`}
          >
            <ProgressRing
              value={Math.min(used + days, total)}
              max={total}
              size={52}
              stroke={5}
              color={over ? 'var(--c-danger)' : ptoType.color}
            >
              <span className="font-mono text-sm font-semibold tabular text-ink">{Math.max(after, 0)}</span>
            </ProgressRing>
            {over ? (
              <span className="font-semibold text-danger-ink">
                Not enough balance: {days} requested, only {balance} {ptoType.name.toLowerCase()} left.
              </span>
            ) : (
              <span className="text-ink-soft">
                Uses <b className="text-ink">{days}</b> of your <b className="text-ink">{balance}</b> remaining {ptoType.name.toLowerCase()} day{balance === 1 ? '' : 's'}.{' '}
                <b className="text-ink">{after}</b> left after.
              </span>
            )}
          </div>
        );
      })()}

      {/* validation errors (non-balance) */}
      {validation.errors.length > 0 && range.start && (
        <ul className="space-y-1">
          {validation.errors
            .filter((e) => !e.startsWith('Not enough') && !e.startsWith('Pick') && !e.startsWith('Choose'))
            .map((err) => (
              <li key={err} className="flex items-start gap-1.5 text-xs font-medium text-danger-ink">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {err}
              </li>
            ))}
        </ul>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          Submit request
        </Button>
      </div>
      <p className="text-center text-[11px] text-ink-mute">
        Submitting as {firstName(activeUser?.name)}. Approvers on your team will be notified.
      </p>
    </form>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-semibold text-ink">{label}</label>
        {hint && <span className="text-[11px] text-ink-mute">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
