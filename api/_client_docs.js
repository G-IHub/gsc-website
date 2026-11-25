import crypto from "node:crypto";
import { DOC_TEMPLATES } from "../shared/docTemplates.js";
import { cleanIntake } from "../shared/intakeForm.js";

// Client portal part 2: documents, online signing, milestone sign-offs and the online intake form.
//
// Rules (enforced here, for both doors):
//   - The team (project lead or management) writes documents; a client sees a document only after it is SENT.
//   - Every document has numbered versions. A version that anyone has signed never changes: any edit after
//     sending (or after a signature) makes a new version, which needs signing again.
//   - Signing = typed full name + "I agree", only on the LATEST version, once per signer. The server stores
//     date and time, IP address, browser and a SHA-256 fingerprint of the exact text that was signed.
//   - Agreements and Project Sheets need a Genomac countersignature (management only), after the client signs.
//   - Milestone sign-offs: the client signs a step that has a client sign-off and is marked done.
//   - The intake form: the client fills it in (draft, then submit); the people on the project read it.

export const fingerprint = (docId, version, title, body) =>
  crypto.createHash("sha256").update(`${docId}\n${version}\n${title}\n${body}`).digest("hex");
const milestonePrint = (pid, n, name, done) => crypto.createHash("sha256").update(`milestone\n${pid}\n${n}\n${name}\n${done ?? ""}`).digest("hex");

const statusOf = (doc, latest, sigs) => {
  const clientSig = sigs.find((s) => s.version === latest.version && s.signer === "client");
  const gSig = sigs.find((s) => s.version === latest.version && s.signer === "genomac");
  if (!doc.sent) return "draft";
  if (!clientSig) return "awaiting_client";
  if (doc.countersign && !gSig) return "awaiting_genomac";
  return "complete";
};

const docView = async (store, doc, { forClient }) => {
  const versions = await store.listDocVersions(doc.id);
  const latest = versions[versions.length - 1];
  const sigs = await store.listSignatures({ doc_id: doc.id });
  const comments = await store.listDocComments(doc.id);
  return {
    id: doc.id, kind: doc.kind, title: doc.title, countersign: doc.countersign, sent: doc.sent,
    version: latest.version, body: latest.body, hash: latest.hash, updated: latest.created,
    status: statusOf(doc, latest, sigs),
    versions: versions.map((v) => ({ version: v.version, created: v.created, hash: v.hash, signed: sigs.some((s) => s.version === v.version) })),
    signatures: sigs.map((s) => ({ version: s.version, signer: s.signer, name: s.typed_name, at: s.signed_at, hash: s.hash, ...(forClient ? {} : { ip: s.ip }) })),
    comments: comments.map((c) => ({ id: c.id, at: c.at, text: c.text, from: c.client_id ? "client" : "team", who: c.client_id ? c.client_name : c.staff_name })),
  };
};

const ua = (req) => String((req.headers || {})["user-agent"] ?? "").slice(0, 300);

// ---------------- the client's side ----------------
export async function handleClientDocs({ req, action, method, body, client, store, projectOr404, out, str }) {
  const acts = ["docs", "doc", "doc-sign", "doc-comment", "milestone-sign", "intake", "intake-save"];
  if (!acts.includes(action)) return null;
  const p = await projectOr404(method === "GET" ? req.query?.id : body.project_id);
  if (!p) return out(404, { error: "Not found" });
  const log = (event, extra = {}) => store.log({ user_id: null, event, detail: { project: p.id, client: client.id, ...extra } });
  const sentDoc = async (id) => {
    const d = Number.isInteger(Number(id)) ? await store.getDocument(Number(id)) : null;
    return d && d.project_id === p.id && d.sent ? d : null;
  };

  if (action === "docs" && method === "GET") {
    const docs = (await store.listDocuments(p.id)).filter((d) => d.sent);
    const list = [];
    for (const d of docs) {
      const v = await docView(store, d, { forClient: true });
      list.push({ id: v.id, title: v.title, kind: v.kind, version: v.version, status: v.status, updated: v.updated });
    }
    return out(200, { documents: list });
  }
  if (action === "doc" && method === "GET") {
    const d = await sentDoc(req.query?.doc);
    if (!d) return out(404, { error: "Not found" });
    return out(200, { document: await docView(store, d, { forClient: true }), project: { ref: p.ref, title: p.title } });
  }
  if (action === "doc-sign" && method === "POST") {
    const d = await sentDoc(body.doc_id);
    if (!d) return out(404, { error: "Not found" });
    const versions = await store.listDocVersions(d.id);
    const latest = versions[versions.length - 1];
    if (Number(body.version) !== latest.version) return out(409, { error: "This document has a newer version. Please read it again before signing." });
    const name = str(body.typed_name, 120);
    if (name.length < 3 || body.agree !== true) return out(400, { error: "Type your full name and tick that you agree" });
    if ((await store.listSignatures({ doc_id: d.id })).some((s) => s.version === latest.version && s.signer === "client")) return out(409, { error: "Already signed" });
    await store.addSignature({ project_id: p.id, doc_id: d.id, version: latest.version, milestone_n: null, signer: "client", client_id: client.id, staff_id: null, typed_name: name, ip: String(req.ip || ""), user_agent: ua(req), hash: latest.hash });
    await log("doc_signed_client", { doc: d.id, version: latest.version });
    return out(200, { document: await docView(store, d, { forClient: true }) });
  }
  if (action === "doc-comment" && method === "POST") {
    const d = await sentDoc(body.doc_id);
    if (!d) return out(404, { error: "Not found" });
    const text = str(body.text, 3000);
    if (!text) return out(400, { error: "Write your comment first" });
    await store.addDocComment(d.id, { client_id: client.id, staff_id: null, text });
    await log("doc_comment_client", { doc: d.id });
    return out(200, { document: await docView(store, d, { forClient: true }) });
  }
  if (action === "milestone-sign" && method === "POST") {
    const n = Number(body.n);
    const m = (await store.listMilestones(p.id)).find((x) => x.n === n);
    if (!m || !m.signoff) return out(404, { error: "This step has no client sign-off" });
    if (m.status !== "done") return out(409, { error: "Your team has not marked this step done yet" });
    if (m.signed) return out(409, { error: "Already signed off" });
    const name = str(body.typed_name, 120);
    if (name.length < 3 || body.agree !== true) return out(400, { error: "Type your full name and tick that you agree" });
    await store.updateMilestone(p.id, n, { signed: true });
    await store.addSignature({ project_id: p.id, doc_id: null, version: null, milestone_n: n, signer: "client", client_id: client.id, staff_id: null, typed_name: name, ip: String(req.ip || ""), user_agent: ua(req), hash: milestonePrint(p.id, n, m.name, m.done) });
    await log("milestone_signed_client", { n });
    return out(200, { ok: true });
  }
  if (action === "intake" && method === "GET") {
    return out(200, { intake: (await store.getIntake(p.id)) || { data: {}, submitted_at: null } });
  }
  if (action === "intake-save" && method === "POST") {
    const prev = await store.getIntake(p.id);
    if (prev?.submitted_at) return out(409, { error: "Already sent. Ask your team in the messages if something needs changing." });
    const { data, missing } = cleanIntake(body.data);
    if (body.submit && missing.length) return out(400, { error: `Please complete: ${missing.join(", ")}`, missing });
    await store.saveIntake(p.id, data, Boolean(body.submit));
    if (body.submit) await log("intake_submitted");
    return out(200, { intake: await store.getIntake(p.id) });
  }
  return out(404, { error: "Unknown action" });
}

// ---------------- the team's side (called from the hub) ----------------
export async function handleStaffDocs({ req, action, method, body, user, store, memberIds, projectOr404, deny, out, str }) {
  const acts = ["cdocs", "cdoc", "cdoc-create", "cdoc-edit", "cdoc-send", "cdoc-countersign", "cdoc-comment", "cintake", "cintake-reopen", "cdoc-templates"];
  if (!acts.includes(action)) return null;
  if (action === "cdoc-templates" && method === "GET") {
    return out(200, { templates: Object.entries(DOC_TEMPLATES).map(([kind, t]) => ({ kind, title: t.title, countersign: t.countersign })) });
  }
  const p = await projectOr404(method === "GET" ? req.query?.id : body.project_id);
  if (!p) return out(404, { error: "Not found" });
  const onProject = memberIds.has(p.id);
  if (!(user.role === "management" || onProject)) return deny(`client documents ${action}`, { project: p.id });
  const isLead = user.role === "management" || (user.role === "lead" && onProject);
  const log = (event, extra = {}) => store.log({ user_id: user.id, event, detail: { project: p.id, ...extra } });
  const docOf = async (id) => {
    const d = Number.isInteger(Number(id)) ? await store.getDocument(Number(id)) : null;
    return d && d.project_id === p.id ? d : null;
  };

  if (action === "cdocs" && method === "GET") {
    const list = [];
    for (const d of await store.listDocuments(p.id)) {
      const v = await docView(store, d, { forClient: false });
      list.push({ id: v.id, title: v.title, kind: v.kind, version: v.version, status: v.status, updated: v.updated, sent: v.sent });
    }
    return out(200, { documents: list, canWrite: isLead, canCountersign: user.role === "management" });
  }
  if (action === "cdoc" && method === "GET") {
    const d = await docOf(req.query?.doc);
    if (!d) return out(404, { error: "Not found" });
    return out(200, { document: await docView(store, d, { forClient: false }), project: { ref: p.ref, title: p.title }, canWrite: isLead, canCountersign: user.role === "management" });
  }
  if (action === "cdoc-create" && method === "POST") {
    if (!isLead) return deny("create client document", { project: p.id });
    const t = DOC_TEMPLATES[body.kind];
    if (!t) return out(400, { error: "Pick a document type" });
    let text = t.body;
    if (p.title) text = text.replace("**Project title:** [ ]", `**Project title:** ${p.title}`);
    const id = await store.createDocument(p.id, { kind: body.kind, title: t.title, countersign: t.countersign, by: user.id });
    await store.addDocVersion(id, 1, text, fingerprint(id, 1, t.title, text), user.id);
    await log("cdoc_created", { doc: id, kind: body.kind });
    return out(200, { id });
  }
  if (action === "cdoc-edit" && method === "POST") {
    if (!isLead) return deny("edit client document", { project: p.id });
    const d = await docOf(body.doc_id);
    if (!d) return out(404, { error: "Not found" });
    const text = String(body.body ?? "").replace(/\r/g, "").slice(0, 60000);
    if (!text.trim()) return out(400, { error: "The document is empty" });
    const title = str(body.title, 160) || d.title;
    const versions = await store.listDocVersions(d.id);
    const latest = versions[versions.length - 1];
    const signed = (await store.listSignatures({ doc_id: d.id })).some((s) => s.version === latest.version);
    if (!d.sent && !signed) {
      // still a draft nobody has seen: change it in place
      await store.replaceDocVersion(d.id, latest.version, text, fingerprint(d.id, latest.version, title, text));
    } else {
      // seen or signed: never change it; make the next version
      await store.addDocVersion(d.id, latest.version + 1, text, fingerprint(d.id, latest.version + 1, title, text), user.id);
    }
    if (title !== d.title) await store.setDocument(d.id, { title });
    await log("cdoc_edited", { doc: d.id });
    return out(200, { document: await docView(store, await store.getDocument(d.id), { forClient: false }) });
  }
  if (action === "cdoc-send" && method === "POST") {
    if (!isLead) return deny("send client document", { project: p.id });
    const d = await docOf(body.doc_id);
    if (!d) return out(404, { error: "Not found" });
    if (/\[[^\]\n]{0,80}\]/.test((await store.listDocVersions(d.id)).at(-1).body) && body.confirm !== true) {
      return out(409, { error: "There is still text in [square brackets] (blanks to fill or notes to remove). Fill them in, or confirm you want to send it anyway.", blanks: true });
    }
    await store.setDocument(d.id, { sent: true });
    await log("cdoc_sent", { doc: d.id });
    return out(200, { ok: true });
  }
  if (action === "cdoc-countersign" && method === "POST") {
    if (user.role !== "management") return deny("countersign", { project: p.id });
    const d = await docOf(body.doc_id);
    if (!d || !d.sent) return out(404, { error: "Not found" });
    if (!d.countersign) return out(400, { error: "This document needs only the client's signature" });
    const latest = (await store.listDocVersions(d.id)).at(-1);
    const sigs = await store.listSignatures({ doc_id: d.id });
    if (!sigs.some((s) => s.version === latest.version && s.signer === "client")) return out(409, { error: "The client has not signed this version yet" });
    if (sigs.some((s) => s.version === latest.version && s.signer === "genomac")) return out(409, { error: "Already countersigned" });
    const name = str(body.typed_name, 120);
    if (name.length < 3 || body.agree !== true) return out(400, { error: "Type your full name and tick that you agree" });
    await store.addSignature({ project_id: p.id, doc_id: d.id, version: latest.version, milestone_n: null, signer: "genomac", client_id: null, staff_id: user.id, typed_name: name, ip: String(req.ip || ""), user_agent: ua(req), hash: latest.hash });
    await log("cdoc_countersigned", { doc: d.id, version: latest.version });
    return out(200, { document: await docView(store, d, { forClient: false }) });
  }
  if (action === "cdoc-comment" && method === "POST") {
    const d = await docOf(body.doc_id);
    if (!d) return out(404, { error: "Not found" });
    const text = str(body.text, 3000);
    if (!text) return out(400, { error: "Write your reply first" });
    await store.addDocComment(d.id, { client_id: null, staff_id: user.id, text });
    return out(200, { document: await docView(store, d, { forClient: false }) });
  }
  if (action === "cintake" && method === "GET") {
    return out(200, { intake: await store.getIntake(p.id), canReopen: isLead });
  }
  if (action === "cintake-reopen" && method === "POST") {
    if (!isLead) return deny("reopen intake", { project: p.id });
    await store.reopenIntake(p.id);
    await log("intake_reopened");
    return out(200, { ok: true });
  }
  return out(404, { error: "Unknown action" });
}
