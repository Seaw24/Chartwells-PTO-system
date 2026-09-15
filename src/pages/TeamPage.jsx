import { useResource } from "../hooks/useResource.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { isGodAdmin } from "../utils/constants.jsx";
import React from "react";
import { toISO } from "../utils/dateHelpers.jsx";
import { addMonths as Vendor_addMonths } from "date-fns";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { addWeeks as Vendor_addWeeks } from "date-fns";
import { buildTeamTimeline } from "../components/team/TeamTimeline.jsx";
import { useCoverage } from "../components/team/TeamTimeline.jsx";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { FilterDropdown } from "../components/ui/FilterDropdown.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { DesktopTeamTimeline } from "../components/team/TeamTimeline.jsx";
import { MobileTeamTimeline } from "../components/team/TeamTimeline.jsx";
import { EmployeeProfile } from "../components/team/EmployeeProfile.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useRequestModal } from "../components/requests/RequestModalProvider.jsx";
import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import { useToast } from "../components/ui/Toast.jsx";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useBumpVersion } from "../context/DataVersionContext.jsx";
import { firstName } from "../utils/constants.jsx";
import { RequestDetailModal } from "../components/requests/RequestDetailModal.jsx";
export function TeamPageView({
  activeUser: activeUser,
  todayIso: todayIso,
  users: users,
  requests: requests,
  holidays: holidays,
  loading: loading,
  sheetPerson: sheetPerson,
  sheetDetail: sheetDetail,
  onSelectPerson: onSelectPerson,
  onCloseSheet: onCloseSheet,
  onStartRequest: onStartRequest,
  onStartOnBehalf: onStartOnBehalf,
  onEditConfig: onEditConfig,
  onOpenRequest: onOpenRequest,
  onSaveNormalDaysOff: onSaveNormalDaysOff,
  initialUnit = "week",
  initialTeamFilter: initialTeamFilter,
}) {
  const { teams: teams, ptoTypes: ptoTypes } = useCatalog(),
    x = isGodAdmin(activeUser.role),
    [b, N] = React.useState(initialUnit),
    [_, j] = React.useState(todayIso),
    [S, R] = React.useState(
      initialTeamFilter ?? (x ? "all" : activeUser.team || "all"),
    ),
    [E, T] = React.useState({}),
    C = (V) =>
      T((he) => ({
        ...he,
        [V]: !he[V],
      })),
    H = (V) =>
      j((he) =>
        toISO(
          b === "month"
            ? Vendor_addMonths(toDateLocal(he), V)
            : Vendor_addWeeks(toDateLocal(he), V),
        ),
      ),
    I = S === "all" ? teams : teams.filter((V) => V.id === S),
    D = React.useMemo(
      () =>
        buildTeamTimeline({
          todayIso: todayIso,
          anchorIso: _,
          unit: b,
          users: users,
          requests: requests,
          holidays: holidays,
          teams: I,
        }),
      [todayIso, _, b, users, requests, holidays, S],
    ),
    q = useCoverage(D.rangeStart, D.rangeEnd),
    Z = React.useMemo(
      () =>
        buildTeamTimeline({
          todayIso: todayIso,
          anchorIso: _,
          unit: b,
          users: users,
          requests: requests,
          holidays: holidays,
          teams: I,
          coverageRows: q,
        }),
      [todayIso, _, b, users, requests, holidays, S, q],
    ),
    P = React.useMemo(() => {
      const V = {};
      return (
        users.forEach((he) => {
          he.team && (V[he.team] = (V[he.team] || 0) + 1);
        }),
        V
      );
    }, [users]),
    $ = [
      {
        value: "all",
        label: "All teams",
        hint: users.filter((V) => V.team).length,
      },
      ...teams.map((V) => ({
        value: V.id,
        label: V.name,
        hint: P[V.id] || 0,
      })),
    ],
    U =
      Z.totalOff === 0
        ? `Everyone's in this ${b}.`
        : `${Z.totalOff} ${Z.totalOff === 1 ? "person" : "people"} off this ${b}`,
    X = (V) => V && (onOpenRequest == null ? void 0 : onOpenRequest(V));
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {"Team · "}
            {Z.rangeLabel}
          </p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {"Team"}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">
            {loading ? "Loading roster…" : U}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => H(-1)}
                aria-label={`Previous ${b}`}
                className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
              >
                <Vendor_ChevronLeft size={18} />
              </button>
              <button
                onClick={() => H(1)}
                aria-label={`Next ${b}`}
                className="grid h-9 w-9 place-items-center rounded-btn border border-line bg-card text-ink-soft hover:bg-panel"
              >
                <Vendor_ChevronRight size={18} />
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => j(todayIso)}>
              {"Today"}
            </Button>
            <span className="ml-1 text-[15px] font-bold tabular tracking-tight text-ink sm:text-base">
              {Z.rangeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              options={$}
              value={S}
              onChange={R}
              leadingIcon={Vendor_Users}
              size="sm"
              searchable={!0}
              searchPlaceholder="Search teams…"
              ariaLabel="Filter by team"
            />
            <SegmentedControl
              options={[
                {
                  value: "week",
                  label: "Week",
                },
                {
                  value: "month",
                  label: "Month",
                },
              ]}
              value={b}
              onChange={N}
              size="sm"
            />
          </div>
        </div>
      </header>
      {loading ? (
        <TeamSkeleton />
      ) : (
        <>
          <div className="hidden md:block">
            <DesktopTeamTimeline
              data={Z}
              collapsed={E}
              onToggleTeam={C}
              activeUserId={activeUser.id}
              onSelectPerson={onSelectPerson}
              onBarClick={(V) => X(V.requestId)}
            />
            <TeamLeaveLegend />
          </div>
          <div className="md:hidden">
            <MobileTeamTimeline
              data={Z}
              collapsed={E}
              onToggleTeam={C}
              activeUserId={activeUser.id}
              onSelectPerson={onSelectPerson}
              onBarClick={(V) => X(V.requestId)}
            />
            <TeamLeaveLegend className="mt-3" />
          </div>
        </>
      )}
      <EmployeeProfile
        open={!!sheetPerson}
        viewer={activeUser}
        person={sheetPerson}
        detail={sheetDetail}
        todayIso={todayIso}
        onClose={onCloseSheet}
        onStartOnBehalf={onStartOnBehalf}
        onEditConfig={onEditConfig}
        onOpenRequest={X}
        onSaveNormalDaysOff={onSaveNormalDaysOff}
      />
    </div>
  );
}
export function TeamLeaveLegend({ className = "" }) {
  const { ptoTypes: ptoTypes } = useCatalog();
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-3 ${className}`}
    >
      <span className="eyebrow">{"Leave type"}</span>
      {ptoTypes.map((n) => (
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-soft"
          key={n.id}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: n.color,
            }}
          />
          {n.name}
        </span>
      ))}
      <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-ink-mute sm:inline-flex">
        <span
          className="inline-block h-3 w-5 rounded-[4px]"
          style={{
            border:
              "1px dashed color-mix(in oklch, var(--c-ink-mute) 55%, transparent)",
          }}
        />
        {" pending"}
      </span>
    </div>
  );
}
export function TeamSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-raised">
      <div className="skeleton h-11 w-full" />
      {Array.from({
        length: 8,
      }).map((e, t) => (
        <div
          className="flex items-center gap-3 border-t border-line-soft px-4 py-3"
          key={t}
        >
          <div className="skeleton h-6 w-6 rounded-full" />
          <div className="skeleton h-4 w-28 rounded" />
          <div
            className="skeleton h-6 rounded-chip"
            style={{
              width: `${18 + (t % 3) * 14}%`,
              marginLeft: `${(t % 4) * 10}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
export function TeamPage() {
  const e = useCurrentUser(),
    t = useToday(),
    {
      getUsers: getUsers,
      getRequests: getRequests,
      getHolidays: getHolidays,
      requestsForUser: requestsForUser,
      balanceFor: balanceFor,
      usedFor: usedFor,
      grantFor: grantFor,
      normalDaysOffFor: normalDaysOffFor,
      setNormalDaysOff: setNormalDaysOff,
    } = useDataSource(),
    { ptoTypes: ptoTypes, balanceTypes: balanceTypes } = useCatalog(),
    { openRequest: openRequest } = useRequestModal(),
    p = Vendor_useNavigate(),
    y = useToast(),
    [v, m] = React.useState(null),
    [N, _] = React.useState(null),
    j = useVersion(),
    S = useBumpVersion();
  const { data: g = null } = useResource(
    ["team-roster"],
    async () => {
      const [users, requests, holidays] = await Promise.all([
        getUsers(),
        getRequests(),
        getHolidays(),
      ]);
      return {
        users,
        requests,
        holidays,
      };
    },
    true,
  );
  const { data: x = null } = useResource(
    ["person", v?.id, ptoTypes.map((type) => type.id)],
    async () => {
      const [requests, normalDaysOff, holidays, balances] = await Promise.all([
        requestsForUser(v.id),
        normalDaysOffFor(v.id),
        getHolidays(),
        Promise.all(
          balanceTypes.map(async (type) => {
            const [remaining, used, grant] = await Promise.all([
              balanceFor(v.id, type.id),
              usedFor(v.id, type.id),
              grantFor(v.id, type.id),
            ]);
            return {
              typeId: type.id,
              name: type.name,
              remaining,
              used,
              grant,
            };
          }),
        ),
      ]);
      return {
        requests,
        normalDaysOff,
        holidays,
        balances,
      };
    },
    !!v,
  );
  (void 0, void 0);
  const R = React.useCallback(
    (E, T) => {
      setNormalDaysOff(E.id, T).then(() => {
        (y(`Updated ${firstName(E.name)}'s normal days off.`, {
          kind: "success",
        }),
          S());
      });
    },
    [setNormalDaysOff, y],
  );
  return (
    <>
      <TeamPageView
        activeUser={e}
        todayIso={t}
        users={(g == null ? void 0 : g.users) ?? []}
        requests={(g == null ? void 0 : g.requests) ?? []}
        holidays={(g == null ? void 0 : g.holidays) ?? []}
        loading={g === null}
        sheetPerson={v}
        sheetDetail={x}
        onSelectPerson={m}
        onCloseSheet={() => m(null)}
        onStartRequest={(E) =>
          openRequest({
            start: E,
            end: E,
          })
        }
        onStartOnBehalf={() => {
          y("Adding time off on behalf of someone isn’t available yet.", {
            kind: "info",
          });
        }}
        onEditConfig={() => p("/settings")}
        onOpenRequest={_}
        onSaveNormalDaysOff={R}
      />
      <RequestDetailModal
        requestId={N}
        open={!!N}
        onClose={() => _(null)}
        onOpenPerson={(E) => {
          const T = ((g == null ? void 0 : g.users) ?? []).find(
            (C) => C.id === E,
          );
          (_(null), T && m(T));
        }}
        onChanged={S}
      />
    </>
  );
}
