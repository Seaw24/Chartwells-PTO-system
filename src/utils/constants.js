// Static configuration + seed data for the demo. In production this comes from Supabase.

export const TEAMS = [
  { id: 'foh', name: 'Front of House' },
  { id: 'boh', name: 'Back of House' },
];

export const ROLES = {
  god_admin: { label: 'God Admin', tone: 'navy' },
  admin: { label: 'Admin', tone: 'accent' },
  employee: { label: 'Employee', tone: 'neutral' },
};

export const USERS = [
  { id: 'rich', name: 'Rich Martinez', email: 'rich@chartwells.com', role: 'god_admin', team: null },
  { id: 'kyle', name: 'Kyle Chen', email: 'kyle@chartwells.com', role: 'admin', team: 'foh' },
  { id: 'sarah', name: 'Sarah Kim', email: 'sarah@chartwells.com', role: 'admin', team: 'boh' },
  { id: 'alex', name: 'Alex Rivera', email: 'alex@chartwells.com', role: 'employee', team: 'foh' },
  { id: 'jordan', name: 'Jordan Lee', email: 'jordan@chartwells.com', role: 'employee', team: 'boh' },
  { id: 'casey', name: 'Casey Brooks', email: 'casey@chartwells.com', role: 'employee', team: 'foh' },
];

// PTO type colors: muted, sophisticated hex (data, not chrome). Tuned to stay distinct
// from each other AND from the indigo accent (vacation leans azure, floating leans violet)
// so chips read calm at tint level. The `icon` emoji field is legacy/unused — the UI now
// renders monochrome line icons via <PtoTypeIcon> keyed on id.
export const PTO_TYPES = [
  { id: 'vacation', name: 'Vacation', icon: '🌴', color: '#4071B6', defaultDays: 10, restrictedDates: true, advanceNotice: 14 },
  { id: 'sick', name: 'Sick', icon: '🤒', color: '#C46A2B', defaultDays: 5, restrictedDates: false, advanceNotice: 0 },
  { id: 'bereavement', name: 'Bereavement', icon: '💐', color: '#6B7280', defaultDays: 5, restrictedDates: false, advanceNotice: 0 },
  { id: 'wellness', name: 'Wellness Day', icon: '🧘', color: '#2E8B73', defaultDays: 2, restrictedDates: false, advanceNotice: 2 },
  { id: 'floating', name: 'Floating Holiday', icon: '🎈', color: '#8A5DB5', defaultDays: 1, restrictedDates: false, advanceNotice: 7 },
];

export const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day' },
  { date: '2026-02-16', name: "Presidents' Day" },
  { date: '2026-05-25', name: 'Memorial Day' },
  { date: '2026-06-19', name: 'Juneteenth' },
  { date: '2026-07-03', name: 'Independence Day (Observed)' },
  { date: '2026-09-07', name: 'Labor Day' },
  { date: '2026-10-12', name: "Indigenous Peoples' Day" },
  { date: '2026-11-11', name: 'Veterans Day' },
  { date: '2026-11-26', name: 'Thanksgiving Day' },
  { date: '2026-11-27', name: 'Day After Thanksgiving' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

export const VACATION_WINDOWS = [
  { start: '2026-06-15', end: '2026-06-30' },
  { start: '2026-10-13', end: '2026-10-15' },
  { start: '2026-12-20', end: '2026-12-31' },
];

export const BLACKOUT_DATES = [
  { start: '2026-01-12', end: '2026-01-16', reason: 'Spring semester opening week', types: 'all' },
  { start: '2026-08-24', end: '2026-08-28', reason: 'Fall semester opening week', types: 'all' },
];

// Seed requests. ids/submittedAt assigned in DemoContext so timestamps are relative to demo "today".
export const MOCK_REQUESTS = [
  // The signed-in demo user (Rich) carries some history so balances, upcoming time off, and
  // activity all render with real data instead of empty rings on first load.
  { userId: 'rich', type: 'vacation', start: '2026-04-06', end: '2026-04-08', status: 'approved', decidedBy: 'rich', note: 'Spring trip with family', daysAgo: 52 },
  { userId: 'rich', type: 'vacation', start: '2026-06-08', end: '2026-06-09', status: 'approved', decidedBy: 'rich', note: 'Long weekend', daysAgo: 8 },
  { userId: 'rich', type: 'sick', start: '2026-03-03', end: '2026-03-03', status: 'approved', decidedBy: 'rich', note: '', daysAgo: 84 },
  { userId: 'rich', type: 'wellness', start: '2026-05-01', end: '2026-05-01', status: 'approved', decidedBy: 'rich', note: 'Recharge day', daysAgo: 26 },
  { userId: 'alex', type: 'vacation', start: '2026-10-13', end: '2026-10-15', status: 'approved', decidedBy: 'kyle', note: 'Family trip', daysAgo: 21 },
  { userId: 'casey', type: 'sick', start: '2026-06-02', end: '2026-06-02', status: 'approved', decidedBy: 'kyle', note: '', daysAgo: 9 },
  { userId: 'jordan', type: 'wellness', start: '2026-07-10', end: '2026-07-10', status: 'pending', note: 'Mental health day', daysAgo: 3 },
  { userId: 'alex', type: 'floating', start: '2026-03-17', end: '2026-03-17', status: 'approved', decidedBy: 'kyle', note: "St. Patrick's Day", daysAgo: 70 },
  { userId: 'casey', type: 'vacation', start: '2026-10-13', end: '2026-10-14', status: 'pending', note: 'Short getaway', daysAgo: 6 },
  { userId: 'jordan', type: 'sick', start: '2026-05-20', end: '2026-05-21', status: 'approved', decidedBy: 'sarah', note: 'Flu', daysAgo: 5 },
  { userId: 'kyle', type: 'vacation', start: '2026-12-22', end: '2026-12-26', status: 'pending', note: 'Holiday break', daysAgo: 2 },
  { userId: 'sarah', type: 'bereavement', start: '2026-04-14', end: '2026-04-16', status: 'approved', decidedBy: 'rich', note: '', daysAgo: 42 },
  { userId: 'alex', type: 'sick', start: '2026-02-10', end: '2026-02-10', status: 'denied', decidedBy: 'kyle', note: '', denialReason: 'No coverage available; please reschedule.', daysAgo: 60 },
];

// Default per-user yearly grant for each PTO type.
export const DEFAULT_BALANCES = PTO_TYPES.reduce((acc, t) => {
  acc[t.id] = t.defaultDays;
  return acc;
}, {});

// Mock "today" used across the demo so seeded data lands in a believable window.
export const DEMO_TODAY = '2026-05-26';

export const STORAGE_KEY = 'chartwells-pto-demo-v2';

// ---- lookup helpers ----
export const userById = (id) => USERS.find((u) => u.id === id);
export const teamById = (id) => TEAMS.find((t) => t.id === id);
export const ptoTypeById = (id) => PTO_TYPES.find((t) => t.id === id);
export const firstName = (name = '') => name.split(' ')[0];
export const initials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Deterministic avatar tint per user (derived from id). Low-chroma, sophisticated tints so
// initials read calm next to the muted UI — distinguishable, never candy-colored.
const AVATAR_HUES = [231, 259, 199, 159, 28, 300];
export const avatarColor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  const hue = AVATAR_HUES[Math.abs(h) % AVATAR_HUES.length];
  return { bg: `oklch(0.94 0.026 ${hue})`, fg: `oklch(0.45 0.085 ${hue})` };
};

export const roleRank = { employee: 0, admin: 1, god_admin: 2 };
export const canApprove = (role) => role === 'admin' || role === 'god_admin';
export const isGodAdmin = (role) => role === 'god_admin';
