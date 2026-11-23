import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Card } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Pill } from "./bits";

type Item = { key: string; label: string; done: boolean; by: string; at: string | null };
type State = { items: Item[]; done: number; total: number; allDone: boolean };

// Financial clearance: Finance and management tick the five checks. Until all five are ticked,
// the project's payment flag stays "Not cleared" (enforced on the server) and no work should start.
const Clearance = ({ projectId, onChanged, children }: { projectId: number; onChanged: () => void; children?: ReactNode }) => {
  const [s, setS] = useState<State | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await hub<State>("clearance", { query: { id: String(projectId) } });
    if (r.ok && r.data) setS(r.data);
    else setMsg(errorText(r));
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const toggle = async (key: string, done: boolean) => {
    if (!done && s?.allDone && !window.confirm("Unticking this puts the project back to Not cleared. Continue?")) return;
    const r = await hub<State>("clearance-set", { method: "POST", body: { project_id: projectId, key, done } });
    if (r.ok && r.data) {
      setS(r.data);
      setMsg("");
      onChanged();
    } else setMsg(errorText(r));
  };

  return (
    <Card title={s ? `Financial clearance: ${s.done} of ${s.total}` : "Financial clearance"}>
      {!s && !msg && <p className="text-sm text-muted">Loading…</p>}
      {s && (
        <ul className="divide-y divide-gray-100">
          {s.items.map((i) => (
            <li key={i.key} className="py-2 flex items-start justify-between gap-3 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={i.done} onChange={(e) => toggle(i.key, e.target.checked)} />
                <span>
                  {i.label}
                  {i.done && i.at && <span className="block text-xs text-muted">{i.by ? `${i.by}, ` : ""}{i.at}</span>}
                </span>
              </label>
              <Pill cls={i.done ? "bg-lime text-plum" : "bg-gray-200 text-gray-700"}>{i.done ? "Yes" : "No"}</Pill>
            </li>
          ))}
        </ul>
      )}
      {s && !s.allDone && <p className="mt-3 rounded-2xl bg-amber-50 text-amber-800 text-xs p-3">No work starts until all {s.total} checks are ticked.</p>}
      {children}
      {msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
    </Card>
  );
};

export default Clearance;
