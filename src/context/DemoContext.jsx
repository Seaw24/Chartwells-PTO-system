import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  USERS,
  TEAMS,
  PTO_TYPES,
  HOLIDAYS_2026,
  BLACKOUT_DATES,
  MOCK_REQUESTS,
  DEFAULT_GRANTS,
  DEMO_TODAY,
  STORAGE_KEY,
  userById,
  firstName,
  ptoTypeById,
} from '../utils/constants';
import { toDate, toISO, fmtShort, rangesOverlap } from '../utils/dateHelpers';
import {
  canDecideRequest,
  lineDays,
  lineEntriesForRequest,
  normalDaysOffForUser,
  requestLines,
  requestRangeLabel,
  requestTypeLabel,
} from '../utils/requestHelpers';

export const DemoContext = createContext(null);

const shiftISO = (iso, deltaDays) => toISO(new Date(toDate(iso).getTime() + deltaDays * 864e5));
const byId = (users, id) => users.find((u) => u.id === id);
const cleanNormalDays = (days) =>
  Array.from(new Set((Array.isArray(days) ? days : []).map(Number).filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b);

function buildDefaultGrants(users = USERS) {
  return users.reduce((acc, u) => {
    acc[u.id] = PTO_TYPES.reduce((row, t) => {
      row[t.id] = DEFAULT_GRANTS[u.id]?.[t.id] ?? t.defaultDays;
      return row;
    }, {});
    return acc;
  }, {});
}

function normalizeUsers(users = USERS) {
  return users.map((u) => ({
    ...u,
    normalDaysOff: cleanNormalDays(u.normalDaysOff).length ? cleanNormalDays(u.normalDaysOff) : [0, 6],
  }));
}

function normalizeGrants(users, grants = {}) {
  const seeded = buildDefaultGrants(users);
  users.forEach((u) => {
    PTO_TYPES.forEach((t) => {
      const raw = grants?.[u.id]?.[t.id];
      seeded[u.id][t.id] = Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : seeded[u.id][t.id];
    });
  });
  return seeded;
}

function normalizeRequest(seed, index) {
  const submittedAt = shiftISO(DEMO_TODAY, -(seed.daysAgo ?? 1));
  const decided = seed.status === 'approved' || seed.status === 'denied';
  return {
    id: seed.id || `r${index + 1}`,
    userId: seed.userId,
    lines: requestLines(seed).map((line) => ({ type: line.type, start: line.start, end: line.end })),
    status: seed.status,
    note: seed.note || '',
    decidedBy: seed.decidedBy || null,
    decidedAt: decided ? shiftISO(submittedAt, 1) : null,
    denialReason: seed.denialReason || null,
    submittedAt,
  };
}

function requestNotice(request) {
  const lines = requestLines(request);
  if (lines.length === 1) {
    return `${requestTypeLabel(request).toLowerCase()} request for ${fmtShort(lines[0].start)}–${fmtShort(lines[0].end)}`;
  }
  return `request with ${lines.length} PTO lines (${requestRangeLabel(request)})`;
}

// Build the initial, fully-derived state from seed constants, relative to demo "today".
function buildInitialState() {
  const users = normalizeUsers();
  const requests = MOCK_REQUESTS.map(normalizeRequest);

  return {
    activeUserId: 'rich',
    todayIso: DEMO_TODAY,
    users,
    grants: normalizeGrants(users),
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
      `Your ${requestNotice(approved)} was approved by ${firstName(userById(approved.decidedBy)?.name)}.`,
      'approved',
      approved.decidedAt
    );
  }
  const pending = requests.filter((r) => r.status === 'pending');
  pending.forEach((r) => {
    const u = userById(r.userId);
    push(
      { type: 'approvers', team: u?.team ?? null },
      `${u?.name} submitted a ${requestNotice(r)}.`,
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
      if (parsed && parsed.requests) {
        const users = normalizeUsers(parsed.users || USERS);
        return {
          ...buildInitialState(),
          ...parsed,
          users,
          grants: normalizeGrants(users, parsed.grants),
          requests: parsed.requests.map((r, i) => ({ ...normalizeRequest(r, i), id: r.id || `r${i + 1}`, submittedAt: r.submittedAt, decidedAt: r.decidedAt })),
          notifications: parsed.notifications || [],
          readNotificationIds: parsed.readNotificationIds || [],
        };
      }
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

  const { activeUserId, todayIso, users, grants, requests, notifications, readNotificationIds } = state;
  const activeUser = byId(users, activeUserId);

  // ---- selectors ----
  const normalDaysOffFor = useCallback(
    (userId) => normalDaysOffForUser(byId(users, userId)),
    [users]
  );

  const grantFor = useCallback(
    (userId, typeId) => grants?.[userId]?.[typeId] ?? ptoTypeById(typeId)?.defaultDays ?? 0,
    [grants]
  );

  const usedFor = useCallback(
    (userId, typeId) =>
      requests
        .filter((r) => r.userId === userId && r.status === 'approved')
        .reduce((sum, r) => {
          const daysOff = normalDaysOffFor(userId);
          return sum + requestLines(r)
            .filter((line) => line.type === typeId)
            .reduce((lineSum, line) => lineSum + lineDays(line, daysOff), 0);
        }, 0),
    [normalDaysOffFor, requests]
  );

  const balanceFor = useCallback(
    (userId, typeId) => grantFor(userId, typeId) - usedFor(userId, typeId),
    [grantFor, usedFor]
  );

  const requestsForUser = useCallback(
    (userId) =>
      requests
        .filter((r) => r.userId === userId)
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
    [requests]
  );

  const teamMembers = useCallback(
    (teamId) => users.filter((u) => (teamId ? u.team === teamId : true)),
    [users]
  );

  // Pending requests this user is allowed to act on.
  const pendingForApprover = useCallback(
    (user) => {
      if (!user) return [];
      return requests.filter((r) => canDecideRequest(user, r, users));
    },
    [requests, users]
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
        .flatMap((r) =>
          lineEntriesForRequest(r)
            .filter(
              (entry) =>
                entry.status === 'approved' &&
                rangesOverlap(iso, iso, entry.start, entry.end) &&
                (!teamId || byId(users, entry.userId)?.team === teamId)
            )
            .map((entry) => ({ ...entry, user: byId(users, entry.userId) }))
        ),
    [requests, users]
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
        const author = byId(s.users, s.activeUserId);
        return {
          ...s,
          requests: [
            {
              id,
              userId: s.activeUserId,
              lines: requestLines(draft).map((line) => ({ type: line.type, start: line.start, end: line.end })),
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
              text: `${author?.name} submitted a ${requestNotice(draft)}.`,
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

  const decideRequest = useCallback((id, decision, deciderId, reason = null) => {
    setState((s) => {
      const target = s.requests.find((r) => r.id === id);
      if (!target) return s;
      const actor = byId(s.users, deciderId);
      if (!canDecideRequest(actor, target, s.users)) return s;
      const deciderName = firstName(actor?.name);
      const verb = decision === 'approved' ? 'approved' : 'denied';
      return {
        ...s,
        requests: s.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: decision,
                decidedBy: deciderId,
                decidedAt: s.todayIso,
                denialReason: decision === 'denied' ? reason : null,
              }
            : r
        ),
        notifications: [
          {
            id: `n${Date.now()}`,
            audience: { type: 'user', id: target.userId },
            text: `Your ${requestNotice(target)} was ${verb} by ${deciderName}.`,
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

  const setGrant = useCallback((userId, typeId, amount) => {
    const nextAmount = Math.max(0, Number(amount) || 0);
    setState((s) => ({
      ...s,
      grants: {
        ...s.grants,
        [userId]: {
          ...(s.grants[userId] || {}),
          [typeId]: nextAmount,
        },
      },
    }));
    return nextAmount;
  }, []);

  const setNormalDaysOff = useCallback((userId, days) => {
    const nextDays = cleanNormalDays(days);
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, normalDaysOff: nextDays } : u)),
    }));
    return nextDays;
  }, []);

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
    users,
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
    grantFor,
    normalDaysOffFor,
    requestsForUser,
    teamMembers,
    pendingForApprover,
    recentDecisionsBy,
    outOnDay,
    canDecideRequest: (user, request) => canDecideRequest(user, request, users),
    // mutations
    submitRequest,
    cancelRequest,
    approveRequest,
    denyRequest,
    approveMany,
    undoDecision,
    setGrant,
    setNormalDaysOff,
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
