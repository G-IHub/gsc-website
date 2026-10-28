import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, Mail, MapPin, Globe, Phone } from "lucide-react";
import { PageHero, Section } from "../components/ui";
import { contact, enquiryEndpoint, engagementModels, pathways, serviceTypes } from "../data/site";

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-gray-400 focus:outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/15 transition";

const Field = ({
  label,
  required = false,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="block text-sm font-medium text-plum mb-1.5">
      {label} {required ? <span className="text-magenta-dark">*</span> : <span className="text-muted font-normal">(optional)</span>}
    </span>
    {children}
    {hint && <span className="block text-xs text-muted mt-1.5">{hint}</span>}
  </label>
);

// Numbered divider that breaks the form into three short stages
const Stage = ({ n, title }: { n: number; title: string }) => (
  <div className={`flex items-center gap-3 ${n > 1 ? "pt-4" : ""}`}>
    <span className="w-8 h-8 shrink-0 rounded-full bg-plum text-lime text-sm font-semibold flex items-center justify-center">{n}</span>
    <span className="text-plum font-semibold">{title}</span>
    <span className="flex-1 h-px bg-gray-200" />
  </div>
);

type Status = "idle" | "sending" | "sent" | "error";

const Contact = () => {
  const [params] = useSearchParams();
  const initialType = pathways.some((p) => p.id === params.get("type")) ? params.get("type")! : "proposal";
  const initialService = serviceTypes.includes(params.get("service") ?? "") ? params.get("service")! : "";
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const enquiryType = pathways.find((p) => p.id === data.enquiryType)?.title ?? data.enquiryType;

    if (enquiryEndpoint) {
      setStatus("sending");
      try {
        const res = await fetch(enquiryEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...data, enquiryType }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus("sent");
        form.reset();
        return;
      } catch {
        // The server could not send it (for example, email is not configured yet): open the visitor's email app instead
      }
    }

    if (contact.email) {
      const body = [
        `Enquiry type: ${enquiryType}`,
        `Name: ${data.name}`,
        `Organization: ${data.organization}`,
        `Work email: ${data.email}`,
        `Country: ${data.country}`,
        `Project title: ${data.title}`,
        `Service required: ${data.service}`,
        `Engagement model: ${data.engagement || "—"}`,
        `Preferred timeline: ${data.timeline || "—"}`,
        `Estimated budget: ${data.budget || "—"}`,
        "",
        "Project description:",
        data.description,
        "",
        "Expected deliverables:",
        data.deliverables || "—",
        "",
        "Additional information:",
        data.additional || "—",
      ].join("\n");
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(
        `${enquiryType}: ${data.title}`,
      )}&body=${encodeURIComponent(body)}`;
      setStatus("sent");
      return;
    }

    setStatus("error");
    setMessage("Online enquiries are not connected yet. Please check back soon.");
  };

  return (
    <>
      <PageHero
        eyebrow="Contact & Request a Proposal"
        title="Discuss Your Research or Consulting Project"
        intro={
          <p>Tell us what you're working on, what you need to achieve, and where you need support.</p>
        }
      >
        {["Bioinformatics", "Consulting", "Project execution", "Scientific tools", "Partnerships"].map((t) => (
          <span key={t} className="text-xs text-white/80 border border-white/20 rounded-full px-3 py-1.5 w-fit">
            {t}
          </span>
        ))}
      </PageHero>

      <Section tone="mist">
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-10 items-start">
          {/* Enquiry form */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-10">
            <h2 className="text-xl md:text-2xl font-bold text-plum mb-2">Project Enquiry</h2>
            <p className="text-muted text-[15px] mb-8">
              After reviewing your enquiry, our team will determine whether the project aligns with GSC's
              capabilities and discuss appropriate next steps.
            </p>

            {status === "sent" ? (
              <div className="text-center py-12">
                <CheckCircle2 size={44} className="mx-auto text-magenta mb-4" />
                <h3 className="text-plum font-semibold text-lg mb-2">Thank you for your enquiry</h3>
                <p className="text-muted max-w-sm mx-auto">
                  Our team will review your requirements and get back to you about next steps.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-magenta-dark font-medium text-sm hover:underline"
                >
                  Submit another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Hidden spam trap: people never see it, bots fill it in */}
                <input name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                <Stage n={1} title="About you" />
                <Field label="Type of enquiry" required>
                  <select name="enquiryType" defaultValue={initialType} className={inputClass} required>
                    {pathways.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Full name" required>
                    <input name="name" className={inputClass} required autoComplete="name" />
                  </Field>
                  <Field label="Organization" required>
                    <input name="organization" className={inputClass} required autoComplete="organization" />
                  </Field>
                  <Field label="Work email" required>
                    <input name="email" type="email" className={inputClass} required autoComplete="email" />
                  </Field>
                  <Field label="Country" required>
                    <input name="country" className={inputClass} required autoComplete="country-name" />
                  </Field>
                </div>

                <Stage n={2} title="Your project" />
                <Field label="Project title" required>
                  <input name="title" className={inputClass} required />
                </Field>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Type of service required" required>
                    <select name="service" defaultValue={initialService} className={inputClass} required>
                      <option value="" disabled>
                        Select a service
                      </option>
                      {serviceTypes.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Preferred engagement model">
                    <select name="engagement" defaultValue="" className={inputClass}>
                      <option value="">Not sure yet</option>
                      {engagementModels.map((m) => (
                        <option key={m.title}>{m.title}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Brief project description" required>
                  <textarea name="description" rows={5} className={inputClass} required />
                </Field>
                <Field label="Expected deliverables">
                  <textarea name="deliverables" rows={3} className={inputClass} />
                </Field>

                <Stage n={3} title="Timeline & budget" />
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Preferred timeline">
                    <input name="timeline" className={inputClass} placeholder="e.g. Start in Q1, 3 months" />
                  </Field>
                  <Field label="Estimated budget">
                    <input name="budget" className={inputClass} placeholder="If available" />
                  </Field>
                </div>

                <Field label="Additional information">
                  <textarea name="additional" rows={3} className={inputClass} />
                </Field>

                <div className="flex gap-3 bg-magenta-tint rounded-2xl p-4 text-sm text-plum leading-relaxed">
                  <ShieldCheck size={20} className="shrink-0 text-magenta-dark mt-0.5" />
                  <p>
                    Please do not submit confidential research data, personal health information, unpublished
                    proprietary materials, or sensitive intellectual property through this form. We can discuss
                    appropriate confidentiality and secure transfer arrangements before receiving such materials.
                  </p>
                </div>

                {status === "error" && <p className="text-sm text-red-600">{message}</p>}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full sm:w-auto bg-magenta hover:bg-magenta-dark disabled:opacity-60 text-white px-8 py-3.5 rounded-full text-sm font-medium transition-colors shadow-md shadow-magenta/20"
                >
                  {status === "sending" ? "Sending…" : "Submit Project Enquiry"}
                </button>
              </form>
            )}
          </div>

          {/* General contact */}
          <aside className="space-y-5 lg:sticky lg:top-28">
            <div className="bg-plum rounded-3xl p-6 md:p-8 text-white">
              <h2 className="text-lg font-semibold mb-2">General Contact</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                For institutional partnerships, contract research, scientific consulting, and business enquiries.
              </p>
              <p className="font-semibold">{contact.company}</p>
              <p className="text-white/60 text-sm mb-5">{contact.parent}</p>
              <ul className="space-y-3 text-sm">
                {contact.email && (
                  <li className="flex gap-3">
                    <Mail size={17} className="text-lime shrink-0 mt-0.5" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                  </li>
                )}
                {contact.phone && (
                  <li className="flex gap-3">
                    <Phone size={17} className="text-lime shrink-0 mt-0.5" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phoneDisplay}</a>
                  </li>
                )}
                {contact.website && (
                  <li className="flex gap-3">
                    <Globe size={17} className="text-lime shrink-0 mt-0.5" />
                    <a href={contact.website} className="hover:underline">{contact.website.replace(/^https?:\/\//, "")}</a>
                  </li>
                )}
                {contact.address && (
                  <li className="flex gap-3">
                    <MapPin size={17} className="text-lime shrink-0 mt-0.5" />
                    <span>{contact.address}</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8">
              <h2 className="text-plum font-semibold mb-4">Ways to start</h2>
              <ul className="space-y-3">
                {pathways.map((p) => (
                  <li key={p.id}>
                    <p className="text-plum text-sm font-medium">{p.title}</p>
                    <p className="text-muted text-xs leading-relaxed">{p.text}</p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted px-2">
              We welcome serious enquiries from organizations seeking a scientific and technical partner.
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
};

export default Contact;
