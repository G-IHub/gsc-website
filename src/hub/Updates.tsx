import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";

type Update = { id: number; date: string; author: string; done: string; next: string; blockers: string; canDelete: boolean };

// Weekly updates for one project. Add and read only: an update can be removed, never rewritten.
const Updates = ({ projectId, onChanged }: { projectId: number; onChanged: () => void }) => {
  const [list, setList] = useState<Update[] | null>(null);
  const [canAdd, setCanAdd] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ done: "", next: "", blockers: "" });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<{ updates: Update[]; canAdd: boolean }>("updates", { query: { id: String(projectId) } });
    if (r.ok && r.data) {
      setList(r.data.updates);
      setCanAdd(r.data.canAdd);
    }
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("update-add", { method: "POST", body: { project_id: projectId, ...f } });
    if (r.ok) {
      setF({ done: "", next: "", blockers: "" });
      setOpen(false);
      setMsg("");
      load();
      onChanged();
    } else setMsg(errorText(r));
  };
  const remove = async (id: number) => {
    if (!window.confirm("Remove this update? This cannot be undone.")) return;
    const r = await hub("update-delete", { method: "POST", body: { project_id: projectId, id } });
    if (r.ok) {
      load();
      onChanged();
    } else setMsg(errorText(r));
  };

  return (
    <Card title="Weekly updates" action={canAdd && !open ? <Btn onClick={() => setOpen(true)}>Add weekly update</Btn> : undefined}>
      {open && (
        <form onSubmit={submit} className="space-y-3 mb-4 rounded-2xl bg-mist p-4">
          <Field label="Done this week"><textarea className={smallInput} rows={3} value={f.done} onChange={(e) => setF({ ...f, done: e.target.value })} /></Field>
          <Field label="Next"><textarea className={smallInput} rows={2} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
          <Field label="Blockers" hint="Write none if there are none"><input className={smallInput} value={f.blockers} onChange={(e) => setF({ ...f, blockers: e.target.value })} /></Field>
          {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
          <div className="flex gap-2">
            <Btn variant="primary" type="submit" disabled={!f.done.trim()}>Save update</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </form>
      )}
      {!list && <p className="text-sm text-muted">Loading…</p>}
      {list && list.length === 0 && <p className="text-sm text-muted">No updates yet.{canAdd ? " Add the first one." : ""}</p>}
      <ul className="divide-y divide-gray-100">
        {list?.map((u) => (
          <li key={u.id} className="py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div><b className="text-plum">{u.date}</b> <span className="text-muted">· {u.author}</span></div>
              {u.canDelete && <button className="text-xs text-muted hover:text-red-600" onClick={() => remove(u.id)}>Remove</button>}
            </div>
            <p className="mt-1 whitespace-pre-wrap">{u.done}</p>
            {u.next && <p className="mt-1 text-muted whitespace-pre-wrap">Next: {u.next}</p>}
            {u.blockers && <p className="mt-1 text-muted">Blockers: {u.blockers}</p>}
          </li>
        ))}
      </ul>
      {!open && msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
    </Card>
  );
};

export default Updates;
