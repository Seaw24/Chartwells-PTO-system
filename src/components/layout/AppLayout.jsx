import { QueryBoundary } from "../ui/QueryBoundary.jsx";
import { useCurrentUser } from "../../context/AuthContext.jsx";
import { useNavigate as Vendor_useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import React from "react";
import { usePresence } from "../../hooks/motion.jsx";
import { User as Vendor_User } from "lucide-react";
import { canApprove } from "../../utils/constants.jsx";
import { Settings as Vendor_Settings } from "lucide-react";
import { LogOut as Vendor_LogOut } from "lucide-react";
import { Avatar } from "../ui/Avatar.jsx";
import { isGodAdmin } from "../../utils/constants.jsx";
import { RolePill } from "../ui/RolePill.jsx";
import { useRequestModal } from "../requests/RequestModalProvider.jsx";
import { Button } from "../ui/Button.jsx";
import { Plus as Vendor_Plus } from "lucide-react";
import { useLocation as Vendor_useLocation } from "react-router-dom";
import { useDataSource } from "../../data/dataSource.jsx";
import { useResource } from "../../hooks/useResource.jsx";
import { LayoutDashboard as Vendor_LayoutDashboard } from "lucide-react";
import { Calendar as Vendor_Calendar } from "lucide-react";
import { Mail as Vendor_Mail } from "lucide-react";
import { SquareCheckBig as Vendor_SquareCheckBig } from "lucide-react";
import { Users as Vendor_Users } from "lucide-react";
import { ChartColumn as Vendor_ChartColumn } from "lucide-react";
import { Sidebar } from "./Sidebar.jsx";
import { Outlet as Vendor_Outlet } from "react-router-dom";
import { NavLink as Vendor_NavLink } from "react-router-dom";
export function AccountMenu() {
  const e = useCurrentUser(),
    t = Vendor_useNavigate(),
    { signOut: signOut } = useAuth(),
    [r, s] = React.useState(!1),
    i = React.useRef(null),
    { mounted: mounted, closing: closing } = usePresence(r, 120),
    l = React.useRef(null),
    u = React.useRef([]),
    h = [
      {
        key: "profile",
        label: "My profile",
        icon: Vendor_User,
        onSelect: () => t("/profile"),
      },
      canApprove(e == null ? void 0 : e.role) && {
        key: "settings",
        label: "Settings",
        icon: Vendor_Settings,
        onSelect: () => t("/settings"),
      },
      {
        key: "logout",
        label: "Log out",
        icon: Vendor_LogOut,
        danger: !0,
        onSelect: async () => {
          (await signOut(),
            t("/login", {
              replace: !0,
            }));
        },
      },
    ].filter(Boolean),
    d = (y = !0) => {
      (s(!1),
        y &&
          requestAnimationFrame(() => {
            var g;
            return (g = l.current) == null ? void 0 : g.focus();
          }));
    },
    f = (y) => {
      (y.onSelect(), d(!1));
    };
  (React.useEffect(() => {
    if (!r) return;
    const y = (g) => {
      i.current && !i.current.contains(g.target) && s(!1);
    };
    return (
      document.addEventListener("mousedown", y),
      () => document.removeEventListener("mousedown", y)
    );
  }, [r]),
    React.useLayoutEffect(() => {
      var y;
      r && ((y = u.current[0]) == null || y.focus());
    }, [r]));
  const p = (y) => {
    var v, m, x, b;
    const g = h.length - 1,
      k = u.current.findIndex((N) => N === document.activeElement);
    y.key === "ArrowDown"
      ? (y.preventDefault(),
        (v = u.current[k < g ? k + 1 : 0]) == null || v.focus())
      : y.key === "ArrowUp"
        ? (y.preventDefault(),
          (m = u.current[k > 0 ? k - 1 : g]) == null || m.focus())
        : y.key === "Home"
          ? (y.preventDefault(), (x = u.current[0]) == null || x.focus())
          : y.key === "End"
            ? (y.preventDefault(), (b = u.current[g]) == null || b.focus())
            : y.key === "Escape"
              ? d()
              : y.key === "Tab" && d(!1);
  };
  return (
    <div className="relative" ref={i}>
      <button
        ref={l}
        type="button"
        onClick={() => s((y) => !y)}
        onKeyDown={(y) => {
          y.key === "ArrowDown" && !r && (y.preventDefault(), s(!0));
        }}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={r}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-offset-2 ring-offset-card transition-shadow ${r ? "ring-2 ring-accent" : "ring-1 ring-line hover:ring-2 hover:ring-accent/40"}`}
      >
        <Avatar
          name={e == null ? void 0 : e.name}
          id={e == null ? void 0 : e.id}
          size="sm"
        />
      </button>
      {mounted && (
        <div
          role="menu"
          aria-label="Account"
          onKeyDown={p}
          className={`absolute right-0 z-40 mt-2 w-[min(88vw,17rem)] origin-top-right overflow-hidden rounded-card border border-line bg-card shadow-pop ${closing ? "pointer-events-none animate-scale-out" : "animate-scale-in"}`}
        >
          <div className="flex items-center gap-3 px-4 pb-3.5 pt-4">
            <Avatar
              name={e == null ? void 0 : e.name}
              id={e == null ? void 0 : e.id}
              size="md"
              ring={!0}
            />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-ink">
                {e == null ? void 0 : e.name}
              </p>
              <p className="truncate text-xs text-ink-mute">
                {e == null ? void 0 : e.email}
              </p>
              {isGodAdmin(e == null ? void 0 : e.role) && (
                <RolePill
                  role={e == null ? void 0 : e.role}
                  size="xs"
                  className="mt-1.5"
                />
              )}
            </div>
          </div>
          <div className="h-px bg-line" />
          <div className="p-1.5">
            {h.map((LocalComponent_y, g) => (
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                ref={(k) => {
                  u.current[g] = k;
                }}
                onClick={() => f(LocalComponent_y)}
                className={`flex w-full items-center gap-3 rounded-btn px-2.5 py-2 text-sm font-medium transition-colors ${LocalComponent_y.danger ? "text-danger-ink hover:bg-danger-soft" : "text-ink-soft hover:bg-panel hover:text-ink"} ${LocalComponent_y.key === "logout" ? "mt-1.5 border-t border-line-soft pt-2.5" : ""}`}
                key={LocalComponent_y.key}
              >
                <LocalComponent_y.icon
                  size={16}
                  strokeWidth={2}
                  className="shrink-0"
                />
                {LocalComponent_y.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export function TopBar({ title: title, subtitle: subtitle }) {
  const { openRequest: openRequest } = useRequestModal();
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2.5 border-b border-line bg-card px-4 sm:gap-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[13px] text-ink-mute">{subtitle}</p>
        )}
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={() => openRequest()}
        className="hidden sm:inline-flex"
      >
        <Vendor_Plus size={16} />
        {" New Request"}
      </Button>
      <Button
        variant="primary"
        size="icon"
        onClick={() => openRequest()}
        className="sm:hidden"
        aria-label="New request"
      >
        <Vendor_Plus size={18} />
      </Button>
      <AccountMenu />
    </header>
  );
}
export const TS = {
  "/": {
    title: "Dashboard",
  },
  "/calendar": {
    title: "Calendar",
    subtitle: "Who is off, and when",
  },
  "/requests": {
    title: "My Requests",
  },
  "/approvals": {
    title: "Approvals",
    subtitle: "Requests waiting on you",
  },
  "/team": {
    title: "Team",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Time-off patterns across the department",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage the settings available to you",
  },
  "/profile": {
    title: "My Profile",
  },
  "/request": {
    title: "Request Time Off",
  },
};
export const Ax = "chartwells-sidebar-collapsed";
export const CS = () => {
  try {
    return localStorage.getItem(Ax) === "1";
  } catch {
    return !1;
  }
};
export function AppLayout() {
  const { pathname: pathname } = Vendor_useLocation(),
    [t, n] = React.useState(CS),
    r = (d) =>
      n((f) => {
        const p = typeof d == "function" ? d(f) : d;
        if (p === f) return f;
        try {
          localStorage.setItem(Ax, p ? "1" : "0");
        } catch {}
        return p;
      }),
    s = useCurrentUser(),
    { pendingForApprover: pendingForApprover } = useDataSource(),
    { data: pending = [] } = useResource(
      ["pending-approvals"],
      () => pendingForApprover(),
      canApprove(s?.role),
    ),
    c = pending.length;
  const u = TS[pathname] || {
      title: "Chartwells PTO",
    },
    h = [
      {
        to: "/",
        label: "Home",
        icon: Vendor_LayoutDashboard,
      },
      {
        to: "/calendar",
        label: "Calendar",
        icon: Vendor_Calendar,
      },
      {
        to: "/requests",
        label: "Requests",
        icon: Vendor_Mail,
      },
      canApprove(s == null ? void 0 : s.role) && {
        to: "/approvals",
        label: "Approvals",
        icon: Vendor_SquareCheckBig,
        badge: c,
      },
      canApprove(s == null ? void 0 : s.role) && {
        to: "/settings",
        label: "Settings",
        icon: Vendor_Settings,
      },
      canApprove(s == null ? void 0 : s.role) && {
        to: "/team",
        label: "Team",
        icon: Vendor_Users,
      },
      isGodAdmin(s == null ? void 0 : s.role) && {
        to: "/reports",
        label: "Reports",
        icon: Vendor_ChartColumn,
      },
      {
        to: "/profile",
        label: "Profile",
        icon: Vendor_User,
      },
    ]
      .filter(Boolean)
      .slice(0, 5);
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar collapsed={t} onSetCollapsed={r} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={u.title} subtitle={u.subtitle} />
        <main className="scrollbar-slim flex flex-1 flex-col overflow-y-auto pb-20 md:pb-0">
          <div
            className="mx-auto flex w-full min-h-0 max-w-[1380px] flex-1 flex-col animate-page-in p-5 sm:p-8"
            key={pathname}
          >
            <QueryBoundary>
              <Vendor_Outlet />
            </QueryBoundary>
          </div>
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {h.map((LocalComponent_d) => (
          <Vendor_NavLink
            to={LocalComponent_d.to}
            end={LocalComponent_d.to === "/"}
            className={({ isActive: isActive }) =>
              `press relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${isActive ? "text-accent-ink" : "text-ink-mute"}`
            }
            key={LocalComponent_d.to}
          >
            {({ isActive: isActive }) => (
              <>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 mx-auto h-0.5 rounded-full bg-accent-strong transition-[width,opacity] duration-[220ms] ease-quart ${isActive ? "w-8 opacity-100" : "w-0 opacity-0"}`}
                />
                <LocalComponent_d.icon size={20} strokeWidth={2} />
                {LocalComponent_d.label}
                {!!LocalComponent_d.badge && (
                  <span className="absolute right-[24%] top-1.5 h-1.5 w-1.5 rounded-full bg-accent-strong" />
                )}
              </>
            )}
          </Vendor_NavLink>
        ))}
      </nav>
    </div>
  );
}
