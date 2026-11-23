import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Field, inputClass, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type HubUser, type Me } from "./hubApi";

// Management only: the staff list, adding people, changing roles, switching accounts on and off

const People = ({ me }: { me: Me }) => {
  const [users, setUsers] = useState<HubUser[] | null>(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ name: "", email: "", role: "member", unit: "" });
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

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
  const update = async (id: number, patch: Partial<HubUser>) => {
    const r = await hub("user-update", { method: "POST", body: { id, ...patch } });
    setMsg(r.ok ? "" : errorText(r));
    load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl text-plum">People</h1>

      <Card title="Add a person">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-4 items-end">
          <Field label="Name"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email"><input type="email" className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Role">
            <select className={inputClass} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Unit" hint="Directors only"><input className={inputClass} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
          <div className="sm:col-span-4"><Btn variant="primary" type="submit" disabled={!f.name || !f.email}>Create account</Btn></div>
        </form>
        {temp && (
          <div className="mt-4 rounded-2xl bg-magenta-tint p-4 text-sm">
            <p className="text-plum font-medium">Account created for {temp.email}</p>
            <p className="mt-1">One-time password: <code className="bg-white px-2 py-0.5 rounded">{temp.password}</code></p>
            <p className="text-muted mt-1">Shown once. Give it to the person privately and ask them to change it under My account.</p>
          </div>
        )}
      </Card>

      {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
      <Card title="Everyone">
        {!users ? <p className="text-muted">Loading…</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">Name</th><th className="py-2 pr-3 font-bold">Email</th><th className="py-2 pr-3 font-bold">Role</th><th className="py-2 pr-3 font-bold">Unit</th><th className="py-2 font-bold">Account</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <td className="py-3 pr-3 text-plum font-medium">{u.name}</td>
                    <td className="py-3 pr-3">{u.email}</td>
                    <td className="py-3 pr-3">
                      <select className={smallInput} value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} aria-label={`Role for ${u.name}`}>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-3">{u.unit || "—"}</td>
                    <td className="py-3">
                      <Btn variant={u.active ? "secondary" : "primary"} onClick={() => update(u.id, { active: !u.active })} disabled={u.id === me.user.id}>
                        {u.active ? "Switch off" : "Switch on"}
                      </Btn>
                    </td>
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

export default People;
