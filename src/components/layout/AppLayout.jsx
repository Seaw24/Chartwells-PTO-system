// Design notes: Sidebar + top bar on desktop; a 5-slot bottom tab bar on mobile for the
//   phone-mid-shift case. Page content fades in on route change (keyed by pathname) and is
//   width-capped for readable line lengths. Mobile nav surfaces the approvals badge.
// References: standard product app shell (Linear/Vercel); phone-first PTO tools (Timetastic).
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Calendar, Mail, CheckSquare, Users, BarChart3, Settings, User, LayoutDashboard } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { canApprove, isGodAdmin } from '../../utils/constants';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const TITLES = {
  '/': { title: 'Dashboard' },
  '/calendar': { title: 'Calendar', subtitle: 'Who is off, and when' },
  '/requests': { title: 'My Requests' },
  '/approvals': { title: 'Approvals', subtitle: 'Requests waiting on you' },
  '/team': { title: 'Team' },
  '/reports': { title: 'Reports', subtitle: 'Time-off patterns across the department' },
  '/settings': { title: 'Settings', subtitle: 'Policies, holidays, and people' },
  '/profile': { title: 'My Profile' },
  '/request': { title: 'Request Time Off' },
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const { activeUser, pendingForApprover } = useDemoContext();
  const meta = TITLES[pathname] || { title: 'Chartwells PTO' };

  const bottomNav = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/requests', label: 'Requests', icon: Mail },
    canApprove(activeUser?.role) && { to: '/approvals', label: 'Approvals', icon: CheckSquare, badge: pendingForApprover(activeUser).length },
    canApprove(activeUser?.role) && { to: '/team', label: 'Team', icon: Users },
    isGodAdmin(activeUser?.role) && { to: '/reports', label: 'Reports', icon: BarChart3 },
    isGodAdmin(activeUser?.role) && { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/profile', label: 'Profile', icon: User },
  ].filter(Boolean).slice(0, 5);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={meta.title} subtitle={meta.subtitle} />
        <main className="scrollbar-slim flex-1 overflow-y-auto pb-20 md:pb-0">
          <div key={pathname} className="mx-auto max-w-[1380px] animate-fade-in p-5 sm:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — part of the navy chrome */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-navy-600/70 bg-navy pb-[env(safe-area-inset-bottom)] md:hidden">
        {bottomNav.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-navy-fg-mute'
              }`
            }
          >
            <it.icon size={20} strokeWidth={2} />
            {it.label}
            {!!it.badge && (
              <span className="absolute right-[24%] top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
