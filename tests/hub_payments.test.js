import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Payment schedule and change log. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role, unit] of [["mgmt", "management", ""], ["fin", "finance", ""], ["dir", "director", "Lab"], ["lead", "lead", ""], ["lead2", "lead", ""], ["memE", "member", ""], ["coord", "coordinator", ""]]) {
  ids[key] = (await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit, password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "One", unit: "Lab", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Two", unit: "Other", target_date: null })).id;
await store.setMoney(P1, { fee: 310000, paid: 0, currency: "NGN" });
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "supporting");
await store.addMember(P1, ids.coord, "coordinator");
await store.addMember(P2, ids.lead2, "lead");

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { ...(as ? { cookie: makeCookie(ids[as], SECRET).split(";")[0] } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });

test("payments: only Finance and management reach them", async () => {
  for (const who of ["lead", "memE", "coord", "dir"]) {
    assert.equal((await get(who, "payments", { id: P1 })).status, 403, who);
    assert.equal((await post(who, "payment-standard", { project_id: P1 })).status, 403, who);
    assert.equal((await post(who, "payment-save", { project_id: P1, name: "x", amount: 1, status: "planned" })).status, 403, who);
  }
  assert.equal((await get("dir", "payments", { id: P1 }, )).status, 403);
  assert.equal((await get(null, "payments", { id: P1 })).status, 401);
});

test("payments: the standard schedule, receiving a payment updates Received, and limits", async () => {
  const std = await post("fin", "payment-standard", { project_id: P1 });
  assert.equal(std.status, 200);
  assert.deepEqual(std.body.payments.map((r) => [r.name, r.amount, r.status]), [
    ["Commitment fee (refundable)", 20000, "planned"],
    ["Middle payment", 0, "not_used"],
    ["Balance", 290000, "planned"],
  ]);
  assert.equal((await post("fin", "payment-standard", { project_id: P1 })).status, 409); // not twice
  const fee = std.body.payments[0];
  const r = await post("fin", "payment-save", { project_id: P1, ...fee, status: "received" });
  assert.equal(r.status, 200);
  assert.match(r.body.payments[0].received_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal((await get("fin", "money", { id: P1 })).body.money.paid, 20000);
  assert.equal((await get("fin", "money", { id: P1 })).body.money.fee, 310000);
  // back to planned: received date cleared, Received drops
  await post("mgmt", "payment-save", { project_id: P1, ...fee, status: "planned" });
  assert.equal((await get("fin", "money", { id: P1 })).body.money.paid, 0);
  // bad input
  assert.equal((await post("fin", "payment-save", { project_id: P1, name: "", amount: 1, status: "planned" })).status, 400);
  assert.equal((await post("fin", "payment-save", { project_id: P1, name: "x", amount: -1, status: "planned" })).status, 400);
  assert.equal((await post("fin", "payment-save", { project_id: P1, name: "x", amount: 1, status: "stolen" })).status, 400);
  // a row of P1 cannot be changed or removed through P2
  assert.equal((await post("fin", "payment-save", { project_id: P2, id: fee.id, name: "x", amount: 1, status: "planned" })).status, 404);
  assert.equal((await post("fin", "payment-delete", { project_id: P2, id: fee.id })).status, 404);
  assert.equal((await post("fin", "payment-delete", { project_id: P1, id: fee.id })).status, 200);
  assert.equal((await get("fin", "payments", { id: P1 })).body.payments.length, 2);
  // reading the schedule is logged like reading the fee
  assert.ok((await get("mgmt", "access-log")).body.log.some((l) => l.event === "money_read" && l.detail.what === "payments"));
});

test("fees card: setting the fee alone keeps Received as the schedule set it", async () => {
  const bal = (await get("fin", "payments", { id: P1 })).body.payments.find((r) => r.name === "Balance");
  await post("fin", "payment-save", { project_id: P1, ...bal, status: "received" });
  assert.equal((await post("fin", "money-set", { project_id: P1, fee: 320000 })).status, 200);
  const m = (await get("fin", "money", { id: P1 })).body.money;
  assert.equal(m.fee, 320000);
  assert.equal(m.paid, 290000);
});

test("change log: everyone on the project reads; the fee effect only for Finance and management", async () => {
  assert.equal((await post("memE", "change-add", { project_id: P1, text: "x" })).status, 403);
  assert.equal((await post("coord", "change-add", { project_id: P1, text: "x" })).status, 403);
  assert.equal((await post("dir", "change-add", { project_id: P1, text: "x" })).status, 403);
  assert.equal((await post("lead2", "change-add", { project_id: P1, text: "x" })).status, 404); // not their project
  assert.equal((await post("lead", "change-add", { project_id: P1, text: "" })).status, 400);
  // a lead tries to slip an amount into the fee field: it is not stored
  assert.equal((await post("lead", "change-add", { project_id: P1, text: "Client added a second dataset", dates_effect: "+4 days", fee_effect: "+₦30,000", on_date: "2026-11-10" })).status, 200);
  assert.equal((await post("fin", "change-add", { project_id: P1, text: "New Project Sheet signed", fee_effect: "+₦30,000" })).status, 200);

  const asMember = await get("memE", "changes", { id: P1 });
  assert.equal(asMember.status, 200);
  assert.equal(asMember.body.changes.length, 2);
  assert.ok(!JSON.stringify(asMember.body).includes("30,000"), "a team member saw a fee effect");
  assert.ok(asMember.body.changes.every((c) => !("fee_effect" in c)));
  assert.equal(asMember.body.canAdd, false);
  assert.ok(!JSON.stringify((await get("lead", "changes", { id: P1 })).body).includes("30,000"));
  const asFin = (await get("fin", "changes", { id: P1 })).body.changes;
  assert.equal(asFin.find((c) => c.text.startsWith("Client added")).fee_effect, ""); // the lead's attempt was dropped
  assert.equal(asFin.find((c) => c.text.startsWith("New Project")).fee_effect, "+₦30,000");
  assert.equal((await get("lead2", "changes", { id: P1 })).status, 404);

  const one = asFin[0];
  assert.equal((await post("lead", "change-delete", { project_id: P1, id: one.id })).status, 403);
  assert.equal((await post("fin", "change-delete", { project_id: P1, id: one.id })).status, 403);
  assert.equal((await post("mgmt", "change-delete", { project_id: P2, id: one.id })).status, 404);
  assert.equal((await post("mgmt", "change-delete", { project_id: P1, id: one.id })).status, 200);
  assert.equal((await get("fin", "changes", { id: P1 })).body.changes.length, 1);
});
