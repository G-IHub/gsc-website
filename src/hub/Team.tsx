import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub } from "./hubApi";
import { Pill } from "./bits";

type RaciRow = { id: number; name: string; cells: string[]; check: string };
type Person = {
  user_id: number; name: string; role: string; unit: string; filled: boolean; skills: string; can_lead: boolean; can_qa: boolean;
  max_projects: number; availability: string; active: number; spare: number;
};
type Data = { columns: string[]; codes: string[]; raci: RaciRow[]; directory: Person[]; canEdit: boolean };

const CODE_STYLE: Record<string, string> = { A: "bg-plum text-white", R: "bg-magenta text-white", "A/R": "bg-magenta-dark text-white", C: "bg-blue-100 text-blue-800", I: "bg-gray-200 text-gray-700" };
const AVAIL: Record<string, [string, string]> = { available: ["Available", "bg-lime text-plum"], limited: ["Limited", "bg-amber-100 text-amber-800"], unavailable: ["Not available", "bg-gray-200 text-gray-600"] };
const ROLES_TEXT: [string, string][] = [
  ["Client (lead researcher)", "Leads the research, decides the science, submits to the journal."],
  ["Genomac lead researcher", "Day-to-day contact; coordinates the work and is accountable for it."],
  ["Quality reviewer", "Independent check of data, numbers, references and text. Never the analyst."],
  ["Project coordinator", "Timeline, meetings, tracker, releasing files after payment is confirmed."],
  ["Finance", "Budgets, payments, clearance, refunds."],
];
const tags = (s: string) => s.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);

const Matrix = ({ d, reload }: { d: Data; reload: () => void }) => {
  const [msg, setMsg] = useState("");
  const [newName, setNewName] = useState("");
  const setCell = async (row: RaciRow, i: number, code: string) => {
    const cells = row.cells.map((c, j) => (j === i ? code : c));
    const r = await hub("raci-set", { method: "POST", body: { id: row.id, cells } });
    if (r.ok) reload();
    else setMsg(errorText(r));
  };
  const add = async () => {
    const r = await hub("raci-add", { method: "POST", body: { name: newName } });
    if (r.ok) {
      setNewName("");
      reload();
    } else setMsg(errorText(r));
  };
  const remove = async (row: RaciRow) => {
    if (!window.confirm(`Remove "${row.name}" from the matrix?`)) return;
    const r = await hub("raci-delete", { method: "POST", body: { id: row.id } });
    if (r.ok) reload();
    else setMsg(errorText(r));
  };
  const problems = d.raci.filter((r) => r.check !== "OK").length;
  return (
    <div className="grid gap-5 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <Card title="Responsibilities matrix">
          <div className="flex flex-wrap gap-3 text-xs text-muted mb-3">
            <span><Pill cls={CODE_STYLE.A!}>A</Pill> accountable: makes the final call (one per row)</span>
            <span><Pill cls={CODE_STYLE.R!}>R</Pill> does the work</span>
            <span><Pill cls={CODE_STYLE.C!}>C</Pill> asked first</span>
            <span><Pill cls={CODE_STYLE.I!}>I</Pill> told after</span>
            <span><Pill cls={CODE_STYLE["A/R"]!}>A/R</Pill> accountable and does the work</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="py-2 pr-2 text-left font-bold uppercase tracking-widest">Activity ({d.raci.length})</th>
                  {d.columns.map((c) => <th key={c} className="py-2 px-1 font-bold text-center whitespace-nowrap">{c}</th>)}
                  <th className="py-2 pl-2 font-bold text-left">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {d.raci.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-2 text-sm min-w-48">{r.name}{d.canEdit && <button className="ml-2 text-[11px] text-muted hover:text-red-600" onClick={() => remove(r)}>Remove</button>}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className="py-1.5 px-1 text-center">
                        {d.canEdit ? (
                          <select value={c} onChange={(e) => setCell(r, i, e.target.value)} aria-label={`${r.name}: ${d.columns[i]}`}
                            className={`rounded-md border-0 text-[11px] font-medium px-1 py-0.5 ${c ? CODE_STYLE[c] : "bg-gray-50 text-gray-400"}`}>
                            {d.codes.map((x) => <option key={x} value={x}>{x || "·"}</option>)}
                          </select>
                        ) : c ? <Pill cls={CODE_STYLE[c] ?? ""}>{c}</Pill> : <span className="text-gray-300">·</span>}
                      </td>
                    ))}
                    <td className="py-1.5 pl-2 whitespace-nowrap">{r.check === "OK" ? <Pill cls="bg-lime text-plum">OK</Pill> : <Pill cls="bg-red-100 text-red-700">{r.check}</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.canEdit && (
            <div className="flex flex-wrap gap-2 mt-3">
              <input className={`${smallInput} max-w-sm`} placeholder="Add an activity" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New activity" />
              <Btn onClick={add} disabled={!newName.trim()}>Add</Btn>
            </div>
          )}
          <p className="mt-3 rounded-2xl bg-blue-50 text-blue-800 text-xs p-3">The check turns red if a row has no accountable person, more than one, or nobody doing the work.{problems ? ` ${problems} ${problems === 1 ? "row needs" : "rows need"} fixing.` : ""} {d.canEdit ? "You can edit any cell." : "Management edits the matrix."}</p>
          {msg && <p className="text-sm text-red-600 mt-2" role="alert">{msg}</p>}
        </Card>
      </div>
      <Card title="Roles">
        <ul className="space-y-3 text-sm">{ROLES_TEXT.map(([n, w]) => <li key={n}><b className="text-plum font-medium">{n}</b><div className="text-muted">{w}</div></li>)}</ul>
      </Card>
    </div>
  );
};

const Directory = ({ d }: { d: Data }) => {
  const [need, setNeed] = useState("");
  const people = d.directory;
  const coverage = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of people) for (const t of tags(p.skills)) map.set(t, [...(map.get(t) ?? []), p]);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([skill, ps]) => {
      const leads = ps.filter((p) => p.can_lead);
      const spareLead = leads.filter((p) => p.spare > 0 && p.availability !== "unavailable");
      const [label, cls] = leads.length === 0 ? ["No lead", "bg-amber-100 text-amber-800"] : spareLead.length === 0 ? ["Gap", "bg-red-100 text-red-700"] : ["Covered", "bg-lime text-plum"];
      return { skill, detail: `${ps.length} ${ps.length === 1 ? "person" : "people"} · ${leads.length} can lead · ${spareLead.length} with spare capacity`, label, cls };
    });
  }, [people]);
  const suggestion = useMemo(() => {
    const wanted = tags(need);
    if (wanted.length === 0) return null;
    const fits = (p: Person) => p.spare > 0 && p.availability !== "unavailable" && tags(p.skills).some((t) => wanted.some((w) => t.includes(w) || w.includes(t)));
    const lead = people.filter((p) => fits(p) && p.can_lead).sort((a, b) => b.spare - a.spare)[0];
    const second = people.filter((p) => fits(p) && p.user_id !== lead?.user_id).sort((a, b) => b.spare - a.spare)[0];
    const qa = people.filter((p) => p.can_qa && p.spare > 0 && p.availability !== "unavailable" && p.user_id !== lead?.user_id && p.user_id !== second?.user_id).sort((a, b) => b.spare - a.spare)[0];
    return { lead, second, qa };
  }, [need, people]);
  const filled = people.filter((p) => p.filled).length;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card title="Researcher expertise directory">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">Name</th><th className="py-2 pr-3 font-bold">Fields and methods</th><th className="py-2 pr-2 font-bold">Lead</th><th className="py-2 pr-2 font-bold">QA</th><th className="py-2 pr-2 font-bold">Active / max</th><th className="py-2 pr-2 font-bold">Spare</th><th className="py-2 font-bold">Availability</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {people.map((p) => (
                  <tr key={p.user_id} className="align-top">
                    <td className="py-2.5 pr-3"><b className="text-plum font-medium">{p.name}</b><div className="text-xs text-muted">{ROLE_LABEL[p.role]}{p.unit ? ` · ${p.unit}` : ""}</div></td>
                    <td className="py-2.5 pr-3">{p.filled ? p.skills : <span className="text-muted">Not filled in yet</span>}</td>
                    <td className="py-2.5 pr-2">{p.can_lead ? "Yes" : "No"}</td>
                    <td className="py-2.5 pr-2">{p.can_qa ? "Yes" : "No"}</td>
                    <td className="py-2.5 pr-2">{p.active} / {p.max_projects}</td>
                    <td className="py-2.5 pr-2"><Pill cls={p.spare > 0 ? "bg-lime text-plum" : "bg-red-100 text-red-700"}>{String(p.spare)}</Pill></td>
                    <td className="py-2.5"><Pill cls={AVAIL[p.availability]?.[1] ?? ""}>{AVAIL[p.availability]?.[0] ?? p.availability}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-2xl bg-blue-50 text-blue-800 text-xs p-3">Each person fills in their own row under My account ({filled} of {people.length} done). "Active" comes from the projects they are on that are not closed. Pilot rule: no lead on more than 2 active projects.</p>
        </Card>
      </div>
      <div className="space-y-5">
        <Card title="Skill coverage">
          <p className="text-xs text-muted mb-2">Red means nobody with spare capacity can lead that kind of work.</p>
          {coverage.length === 0 && <p className="text-sm text-muted">No skills entered yet.</p>}
          <ul className="divide-y divide-gray-100">
            {coverage.map((c) => (
              <li key={c.skill} className="py-2 flex items-start justify-between gap-2 text-sm">
                <div><span className="text-plum capitalize">{c.skill}</span><div className="text-xs text-muted">{c.detail}</div></div>
                <Pill cls={c.cls}>{c.label}</Pill>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Find people for a new project">
          <Field label="Skills needed" hint="Separate with commas, for example AMR, phylogenetics"><input className={smallInput} value={need} onChange={(e) => setNeed(e.target.value)} /></Field>
          {suggestion && (
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>Suggested lead: {suggestion.lead ? <b className="text-plum font-medium">{suggestion.lead.name} ({suggestion.lead.spare} free)</b> : <span className="text-red-700">nobody free who can lead this</span>}</li>
              <li>Second researcher: {suggestion.second ? <b className="text-plum font-medium">{suggestion.second.name} ({suggestion.second.spare} free)</b> : <span className="text-muted">nobody else free with these skills</span>}</li>
              <li>Quality reviewer: {suggestion.qa ? <b className="text-plum font-medium">{suggestion.qa.name} ({suggestion.qa.spare} free)</b> : <span className="text-muted">nobody free who can review</span>}</li>
            </ul>
          )}
          <p className="text-xs text-muted mt-3">Add the people to the project from its People and access tab.</p>
        </Card>
      </div>
    </div>
  );
};

const Team = () => {
  const [d, setD] = useState<Data | null>(null);
  const [tab, setTab] = useState<"matrix" | "directory">("matrix");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const r = await hub<Data>("team");
    if (r.ok && r.data) setD(r.data);
    else setError(errorText(r));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  if (error) return <p className="text-red-600">{error}</p>;
  if (!d) return <p className="text-muted">Loading…</p>;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl text-plum">Team</h1>
        <p className="text-sm text-muted mt-1">{tab === "matrix" ? "Who does what on every stage of a project." : "Who can do what, and who has room for a new project."}</p>
      </div>
      <div className="flex gap-2" role="tablist">
        {([["matrix", "Responsibilities"], ["directory", "Expertise and capacity"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full border px-4 py-2 text-sm ${tab === k ? "bg-magenta border-magenta text-white" : "border-gray-200 bg-white text-plum hover:border-gray-300"}`}>{l}</button>
        ))}
      </div>
      {tab === "matrix" ? <Matrix d={d} reload={load} /> : <Directory d={d} />}
    </div>
  );
};

export default Team;
