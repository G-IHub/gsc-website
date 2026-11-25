import { useState } from "react";
import { api, errText } from "./clientApi";
import SignBox from "./SignBox";

// Steps waiting for the client's online sign-off (a step that has a client sign-off and that the team marked done)
type M = { n: number; name: string; done: string | null };

const MilestoneSignoff = ({ projectId, steps, onSigned }: { projectId: number; steps: M[]; onSigned: () => void }) => {
  const [open, setOpen] = useState<number | null>(null);
  if (!steps.length) return null;
  const sign = async (n: number, name: string) => {
    const r = await api("milestone-sign", { method: "POST", body: { project_id: projectId, n, typed_name: name, agree: true } });
    if (r.ok) { setOpen(null); onSigned(); return null; }
    return errText(r);
  };
  return (
    <section className="rounded-[16px] bg-amber-50 p-4 space-y-2">
      <h2 className="text-[14px] text-amber-900 font-medium">{steps.length} {steps.length === 1 ? "step is" : "steps are"} ready for your sign-off</h2>
      {steps.map((m) => (
        <div key={m.n} className="bg-white rounded-xl p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12.5px] text-ink">Step {m.n}: {m.name}{m.done ? <span className="text-muted"> · done {m.done}</span> : null}</p>
            {open !== m.n && <button onClick={() => setOpen(m.n)} className="rounded-full bg-plum hover:bg-plum-soft text-white px-4 py-1.5 text-[12px]">Sign off</button>}
          </div>
          {open === m.n && <div className="mt-2"><SignBox statement={`I confirm step ${m.n} ("${m.name}") is complete to my satisfaction.`} button="Sign off" onSign={(name) => sign(m.n, name)} onCancel={() => setOpen(null)} /></div>}
        </div>
      ))}
    </section>
  );
};

export default MilestoneSignoff;
