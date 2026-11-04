import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Check, CheckCircle2, ShieldCheck, X } from "lucide-react";
import { CheckList } from "../components/ui";
import { Reveal } from "../components/motion";
import { contact, enquiryEndpoint } from "../data/site";

const programmeName = "Research-to-Publication Programme (Research Clinic)";

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/15 transition";

const Field = ({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) => (
  <label className="block">
    <span className="block text-sm font-medium text-plum mb-1.5">
      {label} {required ? <span className="text-magenta-dark">*</span> : <span className="text-muted font-normal">(optional)</span>}
    </span>
    {children}
  </label>
);

// The journey in two lanes, so it is clear the researcher stays the lead at every step
const journey = [
  {
    title: "Free feasibility review",
    you: "Share your area of interest, aims and objectives.",
    we: "Review feasibility and reply within 3–5 working days. The review is free.",
  },
  {
    title: "Proposal and agreement",
    you: "Review the scope, price and authorship plan, and agree the NDA.",
    we: "Prepare the scope, price, authorship plan and NDA before any work begins.",
  },
  {
    title: "Research and analysis",
    you: "Review and interpret the results.",
    we: "Expand your idea into a protocol, gather data and run reproducible analysis.",
  },
  {
    title: "Manuscript",
    you: "Revise the draft, approve it and remain accountable for it as lead researcher.",
    we: "Prepare a manuscript draft from the agreed results.",
  },
  {
    title: "Submission and review",
    you: "Approve the target journal and respond to reviewers, with our support.",
    we: "Select the journal, format and submit, and support you with reviewers' comments.",
  },
  {
    title: "Payment on delivery",
    you: "Pay when the agreed work is delivered.",
    we: "No upfront or stage payments. Payment is not tied to whether a journal accepts the paper.",
  },
];

const packageItems = [
  "Study design and protocol",
  "Analysis, figures and tables",
  "Manuscript draft for your approval",
  "Journal selection",
  "Submission support",
];

const proofPoints = ["Free feasibility review", "Reply in 3–5 working days", "Pay only on delivery", "NDA and written authorship"];

const fields = ["Genomics", "Bioinformatics", "Biotechnology", "Microbiology", "Antimicrobial resistance", "Medicinal plant research", "Public health"];
const people = ["Lecturers", "Postdoctoral researchers", "Research groups", "Postgraduate supervisors"];

const included = [
  "Study design and research protocol",
  "Data sourcing and analysis, with figures and tables",
  "A manuscript prepared for your review and approval",
  "Journal selection and submission support",
  "Support with responses to reviewers",
  "Confidentiality under a signed NDA",
];

const excluded = [
  "Selling finished papers or authorship",
  "Promising acceptance or publication in any journal",
  "Hiding who contributed to the work",
  "Fabricating or manipulating data or results",
];

const faqs = [
  { q: "Does it cost anything to apply?", a: "No. The Research Clinic feasibility review is free. You only pay if you accept a proposal and the agreed work is delivered." },
  { q: "When do I pay?", a: "After the agreed work is done, as defined in your agreement. There are no upfront or stage payments, and payment is not linked to whether a journal accepts the paper." },
  { q: "Will my name be on the paper?", a: "You lead the research, so you take part in design, interpretation, revision and final approval. Authorship is agreed in writing before work starts and reflects who contributed what, including GSC staff where their contribution is substantial." },
  { q: "Can you guarantee publication?", a: "No. Acceptance is decided by journals and peer reviewers. We support you through submission and revision." },
  { q: "Who owns the results?", a: "You own your results and manuscript once the agreement is fulfilled. GSC and Omicsboard Lab keep ownership of their methods, code and pipelines." },
  { q: "Is my idea kept confidential?", a: "Yes, under a signed NDA. The NDA protects your ideas and data. It does not hide anyone's contribution to the work." },
];

// Serif section heading in the journal style
const Heading = ({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) => (
  <div className="mb-10 md:mb-12 max-w-3xl">
    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-magenta-dark">{eyebrow}</p>
    <h2 className="font-journal text-3xl leading-tight text-plum md:text-[40px]">{title}</h2>
    {intro && <p className="mt-4 text-base leading-relaxed text-muted">{intro}</p>}
  </div>
);

// Page section on a paper-coloured or white background
const Band = ({ id, tone = "paper", children }: { id?: string; tone?: "paper" | "white"; children: ReactNode }) => (
  <section id={id} className={`${tone === "paper" ? "bg-paper" : "bg-white"} px-4 py-16 sm:px-6 md:py-24 lg:px-8`}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

// A made-up journal article page with the author's submission package beside it. Decorative only.
const JournalMockup = () => (
  <div aria-hidden="true" className="select-none overflow-hidden rounded-2xl bg-white text-left shadow-2xl shadow-black/30 ring-1 ring-black/10">
    <div className="flex items-center gap-2 border-b border-black/5 bg-[#f1eef5] px-4 py-3">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] text-muted">journal.example.org/articles/your-study</span>
    </div>
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-3 md:px-8">
      <span className="font-journal text-lg font-semibold tracking-tight text-plum">Your Journal</span>
      <span className="hidden gap-5 text-[11px] text-muted sm:flex">
        <span>Articles</span>
        <span>Subjects</span>
        <span>For authors</span>
        <span>About</span>
      </span>
      <span className="rounded-full bg-plum px-3.5 py-1.5 text-[11px] font-medium text-white">Submit manuscript</span>
    </div>
    <div className="grid md:grid-cols-[1.7fr_1fr]">
      <div className="border-gray-200 p-5 md:border-r md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-magenta-dark">Original article</p>
        <h3 className="mt-2 font-journal text-xl leading-tight text-ink md:text-[27px]">
          Genomic surveillance of antimicrobial resistance in hospital isolates
        </h3>
        <p className="mt-3 text-[13px] text-ink">
          Your Name<sup>1</sup>, Co-author<sup>2</sup>, Collaborator<sup>3</sup>
        </p>
        <p className="mt-0.5 text-[11px] text-muted">1 Your institution · 2 Partner institution · 3 Collaborating group</p>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-muted">Abstract</p>
        <div className="mt-2 space-y-2">
          <div className="h-2 w-full rounded bg-gray-200" />
          <div className="h-2 w-11/12 rounded bg-gray-200" />
          <div className="h-2 w-2/3 rounded bg-gray-200" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 p-2">
            <svg viewBox="0 0 120 70" className="w-full">
              <g fill="#b241b7">
                <rect x="8" y="30" width="12" height="32" />
                <rect x="26" y="14" width="12" height="48" />
                <rect x="44" y="38" width="12" height="24" />
                <rect x="62" y="22" width="12" height="40" />
              </g>
              <g fill="#2a0f52">
                <rect x="80" y="44" width="12" height="18" />
                <rect x="98" y="26" width="12" height="36" />
              </g>
              <line x1="4" y1="62" x2="116" y2="62" stroke="#d1d5db" />
            </svg>
            <p className="mt-1 text-[10px] text-muted">Figure 1 | Resistance gene profile</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-2">
            <svg viewBox="0 0 120 70" fill="none" stroke="#2a0f52" strokeWidth="1.5">
              <path d="M8 35 H28 M28 17 V53 M28 17 H56 M28 53 H56 M56 9 V25 M56 9 H100 M56 25 H88 M56 45 V63 M56 45 H92 M56 63 H104" />
              <g fill="#cde24a" stroke="none">
                <circle cx="100" cy="9" r="3" />
                <circle cx="88" cy="25" r="3" />
                <circle cx="92" cy="45" r="3" />
                <circle cx="104" cy="63" r="3" />
              </g>
            </svg>
            <p className="mt-1 text-[10px] text-muted">Figure 2 | Isolate relationships</p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 bg-paper p-5 md:border-t-0 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-magenta-dark">Submission package</p>
        <ul className="mt-3 space-y-2.5">
          {packageItems.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime text-plum">
                <Check size={11} strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 h-1.5 rounded-full bg-gray-200">
          <div className="h-full w-full rounded-full bg-linear-to-r from-magenta to-lime" />
        </div>
        <p className="mt-2 text-[11px] text-muted">Ready for your final approval</p>
        <div className="mt-4 rounded-full bg-magenta py-2.5 text-center text-xs font-medium text-white">Submit to journal</div>
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">After submission</p>
          <p className="mt-2 text-[13px] leading-snug text-ink">Support with reviewers' comments, so you can respond with confidence.</p>
        </div>
      </div>
    </div>
  </div>
);

type Status = "idle" | "sending" | "sent" | "error";

const ResearchProgramme = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    // Mapped onto the fields /api/enquiry already expects, so the Contact page's email route is reused unchanged
    const description = [
      `Research area: ${data.area}`,
      `Position: ${data.position}`,
      "",
      "Research idea:",
      data.topic,
      "",
      "Aims:",
      data.aims || "—",
      "",
      "Objectives:",
      data.objectives || "—",
      "",
      `Data situation: ${data.dataSituation || "—"}`,
      `Target journal: ${data.journal || "—"}`,
      `How they heard of us: ${data.heard || "—"}`,
    ].join("\n");

    const payload = {
      botcheck: data.botcheck,
      enquiryType: programmeName,
      name: data.name,
      organization: data.institution,
      email: data.email,
      country: data.country,
      title: data.topic.slice(0, 120),
      service: "Research-to-Publication Programme",
      engagement: "Pay on completion",
      timeline: data.timeline,
      budget: "",
      description,
      deliverables: "",
      additional: data.phone ? `Phone / WhatsApp: ${data.phone}` : "",
    };

    if (enquiryEndpoint) {
      setStatus("sending");
      try {
        const res = await fetch(enquiryEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus("sent");
        form.reset();
        return;
      } catch {
        // Email is not configured or failed: open the visitor's email app instead
      }
    }

    if (contact.email) {
      const body = [`Name: ${payload.name}`, `Institution: ${payload.organization}`, `Email: ${payload.email}`, `Country: ${payload.country}`, `Timeline: ${payload.timeline || "—"}`, payload.additional, "", payload.description]
        .filter((l) => l !== undefined)
        .join("\n");
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(`${programmeName}: ${payload.title}`)}&body=${encodeURIComponent(body)}`;
      setStatus("sent");
      return;
    }

    setStatus("error");
    setMessage("Online submissions are not connected yet. Please check back soon.");
  };

  return (
    <>
      <header className="bg-paper px-4 pb-16 pt-32 sm:px-6 md:pb-24 md:pt-40 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <div style={{ animation: "word-in 0.6s ease both" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-white/80 px-4 py-1.5 text-sm text-plum">
              <span className="h-2 w-2 rounded-full bg-magenta" />
              Research-to-Publication Programme
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl font-journal text-[36px] leading-[1.08] tracking-tight text-plum sm:text-[44px] md:text-[64px]">
              From research idea to <em className="text-magenta-dark md:whitespace-nowrap">journal submission.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
              A guided programme for researchers. We design the study, run the analysis and prepare the manuscript with
              you. You lead the science, and you pay when the agreed work is delivered.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#apply"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-7 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark"
              >
                Submit your research idea <ArrowRight size={15} />
              </a>
              <a href="#how" className="px-4 py-3 text-sm font-medium text-plum transition-colors hover:text-magenta-dark">
                See the six steps
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-ink">
              {proofPoints.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check size={15} className="text-magenta-dark" strokeWidth={3} />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-14 md:mt-16">
            <div
              className="absolute -top-5 right-8 z-20 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-xl shadow-black/15 lg:flex"
              style={{ animation: "float-y 6s ease-in-out infinite" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-plum">
                <Check size={16} strokeWidth={3} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-plum">Manuscript approved</span>
                <span className="block text-xs text-muted">You stay the lead researcher</span>
              </span>
            </div>
            <div
              className="absolute -bottom-5 left-8 z-20 hidden rounded-2xl bg-lime px-5 py-3 text-left shadow-xl shadow-black/15 lg:block"
              style={{ animation: "float-y 7s ease-in-out infinite", animationDelay: "-2s" }}
            >
              <span className="font-journal text-lg italic text-plum">The moment your work reaches readers.</span>
            </div>

            <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-plum via-plum-soft to-magenta-dark px-4 py-10 md:rounded-[40px] md:px-12 md:py-16">
              <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-magenta/25 blur-3xl" />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                  backgroundSize: "56px 56px",
                }}
              />
              <div className="relative z-10 mx-auto max-w-4xl">
                <JournalMockup />
              </div>
              <p className="relative z-10 mt-6 text-center text-xs text-white/60">
                Illustration only. Whether a paper is accepted is decided by journals and peer reviewers.
              </p>
            </div>
          </div>
        </div>
      </header>

      <Band id="how" tone="white">
        <Reveal>
          <Heading
            eyebrow="How it works"
            title="Six steps from idea to submission"
            intro="Every researcher starts with a free feasibility review. At each step, you and GSC each have a clear part."
          />
        </Reveal>
        <div className="hidden gap-x-10 border-b border-ink/15 pb-3 text-xs font-bold uppercase tracking-widest text-muted md:grid md:grid-cols-[240px_1fr_1fr]">
          <span>Step</span>
          <span>What you do</span>
          <span>What GSC does</span>
        </div>
        {journey.map((s, i) => (
          <Reveal key={s.title} delay={i * 40}>
            <div className="grid gap-x-10 gap-y-3 border-b border-ink/10 py-6 md:grid-cols-[240px_1fr_1fr]">
              <div className="flex items-baseline gap-4">
                <span className="font-journal text-3xl text-magenta/60">0{i + 1}</span>
                <h3 className="font-journal text-xl text-plum">{s.title}</h3>
              </div>
              <p className="text-[15px] leading-relaxed text-ink">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-magenta-dark md:hidden">You</span>
                {s.you}
              </p>
              <p className="text-[15px] leading-relaxed text-ink">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-magenta-dark md:hidden">GSC</span>
                {s.we}
              </p>
            </div>
          </Reveal>
        ))}
      </Band>

      <Band>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <Reveal>
            <Heading eyebrow="What you get" title="Research support from idea to submission" />
            <CheckList items={included} />
          </Reveal>
          <Reveal delay={120}>
            <Heading eyebrow="What we do not do" title="Clear limits, so the work stays credible" />
            <ul className="grid gap-3">
              {excluded.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] text-ink leading-snug">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <X size={13} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 bg-magenta-tint rounded-2xl p-4 mt-6 text-sm text-plum leading-relaxed">
              <ShieldCheck size={20} className="shrink-0 text-magenta-dark mt-0.5" />
              <p>
                <strong>You stay the lead researcher.</strong> You shape the question, review the results, revise the
                manuscript and approve the final version. Authorship is agreed in writing at the start and follows each
                person's actual contribution. Where GSC staff contribute substantially, they are credited as authors or
                acknowledged. The NDA protects your ideas and data, not anyone's role.
              </p>
            </div>
          </Reveal>
        </div>
      </Band>

      <Band tone="white">
        <Reveal>
          <Heading
            eyebrow="Who it is for"
            title="Researchers with an idea who want technical and writing support"
          />
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">For</p>
              <div className="flex flex-wrap gap-2">
                {people.map((p) => (
                  <span key={p} className="rounded-full border border-plum/15 bg-paper px-4 py-2 text-sm text-plum">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">In fields such as</p>
              <div className="flex flex-wrap gap-2">
                {fields.map((f) => (
                  <span key={f} className="rounded-full border border-plum/15 bg-paper px-4 py-2 text-sm text-plum">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Band>

      <Band id="apply">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-200/80 p-6 md:p-10">
          <h2 className="mb-2 font-journal text-3xl text-plum">Submit your research idea</h2>
          <p className="text-muted text-[15px] mb-8">
            Tell us about your research idea. The feasibility review is free and carries no obligation.
          </p>

          {status === "sent" ? (
            <div className="text-center py-12">
              <CheckCircle2 size={44} className="mx-auto text-magenta mb-4" />
              <h3 className="text-plum font-semibold text-lg mb-2">Thank you for your research idea</h3>
              <p className="text-muted max-w-sm mx-auto">
                We will review it and respond within 3–5 working days.
              </p>
              <button onClick={() => setStatus("idle")} className="mt-6 text-magenta-dark font-medium text-sm hover:underline">
                Submit another idea
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Hidden spam trap: people never see it, bots fill it in */}
              <input name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Full name" required>
                  <input name="name" className={inputClass} required autoComplete="name" />
                </Field>
                <Field label="Email" required>
                  <input name="email" type="email" className={inputClass} required autoComplete="email" />
                </Field>
                <Field label="Institution" required>
                  <input name="institution" className={inputClass} required autoComplete="organization" />
                </Field>
                <Field label="Country" required>
                  <input name="country" className={inputClass} required autoComplete="country-name" />
                </Field>
                <Field label="Position" required>
                  <select name="position" defaultValue="" className={inputClass} required>
                    <option value="" disabled>Select…</option>
                    {["Lecturer", "Senior lecturer / Professor", "Postdoctoral researcher", "PhD / MSc supervisor", "Research group lead", "Other"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Research area" required>
                  <select name="area" defaultValue="" className={inputClass} required>
                    <option value="" disabled>Select…</option>
                    {["Genomics", "Bioinformatics / computational biology", "Antimicrobial resistance", "Medicinal plants", "Microbiology", "Biotechnology", "Public health", "Other"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Research topic or idea" required>
                <textarea name="topic" rows={4} className={inputClass} required />
              </Field>
              <Field label="Aims">
                <textarea name="aims" rows={3} className={inputClass} />
              </Field>
              <Field label="Objectives">
                <textarea name="objectives" rows={3} className={inputClass} />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Data situation">
                  <select name="dataSituation" defaultValue="" className={inputClass}>
                    <option value="">Select…</option>
                    <option>I have my own data</option>
                    <option>I need public data to be sourced</option>
                    <option>Not sure yet</option>
                  </select>
                </Field>
                <Field label="Target timeline">
                  <select name="timeline" defaultValue="" className={inputClass}>
                    <option value="">Select…</option>
                    <option>Within 3 months</option>
                    <option>3–6 months</option>
                    <option>6–12 months</option>
                    <option>Flexible</option>
                  </select>
                </Field>
                <Field label="Target journal or type of journal">
                  <input name="journal" className={inputClass} />
                </Field>
                <Field label="Phone / WhatsApp">
                  <input name="phone" className={inputClass} autoComplete="tel" />
                </Field>
              </div>
              <Field label="How did you hear about us?">
                <input name="heard" className={inputClass} />
              </Field>

              <label className="flex gap-3 items-start text-sm text-muted">
                <input type="checkbox" name="understand" required className="mt-1" />
                <span>
                  I understand this is a paid service, that I would remain the lead researcher and responsible for the
                  work, that authorship follows actual contribution, and that publication is not guaranteed. *
                </span>
              </label>
              <label className="flex gap-3 items-start text-sm text-muted">
                <input type="checkbox" name="consent" required className="mt-1" />
                <span>I agree that GSC may contact me about this submission. *</span>
              </label>

              <div className="flex gap-3 bg-magenta-tint rounded-2xl p-4 text-sm text-plum leading-relaxed">
                <ShieldCheck size={20} className="shrink-0 text-magenta-dark mt-0.5" />
                <p>
                  Please describe your idea at a high level. Do not submit confidential datasets, personal health
                  information or sensitive intellectual property through this form. We will agree an NDA and a secure
                  way to share materials before receiving them.
                </p>
              </div>

              {status === "error" && <p className="text-sm text-red-600">{message}</p>}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full sm:w-auto bg-magenta hover:bg-magenta-dark disabled:opacity-60 text-white px-8 py-3.5 rounded-full text-sm font-medium transition-colors shadow-md shadow-magenta/20"
              >
                {status === "sending" ? "Sending…" : "Submit for feasibility review"}
              </button>
            </form>
          )}
        </div>
      </Band>

      <Band tone="white">
        <Reveal>
          <Heading eyebrow="Questions" title="Before you apply" />
        </Reveal>
        <div className="max-w-3xl">
          {faqs.map((f) => (
            <details key={f.q} className="border-b border-gray-200 py-4 group">
              <summary className="cursor-pointer font-journal text-lg text-plum">{f.q}</summary>
              <p className="mt-2 text-muted text-[15px] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Band>
    </>
  );
};

export default ResearchProgramme;
