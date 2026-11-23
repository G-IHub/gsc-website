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
  `CREATE TABLE IF NOT EXISTS hub_milestones (
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     n INT NOT NULL,
     name TEXT NOT NULL,
     owner TEXT NOT NULL DEFAULT '',
     planned DATE,
     done DATE,
     status TEXT NOT NULL DEFAULT 'not_started',
     signoff BOOLEAN NOT NULL DEFAULT false,
     signed BOOLEAN NOT NULL DEFAULT false,
     PRIMARY KEY (project_id, n)
   )`,
  `CREATE TABLE IF NOT EXISTS hub_library (
     id BIGSERIAL PRIMARY KEY,
     title TEXT NOT NULL,
     category TEXT NOT NULL DEFAULT '',
     kind TEXT NOT NULL DEFAULT 'Word',
     audience TEXT NOT NULL DEFAULT 'all',
     description TEXT NOT NULL DEFAULT '',
     link TEXT NOT NULL DEFAULT '',
     sort INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_updates (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     author_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     done TEXT NOT NULL DEFAULT '',
     next TEXT NOT NULL DEFAULT '',
     blockers TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_clearance (
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     key TEXT NOT NULL,
     done BOOLEAN NOT NULL DEFAULT false,
     by_user BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     at TIMESTAMPTZ,
     PRIMARY KEY (project_id, key)
   )`,
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
// the date of the newest weekly update, so Home can say which projects have gone quiet
const LAST_UPDATE = "(SELECT to_char(max(u.created_at), 'YYYY-MM-DD') FROM hub_updates u WHERE u.project_id = hub_projects.id) AS last_update";
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
  listProjects: async () => sql.query(`SELECT ${P}, ${LAST_UPDATE} FROM hub_projects ORDER BY ref`),
  getProject: async (id) => (await sql.query(`SELECT ${P}, ${LAST_UPDATE} FROM hub_projects WHERE id = $1`, [id]))[0] ?? null,
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

  // milestones: the 14 standard ones are created the first time a project's milestones are asked for
  listMilestones: async (pid) =>
    sql.query(
      `SELECT n, name, owner, to_char(planned, 'YYYY-MM-DD') AS planned, to_char(done, 'YYYY-MM-DD') AS done, status, signoff, signed
       FROM hub_milestones WHERE project_id = $1 ORDER BY n`,
      [pid],
    ),
  seedMilestones: async (pid, list) => {
    for (const m of list) {
      await sql.query(
        `INSERT INTO hub_milestones (project_id, n, name, owner, signoff) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [pid, m.n, m.name, m.owner, m.signoff],
      );
    }
  },
  updateMilestone: async (pid, n, patch) => {
    for (const [k, v] of Object.entries(patch)) {
      if (!["status", "planned", "done", "signed"].includes(k)) continue; // only these columns
      await sql.query(`UPDATE hub_milestones SET ${k} = $1 WHERE project_id = $2 AND n = $3`, [v, pid, n]);
    }
  },

  // document library (links to the files; the files themselves stay in the team's own drive)
  listLibrary: async () =>
    sql.query(`SELECT id::int AS id, title, category, kind, audience, description, link, sort FROM hub_library ORDER BY sort, id`),
  seedLibrary: async (list) => {
    const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM hub_library`);
    if (n > 0) return;
    let i = 0;
    for (const d of list) {
      await sql.query(
        `INSERT INTO hub_library (title, category, kind, audience, description, sort) VALUES ($1,$2,$3,$4,$5,$6)`,
        [d.title, d.category, d.kind, d.audience, d.description, ++i],
      );
    }
  },
  saveLibrary: async (d) => {
    if (d.id) {
      await sql.query(
        `UPDATE hub_library SET title=$1, category=$2, kind=$3, audience=$4, description=$5, link=$6, updated_at=now() WHERE id=$7`,
        [d.title, d.category, d.kind, d.audience, d.description, d.link, d.id],
      );
      return d.id;
    }
    const [r] = await sql.query(
      `INSERT INTO hub_library (title, category, kind, audience, description, link, sort)
       VALUES ($1,$2,$3,$4,$5,$6, (SELECT COALESCE(max(sort),0)+1 FROM hub_library)) RETURNING id::int AS id`,
      [d.title, d.category, d.kind, d.audience, d.description, d.link],
    );
    return r.id;
  },
  deleteLibrary: async (id) => {
    await sql.query(`DELETE FROM hub_library WHERE id = $1`, [id]);
  },

  // weekly updates: add and read only (no edits), so the record stays honest
  listUpdates: async (pid) =>
    sql.query(
      `SELECT u.id::int AS id, u.author_id::int AS author_id, a.name AS author, u.done, u.next, u.blockers,
              to_char(u.created_at, 'YYYY-MM-DD') AS date, u.created_at
       FROM hub_updates u LEFT JOIN hub_users a ON a.id = u.author_id WHERE u.project_id = $1 ORDER BY u.created_at DESC, u.id DESC LIMIT 30`,
      [pid],
    ),
  addUpdate: async (pid, authorId, u) => {
    const [r] = await sql.query(
      `INSERT INTO hub_updates (project_id, author_id, done, next, blockers) VALUES ($1,$2,$3,$4,$5) RETURNING id::int AS id`,
      [pid, authorId, u.done, u.next, u.blockers],
    );
    return r.id;
  },
  getUpdate: async (id) =>
    (await sql.query(`SELECT id::int AS id, project_id::int AS project_id, author_id::int AS author_id FROM hub_updates WHERE id = $1`, [id]))[0] ?? null,
  deleteUpdate: async (id) => {
    await sql.query(`DELETE FROM hub_updates WHERE id = $1`, [id]);
  },

  // financial clearance checklist (only ticked items are stored)
  listClearance: async (pid) =>
    sql.query(
      `SELECT c.key, c.done, u.name AS by_name, to_char(c.at, 'YYYY-MM-DD') AS at
       FROM hub_clearance c LEFT JOIN hub_users u ON u.id = c.by_user WHERE c.project_id = $1`,
      [pid],
    ),
  setClearance: async (pid, key, done, uid) => {
    await sql.query(
      `INSERT INTO hub_clearance (project_id, key, done, by_user, at) VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (project_id, key) DO UPDATE SET done = EXCLUDED.done, by_user = EXCLUDED.by_user, at = now()`,
      [pid, key, done, uid],
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
