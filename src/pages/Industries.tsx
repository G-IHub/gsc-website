import { useState } from "react";
import { FlaskConical, Pill, GraduationCap, UserRound, Cpu, HeartPulse, Sprout, HandHeart, Plus } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";
import { ChipCloud } from "../components/interactive";

const industries = [
  {
    icon: FlaskConical,
    title: "Biotechnology & Life Sciences Companies",
    text: "We support research planning, biological data analysis, computational workflows, scientific consulting, and technical development for biotechnology and life sciences projects.",
  },
  {
    icon: Pill,
    title: "Pharmaceutical & Drug Discovery Organizations",
    text: "We provide appropriate computational research, scientific analysis, literature-based investigation, and project support for early-stage discovery and related research activities.",
  },
  {
    icon: GraduationCap,
    title: "Universities & Research Institutions",
    text: "We collaborate on defined research work packages, bioinformatics analysis, research tool development, and other engagements that complement institutional research capacity.",
  },
  {
    icon: UserRound,
    title: "Principal Investigators & Independent Researchers",
    text: "We help researchers address specific technical and computational challenges, develop analysis workflows, and execute agreed components of larger research projects.",
  },
  {
    icon: Cpu,
    title: "Scientific Software & AI Companies",
    text: "We can support the development, testing, evaluation, and integration of scientific workflows and domain-specific research tools.",
  },
  {
    icon: HeartPulse,
    title: "Healthcare & Biomedical Research Organizations",
    text: "We support suitable research and analytical projects involving biological data and scientific investigation, with appropriate attention to data governance and project-specific requirements.",
  },
  {
    icon: Sprout,
    title: "Agriculture & Plant Science Organizations",
    text: "We support plant genomics, comparative analysis, medicinal plant research, and relevant computational investigations.",
  },
  {
    icon: HandHeart,
    title: "Nonprofits, Foundations & Development Organizations",
    text: "We can contribute research execution, scientific analysis, technical capacity development, and project coordination for suitable research initiatives.",
  },
];

const models = [
  "Direct service contracts",
  "Defined subcontracting arrangements",
  "Collaborative research projects",
  "Technical consulting",
  "Longer-term service partnerships",
];

// Card that reveals its detail on click (title-first, detail on demand)
const IndustryCard = ({ icon: Icon, title, text }: (typeof industries)[number]) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className={`group h-full w-full text-left rounded-2xl p-5 md:p-6 border transition-all duration-300 ${
        open
          ? "bg-linear-to-br from-plum via-plum-soft to-magenta-dark border-plum text-white shadow-xl shadow-plum/20"
          : "bg-white border-gray-200/80 hover:border-magenta/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-plum/5"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${open ? "bg-lime text-plum" : "bg-plum text-lime"}`}>
          <Icon size={20} />
        </span>
        <Plus size={18} className={`mt-1 shrink-0 transition-transform duration-300 ${open ? "rotate-45 text-lime" : "text-muted"}`} />
      </span>
      <h3 className={`mt-4 font-semibold leading-snug ${open ? "text-white" : "text-plum"}`}>{title}</h3>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"}`}>
        <p className="overflow-hidden text-sm leading-relaxed text-white/80">{text}</p>
      </div>
    </button>
  );
};

const Industries = () => (
  <>
    <PageHero
      eyebrow="Industries & Partners"
      title="Research Capabilities for Organizations Advancing Science"
      intro={
        <p>
          Extra scientific expertise, computational capacity, coordination or technical execution — for
          organizations advancing science.
        </p>
      }
    />

    <Section>
      <Reveal>
        <SectionHeading eyebrow="Who we work with" title="How GSC supports each type of organization" intro={<p>Tap a card to see how we help.</p>} />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {industries.map((industry, i) => (
          <Reveal key={industry.title} delay={(i % 4) * 90}>
            <IndustryCard {...industry} />
          </Reveal>
        ))}
      </div>
    </Section>

    <Section tone="plum">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <Reveal>
          <SectionHeading
            light
            eyebrow="Partnership models"
            title="Ways to engage GSC"
            intro={
              <p>
                We welcome discussions about the requirements, responsibilities, and deliverables of
                prospective engagements.
              </p>
            }
          />
        </Reveal>
        <Reveal delay={150}>
          <ChipCloud items={models} tone="dark" />
        </Reveal>
      </div>
    </Section>

    <CtaBand
      title="Exploring a partnership with GSC?"
      primary={{ to: "/partner", label: "Discuss a Partnership" }}
      secondary={{ to: "/contact?type=subcontracting", label: "Discuss Subcontracting" }}
    />
  </>
);

export default Industries;
