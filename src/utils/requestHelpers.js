import { businessDays, fmtRange, rangesOverlap } from './dateHelpers';
import { DEFAULT_NORMAL_DAYS_OFF, PTO_TYPES, USERS } from './constants';

export { DEFAULT_NORMAL_DAYS_OFF } from './constants';

export function requestLines(request = {}) {
  if (Array.isArray(request.lines) && request.lines.length > 0) return request.lines;
  if (request.type || request.start || request.end) {
    return [{ type: request.type || '', start: request.start || '', end: request.end || '' }];
  }
  return [];
}

export function requestStart(request) {
  const starts = requestLines(request).map((line) => line.start).filter(Boolean);
  if (!starts.length) return '';
  return starts.sort()[0];
}

export function requestEnd(request) {
  const ends = requestLines(request).map((line) => line.end).filter(Boolean);
  if (!ends.length) return '';
  return ends.sort().at(-1);
}

export function requestOverlapsRange(request, startIso, endIso) {
  return requestLines(request).some((line) => line.start && line.end && rangesOverlap(startIso, endIso, line.start, line.end));
}

export function requestOverlapsDay(request, iso) {
  return requestOverlapsRange(request, iso, iso);
}

export function lineDays(line, normalDaysOff = DEFAULT_NORMAL_DAYS_OFF) {
  return businessDays(line.start, line.end, normalDaysOff);
}

export function requestDays(request, normalDaysOff = DEFAULT_NORMAL_DAYS_OFF) {
  return requestLines(request).reduce((sum, line) => sum + lineDays(line, normalDaysOff), 0);
}

export function requestDaysByType(request, normalDaysOff = DEFAULT_NORMAL_DAYS_OFF) {
  return requestLines(request).reduce((acc, line) => {
    if (!line.type) return acc;
    acc[line.type] = (acc[line.type] || 0) + lineDays(line, normalDaysOff);
    return acc;
  }, {});
}

export function requestTypeIds(request) {
  return Array.from(new Set(requestLines(request).map((line) => line.type).filter(Boolean)));
}

export function lineEntriesForRequest(request) {
  return requestLines(request).map((line, index) => ({
    ...request,
    requestId: request.id,
    lineIndex: index,
    line,
    lineKey: `${request.id}:${index}`,
    type: line.type,
    start: line.start,
    end: line.end,
  }));
}

export function requestRangeLabel(request) {
  const lines = requestLines(request);
  if (lines.length === 0) return '';
  if (lines.length === 1) return fmtRange(lines[0].start, lines[0].end);
  return `${fmtRange(requestStart(request), requestEnd(request))} (${lines.length} lines)`;
}

export function requestTypeLabel(request) {
  const ids = requestTypeIds(request);
  if (ids.length === 0) return 'PTO';
  if (ids.length === 1) return PTO_TYPES.find((t) => t.id === ids[0])?.name || 'PTO';
  return `${ids.length} PTO types`;
}

export function normalDaysOffForUser(user, fallback = DEFAULT_NORMAL_DAYS_OFF) {
  return Array.isArray(user?.normalDaysOff) ? user.normalDaysOff : fallback;
}

export function canDecideRequest(actor, request, users = USERS) {
  if (!actor || !request || request.status !== 'pending') return false;
  if (actor.id === request.userId) return false;

  const author = users.find((u) => u.id === request.userId);
  if (!author) return false;

  if (author.role === 'god_admin') {
    return actor.role === 'god_admin';
  }

  if (actor.role === 'god_admin') return true;

  if (actor.role === 'admin') {
    return actor.team && author.team === actor.team;
  }

  return false;
}
