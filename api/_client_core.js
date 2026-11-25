import crypto from "node:crypto";
import { hashPassword, newTempPassword, passwordProblem, verifyPassword } from "./_hub_core.js";
import { handleClientDocs, handleStaffDocs } from "./_client_docs.js";
import { handleClientFiles, handleStaffFiles } from "./_client_files.js";

// Genomac SC client portal (part 1): the client's own sign-in, their projects' progress, the updates the team
// chose to share, and a conversation thread with the team. All access decisions live here.
//
// The portal is a separate door from the staff hub:
//   - its own accounts (hub_client_users), its own cookie (gsc_client) signed with its own key ("client:…"),
//     so a client cookie never opens the hub and a staff cookie never opens the portal
//   - a client sees only the projects they were invited to (hub_client_access), and on those only:
//     code, title, stage, target date, the 14 milestones, the team's names and roles, updates marked
//     "share with client" (without the internal Blockers line) and the client thread.
//     Never: health, payment or clearance flags, fees, internal discussion, files, tasks, other projects.
// Switched on only when CLIENT_PORTAL_ENABLED=1 (and the hub itself is on).

export const CLIENT_COOKIE = "gsc_client";
const SESSION_HOURS = 12;
const MAX_FAILURES = 5;

const sign = (payload, secret) => crypto.createHmac("sha256", `client:${secret}`).update(payload).digest("base64url");
export const makeClientCookie = (cid, secret, now = Date.now()) => {
  const payload = Buffer.from(JSON.stringify({ cid, exp: now + SESSION_HOURS * 3600 * 1000 })).toString("base64url");
  return `${CLIENT_COOKIE}=${payload}.${sign(payload, secret)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${SESSION_HOURS * 3600}`;
};
const clearCookie = () => `${CLIENT_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0`;
export const readClientCookie = (header = "", secret, now = Date.now()) => {
  const raw = String(header).split(";").map((c) => c.trim()).find((c) => c.startsWith(`${CLIENT_COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(CLIENT_COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sign(payload, secret));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    return p.exp > now && Number.isInteger(p.cid) ? p.cid : null;
  } catch {
    return null;
  }
};

const str = (v, max) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const out = (status, body, setCookie) => ({ status, body, setCookie });

export async function handleClient(req, store, env = {}) {
  if (String(env.CLIENT_PORTAL_ENABLED ?? "") !== "1" || String(env.HUB_ENABLED ?? "") !== "1" || !env.SESSION_SECRET) {
    return out(503, { error: "The client portal is not switched on" });
  }
  const secret = env.SESSION_SECRET;
  const { method, action } = req;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const ip = String(req.ip || "unknown");
  if (method !== "GET" && String((req.headers || {})["x-requested-with"] ?? "") !== "gsc-client") return out(403, { error: "Forbidden" });

  if (action === "login" && method === "POST") {
    const email = str(body.email, 200).toLowerCase();
    const key = `client:${email}`;
    const f = await store.countFailures(ip, key);
    if (f.ip >= MAX_FAILURES || f.email >= MAX_FAILURES) return out(429, { error: "Too many attempts. Try again in 15 minutes." });
    const c = email ? await store.getClientUserByEmail(email) : null;
    const ok = verifyPassword(typeof body.password === "string" ? body.password : "", c?.password_hash) && Boolean(c) && c.active;
    if (!ok) {
      await store.addFailure(ip, key);
      return out(401, { error: "Wrong email or password" });
    }
    await store.log({ user_id: null, event: "client_login", detail: { client: c.id } });
    return out(200, { ok: true }, makeClientCookie(c.id, secret));
  }
  if (action === "logout" && method === "POST") return out(200, { ok: true }, clearCookie());

  const cid = readClientCookie(req.headers?.cookie, secret);
  const client = cid ? await store.getClientUserById(cid) : null;
  if (!client || !client.active) return out(401, { error: "Not signed in" });
  const mine = new Set(await store.clientProjectIds(client.id));
  const projectOr404 = async (id) => {
    const n = Number(id);
    return Number.isInteger(n) && mine.has(n) ? await store.getProject(n) : null;
  };

  if (action === "me" && method === "GET") {
    return out(200, { client: { id: client.id, name: client.name, email: client.email, organization: client.organization } });
  }

  if (action === "change-password" && method === "POST") {
    const bad = passwordProblem(body.newPassword);
    if (bad) return out(400, { error: bad });
    if (!verifyPassword(String(body.oldPassword ?? ""), client.password_hash)) return out(403, { error: "Current password is wrong" });
    await store.updateClientUser(client.id, { password_hash: hashPassword(body.newPassword) });
    return out(200, { ok: true });
  }

  if (action === "projects" && method === "GET") {
    const list = [];
    for (const id of mine) {
      const p = await store.getProject(id);
      if (!p) continue;
      const ms = await store.listMilestones(id);
      list.push({ id: p.id, ref: p.ref, title: p.title, stage: p.stage, target_date: p.target_date || null, done: ms.filter((m) => m.status === "done").length, total: ms.length || 14 });
    }
    return out(200, { projects: list });
  }

  if (action === "project" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    const ms = await store.listMilestones(p.id);
    const team = (await store.listMembers(p.id)).map((m) => ({ name: m.name, project_role: m.project_role || "" }));
    const updates = (await store.listSharedUpdates(p.id)).map((u) => ({ id: u.id, date: u.date, author: u.author || "Genomac team", done: u.done, next: u.next }));
    const msigs = await store.listMilestoneSignatures(p.id);
    return out(200, {
      project: { id: p.id, ref: p.ref, title: p.title, stage: p.stage, target_date: p.target_date || null },
      milestoneSignatures: msigs.map((x) => ({ n: x.milestone_n, name: x.typed_name, at: x.signed_at })),
      milestones: ms.map((m) => ({ n: m.n, name: m.name, status: m.status, done: m.done, planned: m.planned, signoff: m.signoff, signed: m.signed })),
      team,
      updates,
    });
  }

  const docs = await handleClientDocs({ req, action, method, body, client, store, projectOr404, out, str });
  if (docs) return docs;
  const files = await handleClientFiles({ action, method, req, store, projectOr404, out });
  if (files) return files;

  if (action === "messages" && method === "GET") {
    const p = await projectOr404(req.query?.id);
    if (!p) return out(404, { error: "Not found" });
    const rows = await store.listClientMessages(p.id);
    return out(200, { messages: rows.map((m) => ({ id: m.id, at: m.at, text: m.text, from: m.client_id ? "client" : "team", who: m.client_id ? m.client_name : m.staff_name || "Genomac team", mine: m.client_id === client.id })) });
  }

  if (action === "message-post" && method === "POST") {
    const p = await projectOr404(body.project_id);
    if (!p) return out(404, { error: "Not found" });
    const text = str(body.text, 3000);
    if (!text) return out(400, { error: "Write something first" });
    await store.addClientMessage(p.id, { client_id: client.id, staff_id: null, text });
    await store.log({ user_id: null, event: "client_message", detail: { project: p.id, client: client.id } });
    return out(200, { ok: true });
  }

  return out(404, { error: "Unknown action" });
}

// ---- the team's side, called from the staff hub (_hub_core.js) ----
// Who: reading the client tab = people on the project and management; inviting and removing clients = the project's
// lead or management; writing to the client = anyone on the project or management.
export async function handleClientStaff({ action, method, body, query, user, store, memberIds, projectOr404, deny, out: send, str: s, req }) {
  const sd = await handleStaffDocs({ req: req ?? { query, headers: {}, ip: "" }, action, method, body, user, store, memberIds, projectOr404, deny, out: send, str: s });
  if (sd) return sd;
  const sf = await handleStaffFiles({ action, method, body, query, user, store, memberIds, projectOr404, deny, out: send, str: s });
  if (sf) return sf;
  const acts = ["client-list", "client-invite", "client-revoke", "client-messages", "client-message-post", "update-share"];
  if (!acts.includes(action)) return null;
  const p = await projectOr404(method === "GET" ? query?.id : body.project_id);
  if (!p) return send(404, { error: "Not found" });
  const onProject = memberIds.has(p.id);
  if (!(user.role === "management" || onProject)) return deny(`client ${action}`, { project: p.id });
  const isLead = user.role === "management" || (user.role === "lead" && onProject);
  const log = (event, extra = {}) => store.log({ user_id: user.id, event, detail: { project: p.id, ...extra } });

  if (action === "client-list" && method === "GET") {
    return send(200, { clients: await store.listProjectClients(p.id), canInvite: isLead, portalOn: true });
  }
  if (action === "client-invite" && method === "POST") {
    if (!isLead) return deny("invite client", { project: p.id });
    const email = s(body.email, 200).toLowerCase();
    const name = s(body.name, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) return send(400, { error: "A name and a valid email are needed" });
    if (await store.getUserByEmail(email)) return send(409, { error: "That email belongs to a staff account. Use a different address for the client." });
    let c = await store.getClientUserByEmail(email);
    let tempPassword = null;
    if (!c) {
      tempPassword = newTempPassword();
      c = await store.createClientUser({ email, name, organization: s(body.organization, 160), password_hash: hashPassword(tempPassword) });
    } else if (!c.active) {
      await store.updateClientUser(c.id, { active: true });
    }
    await store.grantClientAccess(c.id, p.id, user.id);
    await log("client_invited", { client: c.id });
    return send(200, { ok: true, client: { id: c.id, email: c.email, name: c.name }, tempPassword, existing: !tempPassword });
  }
  if (action === "client-revoke" && method === "POST") {
    if (!isLead) return deny("remove client", { project: p.id });
    const cid = Number(body.client_id);
    if (!Number.isInteger(cid)) return send(400, { error: "Bad request" });
    await store.revokeClientAccess(cid, p.id);
    await log("client_removed", { client: cid });
    return send(200, { ok: true });
  }
  if (action === "client-messages" && method === "GET") {
    const rows = await store.listClientMessages(p.id);
    return send(200, { messages: rows.map((m) => ({ id: m.id, at: m.at, text: m.text, from: m.client_id ? "client" : "team", who: m.client_id ? m.client_name : m.staff_name || "", mine: m.staff_id === user.id })) });
  }
  if (action === "client-message-post" && method === "POST") {
    const text = s(body.text, 3000);
    if (!text) return send(400, { error: "Write something first" });
    await store.addClientMessage(p.id, { client_id: null, staff_id: user.id, text });
    await log("client_message_team");
    return send(200, { ok: true });
  }
  if (action === "update-share" && method === "POST") {
    const u = Number.isInteger(Number(body.id)) ? await store.getUpdate(Number(body.id)) : null;
    if (!u || u.project_id !== p.id) return send(404, { error: "Not found" });
    if (!(isLead || u.author_id === user.id)) return deny("share update", { project: p.id });
    await store.setUpdateShare(u.id, Boolean(body.share));
    await log(body.share ? "update_shared" : "update_unshared");
    return send(200, { ok: true });
  }
  return send(404, { error: "Unknown action" });
}
