import { CtaBand, Eyebrow, PageHero, Section, SectionHeading } from "../components/ui";

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
          GSC is a research and scientific consulting organization within Genomac Holdings, helping
          organizations plan, develop, coordinate, and execute scientific and technical projects across
          biotechnology, life sciences, computational research, and related fields.
        </p>
      }
    />

    <Section>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div>
          <Eyebrow>Why GSC exists</Eyebrow>
          <h2 className="text-2xl md:text-[28px] font-bold text-plum leading-tight tracking-tight">
            Bridging the gap between research questions and delivered work
          </h2>
        </div>
        <div className="space-y-4 text-muted leading-relaxed">
          <p>
            GSC was established around a practical need: organizations often have important research
            questions, promising ideas, or defined project objectives but require additional scientific
            expertise, technical capabilities, project coordination, or implementation support to achieve
            them.
          </p>
          <p className="text-plum font-medium">We aim to bridge that gap.</p>
          <p>
            By combining scientific knowledge, computational methods, technical development, and project
            execution, GSC helps clients move from research requirements to clearly defined work and
            deliverables.
          </p>
        </div>
      </div>
    </Section>

    <Section tone="mist">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-plum rounded-3xl p-8 md:p-10">
          <Eyebrow light>Our mission</Eyebrow>
          <p className="text-white text-lg md:text-xl leading-relaxed font-medium">
            To make scientific expertise, research execution, and technical innovation accessible to
            organizations through reliable consulting, collaborative research, and project-based services.
          </p>
        </div>
        <div className="bg-white border border-gray-200/80 rounded-3xl p-8 md:p-10">
          <Eyebrow>Our vision</Eyebrow>
          <p className="text-plum text-lg md:text-xl leading-relaxed font-medium">
            To become a trusted international research and scientific consulting partner, connecting
            organizations with the expertise, capabilities, and execution capacity needed to advance
            scientific discovery and innovation.
          </p>
        </div>
      </div>
    </Section>

    <Section>
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
        <div>
          <SectionHeading
            eyebrow="What we do"
            title="At the intersection of research, consulting, technology, and project delivery"
            intro={
              <>
                <p>
                  We support clients with scientific problem-solving, research design, bioinformatics,
                  computational analysis, biotechnology consulting, scientific software development, and
                  coordination of specialist research teams.
                </p>
                <p>
                  Our engagement model is flexible. We may provide a defined technical service, advise on a
                  research challenge, manage an agreed project workstream, or collaborate with a client from
                  project design through delivery.
                </p>
              </>
            }
          />
        </div>
        <div>
          <SectionHeading
            eyebrow="Our relationship with Genomac Holdings"
            title="The services and consulting platform of Genomac Holdings"
            intro={
              <>
                <p>
                  GSC is part of Genomac Holdings, a multidisciplinary innovation and development
                  organization focused on biotechnology, healthcare, research, and technology.
                </p>
                <p>
                  This relationship provides an organizational foundation for collaboration across relevant
                  Genomac capabilities and initiatives. The resources engaged in any specific project depend
                  on its scope, requirements, and approved arrangements.
                </p>
                <p>
                  GSC serves as the platform through which appropriate scientific and technical engagements
                  can be developed and delivered to external clients.
                </p>
              </>
            }
          />
        </div>
      </div>
    </Section>

    <Section tone="mist">
      <SectionHeading eyebrow="Our working principles" title="How we conduct every engagement" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {principles.map((p, i) => (
          <div key={p.title} className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-7">
            <span className="block text-magenta-dark font-semibold text-sm mb-3">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-plum font-semibold text-lg mb-2">{p.title}</h3>
            <p className="text-muted text-[15px] leading-relaxed">{p.text}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section>
      <div className="max-w-3xl">
        <SectionHeading
          eyebrow="Our approach"
          title="We do not assume that every client needs the same solution"
          intro={
            <>
              <p>
                We begin by understanding the scientific or technical problem, then develop an engagement
                appropriate to its complexity, budget, resources, and intended outcomes.
              </p>
              <p>
                Our goal is to build lasting client relationships by delivering work that is clearly scoped,
                technically grounded, and professionally managed.
              </p>
            </>
          }
        />
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
