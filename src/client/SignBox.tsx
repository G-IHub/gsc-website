import { useState, type FormEvent } from "react";
import { PenLine } from "lucide-react";

// Online signature: the signer types their full name and ticks that they agree. The server records the rest.
const SignBox = ({ statement, button = "Sign", onSign, onCancel }: { statement: string; button?: string; onSign: (name: string) => Promise<string | null>; onCancel?: () => void }) => {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await onSign(name.trim());
    setBusy(false);
    setMsg(err ?? "");
  };
  return (
    <form onSubmit={submit} className="rounded-xl border border-plum/20 bg-magenta-tint/30 p-3 space-y-2">
      <label className="block text-[11px] text-muted">Type your full name
        <input className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[15px] italic text-plum focus:outline-none focus:border-plum" style={{ fontFamily: "Georgia, serif" }} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="flex items-start gap-2 text-[11.5px] text-ink">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>{statement} Typing my name here is my electronic signature.</span>
      </label>
      <p className="text-[10.5px] text-muted">The date and time, your internet address, your browser and a fingerprint of the exact text are recorded with your signature.</p>
      {msg && <p className="text-[11.5px] text-red-600" role="alert">{msg}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || name.trim().length < 3 || !agree} className="inline-flex items-center gap-1.5 rounded-full bg-plum hover:bg-plum-soft disabled:opacity-50 text-white px-4 py-1.5 text-[12px]"><PenLine size={13} /> {button}</button>
        {onCancel && <button type="button" onClick={onCancel} className="text-[12px] text-muted hover:text-plum px-2">Cancel</button>}
      </div>
    </form>
  );
};

export default SignBox;
