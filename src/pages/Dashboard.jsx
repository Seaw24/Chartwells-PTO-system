import { useResource } from "../hooks/useResource.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useRequestModal } from "../components/requests/RequestModalProvider.jsx";
import React from "react";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useBumpVersion } from "../context/DataVersionContext.jsx";
import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import { useToast } from "../components/ui/Toast.jsx";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { DashboardView } from "../components/dashboard/DashboardView.jsx";
import { EmployeeProfile } from "../components/team/EmployeeProfile.jsx";
import { canViewPerson } from "../components/team/EmployeeProfile.jsx";
import { firstName } from "../utils/constants.jsx";
import { requestPrimaryTypeId } from "../utils/requestHelpers.jsx";
import { requestTypeLabel } from "../utils/requestHelpers.jsx";
import { requestRangeLabel } from "../utils/requestHelpers.jsx";
import { requestEnd } from "../utils/requestHelpers.jsx";
import { requestStart } from "../utils/requestHelpers.jsx";
import { RequestDetailModal } from "../components/requests/RequestDetailModal.jsx";
import { mergeWhosOff } from "../utils/whosOff.jsx";
import { WhosOffCatalog } from "../utils/whosOff.jsx";
export function Dashboard() {
  const e = useCurrentUser(),
    t = useToday(),
    {
      getRequests: getRequests,
      getHolidays: getHolidays,
      balanceFor: balanceFor,
      grantFor: grantFor,
      usedFor: usedFor,
      requestsForUser: requestsForUser,
      normalDaysOffFor: normalDaysOffFor,
      setNormalDaysOff: setNormalDaysOff,
      whoIsOff: whoIsOff,
      teamDirectory: teamDirectory,
    } = useDataSource(),
    {
      users: users,
      ptoTypes: ptoTypes,
      balanceTypes: balanceTypes,
      holidays: holidays,
    } = useCatalog(),
    { openRequest: openRequest } = useRequestModal(),
    navigate = Vendor_useNavigate(),
    toast = useToast(),
    [g, k] = React.useState(null),
    [person, setPerson] = React.useState(null),
    v = useVersion(),
    m = useBumpVersion();
  const { data: p = null } = useResource(
    ["dashboard", t, ptoTypes.map((type) => type.id)],
    async () => {
      const [requests, offRequests, directory, myRequests, balances] =
        await Promise.all([
          getRequests(),
          whoIsOff(),
          teamDirectory(),
          requestsForUser(e.id),
          Promise.all(
            balanceTypes.map(async (type) => {
              const [remaining, grant, used] = await Promise.all([
                balanceFor(e.id, type.id),
                grantFor(e.id, type.id),
                usedFor(e.id, type.id),
              ]);
              return {
                typeId: type.id,
                name: type.name,
                remaining,
                grant,
                used,
              };
            }),
          ),
        ]);
      return {
        requests,
        offRequests,
        directory,
        myRequests,
        balances,
      };
    },
    true,
  );
  // The profile drawer's detail, for a person the viewer may open.
  const { data: personDetail = null } = useResource(
    ["person", person?.id, ptoTypes.map((type) => type.id)],
    async () => {
      const [requests, normalDaysOff, personHolidays, balances] =
        await Promise.all([
          requestsForUser(person.id),
          normalDaysOffFor(person.id),
          getHolidays(),
          Promise.all(
            balanceTypes.map(async (type) => {
              const [remaining, used, grant] = await Promise.all([
                balanceFor(person.id, type.id),
                usedFor(person.id, type.id),
                grantFor(person.id, type.id),
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
        holidays: personHolidays,
        balances,
      };
    },
    !!person,
  );
  const saveNormalDaysOff = React.useCallback(
    (who, days) => {
      setNormalDaysOff(who.id, days).then(() => {
        (toast(`Updated ${firstName(who.name)}'s normal days off.`, {
          kind: "success",
        }),
          m());
      });
    },
    [setNormalDaysOff, toast],
  );
  if ((void 0, !p))
    return <DashboardView activeUser={e} todayIso={t} loading={!0} />;
  // Everyone sees every team's time off, as HR does; see mergeWhosOff.
  const merged = mergeWhosOff({
      requests: p.requests,
      users: users,
      offRequests: p.offRequests,
      directory: p.directory,
    }),
    b = (j) => {
      return {
        id: j.id,
        typeId: requestPrimaryTypeId(j),
        label: requestTypeLabel(j, ptoTypes),
        rangeLabel: requestRangeLabel(j),
        status: j.status,
      };
    },
    N = p.myRequests
      .filter(
        (j) =>
          j.status === "approved" &&
          toDateLocal(requestEnd(j)) >= toDateLocal(t),
      )
      .sort((j, S) => (requestStart(j) > requestStart(S) ? 1 : -1))
      .slice(0, 3)
      .map(b),
    _ = p.myRequests
      .filter((j) => j.status === "pending")
      .sort((j, S) => (requestStart(j) > requestStart(S) ? 1 : -1))
      .slice(0, 3)
      .map(b),
    canOpenPerson = (u) => canViewPerson(e, u);
  return (
    <WhosOffCatalog users={merged.users}>
      <DashboardView
        activeUser={e}
        todayIso={t}
        users={merged.users}
        requests={merged.requests}
        holidays={holidays}
        personal={{
          balances: p.balances,
          upcoming: N,
          pending: _,
        }}
        onStartRequest={(j) => {
          j >= t &&
            openRequest({
              start: j,
              end: j,
            });
        }}
        onBarClick={(j) => j.viewOnly || k(j.requestId)}
        canOpenPerson={canOpenPerson}
        onSelectPerson={(u) => canOpenPerson(u) && setPerson(u)}
      />
      <EmployeeProfile
        open={!!person}
        viewer={e}
        person={person}
        detail={personDetail}
        todayIso={t}
        onClose={() => setPerson(null)}
        onStartOnBehalf={(who) =>
          openRequest({
            forUserId: who.id,
          })
        }
        onEditConfig={() => navigate("/settings")}
        onOpenRequest={k}
        onSaveNormalDaysOff={saveNormalDaysOff}
      />
      <RequestDetailModal
        requestId={g}
        open={!!g}
        onClose={() => k(null)}
        onOpenPerson={(id) => {
          const who = merged.users.find((u) => u.id === id);
          (k(null), who && canOpenPerson(who) && setPerson(who));
        }}
        onChanged={m}
      />
    </WhosOffCatalog>
  );
}
