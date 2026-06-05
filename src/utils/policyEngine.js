// Single source of truth for whether a PTO request is valid. Pure functions, no React.
import {
  VACATION_WINDOWS,
  BLACKOUT_DATES,
  ptoTypeById,
} from './constants';
import { toDate, rangesOverlap, fmtShort, toISO } from './dateHelpers';
import { lineDays, lineEntriesForRequest, requestLines } from './requestHelpers';

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
 * @returns { ok, errors[], warnings[], days, daysByType, remainingAfterByType, lineResults[] }
 */
export function validateRequest({ draft, todayIso, balance = null, balances = {}, normalDaysOff = [0, 6], existingRequests = [] }) {
  const errors = [];
  const warnings = [];
  const lines = requestLines(draft);
  const lineResults = lines.length
    ? lines.map((line, index) => ({ index, line, days: 0, errors: [] }))
    : [{ index: 0, line: { type: '', start: '', end: '' }, days: 0, errors: [] }];
  const daysByType = {};

  const addLineError = (index, message) => {
    lineResults[index].errors.push(message);
    errors.push(`Line ${index + 1}: ${message}`);
  };

  if (!lines.length) {
    addLineError(0, 'Add at least one PTO line.');
  }

  lines.forEach((line, index) => {
    const { type, start, end } = line;
    const ptoType = ptoTypeById(type);

    if (!type) addLineError(index, 'Pick a PTO type.');
    if (!start || !end) addLineError(index, 'Choose a start and end date.');
    if (!start || !end) return;

    if (toDate(end) < toDate(start)) {
      addLineError(index, 'End date is before the start date.');
      return;
    }

    const chargedDays = lineDays(line, normalDaysOff);
    lineResults[index].days = chargedDays;
    if (type) daysByType[type] = (daysByType[type] || 0) + chargedDays;

    // Past-date rule. Sick may be filed for today or yesterday; everything else is future-only.
    if (type !== 'sick' && toDate(start) < toDate(todayIso)) {
      addLineError(index, 'Start date is in the past.');
    }
    if (type === 'sick') {
      const yesterday = toISO(new Date(toDate(todayIso).getTime() - 864e5));
      if (toDate(start) < toDate(yesterday)) {
        addLineError(index, 'Sick leave can be filed for today or yesterday at the earliest.');
      }
    }

    // Restricted window (vacation).
    if (ptoType?.restrictedDates) {
      const everyDayAllowed = eachIso(start, end).every((iso) => isDayInAnyWindow(iso, type));
      if (!everyDayAllowed) {
        addLineError(index, `${ptoType.name} is only available during: ${describeWindows(type)}.`);
      }
    }

    // Blackout overlap.
    const blackout = blackoutForRange(start, end, type);
    if (blackout) {
      addLineError(index, `Overlaps a blackout period (${blackout.reason}).`);
    }

    // Self-overlap with own active requests.
    const selfClash = existingRequests.find(
      (r) =>
        ['approved', 'pending'].includes(r.status) &&
        requestLines(r).some((existingLine) => rangesOverlap(start, end, existingLine.start, existingLine.end))
    );
    if (selfClash) {
      addLineError(index, 'You already have a request that overlaps these dates.');
    }
  });

  // No line inside the same draft may overlap another line, regardless of PTO type.
  lines.forEach((left, i) => {
    if (!left.start || !left.end) return;
    lines.slice(i + 1).forEach((right, offset) => {
      const j = i + offset + 1;
      if (!right.start || !right.end) return;
      if (rangesOverlap(left.start, left.end, right.start, right.end)) {
        addLineError(i, `Overlaps line ${j + 1}. Keep each date range separate.`);
        addLineError(j, `Overlaps line ${i + 1}. Keep each date range separate.`);
      }
    });
  });

  const balanceByType = { ...balances };
  if (balance != null && lines.length === 1 && lines[0]?.type) balanceByType[lines[0].type] = balance;
  const remainingAfterByType = {};

  Object.entries(daysByType).forEach(([typeId, requestedDays]) => {
    if (balanceByType[typeId] == null) return;
    remainingAfterByType[typeId] = balanceByType[typeId] - requestedDays;
    if (requestedDays > balanceByType[typeId]) {
      const typeName = ptoTypeById(typeId)?.name || 'PTO';
      const message = `${typeName} balance is short. This needs ${requestedDays} day${requestedDays === 1 ? '' : 's'} but only ${balanceByType[typeId]} remain.`;
      lines.forEach((line, index) => {
        if (line.type === typeId) addLineError(index, message);
      });
    }
  });

  const days = Object.values(daysByType).reduce((sum, value) => sum + value, 0);
  const firstType = lines.find((line) => line.type)?.type;
  const remainingAfter = firstType ? remainingAfterByType[firstType] ?? null : null;

  return { ok: errors.length === 0, errors, warnings, days, daysByType, remainingAfter, remainingAfterByType, lineResults };
}

// Team members (excluding self) who are off during the draft range.
export function conflictsFor({ draft, requests, users, selfId, teamId }) {
  const draftLines = requestLines(draft).filter((line) => line.start && line.end);
  if (!draftLines.length) return [];
  return requests
    .flatMap((r) =>
      lineEntriesForRequest(r).filter(
        (entry) =>
          entry.userId !== selfId &&
          ['approved', 'pending'].includes(entry.status) &&
          draftLines.some((line) => rangesOverlap(line.start, line.end, entry.start, entry.end))
      )
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
