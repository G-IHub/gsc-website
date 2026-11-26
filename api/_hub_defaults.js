// Starting content for the Research Hub: the 14 standard project milestones and the document library list.
// Nothing here is a date or an amount; people fill those in.

// owner = who is responsible by default; signoff = the client signs this step off
export const DEFAULT_MILESTONES = [
  { n: 1, name: "Feasibility review done", owner: "Lead", signoff: false },
  { n: 2, name: "Proposal accepted; agreement and Project Sheet signed", owner: "Lead", signoff: true },
  { n: 3, name: "Commitment fee received; financial clearance", owner: "Finance", signoff: false },
  { n: 4, name: "Protocol approved by client", owner: "Lead", signoff: true },
  { n: 5, name: "Data collected and checked", owner: "Supporting researcher", signoff: false },
  { n: 6, name: "Analysis complete; key-results meeting", owner: "Lead", signoff: true },
  { n: 7, name: "Figures, tables and Source Data ready", owner: "Supporting researcher", signoff: false },
  { n: 8, name: "Manuscript draft written", owner: "Supporting researcher", signoff: true },
  { n: 9, name: "Independent quality review passed", owner: "Quality reviewer", signoff: false },
  { n: 10, name: "Review meeting; client approval (refund window starts)", owner: "Lead", signoff: true },
  { n: 11, name: "Balance received", owner: "Finance", signoff: false },
  { n: 12, name: "Final files released", owner: "Coordinator", signoff: true },
  { n: 13, name: "Support period ended", owner: "Lead", signoff: false },
  { n: 14, name: "Close-out form completed", owner: "Coordinator", signoff: false },
];
// "No work without financial clearance": the payment flag cannot leave "not cleared" until all five are ticked
export const CLEARANCE_ITEMS = [
  { key: "budget", label: "Budget approved by Finance" },
  { key: "min_fee", label: "Fee at or above the minimum fee" },
  { key: "sheet_fee", label: "Project Sheet signed; commitment fee received" },
  { key: "funds", label: "Source of funds for research costs identified" },
  { key: "feasibility", label: "Feasibility review done" },
];
// payment schedule rows (money: Finance and management only)
export const PAYMENT_ROW_STATUSES = ["planned", "due", "received", "not_used"];
// the commitment fee (non-refundable, as in the client agreement point 8; credited to the total); editable per project
export const COMMITMENT_FEE = 20000;
export const MILESTONE_STATUSES = ["not_started", "in_progress", "done"];

// audience: all = every signed-in staff member; money = management and finance; management = management only
export const LIBRARY_AUDIENCES = ["all", "money", "management"];
export const LIBRARY_KINDS = ["Word", "Excel", "PDF", "Link", "Other"];
export const DEFAULT_LIBRARY = [
  { title: "Client Agreement: Short Form", owner: "Management", version: "0.2", category: "Client documents", kind: "Word", audience: "all", description: "Three pages: twelve plain-language points, the Project Sheet and how we work together. The version clients sign." },
  { title: "Research Intake Form", owner: "Lead researchers", version: "0.1", category: "Client documents", kind: "Word", audience: "all", description: "Client form (topic, aim, methods) plus our feasibility review." },
  { title: "Project Proposal Template", owner: "Lead researchers", version: "0.1", category: "Client documents", kind: "Word", audience: "all", description: "Scope, timeline, deliverables and fee for the client. Shows no internal costs." },
  { title: "Research Protocol Template", owner: "Lead researchers", version: "0.1", category: "Project planning", kind: "Word", audience: "all", description: "The full protocol: 15 sections and a change log." },
  { title: "Project Budget Template", owner: "Finance", version: "0.1", category: "Project planning", kind: "Excel", audience: "money", description: "Fee, staff cost, software and data, admin and margin. Management and Finance only." },
  { title: "Project Close-out Form", owner: "Coordinator", version: "0.1", category: "Quality and delivery", kind: "Word", audience: "all", description: "Client delivery and acceptance, then our internal close-out checklist." },
  { title: "SOP: Research-to-Publication Service", owner: "Management", version: "0.1", category: "Team and reporting", kind: "Word", audience: "all", description: "The 15 stages from acquisition to close-out, the never-bend rules and escalation." },
  { title: "Decision Sheet: 12 Management Approvals", owner: "Management", version: "0.1", category: "Management", kind: "Word", audience: "management", description: "The twelve decisions management must approve before the pilot." },
];

// Removed from the library on 2026-11-24 at the owner's request: the long agreement pack (the short form is the one
// clients sign) and four documents the hub now replaces (Projects, Reports and KPIs, Team, the prompt library tab).
// Deleted once from an existing library; never re-added by the starter list.
export const RETIRED_LIBRARY = [
  "Client Agreement Pack: Master Agreement and Project Schedule",
  "Project Tracking Template",
  "Weekly Report and KPI Sheet",
  "Responsibilities Matrix and Expertise Directory",
  "OMI Research Prompt Library",
];

// Removed on 2026-11-24 (second clean-up): the QA Checklist is now the "QA checklist" tab of every project.
export const RETIRED_LIBRARY_QA = ["QA Checklist"];
