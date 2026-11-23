import { useState, type FormEvent } from "react";
import { Btn, Card, Field, inputClass } from "../admin/ui";
import { errorText, hub } from "./hubApi";

const Account = () => {
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("change-password", { method: "POST", body: { oldPassword, newPassword } });
    setMsg({ ok: r.ok, text: r.ok ? "Password changed." : errorText(r) });
    if (r.ok) {
      setOld("");
      setNew("");
    }
  };
  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl text-plum">My account</h1>
      <Card title="Change password">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current password"><input type="password" autoComplete="current-password" className={inputClass} value={oldPassword} onChange={(e) => setOld(e.target.value)} /></Field>
          <Field label="New password" hint="At least 10 characters"><input type="password" autoComplete="new-password" className={inputClass} value={newPassword} onChange={(e) => setNew(e.target.value)} /></Field>
          {msg && <p className={`text-sm ${msg.ok ? "text-plum" : "text-red-600"}`} role="status">{msg.text}</p>}
          <Btn variant="primary" type="submit" disabled={!oldPassword || newPassword.length < 10}>Change password</Btn>
        </form>
      </Card>
    </div>
  );
};

export default Account;
