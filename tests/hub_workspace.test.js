import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword, makeCookie } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

// Project workspace: files (links with versions and an editing mark), discussion, tasks, activity. Own empty database.
const SECRET = "test-secret-test-secret-test-secret";
const ENV = { HUB_ENABLED: "1", SESSION_SECRET: SECRET };
const db = new PGlite();
const sql = { query: async (t, p) => (await db.query(t, p)).rows };
await ensureSchema(sql);
const store = makeStore(sql);

const ids = {};
for (const [key, role, unit] of [["mgmt", "management", ""], ["fin", "finance", ""], ["dir", "director", "Lab"], ["lead", "lead", ""], ["memE", "member", ""], ["memF", "member", ""], ["memX", "member", ""]]) {
  ids[key] = (await store.createUser({ email: `${key.toLowerCase()}@example.org`, name: key, role, unit, password_hash: hashPassword("x".repeat(12)) })).id;
}
const P1 = (await store.createProject({ ref: "GH-1", title: "One", unit: "Lab", target_date: null })).id;
const P2 = (await store.createProject({ ref: "GH-2", title: "Two", unit: "Other", target_date: null })).id;
await store.setMoney(P1, { fee: 987654.32, paid: 1, currency: "NGN" });
await store.addMember(P1, ids.lead, "lead");
await store.addMember(P1, ids.memE, "supporting");
await store.addMember(P1, ids.memF, "quality reviewer");
await store.addMember(P2, ids.memX, "supporting");

const call = (as, method, action, { query = {}, body } = {}) =>
  handleHub(
    { method, action, query, body, ip: "1.1.1.1", headers: { ...(as ? { cookie: makeCookie(ids[as], SECRET).split(";")[0] } : {}), ...(method === "POST" ? { "x-requested-with": "gsc-hub" } : {}) } },
    store,
    ENV,
  );
const get = (as, action, query) => call(as, "GET", action, { query });
const post = (as, action, body) => call(as, "POST", action, { body });
const LINK = "https://drive.example.org/file/abc";

test("workspace: only the people on the project and management get in", async () => {
  for (const a of ["files", "comments", "tasks", "activity"]) {
    assert.equal((await get("memE", a, { id: P1 })).status, 200, a);
    assert.equal((await get("mgmt", a, { id: P1 })).status, 200, a);
    assert.equal((await get("fin", a, { id: P1 })).status, 403, `finance ${a}`); // sees the project, not the workspace
    assert.equal((await get("dir", a, { id: P1 })).status, 403, `director ${a}`); // same
    assert.equal((await get("memX", a, { id: P1 })).status, 404, `outsider ${a}`);
    assert.equal((await get(null, a, { id: P1 })).status, 401);
  }
  assert.equal((await post("fin", "comment-add", { project_id: P1, text: "hi" })).status, 403);
  assert.equal((await post("memX", "file-add", { project_id: P1, name: "x", link: LINK })).status, 404);
});

test("files: links only, versions add up, and the editing mark stops a clash", async () => {
  assert.equal((await post("memE", "file-add", { project_id: P1, name: "Draft", link: "javascript:alert(1)" })).status, 400);
  assert.equal((await post("memE", "file-add", { project_id: P1, name: "Draft", link: "http://x.example.org" })).status, 400);
  assert.equal((await post("memE", "file-add", { project_id: P1, name: "", link: LINK })).status, 400);
  const add = await post("memE", "file-add", { project_id: P1, name: "Manuscript draft", folder: "Drafts", kind: "Word", link: LINK });
  assert.equal(add.status, 200);
  const fid = add.body.id;
  let f = (await get("lead", "files", { id: P1 })).body.files[0];
  assert.equal(f.version, 1);
  assert.equal(f.folder, "Drafts");
  assert.equal(f.by_name, "memE");

  assert.equal((await post("lead", "file-editing", { project_id: P1, file_id: fid, editing: true })).status, 200);
  const clash = await post("memE", "file-version", { project_id: P1, file_id: fid, link: LINK + "2" });
  assert.equal(clash.status, 409);
  assert.match(clash.body.error, /lead is editing/);
  assert.equal((await post("memE", "file-editing", { project_id: P1, file_id: fid, editing: true })).status, 409);
  assert.equal((await post("memE", "file-editing", { project_id: P1, file_id: fid, editing: false })).status, 403); // cannot clear someone else's mark
  assert.equal((await post("lead", "file-version", { project_id: P1, file_id: fid, link: LINK + "v2", note: "tightened the Discussion" })).status, 200);
  f = (await get("memE", "files", { id: P1 })).body.files[0];
  assert.equal(f.version, 2);
  assert.equal(f.editing_id, null); // saving a version ends the editing mark
  assert.equal(f.link, LINK + "v2");
  // management can clear a forgotten mark
  await post("memE", "file-editing", { project_id: P1, file_id: fid, editing: true });
  assert.equal((await post("mgmt", "file-editing", { project_id: P1, file_id: fid, editing: false })).status, 200);
  assert.equal((await post("memE", "file-status", { project_id: P1, file_id: fid, status: "final" })).status, 200);
  assert.equal((await post("memE", "file-status", { project_id: P1, file_id: fid, status: "stolen" })).status, 400);
  // a file of P1 cannot be touched through P2
  assert.equal((await post("memX", "file-version", { project_id: P2, file_id: fid, link: LINK })).status, 404);
  assert.equal((await post("mgmt", "file-version", { project_id: P2, file_id: fid, link: LINK })).status, 404);
});

test("discussion: anyone in the workspace posts; only the author or management removes", async () => {
  assert.equal((await post("memE", "comment-add", { project_id: P1, text: "  " })).status, 400);
  const c1 = (await post("memF", "comment-add", { project_id: P1, text: "Figure 3 says n=48 but Results say 46." })).body.id;
  await post("memE", "comment-add", { project_id: P1, text: "46 is right; fixing the legend." });
  const list = (await get("lead", "comments", { id: P1 })).body.comments;
  assert.deepEqual(list.map((c) => c.author), ["memF", "memE"]); // oldest first, like a conversation
  assert.equal((await post("memE", "comment-delete", { project_id: P1, id: c1 })).status, 403);
  assert.equal((await post("lead", "comment-delete", { project_id: P1, id: c1 })).status, 403);
  assert.equal((await post("mgmt", "comment-delete", { project_id: P2, id: c1 })).status, 404);
  assert.equal((await post("memF", "comment-delete", { project_id: P1, id: c1 })).status, 200);
  assert.equal((await get("lead", "comments", { id: P1 })).body.comments.length, 1);
});

test("tasks: assign only to people on the project; my tasks; who removes", async () => {
  assert.equal((await post("memE", "task-add", { project_id: P1, text: "" })).status, 400);
  assert.equal((await post("lead", "task-add", { project_id: P1, text: "x", assignee_id: ids.memX })).status, 400); // not on P1
  assert.equal((await post("lead", "task-add", { project_id: P1, text: "x", milestone: 99 })).status, 400);
  const t1 = (await post("lead", "task-add", { project_id: P1, text: "Fix the Figure 3 legend", assignee_id: ids.memE, due: "2026-11-25", milestone: 9 })).body.id;
  const t2 = (await post("memE", "task-add", { project_id: P1, text: "Check the sample list" })).body.id;
  const mine = (await get("memE", "my-tasks")).body.tasks;
  assert.deepEqual(mine.map((t) => t.text), ["Fix the Figure 3 legend"]);
  assert.equal(mine[0].ref, "GH-1");
  assert.equal((await post("memF", "task-done", { project_id: P1, id: t1, done: true })).status, 200);
  assert.equal((await get("memE", "my-tasks")).body.tasks.length, 0); // done tasks drop off
  assert.equal((await post("memF", "task-delete", { project_id: P1, id: t1 })).status, 403); // not the creator, not the lead
  assert.equal((await post("memE", "task-delete", { project_id: P1, id: t2 })).status, 200); // creator
  assert.equal((await post("lead", "task-delete", { project_id: P1, id: t1 })).status, 200); // lead
  assert.equal((await post("memX", "task-done", { project_id: P2, id: t1, done: false })).status, 404);
});

test("opening a file is recorded in the workspace activity (people in the workspace only)", async () => {
  const fid = (await get("memE", "files", { id: P1 })).body.files[0].id;
  assert.equal((await post("fin", "file-open", { project_id: P1, file_id: fid })).status, 403);
  assert.equal((await post("memX", "file-open", { project_id: P1, file_id: fid })).status, 404);
  assert.equal((await post("memF", "file-open", { project_id: P1, file_id: fid })).status, 200);
  const a = (await get("lead", "activity", { id: P1 })).body.activity;
  const opened = a.find((x) => x.event === "file_opened");
  assert.equal(opened.who, "memF");
  assert.equal(opened.name, "Manuscript draft");
  assert.equal(opened.version, 2);
});

test("activity: workspace events only, never money or refusals", async () => {
  await get("mgmt", "money", { id: P1 }); // a money read, which must not appear
  await get("fin", "files", { id: P1 }); // a refusal, which must not appear
  const a = (await get("memE", "activity", { id: P1 })).body.activity;
  assert.ok(a.length > 0);
  const events = new Set(a.map((x) => x.event));
  assert.ok(events.has("file_added") && events.has("file_version") && events.has("comment_added") && events.has("task_added"));
  assert.ok(!events.has("money_read") && !events.has("denied"));
  assert.ok(!/987654|"fee"|"paid"/.test(JSON.stringify(a)));
});
