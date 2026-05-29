// Design notes: The top bar completes the navy chrome — it meets the rail at the corner so the
//   workspace sits inside an L of deep navy. Title/subtitle anchor "where am I"; the one warm
//   primary action (New Request) glows against the navy and is always one reach away. Bell +
//   identity badge get on-navy treatments so the bright workspace below carries the colour.
// References: Notion/Linear top bars; persistent primary-action placement; warm-on-cool CTA.
import { Plus } from 'lucide-react';
import { useDemoContext } from '../../hooks/useDemoContext';
import { useRequestModal } from '../requests/RequestModalProvider';
import { firstName } from '../../utils/constants';
import Avatar from '../ui/Avatar';
import RolePill from '../ui/RolePill';
import Button from '../ui/Button';
import NotificationBell from './NotificationBell';

export default function TopBar({ title, subtitle }) {
  const { activeUser } = useDemoContext();
  const { openRequest } = useRequestModal();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2.5 border-b border-navy-600/70 bg-navy px-4 text-navy-fg sm:gap-3 sm:px-7">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-navy-fg">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-navy-fg-mute">{subtitle}</p>}
      </div>

      <Button variant="primary" size="sm" onClick={() => openRequest()} className="hidden sm:inline-flex">
        <Plus size={16} /> New Request
      </Button>
      <Button
        variant="primary"
        size="icon"
        onClick={() => openRequest()}
        className="sm:hidden"
        aria-label="New request"
      >
        <Plus size={18} />
      </Button>

      <NotificationBell onDark />

      {/* Active user / role badge */}
      <div className="flex items-center gap-2 rounded-full border border-navy-600 py-1 pl-1 pr-2.5 transition-colors hover:bg-navy-700 sm:pr-3">
        <Avatar name={activeUser?.name} id={activeUser?.id} size="sm" onDark />
        <div className="hidden leading-tight sm:block">
          <p className="text-[13px] font-semibold text-navy-fg">{firstName(activeUser?.name)}</p>
          <RolePill role={activeUser?.role} size="xs" onDark />
        </div>
      </div>
    </header>
  );
}
