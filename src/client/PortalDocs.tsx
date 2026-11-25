import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { api, errText } from "./clientApi";
import DocText from "./docText";
import SignBox from "./SignBox";
import { downloadSignedPdf } from "./signedPdf.js";

// The client's documents in the portal: read, ask for changes, sign online, download the PDF.

type Status = "draft" | "awaiting_client" | "awaiting_genomac" | "complete";
type Lite = { id: number; title: string; version: number; status: Status; updated: string };
type Doc = {
  id: number; title: string; countersign: boolean; version: number; body: string; hash: string; status: Status;
  versions: { version: number; signed: boolean }[]; signatures: { version: number; signer: "client" | "genomac"; name: string; at: string }[];
  comments: { id: number; at: string; text: string; from: "client" | "team"; who: string }[];
};
const LABEL: Record<Status, [string, string]> = {
  draft: ["", ""],
  awaiting_client: ["Needs your signature", "bg-amber-50 text-amber-700"],
  awaiting_genomac: ["Signed by you · Genomac signs next", "bg-magenta-tint text-magenta-dark"],
  complete: ["Signed", "bg-lime/40 text-plum"],
};
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const Reader = ({ projectId, docId, onBack }: { projectId: number; docId: number; onBack: () => void }) => {
  const [d, setD] = useState<Doc | null>(null);
  const [project, setProject] = useState({ ref: "", title: "" });
  const [signing, setSigning] = useState(false);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await api<{ document: Doc; project: { ref: string; title: string } }>("doc", { query: { id: String(projectId), doc: String(docId) } });
    if (r.ok && r.data) { setD(r.data.document); setProject(r.data.project); } else setMsg(errText(r));
  }, [projectId, docId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  if (!d) return <p className="text-[12px] text-muted">{msg || "Loading…"}</p>;

  const sign = async (name: string) => {
    const r = await api<{ document: Doc }>("doc-sign", { method: "POST", body: { project_id: projectId, doc_id: d.id, version: d.version, typed_name: name, agree: true } });
    if (r.ok && r.data) { setD(r.data.document); setSigning(false); return null; }
    if (r.status === 409) load();
    return errText(r);
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const r = await api<{ document: Doc }>("doc-comment", { method: "POST", body: { project_id: projectId, doc_id: d.id, text: comment } });
    if (r.ok && r.data) { setD(r.data.document); setComment(""); } else setMsg(errText(r));
  };
  const mine = d.signatures.filter((s) => s.version === d.version);

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-plum"><ArrowLeft size={14} /> All documents</button>
      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        <section className="bg-white rounded-[16px] p-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <p className="text-[11px] text-muted flex-1">Version {d.version}{d.versions.length > 1 ? ` · earlier versions are kept unchanged` : ""}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${LABEL[d.status][1]}`}>{LABEL[d.status][0]}</span>
          </div>
          <DocText body={d.body} />
        </section>
        <aside className="space-y-3">
          <section className="bg-white rounded-[16px] p-4 space-y-2">
            {d.status === "awaiting_client" && !signing && <button onClick={() => setSigning(true)} className="w-full rounded-full bg-plum hover:bg-plum-soft text-white py-2 text-[12.5px]">Sign this document</button>}
            {signing && <SignBox statement="I have read this document and agree to it." onSign={sign} onCancel={() => setSigning(false)} />}
            <button onClick={() => downloadSignedPdf(d, project).catch(() => setMsg("Could not make the PDF."))} className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-plum text-plum py-1.5 text-[12px]"><Download size={13} /> Download PDF</button>
            {mine.map((s) => (
              <p key={s.signer} className="text-[11px] text-muted"><b className="text-ink">{s.name}</b> signed {s.signer === "client" ? "" : "for Genomac "}on {when(s.at)}</p>
            ))}
            {msg && <p className="text-[11.5px] text-red-600" role="alert">{msg}</p>}
          </section>
          <section className="bg-white rounded-[16px] p-4">
            <h3 className="text-[13px] text-ink font-medium mb-1">Questions or changes</h3>
            <p className="text-[11px] text-muted mb-2">Not happy with something? Tell your team here before signing; they send a new version.</p>
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {d.comments.map((c) => (
                <li key={c.id} className={`rounded-xl px-2.5 py-1.5 text-[12px] ${c.from === "client" ? "bg-plum text-white" : "bg-mist"}`}>
                  <p className={`text-[10px] ${c.from === "client" ? "text-white/70" : "text-muted"}`}>{c.from === "client" ? "You" : `${c.who} · Genomac team`} · {when(c.at)}</p>
                  <p className="whitespace-pre-wrap">{c.text}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={send} className="mt-2 space-y-1.5">
              <textarea className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-plum" rows={2} placeholder="e.g. Please change point 3…" value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Comment" />
              <button type="submit" disabled={!comment.trim()} className="rounded-full bg-plum disabled:opacity-50 text-white px-4 py-1.5 text-[12px]">Send</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
};

// The list (a panel in the project page); opening one takes over the page via onOpen
export const DocList = ({ projectId, onOpen }: { projectId: number; onOpen: (id: number) => void }) => {
  const [docs, setDocs] = useState<Lite[] | null>(null);
  useEffect(() => {
    api<{ documents: Lite[] }>("docs", { query: { id: String(projectId) } }).then((r) => r.ok && r.data && setDocs(r.data.documents));
  }, [projectId]);
  return (
    <section className="bg-white rounded-[16px] p-4 h-full">
      <h2 className="text-[14px] text-ink font-medium mb-2.5">Your documents</h2>
      {docs && docs.length === 0 && <p className="text-[12px] text-muted">Your agreement, Project Sheet and other documents to sign will appear here.</p>}
      <ul className="divide-y divide-gray-100">
        {docs?.map((d) => (
          <li key={d.id}>
            <button onClick={() => onOpen(d.id)} className="w-full text-left py-2.5 flex items-center gap-2.5 hover:bg-mist/60 rounded-lg px-1">
              <span className="w-8 h-8 rounded-lg bg-magenta-tint text-magenta-dark flex items-center justify-center shrink-0" aria-hidden="true"><FileText size={14} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[12.5px] text-ink truncate">{d.title}</span><span className="block text-[10.5px] text-muted">version {d.version} · {d.updated}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] whitespace-nowrap ${LABEL[d.status][1]}`}>{LABEL[d.status][0]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Reader;
