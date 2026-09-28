import React from "react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useToday } from "../../data/today.jsx";
import { useResource } from "../../hooks/useResource.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Button } from "../ui/Button.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { friendlyError } from "../../utils/errors.jsx";
import { requestLines } from "../../utils/requestHelpers.jsx";
import {
  MONTH_NAMES,
  daysInResetMonth,
  leaveYearEnd,
  leaveYearFor,
  leaveYearStart,
  nextOccurrence,
  nextReset,
  resetDayLabel,
  shortDate,
} from "../../utils/leaveYear.jsx";

// Settings > Leave Years (HR only): when each type's yearly allowance resets. Holiday Day Off has
// no yearly allowance (one day per holiday), so it is not listed.
const fieldClass =
  "w-full cursor-pointer rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink transition-colors focus:border-accent focus:outline-none";
const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 864e5,
  );
const inDays = (n) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);
const dayBefore = (dayIso) => {
  const d = new Date(`${dayIso}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export function LeaveYearSettings() {
  const { ptoTypes } = useCatalog(),
    today = useToday(),
    { getRequests, setLeaveReset } = useDataSource(),
    toast = useToast(),
    [editing, setEditing] = React.useState(null),
    types = ptoTypes.filter((t) => t.isActive !== false && !t.isHolidayDayOff),
    // Only used to say how many booked requests a change would move between leave years.
    { data: requests = [] } = useResource(["leave-years-requests"], () =>
      getRequests(),
    );
  const save = async (type, rule) => {
    try {
      await setLeaveReset(type.id, rule);
      toast(
        `${type.name} now resets every ${MONTH_NAMES[rule.month - 1]} ${rule.day}, starting ${shortDate(rule.firstReset)}.`,
      );
      setEditing(null);
    } catch (error) {
      toast(friendlyError(error, "That change could not be saved."), {
        kind: "error",
      });
    }
  };
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-ink">{"Leave Years"}</h3>
        <p className="text-sm text-ink-mute">
          {
            "When each type’s yearly allowance resets. People can use the full allowance from the first day of the year; unused days don’t carry over."
          }
        </p>
      </div>
      <ul className="space-y-2.5">
        {types.map((type) => (
          <LeaveYearRow
            type={type}
            today={today}
            requests={requests}
            editing={editing === type.id}
            onEdit={() => setEditing(type.id)}
            onCancel={() => setEditing(null)}
            onSave={(rule) => save(type, rule)}
            key={type.id}
          />
        ))}
      </ul>
      <div className="rounded-card bg-panel px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <p className="mb-1 font-semibold text-ink">{"How the reset works"}</p>
        <ul className="space-y-0.5" style={{ listStyle: "disc", paddingLeft: "1rem" }}>
          <li>{"On the reset day everyone starts again with a full allowance."}</li>
          <li>
            {
              "Each person keeps last year’s amount, including one set just for them. Change next year’s amounts under People."
            }
          </li>
          <li>
            {
              "Time off that crosses a reset day is split: each day counts against the year it falls in."
            }
          </li>
          <li>{"Extra Wellness Days are for one year only and don’t carry over."}</li>
        </ul>
      </div>
    </div>
  );
}

function LeaveYearRow({
  type,
  today,
  requests,
  editing,
  onEdit,
  onCancel,
  onSave,
}) {
  const year = leaveYearFor(type, today),
    start = leaveYearStart(type, year),
    end = leaveYearEnd(type, year),
    reset = nextReset(type, today),
    pending = type.firstReset && type.firstReset > today;
  return (
    <li className="rounded-card border border-line bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-1.5">
          <PtoTypeIcon typeId={type.id} color={type.color} size={10} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{type.name}</p>
          <p className="text-xs text-ink-soft">
            {`Resets every ${resetDayLabel(type)}`}
            {pending && `, starting ${shortDate(type.firstReset)}`}
          </p>
          <p className="mt-1.5 text-[11px] text-ink-mute">
            {`This year: ${shortDate(start)} – ${shortDate(end)} · next reset ${shortDate(reset)}, ${inDays(daysBetween(today, reset))}`}
          </p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            {"Change"}
          </Button>
        )}
      </div>
      {editing && (
        <ResetEditor
          type={type}
          today={today}
          requests={requests}
          onCancel={onCancel}
          onSave={onSave}
        />
      )}
    </li>
  );
}

function ResetEditor({ type, today, requests, onCancel, onSave }) {
  const [month, setMonth] = React.useState(type.resetMonth ?? 1),
    [day, setDay] = React.useState(type.resetDay ?? 1),
    [saving, setSaving] = React.useState(false),
    // A new rule starts on a future reset day: the next one, or the one a year later.
    first = nextOccurrence(month, Math.min(day, daysInResetMonth(month)), today),
    options = [first, `${Number(first.slice(0, 4)) + 1}${first.slice(4)}`],
    [firstReset, setFirstReset] = React.useState(
      type.firstReset && type.firstReset > today ? type.firstReset : options[0],
    ),
    chosen = options.includes(firstReset) ? firstReset : options[0],
    next = { ...type, resetMonth: month, resetDay: day, firstReset: chosen },
    // Booked time off that would count against a different leave year after the change.
    moved = React.useMemo(
      () =>
        requests
          .filter((r) => r.status === "approved" || r.status === "pending")
          .filter((r) =>
            requestLines(r).some(
              (l) =>
                l.type === type.id &&
                l.start &&
                leaveYearFor(type, l.start) !== leaveYearFor(next, l.start),
            ),
          ).length,
      [requests, type, month, day, chosen],
    );
  React.useEffect(() => {
    day > daysInResetMonth(month) && setDay(daysInResetMonth(month));
  }, [month, day]);
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
            {"Month"}
          </span>
          <select
            className={fieldClass}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option value={i + 1} key={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
            {"Day"}
          </span>
          <select
            className={fieldClass}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {Array.from({ length: daysInResetMonth(month) }, (_, i) => (
              <option value={i + 1} key={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
            {"First reset"}
          </span>
          <select
            className={fieldClass}
            value={chosen}
            onChange={(e) => setFirstReset(e.target.value)}
          >
            {options.map((d) => (
              <option value={d} key={d}>
                {`${shortDate(d)} (${inDays(daysBetween(today, d))})`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="rounded-btn bg-accent-soft px-3 py-2 text-xs leading-relaxed text-ink">
        {`The current ${type.name} year runs until ${shortDate(dayBefore(chosen))}. From ${shortDate(chosen)}, it resets every ${MONTH_NAMES[month - 1]} ${day}.`}
        {moved > 0 &&
          ` ${moved} booked request${moved === 1 ? "" : "s"} will count against a different leave year.`}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {"Cancel"}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({ month, day, firstReset: chosen });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
