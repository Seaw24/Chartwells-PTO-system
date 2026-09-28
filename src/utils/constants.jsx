export const ROLE_META = {
  god_admin: {
    label: "God Admin",
    tone: "navy",
  },
  admin: {
    label: "Admin",
    tone: "accent",
  },
  employee: {
    label: "Employee",
    tone: "neutral",
  },
};
export const DEFAULT_NORMAL_DAYS_OFF = [0, 6];
// Matches the database limit in submit_wellness_request.
export const WELLNESS_MAX_DAYS = 10;
// Names come straight off a profile row, where the column can be null, and a `= ""` default only
// fires for undefined. Both of these take whatever they are handed.
export const firstName = (e) => (e == null ? "" : String(e)).split(" ")[0];
export const initials = (e) =>
  (e == null ? "" : String(e))
    .split(" ")
    .filter(Boolean)
    .map((t) => t[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export const AVATAR_HUES = [231, 259, 199, 159, 28, 300];
export const avatarColors = (e = "") => {
  let t = 0;
  for (let r = 0; r < e.length; r += 1) t = (t * 31 + e.charCodeAt(r)) % 360;
  const n = AVATAR_HUES[Math.abs(t) % AVATAR_HUES.length];
  return {
    bg: `oklch(0.94 0.026 ${n})`,
    fg: `oklch(0.45 0.085 ${n})`,
  };
};
export const canApprove = (e) => e === "admin" || e === "god_admin";
export const isGodAdmin = (e) => e === "god_admin";
export const belongsToTeam = (e, t) =>
  !e || !t
    ? !1
    : Array.isArray(e.memberships)
      ? e.memberships.some((n) => n.teamId === t)
      : e.team === t;
