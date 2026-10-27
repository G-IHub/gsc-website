import { FlaskConical, Pill, GraduationCap, UserRound, Cpu, HeartPulse, Sprout, HandHeart } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";

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

const Industries = () => (
  <>
    <PageHero
      eyebrow="Industries & Partners"
      title="Research Capabilities for Organizations Advancing Science"
      intro={
        <p>
          GSC works to support organizations that need additional scientific expertise, computational
          capacity, research coordination, or technical execution.
        </p>
      }
    />

    <Section>
      <SectionHeading eyebrow="Who we work with" title="How GSC supports each type of organization" />
      <div className="grid sm:grid-cols-2 gap-5">
        {industries.map(({ icon: Icon, title, text }) => (
          <div key={title} className="border border-gray-200/80 rounded-2xl p-6 md:p-7 hover:border-magenta/40 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-plum text-lime flex items-center justify-center mb-5">
              <Icon size={20} />
            </span>
            <h3 className="text-plum font-semibold text-lg leading-snug mb-2">{title}</h3>
            <p className="text-muted text-[15px] leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section tone="mist">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <SectionHeading
          eyebrow="Partnership models"
          title="Ways to engage GSC"
          intro={
            <p>
              We welcome discussions about the requirements, responsibilities, and deliverables of
              prospective engagements.
            </p>
          }
        />
        <div className="flex flex-wrap gap-3">
          {models.map((m) => (
            <span key={m} className="bg-white border border-gray-200 text-plum text-sm font-medium px-4 py-2.5 rounded-full">
              {m}
            </span>
          ))}
        </div>
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
