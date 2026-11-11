import { adminConfigured, clearCookie, db, hasSession, passwordOk, sessionCookie } from "./_lib.js";

// One endpoint for the admin page, chosen with ?action=
//   login, logout, me           sign in and out, check the session
//   list, update, delete        read and manage enquiries
//   export                      download every enquiry as a CSV file
// Everything except login needs a valid session cookie. Changes also need the X-Requested-With header,
// which together with the SameSite=Strict cookie blocks requests forged from other websites.

const STATUSES = ["New", "Contacted", "In progress", "Won", "Closed"];
const SOURCES = ["contact", "research-clinic", "clinic", "young-researchers"];
const COLUMNS =
  "id::int AS id, created_at, source, enquiry_type, name, organization, email, country, title, service, status, notes, data";

const MAX_FAILURES = 5; // wrong passwords per IP in 15 minutes
const MAX_FAILURES_ALL = 30; // across everyone, in case an attack comes from many IPs

const reply = (res, code, body) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(code).json(body);
};

const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stops spreadsheets running a cell as a formula
  return `"${s.replace(/"/g, '""')}"`;
};

export default async function handler(req, res) {
  if (!adminConfigured()) return reply(res, 503, { error: "Admin is not set up yet" });

  const action = String(req.query?.action ?? "");
  if (req.method !== "GET" && req.headers["x-requested-with"] !== "gsc-admin") {
    return reply(res, 403, { error: "Forbidden" });
  }

  let sql;
  try {
    sql = await db();
  } catch (err) {
    console.error("Admin database error:", err?.message);
    return reply(res, 500, { error: "Could not reach the database" });
  }

  try {
    if (action === "login" && req.method === "POST") {
      const ip = String(req.headers["x-forwarded-for"] ?? "unknown").split(",")[0].trim();
      await sql.query(`DELETE FROM admin_login_failures WHERE at < now() - interval '1 day'`);
      const [mine] = await sql.query(
        `SELECT count(*)::int AS n FROM admin_login_failures WHERE ip = $1 AND at > now() - interval '15 minutes'`,
        [ip],
      );
      const [all] = await sql.query(
        `SELECT count(*)::int AS n FROM admin_login_failures WHERE at > now() - interval '15 minutes'`,
      );
      if (mine.n >= MAX_FAILURES || all.n >= MAX_FAILURES_ALL) {
        return reply(res, 429, { error: "Too many attempts. Try again in 15 minutes." });
      }
      const password = typeof req.body === "object" ? req.body?.password : "";
      if (!password || !passwordOk(password)) {
        await sql.query(`INSERT INTO admin_login_failures (ip) VALUES ($1)`, [ip]);
        await new Promise((r) => setTimeout(r, 600));
        return reply(res, 401, { error: "Wrong password" });
      }
      res.setHeader("Set-Cookie", sessionCookie());
      return reply(res, 200, { ok: true });
    }

    if (action === "logout" && req.method === "POST") {
      res.setHeader("Set-Cookie", clearCookie());
      return reply(res, 200, { ok: true });
    }

    if (!hasSession(req.headers.cookie)) return reply(res, 401, { error: "Not signed in" });

    if (action === "me" && req.method === "GET") return reply(res, 200, { ok: true });

    if (action === "list" && req.method === "GET") {
      const { status, source, q } = req.query;
      const where = [];
      const params = [];
      if (STATUSES.includes(status)) {
        params.push(status);
        where.push(`status = $${params.length}`);
      }
      if (SOURCES.includes(source)) {
        params.push(source);
        where.push(`source = $${params.length}`);
      }
      if (q) {
        params.push(`%${String(q).slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`);
        const n = params.length;
        where.push(
          `(name ILIKE $${n} OR organization ILIKE $${n} OR email ILIKE $${n} OR title ILIKE $${n} OR country ILIKE $${n} OR service ILIKE $${n})`,
        );
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

      const rows = await sql.query(
        `SELECT ${COLUMNS} FROM enquiries ${clause} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
        params,
      );
      const [{ n: total }] = await sql.query(`SELECT count(*)::int AS n FROM enquiries ${clause}`, params);
      const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      for (const c of await sql.query(`SELECT status, count(*)::int AS n FROM enquiries GROUP BY status`)) {
        counts[c.status] = c.n;
      }
      return reply(res, 200, { rows, total, counts });
    }

    if (action === "update" && req.method === "POST") {
      const { id, status, notes } = req.body ?? {};
      const num = Number(id);
      if (!Number.isInteger(num)) return reply(res, 400, { error: "Bad request" });
      if (status !== undefined && !STATUSES.includes(status)) return reply(res, 400, { error: "Bad status" });
      if (notes !== undefined && (typeof notes !== "string" || notes.length > 5000)) {
        return reply(res, 400, { error: "Notes are too long" });
      }
      const rows = await sql.query(
        `UPDATE enquiries SET status = COALESCE($2, status), notes = COALESCE($3, notes) WHERE id = $1 RETURNING ${COLUMNS}`,
        [num, status ?? null, notes ?? null],
      );
      if (!rows.length) return reply(res, 404, { error: "Not found" });
      return reply(res, 200, { row: rows[0] });
    }

    if (action === "delete" && req.method === "POST") {
      const num = Number(req.body?.id);
      if (!Number.isInteger(num)) return reply(res, 400, { error: "Bad request" });
      await sql.query(`DELETE FROM enquiries WHERE id = $1`, [num]);
      return reply(res, 200, { ok: true });
    }

    if (action === "export" && req.method === "GET") {
      const rows = await sql.query(`SELECT ${COLUMNS} FROM enquiries ORDER BY created_at DESC, id DESC LIMIT 5000`);
      const head = ["ID", "Received", "Source", "Enquiry type", "Name", "Organization", "Email", "Country", "Project title", "Service", "Status", "Notes", "Description"];
      const lines = rows.map((r) =>
        [r.id, new Date(r.created_at).toISOString(), r.source, r.enquiry_type, r.name, r.organization, r.email, r.country, r.title, r.service, r.status, r.notes, r.data?.description]
          .map(csvCell)
          .join(","),
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="gsc-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send("﻿" + [head.map(csvCell).join(","), ...lines].join("\r\n"));
    }

    return reply(res, 404, { error: "Unknown action" });
  } catch (err) {
    console.error("Admin error:", err?.message);
    return reply(res, 500, { error: "Something went wrong" });
  }
}
