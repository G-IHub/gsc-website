import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { handleClient } from "../api/_client_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { fingerprint } from "../api/_client_docs.js";
import { DEFAULT_MILESTONES } from "../api/_hub_defaults.js";

// Client portal part 2: documents, online signing, milestone sign-offs, intake form. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", CLIENT_PORTAL_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role] of [["mgmt", "management"], ["fin", "finance"], ["lead", "lead"], ["memE", "member"], ["lead2", "lead"]]) {
  ids[key] = (await store.createUser({ email: `${key}@example.org`, name: key, role, unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "AMR study", unit: "", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Other study", unit: "", target_date: null })).id;
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "Supporting researcher");
await store.addMember(P2, ids.lead2, "lead");
await store.seedMilestones(P1, DEFAULT_MILESTONES);

const staff = (as, method, action, { query = {}, body } = {}) =>
  handleHub({ method, action, query, body, ip: "10.0.0.1", headers: { cookie: makeCookie(ids[as], SECRET).split(";")[0], "user-agent": "StaffBrowser", ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } }, store, ENV);
const portal = (cookie, method, action, { query = {}, body } = {}) =>
  handleClient({ method, action, query, body, ip: "203.0.113.7", headers: { cookie, "user-agent": "ClientBrowser/1.0", ...(method === "POST" ? { "x-requested-with": "gsc-client" } : {}) } }, store, ENV);

const login = async (pid, as, email) => {
  const r = await staff(as, "POST", "client-invite", { body: { project_id: pid, email, name: "Dr Client" } });
  return (await portal("", "POST", "login", { body: { email, password: r.body.tempPassword } })).setCookie.split(";")[0];
};
const C1 = await login(P1, "lead", "dr@client.example");
const C2 = await login(P2, "lead2", "rival@client.example");

let agreementId = 0;
let draftId = 0;

test("only the project's lead or management create, edit and send; drafts stay invisible to the client", async () => {
  assert.equal((await staff("memE", "POST", "cdoc-create", { body: { project_id: P1, kind: "agreement" } })).status, 403);
  assert.equal((await staff("lead2", "POST", "cdoc-create", { body: { project_id: P1, kind: "agreement" } })).status, 404);
  assert.equal((await staff("lead", "POST", "cdoc-create", { body: { project_id: P1, kind: "nonsense" } })).status, 400);
  const a = await staff("lead", "POST", "cdoc-create", { body: { project_id: P1, kind: "agreement" } });
  assert.equal(a.status, 200);
  agreementId = a.body.id;
  draftId = (await staff("lead", "POST", "cdoc-create", { body: { project_id: P1, kind: "proposal" } })).body.id;
  // a member on the project may read and reply, not write
  assert.equal((await staff("memE", "GET", "cdocs", { query: { id: P1 } })).body.canWrite, false);
  assert.equal((await staff("memE", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: agreementId, body: "x" } })).status, 403);
  assert.equal((await staff("fin", "GET", "cdocs", { query: { id: P1 } })).status, 403);
  // editing a draft nobody has seen changes it in place (still version 1)
  const e = await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: agreementId, body: "# Agreement\n\nFee NGN 500,000. Draft wording." } });
  assert.equal(e.body.document.version, 1);
  // nothing is visible before sending
  assert.deepEqual((await portal(C1, "GET", "docs", { query: { id: P1 } })).body.documents, []);
  assert.equal((await portal(C1, "GET", "doc", { query: { id: P1, doc: agreementId } })).status, 404);
  // the blanks check, then send
  await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: agreementId, body: "# Agreement\n\nSigned at [date]." } });
  const s1 = await staff("lead", "POST", "cdoc-send", { body: { project_id: P1, doc_id: agreementId } });
  assert.equal(s1.status, 409);
  assert.equal(s1.body.blanks, true);
  await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: agreementId, body: "# Agreement\n\nFee NGN 500,000. Final wording." } });
  assert.equal((await staff("lead", "POST", "cdoc-send", { body: { project_id: P1, doc_id: agreementId } })).status, 200);
  const list = (await portal(C1, "GET", "docs", { query: { id: P1 } })).body.documents;
  assert.deepEqual(list.map((d) => [d.id, d.status]), [[agreementId, "awaiting_client"]]);
  assert.equal((await portal(C1, "GET", "doc", { query: { id: P1, doc: draftId } })).status, 404);
});

test("the other project's client sees nothing; a document of one project cannot be reached through another", async () => {
  assert.equal((await portal(C2, "GET", "docs", { query: { id: P1 } })).status, 404);
  assert.equal((await portal(C2, "GET", "doc", { query: { id: P2, doc: agreementId } })).status, 404);
  assert.equal((await portal(C2, "POST", "doc-sign", { body: { project_id: P2, doc_id: agreementId, version: 1, typed_name: "Rival", agree: true } })).status, 404);
  assert.equal((await staff("lead2", "GET", "cdoc", { query: { id: P2, doc: agreementId } })).status, 404);
});

test("signing: typed name + agree, latest version only, once; the record carries time, IP, browser and the text's fingerprint", async () => {
  const d = (await portal(C1, "GET", "doc", { query: { id: P1, doc: agreementId } })).body.document;
  assert.equal(d.hash, fingerprint(agreementId, 1, d.title, "# Agreement\n\nFee NGN 500,000. Final wording."));
  assert.equal((await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: agreementId, version: 1, typed_name: "Dr Client", agree: false } })).status, 400);
  assert.equal((await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: agreementId, version: 1, typed_name: "D", agree: true } })).status, 400);
  assert.equal((await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: agreementId, version: 9, typed_name: "Dr Client", agree: true } })).status, 409);
  const ok = await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: agreementId, version: 1, typed_name: "Dr Client", agree: true } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.document.status, "awaiting_genomac");
  assert.equal((await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: agreementId, version: 1, typed_name: "Dr Client", agree: true } })).status, 409);
  const [row] = await sql.query(`SELECT * FROM hub_signatures WHERE doc_id = $1`, [agreementId]);
  assert.equal(row.ip, "203.0.113.7");
  assert.equal(row.user_agent, "ClientBrowser/1.0");
  assert.equal(row.hash, d.hash);
  assert.equal(row.typed_name, "Dr Client");
  assert.ok(row.signed_at);
  // the client's view never shows the IP addresses
  assert.ok(!JSON.stringify(ok.body).includes("203.0.113.7"));
  assert.ok(JSON.stringify((await staff("lead", "GET", "cdoc", { query: { id: P1, doc: agreementId } })).body).includes("203.0.113.7"));
});

test("countersigning is for management only, after the client; then the document is complete", async () => {
  const body = { project_id: P1, doc_id: agreementId, typed_name: "Genomac Director", agree: true };
  assert.equal((await staff("lead", "POST", "cdoc-countersign", { body })).status, 403);
  const r = await staff("mgmt", "POST", "cdoc-countersign", { body });
  assert.equal(r.status, 200);
  assert.equal(r.body.document.status, "complete");
  assert.equal((await staff("mgmt", "POST", "cdoc-countersign", { body })).status, 409);
});

test("a signed version never changes: an edit makes a new version that needs signing again", async () => {
  const before = (await sql.query(`SELECT body, hash FROM hub_document_versions WHERE doc_id = $1 AND version = 1`, [agreementId]))[0];
  const e = await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: agreementId, body: "# Agreement\n\nFee NGN 600,000. Changed." } });
  assert.equal(e.body.document.version, 2);
  assert.equal(e.body.document.status, "awaiting_client");
  const after = (await sql.query(`SELECT body, hash FROM hub_document_versions WHERE doc_id = $1 AND version = 1`, [agreementId]))[0];
  assert.deepEqual(after, before);
  // signing the old version is refused; the client must read version 2
  assert.equal((await portal(C1, "POST", "doc-sign", { body: { project_id: P1, doc_id: agreementId, version: 1, typed_name: "Dr Client", agree: true } })).status, 409);
  // countersigning before the client signs version 2 is refused
  assert.equal((await staff("mgmt", "POST", "cdoc-countersign", { body: { project_id: P1, doc_id: agreementId, typed_name: "Genomac Director", agree: true } })).status, 409);
  const v = (await portal(C1, "GET", "doc", { query: { id: P1, doc: agreementId } })).body.document;
  assert.deepEqual(v.versions.map((x) => [x.version, x.signed]), [[1, true], [2, false]]);
  // an edit of a SENT but unsigned version also makes a new version (the client may already have read it)
  await staff("lead", "POST", "cdoc-edit", { body: { project_id: P1, doc_id: agreementId, body: "# Agreement\n\nFee NGN 650,000." } });
  assert.equal((await staff("lead", "GET", "cdoc", { query: { id: P1, doc: agreementId } })).body.document.version, 3);
});

test("comments: client asks for a change, team replies; each sees the thread", async () => {
  assert.equal((await portal(C1, "POST", "doc-comment", { body: { project_id: P1, doc_id: agreementId, text: "Please change point 3." } })).status, 200);
  assert.equal((await staff("memE", "POST", "cdoc-comment", { body: { project_id: P1, doc_id: agreementId, text: "Done in version 3." } })).status, 200);
  const c = (await portal(C1, "GET", "doc", { query: { id: P1, doc: agreementId } })).body.document.comments;
  assert.deepEqual(c.map((x) => [x.from, x.text]), [["client", "Please change point 3."], ["team", "Done in version 3."]]);
  assert.equal((await portal(C1, "POST", "doc-comment", { body: { project_id: P1, doc_id: draftId, text: "x" } })).status, 404);
});

test("milestone sign-off: only steps with a client sign-off, only when done, only once", async () => {
  assert.equal((await portal(C1, "POST", "milestone-sign", { body: { project_id: P1, n: 1, typed_name: "Dr Client", agree: true } })).status, 404);
  assert.equal((await portal(C1, "POST", "milestone-sign", { body: { project_id: P1, n: 2, typed_name: "Dr Client", agree: true } })).status, 409);
  await store.updateMilestone(P1, 2, { status: "done", done: "2026-11-20" });
  assert.equal((await portal(C2, "POST", "milestone-sign", { body: { project_id: P1, n: 2, typed_name: "Rival", agree: true } })).status, 404);
  assert.equal((await portal(C1, "POST", "milestone-sign", { body: { project_id: P1, n: 2, typed_name: "Dr Client", agree: true } })).status, 200);
  assert.equal((await portal(C1, "POST", "milestone-sign", { body: { project_id: P1, n: 2, typed_name: "Dr Client", agree: true } })).status, 409);
  const p = (await portal(C1, "GET", "project", { query: { id: P1 } })).body;
  assert.equal(p.milestones.find((m) => m.n === 2).signed, true);
  assert.deepEqual(p.milestoneSignatures.map((s) => [s.n, s.name]), [[2, "Dr Client"]]);
});

test("intake form: draft, then send with every required answer; then locked until the lead reopens it", async () => {
  const draft = await portal(C1, "POST", "intake-save", { body: { project_id: P1, data: { name: "Dr Client", topic: "AMR in poultry", evil: "<script>" } } });
  assert.equal(draft.status, 200);
  assert.equal(draft.body.intake.submitted_at, null);
  assert.ok(!("evil" in draft.body.intake.data));
  const bad = await portal(C1, "POST", "intake-save", { body: { project_id: P1, submit: true, data: { name: "Dr Client" } } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.missing.includes("3. Aim"));
  const full = { name: "Dr Client", institution: "Uni", role: "Lecturer", contact: "dr@client.example", topic: "AMR in poultry", aim: "Map AMR genes", objectives: "1. Sequence 2. Compare", has_data: "Yes, my own data",
    confirm: ["The information above is accurate.", "I have the right to share it and any data I mention.", "I understand that sending this form does not start any work or create any charge."] };
  assert.equal((await portal(C1, "POST", "intake-save", { body: { project_id: P1, submit: true, data: { ...full, confirm: full.confirm.slice(0, 2) } } })).status, 400);
  const sent = await portal(C1, "POST", "intake-save", { body: { project_id: P1, submit: true, data: full } });
  assert.equal(sent.status, 200);
  assert.ok(sent.body.intake.submitted_at);
  assert.equal((await portal(C1, "POST", "intake-save", { body: { project_id: P1, data: { name: "changed" } } })).status, 409);
  // the team reads it; outsiders cannot
  assert.equal((await staff("memE", "GET", "cintake", { query: { id: P1 } })).body.intake.data.topic, "AMR in poultry");
  assert.equal((await staff("fin", "GET", "cintake", { query: { id: P1 } })).status, 403);
  assert.equal((await portal(C2, "GET", "intake", { query: { id: P1 } })).status, 404);
  assert.equal((await staff("memE", "POST", "cintake-reopen", { body: { project_id: P1 } })).status, 403);
  assert.equal((await staff("lead", "POST", "cintake-reopen", { body: { project_id: P1 } })).status, 200);
  assert.equal((await portal(C1, "POST", "intake-save", { body: { project_id: P1, data: full } })).status, 200);
});
