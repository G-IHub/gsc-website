import crypto from "node:crypto";
import { handleWorkspace } from "./_hub_workspace.js";
import { handleReports } from "./_hub_reports.js";
import { handleTeam } from "./_hub_team.js";
import { handleQa, qaPassed } from "./_hub_qa.js";
import { handleClientStaff } from "./_client_core.js";
import { CLEARANCE_ITEMS, COMMITMENT_FEE, PAYMENT_ROW_STATUSES, RETIRED_LIBRARY, RETIRED_LIBRARY_QA, DEFAULT_LIBRARY, DEFAULT_MILESTONES, LIBRARY_AUDIENCES, LIBRARY_KINDS, MILESTONE_STATUSES } from "./_hub_defaults.js";

// Genomac Research Hub (staff only): sign-in, roles, project membership and the access rules.
// This file holds ALL the access decisions. It never talks to a database directly: it is given a `store`
// (see _hub_store.js for the real one, test_hub_access.js for an in-memory one), so the same rules are tested
// against the same code that runs in production.
//
// The rules, in one place:
//   - Money (fee, amount paid, balance) is in its own store methods (getMoney/setMoney). Only roles in
//     MONEY_ROLES can reach them, plus directors when HUB_DIRECTORS_SEE_MONEY=1. Project records carry only
//     a status flag (payment_status), never an amount.
//   - A person sees a project only if they are listed on it, except management and finance (all projects)
//     and directors (their unit's projects).
//   - Client name and contact are shown only to roles in CLIENT_ROLES, and only on projects they can see.
//   - Every refusal, money read and membership change is written to the access log.

export const ROLES = ["management", "finance", "director", "lead", "member", "coordinator"];
export const MONEY_ROLES = ["management", "finance"];
export const SEE_ALL_ROLES = ["management", "finance"];
export const CLIENT_ROLES = ["management", "finance", "director", "lead", "coordinator"]; // team members see the project code only
export const PAY_FLAG_ROLES = ["management", "finance", "director", "lead", "coordinator"]; // team members do not see the payment flag
// roles whose access to a project ends when the project is closed (its close-out milestone is done)
export const CLOSES_ACCESS = ["member", "coordinator"];
export const PAYMENT_STATUSES = ["not_cleared", "cleared", "balance_due", "paid"];
export const HEALTH = ["green", "amber", "red"];

const SESSION_HOURS = 12;
export const COOKIE = "gsc_hub";
const MAX_FAILURES_IP = 5; // wrong passwords per IP in 15 minutes
const MAX_FAILURES_EMAIL = 5; // per email
const MAX_FAILURES_ALL = 30; // everyone together

// ---- pure rules (no store) ----

export const canSeeMoney = (user, env = {}) =>
  Boolean(user) &&
  (MONEY_ROLES.includes(user.role) || (user.role === "director" && String(env.HUB_DIRECTORS_SEE_MONEY ?? "") === "1"));

export const canSeeProject = (user, project, memberIds) => {
  if (!user || !project) return false;
  if (SEE_ALL_ROLES.includes(user.role)) return true;
  if (memberIds.has(project.id)) return true;
  return user.role === "director" && Boolean(user.unit) && user.unit === project.unit;
};

const str = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);

// ---- passwords: scrypt with a random salt per person ----

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
};

// A fixed fake hash, so a wrong email costs the same time as a wrong password
const DUMMY = hashPassword("not-a-real-password");

export const verifyPassword = (password, stored) => {
  try {
    const [kind, salt, hash] = String(stored || DUMMY).split("$");
    if (kind !== "scrypt") return false;
    const want = Buffer.from(hash, "base64url");
    const got = crypto.scryptSync(String(password), Buffer.from(salt, "base64url"), want.length);
    return crypto.timingSafeEqual(got, want);
  } catch {
    return false;
  }
};

export const newTempPassword = () => crypto.randomBytes(12).toString("base64url");
export const passwordProblem = (p) =>
  typeof p !== "string" || p.length < 10 ? "Use at least 10 characters" : p.length > 200 ? "Too long" : null;

// ---- session cookie: signed and expiring; who the person is and what they may do is read fresh every request ----

const sign = (payload, secret) => crypto.createHmac("sha256", `hub:${secret}`).update(payload).digest("base64url");

export const makeCookie = (uid, secret, now = Date.now()) => {
  const payload = Buffer.from(JSON.stringify({ uid, exp: now + SESSION_HOURS * 3600 * 1000 })).toString("base64url");
  return `${COOKIE}=${payload}.${sign(payload, secret)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${SESSION_HOURS * 3600}`;
};
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;

export const readCookie = (cookieHeader = "", secret, now = Date.now()) => {
  const raw = String(cookieHeader)
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    return p.exp > now && Number.isInteger(p.uid) ? p.uid : null;
  } catch {
    return null;
  }
};

// ---- shaping what leaves the server ----

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, unit: u.unit || "", active: u.active });

const shapeProject = (p, user, canClient, client) => ({
  id: p.id,
  ref: p.ref,
  title: p.title,
  stage: p.stage,
  unit: p.unit || "",
  health: p.health,
  ...(PAY_FLAG_ROLES.includes(user.role) ? { payment_status: p.payment_status } : {}),
  target_date: p.target_date || null,
  last_update: p.last_update || null,
  lead: p.lead_name || null,
  ...(canClient ? { client: client || { name: "", contact: "" } } : {}),
});

const out = (status, body, setCookie) => ({ status, body, setCookie });

// ---- the handler: one function for every ?action= ----
// req = { method, action, query, body, headers, ip }   returns { status, body, setCookie? }

export async function handleHub(req, store, env = {}) {
  if (String(env.HUB_ENABLED ?? "") !== "1" || !env.SESSION_SECRET) return out(503, { error: "The hub is not switched on" });
  const secret = env.SESSION_SECRET;
  const { method, action } = req;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const ip = String(req.ip || "unknown");
  const header = (k) => String((req.headers || {})[k] ?? "");

  if (method !== "GET" && header("x-requested-with") !== "gsc-hub") return out(403, { error: "Forbidden" });

  // ---- sign in ----
  if (action === "login" && method === "POST") {
    const email = str(body.email, 200).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const f = await store.countFailures(ip, email);
    if (f.ip >= MAX_FAILURES_IP || f.email >= MAX_FAILURES_EMAIL || f.all >= MAX_FAILURES_ALL) {
      return out(429, { error: "Too many attempts. Try again in 15 minutes." });
    }
    const user = email ? await store.getUserByEmail(email) : null;
    const ok = verifyPassword(password, user?.password_hash) && Boolean(user) && user.active;
    if (!ok) {
      await store.addFailure(ip, email);
      await store.log({ user_id: user?.id ?? null, event: "login_failed", detail: { email, ip } });
      return out(401, { error: "Wrong email or password" });
    }
    await store.log({ user_id: user.id, event: "login", detail: {} });
    return out(200, { ok: true, user: publicUser(user) }, makeCookie(user.id, secret));
  }

  // ---- one-time first-account setup ----
  // Works only while the hub has NO accounts at all, and only when HUB_SETUP_KEY (24+ characters) is set on the server.
  // Remove the key after use. With no key set this answers exactly like an unknown action.
  if (action === "setup" && method === "POST") {
    const setupKey = String(env.HUB_SETUP_KEY ?? "");
    if (setupKey.length < 24) return out(404, { error: "Unknown action" });
    const f = await store.countFailures(ip, "setup");
    if (f.ip >= MAX_FAILURES_IP || f.email >= MAX_FAILURES_EMAIL) return out(429, { error: "Too many attempts. Try again in 15 minutes." });
    const given = crypto.createHash("sha256").update(String(body.key ?? "")).digest();
    const want = crypto.createHash("sha256").update(setupKey).digest();
    if (!crypto.timingSafeEqual(given, want)) {
      await store.addFailure(ip, "setup");
      await store.log({ user_id: null, event: "setup_refused", detail: { ip } });
      return out(403, { error: "Not allowed" });
    }
    const email = str(body.email, 200).toLowerCase();
    const name = str(body.name, 120);
    if (!isEmail(email) || !name) return out(400, { error: "A name and a valid email are needed" });
    if ((await store.listUsers()).length > 0) {
      await store.log({ user_id: null, event: "setup_refused", detail: { ip, why: "accounts exist" } });
      return out(403, { error: "Not allowed" });
    }
    const temp = newTempPassword();
    const created = await store.createUser({ email, name, role: "management", unit: "", password_hash: hashPassword(temp) });
    await store.log({ user_id: created.id, event: "setup_done", detail: { ip } });
    return out(200, { user: publicUser(created), tempPassword: temp }); // shown once
  }

  if (action === "logout" && method === "POST") return out(200, { ok: true }, clearCookie());

  // ---- everything below needs a valid session and a still-active account ----
  const uid = readCookie(req.headers?.cookie, secret);
  const user = uid ? await store.getUserById(uid) : null;
  if (!user || !user.active) return out(401, { error: "Not signed in" });

  const deny = async (what, extra = {}) => {
    await store.log({ user_id: user.id, event: "denied", detail: { what, ...extra } });
    return out(403, { error: "You do not have access to this" });
  };
  const needMgmt = async (what) => (user.role === "management" ? null : deny(what));
  let memberIds = new Set(await store.projectIdsForUser(user.id));
  if (CLOSES_ACCESS.includes(user.role) && memberIds.size > 0) {
    const closed = new Set(await store.closedProjectIds());
    memberIds = new Set([...memberIds].filter((id) => !closed.has(id)));
  }
  const clearanceOf = async (pid) => {
    const rows = await store.listClearance(pid);
    const items = CLEARANCE_ITEMS.map((c) => {
      const r = rows.find((x) => x.key === c.key);
      return { key: c.key, label: c.label, done: Boolean(r?.done), by: r?.done ? r.by_name || "" : "", at: r?.done ? r.at : null };
    });
    const done = items.filter((i) => i.done).length;
    return { items, done, total: items.length, allDone: done === items.length };
  };
  const projectOr404 = async (id) => {
    const p = Number.isInteger(Number(id)) ? await store.getProject(Number(id)) : null;
    // Someone who cannot see a project gets the same answer as for one that does not exist
    return p && canSeeProject(user, p, memberIds) ? p : null;
  };

  if (action === "me" && method === "GET") {
    return out(200, { ok: true, user: publicUser(user), canSeeMoney: canSeeMoney(user, env) });
  }

  if (action === "change-password" && method === "POST") {
    const bad = passwordProblem(body.newPassword);
    if (bad) return out(400, { error: bad });
    if (!verifyPassword(String(body.oldPassword ?? ""), user.password_hash)) return out(403, { error: "Current password is wrong" });
    await store.updateUser(user.id, { password_hash: hashPassword(body.newPassword) });
    await store.log({ user_id: user.id, event: "password_changed", detail: {} });
    return out(200, { ok: true });
  }

  // ---- people (management only) ----
  if (action === "users" && method === "GET") {
    if (user.role !== "management") return deny("list users");
    return out(200, { users: (await store.listUsers()).map(publicUser) });
  }

  if (action === "user-create" && method === "POST") {
    if (user.role !== "management") return deny("create user");
    const email = str(body.email, 200).toLowerCase();
    const role = String(body.role ?? "");
    if (!isEmail(email) || !ROLES.includes(role) || !str(body.name, 120)) return out(400, { error: "Name, a valid email and a role are needed" });
    if (await store.getUserByEmail(email)) return out(409, { error: "That email already has an account" });
    const temp = newTempPassword();
    const created = await store.createUser({ email, name: str(body.name, 120), role, unit: str(body.unit, 80), password_hash: hashPassword(temp) });
    await store.log({ user_id: user.id, event: "user_created", detail: { target: created.id, role } });
    return out(200, { user: publicUser(created), tempPassword: temp }); // shown once; give it to the person privately
  }

  if (action === "user-update" && method === "POST") {
    if (user.role !== "management") return deny("update user");
    const target = await store.getUserById(Number(body.id));
    if (!target) return out(404, { error: "Not found" });
    const patch = {};
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return out(400, { error: "Bad role" });
      patch.role = body.role;
    }
    if (body.unit !== undefined) patch.unit = str(body.unit, 80);
    if (body.active !== undefined) patch.active = Boolean(body.active);
    // Never lock the last management account out
    const losingMgmt = target.role === "management" && ((patch.role && patch.role !== "management") || patch.active === false);
    if (losingMgmt && (await store.listUsers()).filter((u) => u.role === "management" && u.active).length <= 1) {
      return out(400, { error: "At least one active management account must remain" });
    }
    await store.updateUser(target.id, patch);
    await store.log({ user_id: user.id, event: "user_updated", detail: { target: target.id, patch } });
    return out(200, { ok: true });
  }

  // Names only (no emails), so a lead can pick someone to add to their project
  if (action === "people" && method === "GET") {
    if (user.role !== "management" && user.role !== "lead") return deny("list people");
    const all = await store.listUsers();
    const profiles = await store.listDirectory();
    const counts = await store.countActiveMemberships();
    return out(200, {
      people: all.filter((u) => u.active).map((u) => {
        const max = profiles.find((p) => p.user_id === u.id)?.max_projects ?? 2;
        const active = counts.find((c) => c.user_id === u.id)?.n ?? 0;
        return { id: u.id, name: u.name, role: u.role, spare: max - active };
      }),
    });
  }

  // ---- projects ----
  if (action === "projects" && method === "GET") {
    const canClient = CLIENT_ROLES.includes(user.role);
    const rows = (await store.listProjects()).filter((p) => canSeeProject(user, p, memberIds));
    const myRoles = new Map((await store.projectRolesForUser(user.id)).map((r) => [r.id, r.project_role]));
    const list = [];
    for (const p of rows) list.push({ ...shapeProject(p, user, canClient, canClient ? await store.getClient(p.id) : null), my_role: myRoles.get(p.id) ?? null });
    return out(200, { projects: list });
  }

  if (action === "project" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    const canClient = CLIENT_ROLES.includes(user.role);
    const members = await store.listMembers(p.id);
    return out(200, {
      project: shapeProject(p, user, canClient, canClient ? await store.getClient(p.id) : null),
      members: members.map((m) => ({ user_id: m.user_id, name: m.name, role: m.role, project_role: m.project_role, added: m.added || null })),
      canSeeMoney: canSeeMoney(user, env),
      canManageMembers: user.role === "management" || (user.role === "lead" && memberIds.has(p.id)),
    });
  }

  if (action === "project-create" && method === "POST") {
    if (user.role !== "management") return deny("create project");
    const ref = str(body.ref, 20);
    const title = str(body.title, 200);
    if (!ref || !title) return out(400, { error: "A project code and a title are needed" });
    const p = await store.createProject({ ref, title, stage: str(body.stage, 120), unit: str(body.unit, 80), target_date: isoDate(body.target_date) });
    if (body.client && typeof body.client === "object") {
      await store.setClient(p.id, { name: str(body.client.name, 200), contact: str(body.client.contact, 300) });
    }
    await store.log({ user_id: user.id, event: "project_created", detail: { project: p.id } });
    return out(200, { project: shapeProject(p, user, true, await store.getClient(p.id)) });
  }

  if (action === "project-update" && method === "POST") {
    const p = await projectOr404(body.id);
    if (!p) return out(404, { error: "Not found" });
    const mayEdit = user.role === "management" || (user.role === "lead" && memberIds.has(p.id));
    const mayPay = MONEY_ROLES.includes(user.role); // finance may set the payment flag only
    const editsDetails = ["stage", "health", "target_date"].some((k) => body[k] !== undefined);
    if (editsDetails && !mayEdit) return deny("update project", { project: p.id });
    if (!editsDetails && !mayPay && !mayEdit) return deny("update project", { project: p.id });
    const patch = {};
    if (body.stage !== undefined) patch.stage = str(body.stage, 120);
    if (body.health !== undefined) {
      if (!HEALTH.includes(body.health)) return out(400, { error: "Bad health value" });
      patch.health = body.health;
    }
    if (body.target_date !== undefined) patch.target_date = isoDate(body.target_date);
    if (body.payment_status !== undefined) {
      // Only money roles set the payment flag
      if (!mayPay) return deny("set payment status", { project: p.id });
      if (!PAYMENT_STATUSES.includes(body.payment_status)) return out(400, { error: "Bad payment status" });
      // No work without financial clearance: the flag cannot move on until every check is ticked
      if (body.payment_status !== "not_cleared") {
        const c = await clearanceOf(p.id);
        if (!c.allDone) return out(400, { error: `Financial clearance is not complete (${c.done} of ${c.total} checks)` });
      }
      patch.payment_status = body.payment_status;
    }
    await store.updateProject(p.id, patch);
    await store.log({ user_id: user.id, event: "project_updated", detail: { project: p.id, patch } });
    return out(200, { ok: true });
  }

  // ---- milestones: anyone who can see the project can read them ----
  if (action === "milestones" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    let rows = await store.listMilestones(p.id);
    if (rows.length === 0) {
      await store.seedMilestones(p.id, DEFAULT_MILESTONES);
      rows = await store.listMilestones(p.id);
    }
    const mayEdit = user.role === "management" || (user.role === "lead" && memberIds.has(p.id));
    return out(200, {
      milestones: rows.map((m) => ({ ...m, canEdit: mayEdit || (user.role === "finance" && m.owner === "Finance") })),
    });
  }

  if (action === "milestone-update" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    const n = Number(body.n);
    const row = Number.isInteger(n) ? (await store.listMilestones(p.id)).find((m) => m.n === n) : null;
    if (!row) return out(404, { error: "Not found" });
    const mayEdit = user.role === "management" || (user.role === "lead" && memberIds.has(p.id));
    if (!(mayEdit || (user.role === "finance" && row.owner === "Finance"))) return deny("update milestone", { project: p.id, n });
    const patch = {};
    if (body.status !== undefined) {
      if (!MILESTONE_STATUSES.includes(body.status)) return out(400, { error: "Bad status" });
      if (n === 9 && body.status === "done" && !(await qaPassed(store, p.id))) {
        return out(400, { error: "The QA checklist must be passed by the quality reviewer and signed off by the lead first" });
      }
      patch.status = body.status;
      if (body.status === "done" && body.done === undefined && !row.done) patch.done = new Date().toISOString().slice(0, 10);
      if (body.status !== "done" && body.done === undefined) patch.done = null;
    }
    if (body.planned !== undefined) patch.planned = isoDate(body.planned);
    if (body.done !== undefined) patch.done = isoDate(body.done);
    if (body.signed !== undefined) {
      if (!row.signoff) return out(400, { error: "This step has no client sign-off" });
      patch.signed = Boolean(body.signed);
    }
    await store.updateMilestone(p.id, n, patch);
    await store.log({ user_id: user.id, event: "milestone_updated", detail: { project: p.id, n, patch } });
    return out(200, { ok: true });
  }

  // ---- document library ----
  if (action === "library" && method === "GET") {
    await store.seedLibrary(DEFAULT_LIBRARY);
    // the 2026-11-24 clean-up, done once (a document added again later with the same title stays)
    for (const [key, titles] of [["library_retired_2026_11_24", RETIRED_LIBRARY], ["library_retired_2026_11_24_qa", RETIRED_LIBRARY_QA]]) {
      if ((await store.getMeta(key)) !== null) continue;
      const n = await store.deleteLibraryByTitles(titles);
      await store.setMeta(key, String(n));
      if (n > 0) await store.log({ user_id: user.id, event: "library_deleted", detail: { retired: titles, count: n } });
    }
    const mayMoney = MONEY_ROLES.includes(user.role);
    const rows = (await store.listLibrary()).filter(
      (d) => d.audience === "all" || (d.audience === "money" && mayMoney) || user.role === "management",
    );
    return out(200, { documents: rows, canEdit: user.role === "management" });
  }

  if (action === "library-save" && method === "POST") {
    if (user.role !== "management") return deny("save library document");
    const title = str(body.title, 200);
    const link = str(body.link, 1000);
    if (!title) return out(400, { error: "A title is needed" });
    if (link && !/^https:\/\/\S+$/i.test(link)) return out(400, { error: "The link must start with https://" });
    const kind = LIBRARY_KINDS.includes(body.kind) ? body.kind : "Other";
    const audience = LIBRARY_AUDIENCES.includes(body.audience) ? body.audience : "all";
    const id = body.id === undefined || body.id === null ? undefined : Number(body.id);
    if (id !== undefined && !Number.isInteger(id)) return out(400, { error: "Bad request" });
    const saved = await store.saveLibrary({ id, title, category: str(body.category, 80), kind, audience, description: str(body.description, 500), link, version: str(body.version, 20) || "0.1", owner: str(body.owner, 80) });
    await store.log({ user_id: user.id, event: "library_saved", detail: { id: saved } });
    return out(200, { ok: true, id: saved });
  }

  if (action === "library-delete" && method === "POST") {
    if (user.role !== "management") return deny("delete library document");
    const id = Number(body.id);
    if (!Number.isInteger(id)) return out(400, { error: "Bad request" });
    await store.deleteLibrary(id);
    await store.log({ user_id: user.id, event: "library_deleted", detail: { id } });
    return out(200, { ok: true });
  }

  // ---- weekly updates: members of the project write them, everyone who can see the project reads them ----
  if (action === "updates" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    const rows = await store.listUpdates(p.id);
    const mayAdd = user.role === "management" || memberIds.has(p.id);
    return out(200, {
      updates: rows.map((u) => ({ id: u.id, date: u.date, author: u.author || "Former team member", done: u.done, next: u.next, blockers: u.blockers, share_client: Boolean(u.share_client), canDelete: user.role === "management" || u.author_id === user.id })),
      canAdd: mayAdd,
    });
  }

  if (action === "update-add" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    if (!(user.role === "management" || memberIds.has(p.id))) return deny("add weekly update", { project: p.id });
    const done = str(body.done, 2000);
    const next = str(body.next, 2000);
    const blockers = str(body.blockers, 1000);
    if (!done) return out(400, { error: "Say what was done this week" });
    const id = await store.addUpdate(p.id, user.id, { done, next, blockers });
    if (body.share_client) await store.setUpdateShare(id, true); // the client sees it in their portal (never the Blockers line)
    await store.log({ user_id: user.id, event: "update_added", detail: { project: p.id } });
    return out(200, { ok: true, id });
  }

  if (action === "update-delete" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    const u = Number.isInteger(Number(body.id)) ? await store.getUpdate(Number(body.id)) : null;
    if (!u || u.project_id !== p.id) return out(404, { error: "Not found" });
    if (!(user.role === "management" || u.author_id === user.id)) return deny("delete weekly update", { project: p.id });
    await store.deleteUpdate(u.id);
    await store.log({ user_id: user.id, event: "update_deleted", detail: { project: p.id } });
    return out(200, { ok: true });
  }

  // ---- financial clearance checklist: Finance and management only ----
  if (action === "clearance" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    if (!MONEY_ROLES.includes(user.role)) return deny("read clearance", { project: p.id });
    const state = await clearanceOf(p.id);
    return out(200, state);
  }

  if (action === "clearance-set" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    if (!MONEY_ROLES.includes(user.role)) return deny("set clearance", { project: p.id });
    if (!CLEARANCE_ITEMS.some((c) => c.key === body.key)) return out(400, { error: "Unknown check" });
    const done = Boolean(body.done);
    await store.setClearance(p.id, body.key, done, user.id);
    await store.log({ user_id: user.id, event: "clearance_set", detail: { project: p.id, key: body.key, done } });
    // Unticking a check after clearance puts the project back to "not cleared"
    if (!done && p.payment_status !== "not_cleared") {
      await store.updateProject(p.id, { payment_status: "not_cleared" });
      await store.log({ user_id: user.id, event: "clearance_reverted", detail: { project: p.id, key: body.key } });
    }
    return out(200, await clearanceOf(p.id));
  }

  // ---- payment schedule: Finance and management only; "paid" is worked out from the received rows ----
  const syncPaid = async (pid) => {
    const rows = await store.listPayments(pid);
    const m = (await store.getMoney(pid)) || { fee: 0, paid: 0, currency: "NGN" };
    const paid = rows.filter((r) => r.status === "received").reduce((s, r) => s + r.amount, 0);
    await store.setMoney(pid, { fee: m.fee, paid, currency: m.currency || "NGN" });
  };

  if (action === "payments" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    if (!MONEY_ROLES.includes(user.role)) return deny("read payments", { project: p.id });
    await store.log({ user_id: user.id, event: "money_read", detail: { project: p.id, what: "payments" } });
    return out(200, { payments: await store.listPayments(p.id) });
  }

  if ((action === "payment-save" || action === "payment-delete" || action === "payment-standard") && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    if (!MONEY_ROLES.includes(user.role)) return deny(action, { project: p.id });
    if (action === "payment-standard") {
      if ((await store.listPayments(p.id)).length > 0) return out(409, { error: "This project already has a payment schedule" });
      const fee = (await store.getMoney(p.id))?.fee ?? 0;
      await store.savePayment(p.id, { name: "Commitment fee (refundable)", amount: COMMITMENT_FEE, due_date: null, received_date: null, status: "planned" });
      await store.savePayment(p.id, { name: "Middle payment", amount: 0, due_date: null, received_date: null, status: "not_used" });
      await store.savePayment(p.id, { name: "Balance", amount: Math.max(fee - COMMITMENT_FEE, 0), due_date: null, received_date: null, status: "planned" });
    } else {
      const id = body.id === undefined || body.id === null ? undefined : Number(body.id);
      if (id !== undefined) {
        const row = Number.isInteger(id) ? await store.getPayment(id) : null;
        if (!row || row.project_id !== p.id) return out(404, { error: "Not found" });
      }
      if (action === "payment-delete") {
        if (id === undefined) return out(400, { error: "Bad request" });
        await store.deletePayment(id);
      } else {
        const name = str(body.name, 120);
        const amount = Number(body.amount);
        if (!name) return out(400, { error: "Name the payment" });
        if (!Number.isFinite(amount) || amount < 0) return out(400, { error: "The amount must be zero or more" });
        if (!PAYMENT_ROW_STATUSES.includes(body.status)) return out(400, { error: "Bad status" });
        let received = isoDate(body.received_date);
        if (body.status === "received" && !received) received = new Date().toISOString().slice(0, 10);
        if (body.status !== "received") received = null;
        await store.savePayment(p.id, { id, name, amount: Math.round(amount * 100) / 100, due_date: isoDate(body.due_date), received_date: received, status: body.status });
      }
    }
    await syncPaid(p.id);
    await store.log({ user_id: user.id, event: "money_set", detail: { project: p.id, what: action } });
    return out(200, { payments: await store.listPayments(p.id) });
  }

  // ---- change log: everyone on the project reads; the fee effect is shown to Finance and management only ----
  const mayLogChange = (p) => user.role === "management" || user.role === "finance" || (user.role === "lead" && memberIds.has(p.id));

  if (action === "changes" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    const money = MONEY_ROLES.includes(user.role);
    const rows = await store.listChanges(p.id);
    return out(200, {
      changes: rows.map((c) => ({ id: c.id, on_date: c.on_date, text: c.text, dates_effect: c.dates_effect, author: c.author || "", ...(money ? { fee_effect: c.fee_effect } : {}) })),
      canAdd: mayLogChange(p),
      canDelete: user.role === "management",
      canFee: money,
    });
  }

  if (action === "change-add" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    if (!mayLogChange(p)) return deny("add change", { project: p.id });
    const text = str(body.text, 1000);
    if (!text) return out(400, { error: "Describe the change" });
    const id = await store.addChange(p.id, user.id, {
      on_date: isoDate(body.on_date) || new Date().toISOString().slice(0, 10),
      text,
      dates_effect: str(body.dates_effect, 300),
      fee_effect: MONEY_ROLES.includes(user.role) ? str(body.fee_effect, 300) : "", // only Finance and management record money here
    });
    await store.log({ user_id: user.id, event: "change_added", detail: { project: p.id } });
    return out(200, { ok: true, id });
  }

  if (action === "change-delete" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    if (user.role !== "management") return deny("delete change", { project: p.id });
    const c = Number.isInteger(Number(body.id)) ? await store.getChange(Number(body.id)) : null;
    if (!c || c.project_id !== p.id) return out(404, { error: "Not found" });
    await store.deleteChange(c.id);
    await store.log({ user_id: user.id, event: "change_deleted", detail: { project: p.id } });
    return out(200, { ok: true });
  }

  // ---- who is on a project ----
  if ((action === "member-add" || action === "member-remove") && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    const may = user.role === "management" || (user.role === "lead" && memberIds.has(p.id));
    if (!may) return deny(action, { project: p.id });
    const target = await store.getUserById(Number(body.user_id));
    if (!target || !target.active) return out(404, { error: "No such person" });
    if (action === "member-add") {
      await store.addMember(p.id, target.id, str(body.project_role, 60) || target.role);
    } else {
      await store.removeMember(p.id, target.id);
    }
    await store.log({ user_id: user.id, event: action === "member-add" ? "member_added" : "member_removed", detail: { project: p.id, target: target.id, name: target.name } });
    return out(200, { ok: true });
  }

  // ---- money: the only place amounts are reachable ----
  if (action === "money" && method === "GET") {
    const id = Number(req.query?.id);
    const p = Number.isInteger(id) ? await store.getProject(id) : null;
    if (!canSeeMoney(user, env)) return deny("read money", { project: Number.isInteger(id) ? id : null });
    if (!p) return out(404, { error: "Not found" });
    if (!canSeeProject(user, p, memberIds)) return deny("read money", { project: p.id });
    await store.log({ user_id: user.id, event: "money_read", detail: { project: p.id } });
    return out(200, { money: (await store.getMoney(p.id)) || { fee: 0, paid: 0, currency: "NGN" } });
  }

  if (action === "money-set" && method === "POST") {
    const id = Number(body.project_id);
    if (!MONEY_ROLES.includes(user.role)) return deny("set money", { project: Number.isInteger(id) ? id : null });
    const p = Number.isInteger(id) ? await store.getProject(id) : null;
    if (!p) return out(404, { error: "Not found" });
    const fee = Number(body.fee);
    const old = await store.getMoney(p.id);
    const paid = body.paid === undefined ? (old?.paid ?? 0) : Number(body.paid); // left out = keep (the payment schedule keeps it up to date)
    if (!Number.isFinite(fee) || !Number.isFinite(paid) || fee < 0 || paid < 0) return out(400, { error: "Amounts must be zero or more" });
    await store.setMoney(p.id, { fee, paid, currency: str(body.currency, 6) || "NGN" });
    await store.log({ user_id: user.id, event: "money_set", detail: { project: p.id } });
    return out(200, { ok: true });
  }

  // ---- the log ----
  if (action === "access-log" && method === "GET") {
    const leadOwn = user.role === "lead" && req.query?.project && memberIds.has(Number(req.query.project));
    const denied = leadOwn ? null : await needMgmt("read access log");
    if (denied) return denied;
    const rows = await store.listLog(req.query?.project ? 500 : 200);
    const pid = Number(req.query?.project);
    return out(200, { log: req.query?.project ? rows.filter((l) => Number(l.detail?.project) === pid).slice(0, 100) : rows });
  }

  const cl = await handleClientStaff({ action, method, body, query: req.query, user, store, memberIds, projectOr404, deny, out, str, req });
  if (cl) return cl;
  const qa = await handleQa({ action, method, body, query: req.query, user, store, memberIds, projectOr404, deny, out, str });
  if (qa) return qa;
  const rp = await handleReports({ action, method, body, query: req.query, user, store, out, deny, str, isoDate, canSeeProject, memberIds, env });
  if (rp) return rp;
  const tm = await handleTeam({ action, method, body, user, store, out, deny, str });
  if (tm) return tm;

  const w = await handleWorkspace({ action, method, body, query: req.query, user, store, memberIds, projectOr404, deny, out, str, isoDate });
  if (w) return w;

  return out(404, { error: "Unknown action" });
}
