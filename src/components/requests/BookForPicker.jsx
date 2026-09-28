import React from "react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import { usePresence } from "../../hooks/motion.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { ChevronDown as Vendor_ChevronDown } from "lucide-react";
import { Search as Vendor_Search } from "lucide-react";
import { Check as Vendor_Check } from "lucide-react";

// HR's "Who is this for?" control on the request form. It defaults to the viewer; picking anyone
// else turns the form into an HR booking. People HR booked for recently are listed first, kept per
// viewer in this browser only.
const RECENT_MAX = 4;
const recentKey = (viewerId) => `pto.bookFor.recent.${viewerId}`;
function readRecent(viewerId) {
  try {
    const ids = JSON.parse(localStorage.getItem(recentKey(viewerId)) || "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}
export function rememberBookedFor(viewerId, personId) {
  try {
    const ids = [personId, ...readRecent(viewerId).filter((id) => id !== personId)];
    localStorage.setItem(
      recentKey(viewerId),
      JSON.stringify(ids.slice(0, RECENT_MAX)),
    );
  } catch {
    // Storage can be blocked; the list is only a convenience.
  }
}
const byName = (a, b) => a.name.localeCompare(b.name);

export function BookForPicker({ viewer, value, onChange }) {
  const { users, teams, teamById } = useCatalog(),
    [open, setOpen] = React.useState(false),
    [query, setQuery] = React.useState(""),
    [active, setActive] = React.useState(0),
    rootRef = React.useRef(null),
    listRef = React.useRef(null),
    { mounted, closing } = usePresence(open, 120),
    listId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const people = React.useMemo(
      () => users.filter((u) => u.isActive !== false && u.id !== viewer.id),
      [users, viewer.id],
    ),
    teamName = (u) => teamById(u.team)?.name ?? null,
    selected =
      value === viewer.id ? viewer : users.find((u) => u.id === value) ?? viewer,
    q = query.trim().toLowerCase();

  // The flat option list drives keyboard navigation; groups only add headings in between.
  const groups = React.useMemo(() => {
    if (q) {
      const hits = people
        .filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (teamName(u) || "").toLowerCase().includes(q),
        )
        .sort(byName);
      return [{ key: "results", label: null, people: hits }];
    }
    const out = [{ key: "you", label: null, people: [viewer] }];
    const recent = open
      ? readRecent(viewer.id)
          .map((id) => people.find((u) => u.id === id))
          .filter(Boolean)
      : [];
    recent.length && out.push({ key: "recent", label: "Recent", people: recent });
    const teamed = new Map(teams.map((t) => [t.id, []])),
      noTeam = [];
    for (const u of people)
      teamed.has(u.team) ? teamed.get(u.team).push(u) : noTeam.push(u);
    for (const t of [...teams].sort(byName)) {
      const members = teamed.get(t.id);
      members.length &&
        out.push({ key: t.id, label: t.name, people: members.sort(byName) });
    }
    noTeam.length &&
      out.push({ key: "none", label: "No team", people: noTeam.sort(byName) });
    return out;
  }, [q, people, teams, teamById, viewer, open]);
  const options = groups.flatMap((g) =>
    g.people.map((u) => ({ key: `${g.key}:${u.id}`, person: u })),
  );

  React.useEffect(() => setActive(0), [q, open]);
  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (id) => {
      setOpen(false);
      setQuery("");
      id !== value && onChange(id);
    },
    onKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        options[active] && pick(options[active].person.id);
      } else if (e.key === "Escape") {
        // Close the picker, not the whole request modal.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    },
    isSelf = selected.id === viewer.id;

  let index = -1;
  return (
    <section ref={rootRef} className="relative">
      <h3 className="eyebrow mb-2.5">{"Who is this for?"}</h3>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`press flex w-full items-center gap-3 rounded-card border bg-card px-3.5 py-2.5 text-left shadow-card transition-colors hover:bg-panel ${isSelf ? "border-line" : "border-accent"}`}
      >
        <Avatar name={selected.name} id={selected.id} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {isSelf ? "You" : selected.name}
          </span>
          <span className="block truncate text-[11px] text-ink-mute">
            {isSelf
              ? "Or book time off for someone else"
              : teamName(selected) || "No team"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-ink">
          {"Change"}
          <Vendor_ChevronDown size={14} />
        </span>
      </button>
      {mounted && (
        <div
          className={`absolute left-0 right-0 z-40 mt-2 origin-top rounded-card border border-line bg-card p-2 shadow-pop ${closing ? "pointer-events-none animate-scale-out" : "animate-scale-in"}`}
        >
          <div className="relative mb-1.5">
            <Vendor_Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute"
            />
            <input
              autoFocus={true}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={true}
              aria-controls={listId}
              aria-activedescendant={
                options[active] ? `${listId}-${active}` : undefined
              }
              aria-label="Search people by name or team"
              placeholder="Search by name or team…"
              className="w-full rounded-btn border border-line bg-surface py-2 pl-8 pr-2 text-sm text-ink placeholder:text-ink-mute focus:border-accent focus:outline-none"
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="People"
            className="max-h-64 overflow-y-auto scrollbar-slim"
          >
            {groups.map((g) => (
              <React.Fragment key={g.key}>
                {g.label && g.people.length > 0 && (
                  <li
                    role="presentation"
                    className="px-2 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute"
                  >
                    {g.label}
                  </li>
                )}
                {g.people.map((u) => {
                  index += 1;
                  const i = index,
                    me = u.id === viewer.id;
                  return (
                    <li
                      key={`${g.key}:${u.id}`}
                      id={`${listId}-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={u.id === value}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(u.id)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-btn px-2 py-1.5 ${i === active ? "bg-panel" : ""}`}
                    >
                      <Avatar name={u.name} id={u.id} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {me ? `You (${u.name})` : u.name}
                        </span>
                        {!me && (
                          <span className="block truncate text-[11px] text-ink-mute">
                            {teamName(u) || "No team"}
                          </span>
                        )}
                      </span>
                      {u.id === value && (
                        <Vendor_Check
                          size={14}
                          className="shrink-0 text-accent-ink"
                        />
                      )}
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
            {options.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-ink-mute">
                {`No one matches “${query}”.`}
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
