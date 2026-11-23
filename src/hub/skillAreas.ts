// Research areas for the skill-coverage view on the Team page. A person counts for an area when any keyword
// appears in what they wrote under "Fields and methods". Add an area here when the service starts a new kind of work.
export type SkillArea = { name: string; keywords: string[]; reviewOnly?: boolean };

export const SKILL_AREAS: SkillArea[] = [
  { name: "Microbiome and 16S", keywords: ["microbiome", "16s", "metagenom", "amplicon"] },
  { name: "AMR and bacterial genomics", keywords: ["amr", "antimicrobial", "resistance", "whole-genome", "wgs", "bacterial"] },
  { name: "Phylogenetics and outbreaks", keywords: ["phylogen", "outbreak", "viral", "virus", "epidemiolog"] },
  { name: "RNA-seq and single-cell", keywords: ["rna-seq", "rnaseq", "single-cell", "scrna", "transcriptom", "expression"] },
  { name: "GWAS and population genetics", keywords: ["gwas", "population genetic", "association stud", "admixture"] },
  { name: "Cancer genomics", keywords: ["cancer", "oncolog", "tumour", "tumor", "variant calling", "somatic"] },
  { name: "Survival analysis and statistics", keywords: ["survival", "statistic", "biostat", "clinical trial", "epidemiology"] },
  { name: "Proteomics and metabolomics", keywords: ["proteom", "metabolom", "mass spec"] },
  { name: "Literature review and editing", keywords: ["literature", "editing", "manuscript", "writing", "systematic review"], reviewOnly: true },
];

export const inArea = (skills: string, area: SkillArea) => {
  const s = skills.toLowerCase();
  return area.keywords.some((k) => s.includes(k));
};
