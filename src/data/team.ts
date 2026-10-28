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
