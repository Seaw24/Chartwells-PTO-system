import { useResource } from "../../hooks/useResource.jsx";
import { useCurrentUser } from "../../context/AuthContext.jsx";
import { useToday } from "../../data/today.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useBumpVersion } from "../../context/DataVersionContext.jsx";
import React from "react";
import { validateDraft } from "../../utils/policyEngine.jsx";
import { formatDateRange } from "../../utils/dateHelpers.jsx";
import { Plus as Vendor_Plus } from "lucide-react";
import { firstName } from "../../utils/constants.jsx";
import { Button } from "../ui/Button.jsx";
import { lineDays } from "../../utils/requestHelpers.jsx";
import { bookedDaysByDate } from "../../utils/requestHelpers.jsx";
import { findOverlap } from "../../utils/policyEngine.jsx";
import { findTeamConflicts } from "../../utils/policyEngine.jsx";
import { Trash2 as Vendor_Trash2 } from "lucide-react";
import { DateRangePicker } from "../ui/DateRangePicker.jsx";
import { TriangleAlert as Vendor_TriangleAlert } from "lucide-react";
import { overlapMessage } from "../../utils/policyEngine.jsx";
import { windowLabel } from "../../utils/policyEngine.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { PtoTypeIcon } from "../ui/PtoTypeIcon.jsx";
import { Check as Vendor_Check } from "lucide-react";
export const normalizeDraftLine = (e = {}) => ({
  type: e.type || "",
  start: e.start || "",
  end: e.end || e.start || "",
});
export function RequestForm({
  prefill = {},
  onSubmitted: onSubmitted,
  onCancel: onCancel,
}) {
  const r = useCurrentUser(),
    s = r.id,
    i = useToday(),
    {
      getRequests: getRequests,
      requestsForUser: requestsForUser,
      balanceFor: balanceFor,
      grantFor: grantFor,
      normalDaysOffFor: normalDaysOffFor,
      submitRequest: submitRequest,
      coverageForRange: coverageForRange,
    } = useDataSource(),
    {
      users: users,
      teams: teams,
      ptoTypes: ptoTypes,
      holidays: holidays,
      blackouts: blackouts,
      dateRules: dateRules,
    } = useCatalog(),
    x = useToast(),
    b = useBumpVersion(),
    [N, _] = React.useState(() => [normalizeDraftLine(prefill)]),
    [j, S] = React.useState(0),
    [R, E] = React.useState(""),
    D = React.useMemo(() => {
      const Y = N.filter((ee) => ee.start && ee.end);
      return Y.length
        ? {
            start: Y.map((ee) => ee.start).sort()[0],
            end: Y.map((ee) => ee.end)
              .sort()
              .at(-1),
          }
        : null;
    }, [N]);
  const { data: H = [] } = useResource(
    ["request-coverage", D?.start, D?.end],
    () => coverageForRange(D.start, D.end),
    !!D,
  );
  const { data: T = null } = useResource(
    ["request-form", s, ptoTypes.map((type) => type.id)],
    async () => {
      const [requests, existingRequests, normalDaysOff, rows] =
        await Promise.all([
          getRequests(),
          requestsForUser(s),
          normalDaysOffFor(s),
          Promise.all(
            ptoTypes.map(async (type) => ({
              type: type.id,
              balance: await balanceFor(s, type.id),
              grant: await grantFor(s, type.id),
            })),
          ),
        ]);
      return {
        requests,
        users,
        existingRequests,
        normalDaysOff,
        balances: Object.fromEntries(
          rows.map((row) => [row.type, row.balance]),
        ),
        grants: Object.fromEntries(rows.map((row) => [row.type, row.grant])),
      };
    },
    true,
  );
  (void 0, void 0);
  const q = (T == null ? void 0 : T.requests) ?? [],
    Z = (T == null ? void 0 : T.existingRequests) ?? [],
    P = (T == null ? void 0 : T.balances) ?? {},
    $ = (T == null ? void 0 : T.grants) ?? {},
    U = (T == null ? void 0 : T.normalDaysOff) ?? [0, 6],
    X = {
      lines: N,
      note: R,
    },
    V = React.useMemo(
      () =>
        validateDraft({
          draft: X,
          todayIso: i,
          balances: P,
          normalDaysOff: U,
          existingRequests: Z,
          ptoTypes: ptoTypes,
          dateRules: dateRules,
          blackouts: blackouts,
          holidays: holidays,
        }),
      [N, P, U, i, Z, ptoTypes, dateRules, blackouts, holidays],
    ),
    he = N.every((Y) => Y.type && Y.start && Y.end),
    K = he && V.ok,
    A = V.days || 0;
  if (T === null) return null;
  const B = (Y, ee) => {
      _((Pe) =>
        Pe.map((ve, _e) =>
          _e === Y
            ? {
                ...ve,
                ...ee,
              }
            : ve,
        ),
      );
    },
    ae = (Y) => {
      _((ee) => {
        if (ee.length === 1) return ee;
        const Pe = ee.filter((ve, _e) => _e !== Y);
        return (S(Math.max(0, Math.min(Y, Pe.length - 1))), Pe);
      });
    },
    fe = () => {
      _((Y) => {
        const ee = [...Y, normalizeDraftLine()];
        return (S(ee.length - 1), ee);
      });
    };
  function ye(Y) {
    (Y.preventDefault(),
      K &&
        submitRequest(X).then(() => {
          b();
          const ee =
            N.length === 1
              ? `Request submitted for ${formatDateRange(N[0].start, N[0].end)}.`
              : `Request submitted with ${N.length} PTO lines.`;
          (x(ee, {
            kind: "success",
          }),
            onSubmitted == null || onSubmitted());
        }));
  }
  const Q = {
    todayIso: i,
    balances: P,
    grants: $,
    normalDaysOff: U,
    existingRequests: Z,
    requests: q,
    users: users,
    teams: teams,
    coverageRows: H,
    ptoTypes: ptoTypes,
    dateRules: dateRules,
    blackouts: blackouts,
    holidays: holidays,
    selfId: s,
    teamId: (r == null ? void 0 : r.team) ?? null,
  };
  return (
    <form onSubmit={ye} className="space-y-5">
      <div className="space-y-3">
        {N.map((Y, ee) => {
          const Pe = Y.type && Y.start && Y.end;
          return j === ee || !Pe ? (
            <RequestLineEditor
              line={Y}
              index={ee}
              lines={N}
              count={N.length}
              ctx={Q}
              onFocusLine={() => S(ee)}
              onChange={(_e) => B(ee, _e)}
              onRemove={() => ae(ee)}
              key={ee}
            />
          ) : (
            <RequestLineSummary
              line={Y}
              index={ee}
              normalDaysOff={U}
              onEdit={() => S(ee)}
              onRemove={() => ae(ee)}
              canRemove={N.length > 1}
              key={ee}
            />
          );
        })}
        {he && (
          <button
            type="button"
            onClick={fe}
            className="press flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line py-2.5 text-sm font-semibold text-ink-soft hover:border-ink-mute/50 hover:bg-panel hover:text-ink"
          >
            <Vendor_Plus size={15} />
            {" Add another type"}
          </button>
        )}
      </div>
      {N.some((Y) => Y.type && Y.start && Y.end) && (
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="eyebrow">{"Note for your approver"}</h3>
            <span className="text-[11px] text-ink-mute">{"Optional"}</span>
          </div>
          <textarea
            value={R}
            onChange={(Y) => E(Y.target.value)}
            rows={2}
            placeholder="Add context for your approver..."
            className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
          />
        </section>
      )}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="min-w-0 text-sm">
          {A > 0 ? (
            <span className="text-ink-soft">
              <span className="font-bold tabular text-ink">{A}</span>
              {" day"}
              {A === 1 ? "" : "s"}
              {" off,"}{" "}
              <span className="text-ink-mute">
                {"as "}
                {firstName(r == null ? void 0 : r.name)}
              </span>
            </span>
          ) : (
            <span className="text-ink-mute">{"Pick your dates to start"}</span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {"Cancel"}
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={!K}>
            {"Submit request"}
          </Button>
        </div>
      </div>
    </form>
  );
}
export function RequestLineEditor({
  line: line,
  index: index,
  lines: lines,
  count: count,
  ctx: ctx,
  onChange: onChange,
  onRemove: onRemove,
  onFocusLine: onFocusLine,
}) {
  const {
      todayIso: todayIso,
      balances: balances,
      grants: grants,
      normalDaysOff: normalDaysOff,
      existingRequests: existingRequests,
      requests: requests,
      users: users,
      teams: teams,
      coverageRows: coverageRows,
      ptoTypes: ptoTypes,
      dateRules: dateRules,
      blackouts: blackouts,
      holidays: holidays,
      selfId: selfId,
      teamId: teamId,
    } = ctx,
    j = !!(line.start && line.end),
    S = j ? lineDays(line, normalDaysOff, holidays) : 0,
    R = React.useMemo(() => {
      var $;
      if (!j) return {};
      const P = {};
      for (const U of ptoTypes) {
        const X = lines.map((K, A) =>
            A === index
              ? {
                  ...K,
                  type: U.id,
                }
              : K,
          ),
          he =
            (($ = validateDraft({
              draft: {
                lines: X,
              },
              todayIso: todayIso,
              balances: balances,
              normalDaysOff: normalDaysOff,
              existingRequests: existingRequests,
              ptoTypes: ptoTypes,
              dateRules: dateRules,
              blackouts: blackouts,
              holidays: holidays,
            }).lineResults.find((K) => K.index === index)) == null
              ? void 0
              : $.errors) ?? [];
        P[U.id] = {
          ok: he.length === 0,
          reason: he[0] || "",
        };
      }
      return P;
    }, [
      lines,
      index,
      j,
      todayIso,
      balances,
      normalDaysOff,
      existingRequests,
      ptoTypes,
      dateRules,
      blackouts,
      holidays,
    ]),
    E = React.useMemo(
      () => bookedDaysByDate(existingRequests),
      [existingRequests],
    ),
    T = j ? findOverlap(line.start, line.end, existingRequests) : null,
    C = React.useMemo(
      () =>
        j
          ? findTeamConflicts({
              draft: {
                lines: [
                  {
                    ...line,
                  },
                ],
              },
              requests: requests,
              users: users,
              selfId: selfId,
              teamId: teamId,
            })
          : [],
      [line.start, line.end, requests, users, selfId, teamId],
    ),
    H = React.useMemo(
      () =>
        j
          ? coverageRows
              .filter(
                ($) =>
                  $.day >= line.start &&
                  $.day <= line.end &&
                  (!teamId || $.teamId === teamId),
              )
              .reduce(($, U) => (!$ || U.outCount > $.outCount ? U : $), null)
          : null,
      [coverageRows, j, line.start, line.end, teamId],
    ),
    I = line.type ? R[line.type] : null,
    D = !!(line.type && I && !I.ok),
    q =
      j &&
      ptoTypes.find(
        (P) =>
          P.restrictedDates &&
          R[P.id] &&
          !R[P.id].ok &&
          /only available during/i.test(R[P.id].reason),
      ),
    Z = j && ptoTypes.every((P) => R[P.id] && !R[P.id].ok);
  return (
    <div
      className="rounded-card border border-line bg-card p-3 shadow-card sm:p-4"
      onFocusCapture={onFocusLine}
    >
      {count > 1 && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="eyebrow">
            {"Time off "}
            {index + 1}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="grid h-8 w-8 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-danger-ink"
            aria-label={`Remove time off ${index + 1}`}
            title="Remove"
          >
            <Vendor_Trash2 size={15} />
          </button>
        </div>
      )}
      <section>
        <h3 className="eyebrow mb-2.5">{"When are you off?"}</h3>
        <DateRangePicker
          value={{
            start: line.start,
            end: line.end,
          }}
          onChange={onChange}
          typeId={null}
          todayIso={todayIso}
          bookedDays={E}
        />
        {j && (
          <div className="mt-2 flex items-center justify-between rounded-btn bg-panel px-3 py-2 text-sm">
            <span className="font-medium text-ink-soft">
              {formatDateRange(line.start, line.end)}
            </span>
            <span className="font-bold tabular text-ink">
              {S}
              {" charged day"}
              {S === 1 ? "" : "s"}
            </span>
          </div>
        )}
        {T && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-snug text-danger-ink">
            <Vendor_TriangleAlert size={13} className="mt-0.5 shrink-0" />
            {overlapMessage(T)}
          </p>
        )}
      </section>
      {j && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {(H == null ? void 0 : H.outCount) > 0 && (
            <CoverageWarning
              row={H}
              team={teams.find((P) => P.id === H.teamId)}
            />
          )}
          {C.length > 0 && <ConflictWarning conflicts={C} />}
          <section>
            <h3 className="eyebrow mb-2.5">{"What type of time off?"}</h3>
            <div className="space-y-2">
              {ptoTypes.map((P) => (
                <TypeOption
                  type={P}
                  remaining={balances[P.id] ?? 0}
                  total={grants[P.id] ?? P.defaultDays}
                  charged={S}
                  info={R[P.id]}
                  selected={line.type === P.id}
                  onSelect={() =>
                    onChange({
                      type: P.id,
                    })
                  }
                  key={P.id}
                />
              ))}
            </div>
            {T ? null : Z ? (
              <p className="mt-2 text-[11px] leading-snug text-ink-mute">
                {
                  "Nothing covers these dates right now. Try shortening or moving them with “Change dates” above."
                }
              </p>
            ) : q ? (
              <p className="mt-2 text-[11px] leading-snug text-ink-mute">
                {q.name}
                {" is only available "}
                {windowLabel(q.id, dateRules)}
                {". Change your dates to book it."}
              </p>
            ) : null}
          </section>
          {D && !T && (
            <p className="flex items-start gap-1.5 text-xs font-medium text-danger-ink">
              <Vendor_TriangleAlert size={13} className="mt-0.5 shrink-0" />
              {I.reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function CoverageWarning({ row: row, team: team }) {
  return (
    <div className="rounded-card border border-warning/40 bg-warning-soft px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Vendor_Users size={15} className="text-warning-ink" />
        {row.outCount}
        {" out, "}
        {row.onShiftCount}
        {" on shift"}
      </p>
      <p className="mt-1 text-[11px] text-ink-mute">
        {(team == null ? void 0 : team.name) ?? "Team"}
        {" on "}
        {row.day}
        {". Coverage is a heads up and will not block the request."}
      </p>
    </div>
  );
}
export function ConflictWarning({ conflicts: conflicts }) {
  return (
    <div className="rounded-card border border-warning/40 bg-warning-soft px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Vendor_Users size={15} className="text-warning-ink" />
        {conflicts.length}
        {" teammate"}
        {conflicts.length === 1 ? " is" : "s are"}
        {" also off then"}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        {conflicts.map((t) => (
          <li
            className="flex items-center gap-1.5 text-xs"
            key={t.lineKey || t.id}
          >
            <Avatar name={t.user.name} id={t.user.id} size="xs" />
            <span className="font-medium text-ink">
              {firstName(t.user.name)}
            </span>
            <PtoTypeIcon typeId={t.type} size={8} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-mute">
        {"Heads up only. This won’t block your request."}
      </p>
    </div>
  );
}
export function TypeOption({
  type: type,
  remaining: remaining,
  total: total,
  charged: charged,
  info: info,
  selected: selected,
  onSelect: onSelect,
}) {
  const c = (info == null ? void 0 : info.ok) ?? !0,
    l = remaining - charged,
    u = shortValidationMessage(info == null ? void 0 : info.reason, charged),
    h = !c && !selected,
    d = !c && selected,
    f = d
      ? {
          "--tw-ring-color":
            "color-mix(in oklch, var(--c-danger) 45%, transparent)",
        }
      : selected
        ? {
            "--tw-ring-color": `color-mix(in oklch, ${type.color} 42%, transparent)`,
            background: `color-mix(in oklch, ${type.color} 8%, var(--c-card))`,
            borderColor: `color-mix(in oklch, ${type.color} 40%, transparent)`,
          }
        : void 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={h}
      aria-pressed={selected}
      style={f}
      className={[
        "press flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left",
        d
          ? "border-danger/40 ring-2"
          : selected
            ? "ring-2 shadow-card"
            : "border-line",
        h
          ? "cursor-not-allowed opacity-60"
          : "hover:border-ink-mute/40 hover:bg-panel/60",
      ].join(" ")}
    >
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-btn"
        style={{
          background: `color-mix(in oklch, ${type.color} ${h ? 8 : 14}%, var(--c-card))`,
        }}
      >
        <PtoTypeIcon
          typeId={type.id}
          size={12}
          className={h ? "saturate-[0.4]" : ""}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {type.name}
        </span>
        {c ? (
          <span
            className="block text-[11px] font-medium tabular"
            style={{
              color: selected
                ? `color-mix(in oklch, ${type.color} 70%, var(--c-ink))`
                : "var(--c-ink-mute)",
            }}
          >
            {l}
            {" left after "}
            {charged}
            {" day"}
            {charged === 1 ? "" : "s"}
          </span>
        ) : (
          <span
            className={`block text-[11px] font-medium tabular ${d ? "text-danger-ink" : "text-ink-mute"}`}
          >
            {u}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-baseline gap-1">
        <span
          className={`text-[19px] font-bold leading-none tabular ${h ? "text-ink-mute/70" : "text-ink"}`}
        >
          {remaining}
        </span>
        <span className="text-[11px] font-medium text-ink-mute">
          {"/ "}
          {total}
        </span>
      </span>
      {selected && !d ? (
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
          style={{
            background: type.color,
          }}
        >
          <Vendor_Check size={13} strokeWidth={3} />
        </span>
      ) : (
        <span className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}
export function shortValidationMessage(e = "", t = 0) {
  return /balance is short/i.test(e)
    ? `Not enough for ${t} day${t === 1 ? "" : "s"}`
    : /only available during/i.test(e)
      ? "Not on these dates"
      : /past/i.test(e)
        ? "Can't be backdated"
        : /blackout/i.test(e)
          ? "Blackout period"
          : /already (approved|requested)/i.test(e)
            ? "Already off these dates"
            : /overlap/i.test(e)
              ? "Overlaps another request"
              : e || "Unavailable";
}
export function RequestLineSummary({
  line: line,
  index: index,
  normalDaysOff: normalDaysOff,
  onEdit: onEdit,
  onRemove: onRemove,
  canRemove: canRemove,
}) {
  const { ptoTypeById: ptoTypeById, holidays: holidays } = useCatalog(),
    l = ptoTypeById(line.type),
    u = lineDays(line, normalDaysOff, holidays);
  return (
    <div className="lift flex items-center gap-2.5 rounded-card border border-line bg-card px-3 py-2.5 shadow-card">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        title={`Edit time off ${index + 1}`}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-btn"
          style={{
            background: `color-mix(in oklch, ${l == null ? void 0 : l.color} 14%, var(--c-card))`,
          }}
        >
          <PtoTypeIcon typeId={line.type} size={12} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {formatDateRange(line.start, line.end)}
          </span>
          <span className="block text-[11px] text-ink-mute tabular">
            {u}
            {" charged day"}
            {u === 1 ? "" : "s"} {l ? `of ${l.name.toLowerCase()}` : ""}
          </span>
        </span>
      </button>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-danger-ink"
          aria-label={`Remove time off ${index + 1}`}
          title="Remove"
        >
          <Vendor_Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
