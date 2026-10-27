import { Link } from "react-router-dom";
import { ArrowRight, Dna, Network, FlaskConical, Cpu, ClipboardList, Code2 } from "lucide-react";
import { Button, CheckList, CtaBand, Eyebrow, Section, SectionHeading } from "../components/ui";
import { capabilitiesList, engagementModels, services } from "../data/site";

const serviceIcons = [FlaskConical, Dna, Network, Cpu, ClipboardList, Code2];

// Home lists the six core services in the order of the brief
const homeServices = [
  services[0],
  services[1],
  services[2],
  {
    id: "ai-software",
    title: "AI-Enabled Scientific Research",
    short:
      "Development and application of computational workflows, research tools, machine-learning approaches, and AI-assisted analytical systems for appropriate scientific use cases.",
  },
  services[5],
  {
    id: "ai-software",
    title: "Scientific Software & Workflow Development",
    short:
      "Development of research-oriented applications, computational pipelines, data-processing workflows, and digital tools for scientific problems.",
  },
];

const partners = [
  "Biotechnology and life sciences companies",
  "Pharmaceutical and drug-discovery organizations",
  "Universities and academic research groups",
  "Independent researchers and principal investigators",
  "Healthcare and biomedical research organizations",
  "Agricultural biotechnology and plant science organizations",
  "Scientific software and AI companies",
  "Research foundations, nonprofits, and development organizations",
  "Companies and research teams seeking contract research or specialist subcontracting",
];

const steps = [
  {
    title: "Understand the Problem",
    text: "We discuss the scientific question, project objectives, available data, constraints, and desired outcomes.",
  },
  {
    title: "Define the Engagement",
    text: "We establish the scope, methodology, deliverables, timeline, budget, responsibilities, and relevant contractual requirements.",
  },
  {
    title: "Assemble the Capabilities",
    text: "We identify the appropriate expertise, tools, collaborators, and resources needed for the engagement.",
  },
  {
    title: "Execute the Project",
    text: "We carry out the agreed work, coordinate delivery, communicate progress, and address technical issues as they arise.",
  },
  {
    title: "Deliver and Review",
    text: "We provide the agreed outputs, documentation, technical reports, code, analytical results, or other deliverables specified in the project agreement.",
  },
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
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold text-white leading-[1.1] tracking-tight">
            Scientific Expertise. Research Execution.{" "}
            <span className="text-lime">Measurable Impact.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-white/75 leading-relaxed max-w-xl">
            We help organizations transform scientific questions, research ideas, and technical
            challenges into structured research projects, actionable insights, and practical solutions.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button to="/contact">Discuss a Project</Button>
            <Button to="/services" variant="light">
              Explore Our Services
            </Button>
          </div>
        </div>

        {/* Concept-to-delivery panel */}
        <div className="bg-white/[0.06] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur">
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-5">
            From concept to delivery
          </p>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex items-center gap-4">
                <span className="w-9 h-9 shrink-0 rounded-full bg-lime/10 border border-lime/40 text-lime text-sm font-semibold flex items-center justify-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-white text-[15px] font-medium">{step.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </header>

    {/* Intro */}
    <Section>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div>
          <Eyebrow>Who we are</Eyebrow>
          <h2 className="text-2xl md:text-[28px] font-bold text-plum leading-tight tracking-tight">
            Your Research Partner from Concept to Delivery
          </h2>
        </div>
        <div className="space-y-4 text-muted leading-relaxed">
          <p>
            Genomac Services &amp; Consult (GSC) provides scientific research, biotechnology consulting,
            bioinformatics, computational analysis, and research project execution support to
            organizations seeking reliable expertise and capable research partners.
          </p>
          <p>
            Scientific projects require more than ideas. They require the right expertise, clear
            methodologies, appropriate resources, coordinated execution, and well-defined deliverables.
            GSC brings these elements together through flexible research and consulting engagements
            tailored to the needs of each client.
          </p>
          <p>
            We work with organizations that need to design research projects, analyze complex biological
            data, develop scientific tools, coordinate specialist teams, or extend their research
            capabilities through external expertise.
          </p>
        </div>
      </div>
    </Section>

    {/* Services */}
    <Section tone="mist">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-12">
        <SectionHeading
          eyebrow="Our services"
          title="Research, analysis and technical delivery under one partner"
        />
        <div className="md:mb-12 shrink-0">
          <Button to="/services" variant="secondary">
            Explore All Services <ArrowRight size={15} />
          </Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 -mt-6 md:-mt-12">
        {homeServices.map((s, i) => {
          const Icon = serviceIcons[i];
          return (
            <Link
              key={s.title}
              to={`/services#${s.id}`}
              className="group bg-white border border-gray-200/80 rounded-2xl p-6 md:p-7 hover:border-magenta/40 hover:shadow-lg hover:shadow-plum/5 transition-all"
            >
              <span className="w-11 h-11 rounded-xl bg-magenta-tint text-magenta-dark flex items-center justify-center mb-5">
                <Icon size={20} />
              </span>
              <h3 className="text-plum font-semibold text-lg leading-snug mb-2">{s.title}</h3>
              <p className="text-muted text-[15px] leading-relaxed">{s.short}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-magenta-dark text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </div>
    </Section>

    {/* Capabilities + partners */}
    <Section>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="Scientific capabilities"
            title="Interconnected scientific and technical disciplines"
          />
          <CheckList items={capabilitiesList} />
          <p className="mt-6 text-sm text-muted leading-relaxed">
            Specific methods, resources, and services are selected according to project objectives,
            available data, required expertise, and technical feasibility.
          </p>
          <div className="mt-6">
            <Link to="/capabilities" className="inline-flex items-center gap-1.5 text-magenta-dark font-medium text-sm hover:gap-2.5 transition-all">
              View research capabilities <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="bg-mist rounded-3xl p-6 md:p-10">
          <SectionHeading
            eyebrow="Who we work with"
            title="Built for organizations that need a dependable technical partner"
          />
          <CheckList items={partners} />
          <div className="mt-6">
            <Link to="/industries" className="inline-flex items-center gap-1.5 text-magenta-dark font-medium text-sm hover:gap-2.5 transition-all">
              Industries &amp; partners <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </Section>

    {/* Engagement models */}
    <Section tone="plum">
      <SectionHeading
        light
        eyebrow="Flexible research engagements"
        title="Every project is different. We structure engagements around the work that needs to be done."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {engagementModels.map((m) => (
          <div key={m.title} className="bg-white/[0.06] border border-white/10 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-2">{m.title}</h3>
            <p className="text-white/65 text-sm leading-relaxed">{m.text}</p>
          </div>
        ))}
      </div>
    </Section>

    {/* How we work */}
    <Section>
      <SectionHeading eyebrow="How we work" title="A clear path from first conversation to delivered outputs" />
      <div className="grid md:grid-cols-5 gap-6">
        {steps.map((step, i) => (
          <div key={step.title} className="relative">
            <span className="block text-magenta-dark font-semibold text-sm mb-3">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="h-0.5 bg-gray-200 mb-5">
              <div className="h-full w-10 bg-magenta"></div>
            </div>
            <h3 className="text-plum font-semibold mb-2">{step.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{step.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <Link to="/how-we-work" className="inline-flex items-center gap-1.5 text-magenta-dark font-medium text-sm hover:gap-2.5 transition-all">
          See our full engagement process <ArrowRight size={15} />
        </Link>
      </div>
    </Section>

    {/* Genomac ecosystem */}
    <Section tone="mist">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <div>
          <Eyebrow>Part of Genomac Holdings</Eyebrow>
          <h2 className="text-2xl md:text-[28px] font-bold text-plum leading-tight tracking-tight">
            A Research and Consulting Partner Built for Collaboration
          </h2>
        </div>
        <div className="space-y-4 text-muted leading-relaxed">
          <p>
            Through its relationship with Genomac Holdings, GSC operates within a broader innovation
            ecosystem focused on biotechnology, healthcare, genomics, research infrastructure, and
            technology.
          </p>
          <p>
            This relationship can support access to relevant capabilities and collaborative
            opportunities, depending on the requirements of each engagement.
          </p>
          <p className="text-plum font-medium">
            We believe effective research partnerships are built on clear expectations, scientific
            integrity, responsible data handling, and reliable execution.
          </p>
        </div>
      </div>
    </Section>

    <CtaBand
      title="Have a Project in Mind?"
      text={
        <>
          <p>
            Whether you are planning a new study, seeking bioinformatics support, developing a scientific
            tool, or looking for a partner to execute a defined research work package, we welcome a
            conversation.
          </p>
          <p>
            Tell us what you are trying to achieve. We will assess the requirements and discuss an
            appropriate engagement model.
          </p>
        </>
      }
      primary={{ to: "/contact", label: "Submit a Project Enquiry" }}
      secondary={{ to: "/partner", label: "Become a Research Partner" }}
    />
  </>
);

export default Home;
