
// The data-service contract for Chartwells PTO.
//
// Every screen talks to THIS, never to DemoContext directly. It is one named set of
// operations with fixed input/output shapes. Two implementations live behind it:
//   - MockDataSource      today: backed by the demo's mock data + localStorage
//   - SupabaseDataSource  later: the real database
// Swapping one for the other is zero screen change. That is the whole point of the seam.
//
// Conventions that hold for EVERY method:
//   * ASYNC. Every method returns a Promise (you `await` it). The mock could answer
//     instantly, but Supabase answers over the network, so the contract is async now
//     to keep the swap a no-op for the screens.
//   * ACTOR FROM SESSION. No method takes "who am I". The current user comes from the
//     session (the mock fills it from the demo's active user; Supabase from auth).
//   * CLIENT CHECKS ARE COSMETIC. Any permission rule enforced in an implementation is
//     for UX only. The real enforcement is server-side (Supabase RLS). Never trust the
//     client.

import { useMockDataSource } from './mockDataSource';

/* ------------------------------- data shapes ------------------------------- */

/**
 * @typedef {'employee'|'admin'|'god_admin'} Role
 * @typedef {'pending'|'approved'|'denied'|'cancelled'} RequestStatus
 */

/**
 * One line item inside a stored PTO request.
 * @typedef {Object} RequestLine
 * @property {string} type             PTO type id
 * @property {string} start            ISO date (inclusive)
 * @property {string} end              ISO date (inclusive)
 */

/**
 * A PTO request. Mirrors the shape DemoContext produces today.
 * @typedef {Object} Request
 * @property {string} id
 * @property {string} userId           the employee the request belongs to
 * @property {RequestLine[]} lines     requested PTO line items
 * @property {RequestStatus} status
 * @property {string} note
 * @property {string|null} decidedBy   approver user id; null until decided
 * @property {string|null} decidedAt   ISO datetime; null until decided
 * @property {string|null} denialReason
 * @property {string} submittedAt      ISO datetime
 */

/**
 * One line item inside a request draft submitted by a screen.
 * @typedef {Object} RequestDraftLine
 * @property {string} type             PTO type id
 * @property {string} start            ISO date (inclusive)
 * @property {string} end              ISO date (inclusive)
 */

/**
 * What a screen passes to submitRequest. The actor (who is submitting) is NOT here;
 * it comes from the session.
 * @typedef {Object} RequestDraft
 * @property {RequestDraftLine[]} lines
 * @property {string} [note]
 */

/**
 * Result of a best-effort bulk approve. Lets the screen show a warning listing what
 * was skipped, without the contract knowing anything about the UI.
 * @typedef {Object} BulkApproveResult
 * @property {Request[]} approved                          the ones that went through
 * @property {{ id: string, reason: string }[]} failed     the ones skipped, with why
 */

/**
 * Reference shapes (User, Team, PtoType, Holiday, Blackout, Notification) mirror the
 * objects exported from src/utils/constants.js. Read-only config from a screen's view.
 * @typedef {Object} User
 * @typedef {Object} Team
 * @typedef {Object} PtoType
 * @typedef {Object} Holiday
 * @typedef {Object} Blackout
 * @typedef {Object} Notification
 */

/* ------------------------------- the contract ------------------------------ */

/**
 * The operations every implementation must provide. This is the boundary the screens
 * call and the Supabase backend implements against. Keep it stable.
 *
 * @typedef {Object} DataSource
 *
 * --- reads ---
 * @property {() => Promise<Request[]>} getRequests
 *           Requests the current user is allowed to see.
 * @property {(userId: string) => Promise<Request[]>} requestsForUser
 *           That user's requests, newest first.
 * @property {(teamId?: string) => Promise<Request[]>} pendingForApprover
 *           Pending requests the current approver may act on. Optional teamId lets a
 *           god_admin narrow to one team.
 * @property {(days?: number) => Promise<Request[]>} recentDecisionsBy
 *           The current approver's recent decisions, newest first (default 30 days).
 * @property {(isoDate: string, teamId?: string) => Promise<Array<Request & { user: User }>>} outOnDay
 *           Who is off (approved leave) on a given day. The coverage read.
 * @property {(userId: string, typeId: string) => Promise<number>} balanceFor
 *           Days left for that person and type (allotment minus used).
 * @property {(userId: string, typeId: string) => Promise<number>} usedFor
 *           Approved days of that type already used.
 * @property {(userId: string, typeId: string) => Promise<number>} grantFor
 *           Raw per-person yearly grant for that PTO type.
 * @property {(userId: string) => Promise<number[]>} normalDaysOffFor
 *           Weekday indices (0-6) that do not count as charged PTO for that person.
 * @property {() => Promise<User[]>} getUsers
 * @property {() => Promise<Team[]>} getTeams
 * @property {() => Promise<PtoType[]>} getPtoTypes
 * @property {() => Promise<Holiday[]>} getHolidays
 * @property {() => Promise<Blackout[]>} getBlackouts
 * @property {(teamId: string) => Promise<User[]>} teamMembers
 *           People on a team.
 * @property {() => Promise<Notification[]>} getNotifications
 *           The current user's notifications, each flagged read/unread.
 * @property {() => Promise<number>} unreadCount
 *
 * --- writes (actor comes from the session, never passed in) ---
 * @property {(draft: RequestDraft) => Promise<Request>} submitRequest
 *           Creates a pending request; returns it.
 * @property {(id: string) => Promise<Request>} cancelRequest
 *           Owner only, and only while still pending. Returns the cancelled request.
 * @property {(id: string) => Promise<Request>} approveRequest
 *           Returns the approved request.
 * @property {(id: string, reason: string) => Promise<Request>} denyRequest
 *           Reason required. Returns the denied request.
 * @property {(ids: string[]) => Promise<BulkApproveResult>} approveMany
 *           Best-effort: approves what the caller may, reports the rest in `failed`.
 * @property {(userId: string, typeId: string, amount: number) => Promise<number>} setGrant
 *           Updates an existing per-person grant row and returns the saved amount.
 * @property {(userId: string, days: number[]) => Promise<number[]>} setNormalDaysOff
 *           Updates a person's normal days off and returns the saved set.
 * @property {(id: string) => Promise<Request>} undoDecision
 *           Returns the request, back to pending. Refuses unless the caller is
 *           authorized on it and it is within 24h. Records the reversal in the audit
 *           trail.
 * @property {(id: string) => Promise<Notification>} markNotificationRead
 * @property {() => Promise<void>} markAllRead
 */

/**
 * Hook that hands a screen the active data source. Today it is always the mock.
 * When SupabaseDataSource exists, choose here behind an env flag, for example:
 *
 *   return import.meta.env.VITE_DEMO_MODE
 *     ? useMockDataSource()
 *     : useSupabaseDataSource();
 *
 * so production uses real auth + DB and the demo keeps the mock. Screens never change.
 *
 * @returns {DataSource}
 */
export function useDataSource() {
  return useMockDataSource();
}
