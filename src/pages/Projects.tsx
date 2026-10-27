import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";

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

const Projects = () => (
  <>
    <PageHero
      eyebrow="Projects & Case Studies"
      title="Applying Scientific Expertise to Real Research Challenges"
      intro={
        <>
          <p>
            GSC's project portfolio will showcase selected engagements, research outputs, technical
            developments, and collaborative initiatives that demonstrate our capabilities.
          </p>
          <p>
            Each published case study will explain the problem, the scope of work, the methods used, the
            deliverables produced, and the outcomes supported by the available evidence.
          </p>
        </>
      }
    />

    <Section>
      <SectionHeading
        eyebrow="Research areas we can support"
        title="Portfolio categories"
        intro={
          <p>
            Our capabilities include computational genomics, bioinformatics, antimicrobial resistance
            research, cancer genomics, computational drug discovery, AI-enabled scientific tools, and research
            workflow development. Specific projects and outcomes will be presented as they are completed,
            verified, and approved for publication.
          </p>
        }
      />
      <div className="grid md:grid-cols-2 gap-5">
        {categories.map((c) => (
          <div key={c.title} className="border border-gray-200/80 rounded-2xl p-6 md:p-8">
            <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-teal-dark bg-teal-tint px-2.5 py-1 rounded-full mb-4">
              Case studies coming soon
            </span>
            <h3 className="text-navy font-semibold text-lg mb-2">{c.title}</h3>
            <p className="text-muted text-[15px] leading-relaxed">{c.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        These are portfolio categories, not claims that every listed project has already been completed by
        GSC. For confidential engagements, we may describe the technical problem and our role without
        identifying the client or disclosing protected information.
      </p>
    </Section>

    <Section tone="mist">
      <SectionHeading
        eyebrow="Case study format"
        title="What every published case study includes"
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {caseFormat.map(([title, text], i) => (
          <div key={title} className="bg-white border border-gray-200/80 rounded-2xl p-5">
            <span className="block text-teal-dark font-semibold text-sm mb-2">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="text-navy font-semibold mb-1.5">{title}</h3>
            <p className="text-muted text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </Section>

    <CtaBand
      title="Working on a similar challenge?"
      primary={{ to: "/contact", label: "Discuss a Similar Project" }}
      secondary={{ to: "/capabilities", label: "View Capabilities" }}
    />
  </>
);

export default Projects;
