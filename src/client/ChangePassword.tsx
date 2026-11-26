import { useState, type FormEvent } from "react";
import { api, errText } from "./clientApi";

// The client changes the one-time password their team gave them (or any time later).
// Other signed-in sessions end; this one stays signed in.
const box = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-plum";

const ChangePassword = ({ onClose }: { onClose: () => void }) => {
  const [f, setF] = useState({ oldPassword: "", newPassword: "", again: "" });
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.newPassword !== f.again) return setMsg("The two new passwords are not the same");
    const r = await api("change-password", { method: "POST", body: { oldPassword: f.oldPassword, newPassword: f.newPassword } });
    if (r.ok) { setDone(true); setMsg(""); } else setMsg(errText(r));
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Change password">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-[20px] p-6 space-y-3 shadow-xl">
        <h2 className="text-[16px] text-ink font-medium">Change your password</h2>
        {done ? (
          <>
            <p className="text-[13px] text-plum">Done. Your new password works from now on; any other device you were signed in on is signed out.</p>
            <button type="button" onClick={onClose} className="w-full rounded-full bg-plum text-white py-2 text-[13px]">Close</button>
          </>
        ) : (
          <>
            <input className={box} type="password" autoComplete="current-password" placeholder="Current password" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} aria-label="Current password" />
            <input className={box} type="password" autoComplete="new-password" placeholder="New password (at least 10 characters)" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} aria-label="New password" />
            <input className={box} type="password" autoComplete="new-password" placeholder="New password again" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} aria-label="New password again" />
            {msg && <p className="text-[12px] text-red-600" role="alert">{msg}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={!f.oldPassword || !f.newPassword} className="flex-1 rounded-full bg-plum hover:bg-plum-soft disabled:opacity-50 text-white py-2 text-[13px]">Change password</button>
              <button type="button" onClick={onClose} className="rounded-full border border-gray-300 px-4 text-[13px]">Cancel</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default ChangePassword;
