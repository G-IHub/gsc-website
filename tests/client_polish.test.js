import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { handleClient } from "../api/_client_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { DEFAULT_MILESTONES } from "../api/_hub_defaults.js";

// Client portal: password reset by the team, sessions ending on reset, and email alerts (content-free).
const SECRET = "test-secret-test-secret-test-secret";
const sent = [];
let failMail = false;
const ENV = {
  HUB_ENABLED: "1", CLIENT_PORTAL_ENABLED: "1", SESSION_SECRET: SECRET,
  __sendMail: async (m) => { if (failMail) throw new Error("mail down"); sent.push(m); },
};
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role] of [["mgmt", "management"], ["lead", "lead"], ["memE", "member"], ["lead2", "lead"]]) {
  ids[key] = (await store.createUser({ email: `${key}@example.org`, name: key, role, unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "AMR study", unit: "", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Other", unit: "", target_date: null })).id;
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "Supporting researcher");
await store.addMember(P2, ids.lead2, "lead");
await store.seedMilestones(P1, DEFAULT_MILESTONES);

const staff = (as, method, action, { query = {}, body } = {}, env = ENV) =>
  handleHub({ method, action, query, body, ip: "1", headers: { cookie: makeCookie(ids[as], SECRET).split(";")[0], ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } }, store, env);
const portal = (cookie, method, action, { query = {}, body } = {}, env = ENV) =>
  handleClient({ method, action, query, body, ip: "2", headers: { cookie, ...(method === "POST" ? { "x-requested-with": "gsc-client" } : {}) } }, store, env);
const signIn = async (email, password) => (await portal("", "POST", "login", { body: { email, password } })).setCookie?.split(";")[0];

const inv = await staff("lead", "POST", "client-invite", { body: { project_id: P1, email: "dr@client.example", name: "Dr Client" } });
const CID = inv.body.client.id;
let pw = inv.body.tempPassword;
let C1 = await signIn("dr@client.example", pw);

test("password reset: lead or management of THAT project only; old password and old sessions stop working", async () => {
  assert.equal((await staff("memE", "POST", "client-reset", { body: { project_id: P1, client_id: CID } })).status, 403);
  assert.equal((await staff("lead2", "POST", "client-reset", { body: { project_id: P1, client_id: CID } })).status, 404);
  assert.equal((await staff("lead2", "POST", "client-reset", { body: { project_id: P2, client_id: CID } })).status, 404); // not their client
  const r = await staff("lead", "POST", "client-reset", { body: { project_id: P1, client_id: CID } });
  assert.equal(r.status, 200);
  assert.ok(r.body.tempPassword.length >= 12 && r.body.tempPassword !== pw);
  assert.equal((await portal(C1, "GET", "me")).status, 401, "the old session should end");
  assert.equal(await signIn("dr@client.example", pw), undefined, "the old password should fail");
  pw = r.body.tempPassword;
  C1 = await signIn("dr@client.example", pw);
  assert.equal((await portal(C1, "GET", "me")).status, 200);
});

test("changing the password keeps this session and ends the others", async () => {
  const other = await signIn("dr@client.example", pw);
  const r = await portal(C1, "POST", "change-password", { body: { oldPassword: pw, newPassword: "A-much-better-pass-42" } });
  assert.equal(r.status, 200);
  C1 = r.setCookie.split(";")[0];
  assert.equal((await portal(C1, "GET", "me")).status, 200);
  assert.equal((await portal(other, "GET", "me")).status, 401);
});

test("alerts: the right people, no content, messages at most once per 30 minutes", async () => {
  sent.length = 0;
  await staff("memE", "POST", "client-message-post", { body: { project_id: P1, text: "SECRET-TEAM-TEXT" } });
  await staff("memE", "POST", "client-message-post", { body: { project_id: P1, text: "second" } });
  assert.deepEqual(sent.map((m) => m.to), ["dr@client.example"]);
  assert.ok(sent[0].text.includes("/client") && sent[0].subject.includes("GH-1"));
  sent.length = 0;
  await portal(C1, "POST", "message-post", { body: { project_id: P1, text: "SECRET-CLIENT-TEXT" } });
  assert.deepEqual(sent.map((m) => m.to), ["lead@example.org"]);
  assert.ok(sent[0].text.includes("/hub"));

  sent.length = 0;
  const id = (await staff("lead", "POST", "cdoc-create", { body: { project_id: P1, kind: "agreement" } })).body.id;
  await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: id, body: "# A\n\nSECRET-DOC-TEXT" } });
  assert.equal(sent.length, 0, "no alert for a draft");
  await staff("lead", "POST", "cdoc-send", { body: { project_id: P1, doc_id: id } });
  assert.deepEqual(sent.map((m) => m.to), ["dr@client.example"]);
  sent.length = 0;
  await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: id, version: 1, typed_name: "Dr Client", agree: true } });
  assert.deepEqual(sent.map((m) => m.to).sort(), ["lead@example.org", "mgmt@example.org"]); // lead told + management asked to countersign
  // an edit of a sent document makes a new version: the client is told to read and sign again
  sent.length = 0;
  await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: id, body: "# A\n\nSECRET-DOC-TEXT v2" } });
  assert.deepEqual(sent.map((m) => m.to), ["dr@client.example"]);
  await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: id, version: 2, typed_name: "Dr Client", agree: true } });
  sent.length = 0;
  await staff("mgmt", "POST", "cdoc-countersign", { body: { project_id: P1, doc_id: id, typed_name: "Genomac Director", agree: true } });
  assert.deepEqual(sent.map((m) => m.to), ["dr@client.example"]);

  sent.length = 0;
  await staff("lead", "POST", "milestone-update", { body: { project_id: P1, n: 1, status: "done" } }); // no client sign-off
  assert.equal(sent.length, 0);
  await staff("lead", "POST", "milestone-update", { body: { project_id: P1, n: 2, status: "done" } });
  assert.deepEqual(sent.map((m) => m.to), ["dr@client.example"]);

  const all = JSON.stringify(sent);
  for (const s of ["SECRET-TEAM-TEXT", "SECRET-CLIENT-TEXT", "SECRET-DOC-TEXT", "AMR study"]) assert.ok(!all.includes(s), `email carried content: ${s}`);
});

test("alerts never break the action; CLIENT_EMAILS=0 sends nothing; no email service = nothing sent", async () => {
  failMail = true;
  assert.equal((await staff("lead", "POST", "milestone-update", { body: { project_id: P1, n: 4, status: "done" } })).status, 200);
  failMail = false;
  sent.length = 0;
  await staff("lead", "POST", "milestone-update", { body: { project_id: P1, n: 6, status: "done" } }, { ...ENV, CLIENT_EMAILS: "0" });
  const { __sendMail, ...noMail } = ENV;
  await staff("lead", "POST", "milestone-update", { body: { project_id: P1, n: 8, status: "done" } }, noMail);
  assert.equal(sent.length, 0);
  assert.ok(__sendMail);
});
