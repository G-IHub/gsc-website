import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie, COOKIE } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Real rules, real store, real SQL (an in-process Postgres). Planted answers: every project has a fee of
// 987654.32 (or similar), so any response that leaks an amount to the wrong person is caught by a text search.

const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const PW = "correct horse battery";
const FEE = { P1: 987654.32, P2: 123456.78, P3: 555555.55 };

const db = new PGlite();
const sql = { query: async (text, params) => (await db.query(text, params)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
const mkUser = async (key, role, unit = "") => {
  const u = await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit, password_hash: hashPassword(PW) });
  ids[key] = u.id;
};
await mkUser("mgmt", "management");
await mkUser("fin", "finance");
await mkUser("dir", "director", "Lab");
await mkUser("lead", "lead");
await mkUser("memE", "member");
await mkUser("memX", "member");
await mkUser("coord", "coordinator");
await mkUser("gone", "member");
await store.updateUser(ids.gone, { active: false });

const proj = {};
const mkProject = async (key, unit) => {
  const p = await store.createProject({ ref: `GH-${key}`, title: `Project ${key}`, unit, target_date: "2026-12-01" });
  proj[key] = p.id;
  await store.setClient(p.id, { name: `Client of ${key}`, contact: `contact-${key}@client.example` });
  await store.setMoney(p.id, { fee: FEE[key], paid: 1000, currency: "NGN" });
};
await mkProject("P1", "Lab");
await mkProject("P2", "Other");
await mkProject("P3", "Other");
await store.addMember(proj.P1, ids.lead, "lead");
await store.addMember(proj.P1, ids.memE, "supporting");
await store.addMember(proj.P1, ids.coord, "coordinator");
await store.addMember(proj.P2, ids.memE, "supporting");
await store.addMember(proj.P3, ids.memX, "supporting");

const cookieFor = (key) => makeCookie(ids[key], SECRET).split(";")[0];
const call = (as, method, action, { query = {}, body, env = ENV, headers = {}, ip = "1.1.1.1" } = {}) =>
  handleHub(
    {
      method,
      action,
      query,
      body,
      ip,
      headers: { ...(as ? { cookie: typeof as === "string" && as.includes("=") ? as : cookieFor(as) } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}), ...headers },
    },
    store,
    env,
  );
const get = (as, action, query, env) => call(as, "GET", action, { query, env });
const post = (as, action, body, env) => call(as, "POST", action, { body, env });
const noAmounts = (r) => {
  const text = JSON.stringify(r.body);
  for (const f of Object.values(FEE)) assert.ok(!text.includes(String(f)), `an amount leaked: ${f}`);
  assert.ok(!/"fee"|"paid"|"balance"/.test(text), "a money field leaked");
};

test("switched off: every call answers 503", async () => {
  assert.equal((await call(null, "GET", "me", { env: {} })).status, 503);
  assert.equal((await call(null, "GET", "me", { env: { HUB_ENABLED: "1" } })).status, 503); // no secret
});

test("sign-in: right and wrong passwords, unknown email, inactive account, injection text", async () => {
  const ok = await post(null, "login", { email: "mgmt@example.org", password: PW });
  assert.equal(ok.status, 200);
  assert.match(ok.setCookie, new RegExp(`^${COOKIE}=.*HttpOnly; Secure; SameSite=Strict`));
  assert.equal((await post(null, "login", { email: "mgmt@example.org", password: "nope-nope-nope" }, ENV)).status, 401);
  assert.equal((await post(null, "login", { email: "nobody@example.org", password: PW })).status, 401);
  assert.equal((await post(null, "login", { email: "gone@example.org", password: PW })).status, 401);
  assert.equal((await post(null, "login", { email: "' OR 1=1 --", password: "x" })).status, 401);
  assert.equal((await post(null, "login", { email: "mgmt@example.org", password: { $ne: 1 } })).status, 401);
  const stored = (await store.getUserByEmail("mgmt@example.org")).password_hash;
  assert.ok(stored.startsWith("scrypt$") && !stored.includes(PW));
});

test("sign-in: too many wrong passwords is blocked, even for the right password afterwards", async () => {
  for (let i = 0; i < 5; i++) await call(null, "POST", "login", { body: { email: "fin@example.org", password: "wrong-wrong-1" }, ip: "9.9.9.9" });
  const blocked = await call(null, "POST", "login", { body: { email: "fin@example.org", password: PW }, ip: "9.9.9.9" });
  assert.equal(blocked.status, 429);
  // the same email from another address is blocked too (per-email limit)
  const other = await call(null, "POST", "login", { body: { email: "fin@example.org", password: PW }, ip: "8.8.8.8" });
  assert.equal(other.status, 429);
  await sql.query(`DELETE FROM hub_login_failures`);
});

test("nothing works without a valid cookie", async () => {
  const actions = ["me", "users", "projects", "project", "money", "access-log"];
  for (const a of actions) assert.equal((await get(null, a, { id: proj.P1 })).status, 401, a);
  const bad = [
    `${COOKIE}=garbage`,
    `${COOKIE}=${makeCookie(ids.mgmt, "another-secret").split(";")[0].slice(COOKIE.length + 1)}`, // signed with a different secret
    makeCookie(ids.mgmt, SECRET, Date.now() - 13 * 3600 * 1000).split(";")[0], // expired
    `gsc_admin=${makeCookie(ids.mgmt, SECRET).split(";")[0].slice(COOKIE.length + 1)}`, // the admin page's cookie name
  ];
  for (const c of bad) assert.equal((await get(c, "me")).status, 401, c.slice(0, 30));
  // tampered payload (swap the user id, keep the signature)
  const [name, rest] = makeCookie(ids.memE, SECRET).split(";")[0].split("=");
  const [payload, sig] = rest.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url")), uid: ids.mgmt })).toString("base64url");
  assert.equal((await get(`${name}=${forged}.${sig}`, "me")).status, 401);
});

test("a changed-state request needs the hub header", async () => {
  const r = await handleHub({ method: "POST", action: "project-create", query: {}, body: { ref: "X", title: "X" }, ip: "1", headers: { cookie: cookieFor("mgmt") } }, store, ENV);
  assert.equal(r.status, 403);
});

test("TEAM MEMBER: sees only their own projects, no client, no money, no admin actions", async () => {
  const list = await get("memE", "projects");
  assert.deepEqual(list.body.projects.map((p) => p.ref).sort(), ["GH-P1", "GH-P2"]);
  assert.ok(list.body.projects.every((p) => !("client" in p)));
  noAmounts(list);
  assert.ok(!JSON.stringify(list.body).includes("Client of"));
  assert.ok(!JSON.stringify(list.body).includes("client.example"));

  const one = await get("memE", "project", { id: proj.P1 });
  assert.equal(one.status, 200);
  noAmounts(one);
  assert.equal(one.body.canManageMembers, false);
  assert.equal(one.body.canSeeMoney, false);

  assert.equal((await get("memE", "project", { id: proj.P3 })).status, 404); // not theirs
  assert.equal((await get("memE", "money", { id: proj.P1 })).status, 403);
  assert.equal((await get("memE", "money", { id: proj.P3 })).status, 403);
  assert.equal((await post("memE", "money-set", { project_id: proj.P1, fee: 1, paid: 1 })).status, 403);
  assert.equal((await get("memE", "users")).status, 403);
  assert.equal((await get("memE", "access-log")).status, 403);
  assert.equal((await post("memE", "user-create", { email: "a@b.co", name: "A", role: "management" })).status, 403);
  assert.equal((await post("memE", "project-create", { ref: "Z", title: "Z" })).status, 403);
  assert.equal((await post("memE", "project-update", { id: proj.P1, health: "red" })).status, 403);
  assert.equal((await post("memE", "member-add", { project_id: proj.P1, user_id: ids.memX })).status, 403);
  assert.equal((await post("memE", "member-add", { project_id: proj.P3, user_id: ids.memE })).status, 404); // cannot even see P3
  assert.equal((await post("memE", "user-update", { id: ids.memE, role: "management" })).status, 403);
  assert.equal((await store.getUserById(ids.memE)).role, "member");
});

test("TEAM MEMBER on another project sees nothing of the first", async () => {
  const list = await get("memX", "projects");
  assert.deepEqual(list.body.projects.map((p) => p.ref), ["GH-P3"]);
  assert.equal((await get("memX", "project", { id: proj.P1 })).status, 404);
});

test("LEAD: sees client on their project, manages its people, never money", async () => {
  const list = await get("lead", "projects");
  assert.deepEqual(list.body.projects.map((p) => p.ref), ["GH-P1"]);
  assert.equal(list.body.projects[0].client.name, "Client of P1");
  noAmounts(list);
  const one = await get("lead", "project", { id: proj.P1 });
  assert.equal(one.body.canManageMembers, true);
  noAmounts(one);
  assert.equal((await get("lead", "money", { id: proj.P1 })).status, 403);

  assert.equal((await post("lead", "member-add", { project_id: proj.P1, user_id: ids.memX, project_role: "supporting" })).status, 200);
  assert.deepEqual((await get("memX", "projects")).body.projects.map((p) => p.ref), ["GH-P1", "GH-P3"]);
  assert.equal((await post("lead", "member-remove", { project_id: proj.P1, user_id: ids.memX })).status, 200);
  assert.deepEqual((await get("memX", "projects")).body.projects.map((p) => p.ref), ["GH-P3"]);
  assert.equal((await post("lead", "member-add", { project_id: proj.P2, user_id: ids.memX })).status, 404); // not their project

  assert.equal((await post("lead", "project-update", { id: proj.P1, health: "amber", stage: "Analysis" })).status, 200);
  assert.equal((await post("lead", "project-update", { id: proj.P1, payment_status: "paid" })).status, 403);
  assert.equal((await post("lead", "project-update", { id: proj.P2, health: "red" })).status, 404);
  assert.equal((await post("lead", "user-create", { email: "a@b.co", name: "A", role: "member" })).status, 403);
});

test("people picker: management and leads get names only; others are refused", async () => {
  for (const who of ["mgmt", "lead"]) {
    const r = await get(who, "people");
    assert.equal(r.status, 200, who);
    assert.ok(r.body.people.length >= 5);
    assert.ok(!/example\.org|scrypt|password/.test(JSON.stringify(r.body)), "email or hash leaked");
    assert.ok(!r.body.people.some((p) => p.name === "gone")); // inactive people are not offered
  }
  for (const who of ["memE", "fin", "dir", "coord"]) assert.equal((await get(who, "people")).status, 403, who);
});

test("COORDINATOR: sees only their project; cannot manage people or money", async () => {
  assert.deepEqual((await get("coord", "projects")).body.projects.map((p) => p.ref), ["GH-P1"]);
  assert.equal((await get("coord", "money", { id: proj.P1 })).status, 403);
  assert.equal((await post("coord", "member-add", { project_id: proj.P1, user_id: ids.memX })).status, 403);
});

test("FINANCE: all projects and all money, sets the payment flag, cannot manage people", async () => {
  assert.equal((await get("fin", "projects")).body.projects.length, 3);
  const m = await get("fin", "money", { id: proj.P1 });
  assert.equal(m.body.money.fee, FEE.P1);
  assert.equal((await post("fin", "money-set", { project_id: proj.P1, fee: 1000000, paid: 500000 })).status, 200);
  assert.equal((await get("fin", "money", { id: proj.P1 })).body.money.paid, 500000);
  assert.equal((await post("fin", "project-update", { id: proj.P1, payment_status: "balance_due" })).status, 200); // the flag only
  assert.equal((await post("fin", "project-update", { id: proj.P1, health: "red" })).status, 403); // not a project editor
  assert.equal((await post("fin", "project-update", { id: proj.P1, payment_status: "cleared", stage: "x" })).status, 403);
  assert.equal((await post("memE", "project-update", { id: proj.P1, payment_status: "paid" })).status, 403);
  assert.equal((await post("fin", "user-create", { email: "a@b.co", name: "A", role: "member" })).status, 403);
  assert.equal((await get("fin", "users")).status, 403);
  assert.equal((await post("fin", "money-set", { project_id: proj.P1, fee: -5, paid: 0 })).status, 400);
  await store.setMoney(proj.P1, { fee: FEE.P1, paid: 1000, currency: "NGN" });
});

test("DIRECTOR: own unit's projects only; money only if the switch is on, and then only for their unit", async () => {
  assert.deepEqual((await get("dir", "projects")).body.projects.map((p) => p.ref), ["GH-P1"]);
  assert.equal((await get("dir", "project", { id: proj.P2 })).status, 404);
  assert.equal((await get("dir", "money", { id: proj.P1 })).status, 403); // default: no money
  const on = { ...ENV, HUB_DIRECTORS_SEE_MONEY: "1" };
  assert.equal((await get("dir", "money", { id: proj.P1 }, on)).body.money.fee, FEE.P1);
  assert.equal((await get("dir", "money", { id: proj.P2 }, on)).status, 403); // another unit
  assert.equal((await post("dir", "money-set", { project_id: proj.P1, fee: 1, paid: 1 }, on)).status, 403); // reading only
});

test("MANAGEMENT: everything; the last management account cannot be removed", async () => {
  assert.equal((await get("mgmt", "projects")).body.projects.length, 3);
  assert.equal((await get("mgmt", "money", { id: proj.P3 })).body.money.fee, FEE.P3);
  const made = await post("mgmt", "user-create", { email: "New.Person@Example.org", name: "New Person", role: "member" });
  assert.equal(made.status, 200);
  assert.ok(made.body.tempPassword.length >= 12);
  assert.ok(!JSON.stringify(made.body.user).includes("scrypt"));
  assert.equal((await post("mgmt", "user-create", { email: "new.person@example.org", name: "Dup", role: "member" })).status, 409);
  assert.equal((await post("mgmt", "user-create", { email: "bad", name: "X", role: "member" })).status, 400);
  assert.equal((await post("mgmt", "user-create", { email: "q@q.co", name: "X", role: "king" })).status, 400);
  const login = await post(null, "login", { email: "new.person@example.org", password: made.body.tempPassword });
  assert.equal(login.status, 200);
  assert.ok(!JSON.stringify((await get("mgmt", "users")).body).includes("scrypt")); // hashes never leave the server

  assert.equal((await post("mgmt", "user-update", { id: ids.mgmt, role: "member" })).status, 400);
  assert.equal((await post("mgmt", "user-update", { id: ids.mgmt, active: false })).status, 400);
  assert.equal((await store.getUserById(ids.mgmt)).role, "management");
});

test("switching someone off ends their session at once; changing a role takes effect at once", async () => {
  const c = cookieFor("coord");
  assert.equal((await get(c, "me")).status, 200);
  assert.equal((await post("mgmt", "user-update", { id: ids.coord, role: "member" })).status, 200);
  assert.equal((await get(c, "me")).body.user.role, "member");
  assert.equal((await post("mgmt", "user-update", { id: ids.coord, active: false })).status, 200);
  assert.equal((await get(c, "me")).status, 401);
  assert.equal((await post(null, "login", { email: "coord@example.org", password: PW })).status, 401);
});

test("password change: needs the current password, enforces length", async () => {
  assert.equal((await post("memX", "change-password", { oldPassword: "wrong-wrong-1", newPassword: "a-new-long-password" })).status, 403);
  assert.equal((await post("memX", "change-password", { oldPassword: PW, newPassword: "short" })).status, 400);
  assert.equal((await post("memX", "change-password", { oldPassword: PW, newPassword: "a-new-long-password" })).status, 200);
  assert.equal((await post(null, "login", { email: "memx@example.org", password: PW })).status, 401);
  assert.equal((await post(null, "login", { email: "memx@example.org", password: "a-new-long-password" })).status, 200);
});

test("the access log records refusals, money reads and people changes, and only management can read it", async () => {
  const log = (await get("mgmt", "access-log")).body.log;
  const events = new Set(log.map((l) => l.event));
  for (const e of ["login", "login_failed", "denied", "money_read", "money_set", "member_added", "member_removed", "user_created", "user_updated"]) {
    assert.ok(events.has(e), `no "${e}" entry in the log`);
  }
  const money = log.find((l) => l.event === "money_read");
  assert.ok(money.who && money.detail.project);
  assert.ok(!JSON.stringify(log).includes("scrypt"));
  assert.equal((await get("fin", "access-log")).status, 403);
});
