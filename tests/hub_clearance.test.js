import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Financial clearance checklist and the "no work without clearance" guard. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role, unit] of [["mgmt", "management", ""], ["fin", "finance", ""], ["dir", "director", "Lab"], ["lead", "lead", ""], ["memE", "member", ""], ["coord", "coordinator", ""]]) {
  ids[key] = (await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit, password_hash: hashPassword("x".repeat(12)) })).id;
}
const pid = (await store.createProject({ ref: "GH-C1", title: "C1", unit: "Lab", target_date: null })).id;
await store.addMember(pid, ids.lead, "lead");
await store.addMember(pid, ids.memE, "supporting");
await store.addMember(pid, ids.coord, "coordinator");
const KEYS = ["budget", "min_fee", "sheet_fee", "funds", "feasibility"];

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { ...(as ? { cookie: makeCookie(ids[as], SECRET).split(";")[0] } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });
const status = async () => (await get("mgmt", "project", { id: pid })).body.project.payment_status;

test("clearance: only Finance and management read or tick it", async () => {
  const r = await get("fin", "clearance", { id: pid });
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 5);
  assert.equal(r.body.done, 0);
  assert.equal(r.body.allDone, false);
  for (const who of ["lead", "memE", "coord", "dir"]) {
    assert.equal((await get(who, "clearance", { id: pid })).status, 403, who);
    assert.equal((await post(who, "clearance-set", { project_id: pid, key: "budget", done: true })).status, 403, who);
  }
  assert.equal((await get(null, "clearance", { id: pid })).status, 401);
  assert.equal((await post("fin", "clearance-set", { project_id: pid, key: "made-up", done: true })).status, 400);
});

test("no work without clearance: the flag cannot move on until all five are ticked", async () => {
  assert.equal(await status(), "not_cleared");
  for (const target of ["cleared", "balance_due", "paid"]) {
    const r = await post("fin", "project-update", { id: pid, payment_status: target });
    assert.equal(r.status, 400, target);
    assert.match(r.body.error, /0 of 5/);
  }
  for (const k of KEYS.slice(0, 4)) assert.equal((await post("fin", "clearance-set", { project_id: pid, key: k, done: true })).status, 200);
  assert.equal((await post("mgmt", "project-update", { id: pid, payment_status: "cleared" })).status, 400); // 4 of 5: management cannot skip it either
  const last = await post("mgmt", "clearance-set", { project_id: pid, key: "feasibility", done: true });
  assert.equal(last.body.allDone, true);
  assert.equal(last.body.items.find((i) => i.key === "feasibility").by, "mgmt");
  assert.equal((await post("fin", "project-update", { id: pid, payment_status: "cleared" })).status, 200);
  assert.equal(await status(), "cleared");
  assert.equal((await post("fin", "project-update", { id: pid, payment_status: "not_cleared" })).status, 200); // going back is always allowed
  assert.equal((await post("fin", "project-update", { id: pid, payment_status: "balance_due" })).status, 200);
});

test("unticking a check puts the project back to not cleared, and it is logged", async () => {
  assert.equal(await status(), "balance_due");
  const r = await post("fin", "clearance-set", { project_id: pid, key: "funds", done: false });
  assert.equal(r.status, 200);
  assert.equal(r.body.done, 4);
  assert.equal(await status(), "not_cleared");
  const log = (await get("mgmt", "access-log")).body.log;
  assert.ok(log.some((l) => l.event === "clearance_reverted"));
  assert.ok(log.some((l) => l.event === "clearance_set"));
  // the team still sees only what its role allows
  assert.ok(!("payment_status" in (await get("memE", "project", { id: pid })).body.project));
  assert.equal((await get("lead", "project", { id: pid })).body.project.payment_status, "not_cleared");
});
