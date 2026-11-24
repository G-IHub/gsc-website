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
  `CREATE TABLE IF NOT EXISTS hub_payments (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     amount NUMERIC(16,2) NOT NULL DEFAULT 0,
     due_date DATE,
     received_date DATE,
     status TEXT NOT NULL DEFAULT 'planned',
     sort INT NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS hub_changes (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     author_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     on_date DATE NOT NULL DEFAULT CURRENT_DATE,
     text TEXT NOT NULL,
     dates_effect TEXT NOT NULL DEFAULT '',
     fee_effect TEXT NOT NULL DEFAULT '',
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_files (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     folder TEXT NOT NULL DEFAULT 'Other',
     kind TEXT NOT NULL DEFAULT 'Other',
     status TEXT NOT NULL DEFAULT 'in_progress',
     editing_by BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     editing_since TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_file_versions (
     id BIGSERIAL PRIMARY KEY,
     file_id BIGINT NOT NULL REFERENCES hub_files(id) ON DELETE CASCADE,
     version INT NOT NULL,
     link TEXT NOT NULL,
     note TEXT NOT NULL DEFAULT '',
     by_user BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (file_id, version)
   )`,
  `CREATE TABLE IF NOT EXISTS hub_comments (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     author_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     text TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_tasks (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     text TEXT NOT NULL,
     assignee_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     due DATE,
     milestone INT,
     done BOOLEAN NOT NULL DEFAULT false,
     created_by BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_reports (
     id BIGSERIAL PRIMARY KEY,
     week_ending DATE NOT NULL,
     workstream TEXT NOT NULL,
     status TEXT NOT NULL,
     done TEXT NOT NULL DEFAULT '',
     deliverables TEXT NOT NULL DEFAULT '',
     challenges TEXT NOT NULL DEFAULT '',
     next TEXT NOT NULL DEFAULT '',
     author_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_kpis (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL DEFAULT '',
     progress INT NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'progress',
     by_user BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_raci (
     id BIGSERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     cells JSONB NOT NULL DEFAULT '[]',
     sort INT NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS hub_directory (
     user_id BIGINT PRIMARY KEY REFERENCES hub_users(id) ON DELETE CASCADE,
     skills TEXT NOT NULL DEFAULT '',
     can_lead BOOLEAN NOT NULL DEFAULT false,
     can_qa BOOLEAN NOT NULL DEFAULT false,
     max_projects INT NOT NULL DEFAULT 2,
     availability TEXT NOT NULL DEFAULT 'available',
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE hub_library ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '0.1'`,
  `ALTER TABLE hub_library ADD COLUMN IF NOT EXISTS owner TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE hub_raci ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS hub_meta (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL DEFAULT '',
     at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS hub_qa_rounds (
     id BIGSERIAL PRIMARY KEY,
     project_id BIGINT NOT NULL REFERENCES hub_projects(id) ON DELETE CASCADE,
     round INT NOT NULL,
     version TEXT NOT NULL DEFAULT '',
     outcome TEXT,
     comments TEXT NOT NULL DEFAULT '',
     reviewer_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     reviewer_signed_at TIMESTAMPTZ,
     lead_id BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     lead_signed_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (project_id, round)
   )`,
  `CREATE TABLE IF NOT EXISTS hub_qa_checks (
     round_id BIGINT NOT NULL REFERENCES hub_qa_rounds(id) ON DELETE CASCADE,
     n INT NOT NULL,
     result TEXT NOT NULL DEFAULT '',
     note TEXT NOT NULL DEFAULT '',
     by_user BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (round_id, n)
   )`,
  `CREATE TABLE IF NOT EXISTS hub_qa_issues (
     id BIGSERIAL PRIMARY KEY,
     round_id BIGINT NOT NULL REFERENCES hub_qa_rounds(id) ON DELETE CASCADE,
     text TEXT NOT NULL,
     check_n INT,
     severity TEXT NOT NULL DEFAULT 'must',
     status TEXT NOT NULL DEFAULT 'open',
     by_user BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     fixed_by BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     fixed_at TIMESTAMPTZ,
     rechecked_by BIGINT REFERENCES hub_users(id) ON DELETE SET NULL,
     rechecked_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
const LAST_UPDATE = "(SELECT to_char(max(u.created_at), 'YYYY-MM-DD') FROM hub_updates u WHERE u.project_id = hub_projects.id) AS last_update, " +
  "(SELECT l.name FROM hub_members m JOIN hub_users l ON l.id = m.user_id WHERE m.project_id = hub_projects.id AND (l.role = 'lead' OR m.project_role ILIKE '%lead%') ORDER BY l.name LIMIT 1) AS lead_name";
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
  // a project is closed when its close-out milestone (14) is done
  closedProjectIds: async () =>
    (await sql.query(`SELECT project_id::int AS id FROM hub_milestones WHERE n = 14 AND status = 'done'`)).map((r) => r.id),
  projectRolesForUser: async (uid) =>
    sql.query(`SELECT project_id::int AS id, project_role FROM hub_members WHERE user_id = $1`, [uid]),
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
    sql.query(
      `SELECT id::int AS id, title, category, kind, audience, description, link, sort, version, owner, to_char(updated_at, 'YYYY-MM-DD') AS updated
       FROM hub_library ORDER BY sort, id`,
    ),
  seedLibrary: async (list) => {
    const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM hub_library`);
    if (n > 0) {
      // documents added before owners existed: fill in the starter owner once, never overwrite one that was set
      const [{ blank }] = await sql.query(`SELECT count(*)::int AS blank FROM hub_library WHERE owner = ''`);
      if (blank > 0) for (const d of list) await sql.query(`UPDATE hub_library SET owner = $1, version = $2 WHERE title = $3 AND owner = ''`, [d.owner, d.version, d.title]);
      return;
    }
    let i = 0;
    for (const d of list) {
      await sql.query(
        `INSERT INTO hub_library (title, category, kind, audience, description, sort, owner, version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [d.title, d.category, d.kind, d.audience, d.description, ++i, d.owner, d.version],
      );
    }
  },
  saveLibrary: async (d) => {
    if (d.id) {
      await sql.query(
        `UPDATE hub_library SET title=$1, category=$2, kind=$3, audience=$4, description=$5, link=$6, version=$8, owner=$9, updated_at=now() WHERE id=$7`,
        [d.title, d.category, d.kind, d.audience, d.description, d.link, d.id, d.version, d.owner],
      );
      return d.id;
    }
    const [r] = await sql.query(
      `INSERT INTO hub_library (title, category, kind, audience, description, link, version, owner, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, (SELECT COALESCE(max(sort),0)+1 FROM hub_library)) RETURNING id::int AS id`,
      [d.title, d.category, d.kind, d.audience, d.description, d.link, d.version, d.owner],
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

  // payment schedule (money: only reached through Finance and management actions)
  listPayments: async (pid) =>
    sql.query(
      `SELECT id::int AS id, name, amount::float8 AS amount, to_char(due_date, 'YYYY-MM-DD') AS due_date,
              to_char(received_date, 'YYYY-MM-DD') AS received_date, status
       FROM hub_payments WHERE project_id = $1 ORDER BY sort, id`,
      [pid],
    ),
  getPayment: async (id) => (await sql.query(`SELECT id::int AS id, project_id::int AS project_id FROM hub_payments WHERE id = $1`, [id]))[0] ?? null,
  savePayment: async (pid, r) => {
    if (r.id) {
      await sql.query(
        `UPDATE hub_payments SET name=$1, amount=$2, due_date=$3, received_date=$4, status=$5 WHERE id=$6 AND project_id=$7`,
        [r.name, r.amount, r.due_date, r.received_date, r.status, r.id, pid],
      );
      return r.id;
    }
    const [x] = await sql.query(
      `INSERT INTO hub_payments (project_id, name, amount, due_date, received_date, status, sort)
       VALUES ($1,$2,$3,$4,$5,$6, (SELECT COALESCE(max(sort),0)+1 FROM hub_payments WHERE project_id = $1)) RETURNING id::int AS id`,
      [pid, r.name, r.amount, r.due_date, r.received_date, r.status],
    );
    return x.id;
  },
  deletePayment: async (id) => {
    await sql.query(`DELETE FROM hub_payments WHERE id = $1`, [id]);
  },

  // change log
  listChanges: async (pid) =>
    sql.query(
      `SELECT c.id::int AS id, to_char(c.on_date, 'YYYY-MM-DD') AS on_date, c.text, c.dates_effect, c.fee_effect, u.name AS author
       FROM hub_changes c LEFT JOIN hub_users u ON u.id = c.author_id WHERE c.project_id = $1 ORDER BY c.on_date DESC, c.id DESC`,
      [pid],
    ),
  addChange: async (pid, uid, c) =>
    (await sql.query(
      `INSERT INTO hub_changes (project_id, author_id, on_date, text, dates_effect, fee_effect) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::int AS id`,
      [pid, uid, c.on_date, c.text, c.dates_effect, c.fee_effect],
    ))[0].id,
  getChange: async (id) => (await sql.query(`SELECT id::int AS id, project_id::int AS project_id FROM hub_changes WHERE id = $1`, [id]))[0] ?? null,
  deleteChange: async (id) => {
    await sql.query(`DELETE FROM hub_changes WHERE id = $1`, [id]);
  },

  // workspace: files (links) with versions
  listFiles: async (pid) =>
    sql.query(
      `SELECT f.id::int AS id, f.name, f.folder, f.kind, f.status, f.editing_by::int AS editing_id, e.name AS editing_name,
              v.version, v.link, v.note, b.name AS by_name, to_char(v.at, 'YYYY-MM-DD') AS at
       FROM hub_files f
       LEFT JOIN hub_users e ON e.id = f.editing_by
       LEFT JOIN LATERAL (SELECT * FROM hub_file_versions x WHERE x.file_id = f.id ORDER BY x.version DESC LIMIT 1) v ON true
       LEFT JOIN hub_users b ON b.id = v.by_user
       WHERE f.project_id = $1 ORDER BY f.folder, f.name`,
      [pid],
    ),
  getFile: async (id) =>
    (await sql.query(
      `SELECT f.id::int AS id, f.project_id::int AS project_id, f.name, f.editing_by::int AS editing_id, e.name AS editing_name
       FROM hub_files f LEFT JOIN hub_users e ON e.id = f.editing_by WHERE f.id = $1`,
      [id],
    ))[0] ?? null,
  addFile: async (pid, uid, f) => {
    const [r] = await sql.query(
      `INSERT INTO hub_files (project_id, name, folder, kind) VALUES ($1,$2,$3,$4) RETURNING id::int AS id`,
      [pid, f.name, f.folder, f.kind],
    );
    await sql.query(`INSERT INTO hub_file_versions (file_id, version, link, note, by_user) VALUES ($1, 1, $2, $3, $4)`, [r.id, f.link, f.note, uid]);
    return r.id;
  },
  addFileVersion: async (fid, uid, link, note) => {
    const [r] = await sql.query(
      `INSERT INTO hub_file_versions (file_id, version, link, note, by_user)
       VALUES ($1, (SELECT COALESCE(max(version),0)+1 FROM hub_file_versions WHERE file_id = $1), $2, $3, $4) RETURNING version`,
      [fid, link, note, uid],
    );
    return r.version;
  },
  setFileEditing: async (fid, uid) => {
    await sql.query(`UPDATE hub_files SET editing_by = $1, editing_since = CASE WHEN $1::bigint IS NULL THEN NULL ELSE now() END WHERE id = $2`, [uid, fid]);
  },
  setFileStatus: async (fid, status) => {
    await sql.query(`UPDATE hub_files SET status = $1 WHERE id = $2`, [status, fid]);
  },

  // workspace: discussion
  listComments: async (pid) =>
    sql.query(
      `SELECT c.id::int AS id, c.author_id::int AS author_id, u.name AS author, c.text, c.created_at AS at
       FROM hub_comments c LEFT JOIN hub_users u ON u.id = c.author_id WHERE c.project_id = $1 ORDER BY c.created_at, c.id LIMIT 200`,
      [pid],
    ),
  addComment: async (pid, uid, text) =>
    (await sql.query(`INSERT INTO hub_comments (project_id, author_id, text) VALUES ($1,$2,$3) RETURNING id::int AS id`, [pid, uid, text]))[0].id,
  getComment: async (id) =>
    (await sql.query(`SELECT id::int AS id, project_id::int AS project_id, author_id::int AS author_id FROM hub_comments WHERE id = $1`, [id]))[0] ?? null,
  deleteComment: async (id) => {
    await sql.query(`DELETE FROM hub_comments WHERE id = $1`, [id]);
  },

  // workspace: tasks
  listTasks: async (pid) =>
    sql.query(
      `SELECT t.id::int AS id, t.text, t.assignee_id::int AS assignee_id, a.name AS assignee, to_char(t.due, 'YYYY-MM-DD') AS due,
              t.milestone, t.done, t.created_by::int AS created_by
       FROM hub_tasks t LEFT JOIN hub_users a ON a.id = t.assignee_id WHERE t.project_id = $1 ORDER BY t.done, t.due NULLS LAST, t.id`,
      [pid],
    ),
  listMyTasks: async (uid) =>
    sql.query(
      `SELECT t.id::int AS id, t.project_id::int AS project_id, p.ref, t.text, to_char(t.due, 'YYYY-MM-DD') AS due, t.milestone
       FROM hub_tasks t JOIN hub_projects p ON p.id = t.project_id
       WHERE t.assignee_id = $1 AND NOT t.done ORDER BY t.due NULLS LAST, t.id LIMIT 50`,
      [uid],
    ),
  getTask: async (id) =>
    (await sql.query(`SELECT id::int AS id, project_id::int AS project_id, text, created_by::int AS created_by FROM hub_tasks WHERE id = $1`, [id]))[0] ?? null,
  addTask: async (pid, uid, t) =>
    (await sql.query(
      `INSERT INTO hub_tasks (project_id, text, assignee_id, due, milestone, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::int AS id`,
      [pid, t.text, t.assignee_id, t.due, t.milestone, uid],
    ))[0].id,
  setTaskDone: async (id, done) => {
    await sql.query(`UPDATE hub_tasks SET done = $1 WHERE id = $2`, [done, id]);
  },
  deleteTask: async (id) => {
    await sql.query(`DELETE FROM hub_tasks WHERE id = $1`, [id]);
  },

  // weekly workstream reports and manually entered KPIs
  addReport: async (r) =>
    (await sql.query(
      `INSERT INTO hub_reports (week_ending, workstream, status, done, deliverables, challenges, next, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::int AS id`,
      [r.week_ending, r.workstream, r.status, r.done, r.deliverables, r.challenges, r.next, r.author_id],
    ))[0].id,
  listReports: async (week) =>
    sql.query(
      `SELECT r.id::int AS id, r.workstream, r.status, r.done, r.deliverables, r.challenges, r.next, u.name AS author,
              to_char(r.created_at, 'YYYY-MM-DD') AS submitted
       FROM hub_reports r LEFT JOIN hub_users u ON u.id = r.author_id
       WHERE r.week_ending = $1 ORDER BY r.created_at DESC, r.id DESC`,
      [week],
    ),
  listReportWeeks: async () =>
    (await sql.query(`SELECT DISTINCT to_char(week_ending, 'YYYY-MM-DD') AS w FROM hub_reports ORDER BY w DESC LIMIT 12`)).map((r) => r.w),
  listKpis: async () => sql.query(`SELECT key, value, progress, status, to_char(at, 'YYYY-MM-DD') AS at FROM hub_kpis`),
  setKpi: async (key, k) => {
    await sql.query(
      `INSERT INTO hub_kpis (key, value, progress, status, by_user, at) VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, progress = EXCLUDED.progress, status = EXCLUDED.status, by_user = EXCLUDED.by_user, at = now()`,
      [key, k.value, k.progress, k.status, k.by],
    );
  },

  // team: responsibilities matrix and the expertise directory
  listRaci: async () => sql.query(`SELECT id::int AS id, section, name, cells FROM hub_raci ORDER BY sort, id`),
  seedRaci: async (rows, firstSeed = []) => {
    const have = await sql.query(`SELECT name, cells FROM hub_raci ORDER BY sort, id`);
    if (have.length > 0) {
      // upgrade only a copy nobody has touched: exactly the old 17 rows, names and cells unchanged
      const same = have.length === firstSeed.length && have.every((h, i) => h.name === firstSeed[i].name && JSON.stringify(h.cells) === JSON.stringify(firstSeed[i].cells));
      if (!same) return;
      await sql.query(`DELETE FROM hub_raci`);
    }
    let i = 0;
    for (const r of rows) await sql.query(`INSERT INTO hub_raci (section, name, cells, sort) VALUES ($1, $2, $3::jsonb, $4)`, [r.section || "", r.name, JSON.stringify(r.cells), ++i]);
  },
  setRaci: async (id, cells, name) => {
    const rows = await sql.query(
      `UPDATE hub_raci SET cells = $1::jsonb, name = COALESCE($2, name) WHERE id = $3 RETURNING id`,
      [JSON.stringify(cells), name ?? null, id],
    );
    return rows.length > 0;
  },
  addRaci: async (name, cells) =>
    (await sql.query(
      `INSERT INTO hub_raci (name, cells, sort) VALUES ($1, $2::jsonb, (SELECT COALESCE(max(sort),0)+1 FROM hub_raci)) RETURNING id::int AS id`,
      [name, JSON.stringify(cells)],
    ))[0].id,
  deleteRaci: async (id) => {
    await sql.query(`DELETE FROM hub_raci WHERE id = $1`, [id]);
  },
  getProfile: async (uid) =>
    (await sql.query(`SELECT skills, can_lead, can_qa, max_projects, availability FROM hub_directory WHERE user_id = $1`, [uid]))[0] ?? null,
  setProfile: async (uid, p) => {
    await sql.query(
      `INSERT INTO hub_directory (user_id, skills, can_lead, can_qa, max_projects, availability, updated_at) VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (user_id) DO UPDATE SET skills = EXCLUDED.skills, can_lead = EXCLUDED.can_lead, can_qa = EXCLUDED.can_qa,
         max_projects = EXCLUDED.max_projects, availability = EXCLUDED.availability, updated_at = now()`,
      [uid, p.skills, p.can_lead, p.can_qa, p.max_projects, p.availability],
    );
  },
  listDirectory: async () =>
    sql.query(`SELECT user_id::int AS user_id, skills, can_lead, can_qa, max_projects, availability FROM hub_directory`),
  countDirectoryProfiles: async () =>
    (await sql.query(
      `SELECT count(*)::int AS n FROM hub_directory d JOIN hub_users u ON u.id = d.user_id WHERE u.active AND d.skills <> ''`,
    ))[0].n,
  // "active" = on a project whose close-out (milestone 14) is not done
  countActiveMemberships: async () =>
    sql.query(
      `SELECT m.user_id::int AS user_id, count(*)::int AS n FROM hub_members m
       WHERE NOT EXISTS (SELECT 1 FROM hub_milestones x WHERE x.project_id = m.project_id AND x.n = 14 AND x.status = 'done')
       GROUP BY m.user_id`,
    ),

  // one-off markers (for example: a library clean-up already done)
  getMeta: async (key) => (await sql.query(`SELECT value FROM hub_meta WHERE key = $1`, [key]))[0]?.value ?? null,
  setMeta: async (key, value) => {
    await sql.query(`INSERT INTO hub_meta (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, at = now()`, [key, value]);
  },
  deleteLibraryByTitles: async (titles) => (await sql.query(`DELETE FROM hub_library WHERE title = ANY($1::text[]) RETURNING id`, [titles])).length,

  // QA checklist: rounds, checks, issues
  latestQaRound: async (pid) =>
    (await sql.query(
      `SELECT r.id::int AS id, r.round, r.version, r.outcome, r.comments, rv.name AS reviewer, to_char(r.reviewer_signed_at, 'YYYY-MM-DD') AS reviewer_signed_at,
              ld.name AS lead, to_char(r.lead_signed_at, 'YYYY-MM-DD') AS lead_signed_at
       FROM hub_qa_rounds r LEFT JOIN hub_users rv ON rv.id = r.reviewer_id LEFT JOIN hub_users ld ON ld.id = r.lead_id
       WHERE r.project_id = $1 ORDER BY r.round DESC LIMIT 1`,
      [pid],
    ))[0] ?? null,
  newQaRound: async (pid, round, version) => {
    await sql.query(`INSERT INTO hub_qa_rounds (project_id, round, version) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [pid, round, version]);
    return (await sql.query(`SELECT id::int AS id, round, version, outcome, lead_signed_at FROM hub_qa_rounds WHERE project_id = $1 AND round = $2`, [pid, round]))[0];
  },
  setQaRound: async (id, patch) => {
    for (const [k, v] of Object.entries(patch)) {
      if (!["version", "outcome", "comments", "reviewer_id", "reviewer_signed_at", "lead_id", "lead_signed_at"].includes(k)) continue;
      await sql.query(`UPDATE hub_qa_rounds SET ${k} = $1 WHERE id = $2`, [v, id]);
    }
  },
  listQaChecks: async (rid) =>
    sql.query(`SELECT c.n, c.result, c.note, u.name AS by_name FROM hub_qa_checks c LEFT JOIN hub_users u ON u.id = c.by_user WHERE c.round_id = $1 ORDER BY c.n`, [rid]),
  setQaCheck: async (rid, n, result, note, uid) => {
    await sql.query(
      `INSERT INTO hub_qa_checks (round_id, n, result, note, by_user, at) VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (round_id, n) DO UPDATE SET result = EXCLUDED.result, note = EXCLUDED.note, by_user = EXCLUDED.by_user, at = now()`,
      [rid, n, result, note, uid],
    );
  },
  listQaIssues: async (rid) =>
    sql.query(
      `SELECT i.id::int AS id, i.text, i.check_n, i.severity, i.status, a.name AS by_name, f.name AS fixed_by, to_char(i.fixed_at, 'YYYY-MM-DD') AS fixed_at,
              c.name AS rechecked_by, to_char(i.rechecked_at, 'YYYY-MM-DD') AS rechecked_at
       FROM hub_qa_issues i LEFT JOIN hub_users a ON a.id = i.by_user LEFT JOIN hub_users f ON f.id = i.fixed_by LEFT JOIN hub_users c ON c.id = i.rechecked_by
       WHERE i.round_id = $1 ORDER BY i.id`,
      [rid],
    ),
  addQaIssue: async (rid, i) => {
    await sql.query(`INSERT INTO hub_qa_issues (round_id, text, check_n, severity, by_user) VALUES ($1,$2,$3,$4,$5)`, [rid, i.text, i.check_n, i.severity, i.by]);
  },
  setQaIssueStatus: async (id, status, uid) => {
    if (status === "fixed") await sql.query(`UPDATE hub_qa_issues SET status = 'fixed', fixed_by = $1, fixed_at = now() WHERE id = $2`, [uid, id]);
    else if (status === "rechecked") await sql.query(`UPDATE hub_qa_issues SET status = 'rechecked', rechecked_by = $1, rechecked_at = now() WHERE id = $2`, [uid, id]);
    else await sql.query(`UPDATE hub_qa_issues SET status = 'open', fixed_by = NULL, fixed_at = NULL, rechecked_by = NULL, rechecked_at = NULL WHERE id = $1`, [id]);
  },
  // first review round of every project that has an outcome (QA first-pass rate)
  listQaFirstRounds: async () => sql.query(`SELECT project_id::int AS project_id, outcome FROM hub_qa_rounds WHERE round = 1 AND outcome IS NOT NULL`),

  // log
  log: async (e) => {
    await sql.query(`INSERT INTO hub_access_log (user_id, event, detail) VALUES ($1,$2,$3::jsonb)`, [e.user_id, e.event, JSON.stringify(e.detail ?? {})]);
  },
  listLog: async (limit) =>
    sql.query(
      `SELECT l.id::int AS id, l.at, l.event, l.detail, u.name AS who, l.user_id::int AS user_id
       FROM hub_access_log l LEFT JOIN hub_users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT ${Math.min(Number(limit) || 100, 500)}`,
    ),
});
