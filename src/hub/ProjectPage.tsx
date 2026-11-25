import { useCallback, useEffect, useState } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type Me, type Project } from "./hubApi";
import { HEALTH_LABEL, HEALTH_STYLE, PAY_LABEL, PAY_STYLE, Pill, ViewingAs, daysLeft, daysText } from "./bits";
import ProjectAccess, { type Member, type Person } from "./ProjectAccess";
import { MoneyCard } from "./Projects";
import Milestones, { progressOf, type Milestone } from "./Milestones";
import Updates from "./Updates";
import Clearance from "./Clearance";
import Payments from "./Payments";
import ChangeLog from "./ChangeLog";
import Workspace from "./Workspace";
import QaChecklist from "./QaChecklist";
import ClientTab from "./ClientTab";

// One project: header, tabs (Overview, Workspace, People and access)

type Detail = { project: Project; members: Member[]; canSeeMoney: boolean; canManageMembers: boolean };
export type Tab = "overview" | "workspace" | "qa" | "client" | "access";

const Label = ({ children }: { children: string }) => <p className="text-xs uppercase tracking-widest text-muted font-bold">{children}</p>;

const ProjectPage = ({ id, me, onHome, onProjects, initialTab = "overview" }: { id: number; me: Me; onHome: () => void; onProjects: () => void; initialTab?: Tab }) => {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>(initialTab);
  const [people, setPeople] = useState<Person[]>([]);
  const [miles, setMiles] = useState<Milestone[]>([]);
  const [edit, setEdit] = useState({ stage: "", health: "green", target_date: "" });
  const [msg, setMsg] = useState("");
  const [openUpdate, setOpenUpdate] = useState(0);
  const role = me.user.role;
  const moneyRole = role === "management" || role === "finance";

  const load = useCallback(async () => {
    const r = await hub<Detail>("project", { query: { id: String(id) } });
    if (!r.ok || !r.data) return setError(errorText(r));
    setD(r.data);
    const p = r.data.project;
    setEdit({ stage: p.stage, health: p.health, target_date: p.target_date ?? "" });
    const mr = await hub<{ milestones: Milestone[] }>("milestones", { query: { id: String(id) } });
    if (mr.ok && mr.data) setMiles(mr.data.milestones);
    if (r.data.canManageMembers) {
      const pr = await hub<{ people: Person[] }>("people");
      if (pr.ok && pr.data) setPeople(pr.data.people);
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (error) return <Card><p className="text-red-600">{error}</p><Btn className="mt-3" onClick={onProjects}>Back to projects</Btn></Card>;
  if (!d) return <p className="text-muted">Loading…</p>;
  const p = d.project;
  const days = daysLeft(p.target_date);
  const progress = progressOf(miles);

  const update = async (body: Record<string, unknown>, ok: string) => {
    const r = await hub("project-update", { method: "POST", body: { id: p.id, ...body } });
    setMsg(r.ok ? ok : errorText(r));
    if (r.ok) load();
  };

  const inWorkspace = role === "management" || d.members.some((m) => m.user_id === me.user.id);
  const tabs: [Tab, string][] = [["overview", "Overview"], ...(inWorkspace ? ([["workspace", "Workspace"], ["qa", "QA checklist"], ["client", "Client"]] as [Tab, string][]) : []), ["access", "People and access"]];

  const fmtDay = (iso?: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null);
  const started = miles.find((m) => m.n === 2)?.done ?? null;
  const dueTone = days === null ? "text-muted" : days < 0 ? "text-red-700" : days <= 7 ? "text-amber-700" : "text-ink";
  const roleOf = (m: Member) => (m.project_role || ROLE_LABEL[m.role] || "").replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">
        <button className="hover:text-plum hover:underline" onClick={onHome}>Home</button> /{" "}
        <button className="hover:text-plum hover:underline" onClick={onProjects}>Projects</button> / {p.ref}
      </p>

      {/* header card: title, one quiet line, the team, one action */}
      <section className="bg-white rounded-[16px] px-4 py-3.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="!text-[20px] leading-tight">{p.title} <span className="text-[12px] text-muted font-normal">· {p.ref}</span></h1>
          <p className="text-[12px] text-muted mt-1">
            {p.client && <span title={p.client.contact || undefined}>Client: {p.client.name || "not set"} · </span>}
            {p.unit && <>Unit: {p.unit} · </>}
            Stage: {p.stage || "not set"}
          </p>
          <div className="flex items-center mt-2.5">
            {d.members.slice(0, 6).map((m) => (
              <span key={m.user_id} title={`${m.name} · ${roleOf(m)}`} className="-ml-1.5 first:ml-0 w-7 h-7 rounded-full ring-2 ring-white bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[10px] font-semibold">
                {m.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
              </span>
            ))}
            <span className="ml-2 text-[11px] text-muted">
              {d.members.length === 0 ? "No one on this project yet" : d.members.slice(0, 3).map((m) => `${m.name} (${roleOf(m)})`).join(", ") + (d.members.length > 3 ? ` +${d.members.length - 3}` : "")}
            </span>
          </div>
        </div>
        {inWorkspace && (
          <button onClick={() => { setTab("overview"); setOpenUpdate((n) => n + 1); setTimeout(() => document.getElementById("weekly-updates")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3.5 py-1.5 text-[12px]">+ Add weekly update</button>
        )}
      </section>

      {/* four compact tiles, like the dashboard */}
      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-[14px] px-3.5 py-3">
          <p className="text-[11px] text-muted">Health</p>
          <div className="mt-1.5"><Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill></div>
          <p className="text-[10.5px] text-muted mt-1.5 truncate">Stage: {p.stage || "not set"}</p>
        </div>
        <div className="bg-white rounded-[14px] px-3.5 py-3">
          <p className="text-[11px] text-muted">Due</p>
          <p className={`text-[18px] font-medium leading-tight mt-1 ${dueTone}`}>{days === null ? "—" : days < 0 ? `${-days} ${-days === 1 ? "day" : "days"} late` : days === 0 ? "Today" : `${days} ${days === 1 ? "day" : "days"}`}</p>
          <p className="text-[10.5px] text-muted mt-1 truncate">{fmtDay(p.target_date) ? `Target ${fmtDay(p.target_date)}` : "No target date"}</p>
        </div>
        <div className="bg-white rounded-[14px] px-3.5 py-3">
          <p className="text-[11px] text-muted">Progress</p>
          <p className="text-[18px] font-medium leading-tight mt-1">{progress.done}<span className="text-[12px] text-muted font-normal"> / {progress.total || 14} milestones</span></p>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5"><i className="block h-full bg-plum" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
          <p className="text-[10.5px] text-muted mt-1 truncate" title={progress.next?.name}>{progress.next ? `Next: ${progress.next.name}` : progress.total ? "All milestones done" : "No milestones yet"}</p>
        </div>
        {p.payment_status ? (
          <div className="bg-white rounded-[14px] px-3.5 py-3">
            <p className="text-[11px] text-muted">Clearance and payment</p>
            <div className="mt-1.5"><Pill cls={PAY_STYLE[p.payment_status]}>{PAY_LABEL[p.payment_status]}</Pill></div>
            <p className="text-[10.5px] text-muted mt-1.5 truncate">{started ? `Started ${fmtDay(started)}` : "Not started yet"}</p>
          </div>
        ) : (
          <div className="bg-white rounded-[14px] px-3.5 py-3">
            <p className="text-[11px] text-muted">Started</p>
            <p className="text-[18px] font-medium leading-tight mt-1">{started ? fmtDay(started) : "Not yet"}</p>
            <p className="text-[10.5px] text-muted mt-1">When the proposal was accepted</p>
          </div>
        )}
      </div>

      {/* slim tab bar */}
      <div className="flex items-end justify-between gap-3 border-b border-gray-200" role="tablist">
        <div className="flex flex-wrap gap-5">
          {tabs.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`-mb-px pb-2 pt-1 text-[13px] border-b-2 transition-colors ${tab === key ? "border-plum text-plum font-medium" : "border-transparent text-muted hover:text-ink"}`}>{label}</button>
          ))}
        </div>
        <span className="hidden sm:block pb-2 text-[10.5px] text-muted">Viewing as {ROLE_LABEL[role]?.toLowerCase() ?? role}</span>
      </div>

      {tab === "client" && inWorkspace ? (
        <ClientTab projectId={p.id} />
      ) : tab === "qa" && inWorkspace ? (
        <QaChecklist projectId={p.id} onChanged={load} />
      ) : tab === "workspace" && inWorkspace ? (
        <Workspace projectId={p.id} meId={me.user.id} members={d.members} />
      ) : tab === "access" ? (
        <ProjectAccess projectId={p.id} members={d.members} people={people} canManage={d.canManageMembers} isManagement={role === "management"} onChanged={load} />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-5">
              {miles.length > 0 && <Milestones projectId={p.id} rows={miles} onChanged={load} />}
              {d.canManageMembers ? (
                <Card title="Update this project">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="Stage"><input className={smallInput} value={edit.stage} onChange={(e) => setEdit({ ...edit, stage: e.target.value })} /></Field>
                    <Field label="Health">
                      <select className={smallInput} value={edit.health} onChange={(e) => setEdit({ ...edit, health: e.target.value })}>
                        {Object.entries(HEALTH_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label="Target date"><input type="date" className={smallInput} value={edit.target_date} onChange={(e) => setEdit({ ...edit, target_date: e.target.value })} /></Field>
                  </div>
                  <Btn variant="primary" className="mt-4" onClick={() => update({ ...edit, target_date: edit.target_date || null }, "Saved.")}>Save changes</Btn>
                </Card>
              ) : (
                <Card title="Project details"><p className="text-sm text-muted">Your lead or management updates the stage, health and dates.</p></Card>
              )}
              {!p.client && <p className="text-xs text-muted">Client details are hidden for your role. Use the project code.</p>}
            </div>
            <div className="space-y-5">
              {moneyRole && (
                <Clearance projectId={p.id} onChanged={load}>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Field label="Payment status the project team sees" hint={'It can move past "Not cleared" only when all five checks are ticked.'}>
                      <select className={`${smallInput} max-w-xs`} value={p.payment_status} onChange={(e) => update({ payment_status: e.target.value }, "Payment status updated.")}>
                        {Object.entries(PAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </Field>
                  </div>
                </Clearance>
              )}
              {moneyRole && <Payments projectId={p.id} />}
              {d.canSeeMoney && !moneyRole && <MoneyCard id={p.id} canEdit={false} />}
              <div id="weekly-updates" className="scroll-mt-4"><Updates projectId={p.id} onChanged={load} openSignal={openUpdate} /></div>
              <ChangeLog projectId={p.id} />
              {!d.canSeeMoney && <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 p-4 text-xs text-muted">Fees, payments, budget and margin are visible to Finance and management only.</div>}
            </div>
          </div>
          {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
        </>
      )}
    </div>
  );
};

export default ProjectPage;
