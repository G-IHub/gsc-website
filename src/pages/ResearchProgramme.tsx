import { useState, type FormEvent, type ReactNode } from "react";
import { ShieldCheck, CheckCircle2, X } from "lucide-react";
import { Card, CheckList, PageHero, Section, SectionHeading } from "../components/ui";
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

const steps = [
  { title: "Research Clinic", text: "Share your area of interest, aims and objectives. We review feasibility and reply within 3–5 working days." },
  { title: "Proposal & agreement", text: "You receive the scope, price, authorship plan and NDA before any work begins." },
  { title: "Research & analysis", text: "We expand your idea into a protocol, gather data and run reproducible analysis. You review and interpret the results." },
  { title: "Manuscript", text: "We prepare a draft from the agreed results. You revise it, approve it and remain accountable for it as lead researcher." },
  { title: "Submission & review", text: "Journal selection, formatting, submission and support with reviewers' comments." },
  { title: "Payment at the end", text: "No upfront or stage payments. Payment falls due when the agreed work is delivered, not when a journal accepts it." },
];

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
      <PageHero
        eyebrow="Genomac Research-to-Publication Programme"
        title="Your question. Our analysis. Your publication."
        intro={
          <p>
            Bring a research idea to the GSC Research Clinic. We help you design the study, gather data, run the
            analysis and prepare the manuscript. You lead the science, and you pay when the work is done.
          </p>
        }
      >
        <a href="#apply" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-magenta hover:bg-magenta-dark text-white shadow-md shadow-magenta/20 transition-colors">
          Submit your research idea
        </a>
        <a href="#how" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-white/10 border border-white/25 hover:bg-white/20 text-white transition-colors">
          See how it works
        </a>
      </PageHero>

      <Section id="how">
        <Reveal>
          <SectionHeading
            eyebrow="How the programme works"
            title="One programme, six steps"
            intro={<p>The Research Clinic is the way in. Every researcher starts there, and it leads into the full programme.</p>}
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <Card title={s.title} index={`0${i + 1}`}>
                {s.text}
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="mist">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <Reveal>
            <SectionHeading eyebrow="What you get" title="Research support from idea to submission" />
            <CheckList items={included} />
          </Reveal>
          <Reveal delay={120}>
            <SectionHeading eyebrow="What we do not do" title="Clear limits, so the work stays credible" />
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
      </Section>

      <Section>
        <Reveal>
          <SectionHeading
            eyebrow="Who it is for"
            title="Researchers with an idea who want technical and writing support"
            intro={
              <p>
                Lecturers, postdoctoral researchers, research groups and postgraduate supervisors in genomics,
                bioinformatics, biotechnology, microbiology, antimicrobial resistance, medicinal plant research, public
                health and related fields.
              </p>
            }
          />
        </Reveal>
      </Section>

      <Section tone="mist" id="apply">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-200/80 p-6 md:p-10">
          <h2 className="text-xl md:text-2xl font-bold text-plum mb-2">Join the Research Clinic</h2>
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
      </Section>

      <Section>
        <Reveal>
          <SectionHeading eyebrow="Questions" title="Before you apply" />
        </Reveal>
        <div className="max-w-3xl">
          {faqs.map((f) => (
            <details key={f.q} className="border-b border-gray-200 py-4 group">
              <summary className="cursor-pointer font-semibold text-plum">{f.q}</summary>
              <p className="mt-2 text-muted text-[15px] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
};

export default ResearchProgramme;
