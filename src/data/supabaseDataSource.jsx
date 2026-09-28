import { queryClient } from "../lib/queryClient.js";
import { getSupabaseClient } from "./supabaseClient.jsx";
import { mapRequest } from "./mappers.jsx";
import { applyStampFacts } from "./mappers.jsx";
import { unwrap } from "./mappers.jsx";
import { REQUEST_SELECT } from "./mappers.jsx";
import { PROFILE_SELECT } from "./mappers.jsx";
import { mapProfile } from "./mappers.jsx";
import { leaveYear } from "./mappers.jsx";
import { lineDays } from "../utils/requestHelpers.jsx";
import { belongsToTeam } from "../utils/constants.jsx";
import { mapTeam } from "./mappers.jsx";
import { mapPtoType } from "./mappers.jsx";
import { mapHoliday } from "./mappers.jsx";
import { mapBlackout } from "./mappers.jsx";
import { mapDateRule } from "./mappers.jsx";
import { friendlyError } from "../utils/errors.jsx";
export function createSupabaseDataSource(clientOverride = null) {
  const client = clientOverride ?? getSupabaseClient(),
    currentUserId = async () => {
      var u;
      const data = unwrap(await client.auth.getUser());
      return (
        ((u = data == null ? void 0 : data.user) == null ? void 0 : u.id) ??
        null
      );
    },
    // The seals need facts the caller's own view of profiles cannot supply; see request_stamp_facts.
    // The call is tolerant of the function being absent, so the app runs before the migration lands.
    stampFacts = async (requestId = null) => {
      // These facts only make the seals more exact; a request list is still worth showing without
      // them. A missing function comes back as an error, a dropped connection throws, and neither
      // should cost the caller their requests.
      try {
        const { data: data, error: error } = await client.rpc(
          "request_stamp_facts",
          { p_request_id: requestId },
        );
        return error ? [] : (data ?? []);
      } catch {
        return [];
      }
    },
    withStampFacts = async (requests) =>
      applyStampFacts(requests, await stampFacts()),
    requestById = async (l) => {
      const [res, facts] = await Promise.all([
        client.from("requests").select(REQUEST_SELECT).eq("id", l).single(),
        stampFacts(l),
      ]);
      return applyStampFacts([mapRequest(unwrap(res))], facts)[0];
    },
    stamp = async (requestId, slot, override = !1) => {
      unwrap(
        await client.rpc("stamp_request", {
          p_request_id: requestId,
          p_slot: slot,
          p_override: override,
        }),
      );
    },
    unstamp = async (requestId, slot) => {
      unwrap(
        await client.rpc("unstamp_request", {
          p_request_id: requestId,
          p_slot: slot,
        }),
      );
    },
    getRequests = async () =>
      withStampFacts(
        (
          unwrap(
            await client
              .from("requests")
              .select(REQUEST_SELECT)
              .order("submitted_at", {
                ascending: !1,
              }),
          ) ?? []
        ).map(mapRequest),
      ),
    profilesById = async () => {
      const l =
        unwrap(await client.from("profiles").select(PROFILE_SELECT)) ?? [];
      return new Map(l.map((u) => [u.id, mapProfile(u)]));
    },
    workingCalendar = (userId) =>
      queryClient.fetchQuery({
        queryKey: ["data", "working-calendar", userId],
        queryFn: async () => {
          const profile = await client
            .from("profiles")
            .select("normal_days_off")
            .eq("id", userId)
            .single();
          return {
            normalDaysOff: unwrap(profile).normal_days_off ?? [0, 6],
          };
        },
      }),
    grantsForUser = (userId) =>
      queryClient.fetchQuery({
        queryKey: ["data", "grants-for-user", userId, leaveYear()],
        queryFn: async () =>
          unwrap(
            await client
              .from("pto_grants")
              .select("pto_type_id,amount")
              .eq("user_id", userId)
              .eq("leave_year", leaveYear()),
          ) ?? [],
      }),
    grantFor = async (userId, typeId) =>
      (await grantsForUser(userId)).find((row) => row.pto_type_id === typeId)
        ?.amount ?? null,
    approvedForUser = (userId) =>
      queryClient.fetchQuery({
        queryKey: ["data", "approved-for-user", userId],
        queryFn: async () =>
          (
            unwrap(
              await client
                .from("requests")
                .select(REQUEST_SELECT)
                .eq("requester_id", userId)
                .eq("status", "approved"),
            ) ?? []
          ).map(mapRequest),
      }),
    usedFor = async (userId, typeId) => {
      const [calendar, requests] = await Promise.all([
        workingCalendar(userId),
        approvedForUser(userId),
      ]);
      const year = leaveYear();
      return requests
        .flatMap((request) => request.lines)
        .filter(
          (line) =>
            line.type === typeId &&
            line.end >= `${year}-01-01` &&
            line.start <= `${year}-12-31`,
        )
        .reduce(
          (total, line) =>
            total +
            lineDays(
              {
                ...line,
                start:
                  line.start < `${year}-01-01` ? `${year}-01-01` : line.start,
                end: line.end > `${year}-12-31` ? `${year}-12-31` : line.end,
              },
              calendar.normalDaysOff,
            ),
          0,
        );
    };
  return {
    getRequests: getRequests,
    requestsForUser: async (l) =>
      withStampFacts(
        (
          unwrap(
            await client
              .from("requests")
              .select(REQUEST_SELECT)
              .eq("requester_id", l)
              .order("submitted_at", {
                ascending: !1,
              }),
          ) ?? []
        ).map(mapRequest),
      ),
    pendingForApprover: async (l = null) => {
      const u = await currentUserId(),
        h = (
          unwrap(
            await client
              .from("requests")
              .select(REQUEST_SELECT)
              .eq("status", "pending")
              .order("submitted_at", {
                ascending: !0,
              }),
          ) ?? []
        )
          .map(mapRequest)
          .filter((f) => f.userId !== u);
      if (!l) return withStampFacts(h);
      const d = await profilesById();
      return withStampFacts(h.filter((f) => belongsToTeam(d.get(f.userId), l)));
    },
    recentDecisionsBy: async (l = 30) => {
      const u = await currentUserId(),
        h = new Date(Date.now() - l * 864e5).toISOString();
      const rows = (
        unwrap(
          await client
            .from("requests")
            .select(REQUEST_SELECT)
            .eq("decided_by", u)
            .gte("decided_at", h)
            .order("decided_at", {
              ascending: !1,
            }),
        ) ?? []
      ).map(mapRequest);
      return withStampFacts(rows);
    },
    decisionHistory: async (l = null) => {
      const u = (
        unwrap(
          await client
            .from("requests")
            .select(REQUEST_SELECT)
            .not("decided_at", "is", null)
            .order("decided_at", {
              ascending: !1,
            }),
        ) ?? []
      ).map(mapRequest);
      if (!(l != null && l.length)) return withStampFacts(u);
      const h = await profilesById();
      return withStampFacts(
        u.filter((d) => l.some((f) => belongsToTeam(h.get(d.userId), f))),
      );
    },
    outOnDay: async (l, u = null) => {
      const h = (
          unwrap(
            await client
              .from("requests")
              .select(REQUEST_SELECT)
              .eq("status", "approved"),
          ) ?? []
        )
          .map(mapRequest)
          .filter((f) => f.lines.some((p) => p.start <= l && p.end >= l)),
        d = await profilesById();
      return h
        .map((f) => ({
          ...f,
          user: d.get(f.userId),
        }))
        .filter((f) => f.user && (!u || belongsToTeam(f.user, u)));
    },
    grantFor: grantFor,
    usedFor: usedFor,
    balanceFor: async (l, u) => {
      const [h, d] = await Promise.all([grantFor(l, u), usedFor(l, u)]);
      return h == null ? null : h - d;
    },
    normalDaysOffFor: async (l) => {
      const data = unwrap(
        await client
          .from("profiles")
          .select("normal_days_off")
          .eq("id", l)
          .maybeSingle(),
      );
      return (data == null ? void 0 : data.normal_days_off) ?? [0, 6];
    },
    getGrants: async () =>
      (
        unwrap(
          await client
            .from("pto_grants")
            .select("user_id, pto_type_id, amount, leave_year")
            .eq("leave_year", leaveYear()),
        ) ?? []
      ).map((l) => ({
        userId: l.user_id,
        typeId: l.pto_type_id,
        amount: l.amount,
        leaveYear: l.leave_year,
      })),
    getUsers: async () =>
      (
        unwrap(
          await client.from("profiles").select(PROFILE_SELECT).order("name"),
        ) ?? []
      ).map(mapProfile),
    getTeams: async () =>
      (unwrap(await client.from("teams").select("*").order("name")) ?? []).map(
        mapTeam,
      ),
    getPtoTypes: async () =>
      (
        unwrap(
          await client
            .from("pto_types")
            .select("*")
            .eq("is_active", !0)
            .order("name"),
        ) ?? []
      ).map(mapPtoType),
    // Holiday Day Off is managed through holidays, so Settings never lists it as a type.
    getSettingsPtoTypes: async () =>
      (unwrap(await client.from("pto_types").select("*").order("name")) ?? [])
        .map(mapPtoType)
        .filter((type) => !type.isHolidayDayOff),
    getHolidays: async () =>
      (
        unwrap(await client.from("holidays").select("*").order("date")) ?? []
      ).map(mapHoliday),
    getBlackouts: async () =>
      (
        unwrap(
          await client
            .from("blackout_dates")
            .select("*, blackout_types(pto_type_id)")
            .order("start_date"),
        ) ?? []
      ).map(mapBlackout),
    getDateRules: async () =>
      (
        unwrap(
          await client.from("date_rules").select("*").order("start_date"),
        ) ?? []
      ).map(mapDateRule),
    coverageForRange: async (l, u) =>
      (
        unwrap(
          await client.rpc("team_coverage", {
            p_from: l,
            p_to: u,
          }),
        ) ?? []
      ).map((h) => ({
        teamId: h.team_id,
        day: h.day,
        outCount: h.out_count,
        onShiftCount: h.on_shift_count,
      })),
    teamMembers: async (l) =>
      (
        unwrap(
          await client
            .from("team_memberships")
            .select(
              "profiles:profiles!team_memberships_user_id_fkey(*, team_memberships:team_memberships!team_memberships_user_id_fkey(*))",
            )
            .eq("team_id", l),
        ) ?? []
      )
        .map((h) => mapProfile(h.profiles))
        .filter(Boolean),
    getNotifications: async () => [],
    unreadCount: async () => 0,
    markNotificationRead: async () => null,
    markAllRead: async () => {},
    // Each time off in the form becomes its own request with its own note; the database saves them
    // together or not at all. A Holiday Day Off is routed by its holiday id.
    submitRequest: async (l) => {
      const ids = unwrap(
        await client.rpc("submit_requests", {
          p_requests: l.lines.map((d) => {
            var h;
            return {
              type_id: d.type,
              start: d.start,
              end: d.end,
              holiday_id: d.holidayId || null,
              note:
                ((h = d.note ?? l.note) == null ? void 0 : h.trim()) || null,
            };
          }),
        }),
      );
      return Promise.all((ids ?? []).map(requestById));
    },
    submitWellnessRequest: async ({ days: days, note: note }) =>
      requestById(
        unwrap(
          await client.rpc("submit_wellness_request", {
            p_days: days,
            p_note: (note == null ? void 0 : note.trim()) || null,
          }),
        ),
      ),
    cancelRequest: async (l) => (
      unwrap(
        await client.rpc("cancel_request", {
          p_request_id: l,
        }),
      ),
      requestById(l)
    ),
    // One stamp at a time: the database grants the request once both slots are settled.
    stampRequest: async (l, u, h = !1) => (
      await stamp(l, u, h),
      requestById(l)
    ),
    unstampRequest: async (l, u) => (await unstamp(l, u), requestById(l)),
    denyRequest: async (l, u) => (
      unwrap(
        await client.rpc("deny_request", {
          p_request_id: l,
          p_reason: u,
        }),
      ),
      requestById(l)
    ),
    setGrant: async (l, u, h) =>
      unwrap(
        await client.rpc("set_pto_grant", {
          p_user_id: l,
          p_type_id: u,
          p_leave_year: leaveYear(),
          p_amount: h,
        }),
      ),
    setNormalDaysOff: async (l, u) =>
      unwrap(
        await client.rpc("set_profile_normal_days_off", {
          p_user_id: l,
          p_days: u,
        }),
      ),
    savePtoType: async (l) => {
      const u = unwrap(
          await client.rpc("save_pto_type", {
            p_id: l.id ?? null,
            p_name: l.name.trim(),
            p_color: l.color,
            p_default_days: l.defaultDays,
            p_requires_window: !!l.restrictedDates,
            p_is_active: l.isActive !== !1,
            p_windows: l.windows ?? [],
          }),
        ),
        h = unwrap(
          await client.from("pto_types").select("*").eq("id", u).single(),
        );
      return mapPtoType(h);
    },
    retirePtoType: async (l) => {
      unwrap(
        await client
          .from("pto_types")
          .update({
            is_active: !1,
          })
          .eq("id", l)
          .select("id")
          .single(),
      );
    },
    saveHoliday: async (l) => {
      const u = l.id
        ? client
            .from("holidays")
            .update({
              date: l.date,
              name: l.name.trim(),
            })
            .eq("id", l.id)
        : client.from("holidays").insert({
            date: l.date,
            name: l.name.trim(),
          });
      return mapHoliday(unwrap(await u.select("*").single()));
    },
    deleteHoliday: async (l) => {
      unwrap(
        await client
          .from("holidays")
          .delete()
          .eq("id", l)
          .select("id")
          .single(),
      );
    },
    saveBlackout: async (l) => {
      const u =
          l.types === "all"
            ? null
            : Array.isArray(l.types)
              ? l.types
              : [l.types],
        h = unwrap(
          await client.rpc("save_blackout", {
            p_id: l.id ?? null,
            p_start: l.start,
            p_end: l.end,
            p_reason: l.reason.trim(),
            p_type_ids: u,
          }),
        ),
        d = unwrap(
          await client
            .from("blackout_dates")
            .select("*, blackout_types(pto_type_id)")
            .eq("id", h)
            .single(),
        );
      return mapBlackout(d);
    },
    deleteBlackout: async (l) => {
      unwrap(
        await client
          .from("blackout_dates")
          .delete()
          .eq("id", l)
          .select("id")
          .single(),
      );
    },
    saveTeam: async (l) => {
      var h;
      const u = unwrap(
        await client.rpc("save_team", {
          p_id: l.id ?? null,
          p_name: l.name.trim(),
          p_description:
            ((h = l.description) == null ? void 0 : h.trim()) || null,
          p_members: l.members ?? [],
        }),
      );
      return mapTeam(
        unwrap(await client.from("teams").select("*").eq("id", u).single()),
      );
    },
    deleteTeam: async (l) => {
      unwrap(
        await client.from("teams").delete().eq("id", l).select("id").single(),
      );
    },
    addMemberships: async (l, u) => {
      u.length &&
        unwrap(
          await client.rpc("add_team_memberships", {
            p_team_id: l,
            p_entries: u,
          }),
        );
    },
    removeMembership: async (l, u) => {
      unwrap(
        await client.rpc("remove_team_membership", {
          p_team_id: l,
          p_user_id: u,
        }),
      );
    },
    setMembershipRole: async (l, u, h) => {
      unwrap(
        await client.rpc("set_team_membership_role", {
          p_team_id: l,
          p_user_id: u,
          p_role: h,
        }),
      );
    },
    setProfileOrgRole: async (l, u) => {
      unwrap(
        await client.rpc("set_profile_org_role", {
          p_user_id: l,
          p_org_role: u,
        }),
      );
    },
    setProfileActive: async (l, u) => {
      unwrap(
        await client.rpc("set_profile_active", {
          p_user_id: l,
          p_is_active: u,
        }),
      );
    },
    provisionEmployee: async (l) => {
      var d;
      const { data: data, error: error } = await client.functions.invoke(
        "employee-access",
        {
          body: {
            ...l,
            action: "create",
          },
        },
      );
      if (error) {
        let f = error.message;
        try {
          const p = await ((d = error.context) == null ? void 0 : d.json());
          f = (p == null ? void 0 : p.error) || f;
        } catch {}
        throw new Error(
          friendlyError(f, "The employee account could not be created."),
        );
      }
      if (data != null && data.error) throw new Error(data.error);
      if (!(data != null && data.user))
        throw new Error(
          "The employee account was created, but its profile could not be loaded.",
        );
      if (!(data != null && data.temporaryPassword))
        throw new Error(
          "The account was created, but its temporary password could not be shown. Generate a new one from the employee profile.",
        );
      return {
        user: mapProfile(data.user),
        temporaryPassword: data.temporaryPassword,
      };
    },
    resetTemporaryPassword: async (l) => {
      var d;
      const { data: data, error: error } = await client.functions.invoke(
        "employee-access",
        {
          body: {
            action: "reset",
            userId: l,
          },
        },
      );
      if (error) {
        let f = error.message;
        try {
          const p = await ((d = error.context) == null ? void 0 : d.json());
          f = (p == null ? void 0 : p.error) || f;
        } catch {}
        throw new Error(
          friendlyError(f, "A temporary password could not be generated."),
        );
      }
      if (data != null && data.error) throw new Error(data.error);
      if (!(data != null && data.temporaryPassword))
        throw new Error(
          "A temporary password could not be generated. Try again.",
        );
      return {
        temporaryPassword: data.temporaryPassword,
      };
    },
  };
}
