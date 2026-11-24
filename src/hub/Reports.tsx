import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub, type Me } from "./hubApi";
import { Pill, StatTile } from "./bits";

type Kpi = { key: string; name: string; kind: "auto" | "manual"; value: string; progress: number; status: string; updated?: string | null };
type Summary = {
  scope: "all" | "unit" | "mine";
  tiles: { projects: number; delivered: number; deliveredOnTime: number; startedUncleared: number; cleared: number; qaFirstPass: { passed: number; total: number } };
  kpis: Kpi[]; met: number;
  revenue?: { received30: number; weeks: { week_ending: string; amount: number }[] };
};
type Report = { id: number; workstream: string; status: string; done: string; deliverables: string; challenges: string; next: string; author: string | null; submitted: string } | null;
type Week = { week_ending: string; workstreams: string[]; leads: string[]; reports: Report[]; weeks: string[] };

const KPI_STATUS: Record<string, [string, string]> = { met: ["Met", "bg-lime text-plum"], progress: ["In progress", "bg-blue-100 text-blue-800"], behind: ["Behind", "bg-red-100 text-red-700"] };
const RAG: Record<string, [string, string]> = { green: ["Green", "bg-lime text-plum"], amber: ["Amber", "bg-amber-100 text-amber-800"], red: ["Red", "bg-red-100 text-red-700"] };
const fmt = (n: number) => `₦${n.toLocaleString()}`;
const short = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const KpiRow = ({ k, canEdit, onSaved }: { k: Kpi; canEdit: boolean; onSaved: () => void }) => {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ value: k.value === "Not entered" ? "" : k.value, progress: String(k.progress), status: k.status });
  const [msg, setMsg] = useState("");
  const save = async () => {
    const r = await hub("kpi-set", { method: "POST", body: { key: k.key, value: f.value, progress: Number(f.progress), status: f.status } });
    if (r.ok) {
      setEdit(false);
      onSaved();
    } else setMsg(errorText(r));
  };
  const [label, cls] = KPI_STATUS[k.status] ?? KPI_STATUS.progress!;
  return (
    <tr className="align-top">
      <td className="py-2.5 pr-3">{k.name}<div className="text-xs text-muted">{k.kind === "auto" ? "Worked out by the hub" : k.updated ? `Entered by management, ${k.updated}` : "Entered by management"}</div></td>
      <td className="py-2.5 pr-3 w-40">
        {edit ? (
          <div className="space-y-1.5">
            <input className={smallInput} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="For example 3 of 4" aria-label="Value" />
            <input className={smallInput} type="number" min={0} max={100} value={f.progress} onChange={(e) => setF({ ...f, progress: e.target.value })} aria-label="Progress percent" />
          </div>
        ) : (
          <>
            <div className="text-plum">{k.value}</div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5"><i className="block h-full bg-magenta" style={{ width: `${Math.max(k.progress, 2)}%` }} /></div>
          </>
        )}
      </td>
      <td className="py-2.5 whitespace-nowrap">
        {edit ? (
          <div className="space-y-1.5">
            <select className={smallInput} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status">
              {Object.entries(KPI_STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className="flex gap-1"><Btn variant="primary" onClick={save}>Save</Btn><Btn variant="ghost" onClick={() => setEdit(false)}>Cancel</Btn></div>
            {msg && <p className="text-xs text-red-600">{msg}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2"><Pill cls={cls}>{label}</Pill>{canEdit && k.kind === "manual" && <button className="text-xs text-muted hover:text-plum" onClick={() => setEdit(true)}>Edit</button>}</div>
        )}
      </td>
    </tr>
  );
};

const SubmitReport = ({ workstreams, onDone }: { workstreams: string[]; onDone: () => void }) => {
  const [f, setF] = useState({ week_ending: "", workstream: workstreams[0] ?? "", status: "green", done: "", deliverables: "", challenges: "", next: "" });
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub<{ week_ending: string }>("report-submit", { method: "POST", body: { ...f, week_ending: f.week_ending || undefined } });
    if (r.ok) {
      setF({ ...f, done: "", deliverables: "", challenges: "", next: "" });
      setMsg(`Submitted for the week ending ${r.data?.week_ending}.`);
      onDone();
    } else setMsg(errorText(r));
  };
  return (
    <Card title="Submit your weekly report">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Week ending" hint="Leave empty for this week"><input type="date" className={smallInput} value={f.week_ending} onChange={set("week_ending")} /></Field>
          <Field label="Workstream"><select className={smallInput} value={f.workstream} onChange={set("workstream")}>{workstreams.map((w) => <option key={w}>{w}</option>)}</select></Field>
          <Field label="Overall status"><select className={smallInput} value={f.status} onChange={set("status")}>{Object.entries(RAG).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <Field label="Activities completed"><textarea className={smallInput} rows={2} value={f.done} onChange={set("done")} /></Field>
        <Field label="Deliverables achieved"><textarea className={smallInput} rows={2} value={f.deliverables} onChange={set("deliverables")} /></Field>
        <Field label="Challenges and support required"><textarea className={smallInput} rows={2} value={f.challenges} onChange={set("challenges")} /></Field>
        <Field label="Priorities for next week"><textarea className={smallInput} rows={2} value={f.next} onChange={set("next")} /></Field>
        {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
        <Btn variant="primary" type="submit" disabled={!f.done.trim()}>Submit report</Btn>
      </form>
    </Card>
  );
};

const Reports = ({ me }: { me: Me }) => {
  const [s, setS] = useState<Summary | null>(null);
  const [w, setW] = useState<Week | null>(null);
  const [week, setWeek] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    const r = await hub<Summary>("reports-summary");
    if (r.ok && r.data) setS(r.data);
    else setError(errorText(r));
  }, []);
  const loadWeek = useCallback(async () => {
    const r = await hub<Week>("reports", { query: week ? { week } : {} });
    if (r.ok && r.data) setW(r.data);
  }, [week]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWeek();
  }, [loadWeek]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!s || !w) return <p className="text-muted">Loading…</p>;
  const t = s.tiles;
  const maxRev = Math.max(1, ...(s.revenue?.weeks.map((x) => x.amount) ?? [1]));
  const scopeText = s.scope === "all" ? "all projects" : s.scope === "unit" ? "your unit's projects" : "your projects";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-plum">Reports and KPIs</h1>
        <p className="text-sm text-muted mt-1">Week ending {short(w.week_ending)}. Numbers are worked out from the project records for {scopeText}, not typed in.</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatTile label="On-time delivery" value={t.delivered ? `${Math.round((t.deliveredOnTime / t.delivered) * 100)}%` : "—"} note={`${t.deliveredOnTime} of ${t.delivered} delivered on time`} />
        <StatTile label="QA first-pass" value={t.qaFirstPass.total ? `${Math.round((t.qaFirstPass.passed / t.qaFirstPass.total) * 100)}%` : "—"} note={`${t.qaFirstPass.passed} of ${t.qaFirstPass.total} passed at the first review`} />
        <StatTile label="Started without clearance" value={t.startedUncleared} note="Target: always 0" />
        <StatTile label="Cleared to start" value={`${t.cleared} of ${t.projects}`} note="All five clearance checks ticked" />
        {s.revenue ? <StatTile label="Fees received, last 30 days" value={fmt(s.revenue.received30)} note="Finance and management only" /> : <StatTile label="Projects" value={t.projects} />}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-5">
          <Card title="This week's workstream reports" action={
            <select className={`${smallInput} w-auto`} value={week || w.week_ending} onChange={(e) => setWeek(e.target.value)} aria-label="Week">
              {[...new Set([w.week_ending, ...w.weeks])].map((x) => <option key={x} value={x}>Week ending {short(x)}</option>)}
            </select>
          }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">Workstream</th><th className="py-2 pr-3 font-bold">Lead</th><th className="py-2 pr-3 font-bold">Status</th><th className="py-2 font-bold">Report</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {w.workstreams.map((ws, i) => {
                    const r = w.reports[i];
                    return (
                      <tr key={ws} className="align-top">
                        <td className="py-2.5 pr-3">{ws}{r?.author && <div className="text-xs text-muted">{r.author}, {r.submitted}</div>}</td>
                        <td className="py-2.5 pr-3 text-muted whitespace-nowrap">{w.leads[i]}</td>
                        <td className="py-2.5 pr-3">{r ? <Pill cls={RAG[r.status]?.[1] ?? ""}>{RAG[r.status]?.[0] ?? r.status}</Pill> : "—"}</td>
                        <td className="py-2.5">
                          {r ? (
                            <span className="inline-flex items-center gap-2 whitespace-nowrap"><Pill cls="bg-lime text-plum">Submitted</Pill><button className="text-magenta-dark hover:underline text-xs" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "Read"}</button></span>
                          ) : <Pill cls="bg-amber-100 text-amber-800">Not in yet</Pill>}
                          {r && open === r.id && (
                            <div className="mt-2 space-y-1.5 text-sm">
                              <p><b className="text-plum font-medium">Completed:</b> {r.done}</p>
                              {r.deliverables && <p><b className="text-plum font-medium">Deliverables:</b> {r.deliverables}</p>}
                              {r.challenges && <p><b className="text-plum font-medium">Challenges:</b> {r.challenges}</p>}
                              {r.next && <p><b className="text-plum font-medium">Next week:</b> {r.next}</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <SubmitReport workstreams={w.workstreams} onDone={loadWeek} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <Card title={`30-day KPIs: ${s.met} of ${s.kpis.length} met`}>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">KPI</th><th className="py-2 pr-3 font-bold">Progress</th><th className="py-2 font-bold">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {s.kpis.map((k) => <KpiRow key={k.key} k={k} canEdit={me.user.role === "management"} onSaved={loadSummary} />)}
              </tbody>
            </table>
          </Card>
          {s.revenue && (
            <Card title="Revenue received per week (₦ thousands)">
              <div className="flex items-end gap-3 h-40 pt-4">
                {s.revenue.weeks.map((x) => (
                  <div key={x.week_ending} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-[11px] text-muted mb-1">{x.amount ? `₦${Math.round(x.amount / 1000)}k` : "0"}</span>
                    <div className="w-full rounded-t-md bg-magenta" style={{ height: `${Math.max((x.amount / maxRev) * 100, 1)}%` }} title={fmt(x.amount)} />
                    <span className="text-[11px] text-muted mt-1">{short(x.week_ending)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-3">From payments marked Received in the payment schedules. Finance and management only.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
