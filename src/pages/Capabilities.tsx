import { Dna, Layers, ShieldAlert, Microscope, Atom, BrainCircuit, Code2, FileText } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";
import { Explorer } from "../components/interactive";
import { serviceVisuals } from "../components/home/ServiceVisuals";

// Which lab animation illustrates each capability
const visualFor: Record<string, string> = {
  "Genomics & Molecular Biology": "bioinformatics",
  "Bioinformatics & Omics Analysis": "bioinformatics",
  "Antimicrobial Resistance Research": "consulting",
  "Cancer Genomics & Computational Oncology": "contract-research",
  "Drug Discovery & Molecular Modelling": "drug-discovery",
  "AI & Machine Learning for Biology": "ai-software",
  "Scientific Software & Research Automation": "ai-software",
  "Research Documentation & Reporting": "contract-research",
};

const capabilities: { icon: typeof Dna; title: string; text: string; note?: string }[] = [
  {
    icon: Dna,
    title: "Genomics & Molecular Biology",
    text: "We support appropriate genomic and molecular research workflows, including sequence analysis, genome comparison, variant-related investigations, gene annotation, and interpretation of biological datasets.",
  },
  {
    icon: Layers,
    title: "Bioinformatics & Omics Analysis",
    text: "We develop and apply computational workflows for biological sequence data and relevant omics datasets. Depending on the project, these may include quality assessment, sequence alignment, phylogenetics, comparative analysis, functional characterization, and multi-omics integration.",
  },
  {
    icon: ShieldAlert,
    title: "Antimicrobial Resistance Research",
    text: "We support computational investigations involving antimicrobial resistance determinants, virulence-associated genes, microbial genomes, and related genomic surveillance questions.",
    note: "Project design accounts for reference databases, analytical thresholds, dataset quality, limitations, and appropriate interpretation of findings.",
  },
  {
    icon: Microscope,
    title: "Cancer Genomics & Computational Oncology",
    text: "We support computational research into cancer-associated genomic variation, mutation patterns, molecular targets, and other relevant biological features, subject to data availability and project requirements.",
  },
  {
    icon: Atom,
    title: "Drug Discovery & Molecular Modelling",
    text: "We undertake suitable computational investigations involving molecular docking, candidate screening, protein and peptide analysis, and natural-product research.",
    note: "Computational findings are interpreted within the limitations of the methods used and are not presented as proof of biological activity or clinical efficacy without appropriate experimental evidence.",
  },
  {
    icon: BrainCircuit,
    title: "AI & Machine Learning for Biology",
    text: "We help develop and evaluate computational approaches for biological data analysis, prediction, prioritization, and research-tool development.",
    note: "The methods selected depend on the research objective, dataset quality, validation requirements, and intended use.",
  },
  {
    icon: Code2,
    title: "Scientific Software & Research Automation",
    text: "We can develop computational applications, web-based research tools, analytical pipelines, and automation workflows designed around defined research needs.",
  },
  {
    icon: FileText,
    title: "Research Documentation & Reporting",
    text: "Where included in the agreed scope, deliverables may include technical reports, methods documentation, analytical outputs, reproducible code, visualizations, workflow documentation, and presentations.",
  },
];

const Capabilities = () => (
  <>
    <PageHero
      eyebrow="Research & Technical Capabilities"
      title="Scientific Questions. Appropriate Methods. Clear Deliverables."
      intro={
        <p>
          Scientific and computational capabilities across the life sciences, matched to the question,
          the data and the evidence you need.
        </p>
      }
    />

    {/* Our approach as a flow */}
    <section className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
        {["The question", "Available data", "Intended application", "Evidence needed"].map((t, i) => (
          <Reveal key={t} delay={i * 120}>
            <div className="relative rounded-2xl bg-mist p-4 text-center">
              <span className="block text-[11px] font-bold tracking-widest uppercase text-magenta-dark mb-1">Step {i + 1}</span>
              <span className="text-sm font-semibold text-plum">{t}</span>
              {i < 3 && <span className="hidden md:block absolute top-1/2 -right-3 w-3 h-0.5 bg-magenta" />}
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    <Section>
      <Reveal>
        <SectionHeading eyebrow="Capability areas" title="The kinds of problems we help solve" intro={<p>Select an area to explore it.</p>} />
      </Reveal>
      <Explorer
        items={capabilities}
        renderPanel={(c) => {
          const Visual = serviceVisuals[visualFor[c.title] ?? "bioinformatics"];
          return (
            <div className="rounded-3xl border border-gray-200/80 p-4 sm:p-5">
              <div className="h-48 sm:h-56">
                <Visual />
              </div>
              <div className="px-2 pt-6 pb-2">
                <h3 className="text-plum font-bold text-xl leading-snug">{c.title}</h3>
                <p className="mt-3 text-muted leading-relaxed">{c.text}</p>
                {c.note && (
                  <p className="mt-4 text-sm text-plum/80 leading-relaxed bg-magenta-tint rounded-xl p-4 border-l-4 border-magenta">{c.note}</p>
                )}
              </div>
            </div>
          );
        }}
      />
      <p className="mt-10 text-center text-sm text-muted">
        All work is scoped according to the capabilities and resources available for the engagement.
      </p>
    </Section>

    <CtaBand
      title="Have a scientific question that needs the right method?"
      text={<p>Share the question, the data or materials you have, and the outcome you need. We will assess feasibility and propose an approach.</p>}
      primary={{ to: "/contact?type=consultation", label: "Book a Scientific Consultation" }}
      secondary={{ to: "/services", label: "View Services" }}
    />
  </>
);

export default Capabilities;
