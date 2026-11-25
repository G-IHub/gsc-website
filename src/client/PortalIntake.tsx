import { useEffect, useState } from "react";
import { api, errText } from "./clientApi";
import IntakeFields from "./IntakeFields";

// The client fills in the Research Intake Form online: save a draft any time, send when complete.
type Intake = { data: Record<string, string | string[]>; submitted_at: string | null };

const PortalIntake = ({ projectId }: { projectId: number }) => {
  const [it, setIt] = useState<Intake | null>(null);
  const [value, setValue] = useState<Record<string, string | string[]>>({});
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api<{ intake: Intake }>("intake", { query: { id: String(projectId) } }).then((r) => {
      if (r.ok && r.data) { setIt(r.data.intake); setValue(r.data.intake.data || {}); }
    });
  }, [projectId]);
  if (!it) return null;
  const save = async (submit: boolean) => {
    const r = await api<{ intake: Intake }>("intake-save", { method: "POST", body: { project_id: projectId, data: value, submit } });
    if (r.ok && r.data) {
      setIt(r.data.intake);
      setMsg(submit ? "Thank you. Your team has your answers." : "Saved. You can come back and finish later.");
      if (submit) setOpen(false);
    } else setMsg(errText(r));
  };
  const sent = Boolean(it.submitted_at);
  return (
    <section className="bg-white rounded-[16px] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] text-ink font-medium">Research intake form</h2>
          <p className="text-[11.5px] text-muted">{sent ? `Sent on ${it.submitted_at}. Ask your team in the messages if something needs changing.` : "Tell us about your research idea, your data and your plans. It takes about 15 minutes."}</p>
        </div>
        <button onClick={() => setOpen(!open)} className="rounded-full border border-plum text-plum px-4 py-1.5 text-[12px]">{open ? "Close" : sent ? "See my answers" : Object.keys(it.data || {}).length ? "Continue the form" : "Fill in the form"}</button>
      </div>
      {open && (
        <div className="mt-4 max-w-2xl">
          <IntakeFields value={value} onChange={setValue} readOnly={sent} />
          {!sent && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => save(true)} className="rounded-full bg-plum hover:bg-plum-soft text-white px-5 py-2 text-[12.5px]">Send to my team</button>
              <button onClick={() => save(false)} className="rounded-full border border-gray-300 px-4 py-2 text-[12.5px]">Save draft</button>
            </div>
          )}
        </div>
      )}
      {msg && <p className="text-[12px] text-muted mt-2" role="status">{msg}</p>}
    </section>
  );
};

export default PortalIntake;
