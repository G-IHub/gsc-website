import crypto from "node:crypto";

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
  payment_status: p.payment_status,
  target_date: p.target_date || null,
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
  const memberIds = new Set(await store.projectIdsForUser(user.id));
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

  // ---- projects ----
  if (action === "projects" && method === "GET") {
    const canClient = CLIENT_ROLES.includes(user.role);
    const rows = (await store.listProjects()).filter((p) => canSeeProject(user, p, memberIds));
    const list = [];
    for (const p of rows) list.push(shapeProject(p, user, canClient, canClient ? await store.getClient(p.id) : null));
    return out(200, { projects: list });
  }

  if (action === "project" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    const canClient = CLIENT_ROLES.includes(user.role);
    const members = await store.listMembers(p.id);
    return out(200, {
      project: shapeProject(p, user, canClient, canClient ? await store.getClient(p.id) : null),
      members: members.map((m) => ({ user_id: m.user_id, name: m.name, role: m.role, project_role: m.project_role })),
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
    if (!mayEdit) return deny("update project", { project: p.id });
    const patch = {};
    if (body.stage !== undefined) patch.stage = str(body.stage, 120);
    if (body.health !== undefined) {
      if (!HEALTH.includes(body.health)) return out(400, { error: "Bad health value" });
      patch.health = body.health;
    }
    if (body.target_date !== undefined) patch.target_date = isoDate(body.target_date);
    if (body.payment_status !== undefined) {
      // Only money roles set the payment flag
      if (!MONEY_ROLES.includes(user.role)) return deny("set payment status", { project: p.id });
      if (!PAYMENT_STATUSES.includes(body.payment_status)) return out(400, { error: "Bad payment status" });
      patch.payment_status = body.payment_status;
    }
    await store.updateProject(p.id, patch);
    await store.log({ user_id: user.id, event: "project_updated", detail: { project: p.id, patch } });
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
    await store.log({ user_id: user.id, event: action === "member-add" ? "member_added" : "member_removed", detail: { project: p.id, target: target.id } });
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
    const paid = Number(body.paid);
    if (!Number.isFinite(fee) || !Number.isFinite(paid) || fee < 0 || paid < 0) return out(400, { error: "Amounts must be zero or more" });
    await store.setMoney(p.id, { fee, paid, currency: str(body.currency, 6) || "NGN" });
    await store.log({ user_id: user.id, event: "money_set", detail: { project: p.id } });
    return out(200, { ok: true });
  }

  // ---- the log ----
  if (action === "access-log" && method === "GET") {
    const denied = await needMgmt("read access log");
    if (denied) return denied;
    return out(200, { log: await store.listLog(200) });
  }

  return out(404, { error: "Unknown action" });
}
