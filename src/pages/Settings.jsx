import { Plus as Vendor_Plus } from "lucide-react";
import React from "react";
import { Button } from "../components/ui/Button.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useDataSource } from "../data/dataSource.jsx";
import { useToast } from "../components/ui/Toast.jsx";
import { friendlyError } from "../utils/errors.jsx";
import { Settings as Vendor_Settings } from "lucide-react";
import { DEMO_MODE } from "../data/dataSource.jsx";
import { PtoTypeIcon } from "../components/ui/PtoTypeIcon.jsx";
import { Trash2 as Vendor_Trash2 } from "lucide-react";
import { ConfirmDialog } from "./MyRequests.jsx";
import { CalendarRange as Vendor_CalendarRange } from "lucide-react";
import { fmtShort } from "../utils/dateHelpers.jsx";
import { Pencil as Vendor_Pencil } from "lucide-react";
import { toDateLocal } from "../utils/dateHelpers.jsx";
import { format as Vendor_format } from "date-fns";
import { useCurrentUser } from "../context/AuthContext.jsx";
import { useToday } from "../data/today.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { isGodAdmin } from "../utils/constants.jsx";
import { teamInitials } from "../utils/organization.jsx";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { TeamEditor } from "../utils/organization.jsx";
import { UserPlus as Vendor_UserPlus } from "lucide-react";
import { Avatar } from "../components/ui/Avatar.jsx";
import { KeyRound as Vendor_KeyRound } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
import { Copy as Vendor_Copy } from "lucide-react";
import { DEFAULT_NORMAL_DAYS_OFF } from "../utils/constants.jsx";
import { Search as Vendor_Search } from "lucide-react";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Users as Vendor_Users } from "lucide-react";
import { Drawer } from "../components/ui/Drawer.jsx";
import { RolePill } from "../components/ui/RolePill.jsx";
import { WEEKDAY_LABELS } from "../utils/dateHelpers.jsx";
import { ShieldCheck as Vendor_ShieldCheck } from "lucide-react";
import { TEAM_ROLES } from "../utils/orgRoles.jsx";
import { X as Vendor_X } from "lucide-react";
import { Minus as Vendor_Minus } from "lucide-react";
import { Zap as Vendor_Zap } from "lucide-react";
import { Tag as Vendor_Tag } from "lucide-react";
import { CalendarHeart as Vendor_CalendarHeart } from "lucide-react";
import { CalendarOff as Vendor_CalendarOff } from "lucide-react";
import { UserCog as Vendor_UserCog } from "lucide-react";
import { useSearchParams as Vendor_useSearchParams } from "react-router-dom";
import { ROLE_META } from "../utils/constants.jsx";
import { canApprove } from "../utils/constants.jsx";
export const settings_$e = [
  {
    id: "vacation",
    name: "Vacation",
    icon: "🌴",
    color: "#4071B6",
    defaultDays: 10,
    restrictedDates: !0,
    advanceNotice: 14,
  },
  {
    id: "sick",
    name: "Sick",
    icon: "🤒",
    color: "#C46A2B",
    defaultDays: 5,
    restrictedDates: !1,
    allowBackdate: !0,
    advanceNotice: 0,
  },
  {
    id: "bereavement",
    name: "Bereavement",
    icon: "💐",
    color: "#6B7280",
    defaultDays: 5,
    restrictedDates: !1,
    advanceNotice: 0,
  },
  {
    id: "wellness",
    name: "Wellness Day",
    icon: "🧘",
    color: "#2E8B73",
    defaultDays: 2,
    restrictedDates: !1,
    advanceNotice: 2,
  },
  {
    id: "floating",
    name: "Floating Holiday",
    icon: "🎈",
    color: "#8A5DB5",
    defaultDays: 1,
    restrictedDates: !1,
    advanceNotice: 7,
  },
];
export const settings_rt = (t) => settings_$e.find((i) => i.id === t);
export function AddSettingsDialog({
  label: label,
  title: title,
  icon: LocalComponent_icon = Vendor_Plus,
  variant = "dashed",
  size = "sm",
  children: children,
}) {
  const [p, u] = React.useState(!1),
    l = () => u(!1);
  return (
    <>
      {variant === "primary" ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => u(!0)}
          aria-haspopup="dialog"
        >
          <LocalComponent_icon size={15} /> {label}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => u(!0)}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1.5 rounded-btn border border-dashed border-line px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors duration-[120ms] hover:border-accent hover:text-accent-ink"
        >
          <LocalComponent_icon size={15} /> {label}
        </button>
      )}
      <Modal open={p} onClose={l} title={title || label} size={size}>
        {p &&
          children({
            close: l,
          })}
      </Modal>
    </>
  );
}
export function SettingsForm({
  hint: hint,
  onSubmit: onSubmit,
  onCancel: onCancel,
  submitLabel = "Add",
  canSubmit = !0,
  children: children,
}) {
  const [p, u] = React.useState(!1);
  return (
    <form
      onSubmit={async (l) => {
        if ((l.preventDefault(), !(!canSubmit || p))) {
          u(!0);
          try {
            await onSubmit();
          } finally {
            u(!1);
          }
        }
      }}
      className="space-y-4"
    >
      {hint && <p className="-mt-1 text-sm text-ink-mute">{hint}</p>}
      {children}
      <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {"Cancel"}
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit || p}>
          {p ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
export const settings_de =
  "w-full rounded-btn border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-mute transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";
export function SettingsField({ label: label, children: children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
        {label}
      </span>
      {children}
    </label>
  );
}
export function SettingsInput(t) {
  return <input type="text" className={settings_de} {...t} />;
}
export function SettingsTextarea(t) {
  return <input type="date" className={`${settings_de} tabular`} {...t} />;
}
export function NumberInput(t) {
  return (
    <input type="number" min={0} className={`${settings_de} tabular`} {...t} />
  );
}
export function SettingsSelect({ children: children, ...i }) {
  return (
    <select className={`${settings_de} cursor-pointer pr-8`} {...i}>
      {children}
    </select>
  );
}
export const settings_dt = [
  "#4071B6",
  "#C46A2B",
  "#6B7280",
  "#2E8B73",
  "#8A5DB5",
  "#B65D8A",
  "#3E8E9E",
  "#A8823C",
];
export function ColorPicker({ value: value, onChange: onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {settings_dt.map((n) => {
        const a = value === n;
        return (
          <button
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Colour ${n}`}
            aria-pressed={a}
            className={`h-8 w-8 rounded-full transition-transform ${a ? "ring-2 ring-ink/50 ring-offset-2 ring-offset-card" : "hover:scale-110"}`}
            style={{
              background: n,
            }}
            key={n}
          />
        );
      })}
    </div>
  );
}
export function LabeledToggle({
  label: label,
  hint: hint,
  checked: checked,
  onChange: onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs leading-snug text-ink-mute">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-success" : "bg-line"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}
export function PtoTypesSettings() {
  const t = useCatalog(),
    i = useDataSource(),
    n = useToast(),
    a = () =>
      t.settingsPtoTypes.map((m) => ({
        ...m,
        active: m.isActive !== !1,
        windows: t.dateRules
          .filter((g) => g.typeId === m.id)
          .map((g) => ({
            start: g.start,
            end: g.end,
          })),
      })),
    [o, r] = React.useState(a);
  React.useEffect(() => {
    r(a());
  }, [t.version]);
  const [p, u] = React.useState(null),
    l = p ? o.find((m) => m.id === p) : null,
    [h, s] = React.useState(null),
    d = h ? o.find((m) => m.id === h) : null,
    f = (m, g) =>
      r((A) =>
        A.map((N) =>
          N.id === m
            ? {
                ...N,
                ...g,
              }
            : N,
        ),
      ),
    x = async (m) => {
      try {
        return (
          await i.savePtoType({
            ...m,
            isActive: m.active,
          }),
          t.reload(),
          n(`${m.name} saved.`),
          !0
        );
      } catch (g) {
        return (
          n(friendlyError(g), {
            kind: "error",
          }),
          !1
        );
      }
    },
    j = async (m) => {
      const g = o.find((A) => A.id === m);
      try {
        (await i.retirePtoType(m),
          f(m, {
            active: !1,
          }),
          t.reload(),
          n(`${(g == null ? void 0 : g.name) || "PTO type"} deactivated.`));
      } catch (A) {
        n(friendlyError(A), {
          kind: "error",
        });
      }
    },
    k = async (m) => {
      try {
        return (
          await i.savePtoType({
            ...m,
            isActive: !0,
          }),
          t.reload(),
          n(`${m.name.trim()} added.`),
          !0
        );
      } catch (N) {
        return (
          n(friendlyError(N), {
            kind: "error",
          }),
          !1
        );
      }
      const A = `${
        m.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "type"
      }-${Date.now().toString(36)}`;
      return (
        r((N) => [
          ...N,
          {
            id: A,
            name: m.name.trim(),
            color: m.color,
            defaultDays: m.defaultDays,
            advanceNotice: m.advanceNotice,
            restrictedDates: m.restrictedDates,
            windows: m.restrictedDates ? m.windows : [],
            active: !0,
          },
        ]),
        !0
      );
    };
  return (
    <div className="space-y-4">
      <SettingsHeader
        title="PTO types"
        desc="Allowances, availability, and whether dates are restricted to set windows."
      />
      <div className="overflow-x-auto rounded-card border border-line bg-card scrollbar-slim">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/60 text-left text-xs font-bold uppercase tracking-wide text-ink-mute">
              <th className="px-4 py-2.5">{"Type"}</th>
              <th className="px-4 py-2.5 text-center">{"Days / year"}</th>
              {DEMO_MODE}
              <th className="px-4 py-2.5">{"Restricted windows"}</th>
              <th className="px-4 py-2.5 text-center">{"Active"}</th>
              <th className="px-4 py-2.5">
                <span className="sr-only">{"Actions"}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {/* Deactivated types sink to the bottom; the sort is stable, so each group keeps its order. */}
            {[...o]
              .sort((m, g) => Number(!m.active) - Number(!g.active))
              .map((m) => (
              <tr className={m.active ? "" : "opacity-50"} key={m.id}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <PtoTypeIcon typeId={m.id} color={m.color} size={10} />{" "}
                    {m.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <DayStepper
                    value={m.defaultDays}
                    onChange={(g) =>
                      f(m.id, {
                        defaultDays: g,
                      })
                    }
                    onBlur={() => x(o.find((g) => g.id === m.id))}
                  />
                </td>
                {DEMO_MODE}
                <td className="px-4 py-3">
                  <BookingWindowButton type={m} onManage={() => u(m.id)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <ToggleSwitch
                    on={m.active}
                    onChange={(g) => {
                      const A = {
                        ...m,
                        active: g,
                      };
                      (f(m.id, {
                        active: g,
                      }),
                        x(A));
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => s(m.id)}
                    aria-label={`Deactivate ${m.name}`}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-btn text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger-ink"
                  >
                    <Vendor_Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddSettingsDialog label="Add PTO type" title="New PTO type">
        {({ close: close }) => (
          <NewPtoTypeForm
            onAdd={async (g) => {
              (await k(g)) && close();
            }}
            onCancel={close}
          />
        )}
      </AddSettingsDialog>
      <Modal
        open={!!l}
        onClose={() => u(null)}
        title={l ? `Restricted windows · ${l.name}` : "Restricted windows"}
        size="md"
      >
        {l && (
          <div className="space-y-4">
            <LabeledToggle
              label={`Restrict ${l.name} to set windows`}
              hint="When on, this type can only be requested inside the date windows below."
              checked={l.restrictedDates}
              onChange={(m) =>
                f(l.id, {
                  restrictedDates: m,
                })
              }
            />
            {l.restrictedDates && (
              <div className="space-y-2.5 border-t border-line pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="eyebrow">{"Date windows"}</span>
                  <span className="text-[11px] tabular text-ink-mute">
                    {l.windows.length}{" "}
                    {l.windows.length === 1 ? "window" : "windows"}
                  </span>
                </div>
                <BookingWindowsEditor
                  windows={l.windows}
                  onChange={(m) =>
                    f(l.id, {
                      windows: m,
                    })
                  }
                />
              </div>
            )}
            <div className="flex justify-end border-t border-line pt-4">
              <Button
                variant="navy"
                onClick={async () => {
                  (await x(l)) && u(null);
                }}
              >
                {"Done"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!d}
        onClose={() => s(null)}
        onConfirm={() => j(h)}
        title="Deactivate PTO type?"
        message={
          d
            ? `Deactivate “${d.name}”? People can no longer request it; existing requests keep their history.`
            : ""
        }
        confirmLabel="Deactivate type"
      />
    </div>
  );
}
export function BookingWindowButton({ type: type, onManage: onManage }) {
  const n = type.restrictedDates,
    a = type.windows || [];
  return (
    <button
      type="button"
      onClick={onManage}
      className="group -mx-1.5 flex flex-wrap items-center gap-1 rounded-btn px-1.5 py-1 text-left transition-colors hover:bg-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {n ? (
        a.length > 0 ? (
          <>
            <Vendor_CalendarRange
              size={13}
              className="shrink-0 text-warning-ink"
            />
            {a.slice(0, 2).map((o) => (
              <span
                className="rounded bg-panel px-1.5 py-0.5 text-xs text-ink-soft tabular"
                key={`${o.start}-${o.end}`}
              >
                {fmtShort(o.start)}
                {"–"}
                {fmtShort(o.end)}
              </span>
            ))}
            {a.length > 2 && (
              <span className="text-xs text-ink-mute">
                {"+"}
                {a.length - 2}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs font-semibold text-warning-ink">
            {"Set windows"}
          </span>
        )
      ) : (
        <span className="text-xs text-ink-mute">{"Any date"}</span>
      )}
      <Vendor_Pencil
        size={12}
        className="ml-0.5 shrink-0 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  );
}
export function BookingWindowsEditor({ windows: windows, onChange: onChange }) {
  const n = () =>
      onChange([
        ...windows,
        {
          start: "2026-07-01",
          end: "2026-07-07",
        },
      ]),
    a = (r, p) =>
      onChange(
        windows.map((u, l) =>
          l === r
            ? {
                ...u,
                ...p,
              }
            : u,
        ),
      ),
    o = (r) => onChange(windows.filter((p, u) => u !== r));
  return (
    <div className="space-y-2">
      {windows.length === 0 && (
        <p className="rounded-btn border border-dashed border-line px-3 py-2.5 text-center text-xs text-ink-mute">
          {"No windows yet. This type allows any date until you add one."}
        </p>
      )}
      {windows.map((r, p) => {
        const u = r.start && r.end && r.end < r.start;
        return (
          <div className="space-y-1" key={p}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SettingsTextarea
                  value={r.start}
                  onChange={(l) =>
                    a(p, {
                      start: l.target.value,
                    })
                  }
                />
              </div>
              <span className="shrink-0 text-ink-mute">{"→"}</span>
              <div className="flex-1">
                <SettingsTextarea
                  value={r.end}
                  onChange={(l) =>
                    a(p, {
                      end: l.target.value,
                    })
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => o(p)}
                aria-label="Remove window"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger-ink"
              >
                <Vendor_Trash2 size={15} />
              </button>
            </div>
            {u && (
              <p className="text-[11px] text-danger-ink">
                {"End must be on or after the start."}
              </p>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={n}
        className="inline-flex items-center gap-1.5 rounded-btn border border-dashed border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent-ink"
      >
        <Vendor_Plus size={14} />
        {" Add window"}
      </button>
    </div>
  );
}
export function NewPtoTypeForm({ onAdd: onAdd, onCancel: onCancel }) {
  const [n, a] = React.useState(""),
    [o, r] = React.useState("#4071B6"),
    [p, u] = React.useState(10),
    [l, h] = React.useState(0),
    [s, d] = React.useState(!1),
    [f, x] = React.useState([]),
    j = n.trim().length > 0;
  return (
    <SettingsForm
      submitLabel="Add type"
      canSubmit={j}
      onCancel={onCancel}
      onSubmit={() =>
        onAdd({
          name: n,
          color: o,
          defaultDays: p,
          advanceNotice: l,
          restrictedDates: s,
          windows: f,
        })
      }
    >
      <SettingsField label="Name">
        <SettingsInput
          value={n}
          onChange={(k) => a(k.target.value)}
          placeholder="e.g. Jury Duty"
        />
      </SettingsField>
      <SettingsField label="Colour">
        <ColorPicker value={o} onChange={r} />
      </SettingsField>
      <div className="grid gap-3 grid-cols-1">
        <SettingsField label="Days / year">
          <NumberInput
            value={p}
            onChange={(k) => u(Number(k.target.value) || 0)}
          />
        </SettingsField>
        {DEMO_MODE}
      </div>
      <LabeledToggle
        label="Restrict to set windows"
        hint="Only allow dates inside the windows you set below."
        checked={s}
        onChange={d}
      />
      {s && (
        <div className="space-y-2.5 rounded-card border border-line bg-surface/50 p-3">
          <span className="eyebrow">{"Date windows"}</span>
          <BookingWindowsEditor windows={f} onChange={x} />
        </div>
      )}
    </SettingsForm>
  );
}
export function SettingsHeader({ title: title, desc: desc }) {
  return (
    <div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="text-sm text-ink-mute">{desc}</p>
    </div>
  );
}
export function DayStepper({
  value: value,
  onChange: onChange,
  onBlur: onBlur,
}) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(a) => onChange(Number(a.target.value))}
      onBlur={onBlur}
      className="w-16 rounded-btn border border-line bg-card px-2 py-1 text-center font-mono text-sm text-ink focus:border-accent focus:outline-none"
    />
  );
}
export function ToggleSwitch({ on: on, onChange: onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative inline-block h-5 w-9 shrink-0 rounded-full align-middle transition-colors ${on ? "bg-success" : "bg-line"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}
export function HolidaySettings() {
  const t = useCatalog(),
    i = useDataSource(),
    n = useToast(),
    [a, o] = React.useState(t.holidays),
    [r, p] = React.useState(!0),
    [u, l] = React.useState(1);
  React.useEffect(() => {
    o(t.holidays);
  }, [t.version, t.holidays]);
  const h = (j, k) =>
      o((m) =>
        m.map((g, A) =>
          A === j
            ? {
                ...g,
                ...k,
              }
            : g,
        ),
      ),
    s = async (j) => {
      if (!j.date || !j.name.trim()) return !1;
      try {
        return (await i.saveHoliday(j), t.reload(), n(`${j.name} saved.`), !0);
      } catch (k) {
        return (
          n(friendlyError(k), {
            kind: "error",
          }),
          !1
        );
      }
    },
    d = async (j) => {
      const k = a[j];
      try {
        (await i.deleteHoliday(k.id), t.reload(), n(`${k.name} removed.`));
      } catch (m) {
        n(friendlyError(m), {
          kind: "error",
        });
        return;
      }
      o((m) => m.filter((g, A) => A !== j));
    },
    f = async (j) => !!(await s(j)),
    x = Array.from(
      {
        length: 12,
      },
      (j, k) => a.some((m) => toDateLocal(m.date).getMonth() === k),
    );
  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Holidays"
        desc="Company holidays. Each one opens a 30-day window to book one Holiday Day Off."
      />
      <div className="flex gap-1 rounded-card border border-line bg-card p-3">
        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map(
          (j, k) => (
            <div className="flex-1 text-center" key={k}>
              <div
                className={`h-7 rounded ${x[k] ? "bg-warning-soft" : "bg-panel"}`}
              />
              <span className="text-[10px] text-ink-mute">{j}</span>
            </div>
          ),
        )}
      </div>
      <div className="rounded-card border border-line bg-card divide-y divide-line-soft">
        {a.map((j, k) => (
          <div className="flex items-center gap-3 px-4 py-2.5" key={k}>
            <input
              type="date"
              value={j.date}
              onChange={(m) =>
                h(k, {
                  date: m.target.value,
                })
              }
              onBlur={() => s(a[k])}
              className="rounded-btn border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
            />
            <input
              value={j.name}
              onChange={(m) =>
                h(k, {
                  name: m.target.value,
                })
              }
              onBlur={() => s(a[k])}
              className="flex-1 rounded-btn border border-transparent px-2 py-1 text-sm font-medium text-ink hover:border-line focus:border-accent focus:outline-none"
            />
            <span className="hidden text-xs text-ink-mute sm:inline">
              {Vendor_format(toDateLocal(j.date), "EEE")}
            </span>
            <button
              onClick={() => d(k)}
              className="text-ink-mute hover:text-danger"
              aria-label="Remove holiday"
            >
              <Vendor_Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <AddSettingsDialog label="Add holiday" title="New holiday">
        {({ close: close }) => (
          <NewHolidayForm
            onAdd={async (k) => {
              (await f(k)) && close();
            }}
            onCancel={close}
          />
        )}
      </AddSettingsDialog>
      {DEMO_MODE}
    </div>
  );
}
export function NewHolidayForm({ onAdd: onAdd, onCancel: onCancel }) {
  const [n, a] = React.useState("2026-01-01"),
    [o, r] = React.useState(""),
    p = o.trim().length > 0 && !!n;
  return (
    <SettingsForm
      submitLabel="Add holiday"
      canSubmit={p}
      onCancel={onCancel}
      onSubmit={() =>
        onAdd({
          date: n,
          name: o.trim(),
        })
      }
    >
      <SettingsField label="Date">
        <SettingsTextarea value={n} onChange={(u) => a(u.target.value)} />
      </SettingsField>
      <SettingsField label="Name">
        <SettingsInput
          value={o}
          onChange={(u) => r(u.target.value)}
          placeholder="e.g. Company Retreat"
        />
      </SettingsField>
    </SettingsForm>
  );
}
export function BlackoutSettings() {
  const t = useCatalog(),
    i = useDataSource(),
    n = useToast(),
    [a, o] = React.useState(t.blackouts);
  React.useEffect(() => {
    o(t.blackouts);
  }, [t.version, t.blackouts]);
  const r = (s, d) =>
      o((f) =>
        f.map((x, j) =>
          j === s
            ? {
                ...x,
                ...d,
              }
            : x,
        ),
      ),
    p = async (s) => {
      if (!s.start || !s.end || s.end < s.start || !s.reason.trim()) return !1;
      try {
        return (
          await i.saveBlackout(s),
          t.reload(),
          n(`${s.reason} saved.`),
          !0
        );
      } catch (d) {
        return (
          n(friendlyError(d), {
            kind: "error",
          }),
          !1
        );
      }
    },
    u = async (s) => {
      const d = a[s];
      try {
        (await i.deleteBlackout(d.id), t.reload(), n(`${d.reason} removed.`));
      } catch (f) {
        n(friendlyError(f), {
          kind: "error",
        });
        return;
      }
      o((f) => f.filter((x, j) => j !== s));
    },
    l = async (s) => !!(await p(s)),
    h = (s) =>
      s === "all"
        ? "all types"
        : (Array.isArray(s) ? s : [s])
            .map((f) => {
              var x;
              return (x = t.ptoTypeById(f)) == null ? void 0 : x.name;
            })
            .filter(Boolean)
            .join(", ") || "selected types";
  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Blackout dates"
        desc="Periods when time off cannot be requested. Shown with hatching on the calendar."
      />
      <div className="space-y-3">
        {a.map((s, d) => (
          <div
            className="rounded-card border border-line bg-card p-4"
            key={s.id ?? d}
          >
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="date"
                value={s.start}
                onChange={(f) =>
                  r(d, {
                    start: f.target.value,
                  })
                }
                onBlur={() => p(a[d])}
                className="rounded-btn border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <span className="text-ink-mute">{"→"}</span>
              <input
                type="date"
                value={s.end}
                onChange={(f) =>
                  r(d, {
                    end: f.target.value,
                  })
                }
                onBlur={() => p(a[d])}
                className="rounded-btn border border-line bg-card px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
              />
              <input
                value={s.reason}
                onChange={(f) =>
                  r(d, {
                    reason: f.target.value,
                  })
                }
                onBlur={() => p(a[d])}
                className="min-w-[10rem] flex-1 rounded-btn border border-line bg-card px-2.5 py-1 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <button
                onClick={() => u(d)}
                className="text-ink-mute hover:text-danger"
                aria-label="Remove blackout"
              >
                <Vendor_Trash2 size={16} />
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="hatch-danger h-4 flex-1 rounded border border-danger/30" />
              <span className="text-[11px] font-medium text-ink-mute">
                {fmtShort(s.start)}
                {"–"}
                {fmtShort(s.end)}
                {" · affects "}
                {h(s.types)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <AddSettingsDialog
        label="Add blackout period"
        title="New blackout period"
      >
        {({ close: close }) => (
          <NewBlackoutForm
            ptoTypes={t.balanceTypes}
            onAdd={async (d) => {
              (await l(d)) && close();
            }}
            onCancel={close}
          />
        )}
      </AddSettingsDialog>
    </div>
  );
}
export function NewBlackoutForm({
  ptoTypes: ptoTypes,
  onAdd: onAdd,
  onCancel: onCancel,
}) {
  const [a, o] = React.useState("2026-07-01"),
    [r, p] = React.useState("2026-07-07"),
    [u, l] = React.useState(""),
    [h, s] = React.useState("all"),
    d = !!a && !!r && r < a,
    f = u.trim().length > 0 && !!a && !!r && !d;
  return (
    <SettingsForm
      submitLabel="Add blackout"
      canSubmit={f}
      onCancel={onCancel}
      onSubmit={() =>
        onAdd({
          start: a,
          end: r,
          reason: u.trim(),
          types: h,
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <SettingsField label="Start">
          <SettingsTextarea value={a} onChange={(x) => o(x.target.value)} />
        </SettingsField>
        <SettingsField label="End">
          <SettingsTextarea value={r} onChange={(x) => p(x.target.value)} />
        </SettingsField>
      </div>
      {d && (
        <p className="text-xs text-danger-ink">
          {"End date must be on or after the start date."}
        </p>
      )}
      <SettingsField label="Reason">
        <SettingsInput
          value={u}
          onChange={(x) => l(x.target.value)}
          placeholder="e.g. Move-in weekend"
        />
      </SettingsField>
      <SettingsField label="Applies to">
        <SettingsSelect value={h} onChange={(x) => s(x.target.value)}>
          <option value="all">{"All PTO types"}</option>
          {ptoTypes.map((x) => (
            <option value={x.id} key={x.id}>
              {x.name}
              {" only"}
            </option>
          ))}
        </SettingsSelect>
      </SettingsField>
    </SettingsForm>
  );
}
export const settings_je = (t) => `${t} ${t === 1 ? "person" : "people"}`;
export function TeamSettings({
  openTeamId = null,
  onConsumeOpenTeam: onConsumeOpenTeam,
}) {
  const n = useToast(),
    a = useCurrentUser(),
    o = useToday(),
    r = useOrg(),
    p = isGodAdmin(a.role),
    [u, l] = React.useState(null),
    h = (b) => p || r.isTeamAdmin(a.id, b),
    s = p ? r.teams : r.teams.filter((b) => r.isTeamAdmin(a.id, b.id)),
    // God Admins see and manage everything, so they are never assigned to a team - including
    // yourself. add_team_memberships rejects them, so never offer one in the picker.
    d = r.people.filter((b) => b.orgRole !== "god_admin");
  React.useEffect(() => {
    openTeamId &&
      (s.some((b) => b.id === openTeamId) &&
        l({
          mode: "edit",
          teamId: openTeamId,
        }),
      onConsumeOpenTeam == null || onConsumeOpenTeam());
  }, [openTeamId]);
  const f = (b) =>
      n(friendlyError(b, "That change could not be saved."), {
        kind: "error",
      }),
    x = async ({ name: name, description: description, members: members }) => {
      try {
        (await r.createTeam(
          {
            name: name,
            description: description,
            members: members,
          },
          a.id,
          o,
        ),
          n(
            `Team “${name}” created${members.length ? ` with ${settings_je(members.length)}` : ""}.`,
          ),
          l(null));
      } catch (O) {
        f(O);
      }
    },
    j = async (b) => {
      const w = r.teamById(b);
      try {
        (await r.deleteTeam(b),
          n(`Team “${(w == null ? void 0 : w.name) || "Team"}” deleted.`),
          l(null));
      } catch (T) {
        f(T);
      }
    },
    k = async (b, w) => {
      var T;
      try {
        (await r.addMembersWithRoles(b, w, a.id, o),
          w.length &&
            n(
              `Added ${settings_je(w.length)} to ${((T = r.teamById(b)) == null ? void 0 : T.name) || "the team"}.`,
            ));
      } catch (O) {
        f(O);
      }
    },
    m = async (b, w, T) => {
      var H;
      const O = r.membersOf(b).find((B) => B.id === w);
      if (!(!O || O.role === T))
        try {
          await r.setMembershipRole(b, w, T);
          const B = r.personById(w);
          n(
            `${(B == null ? void 0 : B.name) || "Person"} is now ${T === "admin" ? "an Admin" : "an Employee"} of ${((H = r.teamById(b)) == null ? void 0 : H.name) || "the team"}.`,
          );
        } catch (B) {
          f(B);
        }
    },
    g = async (b, w) => {
      try {
        (await r.renameTeam(b, w), n("Team name saved."));
      } catch (T) {
        f(T);
      }
    },
    A = async (b, w) => {
      try {
        (await r.describeTeam(b, w), n("Team description saved."));
      } catch (T) {
        f(T);
      }
    },
    N = async (b, w) => {
      try {
        (await r.removeMembership(b, w), n("Team membership removed."));
      } catch (T) {
        f(T);
      }
    },
    D = u != null && u.teamId ? r.teamById(u.teamId) : null,
    _ = (u == null ? void 0 : u.mode) === "create" ? p : D ? h(D.id) : !1;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <SettingsHeader
          title="Teams"
          desc={
            p
              ? "Groups that admins manage. Each request routes to its team's admins."
              : "The teams you administer. Manage who is on them and their role."
          }
        />
        {p && (
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              l({
                mode: "create",
              })
            }
            className="shrink-0"
          >
            <Vendor_Plus size={15} />
            {" New team"}
          </Button>
        )}
      </div>
      {s.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-sm text-ink-mute">
          {p
            ? "No teams yet. Create one to route requests to its admins."
            : "You are not an admin of any team yet."}
        </p>
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2">
          {s.map((b) => {
            const w = r.membersOf(b.id),
              T = w.filter((O) => O.role === "admin");
            return (
              <button
                type="button"
                onClick={() =>
                  l({
                    mode: "edit",
                    teamId: b.id,
                  })
                }
                className="group flex w-full items-center gap-3 rounded-card border border-line bg-card p-4 text-left transition-shadow duration-[180ms] hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                key={b.id}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-btn bg-panel text-[13px] font-bold tracking-tight text-ink-soft">
                  {teamInitials(b.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">
                    {b.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-mute">
                    <span className="tabular">{w.length}</span>{" "}
                    {w.length === 1 ? "member" : "members"}
                    {T.length > 0 && (
                      <>
                        {" · "}
                        <span className="tabular">{T.length}</span>
                        {" admin"}
                        {T.length === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
                </div>
                <PeopleAvatars people={w} />
                <Vendor_ChevronRight
                  size={16}
                  className="shrink-0 text-ink-mute transition-colors group-hover:text-ink"
                />
              </button>
            );
          })}
        </div>
      )}
      <TeamEditor
        open={!!u}
        mode={(u == null ? void 0 : u.mode) || "edit"}
        team={D}
        members={D ? r.membersOf(D.id) : []}
        assignablePeople={d}
        currentUser={a}
        today={o}
        personById={r.personById}
        canManage={_}
        canDelete={p && (u == null ? void 0 : u.mode) === "edit"}
        onClose={() => l(null)}
        onRename={(b) => D && g(D.id, b)}
        onDescription={(b) => D && A(D.id, b)}
        onAddMembers={(b) => D && k(D.id, b)}
        onRemoveMember={(b) => D && N(D.id, b)}
        onChangeRole={(b, w) => D && m(D.id, b, w)}
        onDelete={() => D && j(D.id)}
        onCreate={x}
      />
    </div>
  );
}
export function PeopleAvatars({ people: people, max = 4 }) {
  if (people.length === 0)
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-line text-ink-mute">
        <Vendor_UserPlus size={14} />
      </span>
    );
  const n = people.slice(0, max),
    a = people.length - n.length;
  return (
    <span className="flex shrink-0 -space-x-2">
      {n.map((o) => (
        <Avatar name={o.name} id={o.id} size="sm" ring={!0} key={o.id} />
      ))}
      {a > 0 && (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-panel text-[11px] font-semibold text-ink-soft ring-2 ring-card">
          {"+"}
          {a}
        </span>
      )}
    </span>
  );
}
export function TemporaryPasswordCard({
  name: name,
  email: email,
  password: password,
  onDone: onDone,
}) {
  const [o, r] = React.useState(!1),
    [p, u] = React.useState(!1);
  async function l() {
    try {
      (await navigator.clipboard.writeText(`Email: ${email}
Temporary password: ${password}`),
        u(!1),
        r(!0),
        window.setTimeout(() => r(!1), 1800));
    } catch {
      (r(!1), u(!0));
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-success-soft text-success-ink">
          <Vendor_KeyRound size={19} />
        </span>
        <div>
          <h3 className="font-semibold text-ink">
            {"Temporary password ready"}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-mute">
            {"Give these details to "}
            {name}
            {". They sign in once, then create their own password."}
          </p>
        </div>
      </div>
      <dl className="overflow-hidden rounded-card border border-line bg-panel/45">
        <div className="border-b border-line-soft px-4 py-3">
          <dt className="eyebrow">{"Email"}</dt>
          <dd className="mt-1 break-all text-sm font-semibold text-ink">
            {email}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="eyebrow">{"Temporary password"}</dt>
          <dd className="mt-1 break-all text-lg font-bold tracking-wider tabular text-ink">
            {password}
          </dd>
        </div>
      </dl>
      <p className="rounded-btn bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning-ink">
        {
          "This password is shown only here. If it is lost, generate a new one from the employee profile."
        }
      </p>
      {p && (
        <p role="alert" className="text-xs font-medium text-danger-ink">
          {
            "Copy did not work. Select the email and password above and copy them manually."
          }
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          {"Done"}
        </Button>
        <Button type="button" variant="primary" onClick={l}>
          {o ? <Vendor_Check size={16} /> : <Vendor_Copy size={16} />}
          {o ? "Copied" : "Copy sign-in details"}
        </Button>
      </div>
    </div>
  );
}
export function PeopleSettings() {
  const t = useCurrentUser(),
    i = useToday(),
    n = useToast(),
    a = useOrg(),
    o = useCatalog(),
    r = o.balanceTypes,
    {
      getGrants: getGrants,
      setGrant: setGrant,
      setNormalDaysOff: setNormalDaysOff,
    } = useDataSource(),
    [h, s] = React.useState(null),
    [d, f] = React.useState(""),
    [x, j] = React.useState(null),
    [k, m] = React.useState(!1),
    g = isGodAdmin(t.role),
    A = React.useMemo(
      () => new Set(g ? a.teams.map((c) => c.id) : a.adminTeamIds(t.id)),
      [g, a, t.id],
    ),
    N = (c) => A.has(c),
    D = (c) => {
      (m(!1), j(c));
    },
    _ = () => {
      (m(!1), j(null));
    };
  React.useEffect(() => {
    let c = !0;
    async function v() {
      const S = await getGrants();
      if (!c) return;
      const $ = {};
      a.people.forEach((M) => {
        (($[M.id] = {}),
          r.forEach((U) => {
            var fe;
            $[M.id][U.id] =
              ((fe = S.find(
                (ye) => ye.userId === M.id && ye.typeId === U.id,
              )) == null
                ? void 0
                : fe.amount) ?? U.defaultDays;
          }));
      });
      const P = {};
      a.people.forEach((M) => {
        P[M.id] = M.normalDaysOff ?? DEFAULT_NORMAL_DAYS_OFF;
      });
      const I = {};
      (a.people.forEach((M) => {
        I[M.id] = M.isActive !== !1;
      }),
        s({
          grants: $,
          normalDaysOff: P,
          active: I,
        }));
    }
    return (
      v(),
      () => {
        c = !1;
      }
    );
  }, [o.version, a.people, r]);
  const b = (c) =>
      n(friendlyError(c, "That change could not be saved."), {
        kind: "error",
      }),
    w = async (c, v) => {
      try {
        (await a.setOrgRole(c, v), n("Organization role saved."));
      } catch (S) {
        b(S);
      }
    },
    T = async (c, v, S) => {
      try {
        (await a.addMembers(v, [c], t.id, i, S), n("Team membership added."));
      } catch ($) {
        b($);
      }
    },
    O = async (c, v) => {
      try {
        (await a.removeMembership(v, c), n("Team membership removed."));
      } catch (S) {
        b(S);
      }
    },
    H = async (c, v, S) => {
      try {
        (await a.setMembershipRole(v, c, S), n("Team role saved."));
      } catch ($) {
        b($);
      }
    },
    B = async (c, v, S) => {
      var I;
      const $ = Math.max(0, Number(S) || 0),
        P = ((I = h.grants[c]) == null ? void 0 : I[v]) ?? 0;
      s((M) => ({
        ...M,
        grants: {
          ...M.grants,
          [c]: {
            ...M.grants[c],
            [v]: $,
          },
        },
      }));
      try {
        await setGrant(c, v, $);
      } catch (M) {
        (s((U) => ({
          ...U,
          grants: {
            ...U.grants,
            [c]: {
              ...U.grants[c],
              [v]: P,
            },
          },
        })),
          b(M));
      }
    },
    R = async (c, v) => {
      const S = h.normalDaysOff[c] || [],
        $ = S.includes(v)
          ? S.filter((P) => P !== v)
          : [...S, v].sort((P, I) => P - I);
      s((P) => ({
        ...P,
        normalDaysOff: {
          ...P.normalDaysOff,
          [c]: $,
        },
      }));
      try {
        await setNormalDaysOff(c, $);
      } catch (P) {
        (s((I) => ({
          ...I,
          normalDaysOff: {
            ...I.normalDaysOff,
            [c]: S,
          },
        })),
          b(P));
      }
    },
    F = async (c) => {
      const v = h.active[c] !== !1,
        S = !v;
      s(($) => ({
        ...$,
        active: {
          ...$.active,
          [c]: S,
        },
      }));
      try {
        (await a.setProfileActive(c, S),
          n(S ? "Account activated." : "Account deactivated."));
      } catch ($) {
        (s((P) => ({
          ...P,
          active: {
            ...P.active,
            [c]: v,
          },
        })),
          b($));
      }
    },
    Y = async (c) => {
      try {
        return await a.addPerson({
          name: c.name,
          email: c.email,
          orgRole: c.godAdmin ? "god_admin" : "member",
          teamId: c.godAdmin ? null : c.teamId || null,
          teamRole: c.teamRole,
        });
      } catch (v) {
        return (b(v), null);
      }
    },
    qe = async (c) => {
      try {
        return await a.resetTemporaryPassword(c);
      } catch (v) {
        return (b(v), null);
      }
    },
    Ge = async (c) => {
      const v = a.personById(c);
      try {
        (await a.removePerson(c),
          DEMO_MODE ||
            s((S) => ({
              ...S,
              active: {
                ...S.active,
                [c]: !1,
              },
            })),
          n(
            DEMO_MODE
              ? `${(v == null ? void 0 : v.name) || "Person"} removed from the directory.`
              : `${(v == null ? void 0 : v.name) || "Employee"} deactivated. Their history is preserved.`,
          ),
          _());
      } catch (S) {
        b(S);
      }
    };
  if (h === null) return <PeopleSettingsSkeleton />;
  const He = g
      ? a.people
      : a.people.filter((c) => a.teamsOf(c.id).some((v) => N(v.team.id))),
    be = d.trim().toLowerCase(),
    // Deactivated people sink to the bottom as soon as they are toggled off.
    re = He.filter(
      (c) =>
        c.name.toLowerCase().includes(be) || c.email.toLowerCase().includes(be),
    ).sort(
      (c, v) => Number(h.active[c.id] === !1) - Number(h.active[v.id] === !1),
    ),
    C = x ? a.personById(x) : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SettingsHeader
          title="People"
          desc={
            g
              ? "Manage org roles, team membership, days off, and PTO grants for everyone."
              : "The people on the teams you run. Manage their membership, days off, and grants."
          }
        />
        <div className="flex gap-2">
          {g && DEMO_MODE}
          {g && (
            <AddSettingsDialog
              label="Add employee"
              title="Add employee"
              variant="primary"
              icon={Vendor_UserPlus}
            >
              {({ close: close }) => (
                <NewEmployeeForm
                  god={g}
                  teams={a.teams.filter((v) => N(v.id))}
                  defaultTeamId=""
                  onAdd={Y}
                  onCancel={close}
                />
              )}
            </AddSettingsDialog>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Vendor_Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute"
          />
          <input
            value={d}
            onChange={(c) => f(c.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-btn border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <span className="shrink-0 text-xs font-medium tabular text-ink-mute">
          {re.length} {re.length === 1 ? "person" : "people"}
        </span>
      </div>
      {re.length === 0 ? (
        <div className="rounded-card border border-line bg-card">
          <EmptyState
            icon={Vendor_Users}
            title={d ? "No matches" : "No people yet"}
            description={
              d
                ? `Nothing matches “${d.trim()}”.`
                : "Add an employee to get started."
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-card">
          {re.map((c) => (
            <PersonListRow
              person={c}
              teams={a.teamsOf(c.id)}
              active={h.active[c.id] !== !1}
              daysOff={h.normalDaysOff[c.id]}
              grants={h.grants[c.id]}
              ptoTypes={r}
              onOpen={() => D(c.id)}
              onToggleActive={() => F(c.id)}
              key={c.id}
            />
          ))}
        </ul>
      )}
      <Drawer
        open={!!C}
        onClose={_}
        title={C == null ? void 0 : C.name}
        subtitle={C == null ? void 0 : C.email}
        icon={C && <Avatar name={C.name} id={C.id} size="md" />}
        footer={
          C && g ? (
            k ? (
              <div className="flex w-full items-center justify-between gap-3">
                <p className="text-xs font-medium text-danger-ink">{`Deactivate ${C == null ? void 0 : C.name}? Their history will be preserved.`}</p>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => m(!1)}>
                    {"Cancel"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => Ge(C.id)}>
                    {"Deactivate"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                  onClick={() => m(!0)}
                >
                  <Vendor_Trash2 size={15} /> {"Deactivate"}
                </Button>
                <Button variant="navy" size="sm" onClick={_}>
                  {"Done"}
                </Button>
              </div>
            )
          ) : (
            <div className="flex w-full justify-end">
              <Button variant="navy" size="sm" onClick={_}>
                {"Done"}
              </Button>
            </div>
          )
        }
      >
        {C && h && (
          <PersonSettingsDrawer
            person={C}
            god={g}
            teams={a.teamsOf(C.id)}
            allTeams={a.teams}
            canManageTeam={N}
            daysOff={h.normalDaysOff[C.id] || []}
            grants={h.grants[C.id] || {}}
            ptoTypes={r}
            active={h.active[C.id] !== !1}
            onSetOrgRole={(c) => w(C.id, c)}
            onAddTeam={(c, v) => T(C.id, c, v)}
            onRemoveTeam={(c) => O(C.id, c)}
            onRoleChange={(c, v) => H(C.id, c, v)}
            onToggleActive={() => F(C.id)}
            onToggleDay={(c) => R(C.id, c)}
            onUpdateGrant={(c, v) => B(C.id, c, v)}
            canResetPassword={g && C.id !== t.id}
            onResetPassword={() => qe(C.id)}
          />
        )}
      </Drawer>
    </div>
  );
}
export function PersonListRow({
  person: person,
  teams: teams,
  active: active,
  daysOff: daysOff,
  grants: grants,
  ptoTypes: ptoTypes,
  onOpen: onOpen,
  onToggleActive: onToggleActive,
}) {
  const l = ptoTypes.reduce(
      (s, d) => s + ((grants == null ? void 0 : grants[d.id]) ?? 0),
      0,
    ),
    h = person.orgRole === "god_admin";
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(s) => {
          (s.key === "Enter" || s.key === " ") &&
            (s.preventDefault(), onOpen());
        }}
        className={`group flex cursor-pointer items-center gap-4 px-4 py-3 outline-none transition-colors hover:bg-panel/50 focus-visible:bg-panel/50 ${active ? "" : "opacity-55"}`}
      >
        <Avatar name={person.name} id={person.id} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-ink">
              {person.name}
            </span>
            {h && <RolePill role="god_admin" size="xs" />}
          </div>
          <span className="block truncate text-xs text-ink-mute">
            {person.email}
          </span>
        </div>
        <div className="hidden w-52 shrink-0 lg:block">
          <span className="eyebrow block">{"Teams"}</span>
          <PersonTeamTags teams={teams} isGod={h} />
        </div>
        <div className="hidden shrink-0 2xl:block">
          <span className="eyebrow block">{"Days off"}</span>
          <NormalDaysLabel days={daysOff} />
        </div>
        <div className="hidden w-16 shrink-0 text-right sm:block">
          <span className="eyebrow block">{"PTO / yr"}</span>
          <span className="mt-0.5 block text-[13px] font-semibold tabular text-ink">
            {l}
            {"d"}
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-2"
          onClick={(s) => s.stopPropagation()}
        >
          <PersonField active={active} onChange={onToggleActive} />
          <Vendor_ChevronRight
            size={18}
            className="text-ink-mute transition-colors group-hover:text-ink"
          />
        </div>
      </div>
    </li>
  );
}
export function PersonTeamTags({ teams: teams, isGod: isGod }) {
  if (isGod)
    return (
      <span className="mt-0.5 block text-[13px] text-ink-soft">
        {"All teams"}
      </span>
    );
  if (!teams.length)
    return (
      <span className="mt-0.5 block text-[13px] text-ink-mute">
        {"No team"}
      </span>
    );
  const n = teams.slice(0, 2),
    a = teams.length - n.length;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {n.map(({ team: team, role: role }) => (
        <span
          className="inline-flex items-center gap-1 rounded-chip border border-line bg-surface/60 px-1.5 py-0.5 text-[11px] text-ink-soft"
          key={team.id}
        >
          <span className="truncate font-medium text-ink">{team.name}</span>
          <span className="text-ink-mute">{"·"}</span>
          <span
            className={
              role === "admin"
                ? "font-semibold text-accent-ink"
                : "text-ink-mute"
            }
          >
            {role === "admin" ? "Admin" : "Member"}
          </span>
        </span>
      ))}
      {a > 0 && (
        <span className="text-[11px] font-medium tabular text-ink-mute">
          {"+"}
          {a}
        </span>
      )}
    </div>
  );
}
export function PersonField({
  active: active,
  onChange: onChange,
  showLabel = !0,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={
        active ? "Active, click to deactivate" : "Inactive, click to activate"
      }
      onClick={onChange}
      className="inline-flex items-center gap-3"
    >
      <span
        className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors ${active ? "bg-success" : "bg-line"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${active ? "translate-x-4" : "translate-x-0"}`}
        />
      </span>
      {showLabel && (
        <span
          className={`hidden w-[3.75rem] text-left text-xs font-semibold sm:inline-block ${active ? "text-ink-soft" : "text-ink-mute"}`}
        >
          {active ? "Active" : "Inactive"}
        </span>
      )}
    </button>
  );
}
export function NormalDaysLabel({ days = [] }) {
  const i = new Set(days);
  return (
    <div className="mt-1 flex gap-0.5">
      {WEEKDAY_LABELS.map((n, a) => (
        <span
          title={`${n}${i.has(a) ? ": off" : ""}`}
          className={`grid h-4 w-4 place-items-center rounded text-[9px] font-bold ${i.has(a) ? "bg-accent-soft text-accent-ink" : "bg-panel text-ink-mute"}`}
          key={n}
        >
          {n[0]}
        </span>
      ))}
    </div>
  );
}
export function PersonSettingsDrawer({
  person: person,
  god: god,
  teams: teams,
  allTeams: allTeams,
  canManageTeam: canManageTeam,
  daysOff: daysOff,
  grants: grants,
  ptoTypes: ptoTypes,
  active: active,
  onSetOrgRole: onSetOrgRole,
  onAddTeam: onAddTeam,
  onRemoveTeam: onRemoveTeam,
  onRoleChange: onRoleChange,
  onToggleActive: onToggleActive,
  onToggleDay: onToggleDay,
  onUpdateGrant: onUpdateGrant,
  canResetPassword: canResetPassword,
  onResetPassword: onResetPassword,
}) {
  const A = new Set(daysOff),
    N = ptoTypes.reduce(
      (R, F) => R + ((grants == null ? void 0 : grants[F.id]) ?? 0),
      0,
    ),
    D = person.orgRole === "god_admin",
    [_, b] = React.useState(!1),
    [w, T] = React.useState(!1),
    [O, H] = React.useState(null);
  async function B() {
    T(!0);
    try {
      const R = await onResetPassword();
      R != null && R.temporaryPassword && (H(R.temporaryPassword), b(!1));
    } finally {
      T(!1);
    }
  }
  return (
    <div className="space-y-6">
      <section>
        <h3 className="eyebrow mb-2.5">{"Access"}</h3>
        <div className="space-y-3.5 rounded-card border border-line bg-card p-4">
          {god ? (
            <SettingsField label="Organization role">
              <SettingsSelect
                value={person.orgRole}
                onChange={(R) => onSetOrgRole(R.target.value)}
              >
                <option value="member">{"Member (belongs to teams)"}</option>
                <option value="god_admin">{"God Admin (all teams)"}</option>
              </SettingsSelect>
            </SettingsField>
          ) : (
            D && (
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <Vendor_ShieldCheck size={15} className="text-accent-ink" />
                {" God Admin"}
              </div>
            )
          )}
          {D ? (
            <p className="rounded-btn border border-dashed border-line px-3 py-2.5 text-[12px] text-ink-mute">
              {
                "Over all teams. God Admins see and manage everything, so they aren’t assigned to individual teams."
              }
            </p>
          ) : (
            <MembershipEditor
              memberships={teams}
              allTeams={allTeams}
              canManageTeam={canManageTeam}
              onAddTeam={onAddTeam}
              onRemoveTeam={onRemoveTeam}
              onRoleChange={onRoleChange}
            />
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3.5">
            <div>
              <p className="text-sm font-medium text-ink">{"Account active"}</p>
              <p className="text-xs text-ink-mute">
                {active
                  ? "Can sign in and request time off."
                  : "Access suspended; keeps their history."}
              </p>
            </div>
            <PersonField
              active={active}
              onChange={onToggleActive}
              showLabel={!1}
            />
          </div>
          {canResetPassword && (
            <div className="border-t border-line-soft pt-3.5">
              {O ? (
                <TemporaryPasswordCard
                  name={person.name}
                  email={person.email}
                  password={O}
                  onDone={() => H(null)}
                />
              ) : _ ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {"Replace their current password?"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-mute">
                      {
                        "Their old password will stop working. They must sign in with the new temporary password and create another one."
                      }
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => b(!1)}
                    >
                      {"Cancel"}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={w || !active}
                      onClick={B}
                    >
                      <Vendor_KeyRound size={15} />{" "}
                      {w ? "Generating…" : "Generate password"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {"Temporary password"}
                    </p>
                    <p className="text-xs text-ink-mute">
                      {"Use when they cannot sign in."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!active}
                    onClick={() => b(!0)}
                  >
                    <Vendor_KeyRound size={15} />
                    {" Generate new"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <section>
        <h3 className="eyebrow mb-2.5">{"Normal days off"}</h3>
        <div className="flex gap-1.5">
          {WEEKDAY_LABELS.map((R, F) => {
            const Y = A.has(F);
            return (
              <button
                type="button"
                onClick={() => onToggleDay(F)}
                aria-pressed={Y}
                title={`${R}${Y ? ": off" : ": working"}`}
                className={`h-9 flex-1 rounded-btn border text-xs font-semibold transition-colors ${Y ? "border-accent-line bg-accent-soft text-accent-ink" : "border-line bg-card text-ink-mute hover:bg-panel hover:text-ink"}`}
                key={R}
              >
                {R[0]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-ink-mute">
          {"Highlighted days don’t count as charged PTO."}
        </p>
      </section>
      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h3 className="eyebrow">{"PTO grants"}</h3>
          <span className="text-[11px] font-medium tabular text-ink-mute">
            {N}
            {" days / year"}
          </span>
        </div>
        <div className="space-y-1.5">
          {ptoTypes.map((R) => (
            <div
              className="flex items-center gap-3 rounded-btn border border-line bg-card px-3 py-2"
              key={R.id}
            >
              <PtoTypeIcon typeId={R.id} color={R.color} size={10} />
              <span className="flex-1 truncate text-sm font-medium text-ink">
                {R.name}
              </span>
              <GrantStepper
                value={(grants == null ? void 0 : grants[R.id]) ?? 0}
                onChange={(F) => onUpdateGrant(R.id, F)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
export function MembershipEditor({
  memberships: memberships,
  allTeams: allTeams,
  canManageTeam: canManageTeam,
  onAddTeam: onAddTeam,
  onRemoveTeam: onRemoveTeam,
  onRoleChange: onRoleChange,
}) {
  const p = new Set(memberships.map((l) => l.team.id)),
    u = allTeams.filter((l) => canManageTeam(l.id) && !p.has(l.id));
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
        {"Teams & role"}
      </span>
      {memberships.length === 0 ? (
        <p className="rounded-btn border border-dashed border-line px-3 py-3 text-center text-[12px] text-ink-mute">
          {"Not on any team yet."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {memberships.map(({ team: team, role: role }) => {
            const s = canManageTeam(team.id);
            return (
              <li
                className="flex items-center gap-2.5 rounded-btn border border-line bg-card px-2.5 py-1.5"
                key={team.id}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-chip bg-panel text-[10px] font-bold tracking-tight text-ink-soft">
                  {teamInitials(team.name)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {team.name}
                </span>
                {s ? (
                  <>
                    <select
                      value={role}
                      onChange={(d) => onRoleChange(team.id, d.target.value)}
                      aria-label={`Role on ${team.name}`}
                      className="rounded-btn border border-line bg-card px-2 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-panel focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {TEAM_ROLES.map((d) => (
                        <option value={d.value} key={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onRemoveTeam(team.id)}
                      aria-label={`Remove from ${team.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-btn text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger-ink"
                    >
                      <Vendor_X size={14} />
                    </button>
                  </>
                ) : (
                  <RolePill role={role} size="xs" />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {u.length > 0 && (
        <label className="relative mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-btn border border-dashed border-line px-3 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent-ink">
          <Vendor_Plus size={14} />
          {" Add to team"}
          <select
            value=""
            onChange={(l) => {
              l.target.value && onAddTeam(l.target.value, "employee");
            }}
            aria-label="Add to a team"
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          >
            <option value="" disabled={!0}>
              {"Add to team…"}
            </option>
            {u.map((l) => (
              <option value={l.id} key={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
export function GrantStepper({
  value: value,
  onChange: onChange,
  min = 0,
  max = 365,
}) {
  const o = (r) => onChange(Math.max(min, Math.min(max, r)));
  return (
    <div className="inline-flex items-center rounded-btn border border-line bg-card">
      <button
        type="button"
        onClick={() => o(value - 1)}
        disabled={value <= min}
        aria-label="Decrease"
        className="grid h-7 w-7 place-items-center rounded-l-btn text-ink-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Vendor_Minus size={13} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(r) => o(Number(r.target.value) || 0)}
        aria-label="Days per year"
        className="w-11 border-x border-line bg-transparent py-1 text-center text-sm font-semibold tabular text-ink focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent"
      />
      <button
        type="button"
        onClick={() => o(value + 1)}
        aria-label="Increase"
        className="grid h-7 w-7 place-items-center rounded-r-btn text-ink-mute transition-colors hover:bg-panel hover:text-ink"
      >
        <Vendor_Plus size={13} />
      </button>
    </div>
  );
}
export function NewEmployeeForm({
  god: god,
  teams: teams,
  defaultTeamId: defaultTeamId,
  onAdd: onAdd,
  onCancel: onCancel,
}) {
  const [r, p] = React.useState(""),
    [u, l] = React.useState(""),
    [h, s] = React.useState(!1),
    [d, f] = React.useState(defaultTeamId || ""),
    [x, j] = React.useState("employee"),
    [k, m] = React.useState(null),
    g = /.+@.+\..+/.test(u.trim()),
    A = r.trim().length > 0 && g && (god || d);
  return k ? (
    <TemporaryPasswordCard
      name={r.trim()}
      email={u.trim()}
      password={k.temporaryPassword}
      onDone={onCancel}
    />
  ) : (
    <SettingsForm
      hint="Create their account, assign access, then hand them a one-time temporary password."
      submitLabel="Create account"
      canSubmit={A}
      onCancel={onCancel}
      onSubmit={async () => {
        const N = await onAdd({
          name: r,
          email: u,
          godAdmin: h,
          teamId: h ? "" : d,
          teamRole: x,
        });
        N && (N.temporaryPassword ? m(N) : onCancel());
      }}
    >
      <SettingsField label="Full name">
        <SettingsInput
          value={r}
          onChange={(N) => p(N.target.value)}
          placeholder="e.g. Jamie Rivera"
        />
      </SettingsField>
      <SettingsField label="Work email">
        <SettingsInput
          type="email"
          value={u}
          onChange={(N) => l(N.target.value)}
          placeholder="name@chartwells.com"
        />
      </SettingsField>
      {god && (
        <LabeledToggle
          label="God Admin"
          hint="Over all teams. Skips team assignment."
          checked={h}
          onChange={s}
        />
      )}
      {!h && (
        <div className="grid grid-cols-2 gap-3">
          <SettingsField label="Team">
            <SettingsSelect value={d} onChange={(N) => f(N.target.value)}>
              {god && <option value="">{"No team yet"}</option>}
              {teams.map((N) => (
                <option value={N.id} key={N.id}>
                  {N.name}
                </option>
              ))}
            </SettingsSelect>
          </SettingsField>
          <SettingsField label="Role on team">
            <SettingsSelect
              value={x}
              onChange={(N) => j(N.target.value)}
              disabled={!d}
            >
              {TEAM_ROLES.map((N) => (
                <option value={N.value} key={N.value}>
                  {N.label}
                </option>
              ))}
            </SettingsSelect>
          </SettingsField>
        </div>
      )}
    </SettingsForm>
  );
}
export function PeopleSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="skeleton h-5 w-24 rounded" />
          <div className="skeleton h-3 w-64 rounded" />
        </div>
        <div className="skeleton h-8 w-32 rounded-btn" />
      </div>
      <div className="skeleton h-9 w-full rounded-btn" />
      <div className="divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-card">
        {Array.from({
          length: 6,
        }).map((t, i) => (
          <div className="flex items-center gap-4 px-4 py-3.5" key={i}>
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-40 rounded" />
              <div className="skeleton h-3 w-56 rounded" />
            </div>
            <div className="skeleton h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
export function settings_Dt() {
  const [t, i] = React.useState(40),
    [n, a] = React.useState(48),
    [o, r] = React.useState([
      {
        typeId: "sick",
        maxDays: 1,
        enabled: !0,
      },
    ]),
    p = settings_$e.filter((s) => !o.some((d) => d.typeId === s.id)),
    u = (s, d) =>
      r((f) =>
        f.map((x) =>
          x.typeId === s
            ? {
                ...x,
                ...d,
              }
            : x,
        ),
      ),
    l = (s) => r((d) => d.filter((f) => f.typeId !== s)),
    h = ({ typeId: typeId, maxDays: maxDays }) =>
      r((f) => [
        ...f,
        {
          typeId: typeId,
          maxDays: Math.max(1, maxDays),
          enabled: !0,
        },
      ]);
  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Approval rules"
        desc="Guardrails that keep coverage healthy and approvals timely."
      />
      <div className="rounded-card border border-line bg-card p-5">
        <label className="text-sm font-semibold text-ink">
          {"Coverage alert threshold"}
        </label>
        <p className="text-xs text-ink-mute">
          {
            "Warn admins when more than this share of a team is off the same day."
          }
        </p>
        <div className="mt-3 flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={t}
            onChange={(s) => i(Number(s.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="w-14 rounded-btn bg-panel py-1 text-center font-mono text-sm font-semibold text-ink tabular">
            {t}
            {"%"}
          </span>
        </div>
      </div>
      <div className="rounded-card border border-line bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{"Auto-approve"}</p>
            <p className="text-xs text-ink-mute">
              {
                "Skip manual review when a request is small enough to be low-risk."
              }
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {o.length === 0 && (
            <div className="flex flex-col items-center gap-1 rounded-btn border border-dashed border-line px-4 py-6 text-center">
              <Vendor_Zap size={18} className="text-ink-mute" />
              <p className="text-sm font-medium text-ink">
                {"No auto-approve rules"}
              </p>
              <p className="text-xs text-ink-mute">
                {"Add one to skip manual review for low-risk requests."}
              </p>
            </div>
          )}
          {o.map((s) => {
            const d = settings_rt(s.typeId);
            return d ? (
              <div
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-btn border border-line bg-surface/50 px-3 py-2.5 transition-opacity ${s.enabled ? "" : "opacity-60"}`}
                key={s.typeId}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-ink">
                  <PtoTypeIcon typeId={d.id} color={d.color} size={10} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  {"up to"}
                  <DayStepper
                    value={s.maxDays}
                    onChange={(f) =>
                      u(s.typeId, {
                        maxDays: Math.max(1, f),
                      })
                    }
                  />
                  {s.maxDays === 1 ? "day" : "days"}
                </span>
                <ToggleSwitch
                  on={s.enabled}
                  onChange={(f) =>
                    u(s.typeId, {
                      enabled: f,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => l(s.typeId)}
                  aria-label={`Remove ${d.name} rule`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger-ink"
                >
                  <Vendor_Trash2 size={15} />
                </button>
              </div>
            ) : null;
          })}
        </div>
        <div className="mt-3">
          {p.length > 0 ? (
            <AddSettingsDialog
              label="Add auto-approve rule"
              title="New auto-approve rule"
            >
              {({ close: close }) => (
                <AutoApproveRuleForm
                  available={p}
                  onAdd={(d) => {
                    (h(d), close());
                  }}
                  onCancel={close}
                />
              )}
            </AddSettingsDialog>
          ) : (
            <p className="text-xs text-ink-mute">
              {"Every PTO type already has a rule."}
            </p>
          )}
        </div>
      </div>
      <div className="rounded-card border border-line bg-card p-5">
        <label className="text-sm font-semibold text-ink">
          {"Approval SLA reminder"}
        </label>
        <p className="text-xs text-ink-mute">
          {"Nudge the approver if no decision is made within this window."}
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          {"Remind after"}
          <input
            type="number"
            min={1}
            value={n}
            onChange={(s) => a(Number(s.target.value))}
            className="w-20 rounded-btn border border-line bg-card px-2 py-1 text-center font-mono text-sm text-ink focus:border-accent focus:outline-none"
          />
          {"hours"}
        </div>
      </div>
    </div>
  );
}
export function AutoApproveRuleForm({
  available: available,
  onAdd: onAdd,
  onCancel: onCancel,
}) {
  var l;
  const [a, o] = React.useState(
      ((l = available[0]) == null ? void 0 : l.id) || "",
    ),
    [r, p] = React.useState(1),
    u = !!a && r >= 1;
  return (
    <SettingsForm
      hint="Requests of this type at or under the day limit are approved automatically."
      submitLabel="Add rule"
      canSubmit={u}
      onCancel={onCancel}
      onSubmit={() =>
        onAdd({
          typeId: a,
          maxDays: r,
        })
      }
    >
      <SettingsField label="PTO type">
        <SettingsSelect value={a} onChange={(h) => o(h.target.value)}>
          {available.map((h) => (
            <option value={h.id} key={h.id}>
              {h.name}
            </option>
          ))}
        </SettingsSelect>
      </SettingsField>
      <SettingsField label="Auto-approve requests up to (days)">
        <NumberInput
          min={1}
          value={r}
          onChange={(h) => p(Math.max(1, Number(h.target.value) || 1))}
        />
      </SettingsField>
    </SettingsForm>
  );
}
export const settings_$t = [
  {
    id: "types",
    label: "PTO Types",
    icon: Vendor_Tag,
    Comp: PtoTypesSettings,
  },
  {
    id: "holidays",
    label: "Holidays",
    icon: Vendor_CalendarHeart,
    Comp: HolidaySettings,
  },
  {
    id: "blackout",
    label: "Blackout Dates",
    icon: Vendor_CalendarOff,
    Comp: BlackoutSettings,
  },
  {
    id: "teams",
    label: "Teams",
    icon: Vendor_Users,
    Comp: TeamSettings,
  },
  {
    id: "people",
    label: "People",
    icon: Vendor_UserCog,
    Comp: PeopleSettings,
  },
  {
    id: "rules",
    label: "Approval Rules",
    icon: Vendor_ShieldCheck,
    Comp: settings_Dt,
  },
];
export function EditableSettings() {
  const t = useCurrentUser(),
    [i, n] = Vendor_useSearchParams(),
    a = React.useMemo(() => {
      const s = settings_$t.filter((d) => d.id !== "rules");
      return isGodAdmin(t.role)
        ? s
        : s.filter((d) => d.id === "teams" || d.id === "people");
    }, [t.role]),
    [o, r] = React.useState(() => (isGodAdmin(t.role) ? "types" : "teams"));
  React.useEffect(() => {
    a.some((s) => s.id === o) || r(a[0].id);
  }, [o, a]);
  const p = i.get("tab"),
    u = i.get("team");
  React.useEffect(() => {
    p && a.some((s) => s.id === p) && r(p);
  }, [p, a]);
  const l = () => {
      if (!i.has("team")) return;
      const s = new URLSearchParams(i);
      (s.delete("team"),
        n(s, {
          replace: !0,
        }));
    },
    LocalComponent_h = a.find((s) => s.id === o).Comp;
  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:gap-0.5 lg:overflow-visible lg:sticky lg:top-0 lg:self-start">
        {a.map((LocalComponent_s) => {
          const d = LocalComponent_s.id === o;
          return (
            <button
              onClick={() => r(LocalComponent_s.id)}
              aria-current={d ? "page" : void 0}
              className={`flex shrink-0 items-center gap-2.5 rounded-btn px-3 py-2.5 text-sm font-semibold transition-colors ${d ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-panel hover:text-ink"}`}
              key={LocalComponent_s.id}
            >
              <LocalComponent_s.icon
                size={17}
                className={`shrink-0 ${d ? "text-accent-ink" : "text-ink-mute"}`}
              />
              <span className="whitespace-nowrap">
                {LocalComponent_s.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="min-w-0 animate-fade-in" key={o}>
        <LocalComponent_h
          openTeamId={o === "teams" ? u : null}
          onConsumeOpenTeam={l}
        />
        <p className="mt-6 flex items-center gap-2 rounded-btn bg-panel px-3 py-2 text-xs text-ink-mute">
          <Vendor_CalendarHeart
            size={14}
            className="shrink-0 text-accent-ink"
          />
          {"Leave balances reset on January 1."}
        </p>
      </div>
    </div>
  );
}
export const settings_ve = [
  {
    id: "types",
    label: "PTO Types",
    icon: Vendor_Tag,
  },
  {
    id: "holidays",
    label: "Holidays",
    icon: Vendor_CalendarHeart,
  },
  {
    id: "blackout",
    label: "Blackout Dates",
    icon: Vendor_CalendarOff,
  },
  {
    id: "teams",
    label: "Teams",
    icon: Vendor_Users,
  },
  {
    id: "people",
    label: "People",
    icon: Vendor_UserCog,
  },
];
export function ReadOnlySettings() {
  var f;
  const t = useCurrentUser(),
    {
      users: users,
      teams: teams,
      ptoTypes: ptoTypes,
      holidays: holidays,
      blackouts: blackouts,
      ptoTypeById: ptoTypeById,
      userById: userById,
    } = useCatalog(),
    l = isGodAdmin(t.role)
      ? settings_ve
      : settings_ve.filter((x) => x.id === "teams" || x.id === "people"),
    [h, s] = React.useState(l[0].id),
    d =
      {
        types: ptoTypes.filter((type) => !type.isHolidayDayOff),
        holidays: holidays,
        blackout: blackouts,
        teams: teams,
        people: users,
      }[h] ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:sticky lg:top-0 lg:flex-col lg:self-start lg:overflow-visible">
        {l.map((LocalComponent_x) => {
          const j = LocalComponent_x.id === h;
          return (
            <button
              type="button"
              onClick={() => s(LocalComponent_x.id)}
              aria-current={j ? "page" : void 0}
              className={`flex shrink-0 items-center gap-2.5 rounded-btn px-3 py-2.5 text-sm font-semibold transition-colors ${j ? "bg-accent-soft text-accent-ink" : "text-ink-soft hover:bg-panel hover:text-ink"}`}
              key={LocalComponent_x.id}
            >
              <LocalComponent_x.icon
                size={17}
                className={j ? "text-accent-ink" : "text-ink-mute"}
              />
              <span className="whitespace-nowrap">
                {LocalComponent_x.label}
              </span>
            </button>
          );
        })}
      </nav>
      <section className="min-w-0 animate-fade-in">
        <div className="rounded-card border border-line bg-card shadow-card">
          <header className="border-b border-line px-5 py-4">
            <p className="eyebrow">{"Read only"}</p>
            <h1 className="mt-1 text-xl font-bold text-ink">
              {(f = l.find((x) => x.id === h)) == null ? void 0 : f.label}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {"You can review the teams and people available to your role."}
            </p>
          </header>
          <ul className="divide-y divide-line-soft">
            {d.map((x) => {
              var j, k, m;
              return (
                <li className="px-5 py-3.5" key={x.id ?? x.date}>
                  {h === "types" && (
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: x.color,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{x.name}</p>
                        <p className="text-xs text-ink-mute">
                          {x.defaultDays}
                          {" default days"}
                          {x.restrictedDates
                            ? " · booking windows required"
                            : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {h === "holidays" && (
                    <ReadOnlySettingsRow title={x.name} detail={x.date} />
                  )}
                  {h === "blackout" && (
                    <ReadOnlySettingsRow
                      title={x.reason}
                      detail={`${x.start} to ${x.end} · ${
                        x.types === "all"
                          ? "all PTO types"
                          : x.types
                              .map((g) => {
                                var A;
                                return (A = ptoTypeById(g)) == null
                                  ? void 0
                                  : A.name;
                              })
                              .filter(Boolean)
                              .join(", ")
                      }`}
                    />
                  )}
                  {h === "teams" && (
                    <ReadOnlySettingsRow
                      title={x.name}
                      detail={x.description || "No description"}
                    />
                  )}
                  {h === "people" && (
                    <ReadOnlySettingsRow
                      title={x.name}
                      detail={`${x.email} · ${((j = ROLE_META[x.role]) == null ? void 0 : j.label) ?? x.role}${x.team ? ` · ${((k = teams.find((g) => g.id === x.team)) == null ? void 0 : k.name) ?? "Team"}` : ""}`}
                    />
                  )}
                  {x.updatedAt && (
                    <p className="mt-1 text-[11px] text-ink-mute">
                      {"Changed by "}
                      {((m = userById(x.updatedBy)) == null
                        ? void 0
                        : m.name) ?? "system"}
                      {" on "}
                      {new Date(x.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </li>
              );
            })}
            {d.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-ink-mute">
                {"No rows are visible to this account."}
              </li>
            )}
          </ul>
        </div>
        <p className="mt-6 rounded-btn bg-panel px-3 py-2 text-xs text-ink-mute">
          {"Leave balances reset on January 1."}
        </p>
      </section>
    </div>
  );
}
export function ReadOnlySettingsRow({ title: title, detail: detail }) {
  return (
    <div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-xs text-ink-mute">{detail}</p>
    </div>
  );
}
export function SettingsPage() {
  const t = useCurrentUser();
  return canApprove(t.role) ? <EditableSettings /> : <ReadOnlySettings />;
}
export default SettingsPage;
