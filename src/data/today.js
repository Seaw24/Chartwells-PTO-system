// src/data/today.js
//
// The "today" half of the seam, kept out of the data contract on purpose: "now" is an
// environment concern, not data. In the demo it returns the time-traveled date from the
// toolbar; in production it returns the real current date. Screens call useToday() and
// never read todayIso from DemoContext.
//
// Synchronous, like useCurrentUser: "now" is always available, you do not await it.

import { useDemoContext } from '../hooks/useDemoContext';

/**
 * Today's date as an ISO string (YYYY-MM-DD).
 * @returns {string}
 */
export function useToday() {
  const { todayIso } = useDemoContext();
  return todayIso;
}