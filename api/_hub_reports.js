// Research Hub: Reports and KPIs. Called from _hub_core.js after sign-in; returns null for other actions.
//
// Who: management, finance, directors and leads (not team members or coordinators).
// Every number is worked out from what the hub records, over the projects the person may see.
// Money figures (fees received, revenue by week) only for management and finance. Nothing is invented:
// a KPI the hub cannot measure is entered by management and shown as entered.

export const WORKSTREAMS = [
  "Documentation and governance",
  "Financial and commercial structure",
  "Team and operational structure",
  "Technology and capacity (training and QA)",
  "Client acquisition and project activation",
];
// who leads each workstream (from the meeting report)
export const WORKSTREAM_LEADS = ["Admin / Legal", "Finance", "Subsidiary directors", "Farouk", "Victor"];
export const RAG = ["green", "amber", "red"];
export const REPORT_ROLES = ["management", "finance", "director", "lead"];
const MONEY = ["management", "finance"];

// kind "auto" = worked out by the hub; "manual" = entered by management
export const KPIS = [
  { key: "templates", name: "Essential templates completed", kind: "manual" },
  { key: "payment_framework", name: "Client payment framework approved", kind: "manual" },
  { key: "sop_prompts", name: "SOP and prompt library", kind: "manual" },
  { key: "training", name: "Research team training", kind: "manual" },
  { key: "directory", name: "Expertise directory mapped", kind: "auto" },
  { key: "prospects", name: "Prospective clients reviewed", kind: "manual" },
  { key: "feasibility", name: "Feasibility assessments done", kind: "auto" },
  { key: "budgets", name: "Project budgets approved", kind: "auto" },
  { key: "leads", name: "Project leads assigned", kind: "auto" },
  { key: "clearance", name: "Financial clearance before start", kind: "auto" },
  { key: "activated", name: "Projects activated (proposal accepted)", kind: "auto" },
];
export const KPI_STATUSES = ["met", "progress", "behind"];

const today = () => new Date().toISOString().slice(0, 10);
// The Friday that ends the week containing `iso` (weeks run Saturday to Friday)
export const weekEnding = (iso = today()) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const add = (5 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
};
const pct = (a, b) => (b === 0 ? null : Math.round((a / b) * 100));
const statusOf = (p) => (p === null ? "progress" : p >= 100 ? "met" : p === 0 ? "behind" : "progress");

export async function handleReports({ action, method, body, query, user, store, out, deny, str, isoDate, canSeeProject, memberIds, env }) {
  if (!["reports-summary", "reports", "report-submit", "kpi-set"].includes(action)) return null;
  if (!REPORT_ROLES.includes(user.role)) return deny(`reports ${action}`);
  const money = MONEY.includes(user.role);

  if (action === "kpi-set" && method === "POST") {
    if (user.role !== "management") return deny("set KPI");
    const k = KPIS.find((x) => x.key === body.key && x.kind === "manual");
    if (!k) return out(400, { error: "That KPI is worked out by the hub, or does not exist" });
    const progress = Math.max(0, Math.min(100, Math.round(Number(body.progress))));
    if (!Number.isFinite(progress)) return out(400, { error: "Progress must be 0 to 100" });
    if (!KPI_STATUSES.includes(body.status)) return out(400, { error: "Bad status" });
    await store.setKpi(k.key, { value: str(body.value, 60), progress, status: body.status, by: user.id });
    await store.log({ user_id: user.id, event: "kpi_set", detail: { key: k.key } });
    return out(200, { ok: true });
  }

  if (action === "report-submit" && method === "POST") {
    const ws = WORKSTREAMS.includes(body.workstream) ? body.workstream : null;
    if (!ws) return out(400, { error: "Pick a workstream" });
    if (!RAG.includes(body.status)) return out(400, { error: "Pick an overall status" });
    const done = str(body.done, 3000);
    if (!done) return out(400, { error: "Say what was completed" });
    const week = weekEnding(isoDate(body.week_ending) || today());
    const id = await store.addReport({
      week_ending: week, workstream: ws, status: body.status, done,
      deliverables: str(body.deliverables, 2000), challenges: str(body.challenges, 2000), next: str(body.next, 2000), author_id: user.id,
    });
    await store.log({ user_id: user.id, event: "report_submitted", detail: { week, workstream: ws } });
    return out(200, { ok: true, id, week_ending: week });
  }

  if (action === "reports" && method === "GET") {
    const week = weekEnding(isoDate(query?.week) || today());
    const rows = await store.listReports(week);
    const latest = WORKSTREAMS.map((ws) => rows.find((r) => r.workstream === ws) || null);
    return out(200, { week_ending: week, workstreams: WORKSTREAMS, leads: WORKSTREAM_LEADS, reports: latest, weeks: await store.listReportWeeks() });
  }

  if (action === "reports-summary" && method === "GET") {
    const light = query?.light === "1"; // Home: the KPI card and this month's total, not logged as opening the money
    const month = today().slice(0, 7);
    let monthReceived = 0;
    const projects = (await store.listProjects()).filter((p) => canSeeProject(user, p, memberIds));
    let delivered = 0, deliveredOnTime = 0, feas = 0, budgets = 0, leads = 0, cleared = 0, activated = 0, startedUncleared = 0;
    const weekly = new Map();
    let received30 = 0;
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    for (const p of projects) {
      const ms = await store.listMilestones(p.id);
      const m = (n) => ms.find((x) => x.n === n);
      const cl = await store.listClearance(p.id);
      const allClear = ["budget", "min_fee", "sheet_fee", "funds", "feasibility"].every((k) => cl.some((c) => c.key === k && c.done));
      const members = await store.listMembers(p.id);
      if (m(1)?.status === "done") feas++;
      if (cl.some((c) => c.key === "budget" && c.done)) budgets++;
      if (members.some((x) => x.role === "lead" || /lead/i.test(x.project_role || ""))) leads++;
      if (allClear) cleared++;
      if (m(2)?.status === "done") activated++;
      // "started" = any step from the protocol onwards is under way or done
      const started = ms.some((x) => x.n >= 4 && x.status !== "not_started");
      if (started && !allClear) startedUncleared++;
      const fin = m(12);
      if (fin?.status === "done") {
        delivered++;
        if (!p.target_date || (fin.done && fin.done <= p.target_date)) deliveredOnTime++;
      }
      if (money) {
        for (const r of await store.listPayments(p.id)) {
          if (r.status !== "received" || !r.received_date) continue;
          const w = weekEnding(r.received_date);
          weekly.set(w, (weekly.get(w) || 0) + r.amount);
          if (r.received_date >= since30) received30 += r.amount;
          if (r.received_date.startsWith(month)) monthReceived += r.amount;
        }
      }
    }
    const n = projects.length;
    const staff = (await store.listUsers()).filter((u) => u.active);
    const profiles = await store.countDirectoryProfiles();
    const manual = await store.listKpis();
    const auto = {
      directory: { value: `${profiles} of ${staff.length} people`, p: pct(profiles, staff.length) },
      feasibility: { value: `${feas} of ${n}`, p: pct(feas, n) },
      budgets: { value: `${budgets} of ${n}`, p: pct(budgets, n) },
      leads: { value: `${leads} of ${n}`, p: pct(leads, n) },
      clearance: { value: `${cleared} of ${n}`, p: pct(cleared, n) },
      activated: { value: String(activated), p: activated > 0 ? 100 : 0 },
    };
    const kpis = KPIS.map((k) => {
      if (k.kind === "auto") {
        const a = auto[k.key];
        return { key: k.key, name: k.name, kind: k.kind, value: a.value, progress: a.p ?? 0, status: n === 0 && k.key !== "directory" ? "progress" : statusOf(a.p) };
      }
      const m = manual.find((x) => x.key === k.key);
      return { key: k.key, name: k.name, kind: k.kind, value: m?.value || "Not entered", progress: m?.progress ?? 0, status: m?.status || "progress", updated: m?.at || null };
    });
    let revenue;
    if (money && !light) {
      // the last 6 weeks, oldest first
      const weeks = [];
      for (let i = 5; i >= 0; i--) weeks.push(weekEnding(new Date(Date.now() - i * 7 * 86400000).toISOString().slice(0, 10)));
      revenue = { received30, monthReceived, weeks: weeks.map((w) => ({ week_ending: w, amount: weekly.get(w) || 0 })) };
      await store.log({ user_id: user.id, event: "money_read", detail: { what: "reports" } });
    }
    return out(200, {
      scope: SEE_ALL(user) ? "all" : user.role === "director" ? "unit" : "mine",
      tiles: { projects: n, delivered, deliveredOnTime, startedUncleared, cleared },
      kpis,
      met: kpis.filter((k) => k.status === "met").length,
      ...(money && !light ? { revenue } : {}),
      ...(money && light ? { monthReceived } : {}),
    });
  }

  return out(404, { error: "Unknown action" });
}
const SEE_ALL = (u) => MONEY.includes(u.role);
