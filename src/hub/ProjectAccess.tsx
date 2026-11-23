import { useEffect, useState } from "react";
import { Btn, Card, Field, smallInput } from "../admin/ui";
import { ROLE_LABEL, errorText, hub } from "./hubApi";
import { Avatar, Pill } from "./bits";

// "People and access" tab: who is on the project, what each role can see, and (for management) the project's access log

export type Member = { user_id: number; name: string; role: string; project_role: string; added: string | null };
export type Person = { id: number; name: string; role: string };

const CAN: Record<string, string> = {
  management: "Everything",
  finance: "Payment flag and money",
  lead: "Edit the project, add people",
  director: "View (own unit)",
  coordinator: "View",
  member: "View",
};

type Cell = [string, "yes" | "no" | "part"];
const Y: Cell = ["Yes", "yes"];
const N: Cell = ["No", "no"];
// Columns: Team member, Lead, Coordinator, Director, Finance, Management. These mirror the rules in api/_hub_core.js.
const MATRIX: [string, Cell[]][] = [
  ["Stage, health and dates", [Y, Y, Y, Y, Y, Y]],
  ["Client name and contact", [["Code only", "part"], Y, Y, Y, Y, Y]],
  ["Payment status flag", [N, ["Flag only", "part"], ["Flag only", "part"], ["Flag only", "part"], ["Yes, sets it", "yes"], ["Yes, sets it", "yes"]]],
  ["Fee, payments, budget and margin", [N, N, N, N, Y, Y]],
  ["Edit stage, health and dates", [N, ["This project", "part"], N, N, N, Y]],
  ["Add or remove people", [N, ["This project", "part"], N, N, N, Y]],
  ["Other projects", [N, N, N, ["Own unit", "part"], ["All", "yes"], ["All", "yes"]]],
  ["Access log", [N, N, N, N, N, ["All", "yes"]]],
];
const CELL_STYLE = { yes: "bg-lime text-plum", no: "bg-gray-200 text-gray-600", part: "bg-blue-100 text-blue-800" };
const PROJECT_ROLES = ["Supporting researcher", "Quality reviewer", "Project coordinator"];

type LogEntry = { id: number; at: string; event: string; who: string | null; detail: Record<string, unknown> };
const LOG_TEXT: Record<string, string> = {
  money_read: "opened the money for this project",
  money_set: "changed the fees or payments",
  member_added: "added someone to this project",
  member_removed: "removed someone from this project",
  project_updated: "updated the project",
  denied: "was refused access",
  milestone_updated: "updated a milestone",
};

const ProjectLog = ({ id }: { id: number }) => {
  const [log, setLog] = useState<LogEntry[] | null>(null);
  useEffect(() => {
    hub<{ log: LogEntry[] }>("access-log", { query: { project: String(id) } }).then((r) => setLog(r.ok && r.data ? r.data.log : []));
  }, [id]);
  return (
    <Card title="Access log">
      {!log && <p className="text-sm text-muted">Loading…</p>}
      {log && log.length === 0 && <p className="text-sm text-muted">Nothing recorded for this project yet.</p>}
      <ul className="divide-y divide-gray-100">
        {log?.slice(0, 12).map((l) => (
          <li key={l.id} className="py-2.5 flex items-start gap-3 text-sm">
            <Avatar name={l.who ?? "?"} />
            <div>
              <div>{l.who ?? "Someone"} {LOG_TEXT[l.event] ?? l.event}</div>
              <div className="text-xs text-muted">{new Date(l.at).toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const ProjectAccess = ({
  projectId, members, people, canManage, isManagement, onChanged,
}: {
  projectId: number; members: Member[]; people: Person[]; canManage: boolean; isManagement: boolean; onChanged: () => void;
}) => {
  const [pick, setPick] = useState("");
  const [role, setRole] = useState(PROJECT_ROLES[0]!);
  const [msg, setMsg] = useState("");
  const onProject = new Set(members.map((m) => m.user_id));

  const change = async (action: "member-add" | "member-remove", user_id: number) => {
    const r = await hub(action, { method: "POST", body: { project_id: projectId, user_id, project_role: role } });
    if (r.ok) {
      setPick("");
      setMsg("");
      onChanged();
    } else setMsg(errorText(r));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-2 space-y-5">
        <Card title="People on this project">
          {members.length === 0 && <p className="text-sm text-muted">Nobody is on this project yet.</p>}
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.user_id} className="py-3 flex items-center gap-3 text-sm">
                <Avatar name={m.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-plum font-medium">{m.name}</div>
                  <div className="text-xs text-muted">{m.project_role || ROLE_LABEL[m.role]} · {CAN[m.role] ?? "View"}{m.added ? ` · added ${m.added}` : ""}</div>
                </div>
                {canManage && <Btn variant="ghost" onClick={() => change("member-remove", m.user_id)}>Remove</Btn>}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-2xl bg-blue-50 text-blue-800 text-xs p-3">Only the project lead and management can add or remove people. Anyone added sees what this project shows to their role.</p>
        </Card>

        {canManage && (
          <Card title="Add a person">
            <div className="space-y-3">
              <Field label="Person">
                <select className={smallInput} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Choose…</option>
                  {people.filter((p) => !onProject.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} ({ROLE_LABEL[p.role]})</option>)}
                </select>
              </Field>
              <Field label="Role on this project">
                <select className={smallInput} value={role} onChange={(e) => setRole(e.target.value)}>
                  {PROJECT_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              {msg && <p className="text-sm text-red-600" role="alert">{msg}</p>}
              <Btn variant="primary" disabled={!pick} onClick={() => change("member-add", Number(pick))}>Add to project</Btn>
            </div>
          </Card>
        )}
        {isManagement && <ProjectLog id={projectId} />}
      </div>

      <div className="lg:col-span-3 space-y-5">
        <Card title="What each role can see on this project">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-muted">
                  <th className="py-2 pr-3 text-left font-bold">Information</th>
                  {["Team member", "Lead", "Coordinator", "Director", "Finance", "Mgmt"].map((h) => <th key={h} className="py-2 px-1 text-center font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MATRIX.map(([what, cells]) => (
                  <tr key={what}>
                    <td className="py-2.5 pr-3">{what}</td>
                    {cells.map(([text, kind], i) => <td key={i} className="py-2.5 px-1 text-center"><Pill cls={CELL_STYLE[kind]}>{text}</Pill></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-2xl bg-blue-50 text-blue-800 text-xs p-3">Money is kept in a separate record that the server refuses to show to anyone but Finance and management. It is not only hidden on the screen. Every time someone opens the money, it is logged.</p>
        </Card>
        <Card title="Rules in force">
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-ink">
            <li>Team members see the project code, not the client's name or contact.</li>
            <li>Directors do not see money; they see projects of their own unit.</li>
            <li>Leads do not see the fee; they see the payment status flag only.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ProjectAccess;
