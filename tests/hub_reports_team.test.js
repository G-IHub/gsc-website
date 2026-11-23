import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { weekEnding } from "../api/_hub_reports.js";
import { raciCheck } from "../api/_hub_team.js";

// Reports and KPIs, and Team. Own empty database.
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
const P1 = (await store.createProject({ ref: "GH-1", title: "One", unit: "Lab", target_date: "2026-12-31" })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Two", unit: "Other", target_date: null })).id;
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "supporting");

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { ...(as ? { cookie: makeCookie(ids[as], SECRET).split(";")[0] } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });

test("week ending is the Friday of the week", () => {
  assert.equal(weekEnding("2026-11-23"), "2026-11-27"); // Monday -> Friday
  assert.equal(weekEnding("2026-11-27"), "2026-11-27"); // Friday stays
  assert.equal(weekEnding("2026-11-28"), "2026-12-04"); // Saturday -> next Friday
});

test("reports: who gets in; team members and coordinators do not", async () => {
  for (const who of ["mgmt", "fin", "dir", "lead"]) assert.equal((await get(who, "reports-summary")).status, 200, who);
  for (const who of ["memE", "coord"]) {
    assert.equal((await get(who, "reports-summary")).status, 403, who);
    assert.equal((await get(who, "reports")).status, 403, who);
    assert.equal((await post(who, "report-submit", { workstream: "Documentation and governance", status: "green", done: "x" })).status, 403, who);
  }
});

test("KPIs are worked out from the hub, scoped to what the person can see", async () => {
  // P1: feasibility done, proposal accepted, fully cleared, protocol under way; P2: work started without clearance
  await store.seedMilestones(P1, [{ n: 1, name: "a", owner: "Lead", signoff: false }, { n: 2, name: "b", owner: "Lead", signoff: true }, { n: 4, name: "c", owner: "Lead", signoff: true }, { n: 12, name: "d", owner: "Coordinator", signoff: true }, { n: 14, name: "e", owner: "Coordinator", signoff: false }]);
  await store.updateMilestone(P1, 1, { status: "done" });
  await store.updateMilestone(P1, 2, { status: "done" });
  await store.updateMilestone(P1, 4, { status: "in_progress" });
  for (const k of ["budget", "min_fee", "sheet_fee", "funds", "feasibility"]) await store.setClearance(P1, k, true, ids.fin);
  await store.seedMilestones(P2, [{ n: 5, name: "x", owner: "Lead", signoff: false }]);
  await store.updateMilestone(P2, 5, { status: "in_progress" });

  const m = (await get("mgmt", "reports-summary")).body;
  assert.equal(m.tiles.projects, 2);
  assert.equal(m.tiles.startedUncleared, 1); // P2
  const k = Object.fromEntries(m.kpis.map((x) => [x.key, x]));
  assert.equal(k.feasibility.value, "1 of 2");
  assert.equal(k.clearance.value, "1 of 2");
  assert.equal(k.leads.value, "1 of 2");
  assert.equal(k.activated.value, "1");
  assert.equal(k.templates.value, "Not entered"); // manual KPI, never invented
  // the lead sees only their own project
  const l = (await get("lead", "reports-summary")).body;
  assert.equal(l.tiles.projects, 1);
  assert.equal(l.tiles.startedUncleared, 0);
  // the director sees their unit (Lab = P1)
  assert.equal((await get("dir", "reports-summary")).body.tiles.projects, 1);
});

test("revenue only for Finance and management, from received payments", async () => {
  const day = new Date().toISOString().slice(0, 10);
  await store.savePayment(P1, { name: "Commitment fee", amount: 20000, due_date: null, received_date: day, status: "received" });
  await store.savePayment(P1, { name: "Balance", amount: 290000, due_date: null, received_date: null, status: "planned" });
  const f = (await get("fin", "reports-summary")).body;
  assert.equal(f.revenue.received30, 20000);
  assert.equal(f.revenue.weeks.length, 6);
  assert.equal(f.revenue.weeks[5].amount, 20000); // this week
  for (const who of ["lead", "dir"]) {
    const b = (await get(who, "reports-summary")).body;
    assert.ok(!("revenue" in b), who);
    assert.ok(!/20000|290000/.test(JSON.stringify(b)), `${who} saw an amount`);
  }
});

test("light summary for Home: KPIs only; money roles get this month's total; nothing logged", async () => {
  const before = (await get("mgmt", "access-log")).body.log.filter((l) => l.event === "money_read").length;
  const f = (await get("fin", "reports-summary", { light: "1" })).body;
  assert.equal(f.kpis.length, 11);
  assert.ok(!("revenue" in f));
  assert.equal(f.monthReceived, 20000);
  const l = (await get("lead", "reports-summary", { light: "1" })).body;
  assert.ok(!("revenue" in l) && !("monthReceived" in l));
  assert.ok(!/20000/.test(JSON.stringify(l)));
  const after = (await get("mgmt", "access-log")).body.log.filter((x) => x.event === "money_read").length;
  assert.equal(after, before);
  // projects now carry the lead's name
  assert.equal((await get("mgmt", "projects")).body.projects.find((p) => p.ref === "GH-1").lead, "lead");
});

test("manual KPIs: management only, and auto KPIs cannot be overwritten", async () => {
  assert.equal((await post("fin", "kpi-set", { key: "templates", value: "100%", progress: 100, status: "met" })).status, 403);
  assert.equal((await post("lead", "kpi-set", { key: "templates", value: "100%", progress: 100, status: "met" })).status, 403);
  assert.equal((await post("mgmt", "kpi-set", { key: "clearance", value: "100%", progress: 100, status: "met" })).status, 400); // auto
  assert.equal((await post("mgmt", "kpi-set", { key: "templates", value: "100%", progress: 100, status: "bogus" })).status, 400);
  assert.equal((await post("mgmt", "kpi-set", { key: "templates", value: "14 of 14", progress: 100, status: "met" })).status, 200);
  const k = (await get("lead", "reports-summary")).body.kpis.find((x) => x.key === "templates");
  assert.equal(k.value, "14 of 14");
  assert.equal(k.status, "met");
});

test("weekly workstream reports: submit and read by week", async () => {
  assert.equal((await post("lead", "report-submit", { workstream: "Nope", status: "green", done: "x" })).status, 400);
  assert.equal((await post("lead", "report-submit", { workstream: "Documentation and governance", status: "purple", done: "x" })).status, 400);
  assert.equal((await post("lead", "report-submit", { workstream: "Documentation and governance", status: "green", done: "" })).status, 400);
  const r = await post("fin", "report-submit", { workstream: "Financial and commercial structure", status: "amber", done: "Invoices set up", week_ending: "2026-11-23" });
  assert.equal(r.status, 200);
  assert.equal(r.body.week_ending, "2026-11-27");
  const w = (await get("dir", "reports", { week: "2026-11-25" })).body;
  assert.equal(w.week_ending, "2026-11-27");
  assert.equal(w.reports.length, 5);
  assert.equal(w.reports[1].status, "amber");
  assert.equal(w.reports[1].author, "fin");
  assert.equal(w.reports[0], null); // not in yet
  assert.ok(w.weeks.includes("2026-11-27"));
});

test("team: the matrix check, who sees it, who edits it", async () => {
  assert.equal(raciCheck(["A", "R"]), "OK");
  assert.equal(raciCheck(["A/R"]), "OK");
  assert.equal(raciCheck(["R", "C"]), "No one accountable");
  assert.equal(raciCheck(["A", "A", "R"]), "More than one accountable");
  assert.equal(raciCheck(["A", "C"]), "No one doing the work");

  for (const who of ["memE", "coord"]) assert.equal((await get(who, "team")).status, 403, who);
  const t = (await get("lead", "team")).body;
  assert.equal(t.raci.length, 17);
  assert.equal(t.columns.length, 11);
  assert.ok(t.raci.every((r) => r.check === "OK"));
  assert.equal(t.canEdit, false);
  assert.ok(!/example\.org/.test(JSON.stringify(t)), "an email left the server");

  const row = t.raci[0];
  assert.equal((await post("lead", "raci-set", { id: row.id, cells: row.cells })).status, 403);
  assert.equal((await post("mgmt", "raci-set", { id: row.id, cells: ["A"] })).status, 400); // wrong length
  assert.equal((await post("mgmt", "raci-set", { id: row.id, cells: row.cells.map(() => "Z") })).status, 400);
  const twoA = row.cells.map((c, i) => (i < 2 ? "A" : c));
  const s = await post("mgmt", "raci-set", { id: row.id, cells: twoA });
  assert.equal(s.status, 200);
  assert.equal(s.body.check, "More than one accountable");
  assert.equal((await post("mgmt", "raci-set", { id: 99999, cells: row.cells })).status, 404);
  const added = await post("mgmt", "raci-add", { name: "New activity" });
  assert.equal((await get("mgmt", "team")).body.raci.find((r) => r.id === added.body.id).check, "No one accountable");
  assert.equal((await post("mgmt", "raci-delete", { id: added.body.id })).status, 200);
  assert.equal((await get("mgmt", "team")).body.raci.length, 17);
  assert.equal((await post("lead", "raci-add", { name: "x" })).status, 403);
});

test("directory: everyone fills in their own profile; capacity comes from projects", async () => {
  assert.equal((await post("memE", "profile-set", { skills: "GWAS, R", can_lead: false, can_qa: true, max_projects: 2, availability: "limited" })).status, 200);
  assert.equal((await post("memE", "profile-set", { skills: "x", max_projects: 99, availability: "available" })).status, 400);
  assert.equal((await post("memE", "profile-set", { skills: "x", max_projects: 2, availability: "on holiday" })).status, 400);
  assert.equal((await get("memE", "profile")).body.profile.skills, "GWAS, R");
  // one person cannot fill in someone else's row: profile-set always writes the signed-in person
  await post("lead", "profile-set", { skills: "AMR, WGS", can_lead: true, can_qa: false, max_projects: 2, availability: "available", user_id: ids.memE });
  assert.equal((await get("memE", "profile")).body.profile.skills, "GWAS, R");

  const d = (await get("mgmt", "team")).body.directory;
  const e = d.find((x) => x.name === "memE");
  assert.equal(e.active, 1); // on P1
  assert.equal(e.spare, 1);
  assert.equal(e.availability, "limited");
  assert.equal(d.find((x) => x.name === "lead").can_lead, true);
  assert.equal(d.find((x) => x.name === "fin").filled, false);
  // the directory KPI counts filled profiles
  assert.equal((await get("mgmt", "reports-summary")).body.kpis.find((k) => k.key === "directory").value, "2 of 6 people");
});
