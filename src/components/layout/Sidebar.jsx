import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Mail,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
} from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { canApprove, isGodAdmin } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import RolePill from '../ui/RolePill';

// Design notes: Deep navy rail — the branded spine that anchors the whole product and makes the
//   light workspace read as intentional, not bare. The warm accent appears only where it earns
//   attention: the brand mark, the active item (lifted navy-700 surface + accent rail + accent
//   icon), and the approvals badge (the one thing demanding action). Inactive labels sit at
//   navy-fg-mute so the active row is unmistakable. Selection is never colour alone (rail + fill + weight).
// References: Linear / Vercel dark rails; warm-on-cool restraint.
export default function Sidebar({ collapsed, onToggle }) {
  const { activeUser, requestsForUser, pendingForApprover } = useDemoContext();
  const navigate = useNavigate();

  const myPending = requestsForUser(activeUser?.id).filter((r) => r.status === 'pending').length;
  const approvalsPending = pendingForApprover(activeUser).length;

  const items = [
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/requests', label: 'My Requests', icon: Mail, badge: myPending },
    canApprove(activeUser?.role) && { to: '/approvals', label: 'Approvals', icon: CheckSquare, badge: approvalsPending, accent: true },
    canApprove(activeUser?.role) && { to: '/team', label: 'Team', icon: Users },
    isGodAdmin(activeUser?.role) && { to: '/reports', label: 'Reports', icon: BarChart3 },
    isGodAdmin(activeUser?.role) && { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/profile', label: 'My Profile', icon: User },
  ].filter(Boolean);

  return (
    <aside
      className={`hidden shrink-0 flex-col bg-navy text-navy-fg transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[68px]' : 'w-[244px]'
      }`}
    >
      {/* Brand */}
      <div className={`flex h-16 items-center gap-3 px-4 ${collapsed ? 'justify-center px-0' : ''}`}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-accent-strong text-white shadow-sm">
          <CalendarDays size={19} />
        </span>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-navy-fg">Chartwells</p>
            <p className="text-[11px] font-medium text-navy-fg-mute">Time off</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-navy flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            title={collapsed ? it.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-btn px-3 py-2 text-sm transition-colors duration-[120ms] ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'bg-navy-700 font-semibold text-navy-fg'
                  : 'font-medium text-navy-fg-mute hover:bg-navy-700/60 hover:text-navy-fg'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
                )}
                <it.icon
                  size={18}
                  className={`shrink-0 ${isActive ? 'text-accent' : 'text-navy-fg-mute group-hover:text-navy-fg'}`}
                  strokeWidth={isActive ? 2.25 : 2}
                />
                {!collapsed && <span className="flex-1">{it.label}</span>}
                {!!it.badge && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold tabular ${
                      it.accent ? 'bg-accent text-navy' : 'bg-navy-600 text-navy-fg'
                    } ${collapsed ? 'absolute right-1 top-1 h-4 min-w-4' : ''}`}
                  >
                    {it.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-navy-600/70 p-3">
        <div className={`flex items-center gap-2.5 rounded-btn p-1.5 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar name={activeUser?.name} id={activeUser?.id} size="sm" onDark ring />
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-navy-fg">{activeUser?.name}</p>
              <RolePill role={activeUser?.role} size="xs" className="mt-1" onDark />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => navigate('/login')}
              className="grid h-8 w-8 place-items-center rounded-btn text-navy-fg-mute transition-colors hover:bg-navy-700 hover:text-navy-fg"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`mt-1 flex w-full items-center gap-3 rounded-btn px-3 py-2 text-xs font-medium text-navy-fg-mute transition-colors hover:bg-navy-700 hover:text-navy-fg ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
