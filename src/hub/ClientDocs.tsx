import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Download, FileText, Plus, Send } from "lucide-react";
import { Btn, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import DocText from "../client/docText";
import SignBox from "../client/SignBox";
import IntakeFields from "../client/IntakeFields";
import { downloadSignedPdf } from "../client/signedPdf.js";

// The team's side of client documents (inside the project's Client tab): write a document from a template,
// edit it, send it to the client, follow its signatures, countersign (management), reply to the client's
// comments, download the signed PDF. Also the client's intake form, read-only.

type Sig = { version: number; signer: "client" | "genomac"; name: string; at: string; hash: string; ip?: string };
type Doc = {
  id: number; kind: string; title: string; countersign: boolean; sent: boolean; version: number; body: string; hash: string; updated: string;
  status: Status; versions: { version: number; created: string; signed: boolean }[]; signatures: Sig[];
  comments: { id: number; at: string; text: string; from: "client" | "team"; who: string }[];
};
type Status = "draft" | "awaiting_client" | "awaiting_genomac" | "complete";
type Lite = { id: number; title: string; kind: string; version: number; status: Status; updated: string };

export const STATUS: Record<Status, [string, string]> = {
  draft: ["Draft", "bg-gray-100 text-gray-600"],
  awaiting_client: ["Waiting for the client", "bg-amber-50 text-amber-700"],
  awaiting_genomac: ["Waiting for Genomac's countersignature", "bg-magenta-tint text-magenta-dark"],
  complete: ["Signed", "bg-lime/40 text-plum"],
};
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const DocEditor = ({ projectId, docId, onBack }: { projectId: number; docId: number; onBack: () => void }) => {
  const [d, setD] = useState<Doc | null>(null);
  const [project, setProject] = useState({ ref: "", title: "" });
  const [rights, setRights] = useState({ canWrite: false, canCountersign: false });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [reply, setReply] = useState("");
  const [signing, setSigning] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<{ document: Doc; project: { ref: string; title: string }; canWrite: boolean; canCountersign: boolean }>("cdoc", { query: { id: String(projectId), doc: String(docId) } });
    if (r.ok && r.data) {
      setD(r.data.document);
      setProject(r.data.project);
      setRights({ canWrite: r.data.canWrite, canCountersign: r.data.canCountersign });
    } else setMsg(errorText(r));
  }, [projectId, docId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  if (!d) return <p className="text-[12px] text-muted">{msg || "Loading…"}</p>;

  const signed = d.signatures.filter((s) => s.version === d.version);
  const save = async () => {
    if (d.sent && !window.confirm("The client has this document. Saving makes a new version, which the client must read and sign again. Continue?")) return;
    const r = await hub<{ document: Doc }>("cdoc-edit", { method: "POST", body: { project_id: projectId, doc_id: d.id, ...draft } });
    if (r.ok && r.data) { setD(r.data.document); setEditing(false); setMsg(""); } else setMsg(errorText(r));
  };
  const send = async (confirm = false) => {
    const r = await hub<{ blanks?: boolean }>("cdoc-send", { method: "POST", body: { project_id: projectId, doc_id: d.id, confirm } });
    if (r.ok) { setMsg("Sent. The client sees it in their portal now."); load(); }
    else if (r.data?.blanks) { if (window.confirm(`${r.data.error}\n\nSend anyway?`)) send(true); }
    else setMsg(errorText(r));
  };
  const countersign = async (name: string) => {
    const r = await hub<{ document: Doc }>("cdoc-countersign", { method: "POST", body: { project_id: projectId, doc_id: d.id, typed_name: name, agree: true } });
    if (r.ok && r.data) { setD(r.data.document); setSigning(false); return null; }
    return errorText(r);
  };
  const postReply = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub<{ document: Doc }>("cdoc-comment", { method: "POST", body: { project_id: projectId, doc_id: d.id, text: reply } });
    if (r.ok && r.data) { setD(r.data.document); setReply(""); } else setMsg(errorText(r));
  };

  return (
    <div className="space-y-2.5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-plum"><ArrowLeft size={13} /> All client documents</button>
      <div className="grid gap-2.5 lg:grid-cols-[1fr_300px]">
        <section className="bg-white rounded-[14px] p-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="text-[14px] text-ink font-medium flex-1">{d.title} <span className="text-[11px] text-muted font-normal">· version {d.version}</span></h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span>
          </div>
          {editing ? (
            <div className="space-y-2">
              <input className={smallInput} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Title" />
              <textarea className={`${smallInput} font-mono !text-[11.5px]`} rows={22} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} aria-label="Document text" />
              <p className="text-[10.5px] text-muted">Format: <code># Title</code>, <code>## Heading</code>, <code>- list item</code>, <code>**bold**</code>, and a blank line between paragraphs. Replace every [ ] blank before sending.</p>
              <div className="flex gap-2"><Btn variant="primary" onClick={save}>Save</Btn><Btn onClick={() => setEditing(false)}>Cancel</Btn></div>
            </div>
          ) : (
            <div className="max-h-[560px] overflow-y-auto pr-2"><DocText body={d.body} /></div>
          )}
        </section>

        <aside className="space-y-2.5">
          <section className="bg-white rounded-[14px] p-3.5 space-y-2">
            {rights.canWrite && !editing && <Btn className="w-full" onClick={() => { setDraft({ title: d.title, body: d.body }); setEditing(true); }}>Edit text</Btn>}
            {rights.canWrite && !d.sent && <Btn variant="primary" className="w-full inline-flex items-center justify-center gap-1.5" onClick={() => send()}><Send size={13} /> Send to the client</Btn>}
            <Btn className="w-full inline-flex items-center justify-center gap-1.5" onClick={() => downloadSignedPdf(d, project).catch(() => setMsg("Could not make the PDF."))}><Download size={13} /> Download PDF</Btn>
            {d.status === "awaiting_genomac" && rights.canCountersign && !signing && <Btn variant="primary" className="w-full" onClick={() => setSigning(true)}>Countersign for Genomac</Btn>}
            {signing && <SignBox statement="I sign this document for Genomac Services & Consult." button="Countersign" onSign={countersign} onCancel={() => setSigning(false)} />}
            {d.status === "awaiting_genomac" && !rights.canCountersign && <p className="text-[11px] text-muted">Management countersigns this document.</p>}
            {msg && <p className="text-[11.5px] text-muted" role="status">{msg}</p>}
          </section>

          <section className="bg-white rounded-[14px] p-3.5">
            <h3 className="text-[12.5px] text-ink font-medium mb-1.5">Signatures · version {d.version}</h3>
            {signed.length === 0 && <p className="text-[11.5px] text-muted">{d.sent ? "Nobody has signed this version yet." : "Not sent yet."}</p>}
            <ul className="space-y-1.5">
              {signed.map((s) => (
                <li key={s.signer} className="text-[11.5px]">
                  <p className="text-ink"><b>{s.name}</b> · {s.signer === "client" ? "client" : "Genomac"}</p>
                  <p className="text-[10.5px] text-muted">{when(s.at)}{s.ip ? ` · IP ${s.ip}` : ""}</p>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted mt-2 break-all">Fingerprint {d.hash.slice(0, 16)}…</p>
            {d.versions.length > 1 && <p className="text-[10.5px] text-muted mt-1.5">Earlier versions: {d.versions.slice(0, -1).map((v) => `v${v.version}${v.signed ? " (signed)" : ""}`).join(", ")}. Signed versions are kept unchanged.</p>}
          </section>

          <section className="bg-white rounded-[14px] p-3.5">
            <h3 className="text-[12.5px] text-ink font-medium mb-1.5">Comments from the client</h3>
            {d.comments.length === 0 && <p className="text-[11.5px] text-muted">None yet.</p>}
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {d.comments.map((c) => (
                <li key={c.id} className={`rounded-xl px-2.5 py-1.5 text-[11.5px] ${c.from === "client" ? "bg-lime/30" : "bg-mist"}`}>
                  <p className="text-[10px] text-muted">{c.who}{c.from === "client" ? " · client" : ""} · {when(c.at)}</p>
                  <p className="whitespace-pre-wrap">{c.text}</p>
                </li>
              ))}
            </ul>
            {d.sent && (
              <form onSubmit={postReply} className="mt-2 flex gap-1.5">
                <input className={`${smallInput} flex-1`} placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Reply to the client" />
                <button type="submit" disabled={!reply.trim()} className="rounded-full bg-plum disabled:opacity-50 text-white px-3 text-[11px]">Reply</button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

const ClientDocs = ({ projectId }: { projectId: number }) => {
  const [docs, setDocs] = useState<Lite[] | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [templates, setTemplates] = useState<{ kind: string; title: string }[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [intake, setIntake] = useState<{ data: Record<string, string | string[]>; submitted_at: string | null; updated_at: string } | null>(null);
  const [canReopen, setCanReopen] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<{ documents: Lite[]; canWrite: boolean }>("cdocs", { query: { id: String(projectId) } });
    if (r.ok && r.data) { setDocs(r.data.documents); setCanWrite(r.data.canWrite); } else setMsg(errorText(r));
    const t = await hub<{ templates: { kind: string; title: string }[] }>("cdoc-templates");
    if (t.ok && t.data) setTemplates(t.data.templates);
    const i = await hub<{ intake: typeof intake; canReopen: boolean }>("cintake", { query: { id: String(projectId) } });
    if (i.ok && i.data) { setIntake(i.data.intake); setCanReopen(i.data.canReopen); }
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async (kind: string) => {
    const r = await hub<{ id: number }>("cdoc-create", { method: "POST", body: { project_id: projectId, kind } });
    if (r.ok && r.data) setOpen(r.data.id); else setMsg(errorText(r));
  };
  const reopen = async () => {
    if (!window.confirm("Let the client change and send the intake form again?")) return;
    const r = await hub("cintake-reopen", { method: "POST", body: { project_id: projectId } });
    if (r.ok) load(); else setMsg(errorText(r));
  };

  if (open !== null) return <DocEditor projectId={projectId} docId={open} onBack={() => { setOpen(null); load(); }} />;
  return (
    <div className="hub-two grid gap-2.5 lg:grid-cols-2">
      <section className="bg-white rounded-[14px] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-[13px] text-ink font-medium">Documents for the client</h2>
          {canWrite && (
            <label className="inline-flex items-center gap-1 rounded-full bg-plum text-white pl-2.5 pr-1 py-0.5 text-[11px]">
              <Plus size={12} />
              <select className="bg-plum text-white text-[11px] py-0.5 focus:outline-none" value="" onChange={(e) => e.target.value && create(e.target.value)} aria-label="New document from a template">
                <option value="">New document</option>
                {templates.map((t) => <option key={t.kind} value={t.kind}>{t.title}</option>)}
              </select>
            </label>
          )}
        </div>
        {docs && docs.length === 0 && <p className="text-[12px] text-muted">No documents yet.{canWrite ? " Start one from a template: the agreement, the Project Sheet, a proposal, the protocol approval or the delivery acceptance." : ""}</p>}
        <ul className="divide-y divide-gray-100">
          {docs?.map((d) => (
            <li key={d.id}>
              <button onClick={() => setOpen(d.id)} className="w-full text-left py-2 flex items-center gap-2.5 hover:bg-mist/60 rounded-lg px-1">
                <span className="w-8 h-8 rounded-lg bg-magenta-tint text-magenta-dark flex items-center justify-center shrink-0" aria-hidden="true"><FileText size={14} /></span>
                <span className="flex-1 min-w-0"><span className="block text-[12px] text-ink truncate">{d.title}</span><span className="block text-[10.5px] text-muted">version {d.version} · {d.updated}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[10.5px] text-muted mt-2">The client sees a document only after you send it. Once anyone signs, that version never changes; edits make a new version to sign again.</p>
        {msg && <p className="text-[11.5px] text-muted mt-1" role="status">{msg}</p>}
      </section>

      <section className="bg-white rounded-[14px] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-[13px] text-ink font-medium">Research intake form</h2>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${intake?.submitted_at ? "bg-lime/40 text-plum" : intake ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
            {intake?.submitted_at ? `Sent ${intake.submitted_at}` : intake ? `Draft, saved ${intake.updated_at}` : "Not started"}
          </span>
        </div>
        <p className="text-[11.5px] text-muted">The client fills this in from their portal. You see it here; the feasibility part stays with the team.</p>
        {intake && (
          <div className="mt-2 flex gap-2">
            <Btn onClick={() => setShowIntake(!showIntake)}>{showIntake ? "Hide answers" : "Read the answers"}</Btn>
            {intake.submitted_at && canReopen && <Btn onClick={reopen}>Let the client change it</Btn>}
          </div>
        )}
        {showIntake && intake && <div className="mt-3 max-h-[480px] overflow-y-auto pr-1"><IntakeFields value={intake.data} readOnly /></div>}
      </section>
    </div>
  );
};

export default ClientDocs;
