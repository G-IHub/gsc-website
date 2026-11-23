import { useState } from "react";
import { Card } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Pill } from "./bits";

export type Milestone = {
  n: number;
  name: string;
  owner: string;
  planned: string | null;
  done: string | null;
  status: "not_started" | "in_progress" | "done";
  signoff: boolean;
  signed: boolean;
  canEdit: boolean;
};

const STATUS_LABEL = { not_started: "Not started", in_progress: "In progress", done: "Done" };
const STATUS_STYLE = { not_started: "bg-gray-200 text-gray-700", in_progress: "bg-blue-100 text-blue-800", done: "bg-lime text-plum" };
const field = "bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-magenta";

export const progressOf = (rows: Milestone[]) => {
  const done = rows.filter((m) => m.status === "done").length;
  return { done, total: rows.length, next: rows.find((m) => m.status !== "done") };
};

// The 14 standard steps of a project. Everyone on the project reads them; leads and management change them,
// and Finance changes the steps it owns (fee received, balance received).
const Milestones = ({ projectId, rows, onChanged }: { projectId: number; rows: Milestone[]; onChanged: () => void }) => {
  const [msg, setMsg] = useState("");
  const save = async (n: number, patch: Record<string, unknown>) => {
    const r = await hub("milestone-update", { method: "POST", body: { project_id: projectId, n, ...patch } });
    if (r.ok) {
      setMsg("");
      onChanged();
    } else setMsg(errorText(r));
  };

  return (
    <Card title="Milestones and deliverables">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-muted">
              <th className="py-2 pr-2 font-bold">#</th><th className="py-2 pr-3 font-bold">Milestone</th><th className="py-2 pr-3 font-bold">Owner</th>
              <th className="py-2 pr-3 font-bold">Planned</th><th className="py-2 pr-3 font-bold">Done</th><th className="py-2 pr-3 font-bold">Status</th><th className="py-2 font-bold">Client sign-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((m) => (
              <tr key={m.n}>
                <td className="py-2.5 pr-2 text-muted">{m.n}</td>
                <td className="py-2.5 pr-3 text-plum">{m.name}</td>
                <td className="py-2.5 pr-3 text-muted">{m.owner}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  {m.canEdit ? <input type="date" className={field} value={m.planned ?? ""} onChange={(e) => save(m.n, { planned: e.target.value || null })} aria-label={`Planned date for step ${m.n}`} /> : m.planned ?? "—"}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{m.done ?? "—"}</td>
                <td className="py-2.5 pr-3">
                  {m.canEdit ? (
                    <select className={field} value={m.status} onChange={(e) => save(m.n, { status: e.target.value })} aria-label={`Status of step ${m.n}`}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : (
                    <Pill cls={STATUS_STYLE[m.status]}>{STATUS_LABEL[m.status]}</Pill>
                  )}
                </td>
                <td className="py-2.5 text-muted">
                  {!m.signoff ? "—" : m.canEdit ? (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={m.signed} onChange={(e) => save(m.n, { signed: e.target.checked })} /> {m.signed ? "Signed" : "Needed"}</label>
                  ) : m.signed ? "Signed" : "Needed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <p className="text-sm text-red-600 mt-3" role="alert">{msg}</p>}
    </Card>
  );
};

export default Milestones;
