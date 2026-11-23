import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";

type Change = { id: number; on_date: string; text: string; dates_effect: string; fee_effect?: string; author: string };
type Resp = { changes: Change[]; canAdd: boolean; canDelete: boolean; canFee: boolean };

// Changes to scope, dates or fee agreed with the client. Everyone on the project reads it;
// the effect on the fee is recorded and shown for Finance and management only.
const ChangeLog = ({ projectId }: { projectId: number }) => {
  const [d, setD] = useState<Resp | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ on_date: "", text: "", dates_effect: "", fee_effect: "" });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<Resp>("changes", { query: { id: String(projectId) } });
    if (r.ok && r.data) setD(r.data);
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("change-add", { method: "POST", body: { project_id: projectId, ...f } });
    if (r.ok) {
      setF({ on_date: "", text: "", dates_effect: "", fee_effect: "" });
      setOpen(false);
      setMsg("");
      load();
    } else setMsg(errorText(r));
  };
  const remove = async (id: number) => {
    if (!window.confirm("Remove this change-log entry? This cannot be undone.")) return;
    const r = await hub("change-delete", { method: "POST", body: { project_id: projectId, id } });
    if (r.ok) load();
    else setMsg(errorText(r));
  };

  if (!d) return null;
  return (
    <Card title="Change log" action={d.canAdd && !open ? <Btn onClick={() => setOpen(true)}>Record a change</Btn> : undefined}>
      {open && (
        <form onSubmit={submit} className="space-y-3 mb-4 rounded-2xl bg-mist p-4">
          <Field label="What changed"><textarea className={smallInput} rows={2} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="For example: client asked to add a second dataset; new Project Sheet signed" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date"><input type="date" className={smallInput} value={f.on_date} onChange={(e) => setF({ ...f, on_date: e.target.value })} /></Field>
            <Field label="Effect on dates"><input className={smallInput} value={f.dates_effect} onChange={(e) => setF({ ...f, dates_effect: e.target.value })} placeholder="For example: target date +4 days" /></Field>
          </div>
          {d.canFee && <Field label="Effect on the fee" hint="Shown to Finance and management only"><input className={smallInput} value={f.fee_effect} onChange={(e) => setF({ ...f, fee_effect: e.target.value })} /></Field>}
          {!d.canFee && <p className="text-xs text-muted">Do not write amounts here. Finance records any change to the fee.</p>}
          {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
          <div className="flex gap-2">
            <Btn variant="primary" type="submit" disabled={!f.text.trim()}>Save</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </form>
      )}
      {d.changes.length === 0 && <p className="text-sm text-muted">No changes recorded.</p>}
      <ul className="divide-y divide-gray-100">
        {d.changes.map((c) => (
          <li key={c.id} className="py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div><b className="text-plum">{c.on_date}</b>{c.author && <span className="text-muted"> · {c.author}</span>}</div>
              {d.canDelete && <button className="text-xs text-muted hover:text-red-600" onClick={() => remove(c.id)}>Remove</button>}
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.text}</p>
            {c.dates_effect && <p className="mt-1 text-muted">Dates: {c.dates_effect}</p>}
            {c.fee_effect && <p className="mt-1 text-muted">Fee: {c.fee_effect}</p>}
          </li>
        ))}
      </ul>
      {!open && msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
    </Card>
  );
};

export default ChangeLog;
