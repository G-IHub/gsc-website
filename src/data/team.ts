// GSC team shown on the About page.
//
// To add someone:
//   1. Put their headshot in  public/team/  (square JPG or PNG, ideally 600x600 or larger), e.g. public/team/jane-doe.jpg
//   2. Copy the example block below into the `team` list and fill it in. Only name, role and bio are required.
//
// The Team section stays hidden on the live site until at least one real person is listed here.

export type TeamMember = {
  name: string;
  role: string;
  bio: string; // 1–2 sentences for the card; the full text also shows in the profile popup
  photo?: string; // e.g. "/team/jane-doe.jpg" — leave out to show their initials instead
  credentials?: string; // e.g. "PhD Molecular Biology, University of Ibadan"
  expertise?: string[]; // short tags, e.g. ["Bioinformatics", "AMR genomics"]
  linkedin?: string; // full URL
  email?: string;
};

/* Example — copy, paste inside the list below and edit:
  {
    name: "Jane Doe",
    role: "Director of Operations & Research Partnerships",
    bio: "Leads research partnerships and project delivery across GSC's contract research engagements.",
    photo: "/team/jane-doe.jpg",
    credentials: "PhD, Biotechnology",
    expertise: ["Research management", "Partnerships"],
    linkedin: "https://www.linkedin.com/in/jane-doe",
    email: "jane@genomacsc.com",
  },
*/

export const team: TeamMember[] = [
  {
    name: "Oluwaseyi Abraham Olawale",
    role: "Chief Executive Officer, GSC · Founder, Genomac Holdings",
    bio: "Oluwaseyi Abraham Olawale is the Founder and CEO of Genomac Holdings, an African biotechnology organization headquartered in Ogbomoso, Nigeria. An experienced bioinformatician and biopreneur, he specializes in multi-omics data analysis and artificial intelligence integration. Alongside his wife, he scaled the company from a zero-capital startup in 2022 into an international research and innovation ecosystem focused on advancing life sciences.",
    photo: "/team/oluwaseyi-olawale.jpg",
    expertise: ["Bioinformatics", "Multi-omics data analysis", "AI integration", "Biotech entrepreneurship"],
    linkedin: "https://www.linkedin.com/in/oluwaseyi-olawale-b9310a82/",
  },
  {
    name: "Adewumi (Joy) Abass",
    role: "Director of Operations & Research Partnerships",
    // The US canine cancer biomarker project is left out until its contract is established
    // and disclosure is authorized (per the GSC website brief).
    bio: [
      "Adewumi (Joy) Abass is an internationally trained research professional and laboratory quality and molecular diagnostics leader, with cross-cutting expertise across plant, animal, and human health research.",
      "He is ICH-GCP certified in Clinical Research, BioReady GMP Fundamentals certified by BioTalent Canada, GCLP Mastery certified by The Global Health Network, Food Safety certified by British Columbia, and certified in Health Equity and Infection Prevention and Control (IPAC) by Public Health Ontario, Canada.",
      "He serves as a Member of the Expert Panel at Empirica Research, India, was invited as a Roundtable Discussion Leader for \"Beyond the Bench\" by the Postgraduate Students' Union at Toronto Metropolitan University, Canada, and is an international collaborator on several clinical research initiatives. At Genomac Services & Consult, he leads operations, research partnerships, business development, and scientific delivery.",
    ].join("\n\n"),
    photo: "/team/adewumi-abass.jpg",
    credentials: "ICH-GCP · GMP (BioTalent Canada) · GCLP · IPAC (Public Health Ontario)",
    expertise: ["Virology", "Microbiology", "GCP / GCLP / GMP", "QA / QC", "SOP / CAPA", "LIMS", "Clinical research"],
    linkedin: "https://www.linkedin.com/in/adewumi-abass-334465331/",
  },
  {
    name: "Blessing Afolabi",
    role: "Director, Genomac Labs",
    bio: [
      "Blessing Afolabi works at the intersection of oncology, genomics, precision medicine, and translational research, with a strong interest in turning scientific knowledge into solutions that improve health outcomes.",
      "As Director of Genomac Labs, Blessing drives initiatives in genomics education, bioinformatics, and precision medicine, helping equip African researchers and healthcare professionals with the skills and access to advance genomic research and healthcare innovation. The role also spans programme execution, strategic partnerships, and operational excellence, with a focus on turning ideas into measurable outcomes.",
      "Blessing's scientific journey includes the Queen Elizabeth Commonwealth Scholarship, which funded MSc studies and research at the Institute of Biochemistry, Molecular Biology and Biotechnology (IBMBB), University of Colombo, graduating as Best Student at both undergraduate (First Class) and postgraduate (Distinction) levels. Fellowship awards followed to the African Genomics Short Course in South Africa (2025) and the African Rare Disease Clinical and Genomic Workshop in Kinshasa, DRC (2026), strengthening experience in genomic analysis, variant interpretation, and clinical genomics.",
      "Beyond research, Blessing is passionate about academic and career excellence, is the author of two books, Academic Excellence Blueprint and Scholarship Application Companion Workbook, and is committed to transforming lives through scientific innovation and social enterprise.",
    ].join("\n\n"),
    photo: "/team/blessing-afolabi.jpg",
    credentials: "MSc (Distinction), IBMBB, University of Colombo · Queen Elizabeth Commonwealth Scholar",
    expertise: ["Oncology", "Genomics", "Precision medicine", "Translational research", "Bioinformatics", "Genomics education"],
    linkedin: "https://www.linkedin.com/in/afolabi-blessing/",
  },
];

// Shown only in local development so the layout can be reviewed before real profiles are added
export const sampleTeam: TeamMember[] = [
  {
    name: "Sample Person",
    role: "Founder & Lead Scientist",
    bio: "Sample profile for preview only — replace with a real team member in src/data/team.ts.",
    credentials: "PhD, Genomics",
    expertise: ["Genomics", "Bioinformatics", "Research strategy"],
    linkedin: "https://www.linkedin.com",
  },
  {
    name: "Another Sample",
    role: "Director of Operations & Research Partnerships",
    bio: "Sample profile for preview only. Leads partnerships and delivery coordination.",
    expertise: ["Partnerships", "Project delivery"],
  },
  {
    name: "Third Sample",
    role: "Computational Biologist",
    bio: "Sample profile for preview only. Builds analysis pipelines and AI-enabled research tools.",
    expertise: ["Pipelines", "Machine learning", "AMR"],
  },
];
