import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// The one-time first-account step. Each test gets its own empty database.
const KEY = "k".repeat(40);
const base = { HUB_ENABLED: "1", SESSION_SECRET: "test-secret-test-secret-test-secret" };

const fresh = async () => {
  const db = new PGlite();
  const sql = { query: async (t, p) => (await db.query(t, p)).rows };
  await ensureSchema(sql);
  return makeStore(sql);
};
const setup = (store, body, env = { ...base, HUB_SETUP_KEY: KEY }, ip = "1.1.1.1") =>
  handleHub({ method: "POST", action: "setup", query: {}, body, ip, headers: { "x-requested-with": "gsc-hub" } }, store, env);
const good = { key: KEY, email: "Info@Example.org", name: "Owner" };

test("setup: no key on the server = looks like an unknown action; a short key is refused too", async () => {
  const store = await fresh();
  assert.equal((await setup(store, good, base)).status, 404);
  assert.equal((await setup(store, good, { ...base, HUB_SETUP_KEY: "short" })).status, 404);
  assert.equal((await store.listUsers()).length, 0);
});

test("setup: wrong or missing key is refused, counted, then blocked; nothing is created", async () => {
  const store = await fresh();
  for (const bad of [{ ...good, key: "nope" }, { email: good.email, name: good.name }, { ...good, key: { $ne: 1 } }]) {
    assert.equal((await setup(store, bad)).status, 403);
  }
  assert.equal((await setup(store, { ...good, key: "nope" })).status, 403);
  assert.equal((await setup(store, { ...good, key: "nope" })).status, 403);
  assert.equal((await setup(store, good)).status, 429); // blocked even with the right key after 5 wrong ones
  assert.equal((await store.listUsers()).length, 0);
});

test("setup: the right key on an empty hub makes one management account, once", async () => {
  const store = await fresh();
  const r = await setup(store, good);
  assert.equal(r.status, 200);
  assert.equal(r.body.user.role, "management");
  assert.equal(r.body.user.email, "info@example.org");
  assert.ok(r.body.tempPassword.length >= 12);
  assert.ok(!JSON.stringify(r.body).includes("scrypt"));
  const login = await handleHub({ method: "POST", action: "login", query: {}, body: { email: "info@example.org", password: r.body.tempPassword }, ip: "2.2.2.2", headers: { "x-requested-with": "gsc-hub" } }, store, base);
  assert.equal(login.status, 200);
  // a second try, even with the right key, is refused and creates nothing
  assert.equal((await setup(store, { ...good, email: "other@example.org" })).status, 403);
  assert.equal((await store.listUsers()).length, 1);
});

test("setup: refused when any account already exists", async () => {
  const store = await fresh();
  await store.createUser({ email: "a@example.org", name: "A", role: "member", unit: "", password_hash: hashPassword("x".repeat(12)) });
  assert.equal((await setup(store, good)).status, 403);
  assert.equal((await store.listUsers()).length, 1);
});

test("setup: bad email or name is rejected", async () => {
  const store = await fresh();
  assert.equal((await setup(store, { ...good, email: "bad" })).status, 400);
  assert.equal((await setup(store, { ...good, name: "" })).status, 400);
  assert.equal((await store.listUsers()).length, 0);
});

test("setup: needs the hub header like every other change", async () => {
  const store = await fresh();
  const r = await handleHub({ method: "POST", action: "setup", query: {}, body: good, ip: "1", headers: {} }, store, { ...base, HUB_SETUP_KEY: KEY });
  assert.equal(r.status, 403);
});
