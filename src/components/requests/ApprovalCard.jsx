import { useCatalog } from "../../context/CatalogContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useToday } from "../../data/today.jsx";
import React from "react";
import { requestTypeIds } from "../../utils/requestHelpers.jsx";
import { requestLines } from "../../utils/requestHelpers.jsx";
import { requestDays } from "../../utils/requestHelpers.jsx";
import { findTeamConflicts } from "../../utils/policyEngine.jsx";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { toDateLocal } from "../../utils/dateHelpers.jsx";
import { requestTypeLabel } from "../../utils/requestHelpers.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { UserTeams } from "../../utils/organization.jsx";
import { timeAgo } from "../../utils/dateHelpers.jsx";
import { PtoTypePill } from "./RequestDetailModal.jsx";
import { formatDateRange } from "../../utils/dateHelpers.jsx";
import { requestRangeLabel } from "../../utils/requestHelpers.jsx";
import { lineDays } from "../../utils/requestHelpers.jsx";
import { firstName } from "../../utils/constants.jsx";
import { Button } from "../ui/Button.jsx";
import { useResource } from "../../hooks/useResource.jsx";
import { isWellnessGrant } from "../../utils/requestHelpers.jsx";
import { WellnessPill } from "./Wellness.jsx";
import { wellnessCardStyle } from "./Wellness.jsx";
import { wellnessDividerStyle } from "./Wellness.jsx";
import { useHolidayIssue } from "./HolidayDayOff.jsx";
import { HolidayIssueNotice } from "./HolidayDayOff.jsx";
import { HolidayBalance } from "./HolidayDayOff.jsx";
import { holidayIssueCardStyle } from "./HolidayDayOff.jsx";
import { holidayIssueDividerStyle } from "./HolidayDayOff.jsx";
export function ApprovalCard(e) {
  return isWellnessGrant(e.request) ? (
    <WellnessApprovalCard {...e} />
  ) : (
    <TimeOffApprovalCard {...e} />
  );
}
export const waitedColor = (e) =>
  e >= 5
    ? "var(--c-danger-ink)"
    : e >= 2
      ? "var(--c-warning-ink)"
      : "var(--c-ink-mute)";
export function TimeOffApprovalCard({
  request: request,
  index = 0,
  onApprove: onApprove,
  onDeny: onDeny,
  selectable: selectable,
  selected: selected,
  onToggleSelect: onToggleSelect,
  onOpenPerson: onOpenPerson,
  onOpenDetail: onOpenDetail,
}) {
  const {
      ptoTypes: ptoTypes,
      users: users,
      userById: userById,
      ptoTypeById: ptoTypeById,
    } = useCatalog(),
    {
      balanceFor: balanceFor,
      grantFor: grantFor,
      normalDaysOffFor: normalDaysOffFor,
      getRequests: getRequests,
    } = useDataSource(),
    v = useToday(),
    [m, x] = React.useState(null),
    [b, N] = React.useState(!1),
    [_, j] = React.useState(""),
    holidayIssue = useHolidayIssue(request);
  React.useEffect(() => {
    let $ = !0;
    const U = requestTypeIds(request);
    return (
      Promise.all([
        Promise.all(U.map((X) => balanceFor(request.userId, X))),
        Promise.all(U.map((X) => grantFor(request.userId, X))),
        normalDaysOffFor(request.userId),
        getRequests(),
      ]).then(([X, V, he, K]) => {
        if (!$) return;
        const A = {},
          B = {};
        (U.forEach((ae, fe) => {
          ((A[ae] = X[fe]), (B[ae] = V[fe]));
        }),
          x({
            balances: A,
            grants: B,
            normalDaysOff: he,
            requests: K,
          }));
      }),
      () => {
        $ = !1;
      }
    );
  }, [request.id]);
  const S = userById(request.userId),
    R = requestLines(request),
    E = requestTypeIds(request);
  if (m === null) return null;
  const {
      balances: balances,
      grants: grants,
      normalDaysOff: normalDaysOff,
      requests: requests,
    } = m,
    D = requestDays(request, normalDaysOff),
    q = findTeamConflicts({
      draft: request,
      requests: requests,
      users: users,
      selfId: request.userId,
      teamId: S == null ? void 0 : S.team,
    }),
    Z = Math.abs(
      Vendor_differenceInCalendarDays(
        toDateLocal(v),
        toDateLocal(request.submittedAt),
      ),
    ),
    P =
      Z >= 5
        ? "var(--c-danger-ink)"
        : Z >= 2
          ? "var(--c-warning-ink)"
          : "var(--c-ink-mute)";
  return (
    <div
      onClick={() => (onOpenDetail == null ? void 0 : onOpenDetail(request))}
      role="button"
      tabIndex={0}
      onKeyDown={($) => {
        $.target === $.currentTarget &&
          ($.key === "Enter" || $.key === " ") &&
          ($.preventDefault(), onOpenDetail == null || onOpenDetail(request));
      }}
      aria-label={`Open ${S == null ? void 0 : S.name}'s ${requestTypeLabel(request, ptoTypes)} request`}
      style={{
        "--i": index,
        ...(holidayIssue ? holidayIssueCardStyle : {}),
      }}
      className="stagger-in lift press-card cursor-pointer rounded-card border border-line bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3.5">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            onClick={($) => $.stopPropagation()}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
            aria-label={`Select ${S == null ? void 0 : S.name}'s request`}
            disabled={!!holidayIssue}
          />
        )}
        <button
          type="button"
          onClick={($) => {
            ($.stopPropagation(),
              onOpenPerson == null || onOpenPerson(S == null ? void 0 : S.id));
          }}
          className="shrink-0 rounded-full focus-visible:outline-none"
          aria-label={`View ${S == null ? void 0 : S.name}'s time-off history`}
          title="View all requests"
        >
          <Avatar
            name={S == null ? void 0 : S.name}
            id={S == null ? void 0 : S.id}
            size="md"
          />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={($) => {
                ($.stopPropagation(),
                  onOpenPerson == null ||
                    onOpenPerson(S == null ? void 0 : S.id));
              }}
              className="group/name min-w-0 text-left"
              title="View all requests"
            >
              <p className="truncate font-bold tracking-tight text-ink transition-colors group-hover/name:text-accent-ink">
                {S == null ? void 0 : S.name}
              </p>
            </button>
            <div className="mt-0.5 basis-full">
              <UserTeams user={S} variant="inline" />
            </div>
            <span
              className="shrink-0 text-xs font-medium"
              style={{
                color: P,
              }}
            >
              {"Submitted "}
              {timeAgo(request.submittedAt, v)}
            </span>
          </div>
          {R.length === 1 ? (
            <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <PtoTypePill typeId={R[0].type} label={R[0].holidayName} />
              <span className="text-[15px] font-semibold text-ink">
                {formatDateRange(R[0].start, R[0].end)}
              </span>
              <span className="text-sm tabular text-ink-mute">
                {D}
                {" day"}
                {D === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <div className="mt-3.5">
              <p className="text-[15px] font-semibold text-ink">
                {requestRangeLabel(request)}
              </p>
              <div className="mt-2 space-y-1.5">
                {R.map(($, U) => {
                  var X, V;
                  return (
                    <div
                      className="flex items-center gap-2 text-sm"
                      key={`${$.type}-${$.start}-${U}`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            (X = ptoTypeById($.type)) == null
                              ? void 0
                              : X.color,
                        }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-ink">
                        {(V = ptoTypeById($.type)) == null ? void 0 : V.name}
                      </span>
                      <span className="text-ink-soft">
                        {formatDateRange($.start, $.end)}
                      </span>
                      <span className="tabular text-ink-mute">
                        {"· "}
                        {lineDays($, normalDaysOff)}
                        {"d"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div
            className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-line-soft pt-3.5"
            style={holidayIssue ? holidayIssueDividerStyle : void 0}
          >
            <div className="min-w-0">
              <p className="eyebrow">{"Balance"}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {E.map(($, U) => {
                  var X;
                  const holidayLine =
                    ptoTypeById($)?.isHolidayDayOff &&
                    R.find((ae) => ae.type === $);
                  return (
                    <span key={$}>
                      {U > 0 && ", "}
                      {holidayLine ? (
                        <HolidayBalance
                          line={holidayLine}
                          requests={requests}
                          request={request}
                        />
                      ) : (
                        <>
                          <b className="tabular text-ink">
                            {balances[$]}
                            {"/"}
                            {grants[$]}
                          </b>{" "}
                          {(X = ptoTypeById($)) == null
                            ? void 0
                            : X.name.toLowerCase()}
                        </>
                      )}
                    </span>
                  );
                })}
                <span className="text-ink-mute">
                  {" left for "}
                  {firstName(S == null ? void 0 : S.name)}
                </span>
              </p>
            </div>
            <div className="min-w-0">
              <p className="eyebrow">{"Coverage"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm">
                {q.length > 0 ? (
                  <>
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: "var(--c-warning-strong)",
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-ink-soft">
                      {q.map(($) => firstName($.user.name)).join(", ")}
                      {" also off"}
                    </span>
                  </>
                ) : (
                  <span className="text-ink-mute">
                    {"Clear, nobody else off"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <HolidayIssueNotice
            issue={holidayIssue}
            status={request.status}
            className="mt-3.5"
          />
          {request.note && (
            <p className="mt-3 rounded-btn bg-surface/70 px-3 py-2 text-sm italic text-ink-soft">
              {"“"}
              {request.note}
              {"”"}
            </p>
          )}
          {b ? (
            <div
              className="mt-4 space-y-2 animate-fade-up"
              onClick={($) => $.stopPropagation()}
            >
              <textarea
                value={_}
                onChange={($) => j($.target.value)}
                onKeyDown={($) => {
                  ($.metaKey || $.ctrlKey) &&
                    $.key === "Enter" &&
                    _.trim() &&
                    onDeny(request, _.trim());
                }}
                rows={2}
                autoFocus={!0}
                placeholder="Reason for denial (required)…"
                className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-danger focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    (N(!1), j(""));
                  }}
                >
                  {"Cancel"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!_.trim()}
                  onClick={() => onDeny(request, _.trim())}
                >
                  {"Confirm denial"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={($) => {
                  ($.stopPropagation(), N(!0));
                }}
              >
                {"Deny"}
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={!!holidayIssue}
                onClick={($) => {
                  ($.stopPropagation(), onApprove(request));
                }}
              >
                {"Approve"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function WellnessApprovalCard({
  request: request,
  index = 0,
  onApprove: onApprove,
  onDeny: onDeny,
  selectable: selectable,
  selected: selected,
  onToggleSelect: onToggleSelect,
  onOpenPerson: onOpenPerson,
  onOpenDetail: onOpenDetail,
}) {
  const { userById: userById, ptoTypeById: ptoTypeById } = useCatalog(),
    { balanceFor: balanceFor, grantFor: grantFor } = useDataSource(),
    today = useToday(),
    [denying, setDenying] = React.useState(!1),
    [reason, setReason] = React.useState("");
  const { data: balance = null } = useResource(
    ["wellness-approval", request.id, request.grantTypeId],
    async () => {
      const [remaining, grant] = await Promise.all([
        balanceFor(request.userId, request.grantTypeId),
        grantFor(request.userId, request.grantTypeId),
      ]);
      return {
        remaining: remaining ?? 0,
        grant: grant ?? 0,
      };
    },
    true,
  );
  if (balance === null) return null;
  const person = userById(request.userId),
    typeLabel = ptoTypeById(request.grantTypeId)?.name ?? "Wellness Day",
    typeName = typeLabel.toLowerCase(),
    days = request.grantDays,
    waited = Math.abs(
      Vendor_differenceInCalendarDays(
        toDateLocal(today),
        toDateLocal(request.submittedAt),
      ),
    ),
    openPerson = ($) => {
      ($.stopPropagation(), onOpenPerson == null || onOpenPerson(person?.id));
    };
  return (
    <div
      onClick={() => (onOpenDetail == null ? void 0 : onOpenDetail(request))}
      role="button"
      tabIndex={0}
      onKeyDown={($) => {
        $.target === $.currentTarget &&
          ($.key === "Enter" || $.key === " ") &&
          ($.preventDefault(), onOpenDetail == null || onOpenDetail(request));
      }}
      aria-label={`Open ${person?.name}'s wellness day request`}
      style={{
        "--i": index,
        ...wellnessCardStyle,
      }}
      className="stagger-in lift press-card cursor-pointer rounded-card border p-5 shadow-card"
    >
      <div className="flex items-start gap-3.5">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            onClick={($) => $.stopPropagation()}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
            aria-label={`Select ${person?.name}'s request`}
          />
        )}
        <button
          type="button"
          onClick={openPerson}
          className="shrink-0 rounded-full focus-visible:outline-none"
          aria-label={`View ${person?.name}'s time-off history`}
          title="View all requests"
        >
          <Avatar name={person?.name} id={person?.id} size="md" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={openPerson}
              className="group/name min-w-0 text-left"
              title="View all requests"
            >
              <p className="truncate font-bold tracking-tight text-ink transition-colors group-hover/name:text-accent-ink">
                {person?.name}
              </p>
            </button>
            <div className="mt-0.5 basis-full">
              <UserTeams user={person} variant="inline" />
            </div>
            <span
              className="shrink-0 text-xs font-medium"
              style={{
                color: waitedColor(waited),
              }}
            >
              {"Submitted "}
              {timeAgo(request.submittedAt, today)}
            </span>
          </div>
          <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <WellnessPill />
            <span className="text-[15px] font-semibold tabular text-ink">
              {"+"}
              {days}
              {days === 1 ? " day" : " days"}
            </span>
            <span className="text-sm text-ink-mute">
              {"to "}
              {typeLabel}
              {" balance · "}
              {request.grantYear}
            </span>
          </div>
          <div
            className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t pt-3.5"
            style={wellnessDividerStyle}
          >
            <div className="min-w-0">
              <p className="eyebrow">{"Balance now"}</p>
              <p className="mt-1 text-sm text-ink-soft">
                <b className="tabular text-ink">
                  {balance.remaining}
                  {"/"}
                  {balance.grant}
                </b>{" "}
                {typeName}
                <span className="text-ink-mute">
                  {" left for "}
                  {firstName(person?.name)}
                </span>
              </p>
            </div>
            <div className="min-w-0">
              <p className="eyebrow">{"After approval"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: "var(--c-success-strong)",
                  }}
                  aria-hidden="true"
                />
                <b className="tabular text-success-ink">
                  {balance.remaining + days}
                  {"/"}
                  {balance.grant + days}
                </b>
                <span className="text-ink-soft">{typeName}</span>
              </p>
            </div>
          </div>
          {request.note && (
            <p
              className="mt-3 rounded-btn px-3 py-2 text-sm italic text-ink-soft"
              style={{
                background: "var(--c-card)",
              }}
            >
              {"“"}
              {request.note}
              {"”"}
            </p>
          )}
          {denying ? (
            <div
              className="mt-4 space-y-2 animate-fade-up"
              onClick={($) => $.stopPropagation()}
            >
              <textarea
                value={reason}
                onChange={($) => setReason($.target.value)}
                onKeyDown={($) => {
                  ($.metaKey || $.ctrlKey) &&
                    $.key === "Enter" &&
                    reason.trim() &&
                    onDeny(request, reason.trim());
                }}
                rows={2}
                autoFocus={!0}
                placeholder="Reason for denial (required)…"
                className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-danger focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    (setDenying(!1), setReason(""));
                  }}
                >
                  {"Cancel"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!reason.trim()}
                  onClick={() => onDeny(request, reason.trim())}
                >
                  {"Confirm denial"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={($) => {
                  ($.stopPropagation(), setDenying(!0));
                }}
              >
                {"Deny"}
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={($) => {
                  ($.stopPropagation(), onApprove(request));
                }}
              >
                {"Approve"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
