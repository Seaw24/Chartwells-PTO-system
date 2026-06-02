// src/data/mockDataSource.js
//
// MockDataSource: the CURRENT implementation of the data-service contract (see
// dataSource.js). It is backed by the demo state that already lives in DemoContext
// (mock data + localStorage). This stays as the dev/test implementation after
// Supabase lands.
//
// Its only job is to expose DemoContext's existing logic under the contract's names
// and shapes, and to fill in the actor (the current user) from the demo's active
// user, so screens never pass "who am I". It contains no new product logic: it is an
// adapter, not a brain.
//
// Two things to know about this being a MOCK:
//   1. Async shim. The contract is async (every method returns a Promise) so the
//      Supabase swap is invisible to screens. The mock answers from memory, so we
//      just wrap its answers in async functions.
//   2. Write-return shim. React state updates on the NEXT render, so right after we
//      call a DemoContext mutation, the `ctx.requests` we hold here is still the old
//      snapshot. To honor the contract (writes return the updated object) we rebuild
//      the returned object from the snapshot plus the change we just made. This small
//      duplication is mock-only: SupabaseDataSource will simply return the row that
//      its `await` hands back, with no shim.

import { useDemoContext } from '../hooks/useDemoContext';
import { userById } from '../utils/constants';

/**
 * @returns {import('./dataSource').DataSource}
 */
export function useMockDataSource() {
  const ctx = useDemoContext();
  const me = ctx.activeUser; // the session actor, faked by the demo toolbar

  const find = (id) => ctx.requests.find((r) => r.id === id) ?? null;

  // Rebuilt each render so every method closes over fresh data. Cheap at this scale.
  return {
    /* ------------------------------- reads ------------------------------- */
    getRequests: async () => ctx.requests,
    requestsForUser: async (userId) => ctx.requestsForUser(userId),
    pendingForApprover: async (teamId = null) => {
      const list = ctx.pendingForApprover(me);
      return teamId ? list.filter((r) => userById(r.userId)?.team === teamId) : list;
    },
    recentDecisionsBy: async (days = 30) => ctx.recentDecisionsBy(me, days),
    outOnDay: async (iso, teamId = null) => ctx.outOnDay(iso, teamId),
    balanceFor: async (userId, typeId) => ctx.balanceFor(userId, typeId),
    usedFor: async (userId, typeId) => ctx.usedFor(userId, typeId),
    getUsers: async () => ctx.users,
    getTeams: async () => ctx.teams,
    getPtoTypes: async () => ctx.ptoTypes,
    getHolidays: async () => ctx.holidays,
    getBlackouts: async () => ctx.blackouts,
    teamMembers: async (teamId) => ctx.teamMembers(teamId),
    getNotifications: async () => ctx.notifications,
    unreadCount: async () => ctx.unreadCount,

    /* ------------------------------- writes ------------------------------ */
    // Actor (me.id) is filled in here, never passed by the screen.

    submitRequest: async (draft) => {
      const id = ctx.submitRequest(draft); // DemoContext returns the new id
      return {
        id,
        userId: me.id,
        type: draft.type,
        start: draft.start,
        end: draft.end,
        status: 'pending',
        note: draft.note || '',
        decidedBy: null,
        decidedAt: null,
        denialReason: null,
        submittedAt: ctx.todayIso,
      };
    },

    cancelRequest: async (id) => {
      const prev = find(id);
      ctx.cancelRequest(id);
      return prev ? { ...prev, status: 'cancelled' } : null;
    },

    approveRequest: async (id) => {
      const prev = find(id);
      ctx.approveRequest(id, me.id);
      return prev
        ? { ...prev, status: 'approved', decidedBy: me.id, decidedAt: ctx.todayIso, denialReason: null }
        : null;
    },

    denyRequest: async (id, reason) => {
      const prev = find(id);
      ctx.denyRequest(id, me.id, reason);
      return prev
        ? { ...prev, status: 'denied', decidedBy: me.id, decidedAt: ctx.todayIso, denialReason: reason }
        : null;
    },

    approveMany: async (ids) => {
      // Best-effort: you can only approve what is currently pending and yours to act
      // on. Anything else is skipped and reported in `failed` for the screen to warn.
      const allowed = new Set(ctx.pendingForApprover(me).map((r) => r.id));
      const approved = [];
      const failed = [];
      ids.forEach((id) => {
        if (!allowed.has(id)) {
          failed.push({ id, reason: 'not pending, or not yours to approve' });
          return;
        }
        const prev = find(id);
        ctx.approveRequest(id, me.id);
        if (prev) {
          approved.push({ ...prev, status: 'approved', decidedBy: me.id, decidedAt: ctx.todayIso, denialReason: null });
        }
      });
      return { approved, failed };
    },

    undoDecision: async (id) => {
      // NOTE (T1, later): the real rules (caller authorized on this request + within
      // 24h) are enforced server-side in Supabase (RLS), not here. The UI already
      // hides the undo button past 24h, so the mock just performs the revert.
      const prev = find(id);
      if (!prev) return null;
      ctx.undoDecision(id);
      return { ...prev, status: 'pending', decidedBy: null, decidedAt: null, denialReason: null };
    },

    markNotificationRead: async (id) => {
      const prev = ctx.notifications.find((n) => n.id === id) ?? null;
      ctx.markNotificationRead(id);
      return prev ? { ...prev, read: true } : null;
    },

    markAllRead: async () => {
      ctx.markAllRead();
    },
  };
}