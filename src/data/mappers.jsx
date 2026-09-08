import { friendlyError } from "../utils/errors.jsx";
export const REQUEST_SELECT = "*, request_lines(*)";
export const PROFILE_SELECT =
  "*, team_memberships:team_memberships!team_memberships_user_id_fkey(*)";
export const mapRequest = (e) => ({
  id: e.id,
  userId: e.requester_id,
  lines: (e.request_lines ?? []).map((t) => ({
    type: t.pto_type_id,
    start: t.start_date,
    end: t.end_date,
  })),
  status: e.status,
  note: e.note ?? "",
  decidedBy: e.decided_by,
  decidedAt: e.decided_at,
  denialReason: e.denial_reason,
  submittedAt: e.submitted_at,
});
export const mapProfile = (e) => {
  var r;
  const t = e.team_memberships ?? [],
    n = t.find((s) => s.role === "admin");
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.org_role === "god_admin" ? "god_admin" : n ? "admin" : "employee",
    team: ((r = n ?? t[0]) == null ? void 0 : r.team_id) ?? null,
    memberships: t.map((s) => ({
      id: s.id,
      teamId: s.team_id,
      role: s.role,
      addedAt: s.added_at,
      addedBy: s.added_by,
      updatedAt: s.updated_at,
      updatedBy: s.updated_by,
    })),
    normalDaysOff: e.normal_days_off ?? [0, 6],
    isActive: e.is_active,
    passwordSetupRequired: !!e.password_setup_required,
    orgRole: e.org_role,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    updatedBy: e.updated_by,
  };
};
export const mapPtoType = (e) => ({
  id: e.id,
  name: e.name,
  color: e.color,
  defaultDays: e.default_days,
  restrictedDates: e.requires_window,
  allowBackdate: e.allow_backdate,
  isActive: e.is_active,
  createdAt: e.created_at,
  createdBy: e.created_by,
  updatedAt: e.updated_at,
  updatedBy: e.updated_by,
});
export const mapBlackout = (e) => ({
  id: e.id,
  start: e.start_date,
  end: e.end_date,
  reason: e.reason,
  types: e.applies_to_all
    ? "all"
    : (e.blackout_types ?? []).map((t) => t.pto_type_id),
  createdAt: e.created_at,
  createdBy: e.created_by,
  updatedAt: e.updated_at,
  updatedBy: e.updated_by,
});
export const mapHoliday = (e) => ({
  id: e.id,
  date: e.date,
  name: e.name,
  createdAt: e.created_at,
  createdBy: e.created_by,
  updatedAt: e.updated_at,
  updatedBy: e.updated_by,
});
export const mapTeam = (e) => ({
  id: e.id,
  name: e.name,
  description: e.description ?? "",
  createdAt: e.created_at,
  createdBy: e.created_by,
  updatedAt: e.updated_at,
  updatedBy: e.updated_by,
});
export const mapDateRule = (e) => ({
  id: e.id,
  typeId: e.pto_type_id,
  start: e.start_date,
  end: e.end_date,
  createdAt: e.created_at,
  createdBy: e.created_by,
  updatedAt: e.updated_at,
  updatedBy: e.updated_by,
});
export const unwrap = (
  { data: data, error: error },
  n = "Something went wrong. Try again.",
) => {
  if (error) throw new Error(friendlyError(error, n));
  return data;
};
export const leaveYear = (e) => Number(new Date().toISOString().slice(0, 4));
