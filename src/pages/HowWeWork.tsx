import {
  MessagesSquare,
  Crosshair,
  Calculator,
  FileSignature,
  FlaskConical,
  BadgeCheck,
  RefreshCw,
  Target,
  Radio,
  Scale,
  Lock,
  FileCheck2,
  Users,
} from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";
import { ChipCloud } from "../components/interactive";
import Pipeline, { type PipelineStep } from "../components/home/Pipeline";

const steps: PipelineStep[] = [
  {
    icon: MessagesSquare,
    title: "Consult",
    line: "We discuss the research question, business need, intended outcome, available data or materials, constraints, and anticipated timeline.",
    outputs: ["Objectives", "Constraints", "Timeline"],
  },
  {
    icon: Crosshair,
    title: "Scope",
    line: "We establish the work to be performed, the methods to be considered, the required expertise, expected deliverables, and any dependencies.",
    outputs: ["Work plan", "Methods", "Deliverables"],
  },
  {
    icon: Calculator,
    title: "Propose",
    line: "We prepare an appropriate proposal outlining the scope, responsibilities, milestones, estimated costs, timeline, and commercial terms.",
    outputs: ["Proposal", "Milestones", "Budget"],
  },
  {
    icon: FileSignature,
    title: "Contract",
    line: "Before work begins, the parties agree on the contract, confidentiality, intellectual property, data handling, payment terms, and project governance.",
    outputs: ["Contract", "NDA / IP", "Governance"],
  },
  {
    icon: FlaskConical,
    title: "Execute",
    line: "The project is carried out by the appropriate GSC personnel and approved collaborators, with progress and changes communicated through agreed channels.",
    outputs: ["Progress updates", "Issue log", "Change control"],
  },
  {
    icon: BadgeCheck,
    title: "Deliver",
    line: "We review the work against the agreed requirements and provide the specified deliverables and supporting documentation.",
    outputs: ["Quality review", "Deliverables", "Documentation"],
  },
  {
    icon: RefreshCw,
    title: "Follow up",
    line: "Where appropriate, we discuss next steps, additional work packages, improvements, or continuing research and consulting needs.",
    outputs: ["Next steps", "New work packages"],
  },
];

const principleIcons = [Target, Radio, Scale, Lock, FileCheck2, Users];

const principles = [
  ["Defined scope", "Projects begin with an agreed understanding of what will be delivered."],
  ["Transparent communication", "Clients receive updates appropriate to the project's scope and duration."],
  ["Responsible research", "Methods and conclusions are presented with appropriate limitations."],
  ["Confidentiality", "Information is handled in accordance with applicable agreements and project requirements."],
  ["Documented deliverables", "Outputs are specified in advance and reviewed against agreed criteria."],
  ["Flexible collaboration", "We work with clients' existing teams and approved external specialists where suitable."],
];

const HowWeWork = () => (
  <>
    <PageHero
      eyebrow="How We Work"
      title="A Clear Process from Enquiry to Delivery"
      intro={
        <p>
          Every engagement begins with an understanding of the client's objectives and ends with delivery
          against an agreed scope.
        </p>
      }
    />

    <section className="bg-linear-to-br from-plum via-plum to-plum-soft py-16 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-magenta/20 blur-3xl pointer-events-none" />
      <div className="max-w-6xl mx-auto relative">
        <SectionHeading light center eyebrow="The engagement process" title="Seven steps, agreed before work begins" intro={<p>Click any step, or watch it run.</p>} />
        <Pipeline steps={steps} />
      </div>
    </section>

    <Section tone="mist">
      <Reveal>
        <SectionHeading center eyebrow="Our engagement principles" title="What clients can expect from GSC" />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {principles.map(([title, text], i) => {
          const Icon = principleIcons[i];
          return (
            <Reveal key={title} delay={(i % 3) * 100}>
              <div className="group h-full bg-white border border-gray-200/80 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-lg hover:shadow-plum/5 hover:border-magenta/40 transition-all">
                <span className="w-11 h-11 rounded-xl bg-magenta-tint text-magenta-dark flex items-center justify-center mb-4 group-hover:bg-magenta group-hover:text-white transition-colors">
                  <Icon size={20} />
                </span>
                <h3 className="text-plum font-semibold mb-1.5">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{text}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>

    <Section>
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <Reveal>
          <SectionHeading
            eyebrow="Quality, data and confidentiality"
            title="Requirements agreed before execution"
            intro={
              <p>
                No single framework fits every project. The controls and responsibilities for each engagement
                are identified up front and documented in the project agreement.
              </p>
            }
          />
        </Reveal>
        <Reveal delay={150}>
          <div className="rounded-3xl bg-mist p-6 md:p-8">
            <p className="text-xs font-bold tracking-widest uppercase text-magenta-dark mb-4">Addressed per engagement</p>
            <ChipCloud items={["Quality assurance", "Data security", "Reproducibility", "Research ethics", "Regulatory considerations"]} />
          </div>
        </Reveal>
      </div>
    </Section>

    <CtaBand
      title="Ready to start a project discussion?"
      primary={{ to: "/contact", label: "Start a Project Discussion" }}
      secondary={{ to: "/contact?type=proposal", label: "Request a Proposal" }}
    />
  </>
);

export default HowWeWork;
