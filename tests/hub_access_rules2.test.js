import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// People and access: closing a project ends team access; a lead reads their own project's log; room shown in the picker.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role] of [["mgmt", "management"], ["fin", "finance"], ["lead", "lead"], ["lead2", "lead"], ["memE", "member"], ["coord", "coordinator"]]) {
  ids[key] = (await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "One", unit: "", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Two", unit: "", target_date: null })).id;
for (const [pid, who, r] of [[P1, "lead", "lead"], [P1, "memE", "supporting"], [P1, "coord", "coordinator"], [P2, "lead2", "lead"], [P2, "memE", "supporting"]]) await store.addMember(pid, ids[who], r);

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { cookie: makeCookie(ids[as], SECRET).split(";")[0], ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });

test("a lead reads the access log of their own project only", async () => {
  await post("lead", "member-add", { project_id: P1, user_id: ids.lead2, project_role: "Quality reviewer" });
  const own = await get("lead", "access-log", { project: String(P1) });
  assert.equal(own.status, 200);
  assert.ok(own.body.log.every((l) => Number(l.detail.project) === P1));
  assert.ok(own.body.log.some((l) => l.event === "member_added"));
  assert.equal((await get("lead", "access-log", { project: String(P2) })).status, 403); // not their project
  assert.equal((await get("lead", "access-log")).status, 403); // the whole log stays management only
  assert.equal((await get("memE", "access-log", { project: String(P1) })).status, 403);
  assert.equal((await get("coord", "access-log", { project: String(P1) })).status, 403);
  await post("lead", "member-remove", { project_id: P1, user_id: ids.lead2 });
});

test("the people picker shows how much room each person has", async () => {
  await store.setProfile(ids.memE, { skills: "x", can_lead: false, can_qa: false, max_projects: 3, availability: "available" });
  const people = (await get("lead", "people")).body.people;
  assert.equal(people.find((p) => p.name === "memE").spare, 1); // max 3, on 2 open projects
  assert.equal(people.find((p) => p.name === "coord").spare, 1); // default max 2, on 1
  assert.ok(!/example\.org/.test(JSON.stringify(people)));
});

test("closing a project ends access for team members and coordinators; leads and management keep it", async () => {
  await store.seedMilestones(P1, [{ n: 14, name: "Close-out form completed", owner: "Coordinator", signoff: false }]);
  assert.equal((await get("memE", "project", { id: P1 })).status, 200);
  assert.equal((await post("lead", "milestone-update", { project_id: P1, n: 14, status: "done" })).status, 200);
  assert.equal((await get("memE", "project", { id: P1 })).status, 404);
  assert.equal((await get("coord", "project", { id: P1 })).status, 404);
  assert.equal((await get("memE", "files", { id: P1 })).status, 404);
  assert.deepEqual((await get("memE", "projects")).body.projects.map((p) => p.ref), ["GH-2"]); // still on the open one
  assert.equal((await get("lead", "project", { id: P1 })).status, 200);
  assert.equal((await get("mgmt", "project", { id: P1 })).status, 200);
  assert.equal((await get("fin", "project", { id: P1 })).status, 200);
  // reopening brings access back
  assert.equal((await post("lead", "milestone-update", { project_id: P1, n: 14, status: "in_progress" })).status, 200);
  assert.equal((await get("memE", "project", { id: P1 })).status, 200);
});
