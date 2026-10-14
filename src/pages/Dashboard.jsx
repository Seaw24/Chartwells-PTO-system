import { useResource } from "../hooks/useResource.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useRequestModal } from "../components/requests/RequestModalProvider.jsx";
import React from "react";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useBumpVersion } from "../context/DataVersionContext.jsx";
import { startOfWeek as Vendor_startOfWeek } from "date-fns";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { addDays as Vendor_addDays } from "date-fns";
import { toISO } from "../utils/dateHelpers.jsx";
import { DashboardView } from "../components/dashboard/DashboardView.jsx";
import { buildCoverageWeek } from "../components/dashboard/Coverage.jsx";
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
      balanceFor: balanceFor,
      grantFor: grantFor,
      usedFor: usedFor,
      requestsForUser: requestsForUser,
      coverageForRange: coverageForRange,
      whoIsOff: whoIsOff,
      teamDirectory: teamDirectory,
    } = useDataSource(),
    {
      users: users,
      teams: teams,
      ptoTypes: ptoTypes,
      balanceTypes: balanceTypes,
      holidays: holidays,
    } = useCatalog(),
    { openRequest: openRequest } = useRequestModal(),
    [g, k] = React.useState(null),
    v = useVersion(),
    m = useBumpVersion();
  const { data: p = null } = useResource(
    ["dashboard", t, ptoTypes.map((type) => type.id)],
    async () => {
      const start = Vendor_startOfWeek(toDateLocal(t), {
        weekStartsOn: 0,
      });
      const [
        requests,
        offRequests,
        directory,
        myRequests,
        coverageRows,
        balances,
      ] = await Promise.all([
        getRequests(),
        whoIsOff(),
        teamDirectory(),
        requestsForUser(e.id),
        coverageForRange(toISO(start), toISO(Vendor_addDays(start, 6))),
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
        coverageRows,
        balances,
      };
    },
    true,
  );
  if ((void 0, !p)) return <DashboardView loading={!0} />;
  // Everyone sees every team's time off, as HR does; see mergeWhosOff.
  const merged = mergeWhosOff({
      requests: p.requests,
      users: users,
      offRequests: p.offRequests,
      directory: p.directory,
    }),
    x = buildCoverageWeek({
      todayIso: t,
      users: merged.users,
      requests: merged.requests,
      teams: teams,
      holidays: holidays,
      coverageRows: p.coverageRows,
    }),
    b = (j) => {
      var S;
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
      .map(b);
  return (
    <WhosOffCatalog users={merged.users}>
      <DashboardView
        activeUser={e}
        week={x}
        personal={{
          balances: p.balances,
          upcoming: N,
          pending: _,
        }}
        minRequestIso={t}
        onStartRequest={(j) => {
          j >= t &&
            openRequest({
              start: j,
              end: j,
            });
        }}
        onBarClick={(j) => j.viewOnly || k(j.requestId)}
      />
      <RequestDetailModal
        requestId={g}
        open={!!g}
        onClose={() => k(null)}
        onChanged={m}
      />
    </WhosOffCatalog>
  );
}
