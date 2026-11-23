// Research Hub: Team (responsibilities matrix, expertise directory and capacity). Called from _hub_core.js.
//
// Who: management, finance, directors and leads see the Team pages. Management edits the matrix.
// Every person (any role) fills in their own directory profile from My account. No emails leave the server here.

export const TEAM_ROLES = ["management", "finance", "director", "lead"];
export const RACI_COLUMNS = ["Client", "Lead", "Support", "Quality", "Coord.", "Finance", "Sub. dir.", "Mgmt", "Victor", "Farouk", "IT"];
export const RACI_CODES = ["", "A", "R", "C", "I", "A/R"];
export const AVAILABILITY = ["available", "limited", "unavailable"];
// All 36 activities from the Responsibilities Matrix workbook, in its sections
export const DEFAULT_RACI = [
  ["Acquisition", "Run free research clinics and outreach", ",,,,,,C,I,A/R,,"],
  ["Acquisition", "Build the Competition Lab pipeline", ",,,,,,,C,A/R,C,"],
  ["Acquisition", "Keep the prospect list; convert prospects to clients", ",,,,,,I,I,A/R,,"],
  ["Intake and feasibility", "Receive the intake form and log the project", ",A,,,R,,,,C,,"],
  ["Intake and feasibility", "Feasibility review (2 to 5 working days)", "C,A/R,C,C,,,I,,,,"],
  ["Intake and feasibility", "Decide: accept, refine or decline", "I,R,,,,,A,I,,,"],
  ["Commercial", "Write the project proposal", "I,A/R,,,C,C,,,,,"],
  ["Commercial", "Prepare the project budget", ",R,C,,,A,I,,,,"],
  ["Commercial", "Approve pricing and the fee", ",C,,,,R,C,A,,,"],
  ["Commercial", "Client agreement and Project Sheet signed", "R,R,,,,,,A,,,"],
  ["Commercial", "Receive the commitment fee; confirm payment in writing", "R,I,,,I,A/R,,,,,"],
  ["Commercial", "Financial clearance before any work starts", ",C,,,I,A/R,,,,,"],
  ["Delivery", "Assign the team and the project coordinator", ",C,,,I,,A/R,I,,,"],
  ["Delivery", "Kick-off call and weekly client calls", "R,A/R,I,,R,,,,,,"],
  ["Delivery", "Write and agree the research protocol", "C,A/R,C,C,,I,,,,,"],
  ["Delivery", "Source and check the data", "C,A,R,C,,,,,,,"],
  ["Delivery", "Run the analysis", "I,A,R,I,,,,,,,"],
  ["Delivery", "Figures, tables and Source Data", ",A,R,C,,,,,,,"],
  ["Delivery", "Write the manuscript draft", "C,A,R,,,,,,,,"],
  ["Delivery", "Independent quality review (rerun, number trace, references)", ",C,C,A/R,,,,,,,"],
  ["Delivery", "Similarity screening and the AI-use statement", ",C,,A/R,,,,,,,C"],
  ["Delivery", "Review meeting and client approval", "R,A/R,,I,R,,,,,,"],
  ["Delivery", "Balance received; final files released", "R,C,,,R,A,,,,,"],
  ["After delivery", "Journal selection guidance", "C,A/R,C,,,,,,,,"],
  ["After delivery", "Reviewer-response support (in the support period)", "C,A/R,R,,,,,,,,"],
  ["After delivery", "Submit the manuscript to the journal", "A/R,I,,,,,,,,,"],
  ["After delivery", "Project close-out form", "C,A/R,,,R,R,,,,,"],
  ["Management and governance", "Update the project tracker and updates log", ",C,I,,A/R,,,,,,"],
  ["Management and governance", "Monday, Wednesday and Friday reviews", ",R,,,R,,R,A,,,"],
  ["Management and governance", "Weekly report and KPIs", ",C,,,A/R,,C,I,,,"],
  ["Management and governance", "Escalations and unblocking projects", ",R,,,,C,A/R,C,,,"],
  ["Management and governance", "Keep the SOP and prompt library up to date", ",C,C,C,,,,A,,R,"],
  ["Management and governance", "Training and standardisation sessions", ",I,I,I,I,,,,,A/R,"],
  ["Management and governance", "Buy and manage QA tools (plagiarism, access)", ",,,C,,C,,I,,,A/R"],
  ["Management and governance", "Keep the expertise directory and capacity up to date", ",,,,R,,A/R,I,,,"],
  ["Management and governance", "Appoint coordinators and quality reviewers", ",,,,,,C,A/R,,,"],
].map(([section, name, s]) => ({ section, name, cells: s.split(",") }));

// The 17-row starter used before 2026-11-23 (only to upgrade an untouched copy to all 36)
const FIRST_SEED = [
  ["Feasibility review (2 to 5 working days)", "C,A/R,C,C,,,I,,,,"],
  ["Decide: accept, refine or decline", "I,R,,,,,A,I,,,"],
  ["Prepare the project budget", ",R,C,,,A,I,,,,"],
  ["Approve pricing and the fee", ",C,,,,R,C,A,,,"],
  ["Client agreement and Project Sheet signed", "R,R,,,,,,A,,,"],
  ["Commitment fee received; confirmed in writing", "R,I,,,I,A/R,,,,,"],
  ["Financial clearance before any work starts", ",C,,,I,A/R,,,,,"],
  ["Write and agree the research protocol", "C,A/R,C,C,,I,,,,,"],
  ["Run the analysis", "I,A,R,I,,,,,,,"],
  ["Independent quality review", ",C,C,A/R,,,,,,,"],
  ["Review meeting and client approval", "R,A/R,,I,R,,,,,,"],
  ["Balance received; final files released", "R,C,,,R,A,,,,,"],
  ["Reviewer-response support", "C,A/R,R,,,,,,,,"],
  ["Submit the manuscript to the journal", "A/R,I,,,,,,,,,"],
  ["Project close-out form", "C,A/R,,,R,R,,,,,"],
  ["Weekly report and KPIs", ",C,,,A/R,,C,I,,,"],
  ["Buy and manage QA tools", ",,,C,,C,,I,,,A/R"],
].map(([name, s]) => ({ name, cells: s.split(",") }));

// A row is fine when exactly one person is accountable and at least one does the work
export const raciCheck = (cells) => {
  const a = cells.filter((c) => c === "A" || c === "A/R").length;
  const r = cells.filter((c) => c === "R" || c === "A/R").length;
  if (a === 0) return "No one accountable";
  if (a > 1) return "More than one accountable";
  if (r === 0) return "No one doing the work";
  return "OK";
};

export async function handleTeam({ action, method, body, user, store, out, deny, str }) {
  if (!["team", "raci-set", "raci-add", "raci-delete", "profile", "profile-set"].includes(action)) return null;

  // ---- my own directory profile (everyone) ----
  if (action === "profile" && method === "GET") {
    return out(200, { profile: (await store.getProfile(user.id)) || { skills: "", can_lead: false, can_qa: false, max_projects: 2, availability: "available" } });
  }
  if (action === "profile-set" && method === "POST") {
    const max = Math.round(Number(body.max_projects));
    if (!Number.isFinite(max) || max < 0 || max > 10) return out(400, { error: "Maximum projects must be 0 to 10" });
    if (!AVAILABILITY.includes(body.availability)) return out(400, { error: "Bad availability" });
    await store.setProfile(user.id, {
      skills: str(body.skills, 500), can_lead: Boolean(body.can_lead), can_qa: Boolean(body.can_qa), max_projects: max, availability: body.availability,
    });
    await store.log({ user_id: user.id, event: "profile_set", detail: {} });
    return out(200, { ok: true });
  }

  if (!TEAM_ROLES.includes(user.role)) return deny(`team ${action}`);

  if (action === "team" && method === "GET") {
    await store.seedRaci(DEFAULT_RACI, FIRST_SEED);
    const raci = (await store.listRaci()).map((r) => ({ ...r, check: raciCheck(r.cells) }));
    const people = (await store.listUsers()).filter((u) => u.active);
    const profiles = await store.listDirectory();
    const counts = await store.countActiveMemberships();
    const directory = people.map((u) => {
      const pr = profiles.find((x) => x.user_id === u.id);
      const active = counts.find((c) => c.user_id === u.id)?.n ?? 0;
      return {
        user_id: u.id, name: u.name, role: u.role, unit: u.unit || "",
        filled: Boolean(pr && pr.skills), skills: pr?.skills || "", can_lead: Boolean(pr?.can_lead), can_qa: Boolean(pr?.can_qa),
        max_projects: pr?.max_projects ?? 2, availability: pr?.availability || "available", active, spare: (pr?.max_projects ?? 2) - active,
      };
    });
    return out(200, { columns: RACI_COLUMNS, codes: RACI_CODES, raci, directory, canEdit: user.role === "management" });
  }

  if (user.role !== "management") return deny(`team ${action}`);

  if (action === "raci-set" && method === "POST") {
    const id = Number(body.id);
    const cells = Array.isArray(body.cells) ? body.cells : null;
    if (!Number.isInteger(id) || !cells || cells.length !== RACI_COLUMNS.length || !cells.every((c) => RACI_CODES.includes(c))) {
      return out(400, { error: "Bad matrix row" });
    }
    const name = body.name === undefined ? undefined : str(body.name, 200);
    if (name === "") return out(400, { error: "Name the activity" });
    if (!(await store.setRaci(id, cells, name))) return out(404, { error: "Not found" });
    await store.log({ user_id: user.id, event: "raci_set", detail: { id } });
    return out(200, { ok: true, check: raciCheck(cells) });
  }
  if (action === "raci-add" && method === "POST") {
    const name = str(body.name, 200);
    if (!name) return out(400, { error: "Name the activity" });
    const id = await store.addRaci(name, RACI_COLUMNS.map(() => ""));
    await store.log({ user_id: user.id, event: "raci_set", detail: { id, added: true } });
    return out(200, { ok: true, id });
  }
  if (action === "raci-delete" && method === "POST") {
    const id = Number(body.id);
    if (!Number.isInteger(id)) return out(400, { error: "Bad request" });
    await store.deleteRaci(id);
    await store.log({ user_id: user.id, event: "raci_set", detail: { id, deleted: true } });
    return out(200, { ok: true });
  }

  return out(404, { error: "Unknown action" });
}
