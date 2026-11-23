import { useEffect, useState } from "react";

type KpiLite = { key: string; name: string; value: string; progress: number; status: string };
type Lite = { kpis: KpiLite[]; met: number; monthReceived?: number };
const REPORT_ROLES = ["management", "finance", "director", "lead"];

type MyTask = { id: number; project_id: number; ref: string; text: string; due: string | null; milestone: number | null };
import { Card } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type Me, type Project } from "./hubApi";
import { HEALTH_LABEL, HEALTH_STYLE, Pill, StatTile, ViewingAs, attentionFor, daysLeft, daysText } from "./bits";

// The first screen. Managers see the portfolio; team members see only their own projects.
// Everything here is worked out from the projects the server returned for this person, nothing else.

const NOT_SHOWN = [
  "Fees, payments, budgets and margins",
  "Whether a client has been cleared to start",
  "Company-wide figures and other people's projects",
  "Client name and contact (use the project code)",
];

const MemberHome = ({ me, projects, onOpen }: { me: Me; projects: Project[]; onOpen: (id: number) => void }) => {
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  useEffect(() => {
    hub<{ tasks: MyTask[] }>("my-tasks").then((r) => setTasks(r.ok && r.data ? r.data.tasks : []));
  }, []);
  const soon = projects.filter((p) => {
    const d = daysLeft(p.target_date);
    return d !== null && d <= 14;
  }).length;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-plum">Hello, {me.user.name}</h1>
          <p className="text-sm text-muted mt-1">You are on {projects.length} {projects.length === 1 ? "project" : "projects"}.</p>
        </div>
        <ViewingAs label={ROLE_LABEL[me.user.role]?.toLowerCase() ?? me.user.role} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="My projects" value={projects.length} note={`${projects.filter((p) => p.health === "green").length} on track`} />
        <StatTile label="Due within 14 days" value={soon} />
        <StatTile label="My open tasks" value={tasks ? tasks.length : "…"} note={tasks ? `${tasks.filter((t) => { const d = daysLeft(t.due); return d !== null && d <= 7; }).length} due within 7 days` : undefined} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="My projects">
            {projects.length === 0 && <p className="text-sm text-muted">You are not on any project yet. Your lead or management will add you.</p>}
            <ul className="divide-y divide-gray-100">
              {projects.map((p) => (
                <li key={p.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-plum font-medium">{p.ref} · {p.title}</b>
                    <Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill>
                  </div>
                  <p className="text-sm text-muted mt-1">Stage: {p.stage || "not set"}{p.target_date ? ` · target ${p.target_date} (${daysText(daysLeft(p.target_date))})` : ""}</p>
                  <button className="mt-3 inline-flex rounded-full bg-magenta hover:bg-magenta-dark text-white px-4 py-2 text-sm font-medium" onClick={() => onOpen(p.id)}>Open project</button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-5 self-start">
        <Card title="My tasks">
          {tasks && tasks.length === 0 && <p className="text-sm text-muted">No open tasks.</p>}
          <ul className="divide-y divide-gray-100">
            {tasks?.map((t) => (
              <li key={t.id} className="py-2.5 text-sm">
                <button className="text-left hover:underline" onClick={() => onOpen(t.project_id)}>{t.text}</button>
                <div className="text-xs text-muted">{t.ref}{t.due ? ` · due ${t.due}` : ""}{t.milestone ? ` · Milestone ${t.milestone}` : ""}</div>
              </li>
            ))}
          </ul>
        </Card>
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 p-5 text-sm text-muted">
          <p className="text-plum font-medium">Not shown for your role</p>
          <ul className="mt-2 list-disc pl-5 space-y-1.5">{NOT_SHOWN.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="mt-3">If you need something on this list for your work, ask your lead.</p>
        </div>
        </div>
      </div>
    </div>
  );
};

const Portfolio = ({ me, projects, onOpen, onAll, onReports }: { me: Me; projects: Project[]; onOpen: (id: number) => void; onAll: () => void; onReports: () => void }) => {
  const [lite, setLite] = useState<Lite | null>(null);
  useEffect(() => {
    if (!REPORT_ROLES.includes(me.user.role)) return;
    hub<Lite>("reports-summary", { query: { light: "1" } }).then((r) => r.ok && r.data && setLite(r.data));
  }, [me.user.role]);
  const money = me.user.role === "management" || me.user.role === "finance";
  const attention = attentionFor(projects);
  const soon = projects.filter((p) => {
    const d = daysLeft(p.target_date);
    return d !== null && d >= 0 && d <= 14;
  }).length;
  const counts = (["red", "amber", "green"] as const).map((h) => `${projects.filter((p) => p.health === h).length} ${HEALTH_LABEL[h].toLowerCase()}`).join(" · ");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-plum">Portfolio overview</h1>
          <p className="text-sm text-muted mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <ViewingAs label={`${ROLE_LABEL[me.user.role]?.toLowerCase() ?? me.user.role}${["management", "finance"].includes(me.user.role) ? " (sees all projects)" : ""}`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Active projects" value={projects.length} note={counts} />
        <StatTile label="Needs attention" value={attention.length} note="Late, due soon, payment, clearance" />
        {money ? (
          <StatTile label="Revenue received this month" value={lite?.monthReceived !== undefined ? `₦${lite.monthReceived.toLocaleString()}` : "…"} note="From the payment schedules" />
        ) : (
          <StatTile label="Due within 14 days" value={soon} />
        )}
        <StatTile label="Balance due" value={projects.filter((p) => p.payment_status === "balance_due").length} note="Projects waiting for the final payment" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Projects" action={<button className="text-sm text-magenta-dark hover:underline" onClick={onAll}>All projects</button>}>
            {projects.length === 0 ? (
              <p className="text-sm text-muted">No projects yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">Code</th><th className="py-2 pr-3 font-bold">Project</th><th className="py-2 pr-3 font-bold">Lead</th><th className="py-2 pr-3 font-bold">Stage</th><th className="py-2 pr-3 font-bold">Target</th><th className="py-2 font-bold">Health</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {projects.map((p) => (
                      <tr key={p.id} className="hover:bg-mist cursor-pointer" onClick={() => onOpen(p.id)}>
                        <td className="py-3 pr-3 whitespace-nowrap"><button className="text-magenta-dark font-medium hover:underline" onClick={() => onOpen(p.id)}>{p.ref}</button></td>
                        <td className="py-3 pr-3 text-plum">{p.title}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">{p.lead ?? <span className="text-muted">—</span>}</td>
                        <td className="py-3 pr-3 text-muted">{p.stage || "—"}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">{p.target_date ?? "—"}<span className="block text-xs text-muted">{daysText(daysLeft(p.target_date))}</span></td>
                        <td className="py-3"><Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-5">
        <Card title="Needs attention this week">
          {attention.length === 0 && <p className="text-sm text-muted">Nothing needs attention right now.</p>}
          <ul className="divide-y divide-gray-100">
            {attention.slice(0, 8).map((a, i) => (
              <li key={i} className="py-2.5 flex items-start gap-3 text-sm">
                <Pill cls={a.cls}>{a.tag}</Pill>
                <button className="text-left hover:underline" onClick={() => onOpen(a.project)}>{a.text}</button>
              </li>
            ))}
          </ul>
        </Card>
        {lite && (
          <Card title={`30-day KPIs: ${lite.met} of ${lite.kpis.length} met`}>
            <ul className="space-y-3">
              {[...lite.kpis].sort((a, b) => Number(a.value === "Not entered") - Number(b.value === "Not entered")).slice(0, 5).map((k) => (
                <li key={k.key} className="text-sm">
                  <div className="flex justify-between gap-2"><span>{k.name}</span><span className="text-muted whitespace-nowrap">{k.value}</span></div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5"><i className="block h-full bg-magenta" style={{ width: `${Math.max(k.progress, 2)}%` }} /></div>
                </li>
              ))}
            </ul>
            <button className="mt-4 inline-flex rounded-full bg-magenta hover:bg-magenta-dark text-white px-4 py-2 text-sm font-medium" onClick={onReports}>Open reports and KPIs</button>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
};

const Home = ({ me, onOpen, onAll, onReports }: { me: Me; onOpen: (id: number) => void; onAll: () => void; onReports: () => void }) => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    hub<{ projects: Project[] }>("projects").then((r) => {
      if (r.ok && r.data) setProjects(r.data.projects);
      else setError(errorText(r));
    });
  }, []);
  if (error) return <p className="text-red-600">{error}</p>;
  if (!projects) return <p className="text-muted">Loading…</p>;
  return me.user.role === "member" ? <MemberHome me={me} projects={projects} onOpen={onOpen} /> : <Portfolio me={me} projects={projects} onOpen={onOpen} onAll={onAll} onReports={onReports} />;
};

export default Home;
