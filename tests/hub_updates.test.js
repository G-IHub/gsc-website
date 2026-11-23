import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Weekly updates. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role, unit] of [["mgmt", "management", ""], ["fin", "finance", ""], ["dir", "director", "Lab"], ["lead", "lead", ""], ["memE", "member", ""], ["memX", "member", ""]]) {
  ids[key] = (await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit, password_hash: hashPassword("x".repeat(12)) })).id;
}
const proj = {};
for (const [key, unit] of [["P1", "Lab"], ["P2", "Other"]]) {
  proj[key] = (await store.createProject({ ref: `GH-${key}`, title: key, unit, target_date: null })).id;
  await store.setMoney(proj[key], { fee: 987654.32, paid: 1, currency: "NGN" });
}
await store.addMember(proj.P1, ids.lead, "lead");
await store.addMember(proj.P1, ids.memE, "supporting");
await store.addMember(proj.P2, ids.memX, "supporting");

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { ...(as ? { cookie: makeCookie(ids[as], SECRET).split(";")[0] } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });

test("updates: who can read, who can add", async () => {
  assert.equal((await get("memE", "updates", { id: proj.P1 })).body.updates.length, 0);
  assert.equal((await get("memE", "updates", { id: proj.P1 })).body.canAdd, true);
  assert.equal((await get("memX", "updates", { id: proj.P1 })).status, 404); // not on P1
  assert.equal((await get(null, "updates", { id: proj.P1 })).status, 401);
  assert.equal((await get("dir", "updates", { id: proj.P1 })).body.canAdd, false); // sees own unit, does not write
  assert.equal((await get("fin", "updates", { id: proj.P1 })).body.canAdd, false);

  assert.equal((await post("memE", "update-add", { project_id: proj.P1, done: "Ran the analysis", next: "Draft figures", blockers: "none" })).status, 200);
  assert.equal((await post("lead", "update-add", { project_id: proj.P1, done: "Reviewed" })).status, 200);
  assert.equal((await post("mgmt", "update-add", { project_id: proj.P1, done: "Checked in" })).status, 200);
  assert.equal((await post("memX", "update-add", { project_id: proj.P1, done: "x" })).status, 404); // cannot see P1
  assert.equal((await post("dir", "update-add", { project_id: proj.P1, done: "x" })).status, 403);
  assert.equal((await post("fin", "update-add", { project_id: proj.P1, done: "x" })).status, 403);
  assert.equal((await post("memE", "update-add", { project_id: proj.P1, done: "   " })).status, 400);
  assert.equal((await post("memE", "update-add", { project_id: proj.P2, done: "x" })).status, 404);
  assert.equal((await post("memE", "update-add", { project_id: proj.P1, done: "x" }).then((r) => r.status)), 200);

  const list = (await get("lead", "updates", { id: proj.P1 })).body.updates;
  assert.equal(list.length, 4);
  assert.ok(list.some((u) => u.author === "memE" && u.done === "Ran the analysis" && u.blockers === "none"));
  assert.ok(!/987654|"fee"|"paid"/.test(JSON.stringify(list)));
  assert.ok(list.every((u) => /^\d{4}-\d{2}-\d{2}$/.test(u.date)));
});

test("updates: removal is by the author or management only", async () => {
  const list = (await get("lead", "updates", { id: proj.P1 })).body.updates;
  const mine = list.find((u) => u.author === "memE");
  const others = list.find((u) => u.author === "lead");
  assert.equal(mine.canDelete, false); // as seen by the lead, who did not write it
  assert.equal((await post("lead", "update-delete", { project_id: proj.P1, id: mine.id })).status, 403);
  assert.equal((await post("memE", "update-delete", { project_id: proj.P1, id: others.id })).status, 403);
  assert.equal((await post("memX", "update-delete", { project_id: proj.P1, id: mine.id })).status, 404);
  assert.equal((await post("memE", "update-delete", { project_id: proj.P2, id: mine.id })).status, 404); // wrong project
  assert.equal((await post("mgmt", "update-delete", { project_id: proj.P2, id: mine.id })).status, 404); // an update of P1 cannot be removed through P2
  assert.equal((await get("lead", "updates", { id: proj.P1 })).body.updates.length, 4); // nothing removed by that attempt
  assert.equal((await post("memE", "update-delete", { project_id: proj.P1, id: mine.id })).status, 200); // the author
  assert.equal((await post("mgmt", "update-delete", { project_id: proj.P1, id: others.id })).status, 200); // management
  assert.equal((await get("lead", "updates", { id: proj.P1 })).body.updates.length, 2);
});

test("projects carry the date of the newest update (for the Home reminder), and nothing else about them", async () => {
  const lst = (await get("lead", "projects")).body.projects;
  assert.match(lst[0].last_update, /^\d{4}-\d{2}-\d{2}$/);
  const one = (await get("mgmt", "projects")).body.projects.find((p) => p.ref === "GH-P2");
  assert.equal(one.last_update, null); // no update there yet
});
