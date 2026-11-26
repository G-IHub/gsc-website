import { clientRecipients } from "./_client_notify.js";

// Client portal part 3: the final files (deliverables), released to the client only after the balance is paid.
//
// Rules (enforced here, for both doors):
//   - The people on the project list the final files (title, kind, note, version, a share link to the team's own
//     Google Drive / OneDrive). Files themselves stay in the team's drive; the portal only hands out the link.
//   - Before release the client sees the list of file NAMES only (so they know what is coming) — never a link.
//   - Release = the project lead, a coordinator on the project, or management; refused unless the project's
//     payment flag is "paid". Releasing marks step 12 "Final files released" done (so the client can sign it off).
//   - Links reach the client only while BOTH hold: released, and the payment flag is still "paid" (if finance
//     later moves the flag back, the links disappear again). Management can withdraw a release.

export const FILE_KINDS = ["Manuscript", "Figures", "Tables", "Source Data", "Code", "Protocol", "Software record", "Other"];
const RELEASE_STEP = 12;

const linkOk = (s) => /^https:\/\/[^\s]+$/.test(s) && s.length <= 2000;
const fileView = (f, withLink) => ({
  id: f.id, title: f.title, kind: f.kind, note: f.note, version: f.version, updated: f.updated,
  ...(withLink ? { link: f.link } : {}),
});

export const filesOpen = (p, release) => Boolean(release) && p.payment_status === "paid";

// ---------------- the client's side ----------------
export async function handleClientFiles({ action, method, req, store, projectOr404, out }) {
  if (action !== "files" || method !== "GET") return null;
  const p = await projectOr404(req.query?.id);
  if (!p) return out(404, { error: "Not found" });
  const release = await store.getRelease(p.id);
  const open = filesOpen(p, release);
  const files = await store.listDeliverables(p.id);
  return out(200, {
    released: open,
    released_at: open ? release.released_at : null,
    files: files.map((f) => (open ? fileView(f, true) : { id: f.id, title: f.title, kind: f.kind })),
  });
}

// ---------------- the team's side (called from the hub) ----------------
export async function handleStaffFiles({ action, method, body, query, user, store, memberIds, projectOr404, deny, out, str, notify = async () => 0 }) {
  const acts = ["cfiles", "cfile-save", "cfile-delete", "cfiles-release", "cfiles-withdraw"];
  if (!acts.includes(action)) return null;
  const p = await projectOr404(method === "GET" ? query?.id : body.project_id);
  if (!p) return out(404, { error: "Not found" });
  const onProject = memberIds.has(p.id);
  if (!(user.role === "management" || onProject)) return deny(`client files ${action}`, { project: p.id });
  const canRelease = user.role === "management" || (onProject && ["lead", "coordinator"].includes(user.role));
  const log = (event, extra = {}) => store.log({ user_id: user.id, event, detail: { project: p.id, ...extra } });

  if (action === "cfiles" && method === "GET") {
    const release = await store.getRelease(p.id);
    return out(200, {
      files: (await store.listDeliverables(p.id)).map((f) => ({ ...fileView(f, true), added_by: f.added_by })),
      release: release ? { at: release.released_at, by: release.released_by } : null,
      paid: p.payment_status === "paid",
      visible: filesOpen(p, release),
      canRelease,
      canWithdraw: user.role === "management",
      kinds: FILE_KINDS,
    });
  }
  if (action === "cfile-save" && method === "POST") {
    const title = str(body.title, 160);
    const link = str(body.link, 2000);
    const kind = FILE_KINDS.includes(body.kind) ? body.kind : "Other";
    if (!title) return out(400, { error: "Give the file a name" });
    if (!linkOk(link)) return out(400, { error: "Paste the file's share link (starting with https://)" });
    const f = { title, kind, link, note: str(body.note, 500), version: str(body.version, 40) };
    if (body.id) {
      const cur = (await store.listDeliverables(p.id)).find((x) => x.id === Number(body.id));
      if (!cur) return out(404, { error: "Not found" });
      await store.updateDeliverable(cur.id, f);
      await log("cfile_updated", { file: cur.id });
    } else {
      const id = await store.addDeliverable(p.id, { ...f, by: user.id });
      await log("cfile_added", { file: id });
    }
    return out(200, { ok: true });
  }
  if (action === "cfile-delete" && method === "POST") {
    const cur = (await store.listDeliverables(p.id)).find((x) => x.id === Number(body.id));
    if (!cur) return out(404, { error: "Not found" });
    if ((await store.getRelease(p.id)) && user.role !== "management") return out(409, { error: "These files are released. Replace the link instead, or ask management to remove it." });
    await store.deleteDeliverable(cur.id);
    await log("cfile_deleted", { file: cur.id });
    return out(200, { ok: true });
  }
  if (action === "cfiles-release" && method === "POST") {
    if (!canRelease) return deny("release client files", { project: p.id });
    if (p.payment_status !== "paid") return out(409, { error: "The balance is not marked paid yet. Finance marks it paid first; then the files can be released." });
    if (!(await store.listDeliverables(p.id)).length) return out(400, { error: "Add the final files first" });
    if (await store.getRelease(p.id)) return out(409, { error: "Already released" });
    await store.setRelease(p.id, user.id);
    const step = (await store.listMilestones(p.id)).find((m) => m.n === RELEASE_STEP);
    if (step && step.status !== "done") await store.updateMilestone(p.id, RELEASE_STEP, { status: "done", done: new Date().toISOString().slice(0, 10) });
    await log("cfiles_released");
    await notify("files_released", p, await clientRecipients(store, p.id));
    return out(200, { ok: true });
  }
  if (action === "cfiles-withdraw" && method === "POST") {
    if (user.role !== "management") return deny("withdraw client files", { project: p.id });
    await store.clearRelease(p.id);
    await log("cfiles_withdrawn");
    return out(200, { ok: true });
  }
  return out(404, { error: "Unknown action" });
}
