import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Handshake, Lightbulb, Network, Repeat } from "lucide-react";

// "What do you need?" — maps the visitor's situation to an engagement model and enquiry type
const options = [
  {
    id: "proposal",
    icon: ClipboardCheck,
    need: "I have a defined project",
    model: "Contract Research",
    summary: "We undertake your agreed research scope and deliver defined outputs.",
    next: ["Share your brief", "Receive a scoped proposal", "Agree terms and start"],
    cta: "Request a proposal",
  },
  {
    id: "subcontracting",
    icon: Network,
    need: "I've won a contract and need capacity",
    model: "Subcontracted Research Services",
    summary: "We deliver agreed technical or scientific work packages within your project.",
    next: ["Outline the work package", "Confirm capacity and fit", "Sign a delivery agreement"],
    cta: "Discuss subcontracting",
  },
  {
    id: "consultation",
    icon: Lightbulb,
    need: "I need help defining the problem",
    model: "Scientific Consulting",
    summary: "Specialist input on research planning, methods and technical decisions.",
    next: ["Book a consultation", "Clarify the question", "Get a recommended approach"],
    cta: "Book a consultation",
  },
  {
    id: "partner",
    icon: Handshake,
    need: "I want to collaborate",
    model: "Project-Based Collaboration",
    summary: "Combine your expertise with GSC's capabilities on a shared initiative.",
    next: ["Introduce your organization", "Explore the opportunity", "Define roles and terms"],
    cta: "Become a research partner",
  },
  {
    id: "ongoing",
    icon: Repeat,
    need: "I need recurring research support",
    model: "Long-Term Service Partnership",
    summary: "Ongoing analysis, consulting or reserved capacity across a portfolio of work.",
    next: ["Describe recurring needs", "Agree a service model", "Reserved capacity"],
    cta: "Discuss ongoing support",
  },
];

const NeedPicker = () => {
  const [active, setActive] = useState(0);
  const o = options[active];

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-10 items-stretch">
      <div className="flex flex-col gap-2.5">
        {options.map((opt, i) => {
          const Icon = opt.icon;
          const isActive = i === active;
          return (
            <button
              key={opt.id}
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              className={`flex items-center gap-4 text-left rounded-2xl border px-4 py-3.5 transition-all ${
                isActive ? "border-magenta bg-magenta-tint shadow-sm" : "border-gray-200/80 bg-white hover:border-magenta/40"
              }`}
            >
              <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${isActive ? "bg-magenta text-white" : "bg-mist text-magenta-dark"}`}>
                <Icon size={19} />
              </span>
              <span className="font-medium text-plum">{opt.need}</span>
              <span className={`ml-auto w-4 h-4 shrink-0 rounded-full border-2 ${isActive ? "border-magenta bg-magenta shadow-[inset_0_0_0_3px_white]" : "border-gray-300"}`} />
            </button>
          );
        })}
      </div>

      <div
        key={o.id}
        className="rounded-3xl bg-linear-to-br from-plum via-plum-soft to-magenta-dark p-7 md:p-9 text-white flex flex-col"
        style={{ animation: "word-in 0.4s ease both" }}
      >
        <p className="text-xs font-bold tracking-widest uppercase text-lime">Recommended engagement</p>
        <h3 className="mt-2 text-2xl font-semibold">{o.model}</h3>
        <p className="mt-3 text-white/75 leading-relaxed">{o.summary}</p>
        <ol className="mt-6 space-y-3">
          {o.next.map((n, i) => (
            <li key={n} className="flex items-center gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full border border-lime/50 text-lime text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-white/90 text-[15px]">{n}</span>
            </li>
          ))}
        </ol>
        <Link
          to={`/contact?type=${o.id}`}
          className="mt-8 self-start inline-flex items-center gap-2 bg-lime text-plum font-semibold text-sm px-6 py-3 rounded-full hover:brightness-95 transition"
        >
          {o.cta} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
};

export default NeedPicker;
