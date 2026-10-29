// Official details — replace the placeholders once confirmed before launch.
export const contact = {
  company: "Genomac Services & Consult (GSC)",
  parent: "A Genomac Holdings Company",
  email: "info@genomacsc.com",
  phone: "+2348077191794",
  phoneDisplay: "+234 807 719 1794",
  website: "https://www.genomacsc.com",
  address: "Genomac Building, Under G, Ogbomoso, Oyo State, Nigeria",
};

// Optional: an endpoint that accepts the enquiry form as JSON (e.g. a form service or API route).
// When empty, the form opens the visitor's email app addressed to contact.email instead.
export const enquiryEndpoint = "/api/enquiry";

export const nav = [
  { label: "About", to: "/about" },
  { label: "Services", to: "/services" },
  { label: "Capabilities", to: "/capabilities" },
  { label: "Industries", to: "/industries" },
  { label: "How We Work", to: "/how-we-work" },
  { label: "Projects", to: "/projects" },
  { label: "Partner", to: "/partner" },
  { label: "Research Clinic", to: "/research-programme" },
];

// The five conversion pathways; each pre-selects the enquiry type on the contact page.
export const pathways = [
  {
    id: "proposal",
    title: "Request a research proposal",
    text: "For clients who already have a defined project, scope, or research question.",
  },
  {
    id: "subcontracting",
    title: "Discuss subcontracting",
    text: "For organizations that have secured contracts and need GSC to deliver part of the work.",
  },
  {
    id: "consultation",
    title: "Book a scientific consultation",
    text: "For organizations that need help defining a research problem before committing to a larger engagement.",
  },
  {
    id: "partner",
    title: "Become a research partner",
    text: "For scientific specialists, research institutions, technology companies, and professionals interested in collaboration.",
  },
  {
    id: "ongoing",
    title: "Discuss ongoing research support",
    text: "For organizations that need recurring analytical work, consulting, or scientific project capacity.",
  },
];

export const services = [
  {
    id: "contract-research",
    title: "Scientific Research & Contract Research",
    short:
      "Research planning, experimental and computational study design, literature-based investigations, data analysis, and coordinated research execution.",
    intro:
      "Support for organizations that need research designed, coordinated, or executed against an agreed scope.",
    items: [
      "Research question development and study planning",
      "Literature reviews and evidence synthesis",
      "Computational and data-driven research",
      "Research work-package execution",
      "Technical documentation and reporting",
      "Coordination of specialist contributors",
    ],
    model: "Fixed-scope projects, milestones or agreed research retainers.",
  },
  {
    id: "bioinformatics",
    title: "Bioinformatics & Computational Biology",
    short:
      "Biological data analysis, genomic and transcriptomic workflows, sequence analysis, comparative genomics, phylogenetics, and computational research support.",
    intro:
      "Computational support for biological datasets, from sequence-level analysis to integrated omics workflows.",
    items: [
      "Genome and sequence analysis",
      "Multiple sequence alignment and phylogenetics",
      "Comparative genomics",
      "Genome annotation and functional analysis",
      "Transcriptomics and multi-omics analysis",
      "Antimicrobial resistance and virulence gene analysis",
      "Reproducible analytical workflows",
      "Interpretation and technical reporting",
    ],
    model: "Analytical work packages, pipeline development and research support.",
  },
  {
    id: "consulting",
    title: "Biotechnology & Life Sciences Consulting",
    short:
      "Scientific advisory, research strategy, technical assessment, feasibility studies, and support for translating scientific questions into executable projects.",
    intro:
      "Scientific and technical guidance for research organizations, companies and innovation teams.",
    items: [
      "Research feasibility assessment",
      "Scientific strategy and project design",
      "Technical literature and evidence reviews",
      "Method and workflow selection",
      "Research planning and prioritization",
      "Evaluation of scientific tools and approaches",
      "Technical advisory for biotechnology projects",
    ],
    model: "Consulting engagements, advisory packages and project-based assignments.",
  },
  {
    id: "drug-discovery",
    title: "Drug Discovery & Computational Therapeutics",
    short:
      "Computational research support for early-stage drug-discovery and therapeutic-development investigations.",
    intro:
      "Computational research support for early-stage drug-discovery and therapeutic-development investigations.",
    items: [
      "Molecular docking and structure-based analysis",
      "Computational screening",
      "Protein and peptide analysis",
      "Natural-products research",
      "Bioactive peptide candidate prioritization",
      "Literature-supported target and candidate assessment",
      "Research workflow development",
    ],
    model: "Defined discovery work packages, computational studies and collaborative research.",
  },
  {
    id: "ai-software",
    title: "AI for Science & Scientific Software Development",
    short:
      "Development of research-oriented applications, computational pipelines, machine-learning approaches, and AI-assisted analytical systems.",
    intro:
      "Building computational tools and workflows that help researchers perform and manage scientific work.",
    items: [
      "AI-enabled research applications",
      "Bioinformatics web tools",
      "Analytical pipeline development",
      "Data-processing automation",
      "Machine-learning workflow implementation",
      "Research dashboards and visualization",
      "Scientific workflow integration",
      "Evaluation and documentation of computational methods",
    ],
    model: "Software development, technical implementation and scoped delivery projects.",
  },
  {
    id: "project-management",
    title: "Research Project Management & Scientific Operations",
    short:
      "Project planning, specialist coordination, milestones, deliverables, technical reporting, and execution oversight.",
    intro:
      "Structured management and coordination for research projects that require multiple contributors, methods, and deliverables.",
    items: [
      "Project scoping and work-package design",
      "Timeline and milestone planning",
      "Research team coordination",
      "Technical progress monitoring",
      "Budget and resource tracking",
      "Quality and documentation oversight",
      "Client reporting and delivery coordination",
    ],
    model: "Project-management work packages and agreed operational support.",
  },
];

export const additionalServices = [
  "Human, animal and plant genomics research",
  "Cancer genomics and computational oncology",
  "Antimicrobial resistance surveillance and genomic epidemiology",
  "Medicinal plant and natural-products research",
  "Agricultural biotechnology and plant bioinformatics",
  "Research data management and reproducible computing",
  "Scientific training and technical capacity development",
  "Research tool prototyping and workflow integration",
];

export const capabilitiesList = [
  "Genomics and molecular biology",
  "Bioinformatics and computational biology",
  "Antimicrobial resistance research and genomic surveillance",
  "Human and plant genomics",
  "Cancer genomics and computational oncology",
  "Molecular modelling and computational drug discovery",
  "Medicinal plant and natural-products research",
  "AI and machine learning for biological research",
  "Scientific software and analytical workflow development",
  "Research data analysis and interpretation",
];

export const engagementModels = [
  {
    title: "Contract Research",
    text: "Engage GSC to undertake an agreed research scope and deliver defined outputs.",
  },
  {
    title: "Scientific Consulting",
    text: "Obtain specialist input for research planning, technical decisions, analysis strategies, and scientific problem-solving.",
  },
  {
    title: "Project-Based Collaboration",
    text: "Combine client expertise with GSC's capabilities to execute a shared research initiative.",
  },
  {
    title: "Subcontracted Research Services",
    text: "Extend an existing research team's capacity through agreed technical or scientific work packages.",
  },
  {
    title: "Technical Development",
    text: "Develop research applications, analytical workflows, and computational tools around defined requirements.",
  },
];

export const serviceTypes = [
  ...services.map((s) => s.title),
  "Other / not sure yet",
];
