import { useEffect, useState } from "react";
import { Card } from "../admin/ui";
import { errorText, hub } from "./hubApi";

type Entry = { id: number; at: string; event: string; who: string | null; detail: Record<string, unknown> };

const LABEL: Record<string, string> = {
  login: "Signed in",
  login_failed: "Failed sign-in",
  denied: "Refused",
  money_read: "Opened fees and payments",
  money_set: "Changed fees or payments",
  member_added: "Added a person to a project",
  member_removed: "Removed a person from a project",
  user_created: "Created an account",
  user_updated: "Changed an account",
  project_created: "Created a project",
  project_updated: "Updated a project",
  password_changed: "Changed a password",
  milestone_updated: "Updated a milestone",
  update_added: "Added a weekly update",
  update_deleted: "Removed a weekly update",
  clearance_set: "Changed a clearance check",
  clearance_reverted: "Project put back to not cleared",
  change_added: "Added a change to the change log",
  change_deleted: "Removed a change-log entry",
  report_submitted: "Submitted a weekly report",
  kpi_set: "Entered a KPI",
  raci_set: "Changed the responsibilities matrix",
  profile_set: "Updated their expertise profile",
  qa_issue_added: "Logged a QA issue",
  qa_outcome: "Gave the QA outcome",
  qa_signed: "Signed off the QA review (lead)",
  qa_round_new: "Started a new QA round",
  library_saved: "Saved a library document",
  library_deleted: "Removed a library document",
};

const AccessLog = () => {
  const [log, setLog] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    hub<{ log: Entry[] }>("access-log").then((r) => {
      if (r.ok && r.data) setLog(r.data.log);
      else setError(errorText(r));
    });
  }, []);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl text-plum">Access log</h1>
      <p className="text-sm text-muted">The latest 200 events: sign-ins, refusals, who opened the money, and changes to people.</p>
      <Card>
        {error && <p className="text-red-600">{error}</p>}
        {!log && !error && <p className="text-muted">Loading…</p>}
        {log && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-widest text-muted"><th className="py-2 pr-3 font-bold">When</th><th className="py-2 pr-3 font-bold">Who</th><th className="py-2 pr-3 font-bold">What</th><th className="py-2 font-bold">Detail</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {log.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{new Date(l.at).toLocaleString()}</td>
                    <td className="py-2.5 pr-3">{l.who ?? "—"}</td>
                    <td className={`py-2.5 pr-3 ${l.event === "denied" || l.event === "login_failed" ? "text-red-700" : "text-plum"}`}>{LABEL[l.event] ?? l.event}</td>
                    <td className="py-2.5 text-muted break-all">{Object.entries(l.detail).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ")}</td>
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

export default AccessLog;
