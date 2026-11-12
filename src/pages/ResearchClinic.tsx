import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Band, Heading, StepTimeline } from "../components/journal";
import { CheckList } from "../components/ui";
import { Reveal } from "../components/motion";
import { contact, enquiryEndpoint } from "../data/site";

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

// Registrants are sent here once they have registered
const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/IP29hDnYYYWEkK0077R1V0?s=cl&p=a&iam=2";

// Fill these in once the date and format are confirmed
const eventDetails = [
  { label: "Cost", value: "Free" },
  { label: "Length", value: "One day" },
  { label: "Date", value: "To be announced" },
  { label: "Format", value: "To be confirmed" },
];

const sessions = [
  { title: "Shape a publishable question", text: "Turn a research interest into a new question that public data can answer." },
  { title: "Find the right public data", text: "Search open repositories and judge which datasets suit your question." },
  { title: "Use data responsibly", text: "Check licences and consent, and credit the people who generated the data." },
  { title: "Plan a reproducible analysis", text: "Design a workflow that others can repeat, check and trust." },
  { title: "Idea clinics", text: "Get small-group feedback from the team on your own idea." },
  { title: "Next steps", text: "Find a journal that fits, and hear about guided support if you want it." },
];

const leaveWith = [
  "A sharper, more publishable research question",
  "A shortlist of public datasets to explore",
  "A licence and ethics checklist for using open data",
  "Feedback on your idea from the team",
  "An optional free feasibility review afterwards",
];

const people = ["Lecturers", "MSc researchers", "PhD researchers", "Postdoctoral researchers"];
const fields = ["Genomics", "Bioinformatics", "Antimicrobial resistance", "Plant and medicinal genomics", "Microbiology", "Public health genomics"];

const commitments = [
  { title: "Check the terms", text: "Read the licence and any consent limits before you use a dataset." },
  { title: "Credit the source", text: "Acknowledge and cite the people and groups who generated the data." },
  { title: "Respect the people behind it", text: "Never try to identify individuals, and think about the communities the data comes from." },
];

const faqs = [
  { q: "Is it really free?", a: "Yes. Attending the clinic costs nothing. The Research-to-Publication Lab is a separate paid service, and you are under no obligation to use it." },
  { q: "Do I need a lab or my own data?", a: "No. The clinic is about using public data that already exists, so you do not need a wet lab." },
  { q: "What should I bring?", a: "A research interest or a rough idea, and a laptop if you have one." },
  { q: "Will you do my analysis or write my paper?", a: "Not at the clinic. You will learn how, and get feedback on your idea. Guided help with analysis and writing is available separately through the Research-to-Publication Lab." },
  { q: "Can you guarantee I will publish?", a: "No. Journals and peer reviewers decide. The clinic helps you ask a stronger question and plan a sound study." },
  { q: "Is it online or in person?", a: "That will be announced with the date. Tell us your preference when you register." },
  { q: "Is my idea kept confidential?", a: "Please describe your idea at a high level. Do not send confidential data through the form." },
];

// A made-up public-data portal beside a study plan. Decorative only.
const ClinicMockup = () => (
  <div aria-hidden="true" className="select-none overflow-hidden rounded-2xl bg-white text-left shadow-2xl shadow-black/30 ring-1 ring-black/10">
    <div className="flex items-center gap-2 border-b border-black/5 bg-[#f1eef5] px-4 py-3">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] text-muted">data.example.org/search</span>
    </div>
    <div className="grid md:grid-cols-[1.5fr_1fr]">
      <div className="border-gray-200 p-5 md:border-r md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-magenta-dark">Public data portal</p>
        <div className="mt-3 rounded-full border border-gray-200 px-4 py-2 text-[13px] text-muted">antimicrobial resistance · hospital isolates</div>
        <ul className="mt-4 space-y-3">
          {[
            { title: "Bacterial isolates from hospital surveillance", tags: [["Open access", "open"], ["Licence checked", "open"]] },
            { title: "Soil microbiome from cultivated land", tags: [["Open access", "open"], ["Cite the source", "open"]] },
            { title: "Tumour sequencing cohort", tags: [["Controlled access", "locked"], ["Approval needed", "locked"]] },
          ].map((d) => (
            <li key={d.title} className="rounded-xl border border-gray-200 p-3">
              <p className="font-journal text-[17px] leading-snug text-ink">{d.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.tags.map(([t, kind]) => (
                  <span
                    key={t}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${kind === "open" ? "bg-lime/40 text-plum" : "bg-amber-100 text-amber-800"}`}
                  >
                    {kind === "locked" && <Lock size={9} className="mr-1 inline" />}
                    {t}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-gray-200 bg-paper p-5 md:border-t-0 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-magenta-dark">Your study plan</p>
        <ul className="mt-3 space-y-2.5">
          {[
            ["A new question", true],
            ["Data and licence checked", true],
            ["Reproducible workflow", true],
            ["Journal fit", false],
          ].map(([t, done]) => (
            <li key={String(t)} className="flex items-center gap-2.5 text-[13px] text-ink">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-lime text-plum" : "border border-gray-300 text-transparent"}`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              {String(t)}
            </li>
          ))}
        </ul>
        <div className="mt-5 h-1.5 rounded-full bg-gray-200">
          <div className="h-full w-3/4 rounded-full bg-linear-to-r from-magenta to-lime" />
        </div>
        <p className="mt-2 text-[11px] text-muted">Three of four steps planned</p>
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">At the clinic</p>
          <p className="mt-2 text-[13px] leading-snug text-ink">Small-group feedback on your own idea.</p>
        </div>
      </div>
    </div>
  </div>
);

type Status = "idle" | "sending" | "sent" | "error";

const ResearchClinic = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    // Mapped onto the fields /api/enquiry already expects, so registrations appear in the admin page
    const description = [
      `Role: ${data.role}`,
      `Research area: ${data.area}`,
      `Used public data before: ${data.experience}`,
      `Preferred format: ${data.format}`,
      "",
      "Research idea or area:",
      data.idea || "—",
    ].join("\n");

    const payload = {
      botcheck: data.botcheck,
      enquiryType: "Research Clinic registration",
      name: data.name,
      organization: data.institution,
      email: data.email,
      country: data.country,
      title: `Clinic registration: ${data.area}`,
      service: "Research Clinic (free, one day)",
      engagement: "",
      timeline: "",
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
        // Show the confirmation for a moment, then take them to the WhatsApp group
        setRedirecting(true);
        window.setTimeout(() => window.location.assign(WHATSAPP_GROUP_URL), 1800);
        return;
      } catch {
        // The server could not save it: open the visitor's email app instead
      }
    }

    if (contact.email) {
      const body = [`Name: ${payload.name}`, `Institution: ${payload.organization}`, `Email: ${payload.email}`, `Country: ${payload.country}`, payload.additional, "", payload.description].join("\n");
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(body)}`;
      setStatus("sent");
      return;
    }

    setStatus("error");
    setMessage("Online registration is not connected yet. Please check back soon.");
  };

  return (
    <>
      <header className="bg-paper px-4 pb-16 pt-32 sm:px-6 md:pb-24 md:pt-40 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <div style={{ animation: "word-in 0.6s ease both" }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-white/80 px-4 py-1.5 text-sm text-plum">
              <span className="h-2 w-2 rounded-full bg-magenta" />
              Free Research Clinic
            </span>
            <h1 className="mx-auto mt-7 max-w-3xl font-journal text-[36px] leading-[1.08] tracking-tight text-plum sm:text-[44px] md:text-[64px]">
              From public data to <em className="text-magenta-dark md:whitespace-nowrap">faster publication.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
              A free one-day clinic for lecturers, MSc and PhD researchers. Learn to turn public genomics and
              bioinformatics data into a publishable study, with no wet lab needed.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">Open to all, and designed for researchers in resource-limited settings.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-7 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark"
              >
                Join the list for the next clinic <ArrowRight size={15} />
              </a>
            </div>
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
                <span className="block text-sm font-semibold text-plum">No wet lab needed</span>
                <span className="block text-xs text-muted">Open data, used responsibly</span>
              </span>
            </div>
            <div
              className="absolute -bottom-5 left-8 z-20 hidden rounded-2xl bg-lime px-5 py-3 text-left shadow-xl shadow-black/15 lg:block"
              style={{ animation: "float-y 7s ease-in-out infinite", animationDelay: "-2s" }}
            >
              <span className="font-journal text-lg italic text-plum">Good science does not need a big lab.</span>
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
                <ClinicMockup />
              </div>
              <p className="relative z-10 mt-6 text-center text-xs text-white/60">
                Illustration only. Dataset names are examples, not real records.
              </p>
            </div>
          </div>
        </div>
      </header>

      <Band tone="white" id="day">
        <Reveal>
          <Heading
            eyebrow="The day"
            title="Six sessions, one clear path"
            intro="A free one-day clinic on turning public genomics and bioinformatics data into a study you can publish."
          />
        </Reveal>
        <StepTimeline steps={sessions} />
      </Band>

      <Band>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Heading eyebrow="What you leave with" title="A plan you can act on" />
            <CheckList items={leaveWith} />
          </Reveal>
          <Reveal delay={120}>
            <Heading eyebrow="Who it is for" title="Researchers with an idea and no lab" />
            <div className="mb-6 flex flex-wrap gap-2">
              {people.map((p) => (
                <span key={p} className="rounded-full border border-plum/15 bg-white px-4 py-2 text-sm text-plum">
                  {p}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                <span key={f} className="rounded-full border border-plum/15 bg-white px-4 py-2 text-sm text-plum">
                  {f}
                </span>
              ))}
            </div>
            <p className="mt-6 text-[15px] leading-relaxed text-muted">
              Open to everyone. We have designed it for researchers in resource-limited settings, where funding for lab work is
              hard to find.
            </p>
          </Reveal>
        </div>
      </Band>

      <Band tone="white">
        <Reveal>
          <div className="rounded-[28px] bg-linear-to-br from-plum via-plum-soft to-magenta-dark p-8 text-white md:rounded-[40px] md:p-14">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-lime">Open data, used responsibly</p>
            <h2 className="max-w-2xl font-journal text-3xl leading-tight md:text-[40px]">Other people's data comes with responsibilities</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {commitments.map((c) => (
                <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="font-journal text-xl text-white">{c.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/75">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Band>

      <Band id="register">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Heading
              eyebrow="Register your interest"
              title="Join the list for the next clinic"
              intro="Registering is free and carries no obligation. Once you register, you are taken to our WhatsApp group, where we share the date and format as soon as they are confirmed."
              center
            />
          </Reveal>

          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {eventDetails.map((d) => (
              <div key={d.label} className="rounded-2xl border border-gray-200/80 bg-white p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{d.label}</p>
                <p className="mt-1 font-journal text-lg text-plum">{d.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-8 flex gap-3 rounded-2xl bg-magenta-tint p-4 text-sm leading-relaxed text-plum">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-magenta-dark" />
            <p>
              At the end of the day we briefly introduce the{" "}
              <Link to="/research-to-publication-lab" className="font-medium underline underline-offset-2">
                Research-to-Publication Lab
              </Link>
              , our paid, guided service. It is optional, and the clinic is useful whether or not you ever use it.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 md:p-10">
            {status === "sent" ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={44} className="mx-auto mb-4 text-magenta" />
                <h3 className="mb-2 font-journal text-2xl text-plum">You are on the list</h3>
                <p className="mx-auto max-w-sm text-muted">Join our WhatsApp group to hear the date and format first, and to ask questions before the clinic.</p>
                <a
                  href={WHATSAPP_GROUP_URL}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-7 py-3 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark"
                >
                  Join the WhatsApp group <ArrowRight size={15} />
                </a>
                {redirecting && <p className="mt-3 text-xs text-muted">Taking you there in a moment…</p>}
                <div>
                  <button onClick={() => { setStatus("idle"); setRedirecting(false); }} className="mt-5 text-sm font-medium text-magenta-dark hover:underline">
                    Register someone else
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Hidden spam trap: people never see it, bots fill it in */}
                <input name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

                <div className="grid gap-5 sm:grid-cols-2">
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
                  <Field label="Role" required>
                    <select name="role" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {["Lecturer", "MSc researcher", "PhD researcher", "Postdoctoral researcher", "Other researcher"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Research area" required>
                    <select name="area" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {["Genomics", "Bioinformatics / computational biology", "Antimicrobial resistance", "Plant or medicinal genomics", "Microbiology", "Public health genomics", "Other"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Have you used public data before?" required>
                    <select name="experience" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {["Not yet", "A little", "Regularly"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Preferred format" required>
                    <select name="format" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {["Online", "In person", "Either is fine"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Your research idea or area, in a sentence or two">
                  <textarea name="idea" rows={3} className={inputClass} />
                </Field>
                <Field label="Phone / WhatsApp">
                  <input name="phone" className={inputClass} autoComplete="tel" />
                </Field>

                <label className="flex items-start gap-3 text-sm text-muted">
                  <input type="checkbox" name="consent" required className="mt-1" />
                  <span>I agree that GSC may contact me about the Research Clinic. *</span>
                </label>

                {status === "error" && <p className="text-sm text-red-600">{message}</p>}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-full bg-magenta px-8 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark disabled:opacity-60 sm:w-auto"
                >
                  {status === "sending" ? "Sending…" : "Join the list"}
                </button>
              </form>
            )}
          </div>
        </div>
      </Band>

      <Band tone="white">
        <Reveal>
          <Heading eyebrow="Questions" title="Before you register" center />
        </Reveal>
        <div className="mx-auto max-w-3xl">
          {faqs.map((f) => (
            <details key={f.q} className="group border-b border-gray-200 py-4">
              <summary className="cursor-pointer font-journal text-lg text-plum">{f.q}</summary>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Band>
    </>
  );
};

export default ResearchClinic;
