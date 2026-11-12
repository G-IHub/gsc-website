import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Dna, FlaskConical, Layers, Microscope, ShieldCheck, Sprout } from "lucide-react";
import { Band, Heading, StepTimeline } from "../components/journal";
import { Reveal } from "../components/motion";
import { SequencingRun } from "../components/SequencingAnimations";
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

// What can be requested. `short` is the name that appears in the admin; keep it brief.
const offers = [
  {
    key: "targeted",
    icon: Layers,
    short: "Target-based sequencing",
    title: "Target-based sequencing",
    text: "Sequence chosen genes or regions, such as 16S and ITS amplicons for microbial communities or specific genes and panels.",
  },
  {
    key: "wgs",
    icon: Dna,
    short: "Whole genome sequencing",
    title: "Whole genome sequencing",
    text: "Read the full genome of a bacterium, fungus, plant or other organism, for assembly, variant calling or resistance and virulence profiling.",
  },
  {
    key: "metagenomics",
    icon: Sprout,
    short: "Shotgun metagenomics",
    title: "Shotgun metagenomics",
    text: "Sequence all the DNA in a soil, water, gut or other mixed sample to see which organisms and genes are present.",
  },
  {
    key: "rnaseq",
    icon: Microscope,
    short: "RNA sequencing",
    title: "RNA sequencing (transcriptomics)",
    text: "Measure which genes are active, to compare treatments, tissues or conditions.",
  },
  {
    key: "sanger",
    icon: FlaskConical,
    short: "Sanger sequencing",
    title: "Sanger sequencing",
    text: "Read single genes or PCR products, or confirm a sequence you already have.",
  },
  {
    key: "other",
    icon: ShieldCheck,
    short: "Other / advice needed",
    title: "Something else, or not sure yet",
    text: "Tell us your research question and we will recommend the right approach before you commit to anything.",
  },
];

const sampleTypes = ["Soil or sediment", "Water", "Clinical or human sample", "Animal tissue or blood", "Plant material", "Microbial isolate or culture", "Extracted DNA or RNA", "Other"];
const analysisOptions = ["Raw data only", "Standard analysis and summary", "Full analysis and report", "Not sure, please advise"];

const steps = [
  { title: "Send your request", text: "Choose the sequencing you need, tell us about your samples and what you want to learn." },
  { title: "We review and advise", text: "We check that the approach fits your aims and confirm the details, such as sample requirements and timelines." },
  { title: "Receive your pro-forma", text: "You get a clear pro-forma invoice with the price. Work begins once you confirm." },
  { title: "Samples, sequencing, data", text: "You send your samples. They are sequenced with our partner laboratory, and we deliver the data and any analysis you asked for." },
];

const faqs = [
  { q: "Does GSC run the sequencers itself?", a: "We manage sequencing together with our partner laboratory and handle the planning, communication, quality checks and analysis for you. You deal with one team from the first question to the final results." },
  { q: "How much does it cost?", a: "The price depends on the type of sequencing, the number of samples and the sample quality, so we quote for each request. Send the form and we will reply with a pro-forma invoice." },
  { q: "Do you also analyse the data?", a: "Yes. Sequencing gives you raw data. Our bioinformatics service can turn it into results you can use in a paper or a report. Tell us what you need in the form." },
  { q: "Can you help me prepare my samples?", a: "Yes. We can advise on sample collection, storage and shipping, and arrange DNA extraction and quality checks where needed." },
  { q: "Do I need to pay before you start?", a: "We confirm the details and send a pro-forma invoice first. Payment terms are agreed before any work begins." },
];

type Status = "idle" | "sending" | "sent" | "error";

const Sequencing = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [chosen, setChosen] = useState<Record<string, string>>({}); // service key -> number of samples

  const toggle = (key: string) =>
    setChosen((c) => {
      const next = { ...c };
      if (key in next) delete next[key];
      else next[key] = "1";
      return next;
    });

  const pick = (key: string) => {
    toggle(key);
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    const items = offers
      .filter((o) => o.key in chosen)
      .map((o) => ({ key: o.key, name: o.short, qty: Math.max(Math.round(Number(chosen[o.key])) || 1, 1) }));
    if (!items.length) {
      setStatus("error");
      setMessage("Please choose at least one sequencing service.");
      return;
    }

    const totalSamples = items.reduce((n, i) => n + i.qty, 0);
    const description = [
      "Services and number of samples:",
      ...items.map((i) => `- ${i.name}: ${i.qty}`),
      "",
      `Sample type: ${data.sampleType}`,
      `Organism or source: ${data.organism || "—"}`,
      `DNA/RNA already extracted: ${data.extracted}`,
      `Analysis needed: ${data.analysis}`,
      "",
      "Aims and objectives:",
      data.aims,
    ].join("\n");

    const payload = {
      botcheck: data.botcheck,
      enquiryType: "Sequencing request",
      name: data.name,
      organization: data.institution,
      email: data.email,
      country: data.country,
      title: `Sequencing request: ${items.map((i) => i.name).join(", ")} (${totalSamples} sample${totalSamples === 1 ? "" : "s"})`.slice(0, 200),
      service: items.map((i) => i.name).join(", ").slice(0, 200),
      engagement: "",
      timeline: "",
      budget: "",
      description,
      deliverables: data.analysis,
      additional: `Phone / WhatsApp: ${data.phone}`,
      sequencing: { items, sampleType: data.sampleType, organism: data.organism, extracted: data.extracted, analysis: data.analysis },
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
          setChosen({});
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
    setMessage("Online requests are not connected yet. Please check back soon.");
  };

  return (
    <>
      <header className="bg-paper px-4 pb-16 pt-32 sm:px-6 md:pb-20 md:pt-40 lg:px-8">
        <div className="mx-auto max-w-6xl text-center" style={{ animation: "word-in 0.6s ease both" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-plum/15 bg-white/80 px-4 py-1.5 text-sm text-plum">
            <span className="h-2 w-2 rounded-full bg-magenta" />
            Sequencing services
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl font-journal text-[36px] leading-[1.08] tracking-tight text-plum sm:text-[44px] md:text-[60px]">
            Sequencing, planned and <em className="text-magenta-dark">analysed with you.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Target-based, whole genome and other sequencing, handled from your first question to your results. Tell us what
            you want to find out and we will recommend the right approach.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#request"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-7 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark"
            >
              Request a quote <ArrowRight size={15} />
            </a>
            <a href="#what" className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-7 py-3.5 text-sm font-medium text-plum transition-colors hover:border-gray-300">
              See what we offer
            </a>
          </div>

          <div className="relative mt-14 md:mt-16">
            <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-plum via-plum-soft to-magenta-dark px-4 py-8 md:rounded-[40px] md:px-12 md:py-12">
              <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-magenta/25 blur-3xl" />
              <div className="relative z-10">
                <SequencingRun />
              </div>
              <p className="relative z-10 mt-6 text-center text-xs text-white/60">
                Illustration of a sequencing run. The numbers and signals are examples, not real data.
              </p>
            </div>
          </div>
        </div>
      </header>

      <Band tone="white" id="what">
        <Reveal>
          <Heading eyebrow="What we offer" title="Choose the sequencing that fits your question" />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o, i) => {
            const Icon = o.icon;
            return (
              <Reveal key={o.key} delay={i * 80}>
                <article className="flex h-full flex-col rounded-3xl border border-gray-200/80 bg-white p-6 transition-all hover:border-magenta/30 hover:shadow-xl hover:shadow-plum/5 md:p-8">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-lime">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 font-journal text-xl text-plum">{o.title}</h3>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{o.text}</p>
                  <button type="button" onClick={() => pick(o.key)} className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-medium text-magenta-dark hover:underline">
                    {o.key in chosen ? "Added to your request" : "Add to my request"} <ArrowRight size={14} />
                  </button>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Band>

      <Band>
        <Reveal>
          <Heading eyebrow="How it works" title="From request to results" />
        </Reveal>
        <StepTimeline steps={steps} />
      </Band>

      <Band tone="white" id="request">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <Heading
              eyebrow="Request a quote"
              title="Tell us about your project"
              intro="There is no cost to ask. We reply with a pro-forma invoice, usually within 3 to 5 working days."
              center
            />
          </Reveal>

          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 md:p-10">
            {status === "sent" ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={44} className="mx-auto mb-4 text-magenta" />
                <h3 className="mb-2 font-journal text-2xl text-plum">Request received</h3>
                <p className="mx-auto max-w-sm text-muted">Thank you. We will review your request and reply with a pro-forma invoice, usually within 3 to 5 working days.</p>
                <button onClick={() => setStatus("idle")} className="mt-6 text-sm font-medium text-magenta-dark hover:underline">
                  Send another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Hidden spam trap: people never see it, bots fill it in */}
                <input name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

                <fieldset>
                  <legend className="mb-3 text-sm font-medium text-plum">
                    What do you need? Tick each service and enter the number of samples <span className="text-magenta-dark">*</span>
                  </legend>
                  <div className="space-y-2">
                    {offers.map((o) => {
                      const on = o.key in chosen;
                      return (
                        <div key={o.key} className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${on ? "border-magenta/40 bg-magenta-tint/50" : "border-gray-200"}`}>
                          <label className="flex min-w-48 flex-1 items-center gap-3 text-[15px] text-ink">
                            <input type="checkbox" checked={on} onChange={() => toggle(o.key)} />
                            {o.title}
                          </label>
                          {on && (
                            <label className="flex items-center gap-2 text-sm text-muted">
                              Samples
                              <input
                                type="number"
                                min={1}
                                max={100000}
                                required
                                aria-label={`Number of samples for ${o.title}`}
                                value={chosen[o.key]}
                                onChange={(e) => setChosen({ ...chosen, [o.key]: e.target.value })}
                                className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[15px] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/15"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Sample type" required>
                    <select name="sampleType" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {sampleTypes.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Organism or source">
                    <input name="organism" className={inputClass} placeholder="For example: Escherichia coli, cassava, farm soil" />
                  </Field>
                  <Field label="Is the DNA or RNA already extracted?" required>
                    <select name="extracted" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {["Yes", "No, I need extraction", "Not sure"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Analysis you need" required>
                    <select name="analysis" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {analysisOptions.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Aims and objectives" required>
                  <textarea name="aims" rows={4} required className={inputClass} placeholder="What do you want to find out, and what will you use the results for?" />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" required>
                    <input name="name" className={inputClass} required autoComplete="name" />
                  </Field>
                  <Field label="Email" required>
                    <input name="email" type="email" className={inputClass} required autoComplete="email" />
                  </Field>
                  <Field label="Institution or company" required>
                    <input name="institution" className={inputClass} required autoComplete="organization" />
                  </Field>
                  <Field label="Country" required>
                    <input name="country" className={inputClass} required autoComplete="country-name" />
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
                </div>

                <label className="flex items-start gap-3 text-sm text-muted">
                  <input type="checkbox" name="consent" required className="mt-1" />
                  <span>I agree that GSC may contact me about this request. *</span>
                </label>

                {status === "error" && <p className="text-sm text-red-600">{message}</p>}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full rounded-full bg-magenta px-8 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark disabled:opacity-60 sm:w-auto"
                >
                  {status === "sending" ? "Sending…" : "Send my request"}
                </button>
              </form>
            )}
          </div>
        </div>
      </Band>

      <Band>
        <Reveal>
          <Heading eyebrow="Questions" title="Before you send a request" center />
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

export default Sequencing;
