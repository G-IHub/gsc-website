import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
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

const areas = [
  "Bioinformatics and data analysis",
  "Genomics and sequencing projects",
  "Scientific writing and literature review",
  "Research project coordination",
  "Software and workflow development",
  "Not sure yet",
];

const levels = ["Undergraduate", "Recent graduate", "MSc student", "PhD student", "Early-career researcher", "Other"];
const availabilities = ["Remote, part-time", "Remote, full-time", "On site in Ogbomoso", "Flexible"];

const learn = [
  "Work on real research and project tasks alongside the GSC team",
  "Practise the methods used in our service areas, such as bioinformatics and genomics",
  "Learn how research projects are scoped, delivered and written up",
  "Get feedback on your work from the people who do it every day",
];

const steps = [
  { title: "Send your application", text: "Tell us about your studies, your interests and when you are available." },
  { title: "We review it", text: "We read every application and reply by email, usually within 3 to 5 working days." },
  { title: "A short conversation", text: "If there is a fit with current work, we talk to you about the placement and what is expected." },
  { title: "Start and learn", text: "You join the team on agreed tasks, with a named person to guide you." },
];

const faqs = [
  { q: "Who can apply?", a: "Students and early-career researchers with an interest in biology, genomics, data or research project work. If you are unsure whether you fit, apply and tell us about yourself." },
  { q: "How long is an internship?", a: "The length and hours are agreed with you for each placement, based on the work available and your availability." },
  { q: "Is it paid?", a: "Terms differ between placements and are agreed with you in writing before anything starts. We will tell you plainly what applies to your placement." },
  { q: "Can I do it remotely?", a: "Many tasks can be done remotely. Say what you prefer in the form, and we will tell you what is possible." },
  { q: "What if there is no opening right now?", a: "We keep applications on file and contact you when a placement matches your interests." },
];

type Status = "idle" | "sending" | "sent" | "error";

const Internship = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    const description = [
      `Level of study: ${data.level}`,
      `Area of interest: ${data.area}`,
      `Availability: ${data.availability}`,
      `Preferred period: ${data.period || "—"}`,
      `CV or profile link: ${data.link || "—"}`,
      "",
      "Skills and experience:",
      data.skills || "—",
      "",
      "Why you want to intern with GSC:",
      data.motivation,
    ].join("\n");

    const payload = {
      botcheck: data.botcheck,
      enquiryType: "Internship application",
      name: data.name,
      organization: data.institution,
      email: data.email,
      country: data.country,
      title: `Internship application: ${data.area}`,
      service: "Internship Programme",
      engagement: "",
      timeline: data.period || "",
      budget: "",
      description,
      deliverables: "",
      additional: `Phone / WhatsApp: ${data.phone}`,
    };

    if (enquiryEndpoint) {
      setStatus("sending");
      try {
        const res = await fetch(enquiryEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setStatus("sent");
          form.reset();
          return;
        }
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
    setMessage("Online applications are not connected yet. Please check back soon.");
  };

  return (
    <>
      <header className="bg-paper px-4 pb-16 pt-32 sm:px-6 md:pb-24 md:pt-40 lg:px-8">
        <div className="mx-auto max-w-6xl text-center" style={{ animation: "word-in 0.6s ease both" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-white/80 px-4 py-1.5 text-sm text-plum">
            <span className="h-2 w-2 rounded-full bg-magenta" />
            Internship Programme
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl font-journal text-[36px] leading-[1.08] tracking-tight text-plum sm:text-[44px] md:text-[60px]">
            Learn research by <em className="text-magenta-dark">doing it with us.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Gain hands-on experience alongside the GSC team, on real research and project work in genomics, bioinformatics and
            scientific delivery.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#apply"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-7 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark"
            >
              Apply for an internship <ArrowRight size={15} />
            </a>
          </div>
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2">
            {areas.slice(0, 5).map((a) => (
              <span key={a} className="rounded-full border border-plum/15 bg-white px-4 py-2 text-sm text-plum">
                {a}
              </span>
            ))}
          </div>
        </div>
      </header>

      <Band tone="white">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <Heading eyebrow="What you will gain" title="Practical experience that counts" />
            <CheckList items={learn} />
          </Reveal>
          <Reveal delay={120}>
            <Heading eyebrow="Who it is for" title="Curious people who want to learn the work" />
            <p className="text-[15px] leading-relaxed text-muted">
              We welcome students and early-career researchers who are interested in biology, data or research project work. You do not need to
              know everything already. Reliability, curiosity and a willingness to learn matter most.
            </p>
          </Reveal>
        </div>
      </Band>

      <Band>
        <Reveal>
          <Heading eyebrow="How it works" title="From application to your first task" />
        </Reveal>
        <StepTimeline steps={steps} />
      </Band>

      <Band tone="white" id="apply">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Heading
              eyebrow="Apply"
              title="Tell us about yourself"
              intro="Applications are free. We reply by email, usually within 3 to 5 working days."
              center
            />
          </Reveal>

          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 md:p-10">
            {status === "sent" ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={44} className="mx-auto mb-4 text-magenta" />
                <h3 className="mb-2 font-journal text-2xl text-plum">Application received</h3>
                <p className="mx-auto max-w-sm text-muted">Thank you for applying. We will read your application and reply by email, usually within 3 to 5 working days.</p>
                <button onClick={() => setStatus("idle")} className="mt-6 text-sm font-medium text-magenta-dark hover:underline">
                  Send another application
                </button>
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
                  <Field label="WhatsApp phone number" required>
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      pattern="[+\(\)0-9\s\-]{7,}"
                      title="Enter your number with the country code, for example +234 800 000 0000"
                      placeholder="+234 800 000 0000"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Country" required>
                    <input name="country" className={inputClass} required autoComplete="country-name" />
                  </Field>
                  <Field label="University or institution" required>
                    <input name="institution" className={inputClass} required autoComplete="organization" />
                  </Field>
                  <Field label="Level of study" required>
                    <select name="level" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {levels.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Area you are most interested in" required>
                    <select name="area" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {areas.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Availability" required>
                    <select name="availability" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {availabilities.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Preferred period">
                    <input name="period" className={inputClass} placeholder="For example: January to March" />
                  </Field>
                  <Field label="Link to your CV or profile">
                    <input name="link" type="url" className={inputClass} placeholder="https://" />
                  </Field>
                </div>

                <Field label="Skills and experience">
                  <textarea name="skills" rows={3} className={inputClass} placeholder="Courses, tools, languages, projects" />
                </Field>

                <Field label="Why do you want to intern with GSC?" required>
                  <textarea name="motivation" rows={4} required className={inputClass} />
                </Field>

                <label className="flex items-start gap-3 text-sm text-muted">
                  <input type="checkbox" name="consent" required className="mt-1" />
                  <span>I agree that GSC may contact me about this application. *</span>
                </label>

                {status === "error" && <p className="text-sm text-red-600">{message}</p>}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-full bg-magenta px-8 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark disabled:opacity-60 sm:w-auto"
                >
                  {status === "sending" ? "Sending…" : "Send my application"}
                </button>
              </form>
            )}
          </div>
        </div>
      </Band>

      <Band>
        <Reveal>
          <Heading eyebrow="Questions" title="Before you apply" center />
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

export default Internship;
