import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BookOpen, ExternalLink, FileText, Plus, Search } from "lucide-react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Pill } from "./bits";
import PromptReader from "./PromptReader";

type Doc = { id: number; title: string; category: string; kind: string; audience: string; description: string; link: string; version: string; owner: string; updated: string };
const KINDS = ["Word", "Excel", "PDF", "Link", "Other"];
const AUDIENCE_LABEL: Record<string, string> = { all: "All staff", money: "Management and Finance", management: "Management only" };
const KIND_STYLE: Record<string, string> = { Word: "bg-blue-100 text-blue-800", Excel: "bg-lime text-plum", PDF: "bg-red-100 text-red-700", Link: "bg-magenta-tint text-magenta-dark", Other: "bg-gray-200 text-gray-700" };
const blank: Doc = { id: 0, title: "", category: "", kind: "Word", audience: "all", description: "", link: "", version: "0.1", owner: "", updated: "" };
const short = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

const Editor = ({ doc, onDone, onCancel }: { doc: Doc; onDone: () => void; onCancel: () => void }) => {
  const [f, setF] = useState(doc);
  const [error, setError] = useState("");
  const set = (k: keyof Doc) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("library-save", { method: "POST", body: { ...f, id: f.id || undefined } });
    if (r.ok) onDone();
    else setError(errorText(r));
  };
  return (
    <Card title={doc.id ? "Edit document" : "Add a document"}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><input className={smallInput} value={f.title} onChange={set("title")} /></Field>
        <Field label="Group"><input className={smallInput} value={f.category} onChange={set("category")} placeholder="For example Client documents" /></Field>
        <Field label="Type">
          <select className={smallInput} value={f.kind} onChange={set("kind")}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        </Field>
        <Field label="Version"><input className={smallInput} value={f.version} onChange={set("version")} placeholder="0.1" /></Field>
        <Field label="Owner" hint="Who keeps it up to date"><input className={smallInput} value={f.owner} onChange={set("owner")} /></Field>
        <Field label="Who can see it">
          <select className={smallInput} value={f.audience} onChange={set("audience")}>{Object.entries(AUDIENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field label="Link to the file" hint="Paste the share link from Google Drive or OneDrive. It must start with https://" className="sm:col-span-2">
          <input className={smallInput} value={f.link} onChange={set("link")} placeholder="https://" />
        </Field>
        <Field label="What it is for" className="sm:col-span-2"><input className={smallInput} value={f.description} onChange={set("description")} /></Field>
        {error && <p className="sm:col-span-2 text-sm text-red-600" role="alert">{error}</p>}
        <div className="sm:col-span-2 flex gap-2">
          <Btn variant="primary" type="submit" disabled={!f.title}>Save</Btn>
          <Btn onClick={onCancel}>Cancel</Btn>
        </div>
      </form>
    </Card>
  );
};

const Library = () => {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Doc | null>(null);
  const [cat, setCat] = useState("All");
  const [view, setView] = useState<"docs" | "prompts">("docs");

  const load = useCallback(async () => {
    const r = await hub<{ documents: Doc[]; canEdit: boolean }>("library");
    if (r.ok && r.data) {
      setDocs(r.data.documents);
      setCanEdit(r.data.canEdit);
    } else setError(errorText(r));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = async (d: Doc) => {
    if (!window.confirm(`Remove "${d.title}" from the library? This cannot be undone.`)) return;
    const r = await hub("library-delete", { method: "POST", body: { id: d.id } });
    if (r.ok) load();
    else setError(errorText(r));
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!docs) return <p className="text-muted">Loading…</p>;
  const needle = q.trim().toLowerCase();
  const cats = [...new Set(docs.map((d) => d.category || "Other"))];
  const shown = docs.filter((d) => (cat === "All" || (d.category || "Other") === cat) && (!needle || `${d.title} ${d.description} ${d.category} ${d.owner}`.toLowerCase().includes(needle)));
  const chip = (name: string) => (
    <button key={name} onClick={() => setCat(name)} className={`rounded-full border px-3 py-1 text-xs ${cat === name ? "bg-plum border-plum text-white" : "bg-white border-gray-200 text-plum hover:border-gray-300"}`}>{name}</button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-plum">Resource library</h1>
          <p className="text-sm text-muted mt-1">Every approved template, procedure and prompt in one place. Always the current version.</p>
        </div>
        {canEdit && !editing && view === "docs" && <Btn variant="primary" onClick={() => setEditing(blank)}><Plus size={16} /> Add a document</Btn>}
      </div>

      {/* two sections, each with the whole page to itself */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Library sections">
        {([["docs", "Documents", FileText, docs.length], ["prompts", "Research prompt library", BookOpen, 12]] as const).map(([k, label, Icon, n]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] transition-colors ${view === k ? "bg-plum border-plum text-white" : "bg-white border-gray-200 text-plum hover:border-gray-300"}`}>
            <Icon size={14} aria-hidden="true" /> {label} <span className={`rounded-full px-1.5 text-[10px] ${view === k ? "bg-white/20" : "bg-mist"}`}>{n}</span>
          </button>
        ))}
      </div>

      {view === "prompts" ? <PromptReader /> : (
      <>
      {editing && <Editor doc={editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
      <div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categories">{chip("All")}{cats.map(chip)}</div>
            <div className="relative ml-auto w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search the library" className={`${smallInput} pl-8`} />
            </div>
          </div>
          {shown.length === 0 && <p className="text-sm text-muted">Nothing matches.</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((d) => (
              <div key={d.id} className="bg-white border border-gray-200/80 rounded-3xl p-5 flex flex-col">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Pill cls={KIND_STYLE[d.kind] ?? KIND_STYLE.Other!}>{d.kind}</Pill>
                  <span className="text-muted">{d.category}</span>
                  {d.audience !== "all" && <Pill cls="bg-amber-100 text-amber-800">{AUDIENCE_LABEL[d.audience]}</Pill>}
                </div>
                <p className="text-plum font-medium mt-2">{d.title}</p>
                <p className="text-xs text-muted mt-1">Version {d.version || "0.1"}{d.owner ? ` · ${d.owner}` : ""}{d.updated ? ` · updated ${short(d.updated)}` : ""}</p>
                <p className="text-sm text-muted mt-2 flex-1">{d.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {d.link ? (
                    <a href={d.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-magenta hover:bg-magenta-dark text-white px-3.5 py-1.5 text-sm font-medium">Open <ExternalLink size={14} aria-hidden="true" /></a>
                  ) : (
                    <span className="text-xs text-muted">{canEdit ? "No link yet" : "File not added yet"}</span>
                  )}
                  {canEdit && <Btn variant="ghost" onClick={() => setEditing(d)}>Edit</Btn>}
                  {canEdit && <Btn variant="ghost" onClick={() => remove(d)}>Remove</Btn>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      </>
      )}
    </div>
  );
};

export default Library;
