import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { handleClient } from "../api/_client_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { DEFAULT_MILESTONES } from "../api/_hub_defaults.js";

// Client portal part 3: final files, released only after the balance is paid. Planted secret: the share link.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", CLIENT_PORTAL_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role] of [["mgmt", "management"], ["fin", "finance"], ["lead", "lead"], ["memE", "member"], ["coord", "coordinator"], ["lead2", "lead"]]) {
  ids[key] = (await store.createUser({ email: `${key}@example.org`, name: key, role, unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "AMR study", unit: "", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Other study", unit: "", target_date: null })).id;
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "Supporting researcher");
await store.addMember(P1, ids.coord, "Coordinator");
await store.addMember(P2, ids.lead2, "lead");
await store.seedMilestones(P1, DEFAULT_MILESTONES);

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
const LINK = "https://drive.google.com/file/d/SECRET-MANUSCRIPT-LINK-123/view";
const setPay = (s) => store.updateProject(P1, { payment_status: s });

test("the people on the project list the files; outsiders cannot; links must be https", async () => {
  assert.equal((await staff("lead2", "POST", "cfile-save", { body: { project_id: P1, title: "x", link: LINK } })).status, 404);
  assert.equal((await staff("fin", "POST", "cfile-save", { body: { project_id: P1, title: "x", link: LINK } })).status, 403);
  assert.equal((await staff("memE", "POST", "cfile-save", { body: { project_id: P1, title: "Manuscript", link: "javascript:alert(1)" } })).status, 400);
  assert.equal((await staff("memE", "POST", "cfile-save", { body: { project_id: P1, title: "Manuscript final", kind: "Manuscript", version: "v3", link: LINK } })).status, 200);
  assert.equal((await staff("coord", "POST", "cfile-save", { body: { project_id: P1, title: "Figures", kind: "Figures", link: "https://drive.google.com/drive/folders/SECRET-FIG" } })).status, 200);
  const r = await staff("lead", "GET", "cfiles", { query: { id: P1 } });
  assert.equal(r.body.files.length, 2);
  assert.equal(r.body.visible, false);
});

test("before release the client sees the names only — never a link", async () => {
  const r = await portal(C1, "GET", "files", { query: { id: P1 } });
  assert.equal(r.status, 200);
  assert.equal(r.body.released, false);
  assert.deepEqual(r.body.files.map((f) => f.title), ["Manuscript final", "Figures"]);
  const t = JSON.stringify(r.body);
  for (const s of ["SECRET", "drive.google", "link"]) assert.ok(!t.includes(s), `leaked: ${s}`);
  assert.equal((await portal(C2, "GET", "files", { query: { id: P1 } })).status, 404);
});

test("release: lead / coordinator / management only, and only once the balance is marked paid", async () => {
  await setPay("balance_due");
  assert.equal((await staff("lead", "POST", "cfiles-release", { body: { project_id: P1 } })).status, 409);
  await setPay("paid");
  assert.equal((await staff("memE", "POST", "cfiles-release", { body: { project_id: P1 } })).status, 403);
  assert.equal((await staff("fin", "POST", "cfiles-release", { body: { project_id: P1 } })).status, 403);
  assert.equal((await staff("coord", "POST", "cfiles-release", { body: { project_id: P1 } })).status, 200);
  assert.equal((await staff("lead", "POST", "cfiles-release", { body: { project_id: P1 } })).status, 409);
  const step12 = (await store.listMilestones(P1)).find((m) => m.n === 12);
  assert.equal(step12.status, "done");
  const r = await portal(C1, "GET", "files", { query: { id: P1 } });
  assert.equal(r.body.released, true);
  assert.equal(r.body.files[0].link, LINK);
  // the other client still sees nothing
  const own = await portal(C2, "GET", "files", { query: { id: P2 } });
  assert.deepEqual([own.status, own.body.files], [200, []]);
  assert.equal((await portal(C2, "GET", "files", { query: { id: P1 } })).status, 404);
});

test("if the payment flag moves away from paid, the links disappear again; management can withdraw", async () => {
  await setPay("balance_due");
  let r = await portal(C1, "GET", "files", { query: { id: P1 } });
  assert.equal(r.body.released, false);
  assert.ok(!JSON.stringify(r.body).includes("SECRET"));
  await setPay("paid");
  assert.equal((await portal(C1, "GET", "files", { query: { id: P1 } })).body.released, true);
  // after release only management removes a file; others replace the link
  const f = (await staff("lead", "GET", "cfiles", { query: { id: P1 } })).body.files[1];
  assert.equal((await staff("lead", "POST", "cfile-delete", { body: { project_id: P1, id: f.id } })).status, 409);
  assert.equal((await staff("lead", "POST", "cfiles-withdraw", { body: { project_id: P1 } })).status, 403);
  assert.equal((await staff("mgmt", "POST", "cfiles-withdraw", { body: { project_id: P1 } })).status, 200);
  r = await portal(C1, "GET", "files", { query: { id: P1 } });
  assert.equal(r.body.released, false);
  assert.ok(!JSON.stringify(r.body).includes("SECRET"));
});
