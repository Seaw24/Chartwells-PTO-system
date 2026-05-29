---
name: design-refinement-decisions
description: Chartwells PTO design/UX refinement pass — locked design-system decisions
metadata:
  type: project
---

Design+UX refinement pass on Chartwells PTO (frontend/demo phase, May 2026). v1 structure, DemoContext, prop interfaces, and file layout must stay stable (user wires Supabase backend next). Visual/UX only.

Locked decisions for the refined design system:
- **Coral/AA:** keep `--c-coral` (oklch 0.69 0.146 33) as the identity color for selection/dots/links; add `--c-coral-strong` (0.62 0.17 33) for button fills under white text and `--c-coral-ink` (0.50 0.16 33) for coral text on tinted/light backgrounds. Both pass AA. Same `-ink`/`-strong` pattern added to success/warning/danger (fixes StatusChip "Pending" warning-on-soft contrast).
- **Dark mode:** scaffold the `[data-theme="dark"]` token block (one-file flip per DESIGN.md) but ship light-only, no toggle yet.
- **Date picker:** harden the existing hand-rolled `ui/DateRangePicker.jsx` with arrow-key grid nav + roving tabindex + ARIA. Do NOT add react-day-picker / shadcn dependency.

Other refinement choices: formal type ramp (11px UI floor), 8px spacing grid, add 6px `chip` radius token, modal radius 16, navy-tinted lighter shadows, motion capped 240ms on repeat paths (ProgressRing 500→260). Build order: Calendar first (coverage-at-a-glance is the #1 leverage), then request flow, approvals, dashboard, team, settings, shell. Each refined file gets a `// Design notes / References` header block.
