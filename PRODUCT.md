# PRODUCT.md — Chartwells PTO

register: product

## Product purpose

A paid-time-off management app for a ~30-person university dining-services department.
Staff request time off, managers approve it, and everyone sees who is covered. It replaces
spreadsheets and group texts. This repo is the frontend + demo phase: full UI with mock data
and a role-switchable demo mode. Supabase (auth, DB, RLS) is the next phase.

## Users

- **Employees** (dining/kitchen staff): request time off, track balances, see the team calendar.
  Not desk workers; many check on a phone mid-shift. Effortless beats powerful.
- **Managers** (kitchen/FOH managers; stored as team membership role `admin`): approve their
  team's requests, watch coverage.
- **HR** (operations lead; stored as org role `god_admin`): everything, plus policy config,
  people, and reports.

Three roles: `employee`, `admin` (scoped to one team), `god_admin` (all teams). The app shows
them as Employee, Manager and HR. Those are display names for the same stored values, not
separate roles; the database, SQL helpers and code keep the stored names.

## Tone

Clean, professional, warm. "Modern hospitality," not sterile corporate. Used daily by
non-engineers, so every interaction should feel obvious and quick.

## Anti-references

- Dense enterprise HRIS tools (Workday): too much chrome, too many fields.
- Generic AI-dashboard look: identical card grids, hero-metric templates, colored
  left-border stripes on everything.

## Strategic principles

1. Coverage is the real question. Surface "who is off" before "what's my balance."
2. Never block with surprise. Validation explains itself; conflicts inform, don't forbid.
3. Status is never color alone (icon + color), for the kitchen-floor glance and for a11y.
4. The tool disappears into the task. Familiar patterns, consistent component vocabulary.
