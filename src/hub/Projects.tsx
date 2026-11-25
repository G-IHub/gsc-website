import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Btn, Card, Field, inputClass, smallInput } from "../admin/ui";
import { errorText, hub, type Me, type Project } from "./hubApi";
import { HEALTH_LABEL, HEALTH_STYLE, PAY_LABEL, PAY_STYLE, Pill } from "./bits";

type Money = { fee: number; paid: number; currency: string };

export const NewProject = ({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) => {
  const [f, setF] = useState({ ref: "", title: "", unit: "", target_date: "", clientName: "", clientContact: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await hub("project-create", {
      method: "POST",
      body: { ref: f.ref, title: f.title, unit: f.unit, target_date: f.target_date || null, client: { name: f.clientName, contact: f.clientContact } },
    });
    setBusy(false);
    if (r.ok) onDone();
    else setError(errorText(r));
  };
  return (
    <Card title="New project">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Project code" hint="Shown to the whole team, for example GH-006"><input className={inputClass} value={f.ref} onChange={set("ref")} /></Field>
        <Field label="Title"><input className={inputClass} value={f.title} onChange={set("title")} /></Field>
        <Field label="Unit" hint="A director sees projects of their own unit"><input className={inputClass} value={f.unit} onChange={set("unit")} /></Field>
        <Field label="Target date"><input type="date" className={inputClass} value={f.target_date} onChange={set("target_date")} /></Field>
        <Field label="Client name" hint="Hidden from team members"><input className={inputClass} value={f.clientName} onChange={set("clientName")} /></Field>
        <Field label="Client contact"><input className={inputClass} value={f.clientContact} onChange={set("clientContact")} /></Field>
        {error && <p className="sm:col-span-2 text-sm text-red-600" role="alert">{error}</p>}
        <div className="sm:col-span-2 flex gap-2">
          <Btn variant="primary" type="submit" disabled={busy || !f.ref || !f.title}>{busy ? "Saving…" : "Create project"}</Btn>
          <Btn onClick={onCancel}>Cancel</Btn>
        </div>
      </form>
    </Card>
  );
};

export const MoneyCard = ({ id, canEdit }: { id: number; canEdit: boolean }) => {
  const [money, setMoney] = useState<Money | null>(null);
  const [fee, setFee] = useState("");
  const [paid, setPaid] = useState("");
  const [msg, setMsg] = useState("");

  // Opening this card is written to the access log, so it is loaded only when asked for
  const show = async () => {
    const r = await hub<{ money: Money }>("money", { query: { id: String(id) } });
    if (r.ok && r.data) {
      setMoney(r.data.money);
      setFee(String(r.data.money.fee));
      setPaid(String(r.data.money.paid));
    } else setMsg(errorText(r));
  };
  const save = async () => {
    const r = await hub("money-set", { method: "POST", body: { project_id: id, fee: Number(fee) } });
    setMsg(r.ok ? "Saved." : errorText(r));
    if (r.ok) show();
  };
  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <Card title="Fees and payments">
      {!money ? (
        <div>
          <p className="text-sm text-muted mb-3">Opening this is recorded in the access log.</p>
          <Btn onClick={show}>Show fees and payments</Btn>
          {msg && <p className="text-sm text-red-600 mt-3">{msg}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Fee</dt><dd className="text-lg text-plum">{fmt(money.fee)}</dd></div>
            <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Received</dt><dd className="text-lg text-plum">{fmt(money.paid)}</dd></div>
            <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Balance</dt><dd className="text-lg text-plum">{fmt(Math.max(money.fee - money.paid, 0))}</dd></div>
          </dl>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Fee (₦)"><input className={smallInput} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
              <Btn variant="primary" onClick={save}>Save</Btn>
            </div>
          )}
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </div>
      )}
    </Card>
  );
};

type MileLite = { n: number; status: string };
const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const fmtDay = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
const daysTo = (iso: string | null) => {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00`).getTime();
  const n = new Date();
  return Math.round((t - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000);
};
const dueText = (d: number | null) => (d === null ? "No target date" : d < 0 ? `${-d} ${-d === 1 ? "day" : "days"} late` : d === 0 ? "Due today" : `${d} ${d === 1 ? "day" : "days"} left`);

const Tile = ({ label, value, note, dark }: { label: string; value: number | string; note: string; dark?: boolean }) => (
  <div className={`relative overflow-hidden rounded-[14px] p-3 ${dark ? "bg-gradient-to-br from-plum via-plum-soft to-plum text-white" : "bg-white text-ink"}`}>
    {dark && <svg className="absolute -right-12 -bottom-16 opacity-20" width="200" height="200" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="80" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="110" cy="110" r="105" fill="none" stroke="#b241b7" strokeWidth="1.5"/></svg>}
    <p className="relative text-[12px]">{label}</p>
    <p className="relative mt-1.5 text-[22px] leading-none font-medium tracking-tight">{value}</p>
    <p className={`relative mt-1.5 text-[10px] ${dark ? "text-white/80" : "text-muted"}`}>{note}</p>
  </div>
);

const Projects = ({ me, onOpen }: { me: Me; onOpen: (id: number) => void }) => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [filter, setFilter] = useState<"all" | "green" | "amber" | "red">("all");
  const [q, setQ] = useState("");
  const [miles, setMiles] = useState<Record<number, MileLite[]>>({});

  const load = useCallback(async () => {
    const r = await hub<{ projects: Project[] }>("projects");
    if (r.ok && r.data) setProjects(r.data.projects);
    else setError(errorText(r));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useEffect(() => {
    (projects ?? []).forEach((p) => {
      hub<{ milestones: MileLite[] }>("milestones", { query: { id: String(p.id) } }).then((r) => r.ok && r.data && setMiles((m) => ({ ...m, [p.id]: r.data!.milestones })));
    });
  }, [projects]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!projects) return <p className="text-muted">Loading…</p>;
  const all = me.user.role === "management" || me.user.role === "finance";
  const needle = q.trim().toLowerCase();
  const shown = projects.filter((p) => (filter === "all" || p.health === filter) && (!needle || `${p.ref} ${p.title} ${p.client?.name ?? ""} ${p.lead ?? ""} ${p.unit}`.toLowerCase().includes(needle)));
  const count = (h: string) => projects.filter((p) => p.health === h).length;
  const soon = projects.filter((p) => { const d = daysTo(p.target_date); return d !== null && d >= 0 && d <= 14; }).length;
  const progressOf = (id: number) => {
    const ms = miles[id] ?? [];
    return { done: ms.filter((m) => m.status === "done").length, total: ms.length || 14 };
  };
  const chip = (k: typeof filter, label: string, n: number) => (
    <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-[11px] ${filter === k ? "bg-plum border-plum text-white" : "bg-white border-gray-200 text-ink hover:border-gray-300"}`}>{label} <span className="opacity-70">{n}</span></button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{all ? "All projects" : "Your projects"}</h1>
          <p className="text-[12px] text-muted mt-0.5">{projects.length} {projects.length === 1 ? "project" : "projects"}{all ? "" : " you are on"}. Click one to open it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" aria-label="Search projects" className="rounded-full border border-gray-300 bg-white pl-7 pr-3 py-1 text-[11px] w-44" />
          </div>
          <div className="inline-flex rounded-full border border-gray-300 bg-white p-0.5" role="group" aria-label="View">
            {([["cards", LayoutGrid, "Cards"], ["list", List, "List"]] as const).map(([k, Icon, label]) => (
              <button key={k} onClick={() => setView(k)} aria-pressed={view === k} title={label} className={`rounded-full px-2.5 py-1 ${view === k ? "bg-plum text-white" : "text-muted hover:text-ink"}`}><Icon size={13} aria-hidden="true" /></button>
            ))}
          </div>
          {me.user.role === "management" && !adding && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3 py-1 text-[11px]"><Plus size={12} /> New project</button>}
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        <Tile dark label="Active projects" value={projects.length} note={all ? "All projects" : "Projects you are on"} />
        <Tile label="On track" value={count("green")} note="Health marked green" />
        <Tile label="Watch or late" value={count("amber") + count("red")} note={`${count("amber")} to watch · ${count("red")} late`} />
        <Tile label="Due within 14 days" value={soon} note="Target dates coming up" />
      </div>

      {adding && <NewProject onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}

      <div className="flex flex-wrap gap-1.5">
        {chip("all", "All", projects.length)}{chip("green", "On track", count("green"))}{chip("amber", "Watch", count("amber"))}{chip("red", "Late", count("red"))}
      </div>

      {projects.length === 0 ? (
        <section className="bg-white rounded-[14px] p-5 text-[12px] text-muted">{me.user.role === "management" ? "No projects yet. Create the first one with + New project." : "You are not on any project yet. Your lead or management will add you."}</section>
      ) : shown.length === 0 ? (
        <section className="bg-white rounded-[14px] p-5 text-[12px] text-muted">Nothing matches that search or filter.</section>
      ) : view === "cards" ? (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const pr = progressOf(p.id);
            const d = daysTo(p.target_date);
            return (
              <button key={p.id} onClick={() => onOpen(p.id)} className="text-left bg-white rounded-[14px] p-3.5 border border-transparent hover:border-plum/30 hover:shadow-sm transition">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-magenta-tint text-magenta-dark px-1.5 py-0.5 text-[10.5px] font-medium">{p.ref}</span>
                  <Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill>
                </div>
                <p className="text-[13px] text-ink font-medium mt-2 leading-snug line-clamp-2">{p.title}</p>
                <p className="text-[10.5px] text-muted mt-0.5 truncate">{[p.client?.name ? `Client: ${p.client.name}` : null, p.unit ? `Unit: ${p.unit}` : null, p.stage ? `Stage: ${p.stage}` : null].filter(Boolean).join(" · ") || "No stage set"}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10.5px] text-muted"><span>{pr.done} of {pr.total} milestones</span><span className={d !== null && d < 0 ? "text-red-700" : d !== null && d <= 7 ? "text-amber-700" : ""}>{dueText(d)}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1"><i className="block h-full bg-plum" style={{ width: `${(pr.done / pr.total) * 100}%` }} /></div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {p.lead ? <span className="w-6 h-6 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[9px] font-semibold shrink-0" aria-hidden="true">{initialsOf(p.lead)}</span> : null}
                    <span className="text-[11px] text-muted truncate">{p.lead ? `Lead: ${p.lead}` : "No lead yet"}</span>
                  </span>
                  {p.payment_status && <Pill cls={PAY_STYLE[p.payment_status]}>{PAY_LABEL[p.payment_status]}</Pill>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <section className="bg-white rounded-[14px] p-3.5 overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted">
                <th className="py-2 pr-3 font-bold">Code</th><th className="py-2 pr-3 font-bold">Project</th><th className="py-2 pr-3 font-bold">Lead</th>
                <th className="py-2 pr-3 font-bold">Progress</th><th className="py-2 pr-3 font-bold">Due</th><th className="py-2 pr-3 font-bold">Health</th>
                {projects.some((p) => p.payment_status) && <th className="py-2 font-bold">Payment</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((p) => {
                const pr = progressOf(p.id);
                const d = daysTo(p.target_date);
                return (
                  <tr key={p.id} className="hover:bg-mist cursor-pointer" onClick={() => onOpen(p.id)}>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-magenta-dark font-medium">{p.ref}</td>
                    <td className="py-2.5 pr-3 text-ink">{p.title}{p.client?.name && <span className="block text-[10.5px] text-muted">{p.client.name}</span>}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{p.lead ?? <span className="text-muted">—</span>}</td>
                    <td className="py-2.5 pr-3 w-36"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><i className="block h-full bg-plum" style={{ width: `${(pr.done / pr.total) * 100}%` }} /></div><span className="text-[10.5px] text-muted">{pr.done}/{pr.total}</span></div></td>
                    <td className={`py-2.5 pr-3 whitespace-nowrap ${d !== null && d < 0 ? "text-red-700" : ""}`}>{dueText(d)}{p.target_date && <span className="block text-[10.5px] text-muted">{fmtDay(p.target_date)}</span>}</td>
                    <td className="py-2.5 pr-3"><Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill></td>
                    {projects.some((x) => x.payment_status) && <td className="py-2.5">{p.payment_status && <Pill cls={PAY_STYLE[p.payment_status]}>{PAY_LABEL[p.payment_status]}</Pill>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

export default Projects;
