import { useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";

type Profile = { skills: string; can_lead: boolean; can_qa: boolean; max_projects: number; availability: string };

// Each person's own row in the expertise directory (shown on the Team page)
const MyProfile = () => {
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    hub<{ profile: Profile }>("profile").then((r) => r.ok && r.data && setP(r.data.profile));
  }, []);
  if (!p) return null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await hub("profile-set", { method: "POST", body: p });
    setMsg({ ok: r.ok, text: r.ok ? "Saved." : errorText(r) });
  };
  return (
    <Card title="My expertise and capacity">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Fields and methods" hint="Separate with commas, for example microbiome, 16S, R, Python"><input className={smallInput} value={p.skills} onChange={(e) => setP({ ...p, skills: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={p.can_lead} onChange={(e) => setP({ ...p, can_lead: e.target.checked })} /> I can lead a project</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={p.can_qa} onChange={(e) => setP({ ...p, can_qa: e.target.checked })} /> I can be a quality reviewer</label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Most projects at once"><input type="number" min={0} max={10} className={smallInput} value={p.max_projects} onChange={(e) => setP({ ...p, max_projects: Number(e.target.value) })} /></Field>
          <Field label="Availability">
            <select className={smallInput} value={p.availability} onChange={(e) => setP({ ...p, availability: e.target.value })}>
              <option value="available">Available</option><option value="limited">Limited</option><option value="unavailable">Not available</option>
            </select>
          </Field>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? "text-plum" : "text-red-600"}`} role="status">{msg.text}</p>}
        <Btn variant="primary" type="submit">Save</Btn>
      </form>
    </Card>
  );
};

export default MyProfile;
