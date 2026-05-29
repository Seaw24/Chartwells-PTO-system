import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  USERS,
  TEAMS,
  PTO_TYPES,
  HOLIDAYS_2026,
  BLACKOUT_DATES,
  MOCK_REQUESTS,
  DEFAULT_BALANCES,
  DEMO_TODAY,
  STORAGE_KEY,
  userById,
  firstName,
  ptoTypeById,
} from '../utils/constants';
import { toDate, toISO, businessDays, fmtShort, rangesOverlap } from '../utils/dateHelpers';

export const DemoContext = createContext(null);

const shiftISO = (iso, deltaDays) => toISO(new Date(toDate(iso).getTime() + deltaDays * 864e5));

// Build the initial, fully-derived state from seed constants, relative to demo "today".
function buildInitialState() {
  const requests = MOCK_REQUESTS.map((r, i) => {
    const submittedAt = shiftISO(DEMO_TODAY, -(r.daysAgo ?? 1));
    const decided = r.status === 'approved' || r.status === 'denied';
    return {
      id: `r${i + 1}`,
      userId: r.userId,
      type: r.type,
      start: r.start,
      end: r.end,
      status: r.status,
      note: r.note || '',
      decidedBy: r.decidedBy || null,
      decidedAt: decided ? shiftISO(submittedAt, 1) : null,
      denialReason: r.denialReason || null,
      submittedAt,
    };
  });

  return {
    activeUserId: 'rich',
    todayIso: DEMO_TODAY,
    requests,
    notifications: buildSeedNotifications(requests),
    readNotificationIds: [],
  };
}

function buildSeedNotifications(requests) {
  const notes = [];
  let n = 1;
  const push = (audience, text, kind, createdAt) =>
    notes.push({ id: `n${n++}`, audience, text, kind, createdAt });

  // A few request-driven items.
  const approved = requests.find((r) => r.status === 'approved' && r.userId === 'alex');
  if (approved) {
    push(
      { type: 'user', id: approved.userId },
      `Your vacation request for ${fmtShort(approved.start)}–${fmtShort(approved.end)} was approved by ${firstName(userById(approved.decidedBy)?.name)}.`,
      'approved',
      approved.decidedAt
    );
  }
  const pending = requests.filter((r) => r.status === 'pending');
  pending.forEach((r) => {
    const u = userById(r.userId);
    push(
      { type: 'approvers', team: u?.team ?? null },
      `${u?.name} submitted a ${ptoTypeById(r.type)?.name} request for ${fmtShort(r.start)}–${fmtShort(r.end)}.`,
      'submitted',
      r.submittedAt
    );
  });
  const oldPending = pending.find((r) => r.userId === 'casey');
  if (oldPending) {
    push(
      { type: 'approvers', team: userById(oldPending.userId)?.team ?? null },
      `Reminder: ${userById(oldPending.userId)?.name}'s request has been pending for several days.`,
      'reminder',
      shiftISO(DEMO_TODAY, -1)
    );
  }
  // Upcoming blackout + holiday awareness for everyone.
  push({ type: 'all' }, `Blackout period upcoming: ${fmtShort(BLACKOUT_DATES[1].start)}–${fmtShort(BLACKOUT_DATES[1].end)} (${BLACKOUT_DATES[1].reason}).`, 'blackout', shiftISO(DEMO_TODAY, -2));
  push({ type: 'all' }, `Holiday reminder: ${HOLIDAYS_2026[3].name} on ${fmtShort(HOLIDAYS_2026[3].date)}.`, 'holiday', shiftISO(DEMO_TODAY, -4));

  return notes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.requests) return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return buildInitialState();
}

export function DemoProvider({ children }) {
  const [state, setState] = useState(loadState);
  const idRef = useRef(state.requests.length + 1);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — demo still works in-memory */
    }
  }, [state]);

  const { activeUserId, todayIso, requests, notifications, readNotificationIds } = state;
  const activeUser = userById(activeUserId);

  // ---- selectors ----
  const usedFor = useCallback(
    (userId, typeId) =>
      requests
        .filter((r) => r.userId === userId && r.type === typeId && r.status === 'approved')
        .reduce((sum, r) => sum + businessDays(r.start, r.end), 0),
    [requests]
  );

  const balanceFor = useCallback(
    (userId, typeId) => (DEFAULT_BALANCES[typeId] ?? 0) - usedFor(userId, typeId),
    [usedFor]
  );

  const requestsForUser = useCallback(
    (userId) =>
      requests
        .filter((r) => r.userId === userId)
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
    [requests]
  );

  const teamMembers = useCallback(
    (teamId) => USERS.filter((u) => (teamId ? u.team === teamId : true)),
    []
  );

  // Pending requests this user is allowed to act on.
  const pendingForApprover = useCallback(
    (user) => {
      if (!user) return [];
      return requests.filter((r) => {
        if (r.status !== 'pending') return false;
        if (user.role === 'god_admin') return true;
        if (user.role === 'admin') {
          const author = userById(r.userId);
          return author?.team === user.team && author.id !== user.id;
        }
        return false;
      });
    },
    [requests]
  );

  const recentDecisionsBy = useCallback(
    (user, days = 30) => {
      if (!user) return [];
      const cutoff = shiftISO(todayIso, -days);
      return requests
        .filter(
          (r) =>
            ['approved', 'denied'].includes(r.status) &&
            r.decidedBy === user.id &&
            r.decidedAt &&
            r.decidedAt >= cutoff
        )
        .sort((a, b) => (a.decidedAt < b.decidedAt ? 1 : -1));
    },
    [requests, todayIso]
  );

  // Who is off (approved) on a given ISO day, optionally filtered to a team.
  const outOnDay = useCallback(
    (iso, teamId = null) =>
      requests
        .filter(
          (r) =>
            r.status === 'approved' &&
            rangesOverlap(iso, iso, r.start, r.end) &&
            (!teamId || userById(r.userId)?.team === teamId)
        )
        .map((r) => ({ ...r, user: userById(r.userId) })),
    [requests]
  );

  // ---- mutations ----
  const newId = () => `r${idRef.current++}`;

  const addNotification = (audience, text, kind) =>
    setState((s) => ({
      ...s,
      notifications: [
        { id: `n${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, audience, text, kind, createdAt: s.todayIso },
        ...s.notifications,
      ],
    }));

  const submitRequest = useCallback(
    (draft) => {
      const id = newId();
      setState((s) => {
        const author = userById(s.activeUserId);
        return {
          ...s,
          requests: [
            {
              id,
              userId: s.activeUserId,
              type: draft.type,
              start: draft.start,
              end: draft.end,
              status: 'pending',
              note: draft.note || '',
              decidedBy: null,
              decidedAt: null,
              denialReason: null,
              submittedAt: s.todayIso,
            },
            ...s.requests,
          ],
          notifications: [
            {
              id: `n${Date.now()}`,
              audience: { type: 'approvers', team: author?.team ?? null },
              text: `${author?.name} submitted a ${ptoTypeById(draft.type)?.name} request for ${fmtShort(draft.start)}–${fmtShort(draft.end)}.`,
              kind: 'submitted',
              createdAt: s.todayIso,
            },
            ...s.notifications,
          ],
        };
      });
      return id;
    },
    []
  );

  const cancelRequest = useCallback((id) => {
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id && r.status === 'pending' ? { ...r, status: 'cancelled' } : r
      ),
    }));
  }, []);

  const decideRequest = useCallback((id, decision, byId, reason = null) => {
    setState((s) => {
      const target = s.requests.find((r) => r.id === id);
      if (!target) return s;
      const deciderName = firstName(userById(byId)?.name);
      const typeName = ptoTypeById(target.type)?.name;
      const verb = decision === 'approved' ? 'approved' : 'denied';
      return {
        ...s,
        requests: s.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: decision,
                decidedBy: byId,
                decidedAt: s.todayIso,
                denialReason: decision === 'denied' ? reason : null,
              }
            : r
        ),
        notifications: [
          {
            id: `n${Date.now()}`,
            audience: { type: 'user', id: target.userId },
            text: `Your ${typeName} request for ${fmtShort(target.start)}–${fmtShort(target.end)} was ${verb} by ${deciderName}.`,
            kind: decision,
            createdAt: s.todayIso,
          },
          ...s.notifications,
        ],
      };
    });
  }, []);

  const undoDecision = useCallback((id) => {
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id
          ? { ...r, status: 'pending', decidedBy: null, decidedAt: null, denialReason: null }
          : r
      ),
    }));
  }, []);

  const approveRequest = useCallback((id, byId) => decideRequest(id, 'approved', byId), [decideRequest]);
  const denyRequest = useCallback((id, byId, reason) => decideRequest(id, 'denied', byId, reason), [decideRequest]);
  const approveMany = useCallback(
    (ids, byId) => ids.forEach((id) => decideRequest(id, 'approved', byId)),
    [decideRequest]
  );

  // ---- notifications ----
  const visibleNotifications = useMemo(() => {
    if (!activeUser) return [];
    return notifications
      .filter((notif) => {
        const a = notif.audience;
        if (a.type === 'all') return true;
        if (a.type === 'user') return a.id === activeUser.id;
        if (a.type === 'approvers') {
          if (activeUser.role === 'god_admin') return true;
          if (activeUser.role === 'admin') return a.team === activeUser.team;
        }
        return false;
      })
      .map((notif) => ({ ...notif, read: readNotificationIds.includes(notif.id) }));
  }, [notifications, activeUser, readNotificationIds]);

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  const markNotificationRead = useCallback(
    (id) =>
      setState((s) =>
        s.readNotificationIds.includes(id)
          ? s
          : { ...s, readNotificationIds: [...s.readNotificationIds, id] }
      ),
    []
  );
  const markAllRead = useCallback(
    () =>
      setState((s) => ({
        ...s,
        readNotificationIds: Array.from(new Set([...s.readNotificationIds, ...s.notifications.map((n) => n.id)])),
      })),
    []
  );

  // ---- demo controls ----
  const setActiveUser = useCallback((id) => setState((s) => ({ ...s, activeUserId: id })), []);
  const setToday = useCallback((iso) => setState((s) => ({ ...s, todayIso: iso })), []);
  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = buildInitialState();
    idRef.current = fresh.requests.length + 1;
    setState(fresh);
  }, []);

  const value = {
    // data
    users: USERS,
    teams: TEAMS,
    ptoTypes: PTO_TYPES,
    holidays: HOLIDAYS_2026,
    blackouts: BLACKOUT_DATES,
    requests,
    // active
    activeUser,
    activeUserId,
    todayIso,
    // selectors
    usedFor,
    balanceFor,
    requestsForUser,
    teamMembers,
    pendingForApprover,
    recentDecisionsBy,
    outOnDay,
    // mutations
    submitRequest,
    cancelRequest,
    approveRequest,
    denyRequest,
    approveMany,
    undoDecision,
    addNotification,
    // notifications
    notifications: visibleNotifications,
    unreadCount,
    markNotificationRead,
    markAllRead,
    // demo controls
    setActiveUser,
    setToday,
    resetDemo,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
