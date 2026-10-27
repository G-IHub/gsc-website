import { HelpCircle, Brain, Cpu, Workflow, PackageCheck, ShieldCheck, ClipboardCheck, Users, Lock, Lightbulb, RefreshCw, Wrench, MessagesSquare, ListChecks, Handshake } from "lucide-react";
import { CtaBand, Eyebrow, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";
import { Accordion } from "../components/interactive";
import TeamSection from "../components/TeamSection";

const principleIcons = [ShieldCheck, ClipboardCheck, Users, Lock, Lightbulb, RefreshCw];

const modes = [
  { icon: Wrench, label: "Deliver a defined technical service" },
  { icon: MessagesSquare, label: "Advise on a research challenge" },
  { icon: ListChecks, label: "Manage an agreed workstream" },
  { icon: Handshake, label: "Partner from design to delivery" },
];

const principles = [
  {
    title: "Scientific Integrity",
    text: "We value appropriate methodologies, transparent analytical reasoning, accurate reporting, and responsible interpretation of findings.",
  },
  {
    title: "Accountability",
    text: "We define project scope, responsibilities, milestones, and deliverables before execution.",
  },
  {
    title: "Collaboration",
    text: "We work constructively with clients, researchers, technical specialists, and institutional partners.",
  },
  {
    title: "Confidentiality",
    text: "We respect contractual confidentiality, data-handling requirements, and the protection of client information.",
  },
  {
    title: "Practical Innovation",
    text: "We pursue solutions that address real scientific and operational needs.",
  },
  {
    title: "Continuous Improvement",
    text: "We use project experience, technical evaluation, and feedback to improve how research work is performed and delivered.",
  },
];

const About = () => (
  <>
    <PageHero
      eyebrow="About Genomac Services & Consult"
      title="Turning Scientific Expertise into Executable Projects"
      intro={
        <p>
          The research and scientific consulting arm of Genomac Holdings, helping organizations plan,
          coordinate and execute scientific and technical projects.
        </p>
      }
    />

    {/* Why GSC exists: the gap, drawn as a flow */}
    <Section>
      <Reveal>
        <SectionHeading
          center
          eyebrow="Why GSC exists"
          title="Bridging the gap between research questions and delivered work"
        />
      </Reveal>
      <div className="grid md:grid-cols-[1fr_auto_1.3fr_auto_1fr] items-center gap-4 md:gap-3">
        <Reveal>
          <div className="rounded-2xl border border-gray-200/80 p-6 text-center">
            <HelpCircle size={28} className="mx-auto text-magenta-dark mb-3" />
            <p className="font-semibold text-plum">Your research question</p>
            <p className="text-sm text-muted mt-1">An idea, objective or challenge</p>
          </div>
        </Reveal>
        <div className="hidden md:block w-16 h-0.5 bg-linear-to-r from-gray-200 to-magenta" style={{ animation: "node-pulse 2.4s ease-in-out infinite" }} />
        <Reveal delay={150}>
          <div className="rounded-3xl bg-linear-to-br from-plum via-plum-soft to-magenta-dark p-6 text-white">
            <p className="text-xs font-bold tracking-widest uppercase text-lime text-center mb-4">GSC brings</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                [Brain, "Scientific knowledge"],
                [Cpu, "Computational methods"],
                [Workflow, "Technical development"],
                [PackageCheck, "Project execution"],
              ].map(([Icon, label], i) => {
                const I = Icon as typeof Brain;
                return (
                  <div key={String(label)} className="rounded-xl bg-white/10 border border-white/10 p-3 text-center" style={{ animation: "node-pulse 3s ease-in-out infinite", animationDelay: `${i * 0.4}s` }}>
                    <I size={18} className="mx-auto text-lime mb-1.5" />
                    <span className="text-xs font-medium">{String(label)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
        <div className="hidden md:block w-16 h-0.5 bg-linear-to-r from-magenta to-lime" style={{ animation: "node-pulse 2.4s ease-in-out infinite", animationDelay: "1.2s" }} />
        <Reveal delay={300}>
          <div className="rounded-2xl border-2 border-lime bg-lime/10 p-6 text-center">
            <PackageCheck size={28} className="mx-auto text-plum mb-3" />
            <p className="font-semibold text-plum">Clearly defined, delivered work</p>
            <p className="text-sm text-muted mt-1">Scoped, executed, documented</p>
          </div>
        </Reveal>
      </div>
    </Section>

    <Section tone="mist">
      <div className="grid md:grid-cols-2 gap-5">
        <Reveal>
          <div className="h-full bg-linear-to-br from-plum to-plum-soft rounded-3xl p-8 md:p-10">
            <Eyebrow light>Our mission</Eyebrow>
            <p className="text-white text-lg md:text-xl leading-relaxed font-medium">
              To make scientific expertise, research execution, and technical innovation accessible to
              organizations through reliable consulting, collaborative research, and project-based services.
            </p>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="h-full bg-white border border-gray-200/80 rounded-3xl p-8 md:p-10">
            <Eyebrow>Our vision</Eyebrow>
            <p className="text-plum text-lg md:text-xl leading-relaxed font-medium">
              To become a trusted international research and scientific consulting partner, connecting
              organizations with the expertise, capabilities, and execution capacity needed to advance
              scientific discovery and innovation.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>

    <Section>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        <Reveal>
          <SectionHeading
            eyebrow="What we do"
            title="Research, consulting, technology and delivery"
            intro={<p>Our engagement model is flexible. Depending on what you need, we:</p>}
          />
          <div className="grid sm:grid-cols-2 gap-3 -mt-4">
            {modes.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-mist p-4">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-plum text-lime flex items-center justify-center">
                  <Icon size={17} />
                </span>
                <span className="text-sm font-medium text-plum">{label}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={150}>
          <Eyebrow>More about GSC</Eyebrow>
          <Accordion
            items={[
              {
                title: "What we support",
                body: "Scientific problem-solving, research design, bioinformatics, computational analysis, biotechnology consulting, scientific software development, and coordination of specialist research teams.",
              },
              {
                title: "Our relationship with Genomac Holdings",
                body: (
                  <>
                    <p>
                      GSC is part of Genomac Holdings, a multidisciplinary innovation and development organization
                      focused on biotechnology, healthcare, research, and technology.
                    </p>
                    <p className="mt-2">
                      The resources engaged in any project depend on its scope, requirements, and approved
                      arrangements. GSC is the platform through which scientific and technical engagements are
                      delivered to external clients.
                    </p>
                  </>
                ),
              },
              {
                title: "Our approach",
                body: "We do not assume every client needs the same solution. We start with the problem, then shape an engagement to fit its complexity, budget, resources and intended outcomes — clearly scoped, technically grounded and professionally managed.",
              },
            ]}
          />
        </Reveal>
      </div>
    </Section>

    <TeamSection />

    <Section tone="mist">
      <Reveal>
        <SectionHeading center eyebrow="Our working principles" title="How we conduct every engagement" />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {principles.map((p, i) => {
          const Icon = principleIcons[i];
          return (
            <Reveal key={p.title} delay={(i % 3) * 100}>
              <div className="group h-full bg-white border border-gray-200/80 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-plum/5 hover:border-magenta/40 transition-all">
                <span className="w-11 h-11 rounded-xl bg-magenta-tint text-magenta-dark flex items-center justify-center mb-4 group-hover:bg-magenta group-hover:text-white transition-colors">
                  <Icon size={20} />
                </span>
                <h3 className="text-plum font-semibold mb-1.5">{p.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{p.text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>

    <CtaBand
      title="Work with GSC"
      text={<p>Tell us about your research question or technical challenge and we will discuss how we can help.</p>}
      primary={{ to: "/contact", label: "Work With GSC" }}
      secondary={{ to: "/services", label: "Explore Our Services" }}
    />
  </>
);

export default About;
