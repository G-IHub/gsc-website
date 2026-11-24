import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { QA_CHECK_NUMBERS } from "../shared/qaChecks.js";

// The QA checklist inside a project. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role] of [["mgmt", "management"], ["fin", "finance"], ["lead", "lead"], ["analyst", "member"], ["reviewer", "member"], ["outsider", "member"]]) {
  ids[key] = (await store.createUser({ email: `${key}@example.org`, name: key, role, unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
}
const P = (await store.createProject({ ref: "GH-Q", title: "Q", unit: "", target_date: null })).id;
await store.addMember(P, ids.lead, "lead");
await store.addMember(P, ids.analyst, "Supporting researcher");
await store.addMember(P, ids.reviewer, "Quality reviewer");

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub({ method, action, query, body, ip: "1", headers: { cookie: makeCookie(ids[as], SECRET).split(";")[0], ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } }, store, ENV);
const get = (as, q = {}) => call(as, "GET", "qa", { query: { id: String(P), ...q } });
const post = (as, action, b = {}) => call(as, "POST", action, { body: { project_id: P, ...b } });

test("who can see the checklist and who can tick it", async () => {
  const r = await get("analyst");
  assert.equal(r.status, 200);
  assert.equal(r.body.counts.total, 43);
  assert.equal(r.body.round.round, 1);
  assert.equal(r.body.can.review, false);
  assert.equal((await get("reviewer")).body.can.review, true);
  assert.equal((await get("fin")).status, 403); // not on the project
  assert.equal((await get("outsider")).status, 404);
  // independence: the lead and the analyst cannot tick checks
  assert.equal((await post("lead", "qa-check", { n: 1, result: "pass" })).status, 403);
  assert.equal((await post("analyst", "qa-check", { n: 1, result: "pass" })).status, 403);
  assert.equal((await post("reviewer", "qa-check", { n: 1, result: "pass" })).status, 200);
  assert.equal((await post("reviewer", "qa-check", { n: 99, result: "pass" })).status, 400);
  assert.equal((await post("reviewer", "qa-check", { n: 2, result: "maybe" })).status, 400);
});

test("milestone 9 stays locked until QA has passed and the lead has signed", async () => {
  await store.seedMilestones(P, [{ n: 9, name: "Independent quality review passed", owner: "Quality reviewer", signoff: false }]);
  const r = await post("lead", "milestone-update", { n: 9, status: "done" });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /QA checklist/);
  assert.equal((await post("mgmt", "milestone-update", { n: 9, status: "done" })).status, 400); // management cannot skip it either
});

test("outcome rules: every check answered; fails and open issues block a pass", async () => {
  assert.match((await post("reviewer", "qa-outcome", { outcome: "pass" })).body.error, /Answer every check/);
  for (const n of QA_CHECK_NUMBERS) await post("reviewer", "qa-check", { n, result: n === 11 ? "fail" : n === 36 ? "na" : "pass" });
  let s = (await get("reviewer")).body;
  assert.deepEqual([s.counts.answered, s.counts.pass, s.counts.fail, s.counts.na], [43, 41, 1, 1]);
  assert.match((await post("reviewer", "qa-outcome", { outcome: "pass" })).body.error, /still marked Fail/);
  // log the issue; the analyst fixes it; only the reviewer can recheck
  assert.equal((await post("reviewer", "qa-issue-add", { text: "Figure 3 legend says n=48, Results say 46", check: 11, severity: "must" })).status, 200);
  assert.equal((await post("lead", "qa-issue-add", { text: "x", severity: "must" })).status, 403);
  const issue = (await get("analyst")).body.issues[0];
  assert.equal((await post("analyst", "qa-issue-status", { id: issue.id, status: "rechecked" })).status, 403);
  assert.equal((await post("reviewer", "qa-issue-status", { id: issue.id, status: "rechecked" })).status, 400); // not fixed yet
  assert.equal((await post("analyst", "qa-issue-status", { id: issue.id, status: "fixed" })).status, 200);
  assert.equal((await post("reviewer", "qa-issue-status", { id: issue.id, status: "rechecked" })).status, 200);
  await post("reviewer", "qa-check", { n: 11, result: "pass", note: "Legend fixed in v6" });
  assert.match((await post("reviewer", "qa-outcome", { outcome: "pass" })).body.error, /Pass after fixes/); // issues were found
  assert.equal((await post("lead", "qa-outcome", { outcome: "pass_after_fixes" })).status, 403);
  const o = await post("reviewer", "qa-outcome", { outcome: "pass_after_fixes", comments: "Clean after one fix." });
  assert.equal(o.status, 200);
  assert.equal(o.body.round.outcome, "pass_after_fixes");
  assert.equal(o.body.round.reviewer, "reviewer");
  assert.equal((await post("reviewer", "qa-check", { n: 1, result: "fail" })).status, 409); // closed round
});

test("the lead signs off; then milestone 9 opens; QA first-pass rate counts it as not first-pass", async () => {
  assert.equal((await post("analyst", "qa-lead-sign")).status, 403);
  assert.equal((await post("reviewer", "qa-lead-sign")).status, 403); // the reviewer is not the lead
  assert.equal((await post("lead", "qa-lead-sign")).status, 200);
  assert.equal((await post("lead", "qa-lead-sign")).status, 409);
  assert.equal((await post("lead", "milestone-update", { n: 9, status: "done" })).status, 200);
  const t = (await call("mgmt", "GET", "reports-summary")).body.tiles.qaFirstPass;
  assert.deepEqual(t, { passed: 0, total: 1 });
});

test("a new round starts empty, only after the last one has an outcome", async () => {
  const r = await post("reviewer", "qa-round-new", { version: "v7" });
  assert.equal(r.status, 200);
  assert.equal(r.body.round.round, 2);
  assert.equal(r.body.round.version, "v7");
  assert.equal(r.body.counts.answered, 0);
  assert.equal((await post("reviewer", "qa-round-new")).status, 409); // round 2 is still open
  // milestone 9 is done already; the new open round does not undo it, but QA is no longer "passed" for a fresh tick
  assert.equal(r.body.issues.length, 0);
});
