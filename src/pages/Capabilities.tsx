import { Dna, Layers, ShieldAlert, Microscope, Atom, BrainCircuit, Code2, FileText } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";

const capabilities = [
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
        <>
          <p>
            GSC brings together scientific and computational capabilities to support research questions
            across the life sciences.
          </p>
          <p>
            Our approach begins with the question being investigated, the data or materials available, the
            intended application, and the evidence needed to support a useful conclusion.
          </p>
        </>
      }
    />

    <Section>
      <SectionHeading eyebrow="Capability areas" title="The kinds of problems we help solve" />
      <div className="grid md:grid-cols-2 gap-5">
        {capabilities.map(({ icon: Icon, title, text, note }) => (
          <div key={title} className="border border-gray-200/80 rounded-2xl p-6 md:p-8 flex gap-5">
            <span className="w-11 h-11 shrink-0 rounded-xl bg-teal-tint text-teal-dark flex items-center justify-center">
              <Icon size={20} />
            </span>
            <div>
              <h3 className="text-navy font-semibold text-lg leading-snug mb-2">{title}</h3>
              <p className="text-muted text-[15px] leading-relaxed">{text}</p>
              {note && (
                <p className="mt-3 text-sm text-navy/80 leading-relaxed border-l-2 border-teal pl-3">{note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
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
