// Local-only HTTP fixture for browser acceptance tests. No production credentials or data.
import http from "node:http";
const uid = "00000000-0000-0000-0000-000000000001",
  other = "00000000-0000-0000-0000-000000000002",
  team = "00000000-0000-0000-0000-000000000020";
const date = new Date(),
  year = date.getFullYear(),
  iso = (d) => d.toISOString().slice(0, 10);
const future = iso(new Date(date.getTime() + 7 * 864e5));
const types = [
  "Vacation",
  "Sick",
  "Wellness Day",
  "Floating Holiday",
  "Labor Day",
].map((name, i) => ({
  id: `00000000-0000-0000-0000-${String(10 + i).padStart(12, "0")}`,
  name,
  color: ["#4071B6", "#C46A2B", "#2E8B73", "#8A5DB5", "#697386"][i],
  default_days: [10, 5, 2, 1, 1][i],
  requires_window: false,
  allow_backdate: i === 1,
  is_active: true,
}));
const users = [
  {
    id: uid,
    name: "Jordan Rivera",
    email: "jordan@example.test",
    org_role: "god_admin",
    normal_days_off: [0, 6],
    is_active: true,
    password_setup_required: false,
    team_memberships: [
      {
        id: "m1",
        team_id: team,
        user_id: uid,
        role: "admin",
        added_at: iso(date),
        added_by: uid,
      },
    ],
  },
  {
    id: other,
    name: "Casey Morgan",
    email: "casey@example.test",
    org_role: "member",
    normal_days_off: [0, 6],
    is_active: true,
    password_setup_required: false,
    team_memberships: [
      {
        id: "m2",
        team_id: team,
        user_id: other,
        role: "employee",
        added_at: iso(date),
        added_by: uid,
      },
    ],
  },
];
const tables = {
  profiles: users,
  teams: [
    {
      id: team,
      name: "Dining Services",
      description: "Campus dining",
      created_at: date.toISOString(),
    },
  ],
  pto_types: types,
  pto_grants: users.flatMap((user) =>
    types.map((type) => ({
      user_id: user.id,
      pto_type_id: type.id,
      leave_year: year,
      amount: type.default_days,
    })),
  ),
  requests: [
    {
      id: "00000000-0000-0000-0000-000000000100",
      requester_id: other,
      status: "pending",
      note: "A day away",
      submitted_at: date.toISOString(),
      decided_at: null,
      decided_by: null,
      request_lines: [
        { pto_type_id: types[0].id, start_date: future, end_date: future },
      ],
    },
  ],
  holidays: [],
  blackout_dates: [],
  date_rules: [],
  team_memberships: users.flatMap((u) => u.team_memberships),
};
const jwt = () =>
  `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture-signature`;
const authUser = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: users[0].email,
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: date.toISOString(),
};
let count = 200;
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,accept,accept-profile,content-profile,x-retry-count",
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS",
    );
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1");
    let raw = "";
    for await (const part of req) raw += part;
    const body = raw ? JSON.parse(raw) : {};
    const send = (data, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };
    await new Promise((resolve) => setTimeout(resolve, 60));
    if (url.pathname === "/auth/v1/token")
      return send({
        access_token: jwt(),
        refresh_token: "fixture-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: authUser,
      });
    if (url.pathname === "/auth/v1/user") return send(authUser);
    if (url.pathname === "/auth/v1/logout") return send({});
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const method = url.pathname.split("/").at(-1);
      const r = tables.requests.find((r) => r.id === body.p_request_id);
      if (method === "team_coverage") {
        const result = [];
        for (
          let d = new Date(body.p_from + "T12:00:00");
          iso(d) <= body.p_to;
          d.setDate(d.getDate() + 1)
        ) {
          const day = iso(d);
          const off = new Set(
            tables.requests
              .filter(
                (r) =>
                  r.status === "approved" &&
                  r.request_lines.some(
                    (l) => l.start_date <= day && l.end_date >= day,
                  ),
              )
              .map((r) => r.requester_id),
          ).size;
          result.push({
            team_id: team,
            day,
            out_count: off,
            on_shift_count: d.getDay() % 6 === 0 ? 0 : 2 - off,
          });
        }
        return send(result);
      }
      if (method === "submit_request") {
        const id = `00000000-0000-0000-0000-${String(count++).padStart(12, "0")}`;
        tables.requests.unshift({
          id,
          requester_id: uid,
          status: "pending",
          note: body.p_note,
          submitted_at: new Date().toISOString(),
          decided_at: null,
          decided_by: null,
          request_lines: body.p_lines.map((l) => ({
            pto_type_id: l.type_id,
            start_date: l.start,
            end_date: l.end,
          })),
        });
        return send(id);
      }
      if (method === "decide_request") {
        if (!r || r.status !== "pending")
          return send({ message: "This request has already changed." }, 400);
        r.status = body.p_approve ? "approved" : "denied";
        r.decided_at = new Date().toISOString();
        r.decided_by = uid;
        r.denial_reason = body.p_reason;
        return send(null);
      }
      if (method === "cancel_request") {
        if (!r || r.status !== "pending")
          return send(
            { message: "Only pending requests can be cancelled." },
            400,
          );
        r.status = "cancelled";
        return send(null);
      }
      if (method === "undo_decision") {
        r.status = "pending";
        r.decided_at = null;
        return send(null);
      }
      if (method === "set_profile_normal_days_off") {
        users.find((u) => u.id === body.p_user_id).normal_days_off =
          body.p_days;
        return send(body.p_days);
      }
      if (method === "set_pto_grant") {
        tables.pto_grants.find(
          (g) =>
            g.user_id === body.p_user_id && g.pto_type_id === body.p_type_id,
        ).amount = body.p_amount;
        return send(body.p_amount);
      }
      return send(null);
    }
    const table = url.pathname.split("/").at(-1);
    if (!tables[table])
      return send({ message: "Unknown fixture endpoint" }, 404);
    let rows = tables[table].filter((row) => {
      for (const [key, value] of url.searchParams) {
        if (["select", "order", "limit"].includes(key)) continue;
        const [op, ...parts] = value.split(".");
        const wanted = parts.join(".");
        if (op === "eq" && String(row[key]) !== wanted) return false;
        if (op === "not" && wanted === "is.null" && row[key] == null)
          return false;
        if (op === "gte" && row[key] < wanted) return false;
      }
      return true;
    });
    if (req.method === "POST") {
      const row = { ...body, id: `fixture-${count++}` };
      tables[table].push(row);
      rows = [row];
    } else if (req.method === "PATCH")
      rows.forEach((row) => Object.assign(row, body));
    else if (req.method === "DELETE")
      tables[table] = tables[table].filter((row) => !rows.includes(row));
    return send(
      req.headers.accept?.includes("vnd.pgrst.object")
        ? (rows[0] ?? null)
        : rows,
    );
  })
  .listen(54321, "127.0.0.1", () =>
    console.log(
      "Local test API: http://127.0.0.1:54321 (jordan@example.test / any fixture password)",
    ),
  );
