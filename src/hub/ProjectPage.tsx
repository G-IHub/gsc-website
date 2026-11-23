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

// One project: header, tabs (Overview, Workspace, People and access)

type Detail = { project: Project; members: Member[]; canSeeMoney: boolean; canManageMembers: boolean };
type Tab = "overview" | "workspace" | "access";

const Label = ({ children }: { children: string }) => <p className="text-xs uppercase tracking-widest text-muted font-bold">{children}</p>;

const ProjectPage = ({ id, me, onHome, onProjects }: { id: number; me: Me; onHome: () => void; onProjects: () => void }) => {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [people, setPeople] = useState<Person[]>([]);
  const [miles, setMiles] = useState<Milestone[]>([]);
  const [edit, setEdit] = useState({ stage: "", health: "green", target_date: "" });
  const [msg, setMsg] = useState("");
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
  const tabs: [Tab, string][] = [["overview", "Overview"], ...(inWorkspace ? ([["workspace", "Workspace"]] as [Tab, string][]) : []), ["access", "People and access"]];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            <button className="hover:text-plum hover:underline" onClick={onHome}>Home</button> /{" "}
            <button className="hover:text-plum hover:underline" onClick={onProjects}>Projects</button> / {p.ref}
          </p>
          <h1 className="text-2xl text-plum mt-2">{p.title}</h1>
          {p.client && <p className="text-sm text-muted mt-1">Client: {p.client.name || "not set"}{p.client.contact ? ` · ${p.client.contact}` : ""}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewingAs label={ROLE_LABEL[role]?.toLowerCase() ?? role} />
          {days !== null && <Pill cls={days < 0 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-amber-100 text-amber-800" : "bg-lime text-plum"}>{daysText(days)}</Pill>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map(([key, label]) =>
          (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${tab === key ? "bg-magenta border-magenta text-white" : "border-gray-200 bg-white text-plum hover:border-gray-300"}`}>{label}</button>
          ),
        )}
      </div>

      {tab === "workspace" && inWorkspace ? (
        <Workspace projectId={p.id} meId={me.user.id} members={d.members} />
      ) : tab === "access" ? (
        <ProjectAccess projectId={p.id} members={d.members} people={people} canManage={d.canManageMembers} isManagement={role === "management"} onChanged={load} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Genomac team">
              {d.members.length === 0 && <p className="text-sm text-muted">Nobody is on this project yet.</p>}
              <ul className="space-y-1.5 text-sm">
                {d.members.map((m) => <li key={m.user_id}><span className="text-muted first-letter:uppercase inline-block">{m.project_role || ROLE_LABEL[m.role]}:</span> <span className="text-plum font-medium">{m.name}</span></li>)}
              </ul>
            </Card>
            <Card title="Dates">
              <dl className="space-y-2 text-sm">
                <div><Label>Target delivery</Label><dd className="mt-0.5">{p.target_date ?? "Not set"}</dd></div>
                {p.payment_status && <div><Label>Cleared to start</Label><dd className="mt-0.5">{p.payment_status === "not_cleared" ? "No" : "Yes"}</dd></div>}
              </dl>
            </Card>
            <Card title="Status">
              <div className="flex flex-wrap gap-2">
                <Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill>
                {p.payment_status && <Pill cls={PAY_STYLE[p.payment_status]}>{`Payment: ${PAY_LABEL[p.payment_status]}`}</Pill>}
                {p.unit && <Pill cls="bg-magenta-tint text-magenta-dark">{p.unit}</Pill>}
              </div>
              <p className="text-sm text-muted mt-3">Stage: {p.stage || "not set"}</p>
              {miles.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-plum font-medium">{progress.done} of {progress.total} milestones done</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1.5"><i className="block h-full bg-magenta" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
                  {progress.next && <p className="text-xs text-muted mt-1.5">Next: {progress.next.name}</p>}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
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
              {moneyRole && <Clearance projectId={p.id} onChanged={load} />}
              {moneyRole && (
                <Card title="Payment status flag">
                  <p className="text-sm text-muted mb-3">This is the flag the project team sees. It can move past "Not cleared" only when every clearance check is ticked.</p>
                  <select className={`${smallInput} max-w-xs`} value={p.payment_status} onChange={(e) => update({ payment_status: e.target.value }, "Payment status updated.")}>
                    {Object.entries(PAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Card>
              )}
              {d.canSeeMoney && <MoneyCard id={p.id} canEdit={moneyRole} />}
              {moneyRole && <Payments projectId={p.id} />}
              <Updates projectId={p.id} onChanged={load} />
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
