import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bug, CheckCircle2, Dna, GitBranch, Layers, ShieldCheck, Sprout } from "lucide-react";
import { Band, Heading, StepTimeline } from "../components/journal";
import { Reveal } from "../components/motion";
import { AnalysisRun } from "../components/BioinformaticsAnimations";
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
    key: "assembly",
    icon: Dna,
    short: "Genome assembly and annotation",
    title: "Genome assembly and annotation",
    text: "Build a genome from your reads and annotate its genes, so you know what the organism carries and how it compares with others.",
  },
  {
    key: "variants",
    icon: Layers,
    short: "Variant calling and comparative genomics",
    title: "Variant calling and comparative genomics",
    text: "Find the differences between strains, isolates or individuals, and compare them across a collection of genomes.",
  },
  {
    key: "rnaseq",
    icon: Sprout,
    short: "RNA-seq and transcriptomics analysis",
    title: "RNA-seq and transcriptomics analysis",
    text: "Quantify gene activity and test which genes change between conditions, with clear tables and figures.",
  },
  {
    key: "metagenomics",
    icon: Bug,
    short: "Metagenomics and 16S community analysis",
    title: "Metagenomics and 16S community analysis",
    text: "Work out which organisms and genes are in a mixed sample, and how communities differ between sites or treatments.",
  },
  {
    key: "phylogenetics",
    icon: GitBranch,
    short: "Phylogenetics and sequence alignment",
    title: "Phylogenetics and sequence alignment",
    text: "Align sequences and build trees to show how organisms, genes or outbreaks are related.",
  },
  {
    key: "amr",
    icon: ShieldCheck,
    short: "AMR and virulence gene analysis",
    title: "AMR and virulence gene analysis",
    text: "Screen genomes for antimicrobial resistance and virulence genes, and report what they mean for your isolates.",
  },
];

const allOptions = [...offers, { key: "other", short: "Other / advice needed", title: "Something else, or not sure yet" }];

const dataStatuses = ["I already have the data", "I plan to use public data", "I still need the sequencing done"];
const dataTypes = ["Raw sequencing reads (FASTQ)", "Assembled genomes or contigs", "Count tables or processed data", "Public database accessions", "Not sure"];
const dataSizes = ["Under 10 GB", "10 to 100 GB", "Over 100 GB", "Not sure"];
const deliverables = ["Results tables and figures", "Full report with methods for a manuscript", "Reproducible pipeline and scripts", "Not sure, please advise"];

const steps = [
  { title: "Send your request", text: "Choose the analyses you need and tell us about your data and your research question." },
  { title: "We review your data plan", text: "We check that the data and approach fit your aims, and tell you if anything should change before you pay." },
  { title: "Receive your pro-forma", text: "You get a clear pro-forma invoice with the price. Work begins once you confirm." },
  { title: "Analysis and delivery", text: "We run the analysis in a documented, reproducible pipeline and deliver results you can use, with methods you can cite." },
];

const faqs = [
  { q: "Do I need to have the data already?", a: "No. If you still need sequencing, we can arrange it with our partner laboratory and run the analysis on the results. Tell us in the form and we will quote both together." },
  { q: "Can you analyse public data?", a: "Yes. We can analyse datasets from public databases for your study, as long as your use of the data follows its terms." },
  { q: "How much does it cost?", a: "The price depends on the analysis, the number of samples and the size of the data, so we quote for each request. Send the form and we reply with a pro-forma invoice." },
  { q: "What will I receive?", a: "Results tables and figures at the least. If you ask for it, we also write the methods and results text for your manuscript, and share the scripts so the analysis can be repeated." },
  { q: "Is my data kept private?", a: "Your data stays yours. Tell us if it is sensitive, and we will agree how it is handled before you send it." },
];

type Status = "idle" | "sending" | "sent" | "error";

const Bioinformatics = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [chosen, setChosen] = useState<Record<string, string>>({}); // analysis key -> number of samples or datasets

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

    const items = allOptions
      .filter((o) => o.key in chosen)
      .map((o) => ({ key: o.key, name: o.short, qty: Math.max(Math.round(Number(chosen[o.key])) || 1, 1) }));
    if (!items.length) {
      setStatus("error");
      setMessage("Please choose at least one analysis.");
      return;
    }

    const description = [
      "Analyses and number of samples or datasets:",
      ...items.map((i) => `- ${i.name}: ${i.qty}`),
      "",
      `Data status: ${data.dataStatus}`,
      `Data type: ${data.dataType}`,
      `Approximate data size: ${data.dataSize}`,
      `Organism or study system: ${data.organism || "—"}`,
      `Result wanted: ${data.deliverable}`,
      `Deadline: ${data.deadline || "—"}`,
      "",
      "Aims and objectives:",
      data.aims,
    ].join("\n");

    const payload = {
      botcheck: data.botcheck,
      enquiryType: "Bioinformatics request",
      name: data.name,
      organization: data.institution,
      email: data.email,
      country: data.country,
      title: `Bioinformatics request: ${items.map((i) => i.name).join(", ")}`.slice(0, 200),
      service: items.map((i) => i.name).join(", ").slice(0, 200),
      engagement: "",
      timeline: data.deadline || "",
      budget: "",
      description,
      deliverables: data.deliverable,
      additional: `Phone / WhatsApp: ${data.phone}`,
      bioinformatics: {
        items,
        dataType: data.dataType,
        dataStatus: data.dataStatus,
        organism: data.organism,
        dataSize: data.dataSize,
        deliverable: data.deliverable,
        deadline: data.deadline,
      },
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
            Bioinformatics services
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl font-journal text-[36px] leading-[1.08] tracking-tight text-plum sm:text-[44px] md:text-[60px]">
            From raw data to <em className="text-magenta-dark">results you can publish.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            Genome, transcriptome, metagenome and phylogenetic analysis, run in documented pipelines and explained clearly.
            Send us your data and your question, and we will plan the analysis with you.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#request"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-7 py-3.5 text-sm font-medium text-white shadow-md shadow-magenta/20 transition-colors hover:bg-magenta-dark"
            >
              Request an analysis quote <ArrowRight size={15} />
            </a>
            <a href="#what" className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-7 py-3.5 text-sm font-medium text-plum transition-colors hover:border-gray-300">
              See what we analyse
            </a>
          </div>

          <div className="relative mt-14 md:mt-16">
            <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-plum via-plum-soft to-magenta-dark px-4 py-8 md:rounded-[40px] md:px-12 md:py-12">
              <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-magenta/25 blur-3xl" />
              <div className="relative z-10">
                <AnalysisRun />
              </div>
              <p className="relative z-10 mt-6 text-center text-xs text-white/60">
                Illustration of an analysis pipeline. The data shown are examples, not real results.
              </p>
            </div>
          </div>
        </div>
      </header>

      <Band tone="white" id="what">
        <Reveal>
          <Heading eyebrow="What we analyse" title="Choose the analysis that fits your question" />
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
        <p className="mt-8 text-sm text-muted">
          Need the sequencing done first? See our{" "}
          <Link to="/sequencing" className="font-medium text-magenta-dark underline underline-offset-2">
            sequencing services
          </Link>
          , or tick the option in the form below and we will quote both together.
        </p>
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
              title="Tell us about your data and your question"
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
                    What do you need? Tick each analysis and enter the number of samples or datasets <span className="text-magenta-dark">*</span>
                  </legend>
                  <div className="space-y-2">
                    {allOptions.map((o) => {
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
                  <Field label="Where is your data?" required>
                    <select name="dataStatus" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {dataStatuses.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Type of data" required>
                    <select name="dataType" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {dataTypes.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Approximate size of the data" required>
                    <select name="dataSize" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {dataSizes.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Organism or study system">
                    <input name="organism" className={inputClass} placeholder="For example: Klebsiella pneumoniae, cassava, gut microbiome" />
                  </Field>
                  <Field label="What do you want to receive?" required>
                    <select name="deliverable" defaultValue="" className={inputClass} required>
                      <option value="" disabled>Select…</option>
                      {deliverables.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Deadline">
                    <input name="deadline" className={inputClass} placeholder="For example: end of January, or none" />
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

                <p className="text-xs text-muted">Please do not send the data itself through this form. We will tell you how to share it once we have agreed the work.</p>

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

export default Bioinformatics;
