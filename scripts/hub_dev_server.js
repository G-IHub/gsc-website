// LOCAL TESTING ONLY. Runs the Research Hub API on http://localhost:8787 against an in-memory Postgres filled with
// made-up people and projects, so the hub screens can be tried without the real database. Nothing is saved.
//
//   node scripts/hub_dev_server.js        (then `npm run dev` and open http://localhost:5173/hub)
//
// Every sample account uses the password:  hub-demo-pass-1
import http from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword } from "../api/_hub_core.js";
import { handleClient } from "../api/_client_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";
import { DEFAULT_MILESTONES } from "../api/_hub_defaults.js";

const db = new PGlite();
const sql = { query: async (text, params) => (await db.query(text, params)).rows };
await ensureSchema(sql);
const store = makeStore(sql);
const PW = "hub-demo-pass-1";
const env = { CLIENT_PORTAL_ENABLED: "1", HUB_ENABLED: "1", SESSION_SECRET: "dev-only-secret-dev-only-secret", HUB_DIRECTORS_SEE_MONEY: process.env.HUB_DIRECTORS_SEE_MONEY ?? "" };

const people = [
  ["mgmt@example.org", "Sample Management", "management", ""],
  ["finance@example.org", "Sample Finance", "finance", ""],
  ["director@example.org", "Sample Director", "director", "Lab"],
  ["leadb@example.org", "Lead B", "lead", ""],
  ["researchere@example.org", "Researcher E", "member", ""],
  ["researcherx@example.org", "Researcher X", "member", ""],
  ["coordinator@example.org", "Coordinator C", "coordinator", ""],
];
const id = {};
for (const [email, name, role, unit] of people) id[email] = (await store.createUser({ email, name, role, unit, password_hash: hashPassword(PW) })).id;

const projects = [
  ["GH-001", "Gut microbiome and diet (public 16S data)", "Lab", "Analysis complete", 1800000],
  ["GH-002", "Antimicrobial resistance genes in hospital isolates", "Lab", "Manuscript draft written", 2400000],
  ["GH-003", "Tumour expression signature (public RNA-seq)", "Other", "Protocol approved", 1500000],
];
const pid = {};
for (const [ref, title, unit, stage, fee] of projects) {
  const p = await store.createProject({ ref, title, unit, stage, target_date: "2026-12-12" });
  pid[ref] = p.id;
  await store.setClient(p.id, { name: `Sample client for ${ref}`, contact: "client@example.com" });
  await store.setMoney(p.id, { fee, paid: fee / 2, currency: "NGN" });
}
// a few states so Home has something to show
await store.updateProject(pid["GH-001"], { health: "red", target_date: "2026-11-20", payment_status: "cleared" });
await store.updateProject(pid["GH-002"], { health: "amber", target_date: "2026-11-28", payment_status: "balance_due" });
await store.updateProject(pid["GH-003"], { payment_status: "cleared" });
// those three are past clearance, so their checklists are complete too
for (const ref of ["GH-001", "GH-002", "GH-003"]) {
  for (const key of ["budget", "min_fee", "sheet_fee", "funds", "feasibility"]) await store.setClearance(pid[ref], key, true, id["finance@example.org"]);
}
// some milestones finished on different days this week (Home chart)
{
  const mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
  const day = (i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d.toISOString().slice(0, 10); };
  for (const ref of ["GH-001", "GH-002", "GH-003"]) await store.seedMilestones(pid[ref], DEFAULT_MILESTONES);
  const done = [["GH-001", 1, 0], ["GH-001", 2, 1], ["GH-002", 1, 1], ["GH-002", 2, 2], ["GH-002", 3, 2], ["GH-002", 4, 2], ["GH-003", 1, 4]];
  for (const [ref, n, i] of done) await store.updateMilestone(pid[ref], n, { status: "done", done: day(i) });
}
// sample expertise profiles (Team page)
await store.setProfile(id["leadb@example.org"], { skills: "AMR, whole-genome sequencing, phylogenetics, Python", can_lead: true, can_qa: false, max_projects: 2, availability: "available" });
await store.setProfile(id["researchere@example.org"], { skills: "GWAS, population genetics, R", can_lead: true, can_qa: false, max_projects: 2, availability: "limited" });
await store.setProfile(id["researcherx@example.org"], { skills: "Survival analysis, statistics, R, literature review", can_lead: false, can_qa: true, max_projects: 2, availability: "available" });
await store.addMember(pid["GH-002"], id["leadb@example.org"], "lead");
await store.addMember(pid["GH-002"], id["researchere@example.org"], "supporting");
await store.addMember(pid["GH-002"], id["researcherx@example.org"], "Quality reviewer");
await store.addMember(pid["GH-003"], id["researchere@example.org"], "supporting");
await store.addMember(pid["GH-003"], id["researcherx@example.org"], "supporting");
await store.addMember(pid["GH-001"], id["coordinator@example.org"], "coordinator");

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      let body;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        body = undefined;
      }
      const r = await (url.pathname.startsWith("/api/client") ? handleClient : handleHub)(
        { method: req.method, action: url.searchParams.get("action") ?? "", query: Object.fromEntries(url.searchParams), body, headers: req.headers, ip: "127.0.0.1" },
        store,
        env,
      );
      // plain http on localhost: the cookie keeps its Secure flag, which browsers accept for localhost
      if (r.setCookie) res.setHeader("Set-Cookie", r.setCookie);
      res.setHeader("Content-Type", "application/json");
      res.statusCode = r.status;
      res.end(JSON.stringify(r.body));
    });
  })
  .listen(8787, () => console.log(`Hub dev API on http://localhost:8787. Sample logins (password ${PW}): ${people.map((p) => p[0]).join(", ")}`));
