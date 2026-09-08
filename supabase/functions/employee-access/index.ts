import { createClient } from "npm:@supabase/supabase-js@2.116.0";
const headers = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
    auth: { persistSession: false },
  });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  try {
    const {
      data: { user },
      error: authError,
    } = await caller.auth.getUser();
    if (authError || !user) return reply({ error: "Not authenticated" }, 401);
    const { data: actor } = await caller
      .from("profiles")
      .select("id,org_role,is_active,password_setup_required")
      .eq("id", user.id)
      .single();
    if (!actor?.is_active || actor.password_setup_required)
      return reply({ error: "Finish account setup first." }, 403);
    const god = actor.org_role === "god_admin";
    const body = await req.json();
    const must = async (
      promise: PromiseLike<{ data: unknown; error: unknown }>,
    ) => {
      const r = await promise;
      if (r.error) throw r.error;
      return r.data;
    };
    const temporaryPassword = `Pto!${crypto.randomUUID()}9a`;
    if (body.action === "reset") {
      if (body.userId === user.id)
        return reply({ error: "Use your account password settings." }, 400);
      if (
        !(await must(caller.rpc("manages_person", { p_user_id: body.userId })))
      )
        return reply({ error: "Not authorized" }, 403);
      // Mark setup first: an interrupted reset must not grant unrestricted access.
      await must(
        admin
          .from("profiles")
          .update({ password_setup_required: true })
          .eq("id", body.userId),
      );
      await must(
        admin.auth.admin.updateUserById(body.userId, {
          password: temporaryPassword,
        }),
      );
      return reply({ temporaryPassword });
    }
    if (body.action !== "create")
      return reply({ error: "Unknown action" }, 400);
    if (!body.name?.trim() || !/^\S+@\S+\.\S+$/.test(body.email ?? ""))
      return reply({ error: "Enter a name and valid email." }, 400);
    const orgRole = body.orgRole === "god_admin" ? "god_admin" : "member";
    if (
      !god &&
      (orgRole === "god_admin" ||
        !body.teamId ||
        !(await must(caller.rpc("manages_team", { p_team_id: body.teamId }))))
    )
      return reply({ error: "Not authorized" }, 403);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: body.email.trim(),
      password: temporaryPassword,
      email_confirm: true,
    });
    if (error) throw error;
    const id = created.user.id;
    try {
      await must(
        admin
          .from("profiles")
          .insert({
            id,
            name: body.name.trim(),
            email: body.email.trim(),
            org_role: orgRole,
            password_setup_required: true,
            updated_by: user.id,
          }),
      );
      if (body.teamId)
        await must(
          admin
            .from("team_memberships")
            .insert({
              team_id: body.teamId,
              user_id: id,
              role: body.teamRole === "admin" ? "admin" : "employee",
              added_by: user.id,
            }),
        );
      const types = (await must(
        admin.from("pto_types").select("id,default_days").eq("is_active", true),
      )) as { id: string; default_days: number }[];
      if (types.length)
        await must(
          admin
            .from("pto_grants")
            .insert(
              types.map((type) => ({
                user_id: id,
                pto_type_id: type.id,
                leave_year: new Date().getFullYear(),
                amount: type.default_days,
              })),
            ),
        );
      const profile = await must(
        admin
          .from("profiles")
          .select(
            "*,team_memberships:team_memberships!team_memberships_user_id_fkey(*)",
          )
          .eq("id", id)
          .single(),
      );
      return reply({ user: profile, temporaryPassword });
    } catch (error) {
      await admin.auth.admin.deleteUser(id);
      throw error;
    }
  } catch (error) {
    return reply(
      {
        error:
          error instanceof Error
            ? error.message
            : "The account could not be updated.",
      },
      400,
    );
  }
});
