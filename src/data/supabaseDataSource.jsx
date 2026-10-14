import { queryClient } from "../lib/queryClient.js";
import { getSupabaseClient } from "./supabaseClient.jsx";
import { mapRequest } from "./mappers.jsx";
import { applyStampFacts } from "./mappers.jsx";
import { unwrap } from "./mappers.jsx";
import { REQUEST_SELECT } from "./mappers.jsx";
import { PROFILE_SELECT } from "./mappers.jsx";
import { mapProfile } from "./mappers.jsx";
import { mapWhoIsOff } from "./mappers.jsx";
import { mapDirectoryPerson } from "./mappers.jsx";
import { leaveYear } from "./mappers.jsx";
import { mapAllowance } from "./mappers.jsx";
import { localToday as todayIso } from "./today.jsx";
import { belongsToTeam } from "../utils/constants.jsx";
import { mapTeam } from "./mappers.jsx";
import { mapPtoType } from "./mappers.jsx";
import { mapHoliday } from "./mappers.jsx";
import { mapBlackout } from "./mappers.jsx";
import { mapDateRule } from "./mappers.jsx";
import { friendlyError } from "../utils/errors.jsx";
// Each time off in the form becomes its own request with its own note; the database saves them
// together or not at all. A Holiday Day Off is routed by its holiday id.
const requestItems = (draft) =>
  draft.lines.map((d) => {
    var h;
    return {
      type_id: d.type,
      start: d.start,
      end: d.end,
      holiday_id: d.holidayId || null,
      note: ((h = d.note ?? draft.note) == null ? void 0 : h.trim()) || null,
    };
  });
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
    // Who's off and who's on which team, for everyone signed in; see who_is_off(). Like the
    // stamp facts, a missing function or failed call leaves the viewer's own view intact.
    everyoneRpc = async (name) => {
      try {
        const { data: data, error: error } = await client.rpc(name);
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
    // Every allowance comes from leave_allowances(): last, this and next leave year for each type,
    // with the amount (carried forward when no row was written for that year) and the days used.
    // Each type has its own leave year, so rows are picked by the date asked about.
    allowanceRows = (userId = null) =>
      queryClient.fetchQuery({
        queryKey: ["data", "leave-allowances", userId ?? "all"],
        queryFn: async () =>
          (
            unwrap(
              await client.rpc("leave_allowances", {
                p_user_id: userId,
              }),
            ) ?? []
          ).map(mapAllowance),
      }),
    allowanceOn = async (userId, typeId, onIso) => {
      const day = onIso || todayIso();
      return (
        (await allowanceRows(userId)).find(
          (row) =>
            row.typeId === typeId && row.startsOn <= day && row.endsOn >= day,
        ) ?? null
      );
    },
    grantFor = async (userId, typeId, onIso) =>
      (await allowanceOn(userId, typeId, onIso))?.amount ?? null,
    usedFor = async (userId, typeId, onIso) =>
      (await allowanceOn(userId, typeId, onIso))?.used ?? 0;
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
    whoIsOff: async () => mapWhoIsOff(await everyoneRpc("who_is_off")),
    teamDirectory: async () =>
      (await everyoneRpc("team_directory")).map(mapDirectoryPerson),
    grantFor: grantFor,
    usedFor: usedFor,
    // onIso picks the leave year; today's when left out.
    balanceFor: async (l, u, onIso) => {
      const row = await allowanceOn(l, u, onIso);
      return row == null ? null : row.balance;
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
    // Each person's allowance per type for the leave year running today, or the next one.
    getGrants: async (which = "current") => {
      const day = todayIso();
      const rows = await allowanceRows(null);
      const current = rows.filter((r) => r.startsOn <= day && r.endsOn >= day);
      if (which !== "next") return current;
      return current
        .map((c) =>
          rows.find(
            (r) =>
              r.userId === c.userId &&
              r.typeId === c.typeId &&
              r.leaveYear === c.leaveYear + 1,
          ),
        )
        .filter(Boolean);
    },
    leaveAllowances: (userId) => allowanceRows(userId),
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
    submitRequest: async (l) => {
      const ids = unwrap(
        await client.rpc("submit_requests", {
          p_requests: requestItems(l),
        }),
      );
      return Promise.all((ids ?? []).map(requestById));
    },
    // HR books time off for someone else. The database approves it before returning, with HR's
    // stamp in each slot, and allows past dates. Only HR may call it.
    bookRequestsFor: async (personId, l) => {
      const ids = unwrap(
        await client.rpc("book_requests_for", {
          p_requester: personId,
          p_requests: requestItems(l),
        }),
      );
      return Promise.all((ids ?? []).map(requestById));
    },
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
    // year: the leave year to set; the type's leave year running today when left out.
    setGrant: async (l, u, h, year) =>
      unwrap(
        await client.rpc("set_pto_grant", {
          p_user_id: l,
          p_type_id: u,
          p_leave_year:
            year ?? (await allowanceOn(l, u, todayIso()))?.leaveYear ?? leaveYear(),
          p_amount: h,
        }),
      ),
    setLeaveReset: async (typeId, { month, day, firstReset }) =>
      unwrap(
        await client.rpc("set_leave_reset", {
          p_type_id: typeId,
          p_month: month,
          p_day: day,
          p_first_reset: firstReset,
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
    updatePersonDetails: async (userId, name, email) => {
      const { data, error } = await client.functions.invoke("employee-access", {
        body: { action: "update_details", userId, name, email },
      });
      if (error) {
        let message = error.message;
        try {
          const response = await error.context?.json();
          message = response?.error || message;
        } catch {}
        throw new Error(friendlyError(message, "Account details could not be saved."));
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.name || !data?.email)
        throw new Error("Account details could not be confirmed. Reload and check them.");
      return data;
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
