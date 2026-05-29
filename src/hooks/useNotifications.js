import { useMemo } from 'react';
import { useDemoContext } from './useDemoContext';
import { format } from 'date-fns';
import { toDate } from '../utils/dateHelpers';

// Groups the active user's notifications by calendar day for the bell dropdown.
export function useNotifications() {
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useDemoContext();

  const groups = useMemo(() => {
    const byDay = new Map();
    notifications.forEach((n) => {
      const key = format(toDate(n.createdAt), 'yyyy-MM-dd');
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(n);
    });
    return Array.from(byDay.entries()).map(([day, items]) => ({
      day,
      label: format(toDate(day), 'EEEE, MMM d'),
      items,
    }));
  }, [notifications]);

  return { notifications, groups, unreadCount, markNotificationRead, markAllRead };
}
