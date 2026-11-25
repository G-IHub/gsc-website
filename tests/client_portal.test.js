import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { handleClient, makeClientCookie } from "../api/_client_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Client portal part 1. Planted secrets: a fee, an internal blocker, an internal discussion line and a client
// contact that must never reach a client of ANOTHER project. Own empty database.
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
const P1 = (await store.createProject({ ref: "GH-1", title: "AMR study", unit: "", target_date: "2026-12-30" })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Other client's study", unit: "", target_date: null })).id;
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "Supporting researcher");
await store.addMember(P2, ids.lead2, "lead");
await store.setMoney(P1, { fee: 987654.32, paid: 1, currency: "NGN" });
await store.setClient(P2, { name: "Rival Client", contact: "rival@secret.example" });
await store.addComment(P1, ids.lead, "INTERNAL: client is slow to pay");

const staff = (as, method, action, { query = {}, body } = {}) =>
  handleHub({ method, action, query, body, ip: "1", headers: { cookie: makeCookie(ids[as], SECRET).split(";")[0], ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } }, store, ENV);
const portal = (cookie, method, action, { query = {}, body } = {}, env = ENV) =>
  handleClient({ method, action, query, body, ip: "2", headers: { ...(cookie ? { cookie } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-client" } : {}) } }, store, env);

let clientCookie = "";
let clientId = 0;
let otherCookie = "";

test("switched off unless CLIENT_PORTAL_ENABLED=1", async () => {
  assert.equal((await portal(null, "GET", "me", {}, { HUB_ENABLED: "1", SESSION_SECRET: SECRET })).status, 503);
});

test("inviting: only the project's lead or management; staff emails refused", async () => {
  assert.equal((await staff("memE", "POST", "client-invite", { body: { project_id: P1, email: "dr@client.example", name: "Dr Client" } })).status, 403);
  assert.equal((await staff("lead2", "POST", "client-invite", { body: { project_id: P1, email: "dr@client.example", name: "Dr Client" } })).status, 404);
  assert.equal((await staff("lead", "POST", "client-invite", { body: { project_id: P1, email: "fin@example.org", name: "x" } })).status, 409);
  const r = await staff("lead", "POST", "client-invite", { body: { project_id: P1, email: "Dr@Client.example", name: "Dr Client", organization: "Uni" } });
  assert.equal(r.status, 200);
  assert.ok(r.body.tempPassword.length >= 12);
  clientId = r.body.client.id;
  const login = await portal(null, "POST", "login", { body: { email: "dr@client.example", password: r.body.tempPassword } });
  assert.equal(login.status, 200);
  clientCookie = login.setCookie.split(";")[0];
  // the second project's client
  const o = await staff("lead2", "POST", "client-invite", { body: { project_id: P2, email: "rival@client.example", name: "Rival" } });
  otherCookie = (await portal(null, "POST", "login", { body: { email: "rival@client.example", password: o.body.tempPassword } })).setCookie.split(";")[0];
  // inviting an existing client to a second project gives no new password
  const again = await staff("mgmt", "POST", "client-invite", { body: { project_id: P2, email: "dr@client.example", name: "Dr Client" } });
  assert.equal(again.body.existing, true);
  assert.equal(again.body.tempPassword, null);
  await staff("mgmt", "POST", "client-revoke", { body: { project_id: P2, client_id: clientId } });
});

test("the two doors never mix: a client cookie does not open the hub, a staff cookie does not open the portal", async () => {
  assert.equal((await handleHub({ method: "GET", action: "me", query: {}, ip: "1", headers: { cookie: clientCookie } }, store, ENV)).status, 401);
  assert.equal((await portal(makeCookie(ids.mgmt, SECRET).split(";")[0], "GET", "me")).status, 401);
  // a forged client cookie signed with the hub key is refused
  const hubSigned = makeCookie(clientId, SECRET).split(";")[0].replace("gsc_hub=", "gsc_client=");
  assert.equal((await portal(hubSigned, "GET", "me")).status, 401);
  assert.equal((await portal(makeClientCookie(clientId, "other-secret").split(";")[0], "GET", "me")).status, 401);
});

test("a client sees only their own project, and none of the internal parts", async () => {
  const list = (await portal(clientCookie, "GET", "projects")).body.projects;
  assert.deepEqual(list.map((p) => p.ref), ["GH-1"]);
  assert.equal((await portal(clientCookie, "GET", "project", { query: { id: P2 } })).status, 404);
  assert.equal((await portal(clientCookie, "GET", "messages", { query: { id: P2 } })).status, 404);
  assert.equal((await portal(clientCookie, "POST", "message-post", { body: { project_id: P2, text: "hi" } })).status, 404);
  const one = await portal(clientCookie, "GET", "project", { query: { id: P1 } });
  assert.equal(one.status, 200);
  const text = JSON.stringify(one.body);
  for (const secret of ["987654", "INTERNAL", "Rival", "rival@secret", "payment_status", "health", "fee"]) assert.ok(!text.includes(secret), `leaked: ${secret}`);
  assert.deepEqual(one.body.team.map((t) => t.name).sort(), ["lead", "memE"]);
  // staff actions are not reachable through the portal
  // ("files" and "payments" in the portal are the client's own final files and payments, parts 3 and 4; see client_files / client_payments tests)
  for (const a of ["money", "users", "comments", "clearance", "tasks", "changes"]) assert.equal((await portal(clientCookie, "GET", a, { query: { id: P1 } })).status, 404, a);
});

test("updates reach the client only when shared, and without the Blockers line", async () => {
  await staff("lead", "POST", "update-add", { body: { project_id: P1, done: "Internal only", blockers: "SECRET-BLOCKER" } });
  await staff("lead", "POST", "update-add", { body: { project_id: P1, done: "Analysis finished", next: "Draft figures", blockers: "SECRET-BLOCKER-2", share_client: true } });
  let u = (await portal(clientCookie, "GET", "project", { query: { id: P1 } })).body.updates;
  assert.deepEqual(u.map((x) => x.done), ["Analysis finished"]);
  assert.ok(!JSON.stringify(u).includes("SECRET-BLOCKER"));
  // share the first one later; only its author, the lead or management may
  const internal = (await staff("lead", "GET", "updates", { query: { id: P1 } })).body.updates.find((x) => x.done === "Internal only");
  assert.equal((await staff("memE", "POST", "update-share", { body: { project_id: P1, id: internal.id, share: true } })).status, 403);
  assert.equal((await staff("lead", "POST", "update-share", { body: { project_id: P1, id: internal.id, share: true } })).status, 200);
  u = (await portal(clientCookie, "GET", "project", { query: { id: P1 } })).body.updates;
  assert.equal(u.length, 2);
  // the other project's client sees none of it
  assert.equal((await portal(otherCookie, "GET", "project", { query: { id: P1 } })).status, 404);
});

test("the client thread: client and team talk; each side sees the same thread; outsiders cannot", async () => {
  assert.equal((await portal(clientCookie, "POST", "message-post", { body: { project_id: P1, text: "When is the draft due?" } })).status, 200);
  assert.equal((await staff("memE", "POST", "client-message-post", { body: { project_id: P1, text: "Friday." } })).status, 200);
  const c = (await portal(clientCookie, "GET", "messages", { query: { id: P1 } })).body.messages;
  assert.deepEqual(c.map((m) => [m.from, m.text]), [["client", "When is the draft due?"], ["team", "Friday."]]);
  assert.equal(c[0].mine, true);
  const t = (await staff("lead", "GET", "client-messages", { query: { id: P1 } })).body.messages;
  assert.equal(t.length, 2);
  assert.equal((await staff("fin", "GET", "client-messages", { query: { id: P1 } })).status, 403); // not on the project
  assert.equal((await staff("lead2", "GET", "client-messages", { query: { id: P1 } })).status, 404);
  assert.ok(!JSON.stringify(c).includes("INTERNAL"), "the internal discussion leaked into the client thread");
});

test("removing a client ends their access at once; a switched-off account cannot sign in", async () => {
  assert.equal((await staff("memE", "POST", "client-revoke", { body: { project_id: P1, client_id: clientId } })).status, 403);
  assert.equal((await staff("lead", "POST", "client-revoke", { body: { project_id: P1, client_id: clientId } })).status, 200);
  assert.equal((await portal(clientCookie, "GET", "project", { query: { id: P1 } })).status, 404);
  assert.deepEqual((await portal(clientCookie, "GET", "projects")).body.projects, []);
  await store.updateClientUser(clientId, { active: false });
  assert.equal((await portal(clientCookie, "GET", "me")).status, 401);
});
