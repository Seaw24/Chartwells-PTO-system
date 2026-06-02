import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useDataSource } from '../data/dataSource';
import { toDate } from '../utils/dateHelpers';

// Groups the active user's notifications by calendar day for the bell dropdown.
export function useNotifications() {
  const { getNotifications, unreadCount, markNotificationRead, markAllRead } = useDataSource();
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getNotifications(), unreadCount()]).then(([notifications, count]) => {
      if (alive) setData({ notifications, unreadCount: count });
    });
    return () => { alive = false; };
  }, [refresh]);

  const groups = useMemo(() => {
    const byDay = new Map();
    data.notifications.forEach((n) => {
      const key = format(toDate(n.createdAt), 'yyyy-MM-dd');
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(n);
    });
    return Array.from(byDay.entries()).map(([day, items]) => ({
      day,
      label: format(toDate(day), 'EEEE, MMM d'),
      items,
    }));
  }, [data.notifications]);

  const readOne = (id) => {
    markNotificationRead(id).then(() => setRefresh((r) => r + 1));
  };

  const readAll = () => {
    markAllRead().then(() => setRefresh((r) => r + 1));
  };

  return { notifications: data.notifications, groups, unreadCount: data.unreadCount, markNotificationRead: readOne, markAllRead: readAll };
}
