import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Plus, TrendingUp } from "lucide-react";
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

const Stat = ({ label, value, note, dark }: { label: string; value: ReactNode; note?: string; dark?: boolean }) => (
  <div className={`relative overflow-hidden rounded-[14px] p-3 ${dark ? "bg-gradient-to-br from-plum via-plum-soft to-plum text-white" : "bg-white text-ink"}`}>
    {dark && <svg className="absolute -right-12 -bottom-16 opacity-20" width="200" height="200" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="80" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="110" cy="110" r="105" fill="none" stroke="#b241b7" strokeWidth="1.5"/></svg>}
    <p className="relative text-[12px]">{label}</p>
    <p className="relative mt-1.5 text-[22px] leading-none font-medium tracking-tight">{value}</p>
    {note && <p className={`relative mt-1.5 text-[10px] flex items-center gap-1 ${dark ? "text-white/80" : "text-muted"}`}><TrendingUp size={11} aria-hidden="true" /> {note}</p>}
  </div>
);
const Panel = ({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`bg-white rounded-[14px] p-3.5 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <h2 className="text-[13px] text-ink font-medium">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

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
    <li className="py-2 border-b border-gray-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] text-ink">{k.name}</p>
          <p className="text-[10px] text-muted">{k.kind === "auto" ? "Worked out by the hub" : k.updated ? `Entered by management, ${k.updated}` : "Entered by management"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!edit && <span className="text-[11px] text-muted whitespace-nowrap">{k.value}</span>}
          <Pill cls={cls}>{label}</Pill>
        </div>
      </div>
      {edit ? (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <input className={smallInput} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="e.g. 3 of 4" aria-label="Value" />
          <input className={smallInput} type="number" min={0} max={100} value={f.progress} onChange={(e) => setF({ ...f, progress: e.target.value })} aria-label="Progress percent" />
          <select className={smallInput} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status">
            {Object.entries(KPI_STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="col-span-3 flex gap-1"><Btn variant="primary" onClick={save}>Save</Btn><Btn variant="ghost" onClick={() => setEdit(false)}>Cancel</Btn></div>
          {msg && <p className="col-span-3 text-[11px] text-red-600">{msg}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><i className="block h-full bg-plum" style={{ width: `${Math.max(k.progress, 2)}%` }} /></div>
          {canEdit && k.kind === "manual" && <button className="text-[10.5px] text-magenta-dark hover:underline" onClick={() => setEdit(true)}>Edit</button>}
        </div>
      )}
    </li>
  );
};

const SubmitReport = ({ workstreams, onDone, onClose }: { workstreams: string[]; onDone: () => void; onClose: () => void }) => {
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
    <Panel title="Submit your weekly report" action={<button className="text-[11px] text-muted hover:text-plum" onClick={onClose}>Close</button>}>
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
    </Panel>
  );
};

const Reports = ({ me }: { me: Me }) => {
  const [s, setS] = useState<Summary | null>(null);
  const [w, setW] = useState<Week | null>(null);
  const [week, setWeek] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
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

  const inCount = w.reports.filter(Boolean).length;
  const ragDot: Record<string, string> = { green: "bg-lime", amber: "bg-amber-400", red: "bg-red-500" };
  const top = s.revenue ? s.revenue.weeks.reduce((m, x, i, arr) => (x.amount > arr[m]!.amount ? i : m), 0) : -1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Reports and KPIs</h1>
          <p className="text-[12px] text-muted mt-0.5">Worked out from the project records for {scopeText}, not typed in.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-full border border-gray-300 bg-white px-3 py-1 text-[11px]" value={week || w.week_ending} onChange={(e) => setWeek(e.target.value)} aria-label="Week">
            {[...new Set([w.week_ending, ...w.weeks])].map((x) => <option key={x} value={x}>Week ending {short(x)}</option>)}
          </select>
          {!showForm && <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3 py-1 text-[11px]"><Plus size={12} /> Submit weekly report</button>}
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-5">
        <Stat dark label="On-time delivery" value={t.delivered ? `${Math.round((t.deliveredOnTime / t.delivered) * 100)}%` : "—"} note={`${t.deliveredOnTime} of ${t.delivered} delivered on time`} />
        <Stat label="QA first-pass" value={t.qaFirstPass.total ? `${Math.round((t.qaFirstPass.passed / t.qaFirstPass.total) * 100)}%` : "—"} note={`${t.qaFirstPass.passed} of ${t.qaFirstPass.total} at the first review`} />
        <Stat label="Started without clearance" value={t.startedUncleared} note="Target: always 0" />
        <Stat label="Cleared to start" value={`${t.cleared} of ${t.projects}`} note="All five checks ticked" />
        {s.revenue ? <Stat label="Fees received, 30 days" value={`₦${Math.round(s.revenue.received30 / 1000)}k`} note="Finance and management only" /> : <Stat label="Projects" value={t.projects} note={scopeText} />}
      </div>

      {showForm && <SubmitReport workstreams={w.workstreams} onDone={() => { loadWeek(); setShowForm(false); }} onClose={() => setShowForm(false)} />}

      <div className="hub-two grid gap-2.5 lg:grid-cols-2">
        <Panel title={`Workstream reports · week ending ${short(w.week_ending)}`} action={<span className="text-[11px] text-muted">{inCount} of {w.workstreams.length} in</span>}>
          <ul className="divide-y divide-gray-100">
            {w.workstreams.map((ws, i) => {
              const r = w.reports[i];
              const isOpen = r && open === r.id;
              return (
                <li key={ws} className="py-2">
                  <button disabled={!r} onClick={() => r && setOpen(isOpen ? null : r.id)} className="w-full flex items-center gap-2.5 text-left disabled:cursor-default">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${r ? ragDot[r.status] ?? "bg-gray-300" : "bg-gray-200"}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-ink truncate">{ws}</p>
                      <p className="text-[10.5px] text-muted">{w.leads[i]}{r?.author ? ` · ${r.author}, ${r.submitted}` : ""}</p>
                    </div>
                    {r ? <Pill cls={RAG[r.status]?.[1] ?? ""}>{RAG[r.status]?.[0] ?? r.status}</Pill> : <Pill cls="bg-amber-50 text-amber-800">Not in yet</Pill>}
                    {r && <ArrowUpRight size={13} className={`text-muted transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" />}
                  </button>
                  {r && isOpen && (
                    <div className="mt-2 ml-5 rounded-xl bg-mist p-3 space-y-1.5 text-[12px]">
                      <p><b className="text-plum font-medium">Completed:</b> {r.done}</p>
                      {r.deliverables && <p><b className="text-plum font-medium">Deliverables:</b> {r.deliverables}</p>}
                      {r.challenges && <p><b className="text-plum font-medium">Challenges:</b> {r.challenges}</p>}
                      {r.next && <p><b className="text-plum font-medium">Next week:</b> {r.next}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>

        {s.revenue ? (
          <Panel title="Revenue received per week" action={<span className="text-[11px] text-muted">₦ thousands</span>}>
            <div className="flex items-end justify-between gap-3 h-36 pt-5">
              {s.revenue.weeks.map((x, i) => (
                <div key={x.week_ending} className="flex-1 h-full flex flex-col items-center justify-end">
                  {x.amount > 0 && i === top && <span className="mb-1 rounded-md border border-lime bg-white px-1.5 py-0.5 text-[10px] text-plum">₦{Math.round(x.amount / 1000)}k</span>}
                  <div title={fmt(x.amount)} className={`w-full max-w-9 rounded-full ${x.amount > 0 ? "bg-gradient-to-b from-plum-soft to-plum" : "hub-hatch"}`}
                    style={{ height: x.amount > 0 ? `${Math.max((x.amount / maxRev) * 100, 30)}%` : "50%" }} />
                  <span className="mt-1 text-[10px] text-muted">{short(x.week_ending)}</span>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-muted mt-2">From payments marked Received in the payment schedules. Finance and management only.</p>
          </Panel>
        ) : (
          <Panel title="How the reports work">
            <ul className="list-disc pl-5 space-y-1.5 text-[12px] text-ink">
              <li>Each workstream lead submits one report a week (Friday is the week's end).</li>
              <li>Green, Amber or Red is the lead's own overall status for that week.</li>
              <li>Monday, Wednesday and Friday reviews use these reports.</li>
              <li>The KPIs below are worked out from the projects you can see.</li>
            </ul>
          </Panel>
        )}
      </div>

      <Panel title={`30-day KPIs · ${s.met} of ${s.kpis.length} met`}>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {s.kpis.map((k) => <KpiRow key={k.key} k={k} canEdit={me.user.role === "management"} onSaved={loadSummary} />)}
        </ul>
      </Panel>
    </div>
  );
};

export default Reports;
