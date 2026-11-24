import { useEffect, useState, type ReactNode } from "react";

type KpiLite = { key: string; name: string; value: string; progress: number; status: string };
type Lite = { kpis: KpiLite[]; met: number; monthReceived?: number };
const REPORT_ROLES = ["management", "finance", "director", "lead"];

type MyTask = { id: number; project_id: number; ref: string; text: string; due: string | null; milestone: number | null };
import { ArrowUpRight, Plus, TrendingUp } from "lucide-react";
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

type News = { id: number; at: string; who: string; event: string; name: string; version: number | null; project_id: number; ref: string };
type Mile = { n: number; name: string; planned: string | null; status: string };
const NEWS_TAG: Record<string, [string, string]> = {
  comment_added: ["Comment", "bg-blue-100 text-blue-800"],
  file_added: ["File", "bg-lime text-plum"],
  file_version: ["File", "bg-lime text-plum"],
  update_added: ["Update", "bg-magenta-tint text-magenta-dark"],
  task_added: ["Task", "bg-amber-100 text-amber-800"],
};
const newsText = (n: News) =>
  n.event === "comment_added" ? `${n.who} posted in the discussion (${n.ref}).`
  : n.event === "file_added" ? `${n.who} added ${n.name} (${n.ref}).`
  : n.event === "file_version" ? `${n.who} saved ${n.name} v${n.version ?? ""} (${n.ref}).`
  : n.event === "update_added" ? `${n.who} posted a weekly update (${n.ref}).`
  : `${n.who} added the task "${n.name}" (${n.ref}).`;
const ago = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? `Today, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
const shortDay = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

const MemberHome = ({ me, projects, onOpen }: { me: Me; projects: Project[]; onOpen: (id: number, tab?: "overview" | "workspace" | "access") => void }) => {
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [news, setNews] = useState<News[] | null>(null);
  const [miles, setMiles] = useState<Record<number, Mile[]>>({});
  const loadTasks = () => hub<{ tasks: MyTask[] }>("my-tasks").then((r) => setTasks(r.ok && r.data ? r.data.tasks : []));
  useEffect(() => {
    loadTasks();
    hub<{ news: News[] }>("my-news").then((r) => setNews(r.ok && r.data ? r.data.news : []));
    projects.forEach((p) => {
      hub<{ milestones: Mile[] }>("milestones", { query: { id: String(p.id) } }).then((r) => r.ok && r.data && setMiles((m) => ({ ...m, [p.id]: r.data!.milestones })));
    });
  }, [projects]);
  const tickTask = async (t: MyTask) => {
    await hub("task-done", { method: "POST", body: { project_id: t.project_id, id: t.id, done: true } });
    loadTasks();
  };
  const late = projects.filter((p) => p.health === "red").length;
  const watch = projects.filter((p) => p.health === "amber").length;
  const dueWeek = (tasks ?? []).filter((t) => { const d = daysLeft(t.due); return d !== null && d <= 7; }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-plum">Hello, {me.user.name}</h1>
          <p className="text-sm text-muted mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · you are on {projects.length} {projects.length === 1 ? "project" : "projects"}</p>
        </div>
        <ViewingAs label={ROLE_LABEL[me.user.role]?.toLowerCase() ?? me.user.role} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="My projects" value={projects.length} note={projects.length === 0 ? "None yet" : late ? `${late} late` : watch ? `${watch} to watch` : projects.length === 1 ? "On track" : "All on track"} />
        <StatTile label="My open tasks" value={tasks ? tasks.length : "…"} note={tasks ? `${dueWeek} due this week` : undefined} />
        <StatTile label="New in my projects" value={news ? news.length : "…"} note="Comments, files and updates" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card title="My projects">
            {projects.length === 0 && <p className="text-sm text-muted">You are not on any project yet. Your lead or management will add you.</p>}
            <ul className="divide-y divide-gray-100">
              {projects.map((p) => {
                const ms = miles[p.id] ?? [];
                const done = ms.filter((m) => m.status === "done").length;
                const next = ms.find((m) => m.status !== "done");
                return (
                  <li key={p.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-plum font-medium">{p.ref} · {p.title}</b>
                      <Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill>
                    </div>
                    <p className="text-sm text-muted mt-1">My role: {(p.my_role || "team member").replace(/^./, (c) => c.toUpperCase())} · Stage: {p.stage || "not set"}</p>
                    {ms.length > 0 && (
                      <>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2.5"><i className="block h-full bg-magenta" style={{ width: `${(done / ms.length) * 100}%` }} /></div>
                        <p className="text-xs text-muted mt-1.5">{done} of {ms.length} milestones{next ? ` · next: ${next.name}${next.planned ? `, ${shortDay(next.planned)}` : ""}` : ""}</p>
                      </>
                    )}
                    <button className="mt-3 inline-flex rounded-full bg-magenta hover:bg-magenta-dark text-white px-4 py-2 text-sm font-medium" onClick={() => onOpen(p.id, "workspace")}>Open workspace</button>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="New in my projects">
            {news && news.length === 0 && <p className="text-sm text-muted">Nothing new from your colleagues in the last two weeks.</p>}
            <ul className="divide-y divide-gray-100">
              {news?.map((n) => (
                <li key={n.id} className="py-2.5 flex items-start gap-3 text-sm">
                  <Pill cls={NEWS_TAG[n.event]?.[1] ?? ""}>{NEWS_TAG[n.event]?.[0] ?? "News"}</Pill>
                  <div><button className="text-left hover:underline" onClick={() => onOpen(n.project_id, n.event === "update_added" ? "overview" : "workspace")}>{newsText(n)}</button><div className="text-xs text-muted">{ago(n.at)}</div></div>
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
                <li key={t.id} className="py-2.5 flex items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-1" onChange={() => tickTask(t)} aria-label={`Mark done: ${t.text}`} />
                  <div>
                    <button className="text-left hover:underline" onClick={() => onOpen(t.project_id, "workspace")}>{t.text}</button>
                    <div className="text-xs text-muted">{t.ref}{t.due ? ` · due ${shortDay(t.due)}` : ""}{t.milestone ? ` · Milestone ${t.milestone}` : ""}</div>
                  </div>
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

type MileLite = { n: number; status: string; done: string | null };
type TeamPerson = { user_id: number; name: string; role: string; skills: string; active: number; availability: string; filled: boolean };
const TEAM_ROLES = ["management", "finance", "director", "lead"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// One number card. The first one on the page is the dark gradient card, the rest are white.
const Stat = ({ label, value, note, dark, onClick }: { label: string; value: ReactNode; note?: string; dark?: boolean; onClick?: () => void }) => (
  <div className={`relative overflow-hidden rounded-[18px] p-4 ${dark ? "bg-gradient-to-br from-plum via-plum-soft to-plum text-white" : "bg-white text-ink"}`}>
    {dark && <svg className="absolute -right-12 -bottom-16 opacity-20" width="220" height="220" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="80" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="110" cy="110" r="105" fill="none" stroke="#b241b7" strokeWidth="1.5"/></svg>}
    <div className="relative flex items-start justify-between gap-2">
      <p className={`text-[13px] ${dark ? "text-white" : "text-ink"}`}>{label}</p>
      {onClick && (
        <button onClick={onClick} aria-label={`Open ${label}`} className={`w-7 h-7 rounded-full flex items-center justify-center ${dark ? "bg-white text-plum" : "border border-gray-300 text-ink hover:bg-mist"}`}>
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
    <p className="relative mt-2 text-[28px] leading-none font-medium tracking-tight">{value}</p>
    {note && <p className={`relative mt-2 text-[11px] flex items-center gap-1.5 ${dark ? "text-white/80" : "text-muted"}`}><TrendingUp size={12} aria-hidden="true" /> {note}</p>}
  </div>
);

// Milestones completed on each day of this week, as rounded bars (empty days drawn hatched, as in the design)
const WeekChart = ({ counts }: { counts: number[] }) => {
  const max = Math.max(...counts, 1);
  const top = counts.indexOf(Math.max(...counts));
  const today = (new Date().getDay() + 6) % 7;
  return (
    <div className="flex items-end justify-between gap-2 sm:gap-3 h-36 pt-6">
      {counts.map((c, i) => (
        <div key={DAYS[i]} className="flex-1 h-full flex flex-col items-center justify-end">
          {c > 0 && i === top && <span className="mb-1.5 rounded-md border border-lime bg-white px-1.5 py-0.5 text-[10px] text-plum">{c} done</span>}
          <div
            title={`${DAYS[i]}: ${c} milestone${c === 1 ? "" : "s"} done`}
            className={`w-full max-w-10 rounded-full ${c > 0 ? "bg-gradient-to-b from-plum-soft to-plum" : "hub-hatch"}`}
            style={{ height: c > 0 ? `${Math.max((c / max) * 100, 35)}%` : "55%" }}
          />
          <span className={`mt-1.5 text-[11px] ${i === today ? "text-plum font-medium" : "text-muted"}`}>{DAYS[i]}</span>
        </div>
      ))}
    </div>
  );
};

const Portfolio = ({ me, projects, onOpen, onAll, onReports, onPeople, onTeam }: { me: Me; projects: Project[]; onOpen: (id: number) => void; onAll: () => void; onReports: () => void; onPeople: () => void; onTeam: () => void }) => {
  const [lite, setLite] = useState<Lite | null>(null);
  const [miles, setMiles] = useState<Record<number, MileLite[]>>({});
  const [team, setTeam] = useState<TeamPerson[] | null>(null);
  useEffect(() => {
    if (REPORT_ROLES.includes(me.user.role)) hub<Lite>("reports-summary", { query: { light: "1" } }).then((r) => r.ok && r.data && setLite(r.data));
    if (TEAM_ROLES.includes(me.user.role)) hub<{ directory: TeamPerson[] }>("team").then((r) => setTeam(r.ok && r.data ? r.data.directory : []));
  }, [me.user.role]);
  useEffect(() => {
    projects.forEach((p) => {
      hub<{ milestones: MileLite[] }>("milestones", { query: { id: String(p.id) } }).then((r) => r.ok && r.data && setMiles((m) => ({ ...m, [p.id]: r.data!.milestones })));
    });
  }, [projects]);

  const money = me.user.role === "management" || me.user.role === "finance";
  const attention = attentionFor(projects);
  const closed = projects.filter((p) => miles[p.id]?.some((m) => m.n === 14 && m.status === "done")).length;
  const open = projects.length - closed;
  const onTrack = projects.filter((p) => p.health === "green").length;
  const soon = projects.filter((p) => { const d = daysLeft(p.target_date); return d !== null && d >= 0 && d <= 14; }).length;
  // this week's milestone completions, Monday to Sunday
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return isoDay(d); });
  const counts = week.map((day) => Object.values(miles).flat().filter((m) => m.status === "done" && m.done === day).length);
  const doneThisWeek = counts.reduce((a, b) => a + b, 0);
  const statusOf = (t: TeamPerson): [string, string] =>
    t.availability === "unavailable" ? ["Not available", "bg-red-50 text-red-700 border-red-200"]
    : t.active > 0 ? [`On ${t.active} ${t.active === 1 ? "project" : "projects"}`, "bg-amber-50 text-amber-800 border-amber-200"]
    : ["Available", "bg-lime/30 text-plum border-lime"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Dashboard</h1>
          <p className="text-[13px] text-muted mt-0.5">Plan, track and deliver your research projects with ease.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {me.user.role === "management" && <button onClick={onAll} className="inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3.5 py-1.5 text-xs"><Plus size={14} /> New project</button>}
          {lite && <button onClick={onReports} className="rounded-full border border-plum text-plum px-3.5 py-1.5 text-xs hover:bg-white">Reports and KPIs</button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat dark label="Active projects" value={open} note={`${onTrack} on track`} onClick={onAll} />
        <Stat label="Closed projects" value={closed} note="Close-out form done" onClick={onAll} />
        <Stat label="Needs attention" value={attention.length} note="Late, due soon, payment, reports" />
        {money ? (
          <Stat label="Revenue this month" value={lite?.monthReceived !== undefined ? `₦${Math.round(lite.monthReceived / 1000)}k` : "…"} note="From the payment schedules" onClick={onReports} />
        ) : (
          <Stat label="Due within 14 days" value={soon} note="Target dates coming up" />
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-3">
          <section className="bg-white rounded-[18px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] text-ink">Project analytics</h2>
              <span className="text-[11px] text-muted">Milestones completed this week: {doneThisWeek}</span>
            </div>
            <WeekChart counts={counts} />
          </section>

          {team && (
            <section className="bg-white rounded-[18px] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h2 className="text-[15px] text-ink">Team collaboration</h2>
                <div className="flex gap-2">
                  <button onClick={onTeam} className="rounded-full border border-gray-300 px-3.5 py-1.5 text-xs text-ink hover:bg-mist">View team</button>
                  {me.user.role === "management" && <button onClick={onPeople} className="inline-flex items-center gap-1 rounded-full border border-plum px-3.5 py-1.5 text-xs text-plum hover:bg-mist"><Plus size={13} /> Add member</button>}
                </div>
              </div>
              {team.length === 0 && <p className="text-sm text-muted">No staff yet.</p>}
              <ul>
                {team.slice(0, 6).map((t) => {
                  const [label, cls] = statusOf(t);
                  return (
                    <li key={t.user_id} className="py-2 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[11px] font-semibold shrink-0" aria-hidden="true">{initialsOf(t.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink">{t.name}</p>
                        <p className="text-[11px] text-muted truncate">{ROLE_LABEL[t.role]}{t.filled ? ` — ${t.skills.split(",").slice(0, 3).join(",")}` : " — profile not filled in"}</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] ${cls}`}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-3">
          <section className="bg-white rounded-[18px] p-4">
            <h2 className="text-[15px] text-ink mb-1">Needs attention</h2>
            {attention.length === 0 && <p className="text-sm text-muted">Nothing needs attention right now.</p>}
            <ul className="divide-y divide-gray-100">
              {attention.slice(0, 5).map((a, i) => (
                <li key={i} className="py-1.5 flex items-start gap-2 text-xs">
                  <Pill cls={a.cls}>{a.tag}</Pill>
                  <button className="text-left hover:underline" onClick={() => onOpen(a.project)}>{a.text}</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-[18px] p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-[15px] text-ink">Projects</h2>
              <button className="text-xs text-magenta-dark hover:underline" onClick={onAll}>See all</button>
            </div>
            {projects.length === 0 && <p className="text-sm text-muted">No projects yet.</p>}
            <ul className="divide-y divide-gray-100">
              {projects.slice(0, 5).map((p) => (
                <li key={p.id} className="py-1.5">
                  <button className="w-full text-left" onClick={() => onOpen(p.id)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-ink truncate"><span className="text-magenta-dark">{p.ref}</span> · {p.title}</span>
                      <Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">{p.lead ? `${p.lead} · ` : ""}{p.target_date ? daysText(daysLeft(p.target_date)) : "No target date"}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {lite && (
            <section className="bg-white rounded-[18px] p-4">
              <h2 className="text-[15px] text-ink mb-2">30-day KPIs: {lite.met} of {lite.kpis.length} met</h2>
              <ul className="space-y-2">
                {[...lite.kpis].sort((a, b) => Number(a.value === "Not entered") - Number(b.value === "Not entered")).slice(0, 5).map((k) => (
                  <li key={k.key} className="text-xs">
                    <div className="flex justify-between gap-2"><span>{k.name}</span><span className="text-muted whitespace-nowrap">{k.value}</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5"><i className="block h-full bg-plum" style={{ width: `${Math.max(k.progress, 2)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const Home = ({ me, onOpen, onAll, onReports, onPeople, onTeam }: { me: Me; onOpen: (id: number, tab?: "overview" | "workspace" | "access") => void; onAll: () => void; onReports: () => void; onPeople: () => void; onTeam: () => void }) => {
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
  return me.user.role === "member" ? <MemberHome me={me} projects={projects} onOpen={onOpen} /> : <Portfolio me={me} projects={projects} onOpen={onOpen} onAll={onAll} onReports={onReports} onPeople={onPeople} onTeam={onTeam} />;
};

export default Home;
