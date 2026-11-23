import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
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

const Projects = ({ me, onOpen }: { me: Me; onOpen: (id: number) => void }) => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");
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

  if (error) return <p className="text-red-600">{error}</p>;
  if (!projects) return <p className="text-muted">Loading…</p>;
  const showClient = projects.some((p) => p.client);
  const showPay = projects.some((p) => p.payment_status);

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
                  <th className="py-2 pr-3 font-bold">Health</th>{showPay && <th className="py-2 font-bold">Payment</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-mist cursor-pointer" onClick={() => onOpen(p.id)}>
                    <td className="py-3 pr-3"><button className="text-magenta-dark font-medium hover:underline" onClick={() => onOpen(p.id)}>{p.ref}</button></td>
                    <td className="py-3 pr-3 text-plum">{p.title}</td>
                    {showClient && <td className="py-3 pr-3">{p.client?.name}</td>}
                    <td className="py-3 pr-3 text-muted">{p.stage || "—"}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{p.target_date ?? "—"}</td>
                    <td className="py-3 pr-3"><Pill cls={HEALTH_STYLE[p.health]}>{HEALTH_LABEL[p.health]}</Pill></td>
                    {showPay && <td className="py-3">{p.payment_status && <Pill cls={PAY_STYLE[p.payment_status]}>{PAY_LABEL[p.payment_status]}</Pill>}</td>}
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
