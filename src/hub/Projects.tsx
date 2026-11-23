import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Btn, Card, Field, inputClass, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type Me, type Project } from "./hubApi";

const HEALTH_STYLE: Record<string, string> = {
  green: "bg-lime text-plum",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
};
const HEALTH_LABEL: Record<string, string> = { green: "On track", amber: "Watch", red: "Late" };
const PAY_LABEL: Record<string, string> = { not_cleared: "Not cleared", cleared: "Cleared", balance_due: "Balance due", paid: "Paid" };
const PAY_STYLE: Record<string, string> = {
  not_cleared: "bg-gray-200 text-gray-700",
  cleared: "bg-blue-100 text-blue-800",
  balance_due: "bg-amber-100 text-amber-800",
  paid: "bg-lime text-plum",
};

export const Pill = ({ cls, children }: { cls: string; children: string }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>{children}</span>
);

type Member = { user_id: number; name: string; role: string; project_role: string };
type Detail = { project: Project; members: Member[]; canSeeMoney: boolean; canManageMembers: boolean };
type Money = { fee: number; paid: number; currency: string };

const NewProject = ({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) => {
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

const MoneyCard = ({ id, canEdit }: { id: number; canEdit: boolean }) => {
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
    const r = await hub("money-set", { method: "POST", body: { project_id: id, fee: Number(fee), paid: Number(paid) } });
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
            <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Paid</dt><dd className="text-lg text-plum">{fmt(money.paid)}</dd></div>
            <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Balance</dt><dd className="text-lg text-plum">{fmt(Math.max(money.fee - money.paid, 0))}</dd></div>
          </dl>
          {canEdit && (
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Fee (₦)"><input className={smallInput} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
              <Field label="Paid so far (₦)"><input className={smallInput} inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></Field>
              <Btn variant="primary" onClick={save}>Save</Btn>
            </div>
          )}
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </div>
      )}
    </Card>
  );
};

const ProjectDetail = ({ id, me, onBack }: { id: number; me: Me; onBack: () => void }) => {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [people, setPeople] = useState<{ id: number; name: string; role: string }[]>([]);
  const [pick, setPick] = useState("");
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
    if (r.data.canManageMembers) {
      const pr = await hub<{ people: { id: number; name: string; role: string }[] }>("people");
      if (pr.ok && pr.data) setPeople(pr.data.people);
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (error) return <Card><p className="text-red-600">{error}</p><Btn className="mt-3" onClick={onBack}>Back</Btn></Card>;
  if (!d) return <p className="text-muted">Loading…</p>;
  const p = d.project;
  const memberIds = new Set(d.members.map((m) => m.user_id));

  const saveDetails = async () => {
    const r = await hub("project-update", { method: "POST", body: { id: p.id, ...edit, target_date: edit.target_date || null } });
    setMsg(r.ok ? "Saved." : errorText(r));
    if (r.ok) load();
  };
  const setPayment = async (v: string) => {
    const r = await hub("project-update", { method: "POST", body: { id: p.id, payment_status: v } });
    setMsg(r.ok ? "Payment status updated." : errorText(r));
    if (r.ok) load();
  };
  const member = async (action: "member-add" | "member-remove", user_id: number) => {
    const r = await hub(action, { method: "POST", body: { project_id: p.id, user_id } });
    if (!r.ok) setMsg(errorText(r));
    else {
      setPick("");
      load();
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-plum"><ArrowLeft size={16} /> All projects</button>
      <Card>
        <p className="text-xs font-bold tracking-widest uppercase text-magenta-dark">{p.ref}</p>
        <h2 className="text-2xl text-plum mt-1">{p.title}</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill>
          <Pill cls={PAY_STYLE[p.payment_status]}>{`Payment: ${PAY_LABEL[p.payment_status]}`}</Pill>
          {p.unit && <Pill cls="bg-magenta-tint text-magenta-dark">{p.unit}</Pill>}
        </div>
        <dl className="grid sm:grid-cols-3 gap-4 mt-5 text-sm">
          <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Stage</dt><dd className="mt-1">{p.stage || "Not set"}</dd></div>
          <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Target date</dt><dd className="mt-1">{p.target_date ?? "Not set"}</dd></div>
          {p.client && (
            <div><dt className="text-xs uppercase tracking-widest text-muted font-bold">Client</dt><dd className="mt-1">{p.client.name || "Not set"}<span className="block text-muted">{p.client.contact}</span></dd></div>
          )}
        </dl>
        {!p.client && <p className="text-xs text-muted mt-4">Client details are hidden for your role. Use the project code.</p>}
      </Card>

      {d.canManageMembers && (
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
          <Btn variant="primary" className="mt-4" onClick={saveDetails}>Save changes</Btn>
        </Card>
      )}

      {moneyRole && (
        <Card title="Payment status flag">
          <p className="text-sm text-muted mb-3">This is the flag everyone on the project sees. Amounts stay in the Fees card.</p>
          <select className={`${smallInput} max-w-xs`} value={p.payment_status} onChange={(e) => setPayment(e.target.value)}>
            {Object.entries(PAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Card>
      )}
      {d.canSeeMoney && <MoneyCard id={p.id} canEdit={moneyRole} />}

      <Card title="People on this project">
        <ul className="divide-y divide-gray-100">
          {d.members.length === 0 && <li className="py-2 text-sm text-muted">Nobody is on this project yet.</li>}
          {d.members.map((m) => (
            <li key={m.user_id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <span><span className="text-plum font-medium">{m.name}</span> <span className="text-muted">· {m.project_role || ROLE_LABEL[m.role]}</span></span>
              {d.canManageMembers && <Btn variant="ghost" onClick={() => member("member-remove", m.user_id)}>Remove</Btn>}
            </li>
          ))}
        </ul>
        {d.canManageMembers && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select className={`${smallInput} max-w-xs`} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Add a person">
              <option value="">Add a person…</option>
              {people.filter((x) => !memberIds.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name} ({ROLE_LABEL[x.role]})</option>)}
            </select>
            <Btn variant="primary" disabled={!pick} onClick={() => member("member-add", Number(pick))}>Add</Btn>
          </div>
        )}
      </Card>
      {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
    </div>
  );
};

const Projects = ({ me }: { me: Me }) => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const r = await hub<{ projects: Project[] }>("projects");
    if (r.ok && r.data) setProjects(r.data.projects);
    else setError(errorText(r));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (open !== null) return <ProjectDetail id={open} me={me} onBack={() => { setOpen(null); load(); }} />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!projects) return <p className="text-muted">Loading…</p>;
  const showClient = projects.some((p) => p.client);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl text-plum">{me.user.role === "management" || me.user.role === "finance" ? "All projects" : "Your projects"}</h1>
          <p className="text-sm text-muted mt-1">{projects.length} {projects.length === 1 ? "project" : "projects"}</p>
        </div>
        {me.user.role === "management" && !adding && <Btn variant="primary" onClick={() => setAdding(true)}><Plus size={16} /> New project</Btn>}
      </div>
      {adding && <NewProject onCancel={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
      <Card>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">You are not on any project yet. Your lead or management will add you.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-3 font-bold">Code</th><th className="py-2 pr-3 font-bold">Project</th>
                  {showClient && <th className="py-2 pr-3 font-bold">Client</th>}
                  <th className="py-2 pr-3 font-bold">Stage</th><th className="py-2 pr-3 font-bold">Target</th>
                  <th className="py-2 pr-3 font-bold">Health</th><th className="py-2 font-bold">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-mist cursor-pointer" onClick={() => setOpen(p.id)}>
                    <td className="py-3 pr-3"><button className="text-magenta-dark font-medium hover:underline" onClick={() => setOpen(p.id)}>{p.ref}</button></td>
                    <td className="py-3 pr-3 text-plum">{p.title}</td>
                    {showClient && <td className="py-3 pr-3">{p.client?.name}</td>}
                    <td className="py-3 pr-3 text-muted">{p.stage || "—"}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{p.target_date ?? "—"}</td>
                    <td className="py-3 pr-3"><Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill></td>
                    <td className="py-3"><Pill cls={PAY_STYLE[p.payment_status]}>{PAY_LABEL[p.payment_status]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Projects;
