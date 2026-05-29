# DESIGN.md — Chartwells PTO

## Theme

A deep **navy chrome** (sidebar, top bar, mobile tab bar, login) wraps a bright, layered **light
workspace**. Scene: a dining-services manager glancing at coverage on a bright back-office screen,
or a phone mid-shift. The navy spine makes the product feel branded and intentional; the light
content stays calm and scannable. Dark mode is deferred but prepared as a one-block flip
(`[data-theme="dark"]` in `src/index.css`).

The organizing idea is **warm-on-cool**: cool navy chrome + cool tinted neutrals make the single
warm accent feel deliberate and expensive. Premium by depth, type, and restraint, not effects.

## Color

Authored in **OKLCH** (`src/index.css`), exposed through Tailwind in `tailwind.config.js`. Neutrals
are tinted toward the navy hue (256) so nothing is a dead gray; no pure `#000`/`#fff` anywhere.
Every pairing that carries text is WCAG-AA verified.

- **Navy** `--c-navy` (+ `-700` lifted, `-600` dividers, `-fg`, `-fg-mute`) — the chrome.
- **Accent** — a warm **ember / persimmon**. `--c-accent` (bright: indicators, rails, focus, dots),
  `--c-accent-strong` (solid fills under white text), `-hover`, `-ink` (accent text on light),
  `-soft` (tint), `-line`. Used confidently but only where it means action or selection.
- **Success / Warning / Danger** — semantic status, each with `-soft` / `-ink` / `-strong`. Danger
  sits in **rose-red (hue 14)** so it never reads as the same colour as the warm accent (hue 40).
- **Surface / Card / Panel** — three neutral layers with real separation (field → raised card → inset).
- **Ink / Ink-soft / Ink-mute** — near-navy text hierarchy.
- PTO type colours stay explicit hex (they're data): vacation azure, sick rust, bereavement slate,
  wellness green, floating violet. Each tuned to stay distinct from the accent and from each other.

## Typography

- **Inter** for everything (variable, loaded in `index.html`).
- Tabular figures (`.tabular`) for every number that lines up or ticks (balances, counts, dates).
- One small-caps label voice: `.eyebrow` (uppercase, tracked, mute) for section labels and table heads.
- Hierarchy through scale + weight contrast; tight tracking on headings (`-0.018em`).

## Elevation & shape

- Radius: `chip 7px`, `btn 9px`, `card 13px`, `modal 18px`.
- Shadows are navy-tinted (warm-cool, not gray) and signal a real z-axis:
  `shadow-card` (rest) → `shadow-raised` (signature cards) → `shadow-lift` (hover) → `shadow-pop` (overlays).
- Solid buttons add `shadow-btn`: a soft drop + a hairline top gloss so they read as a physical surface.

## Components

- One button vocabulary (`ui/Button.jsx`): primary / navy / success / outline / danger / ghost.
- Chrome components take an `onDark` prop (Avatar, RolePill, NotificationBell) for use on the navy rail/top bar.
- Status always pairs an icon with colour (`ui/StatusChip.jsx`) — never colour alone.
- PTO type identity = leading colored dot/icon + tinted fill + full hairline border.
  **Never a side-stripe `border-left`** (banned: it's an AI-slop tell).
- Dashboard balance cards are the signature element: type-colored icon chip + big tabular
  "days remaining" + a slim usage bar. Varying fills/hues keep the row from reading as an identical grid.
- Calendar chips: solid tinted fill = approved, dashed outline = pending; blackout = hatch.
- Skeletons for loading, designed empty states (`ui/EmptyState.jsx`, framed in a card on list pages).

## Motion

150–250ms, ease-out (`cubic-bezier(0.22,1,0.36,1)`, exposed as `--ease`). State and feedback only:
page fade, modal scale-in, toast slide-in, usage bars/rings settling. Respects `prefers-reduced-motion`.
