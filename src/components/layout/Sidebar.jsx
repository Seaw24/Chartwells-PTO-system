import React from "react";
import { useCurrentUser } from "../../context/AuthContext.jsx";
import { useDataSource } from "../../data/dataSource.jsx";
import { useResource } from "../../hooks/useResource.jsx";
import { useLocation as Vendor_useLocation } from "react-router-dom";
import { canApprove } from "../../utils/constants.jsx";
import { canStampSlot } from "../../utils/requestHelpers.jsx";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { LayoutDashboard as Vendor_LayoutDashboard } from "lucide-react";
import { Calendar as Vendor_Calendar } from "lucide-react";
import { Mail as Vendor_Mail } from "lucide-react";
import { SquareCheckBig as Vendor_SquareCheckBig } from "lucide-react";
import { Users as Vendor_Users } from "lucide-react";
import { isGodAdmin } from "../../utils/constants.jsx";
import { ChartColumn as Vendor_ChartColumn } from "lucide-react";
import { Settings as Vendor_Settings } from "lucide-react";
import { NavLink as Vendor_NavLink } from "react-router-dom";
import { Link as Vendor_Link } from "react-router-dom";
import { CalendarDays as Vendor_CalendarDays } from "lucide-react";
import { User as Vendor_User } from "lucide-react";
import { ChevronRight as Vendor_ChevronRight } from "lucide-react";
import { ChevronLeft as Vendor_ChevronLeft } from "lucide-react";
export function useMeasuredIndicator(e) {
  const t = React.useRef(null),
    [n, r] = React.useState(null),
    [s, i] = React.useState(!1);
  return (
    React.useLayoutEffect(() => {
      const o = t.current,
        c = () => {
          const h =
              o == null ? void 0 : o.querySelector('[aria-current="page"]'),
            d = h
              ? {
                  top: h.offsetTop,
                  height: h.offsetHeight,
                }
              : null;
          r((f) =>
            (f == null ? void 0 : f.top) === (d == null ? void 0 : d.top) &&
            (f == null ? void 0 : f.height) === (d == null ? void 0 : d.height)
              ? f
              : d,
          );
        };
      c();
      const l = requestAnimationFrame(() => i(!0)),
        u = o ? new ResizeObserver(c) : null;
      return (
        u == null || u.observe(o),
        () => {
          (cancelAnimationFrame(l), u == null || u.disconnect());
        }
      );
    }, e),
    {
      navRef: t,
      pill: n,
      settled: s,
    }
  );
}
export const xS = 76;
export const vS = 208;
export const wS = 420;
export const bo = 248;
export const bS = 150;
export const Hu = "chartwells-sidebar-width";
export const $x = (e) => Math.min(wS, Math.max(vS, e));
export const kS = () => {
  try {
    const e = parseInt(localStorage.getItem(Hu), 10);
    if (Number.isFinite(e)) return $x(e);
  } catch {}
  return bo;
};
export function Sidebar({
  collapsed: collapsed,
  onSetCollapsed: onSetCollapsed,
}) {
  const n = useCurrentUser(),
    {
      requestsForUser: requestsForUser,
      pendingForApprover: pendingForApprover,
    } = useDataSource(),
    [h, d] = React.useState(kS),
    [f, p] = React.useState(!1),
    y = React.useRef(h),
    { pathname: pathname } = Vendor_useLocation(),
    {
      navRef: navRef,
      pill: pill,
      settled: settled,
    } = useMeasuredIndicator([pathname, collapsed, h]),
    x = (E) => {
      E.preventDefault();
      const T = E.clientX,
        C = collapsed ? xS : y.current;
      let H = collapsed;
      (p(!0),
        (document.body.style.userSelect = "none"),
        (document.body.style.cursor = "col-resize"));
      const I = (q) => {
          const Z = C + (q.clientX - T),
            P = Z < bS;
          if ((P !== H && ((H = P), onSetCollapsed(P)), !P)) {
            const $ = $x(Z);
            ((y.current = $), d($));
          }
        },
        D = () => {
          (p(!1),
            window.removeEventListener("pointermove", I),
            window.removeEventListener("pointerup", D),
            (document.body.style.userSelect = ""),
            (document.body.style.cursor = ""));
          try {
            localStorage.setItem(Hu, String(y.current));
          } catch {}
        };
      (window.addEventListener("pointermove", I),
        window.addEventListener("pointerup", D));
    },
    b = () => {
      ((y.current = bo), d(bo), onSetCollapsed(!1));
      try {
        localStorage.setItem(Hu, String(bo));
      } catch {}
    };
  const { users: users } = useCatalog();
  const { data: i } = useResource(["sidebar-requests"], () =>
    requestsForUser(n.id),
  );
  const { data: c } = useResource(
    ["pending-approvals"],
    () => pendingForApprover(),
    canApprove(n?.role),
  );
  const N = (i ?? []).filter((E) => E.status === "pending").length,
    // "Needs me": the other side's stamp is not my queue.
    _ = (c ?? []).filter(
      (E) =>
        canStampSlot(n, E, "god", users) || canStampSlot(n, E, "team", users),
    ).length,
    j = [
      {
        to: "/",
        label: "Dashboard",
        icon: Vendor_LayoutDashboard,
        end: !0,
      },
      {
        to: "/calendar",
        label: "Calendar",
        icon: Vendor_Calendar,
      },
      {
        to: "/requests",
        label: "My Requests",
        icon: Vendor_Mail,
        badge: N,
      },
    ],
    S = [
      canApprove(n == null ? void 0 : n.role) && {
        to: "/approvals",
        label: "Approvals",
        icon: Vendor_SquareCheckBig,
        badge: _,
        accent: !0,
      },
      canApprove(n == null ? void 0 : n.role) && {
        to: "/team",
        label: "Team",
        icon: Vendor_Users,
      },
      isGodAdmin(n == null ? void 0 : n.role) && {
        to: "/reports",
        label: "Reports",
        icon: Vendor_ChartColumn,
      },
      canApprove(n == null ? void 0 : n.role) && {
        to: "/settings",
        label: "Settings",
        icon: Vendor_Settings,
      },
    ].filter(Boolean),
    R = (E) => (
      <Vendor_NavLink
        to={E.to}
        end={E.end}
        title={collapsed ? E.label : void 0}
        className={({ isActive: isActive }) =>
          `press group/item relative z-10 flex h-10 items-center rounded-btn text-sm ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${isActive ? "font-semibold text-ink" : "font-medium text-ink-soft hover:bg-card/70 hover:text-ink"}`
        }
        key={E.to}
      >
        {({ isActive: isActive }) => (
          <>
            <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
              <E.icon
                size={18}
                className={
                  isActive
                    ? "text-accent-ink"
                    : "text-ink-mute group-hover/item:text-ink"
                }
                strokeWidth={isActive ? 2.2 : 1.9}
              />
              {E.badge > 0 && collapsed && (
                <span
                  className={`absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-panel ${E.accent ? "bg-accent-strong" : "bg-ink-mute"}`}
                />
              )}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate">{E.label}</span>
            )}
            {!collapsed && E.badge > 0 && (
              <span
                className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular ${E.accent ? "bg-accent-strong text-white" : "border border-line bg-card text-ink-soft"}`}
              >
                {E.badge}
              </span>
            )}
          </>
        )}
      </Vendor_NavLink>
    );
  return (
    <aside
      style={
        collapsed
          ? void 0
          : {
              width: `${h}px`,
            }
      }
      className={`relative z-20 hidden shrink-0 flex-col border-r border-line bg-panel md:flex ${f ? "" : "transition-[width] duration-200 ease-out"} ${collapsed ? "w-[76px]" : ""}`}
    >
      <Vendor_Link
        to="/"
        aria-label="Chartwells home"
        className={`flex h-16 shrink-0 items-center border-b border-line outline-none transition-colors hover:bg-card/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${collapsed ? "justify-center px-0" : "gap-2.5 px-4"}`}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-strong text-white shadow-btn">
          <Vendor_CalendarDays size={19} />
        </span>
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight text-ink">
              {"Chartwells"}
            </span>
            <span className="block text-[11px] font-medium text-ink-mute">
              {"Time off"}
            </span>
          </span>
        )}
      </Vendor_Link>
      <nav
        ref={navRef}
        className="scrollbar-slim relative flex flex-1 flex-col gap-1 overflow-y-auto p-3"
      >
        {pill && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-3 z-0 rounded-btn bg-card shadow-card ${settled ? "transition-[translate,height] duration-[220ms] ease-quart" : ""}`}
            style={{
              top: 0,
              height: pill.height,
              translate: `0 ${pill.top}px`,
            }}
          />
        )}
        {j.map(R)}
        {S.length > 0 && (
          <>
            <div className="mx-2 my-2 h-px bg-line" />
            {S.map(R)}
          </>
        )}
        <div className="mt-auto flex flex-col gap-1 pt-2">
          <div className="mx-2 mb-1 h-px bg-line" />
          {R({
            to: "/profile",
            label: "My Profile",
            icon: Vendor_User,
          })}
        </div>
      </nav>
      <div
        onPointerDown={x}
        onDoubleClick={b}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        title="Drag to resize · double-click to reset"
        className="group/resize absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize md:block"
      >
        <span
          className={`absolute inset-y-0 right-1 w-px transition-colors ${f ? "bg-accent-strong" : "bg-transparent group-hover/resize:bg-accent-line"}`}
        />
      </div>
      <button
        type="button"
        onClick={() => onSetCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="press absolute top-1/2 -right-3 z-30 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-ink-mute shadow-card hover:border-accent-line hover:text-accent-ink"
      >
        {collapsed ? (
          <Vendor_ChevronRight size={14} strokeWidth={2.4} />
        ) : (
          <Vendor_ChevronLeft size={14} strokeWidth={2.4} />
        )}
      </button>
    </aside>
  );
}
