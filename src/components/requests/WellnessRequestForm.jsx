import React from "react";
import { Leaf as Vendor_Leaf } from "lucide-react";
import { Minus as Vendor_Minus } from "lucide-react";
import { Plus as Vendor_Plus } from "lucide-react";
import { useCurrentUser } from "../../context/AuthContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useResource } from "../../hooks/useResource.jsx";
import { useToast } from "../ui/Toast.jsx";
import { Button } from "../ui/Button.jsx";
import { firstName } from "../../utils/constants.jsx";
import { WELLNESS_MAX_DAYS } from "../../utils/constants.jsx";
import { useWellnessType } from "./Wellness.jsx";
import { wellnessCardStyle } from "./Wellness.jsx";
import { dayCount } from "./Wellness.jsx";
export function WellnessRequestForm({
  onSubmitted: onSubmitted,
  onCancel: onCancel,
}) {
  const user = useCurrentUser(),
    wellnessType = useWellnessType(),
    {
      balanceFor: balanceFor,
      grantFor: grantFor,
      submitWellnessRequest: submitWellnessRequest,
    } = useDataSource(),
    toast = useToast(),
    [days, setDays] = React.useState(1),
    [note, setNote] = React.useState(""),
    [saving, setSaving] = React.useState(!1);
  const { data: balance = null } = useResource(
    ["wellness-balance", user.id, wellnessType?.id],
    async () => {
      const [remaining, grant] = await Promise.all([
        balanceFor(user.id, wellnessType.id),
        grantFor(user.id, wellnessType.id),
      ]);
      return {
        remaining: remaining ?? 0,
        grant: grant ?? 0,
      };
    },
    !!wellnessType,
  );
  const step = (delta) =>
    setDays((n) => Math.min(WELLNESS_MAX_DAYS, Math.max(1, n + delta)));
  async function submit(event) {
    if ((event.preventDefault(), saving || !wellnessType)) return;
    setSaving(!0);
    try {
      await submitWellnessRequest({
        days,
        note,
      });
      toast(`Wellness request sent for ${dayCount(days)}.`, {
        kind: "success",
      });
      onSubmitted == null || onSubmitted();
    } catch (error) {
      toast(error.message, {
        kind: "error",
      });
    } finally {
      setSaving(!1);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div
        className="flex items-start gap-3 rounded-card border px-3.5 py-3"
        style={wellnessCardStyle}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-success-ink"
          style={{
            background: "color-mix(in oklab, var(--c-success) 16%, var(--c-card))",
          }}
        >
          <Vendor_Leaf size={17} strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {"Extra wellness days"}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">
            {"Once approved, the days are added to your "}
            {(wellnessType == null ? void 0 : wellnessType.name) ??
              "Wellness Day"}
            {" balance for this year."}
          </p>
        </div>
      </div>
      <section>
        <h3 className="eyebrow mb-2.5">{"How many days?"}</h3>
        <div
          role="group"
          aria-label="Number of wellness days"
          className="flex items-center justify-between gap-3 rounded-card border border-line bg-card p-3 shadow-card"
        >
          <StepButton
            icon={Vendor_Minus}
            label="One day fewer"
            onClick={() => step(-1)}
            disabled={days <= 1}
          />
          <p className="flex min-w-0 flex-col items-center" aria-live="polite">
            <span className="text-[27px] font-bold leading-none tabular text-ink">
              {days}
            </span>
            <span className="mt-1 text-[11px] font-medium text-ink-mute">
              {days === 1 ? "day" : "days"}
            </span>
          </p>
          <StepButton
            icon={Vendor_Plus}
            label="One day more"
            onClick={() => step(1)}
            disabled={days >= WELLNESS_MAX_DAYS}
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-mute tabular">
          {balance ? (
            <>
              {"You have "}
              <b className="font-semibold text-ink-soft">{balance.remaining}</b>
              {" of "}
              {balance.grant}
              {" left. After approval, "}
              <b className="font-semibold text-success-ink">
                {balance.remaining + days}
              </b>
              {" of "}
              {balance.grant + days}
              {"."}
            </>
          ) : (
            "Checking your wellness balance…"
          )}
          {days >= WELLNESS_MAX_DAYS &&
            ` Up to ${WELLNESS_MAX_DAYS} days per request.`}
        </p>
      </section>
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="eyebrow">{"Note for your approver"}</h3>
          <span className="text-[11px] text-ink-mute">{"Optional"}</span>
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Add context for your approver..."
          className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
        />
      </section>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="min-w-0 text-sm">
          <span className="text-ink-soft">
            <span className="font-bold tabular text-ink">{days}</span>
            {" wellness day"}
            {days === 1 ? "" : "s"}
            {","}{" "}
            <span className="text-ink-mute">
              {"as "}
              {firstName(user == null ? void 0 : user.name)}
            </span>
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {"Cancel"}
            </Button>
          )}
          <Button
            type="submit"
            variant="success"
            disabled={saving || !wellnessType}
          >
            {saving ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </div>
    </form>
  );
}
export function StepButton({
  icon: LocalComponent_icon,
  label: label,
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="press grid h-11 w-11 shrink-0 place-items-center rounded-btn border border-line bg-card text-ink-soft shadow-card transition-colors hover:bg-panel hover:text-ink disabled:pointer-events-none disabled:opacity-50"
      {...rest}
    >
      <LocalComponent_icon size={18} strokeWidth={2.25} />
    </button>
  );
}
