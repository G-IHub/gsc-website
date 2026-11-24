import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { RETIRED_LIBRARY } from "../api/_hub_defaults.js";

// The 2026-11-24 library clean-up: the five retired documents go once, and only once.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);
const mgmt = (await store.createUser({ email: "m@example.org", name: "m", role: "management", unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
const get = () => handleHub({ method: "GET", action: "library", query: {}, ip: "1", headers: { cookie: makeCookie(mgmt, SECRET).split(";")[0] } }, store, ENV);

test("an existing library loses the five retired documents once; everything else stays", async () => {
  // a library as the live site has it: the old 14 starter documents, plus one of the team's own
  for (const t of [...RETIRED_LIBRARY, "QA Checklist", "Client Agreement: Short Form", "Our own guide"]) {
    await store.saveLibrary({ title: t, category: "x", kind: "Word", audience: "all", description: "", link: "", version: "0.1", owner: "Someone" });
  }
  const titles = (await get()).body.documents.map((d) => d.title);
  for (const t of RETIRED_LIBRARY) assert.ok(!titles.includes(t), `${t} was not removed`);
  for (const t of ["QA Checklist", "Client Agreement: Short Form", "Our own guide"]) assert.ok(titles.includes(t), `${t} was removed`);
  // added again later on purpose: it stays
  await store.saveLibrary({ title: "Project Tracking Template", category: "x", kind: "Excel", audience: "all", description: "", link: "", version: "0.1", owner: "" });
  assert.ok((await get()).body.documents.some((d) => d.title === "Project Tracking Template"));
});

test("a brand-new library never contains the retired documents", async () => {
  const d2 = new PGlite();
  const s2 = { query: async (t, p) => (await d2.query(t, p)).rows };
  await ensureSchema(s2);
  const st = makeStore(s2);
  const u = (await st.createUser({ email: "m@example.org", name: "m", role: "management", unit: "", password_hash: hashPassword("x".repeat(12)) })).id;
  const r = await handleHub({ method: "GET", action: "library", query: {}, ip: "1", headers: { cookie: makeCookie(u, SECRET).split(";")[0] } }, st, ENV);
  assert.equal(r.body.documents.length, 9);
  assert.ok(!r.body.documents.some((d) => RETIRED_LIBRARY.includes(d.title)));
});
