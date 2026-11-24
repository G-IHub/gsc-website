// Research Hub: the QA checklist, kept inside each project. Called from _hub_core.js after sign-in.
//
// Who (independence, as in the paper checklist):
//   - reads: the people on the project and management
//   - ticks checks, logs issues, rechecks fixes, gives the outcome: the project's QUALITY REVIEWER
//     (someone on the project whose role there mentions "quality") or management. Not the lead.
//   - marks an issue fixed: anyone on the project (usually the analyst)
//   - confirms the sign-off after the reviewer's outcome: the project's lead (or management)
// Milestone 9 ("Independent quality review passed") can be marked done only after a passing, signed-off round
// (enforced in _hub_core.js through qaPassed()).

import { QA_CHECK_NUMBERS } from "../shared/qaChecks.js";

export const QA_RESULTS = ["pass", "fail", "na"];
export const QA_OUTCOMES = ["pass", "pass_after_fixes", "fail"];
export const QA_SEVERITY = ["must", "should"];

// Has the project's latest review round passed and been signed off by the lead?
export async function qaPassed(store, pid) {
  const r = await store.latestQaRound(pid);
  return Boolean(r && (r.outcome === "pass" || r.outcome === "pass_after_fixes") && r.lead_signed_at);
}

export async function handleQa({ action, method, body, query, user, store, memberIds, projectOr404, deny, out, str }) {
  const acts = ["qa", "qa-check", "qa-issue-add", "qa-issue-status", "qa-outcome", "qa-lead-sign", "qa-round-new", "qa-version"];
  if (!acts.includes(action)) return null;

  const p = await projectOr404(method === "GET" ? query?.id : body.project_id);
  if (!p) return out(404, { error: "Not found" });
  const onProject = memberIds.has(p.id);
  if (!(user.role === "management" || onProject)) return deny(`qa ${action}`, { project: p.id });
  const members = await store.listMembers(p.id);
  const me = members.find((m) => m.user_id === user.id);
  const isReviewer = user.role === "management" || Boolean(me && /quality/i.test(me.project_role || ""));
  const isLead = user.role === "management" || Boolean(me && (me.role === "lead" || /lead/i.test(me.project_role || "")));
  const log = (event, extra = {}) => store.log({ user_id: user.id, event, detail: { project: p.id, ...extra } });

  let round = await store.latestQaRound(p.id);
  if (!round) round = await store.newQaRound(p.id, 1, "");

  const state = async () => {
    const r = await store.latestQaRound(p.id);
    const checks = await store.listQaChecks(r.id);
    const issues = await store.listQaIssues(r.id);
    const answered = checks.filter((c) => QA_RESULTS.includes(c.result)).length;
    return {
      round: r, checks, issues,
      counts: { answered, total: QA_CHECK_NUMBERS.length, pass: checks.filter((c) => c.result === "pass").length, fail: checks.filter((c) => c.result === "fail").length, na: checks.filter((c) => c.result === "na").length },
      reviewers: members.filter((m) => /quality/i.test(m.project_role || "")).map((m) => m.name),
      can: { review: isReviewer, lead: isLead, fix: onProject || user.role === "management" },
    };
  };

  if (action === "qa" && method === "GET") return out(200, await state());

  const closed = Boolean(round.outcome);
  const mustReview = () => (isReviewer ? null : deny(`qa ${action} (quality reviewer only)`, { project: p.id }));

  if (action === "qa-version" && method === "POST") {
    const d = mustReview();
    if (d) return d;
    await store.setQaRound(round.id, { version: str(body.version, 40) });
    return out(200, await state());
  }

  if (action === "qa-check" && method === "POST") {
    const d = mustReview();
    if (d) return d;
    if (closed) return out(409, { error: "This round is closed. Start a new round to review again." });
    const n = Number(body.n);
    if (!QA_CHECK_NUMBERS.includes(n)) return out(400, { error: "Unknown check" });
    const result = body.result === "" || body.result === null ? "" : body.result;
    if (result !== "" && !QA_RESULTS.includes(result)) return out(400, { error: "Bad result" });
    await store.setQaCheck(round.id, n, result, str(body.note, 500), user.id);
    return out(200, await state());
  }

  if (action === "qa-issue-add" && method === "POST") {
    const d = mustReview();
    if (d) return d;
    if (closed) return out(409, { error: "This round is closed." });
    const text = str(body.text, 500);
    if (!text) return out(400, { error: "Describe the issue" });
    const n = body.check === undefined || body.check === null || body.check === "" ? null : Number(body.check);
    if (n !== null && !QA_CHECK_NUMBERS.includes(n)) return out(400, { error: "Unknown check number" });
    if (!QA_SEVERITY.includes(body.severity)) return out(400, { error: "Must fix or should fix?" });
    await store.addQaIssue(round.id, { text, check_n: n, severity: body.severity, by: user.id });
    await log("qa_issue_added", { name: text.slice(0, 80) });
    return out(200, await state());
  }

  if (action === "qa-issue-status" && method === "POST") {
    const issue = (await store.listQaIssues(round.id)).find((i) => i.id === Number(body.id));
    if (!issue) return out(404, { error: "Not found" });
    if (body.status === "fixed") {
      if (!(onProject || user.role === "management")) return deny("qa fix", { project: p.id });
    } else if (body.status === "rechecked" || body.status === "open") {
      const d = mustReview(); // only the reviewer confirms a fix, or reopens it
      if (d) return d;
      if (body.status === "rechecked" && issue.status !== "fixed") return out(400, { error: "Mark it fixed first" });
    } else return out(400, { error: "Bad status" });
    await store.setQaIssueStatus(issue.id, body.status, user.id);
    return out(200, await state());
  }

  if (action === "qa-outcome" && method === "POST") {
    const d = mustReview();
    if (d) return d;
    if (closed) return out(409, { error: "This round already has an outcome." });
    if (!QA_OUTCOMES.includes(body.outcome)) return out(400, { error: "Bad outcome" });
    const s = await state();
    if (s.counts.answered < s.counts.total) return out(400, { error: `Answer every check first (${s.counts.answered} of ${s.counts.total})` });
    const unresolved = s.issues.filter((i) => i.status !== "rechecked");
    if (body.outcome !== "fail") {
      if (s.counts.fail > 0) return out(400, { error: "A check is still marked Fail. Recheck it after the fix, or record the outcome as Fail." });
      if (unresolved.length > 0) return out(400, { error: `${unresolved.length} issue(s) not yet fixed and rechecked` });
      if (body.outcome === "pass" && s.issues.length > 0) return out(400, { error: "Issues were found and fixed: the outcome is Pass after fixes" });
      if (body.outcome === "pass_after_fixes" && s.issues.length === 0) return out(400, { error: "No issues were logged: the outcome is Pass" });
    }
    await store.setQaRound(round.id, { outcome: body.outcome, comments: str(body.comments, 2000), reviewer_id: user.id, reviewer_signed_at: new Date().toISOString() });
    await log("qa_outcome", { outcome: body.outcome, round: round.round });
    return out(200, await state());
  }

  if (action === "qa-lead-sign" && method === "POST") {
    if (!isLead) return deny("qa lead sign-off", { project: p.id });
    if (!(round.outcome === "pass" || round.outcome === "pass_after_fixes")) return out(400, { error: "The quality reviewer has not passed this round" });
    if (round.lead_signed_at) return out(409, { error: "Already signed off" });
    await store.setQaRound(round.id, { lead_id: user.id, lead_signed_at: new Date().toISOString() });
    await log("qa_signed", { round: round.round });
    return out(200, await state());
  }

  if (action === "qa-round-new" && method === "POST") {
    const d = mustReview();
    if (d) return d;
    if (!closed) return out(409, { error: "Finish this round (give an outcome) before starting a new one" });
    await store.newQaRound(p.id, round.round + 1, str(body.version, 40));
    await log("qa_round_new", { round: round.round + 1 });
    return out(200, await state());
  }

  return out(404, { error: "Unknown action" });
}
