import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";

const steps = [
  {
    title: "Initial Consultation",
    text: "We discuss the research question, business need, intended outcome, available data or materials, constraints, and anticipated timeline.",
  },
  {
    title: "Scope Definition",
    text: "We establish the work to be performed, the methods to be considered, the required expertise, expected deliverables, and any dependencies.",
  },
  {
    title: "Proposal & Budget",
    text: "We prepare an appropriate proposal outlining the scope, responsibilities, milestones, estimated costs, timeline, and commercial terms.",
  },
  {
    title: "Contracting & Project Setup",
    text: "Before work begins, the parties agree on the applicable contract, confidentiality arrangements, intellectual property terms, data-handling requirements, payment terms, and project governance.",
  },
  {
    title: "Project Execution",
    text: "The project is carried out by the appropriate GSC personnel and approved collaborators. Progress, technical issues, dependencies, and material changes are communicated through agreed channels.",
  },
  {
    title: "Quality Review & Delivery",
    text: "We review the work against the agreed requirements and provide the specified deliverables and supporting documentation.",
  },
  {
    title: "Follow-up & Continued Collaboration",
    text: "Where appropriate, we discuss next steps, additional work packages, improvements, or continuing research and consulting needs.",
  },
];

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

    <Section>
      <SectionHeading eyebrow="The engagement process" title="Seven steps, agreed before work begins" />
      <ol className="relative border-l-2 border-gray-100 ml-4 md:ml-5 space-y-10">
        {steps.map((step, i) => (
          <li key={step.title} className="pl-8 md:pl-10 relative">
            <span className="absolute -left-[19px] md:-left-[21px] top-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-navy text-teal text-sm font-semibold flex items-center justify-center ring-4 ring-white">
              {i + 1}
            </span>
            <p className="text-xs font-bold tracking-widest uppercase text-teal-dark mb-1">Step {i + 1}</p>
            <h3 className="text-navy font-semibold text-lg mb-2">{step.title}</h3>
            <p className="text-muted text-[15px] leading-relaxed max-w-2xl">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>

    <Section tone="mist">
      <SectionHeading eyebrow="Our engagement principles" title="What clients can expect from GSC" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {principles.map(([title, text]) => (
          <div key={title} className="bg-white border border-gray-200/80 rounded-2xl p-6">
            <h3 className="text-navy font-semibold mb-2">{title}</h3>
            <p className="text-muted text-[15px] leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section tone="navy">
      <div className="grid lg:grid-cols-2 gap-10">
        <SectionHeading light eyebrow="Quality, data and confidentiality" title="Requirements identified and agreed before execution" />
        <div className="space-y-4 text-white/75 leading-relaxed">
          <p>
            Quality assurance, data security, reproducibility, research ethics, and regulatory considerations
            are addressed according to the nature of each engagement. Specific controls and responsibilities
            are documented in the applicable project agreements.
          </p>
          <p>
            GSC does not assume that one quality or compliance framework applies to every type of project.
            Requirements are identified and agreed before execution.
          </p>
        </div>
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
