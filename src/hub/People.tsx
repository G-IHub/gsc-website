import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, Plus, Search } from "lucide-react";
import { Btn, Field, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type HubUser, type Me } from "./hubApi";

// Management only: the staff list, adding people, changing roles, switching accounts on and off

const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const Tile = ({ label, value, note, dark }: { label: string; value: number | string; note: string; dark?: boolean }) => (
  <div className={`relative overflow-hidden rounded-[14px] p-3 ${dark ? "bg-gradient-to-br from-plum via-plum-soft to-plum text-white" : "bg-white text-ink"}`}>
    {dark && <svg className="absolute -right-12 -bottom-16 opacity-20" width="200" height="200" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="80" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="110" cy="110" r="105" fill="none" stroke="#b241b7" strokeWidth="1.5"/></svg>}
    <p className="relative text-[12px]">{label}</p>
    <p className="relative mt-1.5 text-[22px] leading-none font-medium tracking-tight">{value}</p>
    <p className={`relative mt-1.5 text-[10px] truncate ${dark ? "text-white/80" : "text-muted"}`}>{note}</p>
  </div>
);

const People = ({ me }: { me: Me }) => {
  const [users, setUsers] = useState<HubUser[] | null>(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", email: "", role: "member", unit: "" });
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await hub<{ users: HubUser[] }>("users");
    if (r.ok && r.data) setUsers(r.data.users);
    else setMsg(errorText(r));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub<{ tempPassword: string }>("user-create", { method: "POST", body: f });
    if (r.ok && r.data) {
      setTemp({ email: f.email, password: r.data.tempPassword });
      setF({ name: "", email: "", role: "member", unit: "" });
      setMsg("");
      load();
    } else setMsg(errorText(r));
  };
  const toggle = (u: HubUser) => {
    const verb = u.active ? "Switch off" : "Switch on";
    if (!window.confirm(`${verb} ${u.name}'s account? ${u.active ? "They will be signed out and cannot sign in until it is switched on again." : "They will be able to sign in again."}`)) return;
    update(u.id, { active: !u.active });
  };
  const update = async (id: number, patch: Partial<HubUser>) => {
    const r = await hub("user-update", { method: "POST", body: { id, ...patch } });
    setMsg(r.ok ? "" : errorText(r));
    load();
  };

  const list = users ?? [];
  const activeN = list.filter((u) => u.active).length;
  const byRole = (r: string) => list.filter((u) => u.role === r && u.active).length;
  const needle = q.trim().toLowerCase();
  const shown = list.filter((u) =>
    (roleFilter === "all" || (roleFilter === "off" ? !u.active : u.role === roleFilter && u.active)) &&
    (!needle || `${u.name} ${u.email} ${u.unit}`.toLowerCase().includes(needle)));
  const chip = (k: string, label: string, n: number) => (
    <button key={k} onClick={() => setRoleFilter(k)} className={`rounded-full border px-3 py-1 text-[11px] ${roleFilter === k ? "bg-plum border-plum text-white" : "bg-white border-gray-200 text-ink hover:border-gray-300"}`}>{label} <span className="opacity-70">{n}</span></button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>People</h1>
          <p className="text-[12px] text-muted mt-0.5">Staff accounts for the Research Hub: who can sign in, and with which role.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" className="rounded-full border border-gray-300 bg-white pl-7 pr-3 py-1 text-[11px] w-44" />
          </div>
          {!adding && <button onClick={() => { setAdding(true); setTemp(null); }} className="inline-flex items-center gap-1 rounded-full bg-plum hover:bg-plum-soft text-white px-3 py-1 text-[11px]"><Plus size={12} /> Add person</button>}
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        <Tile dark label="Staff accounts" value={list.length} note="Everyone with a hub account" />
        <Tile label="Active" value={activeN} note="Can sign in" />
        <Tile label="Switched off" value={list.length - activeN} note="Cannot sign in" />
        <Tile label="By role" value={`${byRole("lead")} ${byRole("lead") === 1 ? "lead" : "leads"}`} note={`${byRole("member")} team members · ${byRole("coordinator")} coordinators · ${byRole("finance")} finance`} />
      </div>

      {adding && (
        <section className="bg-white rounded-[14px] p-3.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-[13px] text-ink font-medium">Add a person</h2>
            <button className="text-[11px] text-muted hover:text-plum" onClick={() => { setAdding(false); setTemp(null); }}>Close</button>
          </div>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <Field label="Name"><input className={smallInput} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email"><input type="email" className={smallInput} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Role">
              <select className={smallInput} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Unit"><input className={smallInput} value={f.unit} placeholder="Needed for directors" onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
            <Btn variant="primary" type="submit" disabled={!f.name || !f.email}>Create account</Btn>
          </form>
          {temp && (
            <div className="mt-3 rounded-xl bg-magenta-tint/60 p-3 text-[12px] flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="text-plum font-medium">Account created for {temp.email}</p>
                <p className="text-muted text-[11px] mt-0.5">Shown once. Give it to the person privately; they change it under My account.</p>
              </div>
              <code className="bg-white px-2.5 py-1 rounded-md text-[13px] tracking-wide">{temp.password}</code>
              <button onClick={async () => { try { await navigator.clipboard.writeText(temp.password); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } }}
                className="inline-flex items-center gap-1 rounded-full border border-plum text-plum px-3 py-1 text-[11px] hover:bg-white"><Copy size={12} /> {copied ? "Copied" : "Copy"}</button>
            </div>
          )}
        </section>
      )}

      {msg && <p className="text-[12px] text-red-600" role="alert">{msg}</p>}

      <div className="flex flex-wrap gap-1.5">
        {chip("all", "All", list.length)}
        {Object.entries(ROLE_LABEL).map(([k, v]) => chip(k, v, byRole(k)))}
        {chip("off", "Switched off", list.length - activeN)}
      </div>

      <section className="bg-white rounded-[14px] p-3.5">
        {!users ? <p className="text-[12px] text-muted">Loading…</p> : shown.length === 0 ? <p className="text-[12px] text-muted">Nobody matches.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">Person</th><th className="py-2 pr-3 font-bold">Role</th><th className="py-2 pr-3 font-bold">Unit</th><th className="py-2 pr-3 font-bold">Account</th><th className="py-2"></th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[10px] font-semibold shrink-0" aria-hidden="true">{initialsOf(u.name)}</span>
                        <div className="min-w-0"><p className="text-ink font-medium truncate">{u.name}{u.id === me.user.id && <span className="ml-1.5 text-[10px] text-muted">(you)</span>}</p><p className="text-[10.5px] text-muted truncate">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <select className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px]" value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} aria-label={`Role for ${u.name}`}>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input className="w-28 rounded-md border border-transparent hover:border-gray-200 focus:border-gray-300 bg-transparent px-1.5 py-0.5 text-[11px]" defaultValue={u.unit} placeholder="—"
                        onBlur={(e) => e.target.value !== u.unit && update(u.id, { unit: e.target.value })} aria-label={`Unit for ${u.name}`} />
                    </td>
                    <td className="py-2.5 pr-3">{u.active ? <span className="rounded-full bg-lime px-2 py-0.5 text-[10.5px] text-plum">Active</span> : <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10.5px] text-gray-600">Switched off</span>}</td>
                    <td className="py-2.5 text-right">
                      {u.id !== me.user.id && (
                        <button onClick={() => toggle(u)} className={`rounded-full px-3 py-1 text-[11px] ${u.active ? "border border-gray-300 text-ink hover:border-red-300 hover:text-red-700" : "bg-plum text-white hover:bg-plum-soft"}`}>
                          {u.active ? "Switch off" : "Switch on"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default People;
