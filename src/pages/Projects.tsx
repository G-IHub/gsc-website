import { useState } from "react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";
import { serviceVisuals } from "../components/home/ServiceVisuals";

const caseFormat = [
  ["Project Overview", "A concise description of the research or technical challenge."],
  ["The Challenge", "The question, limitation, or problem the project addressed."],
  ["Our Role", "The services, responsibilities, and work packages performed by GSC."],
  ["Our Approach", "The methods, tools, and workflow used."],
  ["Deliverables", "The outputs actually produced, such as analytical reports, computational pipelines, software prototypes, or documented research findings."],
  ["Outcome", "The verified result, with quantitative measures included only where evidence supports them."],
  ["Project Status", "Completed, ongoing, or capability demonstration."],
  ["Acknowledgements", "Client, collaborator, and funding acknowledgements where authorized."],
];

// Portfolio categories only — individual projects are added once verified and approved for publication
const categories = [
  {
    title: "AMR Genomics & Surveillance",
    text: "Computational analysis of microbial genomes, resistance determinants, virulence-associated genes, and genomic relationships.",
  },
  {
    title: "Cancer Genomics & Therapeutic Research",
    text: "Computational investigations involving cancer-associated genomic features, candidate targets, and therapeutic discovery workflows, with computational predictions clearly distinguished from experimentally validated results.",
  },
  {
    title: "AI-Enabled Research Tools",
    text: "Development of research applications, analytical pipelines, and scientific workflows.",
  },
  {
    title: "Contract Research & Scientific Consulting",
    text: "Project engagements involving research design, technical consulting, specialist coordination, or scientific delivery, with GSC's actual role identified in each.",
  },
];

const visualFor: Record<string, string> = {
  "AMR Genomics & Surveillance": "bioinformatics",
  "Cancer Genomics & Therapeutic Research": "drug-discovery",
  "AI-Enabled Research Tools": "ai-software",
  "Contract Research & Scientific Consulting": "project-management",
};

// Interactive anatomy of a case study: pick a field, see where it sits in the document
const CaseBlueprint = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-10 items-start">
      <div className="grid sm:grid-cols-2 gap-2">
        {caseFormat.map(([title], i) => (
          <button
            key={title}
            onClick={() => setActive(i)}
            aria-pressed={active === i}
            className={`flex items-center gap-3 text-left rounded-xl border px-3.5 py-3 text-sm font-medium transition-all ${
              active === i ? "bg-plum border-plum text-white" : "bg-white border-gray-200/80 text-plum hover:border-magenta/40"
            }`}
          >
            <span className={`text-xs font-semibold ${active === i ? "text-lime" : "text-magenta-dark"}`}>{String(i + 1).padStart(2, "0")}</span>
            {title}
          </button>
        ))}
      </div>
      <div className="rounded-3xl bg-white border border-gray-200/80 p-6 md:p-8 shadow-xl shadow-plum/5">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-magenta" />
          <span className="text-xs font-bold tracking-widest uppercase text-muted">Case study · template</span>
        </div>
        <div className="space-y-2.5">
          {caseFormat.map(([title, text], i) => (
            <div
              key={title}
              className={`rounded-xl px-4 transition-all duration-300 ${active === i ? "bg-magenta-tint py-3.5 ring-2 ring-magenta/40" : "py-2"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 rounded-full transition-all ${active === i ? "w-16 bg-magenta" : "w-10 bg-gray-200"}`} />
                <span className={`h-2 rounded-full flex-1 ${active === i ? "bg-magenta/30" : "bg-gray-100"}`} />
              </div>
              {active === i && (
                <div style={{ animation: "word-in 0.35s ease both" }}>
                  <p className="mt-3 text-plum font-semibold text-sm">{title}</p>
                  <p className="text-muted text-sm leading-relaxed">{text}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Projects = () => (
  <>
    <PageHero
      eyebrow="Projects & Case Studies"
      title="Applying Scientific Expertise to Real Research Challenges"
      intro={
        <p>
          Selected engagements, research outputs and technical developments — published as they are
          completed, verified and approved.
        </p>
      }
    />

    <Section>
      <Reveal>
        <SectionHeading
          eyebrow="Research areas we can support"
          title="Portfolio categories"
          intro={<p>Case studies in each area will be added as projects are verified and approved for publication.</p>}
        />
      </Reveal>
      <div className="grid md:grid-cols-2 gap-5">
        {categories.map((c, i) => {
          const Visual = serviceVisuals[visualFor[c.title]];
          return (
            <Reveal key={c.title} delay={(i % 2) * 120}>
              <div className="group h-full border border-gray-200/80 rounded-3xl p-4 sm:p-5 hover:border-magenta/30 hover:shadow-xl hover:shadow-plum/5 transition-all">
                <div className="h-36">
                  <Visual />
                </div>
                <div className="px-2 pt-5 pb-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-magenta-dark bg-magenta-tint px-2.5 py-1 rounded-full mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-magenta" style={{ animation: "node-pulse 1.6s ease-in-out infinite" }} />
                    Case studies coming soon
                  </span>
                  <h3 className="text-plum font-semibold text-lg mb-1.5">{c.title}</h3>
                  <p className="text-muted text-[15px] leading-relaxed">{c.text}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted">
        These are portfolio categories, not claims that every listed project has already been completed by
        GSC. For confidential engagements, we may describe the technical problem and our role without
        identifying the client or disclosing protected information.
      </p>
    </Section>

    <Section tone="mist">
      <Reveal>
        <SectionHeading
          eyebrow="Case study format"
          title="What every published case study includes"
          intro={<p>Select a section to see what it covers.</p>}
        />
      </Reveal>
      <CaseBlueprint />
    </Section>

    <CtaBand
      title="Working on a similar challenge?"
      primary={{ to: "/contact", label: "Discuss a Similar Project" }}
      secondary={{ to: "/capabilities", label: "View Capabilities" }}
    />
  </>
);

export default Projects;
