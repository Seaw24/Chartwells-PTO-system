// Design notes: Still one vertical flow, but each request can now carry several PTO
//   lines. Completed lines collapse into small summaries so adding a line feels like
//   adding one more thought, not filling out a table.
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, Edit3, Plus, Trash2, Users } from 'lucide-react';
import { useDataSource } from '../../data/dataSource';
import { useCurrentUser } from '../../data/session';
import { useToday } from '../../data/today';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import DateRangePicker from '../ui/DateRangePicker';
import ProgressRing from '../ui/ProgressRing';
import PtoTypePill from '../ui/PtoTypePill';
import PtoTypeIcon from '../ui/PtoTypeIcon';
import { PTO_TYPES, firstName, ptoTypeById } from '../../utils/constants';
import { fmtRange } from '../../utils/dateHelpers';
import { validateRequest, conflictsFor, describeWindows } from '../../utils/policyEngine';
import { lineDays } from '../../utils/requestHelpers';

const emptyLine = (prefill = {}) => ({
  type: prefill.type || '',
  start: prefill.start || '',
  end: prefill.end || prefill.start || '',
});

export default function RequestForm({ prefill = {}, onSubmitted, onCancel }) {
  const activeUser = useCurrentUser();
  const activeUserId = activeUser.id;
  const todayIso = useToday();
  const {
    getRequests,
    requestsForUser,
    balanceFor,
    grantFor,
    normalDaysOffFor,
    submitRequest,
    getUsers,
  } = useDataSource();
  const toast = useToast();

  const [lines, setLines] = useState(() => [emptyLine(prefill)]);
  const [activeLine, setActiveLine] = useState(0);
  const [note, setNote] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getRequests(),
      getUsers(),
      requestsForUser(activeUserId),
      Promise.all(PTO_TYPES.map((t) => balanceFor(activeUserId, t.id))),
      Promise.all(PTO_TYPES.map((t) => grantFor(activeUserId, t.id))),
      normalDaysOffFor(activeUserId),
    ]).then(([requests, users, existingRequests, balanceList, grantList, normalDaysOff]) => {
      if (!alive) return;
      const balances = {};
      const grants = {};
      PTO_TYPES.forEach((t, i) => {
        balances[t.id] = balanceList[i];
        grants[t.id] = grantList[i];
      });
      setData({ requests, users, existingRequests, balances, grants, normalDaysOff });
    });
    return () => { alive = false; };
  }, [activeUserId]);

  const requests = data?.requests ?? [];
  const users = data?.users ?? [];
  const existingRequests = data?.existingRequests ?? [];
  const balances = data?.balances ?? {};
  const grants = data?.grants ?? {};
  const normalDaysOff = data?.normalDaysOff ?? [0, 6];
  const draft = { lines, note };

  const validation = useMemo(
    () =>
      validateRequest({
        draft,
        todayIso,
        balances,
        normalDaysOff,
        existingRequests,
      }),
    [lines, balances, normalDaysOff, todayIso, existingRequests] // eslint-disable-line react-hooks/exhaustive-deps
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
    [lines, requests, users, activeUserId, activeUser?.team] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const allLinesComplete = lines.every((line) => line.type && line.start && line.end);
  const canSubmit = allLinesComplete && validation.ok;
  const usedTypes = PTO_TYPES.filter((t) => lines.some((line) => line.type === t.id));

  if (data === null) return null;

  const updateLine = (index, patch) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index) => {
    setLines((current) => {
      if (current.length === 1) return current;
      const next = current.filter((_, i) => i !== index);
      setActiveLine(Math.max(0, Math.min(index, next.length - 1)));
      return next;
    });
  };

  const addLine = () => {
    setLines((current) => {
      const next = [...current, emptyLine()];
      setActiveLine(next.length - 1);
      return next;
    });
  };

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    submitRequest(draft).then(() => {
      const message = lines.length === 1
        ? `Request submitted for ${fmtRange(lines[0].start, lines[0].end)}.`
        : `Request submitted with ${lines.length} PTO lines.`;
      toast(message, { kind: 'success' });
      onSubmitted?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Build your request">
        <div className="space-y-3">
          {lines.map((line, index) => {
            const complete = line.type && line.start && line.end;
            const editing = activeLine === index || !complete;
            const errors = validation.lineResults.find((r) => r.index === index)?.errors ?? [];

            return editing ? (
              <LineEditor
                key={index}
                line={line}
                index={index}
                count={lines.length}
                errors={errors}
                normalDaysOff={normalDaysOff}
                todayIso={todayIso}
                onChange={(patch) => updateLine(index, patch)}
                onRemove={() => removeLine(index)}
              />
            ) : (
              <LineSummary
                key={index}
                line={line}
                index={index}
                normalDaysOff={normalDaysOff}
                onEdit={() => setActiveLine(index)}
                onRemove={() => removeLine(index)}
                canRemove={lines.length > 1}
              />
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus size={15} /> Add another line
          </Button>
        </div>
      </Field>

      {conflicts.length > 0 && (
        <div className="rounded-card border border-warning/40 bg-warning-soft px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Users size={15} className="text-warning-ink" />
            {conflicts.length} teammate{conflicts.length === 1 ? ' is' : 's are'} also off then
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-ink-soft">
            {conflicts.map((c) => (
              <li key={c.lineKey || c.id} className="flex items-center gap-1.5">
                <span className="font-medium text-ink">{c.user.name}</span>
                <PtoTypePill typeId={c.type} size="xs" showIcon={false} />
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-ink-mute">Heads up only. This won't block your request.</p>
        </div>
      )}

      {lines.some((line) => line.type) && (
        <Field
          label="Notes"
          hint={lines.some((line) => line.type === 'bereavement') ? "Share anything you'd like your approver to know (optional)." : 'Optional.'}
        >
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add context for your approver..."
            className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
          />
        </Field>
      )}

      {usedTypes.length > 0 && (
        <div className="space-y-2">
          {usedTypes.map((type) => {
            const requested = validation.daysByType[type.id] || 0;
            const total = grants[type.id] ?? type.defaultDays;
            const balance = balances[type.id] ?? 0;
            const used = total - balance;
            const after = balance - requested;
            const over = requested > balance;
            return (
              <div
                key={type.id}
                className={`flex items-center gap-4 rounded-card border px-4 py-3 text-sm ${
                  over ? 'border-danger/40 bg-danger-soft' : 'border-line bg-panel'
                }`}
              >
                <ProgressRing
                  value={Math.min(used + requested, total)}
                  max={total}
                  size={52}
                  stroke={5}
                  color={over ? 'var(--c-danger)' : type.color}
                >
                  <span className="font-mono text-sm font-semibold tabular text-ink">{Math.max(after, 0)}</span>
                </ProgressRing>
                {over ? (
                  <span className="font-semibold text-danger-ink">
                    {type.name} is short: {requested} requested, {balance} left.
                  </span>
                ) : (
                  <span className="text-ink-soft">
                    <b className="text-ink">{type.name}</b> uses <b className="text-ink">{requested}</b> of <b className="text-ink">{balance}</b> remaining.{' '}
                    <b className="text-ink">{after}</b> left after.
                  </span>
                )}
              </div>
            );
          })}
        </div>
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
        Submitting as {firstName(activeUser?.name)}. The right approvers will be notified.
      </p>
    </form>
  );
}

function LineEditor({ line, index, count, errors, normalDaysOff, todayIso, onChange, onRemove }) {
  const ptoType = ptoTypeById(line.type);
  const days = line.type && line.start && line.end ? lineDays(line, normalDaysOff) : 0;

  return (
    <div className="rounded-card border border-line bg-card px-3 py-3 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">Line {index + 1}</p>
        {count > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="grid h-8 w-8 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-danger-ink"
            aria-label={`Remove line ${index + 1}`}
            title="Remove line"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PTO_TYPES.map((t) => {
          const active = t.id === line.type;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ type: t.id })}
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
          {ptoType.name} is only available during: {describeWindows(line.type)}.
        </p>
      )}

      {line.type && (
        <div className="mt-4">
          <DateRangePicker
            value={{ start: line.start, end: line.end }}
            onChange={(range) => onChange(range)}
            typeId={line.type}
            todayIso={todayIso}
            allowPast={line.type === 'sick'}
          />
          {line.start && line.end && (
            <div className="mt-2 flex items-center justify-between rounded-btn bg-panel px-3 py-2 text-sm">
              <span className="font-medium text-ink-soft">{fmtRange(line.start, line.end)}</span>
              <span className="font-bold text-ink tabular">
                {days} charged day{days === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {errors.map((err) => (
            <li key={err} className="flex items-start gap-1.5 text-xs font-medium text-danger-ink">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LineSummary({ line, index, normalDaysOff, onEdit, onRemove, canRemove }) {
  const type = ptoTypeById(line.type);
  const days = lineDays(line, normalDaysOff);

  return (
    <div className="flex items-center gap-2 rounded-card border border-line bg-card px-3 py-2 shadow-card">
      <PtoTypePill typeId={line.type} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{fmtRange(line.start, line.end)}</p>
        <p className="text-[11px] text-ink-mute">
          {days} charged day{days === 1 ? '' : 's'} {type ? `of ${type.name.toLowerCase()}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="grid h-8 w-8 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-ink"
        aria-label={`Edit line ${index + 1}`}
        title="Edit line"
      >
        <Edit3 size={14} />
      </button>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-danger-ink"
          aria-label={`Remove line ${index + 1}`}
          title="Remove line"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
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
