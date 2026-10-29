import { Link } from "react-router-dom";
import {
  ArrowRight,
  Dna,
  Layers,
  ShieldAlert,
  Leaf,
  Microscope,
  Atom,
  Sprout,
  BrainCircuit,
  Code2,
  BarChart3,
  Target,
  Workflow,
  PackageCheck,
  ShieldCheck,
  Scale,
  Lock,
  Handshake,
} from "lucide-react";
import { Button, CtaBand, Eyebrow, Section, SectionHeading } from "../components/ui";
import { Reveal, RotatingWords } from "../components/motion";
import HeroWorkflow from "../components/home/HeroWorkflow";
import ServicesShowcase from "../components/home/ServicesShowcase";
import Pipeline from "../components/home/Pipeline";
import NeedPicker from "../components/home/NeedPicker";

const sectors = [
  "Biotechnology",
  "Pharmaceutical & drug discovery",
  "Universities & research groups",
  "Principal investigators",
  "Healthcare & biomedical research",
  "Agricultural biotech & plant science",
  "Scientific software & AI",
  "Foundations & nonprofits",
  "Contract research teams",
];

const capabilities = [
  { icon: Dna, label: "Genomics & molecular biology" },
  { icon: Layers, label: "Bioinformatics & computational biology" },
  { icon: ShieldAlert, label: "AMR & genomic surveillance" },
  { icon: Leaf, label: "Human & plant genomics" },
  { icon: Microscope, label: "Cancer genomics & oncology" },
  { icon: Atom, label: "Molecular modelling & drug discovery" },
  { icon: Sprout, label: "Medicinal plants & natural products" },
  { icon: BrainCircuit, label: "AI & machine learning for biology" },
  { icon: Code2, label: "Scientific software & workflows" },
  { icon: BarChart3, label: "Research data analysis" },
];

const pillars = [
  { icon: Target, title: "The right expertise", text: "Specialists matched to your question." },
  { icon: Workflow, title: "Clear methods", text: "Scope and approach agreed up front." },
  { icon: PackageCheck, title: "Defined deliverables", text: "Outputs reviewed against the brief." },
];

const values = [
  { icon: ShieldCheck, label: "Scientific integrity" },
  { icon: Scale, label: "Clear expectations" },
  { icon: Lock, label: "Responsible data handling" },
  { icon: Handshake, label: "Reliable execution" },
];

const Home = () => (
  <>
    {/* Hero */}
    <header className="bg-linear-to-br from-plum via-plum-soft to-magenta-dark relative overflow-hidden pt-36 md:pt-44 pb-20 md:pb-28 px-4 sm:px-6 lg:px-8">
      <div className="absolute -top-48 -right-40 w-150 h-150 rounded-full bg-magenta/20 blur-3xl pointer-events-none"></div>
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      ></div>
      <div className="max-w-6xl mx-auto relative grid lg:grid-cols-[1.25fr_1fr] gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/80 text-xs px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-magenta"></span>
            A Genomac Holdings Company
          </span>
          <h1 className="text-[28px] sm:text-5xl lg:text-[42px] xl:text-[52px] font-semibold text-white leading-[1.1] tracking-tight">
            Your go-to partner
            {/* "for" + the changing phrase share one line that never wraps or reflows */}
            <span className="block whitespace-nowrap">
              for{" "}
              <span className="text-lime">
                <RotatingWords words={["R&D", "contract research", "scientific consulting", "research execution", "innovation"]} />
              </span>
            </span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/75 leading-relaxed max-w-xl">
            From multi-omics data to lab-ready solutions: we design, run and deliver the science, end to
            end.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button to="/contact">Discuss a Project</Button>
            <Button to="/services" variant="light">
              Explore Our Services
            </Button>
          </div>
        </div>

        {/* End-to-end workflow animation */}
        <HeroWorkflow />
      </div>
    </header>

    {/* Sector strip */}
    <div className="bg-plum border-t border-white/10 py-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div className="flex w-max gap-3" style={{ animation: "marquee 40s linear infinite" }}>
        {[...sectors, ...sectors].map((s, i) => (
          <span key={i} className="shrink-0 text-sm text-white/70 border border-white/15 rounded-full px-4 py-1.5">
            {s}
          </span>
        ))}
      </div>
    </div>

    {/* Intro */}
    <Section>
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
        <Reveal>
          <Eyebrow>Who we are</Eyebrow>
          <h2 className="text-2xl md:text-[28px] font-bold text-plum leading-tight tracking-tight">
            Your research partner from concept to delivery
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            Scientific projects need more than ideas. GSC brings the expertise, methods and coordinated
            execution together in flexible engagements built around your work.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-4">
          {pillars.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 120}>
              <div className="h-full rounded-2xl border border-gray-200/80 p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-plum/5 transition-all">
                <span className="w-10 h-10 rounded-xl bg-magenta-tint text-magenta-dark flex items-center justify-center mb-4">
                  <Icon size={19} />
                </span>
                <h3 className="text-plum font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>

    {/* Services */}
    <Section tone="mist">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
        <Reveal>
          <Eyebrow>Our services</Eyebrow>
          <h2 className="text-2xl md:text-[28px] font-bold text-plum leading-tight tracking-tight">
            Research, analysis and technical delivery
          </h2>
        </Reveal>
        <Link to="/services" className="inline-flex items-center gap-1.5 text-magenta-dark font-medium text-sm hover:gap-2.5 transition-all">
          All services <ArrowRight size={15} />
        </Link>
      </div>
      <ServicesShowcase />
    </Section>

    {/* How we work */}
    <section className="bg-linear-to-br from-plum via-plum to-plum-soft py-16 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-magenta/20 blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto relative">
        <SectionHeading light center eyebrow="How we work" title="From first conversation to delivered outputs" />
        <Pipeline />
        <div className="mt-10 text-center">
          <Link to="/how-we-work" className="inline-flex items-center gap-1.5 text-lime font-medium text-sm hover:gap-2.5 transition-all">
            See the full engagement process <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>

    {/* Capabilities */}
    <Section>
      <Reveal>
        <SectionHeading
          center
          eyebrow="Scientific capabilities"
          title="Interconnected disciplines, one research partner"
        />
      </Reveal>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {capabilities.map(({ icon: Icon, label }, i) => (
          <Reveal key={label} delay={(i % 5) * 80}>
            <Link
              to="/capabilities"
              className="group h-full flex flex-col items-start gap-3 rounded-2xl border border-gray-200/80 p-4 hover:border-magenta/50 hover:bg-magenta-tint/50 transition-all"
            >
              <span className="w-10 h-10 rounded-xl bg-plum text-lime flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon size={19} />
              </span>
              <span className="text-sm font-medium text-plum leading-snug">{label}</span>
            </Link>
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Methods and resources are selected according to each project's objectives, data and feasibility.
      </p>
    </Section>

    {/* Engagement picker */}
    <Section tone="mist">
      <Reveal>
        <SectionHeading
          eyebrow="Flexible engagements"
          title="What do you need?"
          intro={<p>Choose your situation and we'll show you how to start.</p>}
        />
      </Reveal>
      <NeedPicker />
    </Section>

    {/* Research-to-Publication Programme */}
    <Section>
      <Reveal>
        <div className="rounded-3xl bg-linear-to-br from-plum via-plum-soft to-magenta-dark p-8 md:p-12 text-white grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <Eyebrow light>Research-to-Publication Programme</Eyebrow>
            <h2 className="text-2xl md:text-[28px] font-semibold leading-tight tracking-tight">
              Got a research idea? Start at the Research Clinic.
            </h2>
            <p className="mt-4 text-white/75 leading-relaxed">
              We help researchers design the study, analyse the data and prepare the manuscript. You lead the
              science, and you pay when the work is done.
            </p>
          </div>
          <div className="md:justify-self-end">
            <Button to="/research-programme">Join the Research Clinic</Button>
          </div>
        </div>
      </Reveal>
    </Section>

    {/* Genomac ecosystem */}
    <Section>
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <Reveal>
          <Eyebrow>Part of Genomac Holdings</Eyebrow>
          <h2 className="text-2xl md:text-[28px] font-bold text-plum leading-tight tracking-tight">
            Built for collaboration
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            GSC works within the wider Genomac ecosystem across biotechnology, healthcare, genomics and
            research infrastructure, drawing on relevant capabilities as each engagement requires.
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3">
          {values.map(({ icon: Icon, label }, i) => (
            <Reveal key={label} delay={i * 100}>
              <div className="flex items-center gap-3 rounded-2xl bg-mist p-4">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-white text-magenta-dark flex items-center justify-center shadow-sm">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-medium text-plum">{label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>

    <CtaBand
      title="Have a project in mind?"
      text={<p>Tell us what you're trying to achieve. We'll assess the requirements and suggest the right engagement.</p>}
      primary={{ to: "/contact", label: "Submit a Project Enquiry" }}
      secondary={{ to: "/partner", label: "Become a Research Partner" }}
    />
  </>
);

export default Home;
