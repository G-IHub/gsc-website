// The Research Hub's database layer. Takes any object with a `query(text, params)` that returns rows
// (the Neon client in production, an in-process Postgres in test_hub_access.js). No access decisions here:
// those are all in _hub_core.js. Money lives in its own table (hub_project_money) on purpose.

export const HUB_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS hub_users (
     id BIGSERIAL PRIMARY KEY,
     email TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     role TEXT NOT NULL,
     unit TEXT NOT NULL DEFAULT '',
     password_hash TEXT NOT NULL,
     active BOOLEAN NOT NULL DEFAULT true,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_projects (
     id BIGSERIAL PRIMARY KEY,
     ref TEXT NOT NULL UNIQUE,
     title TEXT NOT NULL,
     stage TEXT NOT NULL DEFAULT '',
     unit TEXT NOT NULL DEFAULT '',
     health TEXT NOT NULL DEFAULT 'green',
     payment_status TEXT NOT NULL DEFAULT 'not_cleared',
     target_date DATE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_project_client (
     project_id BIGINT PRIMARY KEY REFERENCES hub_projects(id) ON DELETE CASCADE,
     name TEXT NOT NULL DEFAULT '',
     contact TEXT NOT NULL DEFAULT ''
   )`,
  `CREATE TABLE IF NOT EXISTS hub_project_money (
     project_id BIGINT PRIMARY KEY REFERENCES hub_projects(id) ON DELETE CASCADE,
     fee NUMERIC(16,2) NOT NULL DEFAULT 0,
     paid NUMERIC(16,2) NOT NULL DEFAULT 0,
     currency TEXT NOT NULL DEFAULT 'NGN'
   )`,
  `CREATE TABLE IF NOT EXISTS hub_members (
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     user_id BIGINT NOT NULL REFERENCES hub_users(id) ON DELETE CASCADE,
     project_role TEXT NOT NULL DEFAULT '',
     PRIMARY KEY (project_id, user_id)
   )`,
  `ALTER TABLE hub_members ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE TABLE IF NOT EXISTS hub_access_log (
     id BIGSERIAL PRIMARY KEY,
     at TIMESTAMPTZ NOT NULL DEFAULT now(),
     user_id BIGINT,
     event TEXT NOT NULL,
     detail JSONB NOT NULL DEFAULT '{}'
   )`,
  `CREATE TABLE IF NOT EXISTS hub_login_failures (
     id BIGSERIAL PRIMARY KEY,
     at TIMESTAMPTZ NOT NULL DEFAULT now(),
     ip TEXT NOT NULL,
     email TEXT NOT NULL DEFAULT ''
   )`,
];

const U = "id::int AS id, email, name, role, unit, password_hash, active";
const P = "id::int AS id, ref, title, stage, unit, health, payment_status, to_char(target_date, 'YYYY-MM-DD') AS target_date";

export async function ensureSchema(sql) {
  for (const stmt of HUB_SCHEMA) await sql.query(stmt);
}

export const makeStore = (sql) => ({
  // people
  getUserByEmail: async (email) => (await sql.query(`SELECT ${U} FROM hub_users WHERE email = $1`, [email]))[0] ?? null,
  getUserById: async (id) => (await sql.query(`SELECT ${U} FROM hub_users WHERE id = $1`, [id]))[0] ?? null,
  listUsers: async () => sql.query(`SELECT ${U} FROM hub_users ORDER BY name`),
  createUser: async (u) =>
    (await sql.query(
      `INSERT INTO hub_users (email, name, role, unit, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING ${U}`,
      [u.email, u.name, u.role, u.unit || "", u.password_hash],
    ))[0],
  updateUser: async (id, patch) => {
    for (const [k, v] of Object.entries(patch)) {
      if (!["role", "unit", "active", "password_hash"].includes(k)) continue; // only these columns, never a caller-chosen name
      await sql.query(`UPDATE hub_users SET ${k} = $1 WHERE id = $2`, [v, id]);
    }
  },

  // sign-in attempts
  countFailures: async (ip, email) => {
    await sql.query(`DELETE FROM hub_login_failures WHERE at < now() - interval '1 day'`);
    const [r] = await sql.query(
      `SELECT
         count(*) FILTER (WHERE ip = $1)::int AS ip,
         count(*) FILTER (WHERE email = $2 AND $2 <> '')::int AS email,
         count(*)::int AS "all"
       FROM hub_login_failures WHERE at > now() - interval '15 minutes'`,
      [ip, email],
    );
    return r;
  },
  addFailure: async (ip, email) => {
    await sql.query(`INSERT INTO hub_login_failures (ip, email) VALUES ($1, $2)`, [ip, email]);
  },

  // projects
  listProjects: async () => sql.query(`SELECT ${P} FROM hub_projects ORDER BY ref`),
  getProject: async (id) => (await sql.query(`SELECT ${P} FROM hub_projects WHERE id = $1`, [id]))[0] ?? null,
  createProject: async (p) =>
    (await sql.query(
      `INSERT INTO hub_projects (ref, title, stage, unit, target_date) VALUES ($1,$2,$3,$4,$5) RETURNING ${P}`,
      [p.ref, p.title, p.stage || "", p.unit || "", p.target_date],
    ))[0],
  updateProject: async (id, patch) => {
    for (const [k, v] of Object.entries(patch)) {
      if (!["stage", "health", "target_date", "payment_status"].includes(k)) continue;
      await sql.query(`UPDATE hub_projects SET ${k} = $1 WHERE id = $2`, [v, id]);
    }
  },
  getClient: async (id) => (await sql.query(`SELECT name, contact FROM hub_project_client WHERE project_id = $1`, [id]))[0] ?? null,
  setClient: async (id, c) => {
    await sql.query(
      `INSERT INTO hub_project_client (project_id, name, contact) VALUES ($1,$2,$3)
       ON CONFLICT (project_id) DO UPDATE SET name = EXCLUDED.name, contact = EXCLUDED.contact`,
      [id, c.name, c.contact],
    );
  },

  // who is on which project
  projectIdsForUser: async (uid) => (await sql.query(`SELECT project_id::int AS id FROM hub_members WHERE user_id = $1`, [uid])).map((r) => r.id),
  listMembers: async (pid) =>
    sql.query(
      `SELECT m.user_id::int AS user_id, u.name, u.role, m.project_role, to_char(m.added_at, 'YYYY-MM-DD') AS added
       FROM hub_members m JOIN hub_users u ON u.id = m.user_id WHERE m.project_id = $1 ORDER BY u.name`,
      [pid],
    ),
  addMember: async (pid, uid, projectRole) => {
    await sql.query(
      `INSERT INTO hub_members (project_id, user_id, project_role) VALUES ($1,$2,$3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET project_role = EXCLUDED.project_role`,
      [pid, uid, projectRole],
    );
  },
  removeMember: async (pid, uid) => {
    await sql.query(`DELETE FROM hub_members WHERE project_id = $1 AND user_id = $2`, [pid, uid]);
  },

  // money (own table)
  getMoney: async (pid) =>
    (await sql.query(`SELECT fee::float8 AS fee, paid::float8 AS paid, currency FROM hub_project_money WHERE project_id = $1`, [pid]))[0] ?? null,
  setMoney: async (pid, m) => {
    await sql.query(
      `INSERT INTO hub_project_money (project_id, fee, paid, currency) VALUES ($1,$2,$3,$4)
       ON CONFLICT (project_id) DO UPDATE SET fee = EXCLUDED.fee, paid = EXCLUDED.paid, currency = EXCLUDED.currency`,
      [pid, m.fee, m.paid, m.currency],
    );
  },

  // log
  log: async (e) => {
    await sql.query(`INSERT INTO hub_access_log (user_id, event, detail) VALUES ($1,$2,$3::jsonb)`, [e.user_id, e.event, JSON.stringify(e.detail ?? {})]);
  },
  listLog: async (limit) =>
    sql.query(
      `SELECT l.id::int AS id, l.at, l.event, l.detail, u.name AS who
       FROM hub_access_log l LEFT JOIN hub_users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT ${Math.min(Number(limit) || 100, 500)}`,
    ),
});
