import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { handleClient } from "../api/_client_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Client portal part 4: the client's own payments, read-only. Planted secrets: the other project's fee and
// a "not used" row that must not show, the internal payment flag, and the clearance checklist.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", CLIENT_PORTAL_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role] of [["mgmt", "management"], ["fin", "finance"], ["lead", "lead"], ["lead2", "lead"]]) {
  ids[key] = (await store.createUser({ email: `${key}@example.org`, name: key, role, unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "AMR study", unit: "", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Other study", unit: "", target_date: null })).id;
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P2, ids.lead2, "lead");
await store.setMoney(P1, { fee: 500000, paid: 0, currency: "NGN" });
await store.setMoney(P2, { fee: 777333, paid: 0, currency: "NGN" });
await store.savePayment(P1, { name: "Commitment fee", amount: 100000, due_date: "2026-11-01", received_date: null, status: "planned" });
await store.savePayment(P1, { name: "HIDDEN-ROW", amount: 0, due_date: null, received_date: null, status: "not_used" });
await store.savePayment(P1, { name: "Balance", amount: 400000, due_date: "2026-12-20", received_date: null, status: "planned" });
await store.updateProject(P1, { payment_status: "not_cleared" });

const staff = (as, method, action, { query = {}, body } = {}) =>
  handleHub({ method, action, query, body, ip: "1", headers: { cookie: makeCookie(ids[as], SECRET).split(";")[0], ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } }, store, ENV);
const portal = (cookie, method, action, { query = {}, body } = {}) =>
  handleClient({ method, action, query, body, ip: "2", headers: { cookie, ...(method === "POST" ? { "x-requested-with": "gsc-client" } : {}) } }, store, ENV);
const login = async (pid, as, email) => {
  const r = await staff(as, "POST", "client-invite", { body: { project_id: pid, email, name: "Dr Client" } });
  return (await portal("", "POST", "login", { body: { email, password: r.body.tempPassword } })).setCookie.split(";")[0];
};
const C1 = await login(P1, "lead", "dr@client.example");
const C2 = await login(P2, "lead2", "rival@client.example");

test("the client sees their own fee, what is paid, what is left and the schedule — not the unused rows or internal flags", async () => {
  const r = await portal(C1, "GET", "payments", { query: { id: P1 } });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.fee, r.body.paid, r.body.balance, r.body.currency], [500000, 0, 500000, "NGN"]);
  assert.deepEqual(r.body.schedule.map((x) => x.name), ["Commitment fee", "Balance"]);
  const t = JSON.stringify(r.body);
  for (const s of ["HIDDEN-ROW", "777333", "not_cleared", "payment_status", "clearance"]) assert.ok(!t.includes(s), `leaked: ${s}`);
  assert.equal(r.body.how_to_pay, null); // billing not set up in this database
});

test("another project's client cannot read it; nothing can be written through the portal", async () => {
  assert.equal((await portal(C2, "GET", "payments", { query: { id: P1 } })).status, 404);
  assert.equal((await portal(C1, "GET", "payments", { query: { id: P2 } })).status, 404);
  for (const a of ["payments", "payment-save", "payment-delete"]) assert.equal((await portal(C1, "POST", a, { body: { project_id: P1, name: "x", amount: 1, status: "received" } })).status, 404, a);
});

test("when finance records a payment, the client's totals follow", async () => {
  const row = (await store.listPayments(P1)).find((x) => x.name === "Commitment fee");
  assert.equal((await staff("fin", "POST", "payment-save", { body: { project_id: P1, id: row.id, name: row.name, amount: row.amount, due_date: row.due_date, status: "received" } })).status, 200);
  const r = await portal(C1, "GET", "payments", { query: { id: P1 } });
  assert.deepEqual([r.body.paid, r.body.balance], [100000, 400000]);
  const got = r.body.schedule.find((x) => x.name === "Commitment fee");
  assert.equal(got.status, "received");
  assert.ok(got.received_date);
});

test("how to pay comes from the admin billing settings when they exist", async () => {
  await sql.query(`CREATE TABLE IF NOT EXISTS billing_settings (id INT PRIMARY KEY, data JSONB NOT NULL)`);
  await sql.query(`INSERT INTO billing_settings (id, data) VALUES (1, $1::jsonb)`, [JSON.stringify({ bank: { accountName: "Genomac SC", bankName: "Test Bank", accountNumber: "0000000000", extra: "" }, company: { email: "info@example.org" }, counters: { invoice: 41 } })]);
  const r = await portal(C1, "GET", "payments", { query: { id: P1 } });
  assert.equal(r.body.how_to_pay.bankName, "Test Bank");
  assert.ok(!JSON.stringify(r.body).includes("counters"));
});
