import { useResource } from "../hooks/useResource.jsx";
import { requestEnd } from "../utils/requestHelpers.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Button } from "../components/ui/Button.jsx";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useRequestModal } from "../components/requests/RequestModalProvider.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import React from "react";
import { useVersion } from "../context/DataVersionContext.jsx";
import { useBumpVersion } from "../context/DataVersionContext.jsx";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { requestStart } from "../utils/requestHelpers.jsx";
import { SegmentedControl } from "../components/ui/SegmentedControl.jsx";
import { ChevronDown as Vendor_ChevronDown } from "lucide-react";
import { CardSkeleton } from "../components/ui/Skeleton.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { CalendarRange as Vendor_CalendarRange } from "lucide-react";
import { RequestCard } from "../components/requests/RequestCard.jsx";
export const REQUEST_TABS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "denied",
    label: "Rejected",
  },
  {
    value: "past",
    label: "Past",
  },
];
export function requestBucket(e, t) {
  return e.status === "pending"
    ? "pending"
    : e.status === "denied"
      ? "denied"
      : e.status === "approved" && requestEnd(e) >= t
        ? "approved"
        : "past";
}
export function matchesRequestTab(e, t, n) {
  return t === "all" || requestBucket(e, n) === t;
}
export function requestCounts(e, t) {
  return e.reduce((n, r) => ((n[requestBucket(r, t)] += 1), n), {
    pending: 0,
    approved: 0,
    denied: 0,
    past: 0,
  });
}
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger",
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);
  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm?.();
      onClose?.();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={confirmVariant} disabled={saving} onClick={confirm}>
            {saving ? "Saving…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-ink">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function MyRequests() {
  const e = useCurrentUser(),
    t = useToday(),
    { requestsForUser: requestsForUser, cancelRequest: cancelRequest } =
      useDataSource(),
    { openRequest: openRequest } = useRequestModal(),
    i = useToast(),
    [o, c] = React.useState("all"),
    l = useVersion(),
    u = useBumpVersion(),
    [h, d] = React.useState("recent"),
    [f, p] = React.useState(null);
  const { data: y = null } = useResource(
    ["my-requests"],
    () => requestsForUser(e.id),
    true,
  );
  void 0;
  const k = React.useMemo(() => requestCounts(y ?? [], t), [y, t]),
    v = React.useMemo(
      () =>
        [...(y ?? []).filter((j) => matchesRequestTab(j, o, t))].sort((j, S) =>
          h === "recent"
            ? j.submittedAt < S.submittedAt
              ? 1
              : -1
            : toDateLocal(requestStart(j)) - toDateLocal(requestStart(S)),
        ),
      [y, o, h, t],
    ),
    m = y === null,
    x = (y == null ? void 0 : y.length) ?? 0,
    b = m
      ? "Loading your time off…"
      : x === 0
        ? "Nothing on the books yet."
        : `${k.pending} pending · ${k.approved} approved · ${k.denied} rejected`,
    N = {
      all: {
        title: "No requests yet",
        description: "Every request you submit shows up here.",
      },
      pending: {
        title: "No pending requests",
        description: "You're all set. Nothing is waiting on a decision.",
      },
      approved: {
        title: "No approved requests",
        description: "Requests your manager approves show here.",
      },
      denied: {
        title: "No rejected requests",
        description: "Requests your manager could not approve show here.",
      },
      past: {
        title: "Nothing in the past yet",
        description:
          "Time off you have already taken, and anything you cancelled, shows here.",
      },
    };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{"Your time off"}</p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {"My Requests"}
          </h1>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">{b}</p>
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          options={REQUEST_TABS}
          value={o}
          onChange={c}
          size="sm"
        />
        {!m && v.length > 0 && (
          <div className="relative">
            <select
              value={h}
              onChange={(_) => d(_.target.value)}
              aria-label="Sort requests"
              className="h-9 cursor-pointer appearance-none rounded-btn border border-line bg-card pl-3 pr-8 text-sm font-semibold text-ink-soft transition-colors hover:bg-panel focus:border-accent focus:outline-none"
            >
              <option value="recent">{"Newest first"}</option>
              <option value="date">{"By start date"}</option>
            </select>
            <Vendor_ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
            />
          </div>
        )}
      </div>
      {m ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({
            length: 4,
          }).map((_, j) => (
            <CardSkeleton lines={2} key={j} />
          ))}
        </div>
      ) : x === 0 ? (
        <div className="rounded-card border border-line bg-card shadow-card">
          <EmptyState
            icon={Vendor_CalendarRange}
            title="No requests yet"
            description="Ready for some time off? Submit your first request."
            className="py-16"
            action={
              <Button variant="primary" onClick={() => openRequest()}>
                {"Request time off"}
              </Button>
            }
          />
        </div>
      ) : v.length === 0 ? (
        <div className="rounded-card border border-line bg-card shadow-card">
          <EmptyState
            icon={Vendor_CalendarRange}
            title={N[o].title}
            description={N[o].description}
            className="py-14"
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {v.map((_, j) => (
            <div
              style={{
                "--i": j,
              }}
              className="stagger-in h-full"
              key={_.id}
            >
              <RequestCard request={_} onCancel={p} />
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!f}
        onClose={() => p(null)}
        onConfirm={async () => {
          await cancelRequest(f.id);
          i("Request cancelled.", {
            kind: "info",
          });
        }}
        title="Cancel this request?"
        message="This will withdraw your pending request. You can always submit a new one."
        confirmLabel="Cancel request"
      />
    </div>
  );
}
