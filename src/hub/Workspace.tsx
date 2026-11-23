import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Avatar, Pill } from "./bits";
import type { Member } from "./ProjectAccess";

// The project Workspace tab: files kept as links (Drive / OneDrive) with versions and an "editing" mark,
// a discussion thread, tasks and recent activity. Only the people on the project and management see it.

type FileRow = {
  id: number; name: string; folder: string; kind: string; status: string; editing_id: number | null; editing_name: string | null;
  version: number; link: string; note: string; by_name: string | null; at: string; canClearEditing: boolean;
};
type Comment = { id: number; author: string | null; text: string; at: string; canDelete: boolean };
type Task = { id: number; text: string; assignee: string | null; due: string | null; milestone: number | null; done: boolean; canDelete: boolean };
type Activity = { id: number; at: string; who: string; event: string; name: string; version: number | null };

const KINDS = ["Word", "Excel", "PDF", "Notebook", "Zip", "Link", "Other"];
const ACT: Record<string, (a: Activity) => string> = {
  file_added: (a) => `added ${a.name}`,
  file_version: (a) => `saved ${a.name} v${a.version ?? ""}`,
  file_opened: (a) => `opened ${a.name}${a.version ? ` (v${a.version})` : ""}`,
  comment_added: () => "posted in the discussion",
  task_added: (a) => `added the task "${a.name}"`,
  task_done: (a) => `finished "${a.name}"`,
  member_added: (a) => `added ${a.name || "someone"} to the project`,
  member_removed: (a) => `removed ${a.name || "someone"} from the project`,
};
const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—");
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const Files = ({ projectId, meId, onActivity }: { projectId: number; meId: number; onActivity: () => void }) => {
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("All");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", folder: "Drafts", kind: "Word", link: "", note: "" });
  const [newVersion, setNewVersion] = useState<{ id: number; link: string; note: string } | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<{ files: FileRow[]; folders: string[] }>("files", { query: { id: String(projectId) } });
    if (r.ok && r.data) {
      setFiles(r.data.files);
      setFolders(r.data.folders);
    } else setMsg(errorText(r));
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const act = async (action: string, body: Record<string, unknown>) => {
    const r = await hub(action, { method: "POST", body: { project_id: projectId, ...body } });
    if (r.ok) {
      setMsg("");
      load();
      onActivity();
      return true;
    }
    setMsg(errorText(r));
    return false;
  };
  const addFile = async (e: FormEvent) => {
    e.preventDefault();
    if (await act("file-add", f)) {
      setAdding(false);
      setF({ name: "", folder: "Drafts", kind: "Word", link: "", note: "" });
    }
  };
  const saveVersion = async (e: FormEvent) => {
    e.preventDefault();
    if (newVersion && (await act("file-version", { file_id: newVersion.id, link: newVersion.link, note: newVersion.note }))) setNewVersion(null);
  };

  const shown = (files ?? []).filter((x) => folder === "All" || x.folder === folder);
  const chip = (name: string, label: string) => (
    <button key={name} onClick={() => setFolder(name)} className={`rounded-full border px-3 py-1 text-xs ${folder === name ? "bg-plum border-plum text-white" : "bg-white border-gray-200 text-plum hover:border-gray-300"}`}>{label}</button>
  );

  return (
    <Card title="Files" action={!adding ? <Btn variant="primary" onClick={() => setAdding(true)}>Upload file</Btn> : undefined}>
      {adding && (
        <form onSubmit={addFile} className="grid gap-3 sm:grid-cols-2 mb-4 rounded-2xl bg-mist p-4">
          <Field label="Name"><input className={smallInput} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Folder"><select className={smallInput} value={f.folder} onChange={(e) => setF({ ...f, folder: e.target.value })}>{folders.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Type"><select className={smallInput} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field label="Share link" hint="From Google Drive or OneDrive; starts with https://" className="sm:col-span-2"><input className={smallInput} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></Field>
          <Field label="Note (optional)" className="sm:col-span-2"><input className={smallInput} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex gap-2"><Btn variant="primary" type="submit" disabled={!f.name || !f.link}>Add file</Btn><Btn onClick={() => setAdding(false)}>Cancel</Btn></div>
        </form>
      )}
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Folders">
        {chip("All", `All files (${files?.length ?? 0})`)}
        {folders.map((x) => chip(x, x))}
      </div>
      {!files && <p className="text-sm text-muted">Loading…</p>}
      {files && shown.length === 0 && <p className="text-sm text-muted">No files here yet.</p>}
      {shown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">Name</th><th className="py-2 pr-3 font-bold">Version</th><th className="py-2 pr-3 font-bold">Last change</th><th className="py-2 pr-3 font-bold">Status</th><th className="py-2 font-bold"></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((x) => {
                const editingByMe = x.editing_id === meId;
                return (
                  <tr key={x.id} className="align-top">
                    <td className="py-2.5 pr-3"><b className="text-plum font-medium">{x.name}</b><div className="text-xs text-muted">{x.kind} · {x.folder}</div>{x.note && <div className="text-xs text-muted">{x.note}</div>}</td>
                    <td className="py-2.5 pr-3">v{x.version}</td>
                    <td className="py-2.5 pr-3">{x.by_name ?? "—"}<div className="text-xs text-muted">{day(x.at)}</div></td>
                    <td className="py-2.5 pr-3">
                      {x.editing_id ? <Pill cls="bg-amber-100 text-amber-800">{editingByMe ? "You are editing" : `${x.editing_name} is editing`}</Pill>
                        : x.status === "final" ? <Pill cls="bg-lime text-plum">Final</Pill> : <Pill cls="bg-blue-100 text-blue-800">In progress</Pill>}
                      {!x.editing_id && <button className="block mt-1 text-[11px] text-muted hover:text-plum" onClick={() => act("file-status", { file_id: x.id, status: x.status === "final" ? "in_progress" : "final" })}>{x.status === "final" ? "Reopen" : "Mark final"}</button>}
                    </td>
                    <td className="py-2.5 whitespace-nowrap space-x-2">
                      <a href={x.link} target="_blank" rel="noopener noreferrer" onClick={() => { hub("file-open", { method: "POST", body: { project_id: projectId, file_id: x.id } }).then(onActivity); }} className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-plum hover:border-gray-300">Open <ExternalLink size={12} aria-hidden="true" /></a>
                      {!x.editing_id && <button className="text-xs text-muted hover:text-plum" onClick={() => act("file-editing", { file_id: x.id, editing: true })}>I'm editing</button>}
                      {(editingByMe || !x.editing_id) && <button className="text-xs text-muted hover:text-plum" onClick={() => setNewVersion({ id: x.id, link: "", note: "" })}>New version</button>}
                      {x.editing_id && x.canClearEditing && <button className="text-xs text-muted hover:text-plum" onClick={() => act("file-editing", { file_id: x.id, editing: false })}>{editingByMe ? "Stop editing" : "Clear mark"}</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {newVersion && (
        <form onSubmit={saveVersion} className="mt-3 rounded-2xl bg-mist p-4 space-y-3">
          <Field label="Link to the new version" hint="Starts with https://"><input className={smallInput} value={newVersion.link} onChange={(e) => setNewVersion({ ...newVersion, link: e.target.value })} placeholder="https://" /></Field>
          <Field label="What changed (optional)"><input className={smallInput} value={newVersion.note} onChange={(e) => setNewVersion({ ...newVersion, note: e.target.value })} /></Field>
          <div className="flex gap-2"><Btn variant="primary" type="submit" disabled={!newVersion.link}>Save version</Btn><Btn onClick={() => setNewVersion(null)}>Cancel</Btn></div>
        </form>
      )}
      <p className="mt-3 rounded-2xl bg-blue-50 text-blue-800 text-xs p-3">Files stay in your team's Drive or OneDrive; this keeps the links. Every new version is kept, so nothing is lost. "I'm editing" tells the others not to change the file at the same time. Do not put client-identifiable data here.</p>
      {msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
    </Card>
  );
};

const Discussion = ({ projectId, onActivity }: { projectId: number; onActivity: () => void }) => {
  const [list, setList] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await hub<{ comments: Comment[] }>("comments", { query: { id: String(projectId) } });
    if (r.ok && r.data) setList(r.data.comments);
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const post = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("comment-add", { method: "POST", body: { project_id: projectId, text } });
    if (r.ok) {
      setText("");
      setMsg("");
      load();
      onActivity();
    } else setMsg(errorText(r));
  };
  const remove = async (id: number) => {
    if (!window.confirm("Remove this comment?")) return;
    const r = await hub("comment-delete", { method: "POST", body: { project_id: projectId, id } });
    if (r.ok) load();
    else setMsg(errorText(r));
  };
  return (
    <Card title="Discussion">
      {list && list.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      <ul className="space-y-3">
        {list?.map((c) => (
          <li key={c.id} className="flex gap-3 text-sm">
            <Avatar name={c.author ?? "?"} />
            <div className="flex-1 min-w-0">
              <div><b className="text-plum font-medium">{c.author ?? "Former team member"}</b> <span className="text-muted text-xs">· {when(c.at)}</span>
                {c.canDelete && <button className="ml-2 text-xs text-muted hover:text-red-600" onClick={() => remove(c.id)}>Remove</button>}</div>
              <p className="whitespace-pre-wrap">{c.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={post} className="mt-4 space-y-2">
        <Field label="Reply to the team"><textarea className={smallInput} rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
        <Btn variant="primary" type="submit" disabled={!text.trim()}>Post comment</Btn>
      </form>
    </Card>
  );
};

const Tasks = ({ projectId, members, onActivity }: { projectId: number; members: Member[]; onActivity: () => void }) => {
  const [list, setList] = useState<Task[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ text: "", assignee_id: "", due: "", milestone: "" });
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await hub<{ tasks: Task[] }>("tasks", { query: { id: String(projectId) } });
    if (r.ok && r.data) setList(r.data.tasks);
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const send = async (action: string, body: Record<string, unknown>) => {
    const r = await hub(action, { method: "POST", body: { project_id: projectId, ...body } });
    if (r.ok) {
      setMsg("");
      load();
      onActivity();
      return true;
    }
    setMsg(errorText(r));
    return false;
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await send("task-add", { ...f, assignee_id: f.assignee_id || null, milestone: f.milestone || null, due: f.due || null })) {
      setAdding(false);
      setF({ text: "", assignee_id: "", due: "", milestone: "" });
    }
  };
  return (
    <Card title="Tasks">
      {list && list.length === 0 && <p className="text-sm text-muted">No tasks yet.</p>}
      <ul className="divide-y divide-gray-100">
        {list?.map((t) => (
          <li key={t.id} className="py-2.5 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={t.done} onChange={(e) => send("task-done", { id: t.id, done: e.target.checked })} aria-label={`Done: ${t.text}`} />
            <div className="flex-1 min-w-0">
              <div className={t.done ? "line-through text-muted" : ""}>{t.text}</div>
              <div className="text-xs text-muted">{t.assignee ?? "Not assigned"}{t.due ? ` · due ${t.due}` : ""}{t.milestone ? ` · Milestone ${t.milestone}` : ""}</div>
            </div>
            {t.canDelete && <button className="text-xs text-muted hover:text-red-600" onClick={() => send("task-delete", { id: t.id })}>Remove</button>}
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} className="mt-3 space-y-2 rounded-2xl bg-mist p-3">
          <input className={smallInput} placeholder="What needs doing" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} aria-label="Task" />
          <div className="grid grid-cols-3 gap-2">
            <select className={smallInput} value={f.assignee_id} onChange={(e) => setF({ ...f, assignee_id: e.target.value })} aria-label="Who"><option value="">Who…</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select>
            <input type="date" className={smallInput} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} aria-label="Due" />
            <select className={smallInput} value={f.milestone} onChange={(e) => setF({ ...f, milestone: e.target.value })} aria-label="Milestone"><option value="">Milestone…</option>{Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select>
          </div>
          <div className="flex gap-2"><Btn variant="primary" type="submit" disabled={!f.text.trim()}>Add task</Btn><Btn onClick={() => setAdding(false)}>Cancel</Btn></div>
        </form>
      ) : <Btn className="mt-2" onClick={() => setAdding(true)}>Add task</Btn>}
      {msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
    </Card>
  );
};

const RecentActivity = ({ projectId, tick }: { projectId: number; tick: number }) => {
  const [list, setList] = useState<Activity[] | null>(null);
  useEffect(() => {
    hub<{ activity: Activity[] }>("activity", { query: { id: String(projectId) } }).then((r) => setList(r.ok && r.data ? r.data.activity : []));
  }, [projectId, tick]);
  return (
    <Card title="Recent activity">
      {list && list.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
      <ul className="divide-y divide-gray-100">
        {list?.map((a) => (
          <li key={a.id} className="py-2.5 flex gap-3 text-sm">
            <Avatar name={a.who || "?"} />
            <div><div>{a.who} {(ACT[a.event] ?? (() => a.event))(a)}</div><div className="text-xs text-muted">{when(a.at)}</div></div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const Workspace = ({ projectId, meId, members }: { projectId: number; meId: number; members: Member[] }) => {
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Only the {members.length} {members.length === 1 ? "person" : "people"} on this project (and management) can see this workspace.</p>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Files projectId={projectId} meId={meId} onActivity={bump} />
          <Discussion projectId={projectId} onActivity={bump} />
        </div>
        <div className="space-y-5">
          <Tasks projectId={projectId} members={members} onActivity={bump} />
          <RecentActivity projectId={projectId} tick={tick} />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
