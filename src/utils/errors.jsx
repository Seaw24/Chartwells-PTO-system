export const errorMessage = (e) =>
  typeof e == "string"
    ? e.trim()
    : typeof (e == null ? void 0 : e.message) == "string"
      ? e.message.trim()
      : "";
// The database still words its errors with the stored role names ("Only a god admin ..."). Users
// know those roles as HR and Manager, so any message shown as-is is reworded on the way out.
const withDisplayRoleNames = (e) =>
  e
    .replace(/\b(an?|the) god admins?\b/gi, "HR")
    .replace(/\bgod admins?\b/gi, "HR")
    .replace(/\b(a|an) team admin\b/gi, (m, a) => (a[0] === "A" ? "A manager" : "a manager"))
    .replace(/\bteam admin(s?)\b/gi, (m, s) =>
      (m[0] === "T" ? "Manager" : "manager") + s,
    );
export function friendlyError(e, t = "That did not work. Try again.") {
  return withDisplayRoleNames(friendlyErrorText(e, t));
}
function friendlyErrorText(e, t) {
  const n = errorMessage(e);
  if (!n) return t;
  const r = n.toLowerCase();
  return r.includes("failed to fetch") ||
    r.includes("network request") ||
    r.includes("networkerror") ||
    r.includes("load failed") ||
    r.includes("fetcherror")
    ? "We could not connect. Check your internet connection and try again."
    : r.includes("jwt") ||
        r.includes("session expired") ||
        r.includes("not authenticated")
      ? "Your session expired. Sign in again, then retry the change."
      : r.includes("permission denied") ||
          r.includes("row-level security") ||
          r.includes("not authorized") ||
          r.includes("only a god admin")
        ? "You do not have permission to make that change."
        : r.includes("duplicate key") || r.includes("unique constraint")
          ? "That already exists. Check the name or date and try again."
          : r.includes("schema cache") ||
              r.includes("could not find the function") ||
              r.includes("edge function") ||
              r.includes("supabase") ||
              r.includes("postgrest") ||
              r.includes("pgrst")
            ? "That feature is not available right now. Try again later."
            : r.includes("invalid input syntax") ||
                r.includes("check constraint") ||
                r.includes("not-null constraint") ||
                r.includes("null value in column")
              ? "Some details need attention. Check the form and try again."
              : n;
}
