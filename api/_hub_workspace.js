// Research Hub: the per-project Workspace (files as links with versions, discussion, tasks, recent activity).
// Called from _hub_core.js after the person is signed in. Returns null when the action is not a workspace one.
//
// Who: only the people on the project, plus management. Finance and directors do not see the workspace
// unless they are added to the project. Files are LINKS (Google Drive / OneDrive): nothing is uploaded here.

export const FOLDERS = ["Protocol", "Data lists", "Analysis", "Figures", "Drafts", "QA", "Other"];
export const FILE_KINDS = ["Word", "Excel", "PDF", "Notebook", "Zip", "Link", "Other"];
export const FILE_STATUSES = ["in_progress", "final"];
const HTTPS = /^https:\/\/\S+$/i;
const NEWS_EVENTS = ["file_added", "file_version", "comment_added", "update_added", "task_added"];
const WORKSPACE_EVENTS = ["file_added", "file_version", "file_opened", "comment_added", "task_added", "task_done", "member_added", "member_removed"];

export async function handleWorkspace({ action, method, body, query, user, store, memberIds, projectOr404, deny, out, str, isoDate }) {
  const ws = ["my-news", "files", "file-add", "file-version", "file-editing", "file-status", "file-open", "comments", "comment-add", "comment-delete",
    "tasks", "task-add", "task-done", "task-delete", "activity", "my-tasks"];
  if (!ws.includes(action)) return null;

  // Tasks assigned to me across the projects I am on (for the team member's Home)
  if (action === "my-tasks" && method === "GET") {
    const rows = await store.listMyTasks(user.id);
    return out(200, { tasks: rows.filter((t) => user.role === "management" || memberIds.has(t.project_id)) });
  }

  if (action === "my-news" && method === "GET") {
    const since = Date.now() - 14 * 86400000;
    const refs = new Map((await store.listProjects()).map((p) => [p.id, p.ref]));
    const rows = (await store.listLog(500)).filter((l) =>
      NEWS_EVENTS.includes(l.event) && memberIds.has(Number(l.detail?.project)) && l.user_id !== user.id && new Date(l.at).getTime() >= since);
    return out(200, { news: rows.slice(0, 10).map((l) => ({ id: l.id, at: l.at, who: l.who || "", event: l.event, name: l.detail?.name || "", version: l.detail?.version || null, project_id: Number(l.detail.project), ref: refs.get(Number(l.detail.project)) || "" })) });
  }

  const pid = method === "GET" ? query?.id : body.project_id;
  const p = await projectOr404(pid);
  if (!p) return out(404, { error: "Not found" });
  const inWorkspace = user.role === "management" || memberIds.has(p.id);
  if (!inWorkspace) return deny(`workspace ${action}`, { project: p.id });
  const isLead = user.role === "management" || (user.role === "lead" && memberIds.has(p.id));
  const log = (event, extra = {}) => store.log({ user_id: user.id, event, detail: { project: p.id, ...extra } });

  // ---- files ----
  if (action === "files" && method === "GET") {
    const files = await store.listFiles(p.id);
    return out(200, { files: files.map((f) => ({ ...f, canClearEditing: isLead || f.editing_id === user.id })), folders: FOLDERS });
  }
  if (action === "file-add" && method === "POST") {
    const name = str(body.name, 160);
    const link = str(body.link, 1000);
    if (!name) return out(400, { error: "Name the file" });
    if (!HTTPS.test(link)) return out(400, { error: "Paste a share link that starts with https://" });
    const id = await store.addFile(p.id, user.id, {
      name, link, note: str(body.note, 300),
      folder: FOLDERS.includes(body.folder) ? body.folder : "Other",
      kind: FILE_KINDS.includes(body.kind) ? body.kind : "Other",
    });
    await log("file_added", { name });
    return out(200, { ok: true, id });
  }
  const fileOf = async () => {
    const f = Number.isInteger(Number(body.file_id)) ? await store.getFile(Number(body.file_id)) : null;
    return f && f.project_id === p.id ? f : null;
  };
  if (action === "file-version" && method === "POST") {
    const f = await fileOf();
    if (!f) return out(404, { error: "Not found" });
    if (f.editing_id && f.editing_id !== user.id) return out(409, { error: `${f.editing_name} is editing this file` });
    const link = str(body.link, 1000);
    if (!HTTPS.test(link)) return out(400, { error: "Paste a share link that starts with https://" });
    const v = await store.addFileVersion(f.id, user.id, link, str(body.note, 300));
    await store.setFileEditing(f.id, null); // saving a new version ends "editing"
    await log("file_version", { name: f.name, version: v });
    return out(200, { ok: true, version: v });
  }
  if (action === "file-editing" && method === "POST") {
    const f = await fileOf();
    if (!f) return out(404, { error: "Not found" });
    if (body.editing) {
      if (f.editing_id && f.editing_id !== user.id) return out(409, { error: `${f.editing_name} is already editing this file` });
      await store.setFileEditing(f.id, user.id);
    } else {
      if (f.editing_id && f.editing_id !== user.id && !isLead) return deny("clear someone else's editing mark", { project: p.id });
      await store.setFileEditing(f.id, null);
    }
    return out(200, { ok: true });
  }
  if (action === "file-open" && method === "POST") {
    const f = await fileOf();
    if (!f) return out(404, { error: "Not found" });
    const latest = (await store.listFiles(p.id)).find((x) => x.id === f.id);
    await log("file_opened", { name: f.name, version: latest?.version ?? null });
    return out(200, { ok: true });
  }
  if (action === "file-status" && method === "POST") {
    const f = await fileOf();
    if (!f) return out(404, { error: "Not found" });
    if (!FILE_STATUSES.includes(body.status)) return out(400, { error: "Bad status" });
    await store.setFileStatus(f.id, body.status);
    return out(200, { ok: true });
  }

  // ---- discussion ----
  if (action === "comments" && method === "GET") {
    const rows = await store.listComments(p.id);
    return out(200, { comments: rows.map((c) => ({ ...c, canDelete: user.role === "management" || c.author_id === user.id })) });
  }
  if (action === "comment-add" && method === "POST") {
    const text = str(body.text, 3000);
    if (!text) return out(400, { error: "Write something first" });
    const id = await store.addComment(p.id, user.id, text);
    await log("comment_added");
    return out(200, { ok: true, id });
  }
  if (action === "comment-delete" && method === "POST") {
    const c = Number.isInteger(Number(body.id)) ? await store.getComment(Number(body.id)) : null;
    if (!c || c.project_id !== p.id) return out(404, { error: "Not found" });
    if (!(user.role === "management" || c.author_id === user.id)) return deny("delete comment", { project: p.id });
    await store.deleteComment(c.id);
    return out(200, { ok: true });
  }

  // ---- tasks ----
  if (action === "tasks" && method === "GET") {
    const rows = await store.listTasks(p.id);
    return out(200, { tasks: rows.map((t) => ({ ...t, canDelete: isLead || t.created_by === user.id })) });
  }
  if (action === "task-add" && method === "POST") {
    const text = str(body.text, 300);
    if (!text) return out(400, { error: "Describe the task" });
    let assignee = null;
    if (body.assignee_id !== undefined && body.assignee_id !== null && body.assignee_id !== "") {
      assignee = Number(body.assignee_id);
      const members = await store.listMembers(p.id);
      if (!members.some((m) => m.user_id === assignee)) return out(400, { error: "That person is not on this project" });
    }
    const n = body.milestone === undefined || body.milestone === null || body.milestone === "" ? null : Number(body.milestone);
    if (n !== null && !(Number.isInteger(n) && n >= 1 && n <= 14)) return out(400, { error: "Bad milestone" });
    const id = await store.addTask(p.id, user.id, { text, assignee_id: assignee, due: isoDate(body.due), milestone: n });
    await log("task_added", { name: text.slice(0, 80) });
    return out(200, { ok: true, id });
  }
  const taskOf = async () => {
    const t = Number.isInteger(Number(body.id)) ? await store.getTask(Number(body.id)) : null;
    return t && t.project_id === p.id ? t : null;
  };
  if (action === "task-done" && method === "POST") {
    const t = await taskOf();
    if (!t) return out(404, { error: "Not found" });
    await store.setTaskDone(t.id, Boolean(body.done));
    if (body.done) await log("task_done", { name: t.text.slice(0, 80) });
    return out(200, { ok: true });
  }
  if (action === "task-delete" && method === "POST") {
    const t = await taskOf();
    if (!t) return out(404, { error: "Not found" });
    if (!(isLead || t.created_by === user.id)) return deny("delete task", { project: p.id });
    await store.deleteTask(t.id);
    return out(200, { ok: true });
  }

  // ---- recent activity (workspace events only; never money or refusals) ----
  if (action === "activity" && method === "GET") {
    const rows = await store.listLog(500);
    const mine = rows.filter((l) => Number(l.detail?.project) === p.id && WORKSPACE_EVENTS.includes(l.event)).slice(0, 15);
    return out(200, { activity: mine.map((l) => ({ id: l.id, at: l.at, who: l.who || "", event: l.event, name: l.detail?.name || "", version: l.detail?.version || null })) });
  }

  return out(404, { error: "Unknown action" });
}
