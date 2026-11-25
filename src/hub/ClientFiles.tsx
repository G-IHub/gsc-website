import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Lock, PackageCheck, Plus } from "lucide-react";
import { Btn, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";

// The team's side of the final files (inside the project's Client tab): list the files with their share links,
// then release them to the client once finance has marked the balance paid.

type F = { id: number; title: string; kind: string; note: string; version: string; link: string; updated: string; added_by: string | null };
type Data = { files: F[]; release: { at: string; by: string | null } | null; paid: boolean; visible: boolean; canRelease: boolean; canWithdraw: boolean; kinds: string[] };
const empty = { id: 0, title: "", kind: "Manuscript", note: "", version: "", link: "" };
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const ClientFiles = ({ projectId }: { projectId: number }) => {
  const [d, setD] = useState<Data | null>(null);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<Data>("cfiles", { query: { id: String(projectId) } });
    if (r.ok && r.data) setD(r.data); else setMsg(errorText(r));
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  if (!d) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("cfile-save", { method: "POST", body: { project_id: projectId, ...form } });
    if (r.ok) { setForm(null); setMsg(""); load(); } else setMsg(errorText(r));
  };
  const remove = async (f: F) => {
    if (!window.confirm(`Remove "${f.title}" from the client's files?`)) return;
    const r = await hub("cfile-delete", { method: "POST", body: { project_id: projectId, id: f.id } });
    if (r.ok) load(); else setMsg(errorText(r));
  };
  const release = async () => {
    if (!window.confirm("Release the final files to the client now? They will see and open the links. Make sure each Drive file is shared with the client's email (or anyone with the link).")) return;
    const r = await hub("cfiles-release", { method: "POST", body: { project_id: projectId } });
    if (r.ok) { setMsg("Released. Step 12 is marked done, and the client can sign it off."); load(); } else setMsg(errorText(r));
  };
  const withdraw = async () => {
    if (!window.confirm("Withdraw the release? The client will no longer see the links.")) return;
    const r = await hub("cfiles-withdraw", { method: "POST", body: { project_id: projectId } });
    if (r.ok) load(); else setMsg(errorText(r));
  };

  const state = d.visible
    ? ["Released to the client", "bg-lime/40 text-plum"]
    : d.release
      ? ["Released, but hidden: balance not marked paid", "bg-amber-50 text-amber-700"]
      : d.paid ? ["Balance paid · ready to release", "bg-magenta-tint text-magenta-dark"] : ["Locked until the balance is paid", "bg-gray-100 text-gray-600"];

  return (
    <section className="bg-white rounded-[14px] p-3.5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h2 className="text-[13px] text-ink font-medium flex-1">Final files for the client</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] ${state[1]}`}>{state[0]}</span>
        {!form && <button onClick={() => setForm({ ...empty })} className="inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3 py-1 text-[11px]"><Plus size={12} /> Add file</button>}
      </div>

      {form && (
        <form onSubmit={save} className="rounded-xl bg-mist p-3 mb-3 grid gap-2 sm:grid-cols-[1fr_150px_90px]">
          <input className={smallInput} placeholder="Name, e.g. Manuscript (final)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="File name" />
          <select className={smallInput} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="Kind">{d.kinds.map((k) => <option key={k}>{k}</option>)}</select>
          <input className={smallInput} placeholder="Version" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} aria-label="Version" />
          <input className={`${smallInput} sm:col-span-3`} placeholder="Share link (Google Drive or OneDrive, https://…)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} aria-label="Share link" />
          <input className={`${smallInput} sm:col-span-3`} placeholder="Note for the client (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="Note" />
          <div className="flex gap-2 sm:col-span-3"><Btn variant="primary" type="submit" disabled={!form.title || !form.link}>{form.id ? "Save" : "Add"}</Btn><Btn onClick={() => setForm(null)}>Cancel</Btn></div>
        </form>
      )}

      {d.files.length === 0 && !form && <p className="text-[12px] text-muted">No files listed yet. Add the manuscript, figures, tables, Source Data and the protocol and software record as share links from the team's drive.</p>}
      <ul className="divide-y divide-gray-100">
        {d.files.map((f) => (
          <li key={f.id} className="py-2 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-magenta-tint text-magenta-dark flex items-center justify-center shrink-0 text-[9.5px] font-medium" aria-hidden="true">{f.kind.slice(0, 3)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-ink truncate">{f.title}{f.version ? <span className="text-muted"> · {f.version}</span> : null}</p>
              <p className="text-[10.5px] text-muted truncate">{f.kind} · updated {f.updated}{f.added_by ? ` by ${f.added_by}` : ""}{f.note ? ` · ${f.note}` : ""}</p>
            </div>
            <a href={f.link} target="_blank" rel="noreferrer" className="text-muted hover:text-plum" aria-label={`Open ${f.title}`}><ExternalLink size={14} /></a>
            <button onClick={() => setForm({ id: f.id, title: f.title, kind: f.kind, note: f.note, version: f.version, link: f.link })} className="text-[11px] text-muted hover:text-plum">Edit</button>
            <button onClick={() => remove(f)} className="text-[11px] text-muted hover:text-red-600">Remove</button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!d.release && d.canRelease && (
          <button onClick={release} disabled={!d.paid || d.files.length === 0} className="inline-flex items-center gap-1.5 rounded-full bg-plum hover:bg-plum-soft disabled:opacity-40 text-white px-4 py-1.5 text-[12px]"><PackageCheck size={14} /> Release to the client</button>
        )}
        {d.release && <p className="text-[11.5px] text-muted">Released {day(d.release.at)}{d.release.by ? ` by ${d.release.by}` : ""}.</p>}
        {d.release && d.canWithdraw && <button onClick={withdraw} className="text-[11.5px] text-muted hover:text-red-600">Withdraw release</button>}
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[10.5px] text-muted"><Lock size={12} className="shrink-0 mt-px" /> Before release the client sees only the file names, never the links. Release needs the balance marked paid by finance; if that flag changes later, the links are hidden again. Share each Drive file with the client's email before releasing.</p>
      {msg && <p className="text-[11.5px] text-muted mt-1" role="status">{msg}</p>}
    </section>
  );
};

export default ClientFiles;
