import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CheckList, CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { pathways } from "../data/site";

const models = [
  {
    title: "Contract Research Partnerships",
    text: "Engage GSC to undertake a defined research scope, work package, or technical assignment under agreed commercial and delivery terms.",
  },
  {
    title: "Subcontracting & Project Delivery",
    text: "If your organization has secured a project and needs additional scientific or computational capacity, we can discuss an appropriate subcontracting or delivery arrangement.",
  },
  {
    title: "International Research Collaborations",
    text: "We welcome discussions with organizations seeking collaborators for biotechnology, genomics, computational biology, scientific software, and related research initiatives.",
  },
  {
    title: "Scientific & Technical Consulting",
    text: "Engage our capabilities to assess research questions, develop approaches, evaluate technical options, or support project planning.",
  },
  {
    title: "Long-Term Service Partnerships",
    text: "For organizations with recurring research requirements, we can explore ongoing service arrangements, reserved capacity, or a portfolio of defined work packages.",
  },
  {
    title: "Project Origination & Collaboration",
    text: "We are open to working with professionals and organizations that can identify suitable research opportunities, establish client relationships, and coordinate projects through GSC under clearly defined responsibilities and commercial terms.",
  },
];

const enquiryChecklist = [
  "A brief description of the organization and project.",
  "The scientific or technical problem to be addressed.",
  "The expected scope and deliverables.",
  "The proposed timeline and available budget, if known.",
  "The expertise, resources, or delivery capacity required.",
  "Any relevant contracting, confidentiality, or compliance requirements.",
];

const Partner = () => (
  <>
    <PageHero
      eyebrow="Partner With GSC"
      title="The Right Scientific Partner for Your Next Project"
      intro={
        <>
          <p>
            GSC works with organizations seeking a research execution partner, scientific consultant,
            specialist technical team, or long-term collaborator.
          </p>
          <p>
            We welcome enquiries from organizations with defined research objectives, existing contracts
            requiring additional expertise, or new opportunities that need a capable scientific and technical
            partner.
          </p>
        </>
      }
    />

    <Section>
      <SectionHeading eyebrow="Partnership models" title="Choose the arrangement that fits your work" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {models.map((m) => (
          <div key={m.title} className="border border-gray-200/80 rounded-2xl p-6 md:p-7">
            <h3 className="text-plum font-semibold text-lg leading-snug mb-2">{m.title}</h3>
            <p className="text-muted text-[15px] leading-relaxed">{m.text}</p>
          </div>
        ))}
      </div>
    </Section>

    <Section tone="mist">
      <SectionHeading eyebrow="Start the right conversation" title="Five ways to begin an engagement" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {pathways.map((p) => (
          <Link
            key={p.id}
            to={`/contact?type=${p.id}`}
            className="group bg-white border border-gray-200/80 rounded-2xl p-5 flex flex-col hover:border-magenta/50 hover:shadow-lg hover:shadow-plum/5 transition-all"
          >
            <h3 className="text-plum font-semibold leading-snug mb-2">{p.title}</h3>
            <p className="text-muted text-sm leading-relaxed flex-1">{p.text}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-magenta-dark text-sm font-medium">
              Start <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </Section>

    <Section>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <SectionHeading
          eyebrow="What to include in a partnership enquiry"
          title="Help us assess your opportunity quickly"
          intro={
            <p>
              All engagements remain subject to feasibility assessment, appropriate contracting, and mutual
              agreement on responsibilities and commercial terms.
            </p>
          }
        />
        <div className="bg-mist rounded-3xl p-6 md:p-8">
          <CheckList items={enquiryChecklist} />
        </div>
      </div>
    </Section>

    <CtaBand
      title="Let's discuss how we can work together"
      primary={{ to: "/contact?type=partner", label: "Submit a Partnership Enquiry" }}
      secondary={{ to: "/contact?type=subcontracting", label: "Discuss Subcontracting" }}
    />
  </>
);

export default Partner;
