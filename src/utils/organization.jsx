import React from "react";
import { usePresence } from "../hooks/motion.jsx";
import ReactDOM from "react-dom";
import { Users as Vendor_Users } from "lucide-react";
import { X as Vendor_X } from "lucide-react";
import { CalendarDays as Vendor_CalendarDays } from "lucide-react";
import { UserRound as Vendor_UserRound } from "lucide-react";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Trash2 as Vendor_Trash2 } from "lucide-react";
import { UserPlus as Vendor_UserPlus } from "lucide-react";
import { RolePill } from "../components/ui/RolePill.jsx";
import { ChevronDown as Vendor_ChevronDown } from "lucide-react";
import { TEAM_ROLES } from "./orgRoles.jsx";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
import { Search as Vendor_Search } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";
import { isGodAdmin } from "./constants.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { WS } from "../components/requests/RequestDetailModal.jsx";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
export function teamInitials(e = "") {
  const t = e.trim().split(/\s+/).filter(Boolean);
  return t.length
    ? t.length === 1
      ? t[0].slice(0, 2).toUpperCase()
      : (t[0][0] + t[t.length - 1][0]).toUpperCase()
    : "";
}
export const Ox = (e) => new Date(e.includes("T") ? e : `${e}T00:00:00`);
export const $S = (e) =>
  e
    ? Ox(e).toLocaleDateString("en-canManageTeam", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
export const AS = (e) =>
  e
    ? Ox(e).toLocaleDateString("en-canManageTeam", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
export function TeamEditor({
  open: open,
  mode = "edit",
  team: team,
  members = [],
  assignablePeople = [],
  currentUser: currentUser,
  today: today,
  personById: personById,
  canManage = !1,
  canDelete = !1,
  onClose: onClose,
  onRename: onRename,
  onDescription: onDescription,
  onAddMembers: onAddMembers,
  onRemoveMember: onRemoveMember,
  onChangeRole: onChangeRole,
  onDelete: onDelete,
  onCreate: onCreate,
}) {
  const m = mode === "create",
    x = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(open),
    _ = React.useRef(null),
    j = React.useRef(null),
    [S, R] = React.useState(""),
    [E, T] = React.useState(""),
    [C, H] = React.useState(""),
    [I, D] = React.useState(""),
    [q, Z] = React.useState({}),
    [P, $] = React.useState(!1);
  (React.useEffect(() => {
    open &&
      (R(""),
      T(""),
      H((team == null ? void 0 : team.name) ?? ""),
      D((team == null ? void 0 : team.description) ?? ""),
      Z({}),
      $(!1));
  }, [open, team == null ? void 0 : team.id, mode]),
    React.useEffect(() => {
      if (!open) return;
      j.current = document.activeElement;
      const W = (be) => {
        (be.key === "Escape" && (onClose == null || onClose()),
          be.key === "Tab" && trapTeamFocus(be, x.current));
      };
      (document.addEventListener("keydown", W),
        (document.body.style.overflow = "hidden"));
      const we = setTimeout(() => {
        var be;
        (be = m ? _.current : x.current) == null || be.focus();
      }, 30);
      return () => {
        var be, cn;
        (document.removeEventListener("keydown", W),
          (document.body.style.overflow = ""),
          clearTimeout(we),
          (cn = (be = j.current) == null ? void 0 : be.focus) == null ||
            cn.call(be));
      };
    }, [open, m, onClose]));
  const U = (W) => {
      var we;
      return W === (currentUser == null ? void 0 : currentUser.id)
        ? "you"
        : ((we = personById == null ? void 0 : personById(W)) == null
            ? void 0
            : we.name) || "Someone";
    },
    X = m ? S : C,
    V = m ? E : I,
    he = m ? today : team == null ? void 0 : team.createdAt,
    K = m
      ? currentUser == null
        ? void 0
        : currentUser.id
      : team == null
        ? void 0
        : team.createdBy,
    A =
      (personById == null ? void 0 : personById(K)) || (m ? currentUser : null),
    B = React.useMemo(
      () =>
        m
          ? Object.entries(q)
              .map(([W, we]) => {
                const be = assignablePeople.find((cn) => cn.id === W);
                return be
                  ? {
                      ...be,
                      role: we,
                      addedBy: currentUser == null ? void 0 : currentUser.id,
                      addedAt: today,
                    }
                  : null;
              })
              .filter(Boolean)
          : members,
      [
        m,
        members,
        q,
        assignablePeople,
        currentUser == null ? void 0 : currentUser.id,
        today,
      ],
    ),
    ae = new Set(B.map((W) => W.id)),
    fe = assignablePeople.filter((W) => !ae.has(W.id)),
    ye = B.filter((W) => W.role === "admin"),
    Q = (W) => (m ? R(W) : H(W)),
    Y = (W) => (m ? T(W) : D(W)),
    ee = () => {
      const W = C.trim();
      !m &&
        W &&
        W !== (team == null ? void 0 : team.name) &&
        (onRename == null || onRename(W));
    },
    Pe = () => {
      const W = I.trim();
      !m &&
        W !== ((team == null ? void 0 : team.description) ?? "") &&
        (onDescription == null || onDescription(W));
    },
    ve = (W) => {
      W.length &&
        (m
          ? Z((we) => {
              const be = {
                ...we,
              };
              return (
                W.forEach(({ userId: userId, role: role }) => {
                  be[userId] = role || "employee";
                }),
                be
              );
            })
          : onAddMembers == null || onAddMembers(W));
    },
    _e = (W) => {
      m
        ? Z((we) => {
            const be = {
              ...we,
            };
            return (delete be[W], be);
          })
        : onRemoveMember == null || onRemoveMember(W);
    },
    Mt = (W, we) => {
      m
        ? Z((be) => ({
            ...be,
            [W]: we,
          }))
        : onChangeRole == null || onChangeRole(W, we);
    },
    mt = S.trim().length > 0,
    jt = () => {
      mt &&
        (onCreate == null ||
          onCreate({
            name: S.trim(),
            description: E.trim(),
            members: Object.entries(q).map(([W, we]) => ({
              userId: W,
              role: we,
            })),
          }));
    };
  return mounted
    ? ReactDOM.createPortal(
        <div
          className={`fixed inset-0 z-[58] ${closing ? "pointer-events-none" : ""}`}
        >
          <div
            className={`absolute inset-0 bg-navy/30 backdrop-blur-[2px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            ref={x}
            role="dialog"
            aria-modal="true"
            aria-label={m ? "New team" : `${X || "Team"} details`}
            tabIndex={-1}
            className={`absolute inset-0 flex flex-col bg-card shadow-pop outline-none sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[520px] ${closing ? "animate-slide-out-down sm:animate-slide-out-right" : "animate-slide-in-up sm:animate-slide-in-right"}`}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-panel text-[13px] font-bold tracking-tight text-ink-soft">
                  {teamInitials(X) || (
                    <Vendor_Users size={18} className="text-ink-mute" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">{m ? "New team" : "Team"}</p>
                  <p className="truncate text-[13px] font-medium text-ink-soft">
                    {m
                      ? "Fill in the details"
                      : `${B.length} ${B.length === 1 ? "member" : "members"}`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute hover:bg-panel hover:text-ink"
                aria-label="Close"
              >
                <Vendor_X size={18} />
              </button>
            </header>
            <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-6">
                <div>
                  {canManage ? (
                    <>
                      <input
                        ref={_}
                        value={X}
                        onChange={(W) => Q(W.target.value)}
                        onBlur={ee}
                        placeholder="Untitled team"
                        aria-label="Team name"
                        className="-mx-2 w-full rounded-btn border border-transparent bg-transparent px-2 py-1 text-[22px] font-bold tracking-tight text-ink transition-colors placeholder:text-ink-mute/70 hover:bg-panel/60 focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                      <textarea
                        value={V}
                        onChange={(W) => Y(W.target.value)}
                        onBlur={Pe}
                        placeholder="Add a description. What does this team cover?"
                        rows={2}
                        aria-label="Team description"
                        className="-mx-2 mt-1 w-full resize-none rounded-btn border border-transparent bg-transparent px-2 py-1.5 text-[13px] leading-relaxed text-ink-soft transition-colors placeholder:text-ink-mute hover:bg-panel/60 focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </>
                  ) : (
                    <>
                      <h2 className="px-0 text-[22px] font-bold tracking-tight text-ink">
                        {X}
                      </h2>
                      {V && (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                          {V}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="divide-y divide-line/70 rounded-card border border-line bg-surface/40 px-3">
                  <TeamField icon={Vendor_Users} label="Members">
                    <span className="text-ink-soft">
                      <span className="tabular font-semibold text-ink">
                        {B.length}
                      </span>{" "}
                      {B.length === 1 ? "person" : "people"}
                      {ye.length > 0 && (
                        <>
                          {" · "}
                          <span className="tabular">{ye.length}</span>
                          {" admin"}
                          {ye.length === 1 ? "" : "s"}
                        </>
                      )}
                    </span>
                  </TeamField>
                  <TeamField icon={Vendor_CalendarDays} label="Created">
                    <span className="tabular text-ink-soft">{$S(he)}</span>
                  </TeamField>
                  <TeamField icon={Vendor_UserRound} label="Created by">
                    {A ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={A.name} id={A.id} size="xs" />
                        <span className="text-ink-soft">{A.name}</span>
                        {A.id ===
                          (currentUser == null ? void 0 : currentUser.id) && (
                          <span className="text-ink-mute">{"· you"}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-mute">{"Unknown"}</span>
                    )}
                  </TeamField>
                </div>
                <AddTeamMembers
                  members={B}
                  candidates={fe}
                  canManage={canManage}
                  nameOf={U}
                  onChangeRole={Mt}
                  onRemove={_e}
                  onAdd={ve}
                />
              </div>
            </div>
            <footer className="flex shrink-0 items-center gap-3 border-t border-line bg-surface/60 px-5 py-3.5">
              {m ? (
                <>
                  <span className="flex-1 text-[11px] text-ink-mute">
                    {mt ? "" : "Name your team to create it"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    {"Cancel"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!mt}
                    onClick={jt}
                  >
                    {"Create team"}
                  </Button>
                </>
              ) : P ? (
                <>
                  <span className="flex-1 text-[12px] font-medium text-ink-soft">
                    {"Delete this team? Members lose this assignment."}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => $(!1)}>
                    {"Cancel"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => (onDelete == null ? void 0 : onDelete())}
                  >
                    {"Delete"}
                  </Button>
                </>
              ) : (
                <>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => $(!0)}
                      className="inline-flex items-center gap-1.5 rounded-btn px-2 py-1.5 text-[13px] font-semibold text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger-ink"
                    >
                      <Vendor_Trash2 size={15} />
                      {" Delete team"}
                    </button>
                  )}
                  {canManage && (
                    <span className="ml-auto hidden text-[11px] text-ink-mute sm:inline">
                      {"Changes save automatically"}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className={canManage || canDelete ? "" : "ml-auto"}
                  >
                    {"Done"}
                  </Button>
                </>
              )}
            </footer>
          </div>
        </div>,
        document.body,
      )
    : null;
}
export function TeamField({
  icon: LocalComponent_icon,
  label: label,
  children: children,
}) {
  return (
    <div className="flex min-h-[38px] items-center gap-3 py-2">
      <span className="flex w-28 shrink-0 items-center gap-2 text-[12px] font-medium text-ink-mute">
        <LocalComponent_icon size={14} className="shrink-0" /> {label}
      </span>
      <div className="min-w-0 flex-1 text-[13px]">{children}</div>
    </div>
  );
}
export function AddTeamMembers({
  members: members,
  candidates: candidates,
  canManage: canManage,
  nameOf: nameOf,
  onChangeRole: onChangeRole,
  onRemove: onRemove,
  onAdd: onAdd,
}) {
  const [c, l] = React.useState(!1);
  return c ? (
    <TeamMemberList
      candidates={candidates}
      onCancel={() => l(!1)}
      onConfirm={(u) => {
        (onAdd(u), l(!1));
      }}
    />
  ) : (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="eyebrow">{"Members"}</h3>
        {canManage && candidates.length > 0 && (
          <button
            type="button"
            onClick={() => l(!0)}
            className="inline-flex items-center gap-1 rounded-btn px-1.5 py-1 text-[12px] font-semibold text-accent-ink transition-colors hover:bg-accent-soft/60"
          >
            <Vendor_UserPlus size={13} />
            {" Add people"}
          </button>
        )}
      </div>
      {members.length === 0 ? (
        <button
          type="button"
          disabled={!canManage || candidates.length === 0}
          onClick={() => l(!0)}
          className="flex w-full flex-col items-center gap-1 rounded-card border border-dashed border-line px-3 py-6 text-center transition-colors enabled:hover:border-accent enabled:hover:bg-accent-soft/25 disabled:cursor-default"
        >
          <span className="text-[13px] font-medium text-ink-soft">
            {"No one on this team yet"}
          </span>
          {canManage && candidates.length > 0 && (
            <span className="text-[12px] font-semibold text-accent-ink">
              {"Add people to get started"}
            </span>
          )}
        </button>
      ) : (
        <ul className="space-y-1.5">
          {members.map((u) => (
            <li
              className="flex items-center gap-3 rounded-btn border border-line bg-card px-3 py-2"
              key={u.id}
            >
              <Avatar name={u.name} id={u.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">
                  {u.name}
                </p>
                <p className="truncate text-[11px] text-ink-mute">{u.email}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-ink-mute">
                  <Vendor_UserPlus size={10} className="shrink-0" />
                  {"Added by "}
                  {nameOf(u.addedBy)}
                  {u.addedAt ? ` · ${AS(u.addedAt)}` : ""}
                </p>
              </div>
              {canManage ? (
                <MemberRolePicker person={u} onChange={onChangeRole} />
              ) : (
                <RolePill role={u.role} size="xs" />
              )}
              {canManage && (
                <button
                  type="button"
                  onClick={() => onRemove(u.id)}
                  aria-label={`Remove ${u.name}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-btn text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger-ink"
                >
                  <Vendor_X size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function MemberRolePicker({ person: person, onChange: onChange }) {
  return (
    <span className="relative inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-1 pr-1.5 transition-colors hover:bg-panel focus-within:ring-2 focus-within:ring-accent">
      <RolePill role={person.role} size="xs" />
      <Vendor_ChevronDown
        size={12}
        className="shrink-0 text-ink-mute"
        aria-hidden="true"
      />
      <select
        value={person.role}
        onChange={(n) =>
          onChange == null ? void 0 : onChange(person.id, n.target.value)
        }
        aria-label={`Change ${person.name}'s role on this team`}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      >
        {TEAM_ROLES.map((n) => (
          <option value={n.value} key={n.value}>
            {n.label}
          </option>
        ))}
      </select>
    </span>
  );
}
export function TeamMemberList({
  candidates: candidates,
  onCancel: onCancel,
  onConfirm: onConfirm,
}) {
  const [r, s] = React.useState(""),
    [i, o] = React.useState({}),
    c = r.trim().toLowerCase(),
    l = c
      ? candidates.filter(
          (p) =>
            p.name.toLowerCase().includes(c) ||
            p.email.toLowerCase().includes(c),
        )
      : candidates,
    u = Object.keys(i).length,
    h = (p) =>
      o((y) => {
        const g = {
          ...y,
        };
        return (g[p] ? delete g[p] : (g[p] = "employee"), g);
      }),
    d = (p, y) =>
      o((g) => ({
        ...g,
        [p]: y,
      })),
    f = () => {
      const p = Object.entries(i).map(([y, g]) => ({
        userId: y,
        role: g,
      }));
      p.length && onConfirm(p);
    };
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-btn px-1.5 py-1 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-panel hover:text-ink"
        >
          <Vendor_ChevronLeft size={14} />
          {" Members"}
        </button>
        <h3 className="eyebrow ml-auto">{"Add people"}</h3>
      </div>
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
        <div className="border-b border-line p-2">
          <div className="relative">
            <Vendor_Search
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              autoFocus={!0}
              value={r}
              onChange={(p) => s(p.target.value)}
              placeholder="Search people…"
              className="w-full rounded-btn border border-line bg-surface py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>
        <ul className="scrollbar-slim max-h-[300px] space-y-0.5 overflow-y-auto p-1.5">
          {l.map((p) => {
            const y = i[p.id] ?? null,
              g = y !== null;
            return (
              <li key={p.id}>
                <div
                  className={`flex items-center gap-2.5 rounded-btn px-2 py-1.5 transition-colors ${g ? "bg-accent-soft/45" : "hover:bg-panel"}`}
                >
                  <button
                    type="button"
                    onClick={() => h(p.id)}
                    aria-pressed={g}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left outline-none"
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${g ? "border-accent bg-accent-strong text-white" : "border-line"}`}
                    >
                      {g && <Vendor_Check size={12} strokeWidth={3} />}
                    </span>
                    <Avatar name={p.name} id={p.id} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {p.name}
                      </span>
                      <span className="block truncate text-[11px] text-ink-mute">
                        {p.email}
                      </span>
                    </span>
                  </button>
                  <InlineTeamInput value={y} onChange={(k) => d(p.id, k)} />
                </div>
              </li>
            );
          })}
          {l.length === 0 && (
            <li className="px-2 py-5 text-center text-xs text-ink-mute">
              {"No people match “"}
              {r.trim()}
              {"”."}
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-line bg-surface/50 px-3 py-2.5">
          <span className="text-[11px] text-ink-mute">
            {u ? `${u} selected` : "Tap a role to add someone"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {"Cancel"}
            </Button>
            <Button variant="primary" size="sm" disabled={!u} onClick={f}>
              {u ? `Add ${u}` : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
export function InlineTeamInput({ value: value, onChange: onChange }) {
  const n = (r, s) => {
    const i = value === r;
    return (
      <button
        type="button"
        onClick={(o) => {
          (o.stopPropagation(), onChange(r));
        }}
        aria-pressed={i}
        className={`rounded-[6px] px-2 py-1 text-[11px] font-semibold transition-colors ${i ? "bg-card text-ink shadow-card" : "text-ink-mute hover:text-ink"}`}
      >
        {s}
      </button>
    );
  };
  return (
    <div className="inline-flex shrink-0 items-center rounded-btn border border-line bg-panel p-0.5">
      {n("employee", "Member")}
      {n("admin", "Admin")}
    </div>
  );
}
export function trapTeamFocus(e, t) {
  if (!t) return;
  const n = t.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!n.length) return;
  const r = n[0],
    s = n[n.length - 1];
  e.shiftKey && document.activeElement === r
    ? (e.preventDefault(), s.focus())
    : !e.shiftKey &&
      document.activeElement === s &&
      (e.preventDefault(), r.focus());
}
export function TeamRoleBadge({
  affiliation: affiliation,
  onClick: onClick,
  onDark = !1,
  showRole = !0,
  className = "",
}) {
  const { team: team, role: role, oversight: oversight } = affiliation,
    l = oversight ? "Oversight" : role === "admin" ? "Admin" : null,
    u = onDark
      ? "border-white/15 bg-white/10 text-navy-fg"
      : "border-line bg-card text-ink",
    h = onClick
      ? onDark
        ? "transition-colors hover:bg-white/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        : "transition-[background,box-shadow] hover:bg-panel hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      : "",
    d = onDark ? "bg-white/15 text-navy-fg" : "bg-panel text-ink-soft",
    f = onDark
      ? "text-navy-fg-mute"
      : oversight
        ? "text-accent-ink"
        : "text-ink-mute",
    p = (
      <>
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-[5px] text-[9px] font-bold tracking-tight ${d}`}
        >
          {teamInitials(team.name)}
        </span>
        <span className="truncate text-[13px] font-semibold">{team.name}</span>
        {showRole && l && (
          <span className={`shrink-0 text-[11px] font-medium ${f}`}>
            <span
              className={onDark ? "text-white/25" : "text-line"}
              aria-hidden="true"
            >
              {"·"}
            </span>{" "}
            {l}
          </span>
        )}
      </>
    ),
    y = `inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 ${u} ${h} ${className}`;
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={y}
      title={l ? `${team.name} — ${l}` : team.name}
    >
      {p}
    </button>
  ) : (
    <span className={y}>{p}</span>
  );
}
export const getTeamMembership = (e, t) => {
  var r, s;
  const n =
    (s =
      (r = e == null ? void 0 : e.personById) == null
        ? void 0
        : r.call(e, t.id)) == null
      ? void 0
      : s.orgRole;
  return n ? n === "god_admin" : isGodAdmin(t.role);
};
export function teamsForUser(e, t) {
  return !e || !(t != null && t.id)
    ? []
    : getTeamMembership(e, t)
      ? [...e.teams]
          .sort((n, r) => n.name.localeCompare(r.name))
          .map((n) => ({
            teamId: n.id,
            team: n,
            role: "admin",
            oversight: !0,
          }))
      : e
          .teamsOf(t.id)
          .map(({ team: team, role: role }) => ({
            teamId: team.id,
            team: team,
            role: role,
            oversight: !1,
          }))
          .sort((n, r) =>
            n.role === r.role
              ? n.team.name.localeCompare(r.team.name)
              : n.role === "admin"
                ? -1
                : 1,
          );
}
export function overseesAllTeams(e, t) {
  return !!e && !!(t != null && t.id) && getTeamMembership(e, t);
}
export function canManageTeam(e, t, n) {
  return !e || !(t != null && t.id) || !n
    ? !1
    : isGodAdmin(t.role)
      ? !0
      : e.isTeamAdmin(t.id, n);
}
export function UserTeams({
  user: user,
  variant = "inline",
  onOpenTeam: onOpenTeam,
  onDark = !1,
  max = 4,
  emptyLabel = "No team",
  className = "",
}) {
  const c = useOrg(),
    l = teamsForUser(c, user),
    u = overseesAllTeams(c, user);
  if (variant === "cards")
    return (
      <UserTeamCard
        org={c}
        affiliations={l}
        oversight={u}
        onOpenTeam={onOpenTeam}
        className={className}
      />
    );
  if (u)
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-2.5 text-[13px] font-semibold ${onDark ? "border-white/15 bg-white/10 text-navy-fg" : "border-line bg-card text-ink"} ${className}`}
      >
        <Vendor_Users
          size={13}
          className={onDark ? "text-navy-fg-mute" : "text-ink-mute"}
        />
        {"All teams"}
        <span
          className={`text-[11px] font-medium ${onDark ? "text-navy-fg-mute" : "text-ink-mute"}`}
        >
          {"· Oversight"}
        </span>
      </span>
    );
  if (l.length === 0)
    return (
      <span
        className={`inline-flex items-center rounded-full border border-dashed px-2.5 py-1 text-[12px] font-medium ${onDark ? "border-white/20 text-navy-fg-mute" : "border-line text-ink-mute"} ${className}`}
      >
        {emptyLabel}
      </span>
    );
  const h = l.slice(0, max),
    d = l.length - h.length;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {h.map((f) => (
        <TeamRoleBadge
          affiliation={f}
          onDark={onDark}
          onClick={onOpenTeam ? () => onOpenTeam(f.teamId) : void 0}
          key={f.teamId}
        />
      ))}
      {d > 0 && (
        <span
          className={`text-[12px] font-medium ${onDark ? "text-navy-fg-mute" : "text-ink-mute"}`}
        >
          {"+"}
          {d}
          {" more"}
        </span>
      )}
    </span>
  );
}
export function UserTeamCard({
  org: org,
  affiliations: affiliations,
  oversight: oversight,
  onOpenTeam: onOpenTeam,
  className: className,
}) {
  return affiliations.length === 0 ? (
    <div
      className={`rounded-card border border-dashed border-line bg-surface/50 px-4 py-8 text-center ${className}`}
    >
      <Vendor_Users size={20} className="mx-auto text-ink-mute" />
      <p className="mt-2 text-sm font-semibold text-ink">
        {"Not on a team yet"}
      </p>
      <p className="mt-0.5 text-xs text-ink-mute">
        {"An admin can add you to a team in Settings."}
      </p>
    </div>
  ) : (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {affiliations.map((i) => {
        const o = org.membersOf(i.teamId),
          c = o.filter((l) => l.role === "admin").length;
        return (
          <button
            type="button"
            onClick={onOpenTeam ? () => onOpenTeam(i.teamId) : void 0}
            className="group flex w-full items-center gap-3 rounded-card border border-line bg-card p-3.5 text-left shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            key={i.teamId}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-btn bg-panel text-[13px] font-bold tracking-tight text-ink-soft">
              {WS(i.team.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-bold text-ink">
                  {i.team.name}
                </p>
                {i.oversight ? (
                  <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-ink">
                    {"Oversight"}
                  </span>
                ) : i.role === "admin" ? (
                  <RolePill role="admin" size="xs" />
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-ink-mute">
                <span className="tabular">{o.length}</span>{" "}
                {o.length === 1 ? "member" : "members"}
                {c > 0 && (
                  <>
                    {" · "}
                    <span className="tabular">{c}</span>
                    {" admin"}
                    {c === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </div>
            <MemberAvatars members={o} />
            <Vendor_ChevronRight
              size={16}
              className="shrink-0 text-ink-mute transition-colors group-hover:text-ink"
            />
          </button>
        );
      })}
    </div>
  );
}
export function MemberAvatars({ members: members, max = 3 }) {
  if (members.length === 0) return null;
  const n = members.slice(0, max),
    r = members.length - n.length;
  return (
    <span className="hidden shrink-0 -space-x-2 sm:flex">
      {n.map((s) => (
        <Avatar name={s.name} id={s.id} size="sm" ring={!0} key={s.id} />
      ))}
      {r > 0 && (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-panel text-[11px] font-semibold text-ink-soft ring-2 ring-card">
          {"+"}
          {r}
        </span>
      )}
    </span>
  );
}
