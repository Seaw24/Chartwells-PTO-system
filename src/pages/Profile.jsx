import { useResource } from "../hooks/useResource.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useRequestModal } from "../components/requests/RequestModalProvider.jsx";
import { useVersion } from "../context/DataVersionContext.jsx";
import React from "react";
import { overseesAllTeams } from "../utils/organization.jsx";
import { teamsForUser } from "../utils/organization.jsx";
import { requestDays } from "../utils/requestHelpers.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { isGodAdmin } from "../utils/constants.jsx";
import { RolePill } from "../components/ui/RolePill.jsx";
import { Mail as Vendor_Mail } from "lucide-react";
import { Button } from "../components/ui/Button.jsx";
import { CalendarPlus as Vendor_CalendarPlus } from "lucide-react";
import { UserTeams } from "../utils/organization.jsx";
import { BalanceCards } from "../components/requests/BalanceCards.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { CalendarX as Vendor_CalendarX } from "lucide-react";
import { requestPrimaryTypeId } from "../utils/requestHelpers.jsx";
import { isWellnessGrant } from "../utils/requestHelpers.jsx";
import { PtoTypeIcon } from "../components/ui/PtoTypeIcon.jsx";
import { requestTypeLabel } from "../utils/requestHelpers.jsx";
import { requestRangeLabel } from "../utils/requestHelpers.jsx";
import { StatusChip } from "../components/requests/RequestDetailModal.jsx";
import { TeamDrawer } from "../components/team/TeamDrawer.jsx";
export function Profile() {
  const {
      ptoTypes: ptoTypes,
      ptoTypeById: ptoTypeById,
    } = useCatalog(),
    r = useCurrentUser(),
    s = useOrg(),
    { requestsForUser: requestsForUser, normalDaysOffFor: normalDaysOffFor } =
      useDataSource(),
    { openRequest: openRequest } = useRequestModal(),
    l = useVersion(),
    [d, f] = React.useState(null);
  const { data: u = null } = useResource(
    ["profile"],
    async () => {
      const [history, normalDaysOff] = await Promise.all([
        requestsForUser(r.id),
        normalDaysOffFor(r.id),
      ]);
      return {
        history,
        normalDaysOff,
      };
    },
    true,
  );
  void 0;
  const p = overseesAllTeams(s, r),
    y = teamsForUser(s, r).length,
    g = p
      ? "You have oversight of every team."
      : y === 0
        ? "You're not assigned to a team yet."
        : `You're on ${y} team${y === 1 ? "" : "s"} — open one to see who's in it.`;
  if (u === null)
    return <div className="p-6 text-sm text-ink-mute">{"Loading…"}</div>;
  const { history: history, normalDaysOff: normalDaysOff } = u,
    m = history
      .filter((x) => x.status === "approved")
      .reduce((x, b) => x + requestDays(b, normalDaysOff), 0);
  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-card bg-navy shadow-raised">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 160% at 88% -40%, rgba(255,255,255,0.14), transparent 52%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 150% at -2% 130%, color-mix(in oklch, var(--c-accent) 34%, transparent), transparent 55%)",
          }}
        />
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar
              name={r.name}
              id={r.id}
              size="xl"
              className="shrink-0 shadow-card ring-2 ring-white/20"
            />
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold tracking-tight text-navy-fg">
                {r.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                {isGodAdmin(r.role) && (
                  <RolePill role={r.role} size="xs" onDark={!0} />
                )}
                <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-navy-fg-mute">
                  <Vendor_Mail size={13} className="shrink-0" />
                  <span className="truncate">{r.email}</span>
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => openRequest()}
            className="shrink-0 self-start sm:self-auto"
          >
            <Vendor_CalendarPlus size={17} />
            {" Request Time Off"}
          </Button>
        </div>
      </div>
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-ink">
            {p ? "Teams you oversee" : "Your teams"}
          </h2>
          <p className="mt-0.5 text-xs text-ink-mute">{g}</p>
        </div>
        <UserTeams user={r} variant="cards" onOpenTeam={f} />
      </section>
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">{"Your balances"}</h2>
          {m > 0 && (
            <p className="text-xs text-ink-mute">
              <span className="tabular font-semibold text-ink-soft">{m}</span>
              {" day"}
              {m === 1 ? "" : "s"}
              {" taken this year"}
            </p>
          )}
        </div>
        <BalanceCards userId={r.id} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold text-ink">{"Request history"}</h2>
        {history.length === 0 ? (
          <EmptyState
            icon={Vendor_CalendarX}
            title="No requests yet"
            description="Your time-off history will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
            <ul className="divide-y divide-line-soft">
              {history.map((x) => {
                var j, S;
                const N = ptoTypeById(requestPrimaryTypeId(x)),
                  _ = (N == null ? void 0 : N.color) || "var(--c-ink-mute)";
                return (
                  <li
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-panel/50"
                    key={x.id}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-btn"
                      style={{
                        background: `color-mix(in oklch, ${_} 12%, var(--c-card))`,
                        color: _,
                      }}
                    >
                      <PtoTypeIcon
                        typeId={requestPrimaryTypeId(x)}
                        size={16}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {requestTypeLabel(x, ptoTypes)}
                      </p>
                      <p className="text-xs text-ink-mute">
                        {requestRangeLabel(x)}
                      </p>
                    </div>
                    <span className="text-xs text-ink-mute tabular">
                      {isWellnessGrant(x)
                        ? `+${x.grantDays}`
                        : requestDays(x, normalDaysOff)}
                      {"d"}
                    </span>
                    <StatusChip status={x.status} size="xs" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
      <TeamDrawer teamId={d} open={!!d} onClose={() => f(null)} viewer={r} />
    </div>
  );
}
