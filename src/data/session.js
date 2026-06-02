// src/data/session.js
//
// The identity half of the seam: "who am I". Kept separate from the data source on
// purpose, because identity is an auth concern, not a data concern.
//
// Today it reads the demo's active user from DemoContext. When Supabase auth lands,
// this is the one place that changes: it reads the signed-in user from the auth
// session instead, behind the same env flag the data source uses. Screens call
// useCurrentUser() and never touch DemoContext.
//
// Note the asymmetry with the data source: identity is SYNCHRONOUS (you are either
// signed in or you are not; once you are, the user is simply available), while data
// is ASYNCHRONOUS (you ask and wait). So this returns the user directly, no await.

import { useDemoContext } from '../hooks/useDemoContext';

/**
 * The currently signed-in user.
 * @returns {{ id: string, name: string, role: 'employee'|'admin'|'god_admin', team: string }}
 */
export function useCurrentUser() {
  const { activeUser } = useDemoContext();
  return activeUser;
}