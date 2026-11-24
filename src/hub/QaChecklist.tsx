import { useCallback, useEffect, useState } from "react";
import { Btn, smallInput } from "../admin/ui";
import { errorText, hub } from "./hubApi";
import { Pill } from "./bits";
import { QA_SECTIONS } from "../../shared/qaChecks.js";

// The QA checklist of one project (project page, "QA checklist" tab).
// The quality reviewer ticks the 43 checks, logs issues and gives the outcome; the lead confirms the sign-off.

type Round = { id: number; round: number; version: string; outcome: string | null; comments: string; reviewer: string | null; reviewer_signed_at: string | null; lead: string | null; lead_signed_at: string | null };
type Check = { n: number; result: string; note: string; by_name: string | null };
type Issue = { id: number; text: string; check_n: number | null; severity: string; status: string; by_name: string | null; fixed_by: string | null; fixed_at: string | null; rechecked_by: string | null; rechecked_at: string | null };
type State = {
  round: Round; checks: Check[]; issues: Issue[];
  counts: { answered: number; total: number; pass: number; fail: number; na: number };
  reviewers: string[]; can: { review: boolean; lead: boolean; fix: boolean };
};

const RESULT: Record<string, [string, string]> = { pass: ["Pass", "bg-lime text-plum"], fail: ["Fail", "bg-red-100 text-red-700"], na: ["N/A", "bg-gray-200 text-gray-700"] };
const OUTCOME: Record<string, [string, string]> = {
  pass: ["Pass", "bg-lime text-plum"],
  pass_after_fixes: ["Pass after fixes", "bg-lime text-plum"],
  fail: ["Fail: back to the lead", "bg-red-100 text-red-700"],
};
const ISSUE: Record<string, [string, string]> = { open: ["Open", "bg-amber-100 text-amber-800"], fixed: ["Fixed, to recheck", "bg-blue-100 text-blue-800"], rechecked: ["Rechecked", "bg-lime text-plum"] };

const QaChecklist = ({ projectId, onChanged }: { projectId: number; onChanged: () => void }) => {
  const [s, setS] = useState<State | null>(null);
  const [msg, setMsg] = useState("");
  const [openSec, setOpenSec] = useState<number>(0);
  const [issue, setIssue] = useState({ text: "", check: "", severity: "must" });
  const [outcome, setOutcome] = useState({ outcome: "pass", comments: "" });

  const load = useCallback(async () => {
    const r = await hub<State>("qa", { query: { id: String(projectId) } });
    if (r.ok && r.data) setS(r.data);
    else setMsg(errorText(r));
  }, [projectId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const send = async (action: string, body: Record<string, unknown>) => {
    const r = await hub<State>(action, { method: "POST", body: { project_id: projectId, ...body } });
    if (r.ok && r.data) {
      setS(r.data);
      setMsg("");
      if (action === "qa-lead-sign" || action === "qa-outcome") onChanged();
      return true;
    }
    setMsg(errorText(r));
    return false;
  };

  if (!s) return msg ? <p className="text-sm text-red-600">{msg}</p> : <p className="text-sm text-muted">Loading…</p>;
  const byN = new Map(s.checks.map((c) => [c.n, c]));
  const closed = Boolean(s.round.outcome);
  const canTick = s.can.review && !closed;
  const pct = Math.round((s.counts.answered / s.counts.total) * 100);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2.5">
        <section className="bg-white rounded-[14px] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] text-ink font-medium">QA checklist · round {s.round.round}</h2>
              <p className="text-[11px] text-muted mt-0.5">
                Quality reviewer: {s.reviewers.length ? s.reviewers.join(", ") : "nobody named yet (add someone as Quality reviewer under People and access)"}
              </p>
            </div>
            {s.round.outcome ? <Pill cls={OUTCOME[s.round.outcome]?.[1] ?? ""}>{OUTCOME[s.round.outcome]?.[0] ?? s.round.outcome}</Pill> : <Pill cls="bg-blue-100 text-blue-800">In review</Pill>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-muted">
            <label className="inline-flex items-center gap-1.5">Manuscript version
              <input className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-[11px] w-20" defaultValue={s.round.version} disabled={!s.can.review}
                onBlur={(e) => e.target.value !== s.round.version && send("qa-version", { version: e.target.value })} placeholder="v1" />
            </label>
            <span>{s.counts.answered} of {s.counts.total} checked · {s.counts.pass} pass · {s.counts.fail} fail · {s.counts.na} N/A</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2"><i className="block h-full bg-plum" style={{ width: `${pct}%` }} /></div>
          {!s.can.review && <p className="text-[11px] text-muted mt-2">Only the project's quality reviewer (or management) ticks the checks. The reviewer must not be the analyst.</p>}
        </section>

        {QA_SECTIONS.map((sec, si) => {
          const done = sec.items.filter((i) => byN.get(i.n)?.result).length;
          const fails = sec.items.filter((i) => byN.get(i.n)?.result === "fail").length;
          const open = openSec === si;
          return (
            <section key={sec.section} className="bg-white rounded-[14px]">
              <button onClick={() => setOpenSec(open ? -1 : si)} className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left">
                <span className="text-[13px] text-ink">{si + 1}. {sec.section}</span>
                <span className="flex items-center gap-2 text-[11px] text-muted">
                  {fails > 0 && <Pill cls="bg-red-100 text-red-700">{`${fails} fail`}</Pill>}
                  {done}/{sec.items.length}
                  <span aria-hidden="true">{open ? "▾" : "▸"}</span>
                </span>
              </button>
              {open && (
                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                  {sec.items.map((it) => {
                    const c = byN.get(it.n);
                    return (
                      <li key={it.n} className="px-3.5 py-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1 min-w-[220px]">
                            <p className="text-[12px] text-ink"><span className="text-muted">{it.n}.</span> {it.check}</p>
                            <p className="text-[10.5px] text-muted mt-0.5">How: {it.how}</p>
                          </div>
                          <div className="flex gap-1">
                            {(["pass", "fail", "na"] as const).map((r) => (
                              <button key={r} disabled={!canTick} onClick={() => send("qa-check", { n: it.n, result: c?.result === r ? "" : r, note: c?.note ?? "" })}
                                className={`rounded-md px-2 py-0.5 text-[11px] border ${c?.result === r ? `${RESULT[r]![1]} border-transparent` : "border-gray-200 text-muted"} ${canTick ? "hover:border-gray-400" : "opacity-60 cursor-default"}`}>
                                {RESULT[r]![0]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {(canTick || c?.note) && (
                          <input className="mt-1.5 w-full bg-mist/60 border border-transparent focus:border-gray-200 rounded-md px-2 py-1 text-[11px]" placeholder={canTick ? "Note (optional)" : ""}
                            defaultValue={c?.note ?? ""} disabled={!canTick} onBlur={(e) => e.target.value !== (c?.note ?? "") && send("qa-check", { n: it.n, result: c?.result ?? "", note: e.target.value })} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="space-y-2.5">
        <section className="bg-white rounded-[14px] p-3.5">
          <h2 className="text-[13px] text-ink font-medium mb-1.5">Issues found ({s.issues.length})</h2>
          {s.issues.length === 0 && <p className="text-[11px] text-muted">No issues logged.</p>}
          <ul className="divide-y divide-gray-100">
            {s.issues.map((i) => (
              <li key={i.id} className="py-2 text-[12px]">
                <div className="flex items-start justify-between gap-2">
                  <span>{i.text}</span>
                  <Pill cls={ISSUE[i.status]?.[1] ?? ""}>{ISSUE[i.status]?.[0] ?? i.status}</Pill>
                </div>
                <p className="text-[10.5px] text-muted mt-0.5">
                  {i.severity === "must" ? "Must fix" : "Should fix"}{i.check_n ? ` · check ${i.check_n}` : ""}{i.fixed_by ? ` · fixed by ${i.fixed_by} ${i.fixed_at}` : ""}{i.rechecked_by ? ` · rechecked by ${i.rechecked_by} ${i.rechecked_at}` : ""}
                </p>
                <div className="flex gap-2 mt-1 text-[11px]">
                  {i.status === "open" && s.can.fix && <button className="text-magenta-dark hover:underline" onClick={() => send("qa-issue-status", { id: i.id, status: "fixed" })}>Mark fixed</button>}
                  {i.status === "fixed" && s.can.review && <button className="text-magenta-dark hover:underline" onClick={() => send("qa-issue-status", { id: i.id, status: "rechecked" })}>Confirm recheck</button>}
                  {i.status !== "open" && s.can.review && !closed && <button className="text-muted hover:underline" onClick={() => send("qa-issue-status", { id: i.id, status: "open" })}>Reopen</button>}
                </div>
              </li>
            ))}
          </ul>
          {canTick && (
            <div className="mt-2 space-y-1.5 rounded-xl bg-mist p-2.5">
              <input className={smallInput} placeholder="Describe the issue" value={issue.text} onChange={(e) => setIssue({ ...issue, text: e.target.value })} aria-label="Issue" />
              <div className="grid grid-cols-2 gap-1.5">
                <input className={smallInput} placeholder="Check #" value={issue.check} onChange={(e) => setIssue({ ...issue, check: e.target.value })} aria-label="Check number" />
                <select className={smallInput} value={issue.severity} onChange={(e) => setIssue({ ...issue, severity: e.target.value })} aria-label="Severity"><option value="must">Must fix</option><option value="should">Should fix</option></select>
              </div>
              <Btn disabled={!issue.text.trim()} onClick={async () => { if (await send("qa-issue-add", issue)) setIssue({ text: "", check: "", severity: "must" }); }}>Log issue</Btn>
            </div>
          )}
        </section>

        <section className="bg-white rounded-[14px] p-3.5">
          <h2 className="text-[13px] text-ink font-medium mb-1.5">Result and sign-off</h2>
          {s.round.outcome ? (
            <div className="space-y-1.5 text-[12px]">
              <p><b className="text-plum font-medium">Outcome:</b> {OUTCOME[s.round.outcome]?.[0]}</p>
              {s.round.comments && <p className="text-muted">{s.round.comments}</p>}
              <p className="text-[11px] text-muted">Quality reviewer: {s.round.reviewer} · {s.round.reviewer_signed_at}</p>
              <p className="text-[11px] text-muted">Lead: {s.round.lead_signed_at ? `${s.round.lead} · ${s.round.lead_signed_at}` : "not yet signed"}</p>
              {s.round.outcome !== "fail" && !s.round.lead_signed_at && s.can.lead && <Btn variant="primary" onClick={() => send("qa-lead-sign", {})}>Confirm sign-off (lead)</Btn>}
              {s.can.review && <Btn onClick={() => send("qa-round-new", {})}>Start a new review round</Btn>}
            </div>
          ) : s.can.review ? (
            <div className="space-y-1.5">
              <select className={smallInput} value={outcome.outcome} onChange={(e) => setOutcome({ ...outcome, outcome: e.target.value })} aria-label="Outcome">
                <option value="pass">Pass</option><option value="pass_after_fixes">Pass after fixes (all fixes rechecked)</option><option value="fail">Fail: back to the lead</option>
              </select>
              <textarea className={smallInput} rows={2} placeholder="Reviewer comments" value={outcome.comments} onChange={(e) => setOutcome({ ...outcome, comments: e.target.value })} />
              <Btn variant="primary" onClick={() => send("qa-outcome", outcome)}>Sign as quality reviewer</Btn>
            </div>
          ) : <p className="text-[11px] text-muted">Waiting for the quality reviewer.</p>}
          <p className="text-[10.5px] text-muted mt-2">Milestone 9 (Independent quality review passed) can be marked done only after a passing round signed by the lead.</p>
        </section>
        {msg && <p className="text-[12px] text-red-600" role="alert">{msg}</p>}
      </div>
    </div>
  );
};

export default QaChecklist;
