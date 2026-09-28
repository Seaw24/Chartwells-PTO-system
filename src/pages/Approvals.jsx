import { requestHolidayIssue } from "../utils/holidayDayOff.jsx";
import { useResource } from "../hooks/useResource.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { isGodAdmin } from "../utils/constants.jsx";
import React from "react";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useBumpVersion } from "../context/DataVersionContext.jsx";
import { useSearchParams as Vendor_useSearchParams } from "react-router-dom";
import { useOrg } from "../context/OrgContext.jsx";
import { requestTypeLabel } from "../utils/requestHelpers.jsx";
import { requestDays } from "../utils/requestHelpers.jsx";
import { matchesRequestTab } from "./MyRequests.jsx";
import { requestCounts } from "./MyRequests.jsx";
import { differenceInCalendarDays as Vendor_differenceInCalendarDays } from "date-fns";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { Inbox as Vendor_Inbox } from "lucide-react";
import { History as Vendor_History } from "lucide-react";
import { Clock as Vendor_Clock } from "lucide-react";
import { firstName } from "../utils/constants.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { canStampSlot } from "../utils/requestHelpers.jsx";
import { StampSlots } from "../components/requests/StampSlots.jsx";
import { Search as Vendor_Search } from "lucide-react";
import { ChevronDown as Vendor_ChevronDown } from "lucide-react";
import { FilterDropdown } from "../components/ui/FilterDropdown.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { SearchX as Vendor_SearchX } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { ApprovalCard } from "../components/requests/ApprovalCard.jsx";
import { differenceInHours as Vendor_differenceInHours } from "date-fns";
import { Avatar } from "../components/ui/Avatar.jsx";
import { requestRangeLabel } from "../utils/requestHelpers.jsx";
import { StatusChip } from "../components/requests/RequestDetailModal.jsx";
import { fmtDateTime } from "../utils/dateHelpers.jsx";
import { PersonRequestsPanel } from "../components/requests/PersonRequestsPanel.jsx";
import { RequestDetailModal } from "../components/requests/RequestDetailModal.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
// Six tabs: the two pending ones split by whose stamp is missing.
export const APPROVAL_TABS = (waitingLabel) => [
  { value: "all", label: "All" },
  { value: "needs_me", label: "Needs me" },
  { value: "waiting", label: waitingLabel },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Rejected" },
  { value: "past", label: "Past" },
];
// One entry per APPROVAL_TABS value: an empty tab reads its copy from here by tab value.
export const APPROVAL_EMPTY_STATES = {
  all: {
    icon: Vendor_Inbox,
    title: "Nothing here yet",
    description: "Requests from your team appear here as they come in.",
  },
  needs_me: {
    icon: Vendor_Inbox,
    title: "Inbox zero",
    description: "No requests are waiting on your stamp right now.",
  },
  waiting: {
    icon: Vendor_Clock,
    title: "Nothing waiting on anyone else",
    description:
      "Requests you have stamped wait here until the other admin stamps them.",
  },
  approved: {
    icon: Vendor_History,
    title: "No approved time off ahead",
    description: "Time off you approve shows here until the dates pass.",
  },
  denied: {
    icon: Vendor_History,
    title: "No rejected requests",
    description: "Requests you could not approve show here.",
  },
  past: {
    icon: Vendor_History,
    title: "Nothing in the past yet",
    description: "Time off that has already been taken shows here.",
  },
};
export function Approvals() {
  var Dt, Jr, Na, Sa;
  const [saving, setSaving] = React.useState(false);
  const mutationLock = React.useRef(false);
  async function runDecision(action) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    try {
      await action();
    } catch (error) {
      d(error.message, { kind: "error" });
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  }

  const e = useCurrentUser(),
    t = useToday(),
    {
      pendingForApprover: pendingForApprover,
      decisionHistory: decisionHistory,
      denyRequest: denyRequest,
    } = useDataSource(),
    {
      ptoTypes: ptoTypes,
      holidays: holidays,
      users: users,
      userById: userById,
      teamById: teamById,
    } = useCatalog(),
    d = useToast(),
    f = isGodAdmin(e.role),
    [g, k] = React.useState("all"),
    [v, m] = React.useState("all"),
    [N, _] = React.useState(""),
    [j, S] = React.useState("oldest"),
    [R, E] = React.useState(null),
    [T, C] = React.useState(null),
    H = useVersion(),
    I = useBumpVersion(),
    [D, q] = Vendor_useSearchParams(),
    Z = useOrg(),
    P = React.useMemo(
      () => (f ? Z.teams.map((F) => F.id) : Z.adminTeamIds(e.id)),
      [f, Z, e.id],
    ),
    $ = f || P.length >= 2,
    U = React.useMemo(() => {
      const F = P.map((pe) => Z.teamById(pe)).filter(Boolean);
      return [
        {
          value: "all",
          label: "All teams",
          hint: new Set(
            F.flatMap((pe) => Z.membersOf(pe.id).map((tt) => tt.id)),
          ).size,
        },
        ...F.map((pe) => ({
          value: pe.id,
          label: pe.name,
          hint: Z.membersOf(pe.id).length,
        })),
      ];
    }, [P, Z]),
    X = !f && P.length >= 2 ? P : null,
    V = X ? X.join(",") : "all";
  // "Needs me" is the cards where my own slot is still empty; once I stamp, the card moves to
  // "Waiting on …" until the other slot lands.
  const needsMe = React.useCallback(
      (request) =>
        canStampSlot(e, request, "god", users) ||
        canStampSlot(e, request, "team", users),
      [e, users],
    ),
    waitingLabel = f ? "Waiting on team admin" : "Waiting on god admin";
  const { data: p = null } = useResource(
    ["approvals", V],
    async () => {
      const [pendingAll, decisions] = await Promise.all([
        pendingForApprover(),
        decisionHistory(X),
      ]);
      return {
        pendingAll,
        decisions,
      };
    },
    true,
  );
  (void 0,
    React.useEffect(() => {
      const F = D.get("req");
      F &&
        (C(F),
        q(
          {},
          {
            replace: !0,
          },
        ));
    }, [D, q]));
  const he = p === null,
    K = (p == null ? void 0 : p.pendingAll) ?? [],
    A = (p == null ? void 0 : p.decisions) ?? [],
    B = React.useMemo(
      () =>
        $ && v !== "all"
          ? K.filter((F) => {
              var se;
              return (
                ((se = userById(F.userId)) == null ? void 0 : se.team) === v
              );
            })
          : K,
      [K, $, v],
    ),
    ae = React.useMemo(
      () =>
        $ && v !== "all"
          ? A.filter((F) => {
              var se;
              return (
                ((se = userById(F.userId)) == null ? void 0 : se.team) === v
              );
            })
          : A,
      [A, $, v],
    ),
    Bt = React.useMemo(
      () =>
        g === "needs_me"
          ? B.filter(needsMe)
          : g === "waiting"
            ? B.filter((F) => !needsMe(F))
            : B,
      [B, g, needsMe],
    ),
    fe = React.useMemo(() => {
      const F = N.trim().toLowerCase(),
        se = Bt.filter((tt) => {
          var ei;
          return F
            ? `${(ei = userById(tt.userId)) == null ? void 0 : ei.name} ${requestTypeLabel(tt, ptoTypes)}`
                .toLowerCase()
                .includes(F)
            : !0;
        }),
        pe = (tt, Lt) => (tt.submittedAt < Lt.submittedAt ? -1 : 1);
      return [...se].sort((tt, Lt) =>
        j === "oldest"
          ? pe(tt, Lt)
          : j === "newest"
            ? -pe(tt, Lt)
            : requestDays(Lt) - requestDays(tt),
      );
    }, [Bt, N, j]),
    ye = React.useMemo(() => {
      const F = N.trim().toLowerCase();
      return ae.filter((se) => {
        var pe;
        return !(
          !matchesRequestTab(se, g, t) ||
          (F &&
            !`${(pe = userById(se.userId)) == null ? void 0 : pe.name} ${requestTypeLabel(se, ptoTypes)}`
              .toLowerCase()
              .includes(F))
        );
      });
    }, [ae, g, N, t]),
    Q = React.useMemo(() => requestCounts([...B, ...ae], t), [B, ae, t]),
    Y = g === "all" || g === "needs_me" || g === "waiting",
    ee = g === "all" || ["approved", "denied", "past"].includes(g),
    Pe =
      (Y ? Bt.length : 0) +
      (ee ? ae.filter((F) => matchesRequestTab(F, g, t)).length : 0),
    ve = (Y ? fe.length : 0) + (ee ? ye.length : 0),
    _e = React.useMemo(() => {
      if (!B.length) return 0;
      const F = B.reduce(
        (se, pe) => (pe.submittedAt < se ? pe.submittedAt : se),
        B[0].submittedAt,
      );
      return Math.abs(
        Vendor_differenceInCalendarDays(toDateLocal(t), toDateLocal(F)),
      );
    }, [B, t]),
    Mt = $
      ? v !== "all"
        ? ((Dt = Z.teamById(v)) == null ? void 0 : Dt.name) ||
          ((Jr = teamById(v)) == null ? void 0 : Jr.name)
        : f
          ? "All teams"
          : "Your teams"
      : ((Na = teamById(e.team)) == null ? void 0 : Na.name) || "Your team",
    mt = f
      ? "across all teams"
      : P.length >= 2
        ? "across your teams"
        : `on ${((Sa = teamById(e.team)) == null ? void 0 : Sa.name) || "your team"}`,
    jt = he
      ? "Loading your queue…"
      : g === "all"
        ? `${Q.pending} pending · ${Q.approved} approved · ${Q.denied} rejected`
        : g === "needs_me"
          ? Bt.length === 0
            ? "You're all caught up. No requests are waiting on your stamp."
            : `${Bt.length} request${Bt.length === 1 ? "" : "s"} waiting on your stamp${_e >= 2 ? ` · oldest waited ${_e} days` : ""}`
          : g === "waiting"
            ? `${Bt.length} request${Bt.length === 1 ? "" : "s"} you stamped, ${f ? "waiting on a team admin" : "waiting on a god admin"}.`
            : g === "approved"
              ? `${Q.approved} approved request${Q.approved === 1 ? "" : "s"} still ahead ${mt}.`
              : g === "denied"
                ? `${Q.denied} rejected request${Q.denied === 1 ? "" : "s"} ${mt}.`
                : `${Q.past} request${Q.past === 1 ? "" : "s"} already taken ${mt}.`,
    cn = (request, reason) =>
      runDecision(async () => {
        await denyRequest(request.id, reason);
        d("Request rejected.", { kind: "info" });
      });
  return (
    <fieldset
      disabled={saving}
      aria-busy={saving}
      className="space-y-6"
      style={{ minWidth: 0 }}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{Mt}</p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {"Approvals"}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">{jt}</p>
        </div>
        <SegmentedControl
          options={APPROVAL_TABS(waitingLabel)}
          value={g}
          onChange={k}
          size="sm"
        />
      </header>
      {!he && Pe > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Vendor_Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              value={N}
              onChange={(F) => _(F.target.value)}
              placeholder="Search by name or type…"
              aria-label="Search requests"
              className="h-9 w-full rounded-btn border border-line bg-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Y && (
              <div className="relative">
                <select
                  value={j}
                  onChange={(F) => S(F.target.value)}
                  aria-label="Sort requests"
                  className="h-9 cursor-pointer appearance-none rounded-btn border border-line bg-card pl-3 pr-8 text-sm font-semibold text-ink-soft transition-colors hover:bg-panel focus:border-accent focus:outline-none"
                >
                  <option value="oldest">{"Oldest first"}</option>
                  <option value="newest">{"Newest first"}</option>
                  <option value="longest">{"Longest first"}</option>
                </select>
                <Vendor_ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
                />
              </div>
            )}
            {$ && (
              <FilterDropdown
                options={U}
                value={v}
                onChange={m}
                leadingIcon={Vendor_Users}
                size="sm"
                searchable={!0}
                searchPlaceholder="Search teams…"
                ariaLabel="Filter by team"
              />
            )}
          </div>
        </div>
      )}
      {he ? (
        <ApprovalsSkeleton />
      ) : Pe === 0 ? (
        <div className="rounded-card border border-line bg-card shadow-card">
          <EmptyState
            icon={APPROVAL_EMPTY_STATES[g].icon}
            title={APPROVAL_EMPTY_STATES[g].title}
            description={APPROVAL_EMPTY_STATES[g].description}
            className="py-14"
          />
        </div>
      ) : ve === 0 ? (
        <div className="rounded-card border border-line bg-card shadow-card">
          <EmptyState
            icon={Vendor_SearchX}
            title="No matches"
            description={`Nothing matches “${N}”. Clear the search to see all ${Pe}.`}
            className="py-14"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {Y && fe.length > 0 && (
            <section className="space-y-3">
              {g === "all" && <p className="eyebrow">{"Waiting on you"}</p>}
              <div className="space-y-3">
                {fe.map((F, se) => (
                  <ApprovalCard
                    index={se}
                    request={F}
                    onDeny={cn}
                    onOpenPerson={E}
                    onOpenDetail={(pe) => C(pe.id)}
                    key={F.id}
                  />
                ))}
              </div>
            </section>
          )}
          {ee && ye.length > 0 && (
            <section className="space-y-3">
              {g === "all" && <p className="eyebrow">{"Already decided"}</p>}
              <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
                <ul className="divide-y divide-line-soft">
                  {ye.map((F) => {
                    const se = userById(F.userId),
                      pe =
                        F.decidedByName ?? userById(F.decidedBy)?.name ?? null,
                      tt = F.decidedBy === e.id;
                    return (
                      <li
                        className="px-4 py-3 transition-colors hover:bg-panel/40"
                        key={F.id}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => C(F.id)}
                            className="group/d flex min-w-0 flex-1 items-center gap-3 text-left"
                            title="View request details"
                          >
                            <Avatar
                              name={se == null ? void 0 : se.name}
                              id={se == null ? void 0 : se.id}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink transition-colors group-hover/d:text-accent-ink">
                                {se == null ? void 0 : se.name}
                              </p>
                              <p className="truncate text-xs text-ink-mute">
                                {requestTypeLabel(F, ptoTypes)}
                                {" · "}
                                {requestRangeLabel(F)}
                              </p>
                            </div>
                          </button>
                          <StatusChip status={F.status} size="xs" />
                          <div className="text-right">
                            <p className="text-xs font-medium text-ink-soft">
                              {F.status === "approved" ? "Approved" : "Denied"}
                              {" by "}
                              {tt ? "you" : firstName(pe) || "—"}
                            </p>
                            <p className="text-[11px] tabular text-ink-mute">
                              {F.decidedAt && fmtDateTime(F.decidedAt)}
                            </p>
                          </div>
                          <StampSlots request={F} size="sm" />
                        </div>
                        {F.status === "denied" && F.denialReason && (
                          <p className="mt-2 flex gap-1.5 pl-11 text-xs text-ink-soft">
                            <span className="shrink-0 font-semibold text-ink-mute">
                              {"Reason"}
                            </span>
                            <span className="min-w-0">{F.denialReason}</span>
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
      <PersonRequestsPanel
        userId={R}
        open={!!R}
        onClose={() => E(null)}
        onOpenRequest={(F) => {
          (E(null), C(F));
        }}
      />
      <RequestDetailModal
        requestId={T}
        open={!!T}
        onClose={() => C(null)}
        onOpenPerson={(F) => {
          (C(null), E(F));
        }}
        onChanged={I}
      />
    </fieldset>
  );
}
export function ApprovalsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({
        length: 3,
      }).map((e, t) => (
        <div
          className="rounded-card border border-line bg-card p-5 shadow-card"
          key={t}
        >
          <div className="flex items-center gap-3.5">
            <Skeleton className="h-10 w-10" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" rounded="rounded" />
              <Skeleton className="h-3 w-24" rounded="rounded" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-56" rounded="rounded" />
          <div className="mt-4 flex justify-end gap-2">
            <Skeleton className="h-8 w-20" rounded="rounded-btn" />
            <Skeleton className="h-8 w-24" rounded="rounded-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
