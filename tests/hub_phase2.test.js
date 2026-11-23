import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Phase 2: the 14 milestones per project and the document library. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role, unit] of [["mgmt", "management", ""], ["fin", "finance", ""], ["dir", "director", "Lab"], ["lead", "lead", ""], ["memE", "member", ""], ["memX", "member", ""], ["coord", "coordinator", ""]]) {
  ids[key] = (await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit, password_hash: hashPassword("x".repeat(12)) })).id;
}
const proj = {};
for (const [key, unit] of [["P1", "Lab"], ["P2", "Other"], ["P3", "Other"]]) {
  proj[key] = (await store.createProject({ ref: `GH-${key}`, title: key, unit, target_date: null })).id;
  await store.setMoney(proj[key], { fee: 987654.32, paid: 1, currency: "NGN" });
}
await store.addMember(proj.P1, ids.lead, "lead");
await store.addMember(proj.P1, ids.memE, "supporting");
await store.addMember(proj.P1, ids.coord, "coordinator");
await store.addMember(proj.P3, ids.memX, "supporting");

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { ...(as ? { cookie: makeCookie(ids[as], SECRET).split(";")[0] } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });

test("milestones: the 14 standard steps appear once and carry no money", async () => {
  const r = await get("memE", "milestones", { id: proj.P1 });
  assert.equal(r.status, 200);
  assert.equal(r.body.milestones.length, 14);
  assert.deepEqual(r.body.milestones.map((m) => m.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.ok(r.body.milestones.every((m) => m.canEdit === false && m.planned === null && m.done === null));
  assert.ok(!/987654|"fee"|"paid"/.test(JSON.stringify(r.body)));
  assert.equal((await get("memE", "milestones", { id: proj.P1 })).body.milestones.length, 14); // not duplicated
  assert.equal((await get("memE", "milestones", { id: proj.P3 })).status, 404); // not their project
  assert.equal((await get("memX", "milestones", { id: proj.P1 })).status, 404);
  assert.equal((await get("dir", "milestones", { id: proj.P1 })).status, 200); // director sees own unit
  assert.equal((await get("dir", "milestones", { id: proj.P2 })).status, 404);
  assert.equal((await get(null, "milestones", { id: proj.P1 })).status, 401);
});

test("milestones: who can change them", async () => {
  const u = (as, b, pid = proj.P1) => post(as, "milestone-update", { project_id: pid, ...b });
  assert.equal((await u("memE", { n: 1, status: "done" })).status, 403);
  assert.equal((await u("coord", { n: 1, status: "done" })).status, 403);
  assert.equal((await u("dir", { n: 3, status: "done" })).status, 403);
  assert.equal((await u("lead", { n: 1, status: "done" })).status, 200);
  const first = (await get("lead", "milestones", { id: proj.P1 })).body.milestones[0];
  assert.equal(first.status, "done");
  assert.match(first.done, /^\d{4}-\d{2}-\d{2}$/); // date filled in when marked done
  assert.equal((await u("lead", { n: 1, status: "in_progress" })).status, 200);
  assert.equal((await get("lead", "milestones", { id: proj.P1 })).body.milestones[0].done, null);
  assert.equal((await u("lead", { n: 1, status: "bogus" })).status, 400);
  assert.equal((await u("lead", { n: 99, status: "done" })).status, 404);
  assert.equal((await u("lead", { n: 1, status: "done" }, proj.P2)).status, 404); // not their project
  assert.equal((await u("lead", { n: 1, signed: true })).status, 400); // step 1 has no client sign-off
  assert.equal((await u("lead", { n: 2, signed: true, planned: "2026-12-01" })).status, 200);
  const two = (await get("lead", "milestones", { id: proj.P1 })).body.milestones[1];
  assert.equal(two.signed, true);
  assert.equal(two.planned, "2026-12-01");
  // finance: only the two steps it owns
  assert.equal((await u("fin", { n: 3, status: "done" })).status, 200);
  assert.equal((await u("fin", { n: 11, status: "in_progress" })).status, 200);
  assert.equal((await u("fin", { n: 4, status: "done" })).status, 403);
  assert.equal((await u("mgmt", { n: 4, status: "done" })).status, 200);
  assert.ok((await get("lead", "milestones", { id: proj.P1 })).body.milestones.every((m) => m.canEdit));
  assert.deepEqual((await get("fin", "milestones", { id: proj.P1 })).body.milestones.filter((m) => m.canEdit).map((m) => m.n), [3, 11]);
  // a lead on P1 cannot touch P3, even though they can see no part of it
  assert.equal((await u("lead", { n: 1, status: "done" }, proj.P3)).status, 404);
});

test("library: everyone reads by audience; only management changes; links must be https", async () => {
  const mem = await get("memE", "library");
  assert.equal(mem.status, 200);
  assert.ok(mem.body.documents.length >= 10);
  assert.ok(!mem.body.documents.some((d) => /Budget Template|Decision Sheet/.test(d.title)), "a restricted document was shown to a team member");
  assert.equal(mem.body.canEdit, false);
  assert.ok((await get("fin", "library")).body.documents.some((d) => /Budget Template/.test(d.title)));
  assert.ok(!(await get("fin", "library")).body.documents.some((d) => /Decision Sheet/.test(d.title)));
  const mg = await get("mgmt", "library");
  assert.ok(mg.body.documents.some((d) => /Decision Sheet/.test(d.title)));
  assert.equal(mg.body.canEdit, true);
  assert.equal((await get(null, "library")).status, 401);

  assert.equal((await post("memE", "library-save", { title: "X" })).status, 403);
  assert.equal((await post("lead", "library-save", { title: "X" })).status, 403);
  assert.equal((await post("fin", "library-save", { title: "X" })).status, 403);
  assert.equal((await post("memE", "library-delete", { id: mem.body.documents[0].id })).status, 403);
  assert.equal((await post("mgmt", "library-save", { title: "Bad", link: "javascript:alert(1)" })).status, 400);
  assert.equal((await post("mgmt", "library-save", { title: "Bad", link: "http://plain.example.org/x" })).status, 400);
  assert.equal((await post("mgmt", "library-save", { title: "Bad", link: "https://a b" })).status, 400);
  assert.equal((await post("mgmt", "library-save", { title: "" })).status, 400);
  const target = mem.body.documents[0];
  assert.equal((await post("mgmt", "library-save", { id: target.id, title: target.title, kind: "Word", audience: "all", link: "https://drive.example.org/file/1" })).status, 200);
  assert.equal((await get("memE", "library")).body.documents.find((d) => d.id === target.id).link, "https://drive.example.org/file/1");
  const added = await post("mgmt", "library-save", { title: "New doc", category: "Other", kind: "PDF", audience: "all" });
  assert.equal(added.status, 200);
  assert.equal((await post("mgmt", "library-delete", { id: added.body.id })).status, 200);
  assert.ok(!(await get("mgmt", "library")).body.documents.some((d) => d.id === added.body.id));
  // version, owner and the updated date come back; the starter owners are filled in
  const short = (await get("memE", "library")).body.documents.find((d) => d.title === "Client Agreement: Short Form");
  assert.equal(short.owner, "Management");
  assert.equal(short.version, "0.2");
  assert.match(short.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await post("mgmt", "library-save", { id: short.id, title: short.title, kind: "Word", audience: "all", version: "0.3", owner: "Legal" })).status, 200);
  const after = (await get("memE", "library")).body.documents.find((d) => d.id === short.id);
  assert.equal(after.version, "0.3");
  assert.equal(after.owner, "Legal");
  // documents saved before owners existed (as on the live site) get the starter owner once, without touching set ones
  await sql.query(`UPDATE hub_library SET owner = '' WHERE title = 'QA Checklist'`);
  const qa = (await get("memE", "library")).body.documents.find((d) => d.title === "QA Checklist");
  assert.equal(qa.owner, "Quality reviewers");
  assert.equal((await get("memE", "library")).body.documents.find((d) => d.id === short.id).owner, "Legal");
  // the starter list is not re-added once it exists
  assert.equal((await get("mgmt", "library")).body.documents.length, mg.body.documents.length);
});
