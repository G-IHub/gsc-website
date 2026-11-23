// LOCAL TESTING ONLY. Runs the Research Hub API on http://localhost:8787 against an in-memory Postgres filled with
// made-up people and projects, so the hub screens can be tried without the real database. Nothing is saved.
//
//   node scripts/hub_dev_server.js        (then `npm run dev` and open http://localhost:5173/hub)
//
// Every sample account uses the password:  hub-demo-pass-1
import http from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { handleHub, hashPassword } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

const db = new PGlite();
const sql = { query: async (text, params) => (await db.query(text, params)).rows };
await ensureSchema(sql);
const store = makeStore(sql);
const PW = "hub-demo-pass-1";
const env = { HUB_ENABLED: "1", SESSION_SECRET: "dev-only-secret-dev-only-secret", HUB_DIRECTORS_SEE_MONEY: process.env.HUB_DIRECTORS_SEE_MONEY ?? "" };

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
await store.addMember(pid["GH-002"], id["leadb@example.org"], "lead");
await store.addMember(pid["GH-002"], id["researchere@example.org"], "supporting");
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
      const r = await handleHub(
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
