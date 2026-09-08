import { useResource } from "../../hooks/useResource.jsx";
import { Clock as Vendor_Clock } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
import { X as Vendor_X } from "lucide-react";
import { Ban as Vendor_Ban } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { useCurrentUser } from "../../context/AuthContext.jsx";
import { useToday } from "../../data/today.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useBumpVersion } from "../../context/DataVersionContext.jsx";
import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import React from "react";
import { requestTypeIds } from "../../utils/requestHelpers.jsx";
import { requestLines } from "../../utils/requestHelpers.jsx";
import { requestDays } from "../../utils/requestHelpers.jsx";
import { findTeamConflicts } from "../../utils/policyEngine.jsx";
import { canDecideRequest } from "../../utils/requestHelpers.jsx";
import { firstName } from "../../utils/constants.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { History as Vendor_History } from "lucide-react";
import { UserTeams } from "../../utils/organization.jsx";
import { requestTypeLabel } from "../../utils/requestHelpers.jsx";
import { requestRangeLabel } from "../../utils/requestHelpers.jsx";
import { timeAgo } from "../../utils/dateHelpers.jsx";
import { fmtDateTime } from "../../utils/dateHelpers.jsx";
import { formatDateRange } from "../../utils/dateHelpers.jsx";
import { lineDays } from "../../utils/requestHelpers.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { Button } from "../ui/Button.jsx";
import { CalendarSearch as Vendor_CalendarSearch } from "lucide-react";
export function WS(e = "") {
  const t = e.trim().split(/\s+/).filter(Boolean);
  return t.length
    ? t.length === 1
      ? t[0].slice(0, 2).toUpperCase()
      : (t[0][0] + t[t.length - 1][0]).toUpperCase()
    : "";
}
export const $p = {
  pending: {
    label: "Pending",
    icon: Vendor_Clock,
    fg: "var(--c-warning-ink)",
    bg: "var(--c-warning-soft)",
  },
  approved: {
    label: "Approved",
    icon: Vendor_Check,
    fg: "var(--c-success-ink)",
    bg: "var(--c-success-soft)",
  },
  denied: {
    label: "Denied",
    icon: Vendor_X,
    fg: "var(--c-danger-ink)",
    bg: "var(--c-danger-soft)",
  },
  cancelled: {
    label: "Cancelled",
    icon: Vendor_Ban,
    fg: "var(--c-ink-mute)",
    bg: "var(--c-panel)",
  },
};
export function StatusChip({ status: status, size = "sm", className = "" }) {
  const r = $p[status] || $p.pending,
    LocalComponent_s = r.icon,
    i =
      size === "xs"
        ? "px-1.5 py-0.5 text-[11px] gap-1"
        : "px-2.5 py-1 text-xs gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${i} ${className}`}
      style={{
        color: r.fg,
        background: r.bg,
      }}
    >
      <LocalComponent_s
        size={size === "xs" ? 11 : 13}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      {r.label}
    </span>
  );
}
export function PtoTypePill({ typeId: typeId, size = "sm", className = "" }) {
  const { ptoTypeById: ptoTypeById } = useCatalog(),
    s = ptoTypeById(typeId);
  if (!s) return null;
  const i =
    size === "xs"
      ? "px-1.5 py-0.5 text-[11px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${i} ${className}`}
      style={{
        color: `color-mix(in oklch, ${s.color} 72%, var(--c-ink))`,
        background: `color-mix(in oklch, ${s.color} 12%, var(--c-card))`,
        borderColor: `color-mix(in oklch, ${s.color} 30%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: s.color,
        }}
        aria-hidden="true"
      />
      {s.name}
    </span>
  );
}
export function RequestDetailModal({
  requestId: requestId,
  open: open,
  onClose: onClose,
  onOpenPerson: onOpenPerson,
  onChanged: onChanged,
}) {
  const {
      users: users,
      ptoTypes: ptoTypes,
      userById: userById,
      ptoTypeById: ptoTypeById,
    } = useCatalog(),
    u = useCurrentUser(),
    h = useToday(),
    {
      getRequests: getRequests,
      balanceFor: balanceFor,
      grantFor: grantFor,
      normalDaysOffFor: normalDaysOffFor,
      approveRequest: approveRequest,
      denyRequest: denyRequest,
    } = useDataSource(),
    v = useToast(),
    m = useBumpVersion(),
    x = Vendor_useNavigate(),
    [_, j] = React.useState(!1),
    [S, R] = React.useState("");
  const { data: b = null } = useResource(
    ["request-detail", requestId],
    async () => {
      const requests = await getRequests();
      const req = requests.find((row) => row.id === requestId);
      if (!req)
        return {
          requestId,
          requests,
          req: null,
        };
      const types = requestTypeIds(req);
      const [rows, normalDaysOff] = await Promise.all([
        Promise.all(
          types.map(async (type) => ({
            type,
            balance: await balanceFor(req.userId, type),
            grant: await grantFor(req.userId, type),
          })),
        ),
        normalDaysOffFor(req.userId),
      ]);
      return {
        requestId,
        requests,
        req,
        normalDaysOff,
        balances: Object.fromEntries(
          rows.map((row) => [row.type, row.balance]),
        ),
        grants: Object.fromEntries(rows.map((row) => [row.type, row.grant])),
      };
    },
    open && !!requestId,
  );
  if (
    (React.useEffect(() => {
      (j(!1), R(""));
    }, [requestId, open]),
    void 0,
    !b || !b.req || (open && b.requestId !== requestId))
  )
    return null;
  const {
      requests: requests,
      req: req,
      balances: balances,
      grants: grants,
      normalDaysOff: normalDaysOff,
    } = b,
    D = userById(req.userId),
    q = requestLines(req),
    Z = requestTypeIds(req),
    P = requestDays(req, normalDaysOff),
    $ = userById(req.decidedBy),
    U = findTeamConflicts({
      draft: req,
      requests: requests,
      users: users,
      selfId: req.userId,
      teamId: D == null ? void 0 : D.team,
    }),
    X = req.status === "pending" && canDecideRequest(u, req, users),
    V = () => {
      (onClose == null || onClose(), x(`/calendar?req=${req.id}`));
    },
    he = () => {
      approveRequest(req.id).then(() => {
        (m(),
          v(`Approved ${firstName(D == null ? void 0 : D.name)}'s request.`, {
            kind: "success",
          }),
          onChanged == null || onChanged(),
          onClose == null || onClose());
      });
    },
    K = () => {
      S.trim() &&
        denyRequest(req.id, S.trim()).then(() => {
          (m(),
            v(`Denied ${firstName(D == null ? void 0 : D.name)}'s request.`, {
              kind: "info",
            }),
            onChanged == null || onChanged(),
            onClose == null || onClose());
        });
    };
  return (
    <Modal open={open} onClose={onClose} title="Request details" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              onOpenPerson == null
                ? void 0
                : onOpenPerson(D == null ? void 0 : D.id)
            }
            className="group/p flex items-center gap-3 text-left"
            title="View time-off history"
          >
            <Avatar
              name={D == null ? void 0 : D.name}
              id={D == null ? void 0 : D.id}
              size="md"
            />
            <div>
              <p className="inline-flex items-center gap-1 font-bold text-ink transition-colors group-hover/p:text-accent-ink">
                {D == null ? void 0 : D.name}
                {onOpenPerson && (
                  <Vendor_History
                    size={13}
                    className="text-ink-mute opacity-0 transition-opacity group-hover/p:opacity-100"
                  />
                )}
              </p>
              <div className="mt-0.5">
                <UserTeams user={D} variant="inline" />
              </div>
            </div>
          </button>
          <StatusChip status={req.status} />
        </div>
        <dl className="space-y-2.5 rounded-card border border-line bg-surface/60 px-4 py-3 text-sm">
          <Component_ss label="Request">
            <span className="font-medium text-ink">
              {requestTypeLabel(req, ptoTypes)}
            </span>
          </Component_ss>
          <Component_ss label="Dates">
            <span className="font-medium text-ink">
              {requestRangeLabel(req)}
            </span>
          </Component_ss>
          <Component_ss label="Length">
            <span className="tabular text-ink">
              {P}
              {" charged day"}
              {P === 1 ? "" : "s"}
            </span>
          </Component_ss>
          <Component_ss label="Balance">
            <span className="text-ink-soft">
              {Z.map((A) => {
                const B = ptoTypeById(A);
                return (
                  <span className="ml-2 first:ml-0" key={A}>
                    <b className="text-ink tabular">
                      {balances[A]}
                      {"/"}
                      {grants[A]}
                    </b>{" "}
                    {B == null ? void 0 : B.name.toLowerCase()}
                  </span>
                );
              })}
            </span>
          </Component_ss>
          <Component_ss label="Submitted">
            <span className="text-ink-soft">{timeAgo(req.submittedAt, h)}</span>
          </Component_ss>
          {$ && req.decidedAt && (
            <Component_ss
              label={req.status === "approved" ? "Approved by" : "Decided by"}
            >
              <span className="text-ink-soft">
                {$.name}
                {" · "}
                {fmtDateTime(req.decidedAt)}
              </span>
            </Component_ss>
          )}
        </dl>
        {q.length > 1 && (
          <div className="space-y-1.5 rounded-card border border-line bg-card px-3 py-2 text-sm">
            {q.map((A, B) => (
              <div
                className="flex items-center justify-between gap-3"
                key={`${A.type}-${A.start}-${B}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PtoTypePill typeId={A.type} size="xs" />
                  <span className="truncate text-ink-soft">
                    {formatDateRange(A.start, A.end)}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular text-ink-mute">
                  {lineDays(A, normalDaysOff)}
                  {"d"}
                </span>
              </div>
            ))}
          </div>
        )}
        <div
          className={`flex items-center gap-2 rounded-card px-3 py-2 text-xs ${U.length ? "bg-warning-soft text-ink-soft" : "bg-panel text-ink-mute"}`}
        >
          <Vendor_Users
            size={14}
            className={U.length ? "text-warning-ink" : "text-ink-mute"}
          />
          {U.length === 0
            ? "No teammates are off during these dates."
            : `${U.map((A) => firstName(A.user.name)).join(", ")} also off then.`}
        </div>
        {req.note && (
          <p className="rounded-card border border-line-soft bg-card px-3 py-2 text-sm italic text-ink-soft">
            {"“"}
            {req.note}
            {"”"}
          </p>
        )}
        {req.status === "denied" && req.denialReason && (
          <p className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            <b>{"Denied:"}</b> {req.denialReason}
          </p>
        )}
        {_ ? (
          <div className="space-y-2 animate-fade-up">
            <textarea
              value={S}
              onChange={(A) => R(A.target.value)}
              onKeyDown={(A) => {
                (A.metaKey || A.ctrlKey) && A.key === "Enter" && K();
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
                  (j(!1), R(""));
                }}
              >
                {"Cancel"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!S.trim()}
                onClick={K}
              >
                {"Confirm denial"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button variant="outline" size="sm" onClick={V}>
              <Vendor_CalendarSearch size={15} />
              {" See in calendar"}
            </Button>
            {X && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={() => j(!0)}>
                  <Vendor_X size={15} />
                  {" Deny"}
                </Button>
                <Button variant="success" size="sm" onClick={he}>
                  <Vendor_Check size={15} />
                  {" Approve"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
export const Component_ss = ({ label: label, children: children }) => (
  <div className="flex items-start justify-between gap-4">
    <dt className="text-ink-mute">{label}</dt>
    <dd className="text-right">{children}</dd>
  </div>
);
