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
export const MILESTONE_STATUSES = ["not_started", "in_progress", "done"];

// audience: all = every signed-in staff member; money = management and finance; management = management only
export const LIBRARY_AUDIENCES = ["all", "money", "management"];
export const LIBRARY_KINDS = ["Word", "Excel", "PDF", "Link", "Other"];
export const DEFAULT_LIBRARY = [
  { title: "Client Agreement: Short Form", category: "Client documents", kind: "Word", audience: "all", description: "Three pages: twelve plain-language points, the Project Sheet and how we work together. The version clients sign." },
  { title: "Client Agreement Pack: Master Agreement and Project Schedule", category: "Client documents", kind: "Word", audience: "all", description: "The long version, kept as the lawyer's reference and backup. Not lawyer-reviewed yet." },
  { title: "Research Intake Form", category: "Client documents", kind: "Word", audience: "all", description: "Client form (topic, aim, methods) plus our feasibility review." },
  { title: "Project Proposal Template", category: "Client documents", kind: "Word", audience: "all", description: "Scope, timeline, deliverables and fee for the client. Shows no internal costs." },
  { title: "Research Protocol Template", category: "Project planning", kind: "Word", audience: "all", description: "The full protocol: 15 sections and a change log." },
  { title: "Project Tracking Template", category: "Project planning", kind: "Excel", audience: "all", description: "Portfolio, one sheet per project, updates log and change log." },
  { title: "Project Budget Template", category: "Project planning", kind: "Excel", audience: "money", description: "Fee, staff cost, software and data, admin and margin. Management and Finance only." },
  { title: "QA Checklist", category: "Quality and delivery", kind: "Word", audience: "all", description: "43 checks across 11 sections, with an issues log and sign-off." },
  { title: "Project Close-out Form", category: "Quality and delivery", kind: "Word", audience: "all", description: "Client delivery and acceptance, then our internal close-out checklist." },
  { title: "Weekly Report and KPI Sheet", category: "Team and reporting", kind: "Excel", audience: "all", description: "Weekly report form, the 30-day KPIs and the Monday, Wednesday and Friday rhythm." },
  { title: "Responsibilities Matrix and Expertise Directory", category: "Team and reporting", kind: "Excel", audience: "all", description: "Who does what across the 36 activities, and who has which skills." },
  { title: "SOP: Research-to-Publication Service", category: "Team and reporting", kind: "Word", audience: "all", description: "The 15 stages from acquisition to close-out, the never-bend rules and escalation." },
  { title: "OMI Research Prompt Library", category: "Team and reporting", kind: "Word", audience: "all", description: "Twelve prompt types for Omi, each with what Omi does and the human check." },
  { title: "Decision Sheet: 12 Management Approvals", category: "Management", kind: "Word", audience: "management", description: "The twelve decisions management must approve before the pilot." },
];
