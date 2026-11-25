// The client's part of the Research Intake Form (from the Research Intake Form draft), filled in online in the portal.
// type: text (one line), long (several lines), choice (one of), multi (any of)
export const INTAKE_SECTIONS = [
  {
    title: "About you",
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "institution", label: "Institution / organisation", type: "text", required: true },
      { key: "role", label: "Your role", type: "choice", required: true, options: ["Lecturer", "MSc student", "PhD student", "Researcher", "Research group", "Other"] },
      { key: "contact", label: "Email and phone", type: "text", required: true },
    ],
  },
  {
    title: "Your research idea",
    fields: [
      { key: "title", label: "Working title", type: "text" },
      { key: "topic", label: "1. Research topic or idea", type: "long", required: true, hint: "A few sentences: what do you want to study?" },
      { key: "background", label: "2. Background", type: "long", hint: "Why does it matter? What is already known? (3 to 5 lines)" },
      { key: "aim", label: "3. Aim", type: "long", required: true, hint: "One sentence: what do you want to achieve?" },
      { key: "objectives", label: "4. Specific objectives", type: "long", required: true, hint: "2 to 4 clear things you want to find out or do." },
      { key: "questions", label: "5. Research questions or hypotheses", type: "long", hint: "If you have them." },
      { key: "methods", label: "6. Methods you have in mind", type: "long", hint: "If any. We will advise if you are not sure." },
      { key: "expected", label: "7. Expected results", type: "long", hint: "What do you think you will find?" },
      { key: "activities", label: "8. Activities you propose", type: "long", hint: "What would you like us to do, step by step?" },
    ],
  },
  {
    title: "Data",
    fields: [
      { key: "has_data", label: "Do you have data?", type: "choice", required: true, options: ["Yes, my own data", "Yes, public data", "No, please find suitable data"] },
      { key: "data_type", label: "Type of data", type: "multi", options: ["Sequences", "Gene expression", "Clinical / patient", "Survey", "Other"] },
      { key: "data_size", label: "Size of the data", type: "text" },
      { key: "personal_data", label: "Does it include personal or patient data?", type: "choice", options: ["No", "Yes (we may be unable to use it, or will need extra safeguards)"] },
      { key: "ethics", label: "Ethics approval or data-use permission", type: "choice", options: ["Not needed", "Have it", "In progress", "Not sure"] },
    ],
  },
  {
    title: "Publication plans",
    fields: [
      { key: "journal", label: "Target journal or type of journal", type: "text" },
      { key: "deadline", label: "Your deadline, if any", type: "text" },
      { key: "thesis", label: "Part of a degree or thesis?", type: "choice", options: ["No", "Yes, and my supervisor knows I am asking for support"] },
      { key: "already", label: "Anything already written or done", type: "long" },
    ],
  },
  {
    title: "Confirmation",
    fields: [
      { key: "confirm", label: "Please confirm", type: "multi", required: true, options: [
        "The information above is accurate.",
        "I have the right to share it and any data I mention.",
        "I understand that sending this form does not start any work or create any charge.",
      ] },
    ],
  },
];
export const INTAKE_FIELDS = INTAKE_SECTIONS.flatMap((s) => s.fields);

// Keeps only known fields, trims and limits them; returns { data, missing } (missing = required fields left empty)
export function cleanIntake(input) {
  const src = input && typeof input === "object" ? input : {};
  const data = {};
  const missing = [];
  for (const f of INTAKE_FIELDS) {
    let v = src[f.key];
    if (f.type === "multi") {
      v = Array.isArray(v) ? v.filter((x) => f.options.includes(x)) : [];
    } else if (f.type === "choice") {
      v = f.options.includes(v) ? v : "";
    } else {
      v = String(v ?? "").replace(/\r/g, "").trim().slice(0, f.type === "long" ? 3000 : 300);
    }
    data[f.key] = v;
    const empty = Array.isArray(v) ? (f.key === "confirm" ? v.length < f.options.length : v.length === 0) : !v;
    if (f.required && empty) missing.push(f.label);
  }
  return { data, missing };
}
