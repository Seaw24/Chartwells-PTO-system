# Chartwells PTO

A paid-time-off management app for a ~30-person university dining-services department.
This is the **frontend + demo** phase: the full UI with mock data and a role-switchable
demo mode. No backend yet (state lives in React context + localStorage); Supabase is the
next phase.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the build
```

Any email/password signs you in. Use the **demo toolbar** (bottom-right) to switch between
the six mock users/roles and to time-travel "today".

## Stack

React 18 · Vite · Tailwind CSS · React Router v6 · Lucide · date-fns · Recharts.

## Where things live

- `src/utils/constants.js` — teams, users, PTO types, holidays, windows, blackouts, seed requests
- `src/utils/policyEngine.js` — request validation (windows, blackout, balance, overlap)
- `src/context/DemoContext.jsx` — all state + CRUD (submit/approve/deny/cancel), notifications
- `src/components/` — `ui/` primitives, plus `layout/ calendar/ requests/ team/ settings/ reports/ demo/`
- `src/pages/` — one file per route
- `PRODUCT.md` / `DESIGN.md` — product and design context

## Roles

- **Employee** — calendar, own requests, profile
- **Admin** (one team) — adds approvals + team
- **God Admin** — adds reports + settings, sees all teams

## Not in this phase (next: T1)

Supabase auth/DB/RLS, real email, API integration, deployment, CSV import logic.
# Chartwells-PTO-system
