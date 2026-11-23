import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Plus, Search } from "lucide-react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Pill } from "./bits";

type Doc = { id: number; title: string; category: string; kind: string; audience: string; description: string; link: string };
const KINDS = ["Word", "Excel", "PDF", "Link", "Other"];
const AUDIENCE_LABEL: Record<string, string> = { all: "All staff", money: "Management and Finance", management: "Management only" };
const KIND_STYLE: Record<string, string> = { Word: "bg-blue-100 text-blue-800", Excel: "bg-lime text-plum", PDF: "bg-red-100 text-red-700", Link: "bg-magenta-tint text-magenta-dark", Other: "bg-gray-200 text-gray-700" };
const blank: Doc = { id: 0, title: "", category: "", kind: "Word", audience: "all", description: "", link: "" };

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
  const shown = docs.filter((d) => !needle || `${d.title} ${d.description} ${d.category}`.toLowerCase().includes(needle));
  const groups = [...new Set(shown.map((d) => d.category || "Other"))];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-plum">Resource library</h1>
          <p className="text-sm text-muted mt-1">Templates and guides for the Research-to-Publication service. {docs.length} documents.</p>
        </div>
        {canEdit && !editing && <Btn variant="primary" onClick={() => setEditing(blank)}><Plus size={16} /> Add a document</Btn>}
      </div>
      {editing && <Editor doc={editing} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library" aria-label="Search the library" className={`${smallInput} pl-9`} />
      </div>
      {shown.length === 0 && <p className="text-sm text-muted">Nothing matches that search.</p>}
      {groups.map((g) => (
        <Card key={g} title={g}>
          <ul className="divide-y divide-gray-100">
            {shown.filter((d) => (d.category || "Other") === g).map((d) => (
              <li key={d.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-plum font-medium">{d.title}</span>
                    <Pill cls={KIND_STYLE[d.kind] ?? KIND_STYLE.Other!}>{d.kind}</Pill>
                    {d.audience !== "all" && <Pill cls="bg-amber-100 text-amber-800">{AUDIENCE_LABEL[d.audience]}</Pill>}
                  </div>
                  <p className="text-sm text-muted mt-1">{d.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.link ? (
                    <a href={d.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-magenta hover:bg-magenta-dark text-white px-3.5 py-1.5 text-sm font-medium">
                      Open <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted">{canEdit ? "No link yet" : "File not added yet"}</span>
                  )}
                  {canEdit && <Btn variant="ghost" onClick={() => setEditing(d)}>Edit</Btn>}
                  {canEdit && <Btn variant="ghost" onClick={() => remove(d)}>Remove</Btn>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
};

export default Library;
