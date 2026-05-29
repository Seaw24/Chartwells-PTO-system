// Single source of truth for whether a PTO request is valid. Pure functions, no React.
import {
  VACATION_WINDOWS,
  BLACKOUT_DATES,
  ptoTypeById,
} from './constants';
import { toDate, rangesOverlap, businessDays, fmtShort, toISO } from './dateHelpers';

// Restricted-date windows by PTO type. Only vacation is restricted in the seed config.
const WINDOWS_BY_TYPE = { vacation: VACATION_WINDOWS };

export function windowsForType(typeId) {
  return WINDOWS_BY_TYPE[typeId] || null;
}

export function describeWindows(typeId) {
  const windows = windowsForType(typeId);
  if (!windows) return null;
  return windows.map((w) => `${fmtShort(w.start)} – ${fmtShort(w.end)}`).join(', ');
}

export function isDayInAnyWindow(iso, typeId) {
  const windows = windowsForType(typeId);
  if (!windows) return true;
  return windows.some((w) => rangesOverlap(iso, iso, w.start, w.end));
}

export function blackoutForRange(startIso, endIso, typeId) {
  return BLACKOUT_DATES.find(
    (b) =>
      (b.types === 'all' || (Array.isArray(b.types) && b.types.includes(typeId))) &&
      rangesOverlap(startIso, endIso, b.start, b.end)
  );
}

export function isBlackoutDay(iso, typeId = null) {
  return BLACKOUT_DATES.some(
    (b) =>
      (b.types === 'all' || typeId == null || (Array.isArray(b.types) && b.types.includes(typeId))) &&
      rangesOverlap(iso, iso, b.start, b.end)
  );
}

/**
 * Validate a draft request against every policy.
 * @returns { ok, errors[], warnings[], days, remainingAfter }
 */
export function validateRequest({ draft, todayIso, balance, existingRequests = [] }) {
  const errors = [];
  const warnings = [];
  const { type, start, end } = draft;
  const ptoType = ptoTypeById(type);

  if (!type) errors.push('Pick a PTO type.');
  if (!start || !end) errors.push('Choose a start and end date.');

  const days = start && end ? businessDays(start, end) : 0;

  if (start && end) {
    if (toDate(end) < toDate(start)) errors.push('End date is before the start date.');

    // Past-date rule. Sick may be filed for today or yesterday; everything else is future-only.
    if (type !== 'sick' && toDate(start) < toDate(todayIso)) {
      errors.push('Start date is in the past.');
    }
    if (type === 'sick') {
      const yesterday = toISO(new Date(toDate(todayIso).getTime() - 864e5));
      if (toDate(start) < toDate(yesterday)) {
        errors.push('Sick leave can be filed for today or yesterday at the earliest.');
      }
    }

    // Restricted window (vacation).
    if (ptoType?.restrictedDates) {
      const windows = windowsForType(type) || [];
      const everyDayAllowed = eachIso(start, end).every((iso) => isDayInAnyWindow(iso, type));
      if (!everyDayAllowed) {
        errors.push(`${ptoType.name} is only available during: ${describeWindows(type)}.`);
      }
    }

    // Blackout overlap.
    const blackout = blackoutForRange(start, end, type);
    if (blackout) {
      errors.push(`Overlaps a blackout period (${blackout.reason}).`);
    }

    // Self-overlap with own active requests.
    const selfClash = existingRequests.find(
      (r) =>
        ['approved', 'pending'].includes(r.status) &&
        rangesOverlap(start, end, r.start, r.end)
    );
    if (selfClash) {
      errors.push('You already have a request that overlaps these dates.');
    }
  }

  // Balance.
  const remainingAfter = balance != null ? balance - days : null;
  if (balance != null && days > balance) {
    errors.push(
      `Not enough balance. This needs ${days} day${days === 1 ? '' : 's'} but you have ${balance} left.`
    );
  }

  return { ok: errors.length === 0, errors, warnings, days, remainingAfter };
}

// Team members (excluding self) who are off during the draft range.
export function conflictsFor({ draft, requests, users, selfId, teamId }) {
  if (!draft.start || !draft.end) return [];
  return requests
    .filter(
      (r) =>
        r.userId !== selfId &&
        ['approved', 'pending'].includes(r.status) &&
        rangesOverlap(draft.start, draft.end, r.start, r.end)
    )
    .map((r) => ({ ...r, user: users.find((u) => u.id === r.userId) }))
    .filter((r) => r.user && (!teamId || r.user.team === teamId));
}

function eachIso(startIso, endIso) {
  const out = [];
  let cur = toDate(startIso);
  const end = toDate(endIso);
  while (cur <= end) {
    out.push(toISO(cur));
    cur = new Date(cur.getTime() + 864e5);
  }
  return out;
}
