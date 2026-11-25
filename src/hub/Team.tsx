import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub, type Me, type Project } from "./hubApi";
import { SKILL_AREAS, inArea } from "./skillAreas";
import { Pill } from "./bits";

type RaciRow = { id: number; section: string; name: string; cells: string[]; check: string };
type Person = {
  user_id: number; name: string; role: string; unit: string; filled: boolean; skills: string; can_lead: boolean; can_qa: boolean;
  max_projects: number; availability: string; active: number; spare: number;
};
type Data = { columns: string[]; codes: string[]; raci: RaciRow[]; directory: Person[]; canEdit: boolean };

const CODE_STYLE: Record<string, string> = { A: "bg-plum text-white", R: "bg-magenta text-white", "A/R": "bg-magenta-dark text-white", C: "bg-blue-100 text-blue-800", I: "bg-gray-200 text-gray-700" };
const AVAIL: Record<string, [string, string]> = { available: ["Available", "bg-lime text-plum"], limited: ["Limited", "bg-amber-100 text-amber-800"], unavailable: ["Not available", "bg-gray-200 text-gray-600"] };
// The roles behind the matrix columns (from the Responsibilities workbook): name, what they do, who holds it
const ROLES_TEXT: [string, string, string][] = [
  ["Client (lead researcher)", "Leads the research, decides the science, submits to the journal.", "The client on each project"],
  ["Genomac lead researcher", "Day-to-day contact; coordinates the work and is accountable for it.", "Named on each project"],
  ["Supporting researcher", "Specialist analysis and writing in their area of expertise.", "Named on each project"],
  ["Quality reviewer", "Independent check of data, numbers, references and text. Never the analyst.", "Named on each project"],
  ["Project coordinator", "Timeline, meetings, tracker, releasing files after payment is confirmed.", "Appointed by management"],
  ["Finance", "Budgets, payments, clearance, refunds.", "Finance team"],
  ["Subsidiary director", "Identifies projects, allocates people, monitors progress, escalates issues.", "One per subsidiary"],
  ["Management / CEO", "Oversight, pricing, appointments, approval of the SOP.", "Office of the CEO"],
  ["Victor (acquisition)", "Research clinics, Competition Lab, converting prospects.", "Victor"],
  ["Farouk (training)", "Platform demos, training, standard workflow and prompts.", "Farouk"],
  ["Procurement / IT", "Plagiarism and AI-use tools, staff access.", "To be named"],
];
const COLUMN_TITLES = ROLES_TEXT.map((r) => r[0]);
const Panel = ({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`bg-white rounded-[14px] p-3.5 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
      <h2 className="text-[13px] text-ink font-medium">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);
const Tile = ({ label, value, note, dark }: { label: string; value: ReactNode; note: string; dark?: boolean }) => (
  <div className={`relative overflow-hidden rounded-[14px] p-3 ${dark ? "bg-gradient-to-br from-plum via-plum-soft to-plum text-white" : "bg-white text-ink"}`}>
    {dark && <svg className="absolute -right-12 -bottom-16 opacity-20" width="200" height="200" viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="80" fill="none" stroke="#cde24a" strokeWidth="1.5"/><circle cx="110" cy="110" r="105" fill="none" stroke="#b241b7" strokeWidth="1.5"/></svg>}
    <p className="relative text-[12px]">{label}</p>
    <p className="relative mt-1.5 text-[22px] leading-none font-medium tracking-tight">{value}</p>
    <p className={`relative mt-1.5 text-[10px] ${dark ? "text-white/80" : "text-muted"}`}>{note}</p>
  </div>
);
const initialsOf = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

const tags = (s: string) => s.split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);

const Matrix = ({ d, reload }: { d: Data; reload: () => void }) => {
  const [msg, setMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false); // clean pills by default; dropdowns only while editing
  const edit = d.canEdit && editing;
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
    <div className="space-y-2.5">
        <Panel title={`Responsibilities matrix · ${d.raci.length} activities`} action={
          <div className="flex flex-wrap gap-2 text-[10.5px] text-muted">
            <span title="Accountable: makes the final call (one per row)"><Pill cls={CODE_STYLE.A!}>A</Pill> accountable</span>
            <span><Pill cls={CODE_STYLE.R!}>R</Pill> does the work</span>
            <span><Pill cls={CODE_STYLE.C!}>C</Pill> asked first</span>
            <span><Pill cls={CODE_STYLE.I!}>I</Pill> told after</span>
            <span><Pill cls={CODE_STYLE["A/R"]!}>A/R</Pill> both</span>
            {d.canEdit && <button onClick={() => setEditing(!editing)} className={`ml-1 rounded-full px-3 py-0.5 text-[11px] ${editing ? "bg-plum text-white" : "border border-plum text-plum hover:bg-mist"}`}>{editing ? "Done" : "Edit matrix"}</button>}
          </div>
        }>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="py-2 pr-2 text-left font-bold uppercase tracking-widest text-[10px]">Activity</th>
                  {d.columns.map((c, i) => <th key={c} title={COLUMN_TITLES[i]} className="py-2 px-1 font-bold text-center whitespace-nowrap">{c}</th>)}
                  <th className="py-2 pl-2 font-bold text-left">Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {d.raci.map((r, idx) => [
                  r.section && r.section !== d.raci[idx - 1]?.section ? (
                    <tr key={`s-${r.id}`}><td colSpan={d.columns.length + 2} className="pt-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-magenta-dark">{r.section}</td></tr>
                  ) : null,
                  <tr key={r.id}>
                    <td className="py-1.5 pr-2 text-[12px] min-w-56">{r.name}{edit && <button className="ml-2 text-[11px] text-muted hover:text-red-600" onClick={() => remove(r)}>Remove</button>}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className="py-1.5 px-1 text-center">
                        {edit ? (
                          <select value={c} onChange={(e) => setCell(r, i, e.target.value)} aria-label={`${r.name}: ${d.columns[i]}`}
                            className={`rounded-md border-0 text-[11px] font-medium px-1 py-0.5 ${c ? CODE_STYLE[c] : "bg-gray-50 text-gray-400"}`}>
                            {d.codes.map((x) => <option key={x} value={x}>{x || "·"}</option>)}
                          </select>
                        ) : c ? <Pill cls={CODE_STYLE[c] ?? ""}>{c}</Pill> : <span className="text-gray-300">·</span>}
                      </td>
                    ))}
                    <td className="py-1.5 pl-2 whitespace-nowrap">{r.check === "OK" ? <Pill cls="bg-lime text-plum">OK</Pill> : <Pill cls="bg-red-100 text-red-700">{r.check}</Pill>}</td>
                  </tr>,
                ])}
              </tbody>
            </table>
          </div>
          {edit && (
            <div className="flex flex-wrap gap-2 mt-3">
              <input className={`${smallInput} max-w-sm`} placeholder="Add an activity" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New activity" />
              <Btn onClick={add} disabled={!newName.trim()}>Add</Btn>
            </div>
          )}
          <p className="mt-3 rounded-xl bg-blue-50 text-blue-800 text-[11px] px-3 py-2">The check turns red if a row has no accountable person, more than one, or nobody doing the work.{problems ? ` ${problems} ${problems === 1 ? "row needs" : "rows need"} fixing.` : ""} {d.canEdit ? (editing ? "Change any cell, then press Done." : "Press Edit matrix to change cells.") : "Management edits the matrix."}</p>
          {msg && <p className="text-[12px] text-red-600 mt-2" role="alert">{msg}</p>}
        </Panel>
        <Panel title="The roles in the matrix">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES_TEXT.map(([n, w, who], i) => (
              <li key={n} className="rounded-xl bg-mist px-3 py-2.5">
                <p className="text-[12px] text-ink font-medium"><span className="text-[10px] text-magenta-dark mr-1">{d.columns[i]}</span>{n}</p>
                <p className="text-[11px] text-muted mt-0.5">{w}</p>
                <p className="text-[10.5px] text-plum mt-1">{who}</p>
              </li>
            ))}
          </ul>
        </Panel>
    </div>
  );
};

const Directory = ({ d, me }: { d: Data; me: Me }) => {
  const [need, setNeed] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [target, setTarget] = useState("");
  const [assignMsg, setAssignMsg] = useState("");
  const mayAssign = me.user.role === "management" || me.user.role === "lead";
  useEffect(() => {
    if (!mayAssign) return;
    hub<{ projects: Project[] }>("projects").then((r) => r.ok && r.data && setProjects(r.data.projects));
  }, [mayAssign]);
  const people = d.directory;
  const coverage = useMemo(() => SKILL_AREAS.map((area) => {
    const ps = people.filter((p) => p.filled && inArea(p.skills, area));
    const leads = ps.filter((p) => p.can_lead);
    const spareLead = leads.filter((p) => p.spare > 0 && p.availability !== "unavailable");
    const reviewers = ps.filter((p) => p.can_qa);
    let label: string, cls: string, detail: string;
    if (ps.length === 0) [label, cls, detail] = ["Gap", "bg-red-100 text-red-700", "Nobody yet"];
    else if (area.reviewOnly) [label, cls, detail] = ["Support", "bg-blue-100 text-blue-800", `${ps.length} ${ps.length === 1 ? "person" : "people"} · ${reviewers.length} can review`];
    else if (leads.length === 0) [label, cls, detail] = ["No lead", "bg-amber-100 text-amber-800", `${ps.length} ${ps.length === 1 ? "person" : "people"} · nobody can lead`];
    else [label, cls, detail] = spareLead.length === 0
      ? ["Gap", "bg-red-100 text-red-700", `${ps.length} ${ps.length === 1 ? "person" : "people"} · ${leads.length} can lead · 0 with spare capacity`]
      : ["Covered", "bg-lime text-plum", `${ps.length} ${ps.length === 1 ? "person" : "people"} · ${leads.length} can lead · ${spareLead.length} with spare capacity`];
    return { skill: area.name, detail, label, cls };
  }), [people]);
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
    <div className="space-y-2.5">
      <Panel title={`Expertise directory · ${filled} of ${people.length} profiles filled in`} action={<span className="text-[10.5px] text-muted">Each person fills in their own under My account. Pilot rule: no lead on more than 2 active projects.</span>}>
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) => {
            const load = p.max_projects > 0 ? Math.min(p.active / p.max_projects, 1) : 1;
            return (
              <li key={p.user_id} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-magenta to-plum text-white flex items-center justify-center text-[10px] font-semibold shrink-0" aria-hidden="true">{initialsOf(p.name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-ink font-medium truncate">{p.name}</p>
                    <p className="text-[10.5px] text-muted truncate">{ROLE_LABEL[p.role]}{p.unit ? ` · ${p.unit}` : ""}</p>
                  </div>
                  <Pill cls={AVAIL[p.availability]?.[1] ?? ""}>{AVAIL[p.availability]?.[0] ?? p.availability}</Pill>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 min-h-[22px]">
                  {p.filled ? tags(p.skills).slice(0, 5).map((t) => <span key={t} className="rounded-md bg-mist px-1.5 py-0.5 text-[10.5px] text-ink">{t}</span>)
                    : <span className="text-[10.5px] text-muted">Profile not filled in yet</span>}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10.5px] text-muted">
                  <span className={p.can_lead ? "text-plum" : ""}>{p.can_lead ? "✓" : "–"} Can lead</span>
                  <span className={p.can_qa ? "text-plum" : ""}>{p.can_qa ? "✓" : "–"} Can review</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[10.5px] text-muted"><span>{p.active} of {p.max_projects} projects</span><span className={p.spare > 0 ? "text-plum" : "text-red-700"}>{p.spare > 0 ? `${p.spare} free` : "Full"}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1"><i className={`block h-full ${p.spare > 0 ? "bg-plum" : "bg-red-500"}`} style={{ width: `${Math.max(load * 100, 3)}%` }} /></div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <div className="hub-two grid gap-2.5 lg:grid-cols-2">
        <Panel title="Skill coverage" action={<span className="text-[10.5px] text-muted">Red: nobody free can lead it</span>}>
          <ul className="divide-y divide-gray-100">
            {coverage.map((c) => (
              <li key={c.skill} className="py-1.5 flex items-start justify-between gap-2 text-[12px]">
                <div><span className="text-ink">{c.skill}</span><div className="text-[10.5px] text-muted">{c.detail}</div></div>
                <Pill cls={c.cls}>{c.label}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Find people for a new project">
          <Field label="Skills needed" hint="Separate with commas, for example AMR, phylogenetics"><input className={smallInput} value={need} onChange={(e) => setNeed(e.target.value)} /></Field>
          {suggestion && (
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>Suggested lead: {suggestion.lead ? <b className="text-plum font-medium">{suggestion.lead.name} ({suggestion.lead.spare} free)</b> : <span className="text-red-700">nobody free who can lead this</span>}</li>
              <li>Second researcher: {suggestion.second ? <b className="text-plum font-medium">{suggestion.second.name} ({suggestion.second.spare} free)</b> : <span className="text-muted">nobody else free with these skills</span>}</li>
              <li>Quality reviewer: {suggestion.qa ? <b className="text-plum font-medium">{suggestion.qa.name} ({suggestion.qa.spare} free)</b> : <span className="text-muted">nobody free who can review</span>}</li>
            </ul>
          )}
          {suggestion && mayAssign && (suggestion.lead || suggestion.second || suggestion.qa) && (
            <div className="mt-4 space-y-2">
              <select className={smallInput} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Project">
                <option value="">Choose a project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.ref} · {p.title}</option>)}
              </select>
              <Btn variant="primary" disabled={!target} onClick={async () => {
                const picks: [Person | undefined, string][] = [[suggestion.lead, "lead"], [suggestion.second, "Supporting researcher"], [suggestion.qa, "Quality reviewer"]];
                const done: string[] = [];
                for (const [person, role] of picks) {
                  if (!person) continue;
                  const r = await hub("member-add", { method: "POST", body: { project_id: Number(target), user_id: person.user_id, project_role: role } });
                  if (!r.ok) return setAssignMsg(errorText(r));
                  done.push(person.name);
                }
                setAssignMsg(`Added ${done.join(", ")} to the project.`);
              }}>Assign to project</Btn>
              {assignMsg && <p className="text-xs text-muted" role="status">{assignMsg}</p>}
            </div>
          )}
          {!mayAssign && <p className="text-[11px] text-muted mt-3">A lead or management adds people to a project.</p>}
        </Panel>
      </div>
    </div>
  );
};

const Team = ({ me }: { me: Me }) => {
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
  const people = d.directory;
  const filledN = people.filter((p) => p.filled).length;
  const leadsFree = people.filter((p) => p.can_lead && p.spare > 0 && p.availability !== "unavailable").length;
  const ok = d.raci.filter((r) => r.check === "OK").length;
  return (
    <div className="space-y-3">
      <div>
        <h1>Team</h1>
        <p className="text-[12px] text-muted mt-0.5">Who does what on every project, who can do what, and who has room for new work.</p>
      </div>
      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        <Tile dark label="Team members" value={people.length} note={`${people.filter((p) => p.availability === "available").length} available`} />
        <Tile label="Profiles filled in" value={`${filledN} of ${people.length}`} note="Under My account" />
        <Tile label="Can lead, with room" value={leadsFree} note="Spare capacity for a new project" />
        <Tile label="Matrix rows OK" value={`${ok} of ${d.raci.length}`} note={ok === d.raci.length ? "Every row has one accountable person" : "Some rows need fixing"} />
      </div>
      <div className="flex items-end gap-5 border-b border-gray-200" role="tablist">
        {([["matrix", "Responsibilities"], ["directory", "Expertise and capacity"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px pb-2 pt-1 text-[13px] border-b-2 transition-colors ${tab === k ? "border-plum text-plum font-medium" : "border-transparent text-muted hover:text-ink"}`}>{l}</button>
        ))}
      </div>
      {tab === "matrix" ? <Matrix d={d} reload={load} /> : <Directory d={d} me={me} />}
    </div>
  );
};

export default Team;
