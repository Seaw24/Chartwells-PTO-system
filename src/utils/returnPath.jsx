// Where to go after signing in. Only paths inside this app are allowed, so a crafted sign-in link
// can't send someone to another site.
export function safeReturnPath(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.startsWith("/login") || raw.startsWith("/welcome")) return "/";
  return raw;
}
