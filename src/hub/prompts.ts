// The 12 research prompts, generated from OMI_PROMPT_LIBRARY.md (Prompt Library draft v0.1).
// Regenerate this file when the library changes; do not edit by hand.
export type ResearchPrompt = { n: number; name: string; prompt: string; omi: string; check: string };
export const RESEARCH_PROMPTS: ResearchPrompt[] = [
  {
    "n": 1,
    "name": "Topic refinement",
    "prompt": "This is a real research project, not a lesson. The client's rough idea is: \"[TOPIC]\". Field: [FIELD]. Suggest 3 sharper, answerable research questions that can be addressed with PUBLIC data and computational methods only (no wet-lab). For each: the question, why it matters, what public data could answer it, and the main risk. Do not search yet. Ask me anything you need to know first.",
    "omi": "Chat answer, asks clarifying questions.",
    "check": "Is each question truly answerable without lab work? Is the data really public and usable?"
  },
  {
    "n": 2,
    "name": "Literature review",
    "prompt": "Run a systematic literature review on: \"[TOPIC / chosen question]\". Use at least 3 search angles (main topic, method/mechanism, population or geography). Use real search results only. Give me: how fast the field is growing, the top journals, the 10 most important papers with DOI, and the main themes. Do not write any citation that did not come back from a search.",
    "omi": "`literature_review` (Europe PMC + OpenAlex, title/abstract level, many records, takes minutes).",
    "check": "Spot-check 5 papers by opening the DOI. Remember this is abstract-level, not full-text reading."
  },
  {
    "n": 3,
    "name": "Research-gap identification",
    "prompt": "From the literature review above, list the research gaps. For each gap give the exact sentence from a real abstract that signals it, the paper's DOI, and whether public data exists to fill it. Rank gaps by how feasible they are for a computational study.",
    "omi": "Uses the verbatim \"further research is needed\"-type sentences already printed by the review.",
    "check": "Gap is genuinely open, not just unfamiliar to Omi. Supervisor or domain expert confirms."
  },
  {
    "n": 4,
    "name": "Aims and objectives",
    "prompt": "Using the gap \"[GAP]\", write one research aim and 3–4 specific, measurable objectives. Add the research question(s) and, where it fits, testable hypotheses. Keep it to one page and tell me which objective depends on which dataset.",
    "omi": "",
    "check": "Every objective can be met with the data in step 6."
  },
  {
    "n": 5,
    "name": "Research protocol",
    "prompt": "Write a research protocol for this aim: \"[AIM]\" and objectives: \"[OBJECTIVES]\". Include: study design, data sources, inclusion/exclusion criteria, analysis methods with the named tools and why each was chosen, statistical approach, expected outputs (figures and tables), limitations, and a realistic timeline in weeks. Present it as a plan and wait for my approval before running anything.",
    "omi": "Presents the plan (`present_plan`) with where each step runs, then waits.",
    "check": "This document is the approval and budgeting basis. Lead researcher and finance review it before any work starts."
  },
  {
    "n": 6,
    "name": "Data sourcing",
    "prompt": "Find public data for objective [N]: \"[OBJECTIVE]\" for [ORGANISM/POPULATION]. Search real repositories (e.g. NCBI SRA/GEO, ENA, BV-BRC, public cohorts). For each candidate dataset give: accession, size, sample count, metadata available, licence/access conditions. Tell me which one you recommend and why. Do not download anything until I confirm.",
    "omi": "Search/fetch tools (`search_sra`, `fetch_ncbi`, `get_public_data`, `search_bvbrc`, etc.).",
    "check": "Access conditions allow the intended use and publication. Record every accession for the Methods section."
  },
  {
    "n": 7,
    "name": "Computational analysis",
    "prompt": "This is a real analysis. Dataset: [DATASET]. Objective: \"[OBJECTIVE]\". Follow the approved protocol. Before each step, say what it does and why. After each step, show the real output. Record software and versions as you go. If a step fails or the data is insufficient, stop and tell me — do not substitute or invent values.",
    "omi": "Runs cells in the notebook; cloud tools where needed; logs versions.",
    "check": "Re-read each result. Does it make biological sense? Are sample counts right?"
  },
  {
    "n": 8,
    "name": "Figures and tables",
    "prompt": "Make the figure(s) for objective [N]: [FIGURE TYPE, e.g. volcano plot, Kaplan–Meier, heatmap] from the results above. Use the platform's figure recipe where one exists. Every figure needs a title, labelled axes with units, and a saved Source Data file. Also make a table of [WHAT THE TABLE SHOULD SHOW].",
    "omi": "`draw_figure` recipes (house style, title check, Source Data).",
    "check": "Figure matches the numbers in the text; legend and colours readable; nothing cropped."
  },
  {
    "n": 9,
    "name": "Results interpretation",
    "prompt": "Interpret the results for objective [N]. State what was found with the exact numbers from the cells above, what it means, how it compares with the real papers found earlier (name them with DOI), and what it does NOT show. List the limitations honestly.",
    "omi": "",
    "check": "Every number is traceable to a cell. No claim is stronger than the data."
  },
  {
    "n": 10,
    "name": "Manuscript drafting",
    "prompt": "Yes, write the manuscript for [JOURNAL or \"a general journal\"] (about [WORD LIMIT] words). Build it section by section (Introduction, Methods, Results, Discussion, Conclusion). Base Methods and Results only on what was actually done in this project. Use only references already retrieved. Include the Software and versions table. Verify all references before finishing.",
    "omi": "`start_manuscript` / `add_manuscript_section` / `finish_manuscript` for long papers, `verify_references` before finishing, .docx/PDF export. (Omi only drafts when you clearly ask.)",
    "check": "Editor/QA stage (Stage 9). The draft is a first draft, not a finished paper."
  },
  {
    "n": 11,
    "name": "Journal selection",
    "prompt": "Suggest 5 suitable journals for this manuscript. For each: scope fit, typical article type, indexing, whether open-access fees apply, and what the author instructions require. Use real, current information from the journals' own websites and tell me when you could not confirm something. Do not state an impact factor you could not verify.",
    "omi": "Chat plus browsing. (There is no dedicated journal tool yet, so everything here must be checked.)",
    "check": "Confirm scope, fees and current requirements on the journal website. Avoid predatory journals."
  },
  {
    "n": 12,
    "name": "Reviewer-response preparation",
    "prompt": "Here are the reviewers' comments: [PASTE]. For each comment: classify it (must fix / should fix / disagree with reason), propose the exact change to the manuscript, and draft a polite point-by-point reply. For any comment that needs new analysis, tell me what to run. Do not invent new results.",
    "omi": "Edits sections (`edit_manuscript_section`) and drafts the reply text.",
    "check": "Lead researcher approves every reply; any new analysis is rerun and logged."
  }
];
