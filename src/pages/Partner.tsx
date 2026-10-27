import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ClipboardCheck, Network, Globe2, Lightbulb, Repeat, Compass } from "lucide-react";
import { CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";
import { Explorer } from "../components/interactive";
import NeedPicker from "../components/home/NeedPicker";

const models = [
  {
    icon: ClipboardCheck,
    pathway: "proposal",
    title: "Contract Research Partnerships",
    text: "Engage GSC to undertake a defined research scope, work package, or technical assignment under agreed commercial and delivery terms.",
  },
  {
    icon: Network,
    pathway: "subcontracting",
    title: "Subcontracting & Project Delivery",
    text: "If your organization has secured a project and needs additional scientific or computational capacity, we can discuss an appropriate subcontracting or delivery arrangement.",
  },
  {
    icon: Globe2,
    pathway: "partner",
    title: "International Research Collaborations",
    text: "We welcome discussions with organizations seeking collaborators for biotechnology, genomics, computational biology, scientific software, and related research initiatives.",
  },
  {
    icon: Lightbulb,
    pathway: "consultation",
    title: "Scientific & Technical Consulting",
    text: "Engage our capabilities to assess research questions, develop approaches, evaluate technical options, or support project planning.",
  },
  {
    icon: Repeat,
    pathway: "ongoing",
    title: "Long-Term Service Partnerships",
    text: "For organizations with recurring research requirements, we can explore ongoing service arrangements, reserved capacity, or a portfolio of defined work packages.",
  },
  {
    icon: Compass,
    pathway: "partner",
    title: "Project Origination & Collaboration",
    text: "We are open to working with professionals and organizations that can identify suitable research opportunities, establish client relationships, and coordinate projects through GSC under clearly defined responsibilities and commercial terms.",
  },
];

// A checklist visitors can tick while preparing their enquiry
const EnquiryChecklist = () => {
  const [done, setDone] = useState<boolean[]>(() => enquiryChecklist.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div className="bg-mist rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-semibold text-plum">Your enquiry readiness</span>
        <span className="text-magenta-dark font-semibold">
          {count}/{enquiryChecklist.length}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white overflow-hidden mb-5">
        <div className="h-full bg-linear-to-r from-magenta to-lime transition-[width] duration-500" style={{ width: `${(count / enquiryChecklist.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {enquiryChecklist.map((item, i) => (
          <li key={item}>
            <button
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              aria-pressed={done[i]}
              className={`w-full flex gap-3 items-start text-left rounded-xl px-3 py-2.5 transition-colors ${done[i] ? "bg-white" : "hover:bg-white/60"}`}
            >
              <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${done[i] ? "bg-magenta border-magenta text-white" : "border-gray-300"}`}>
                {done[i] && <Check size={13} strokeWidth={3} />}
              </span>
              <span className={`text-[15px] leading-snug ${done[i] ? "text-muted line-through" : "text-ink"}`}>{item}</span>
            </button>
          </li>
        ))}
      </ul>
      {count === enquiryChecklist.length && (
        <Link
          to="/contact?type=partner"
          className="mt-5 inline-flex items-center gap-2 bg-magenta text-white text-sm font-medium px-5 py-2.5 rounded-full"
          style={{ animation: "word-in 0.4s ease both" }}
        >
          You're ready — submit your enquiry <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
};

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
        <p>
          A research execution partner, scientific consultant, specialist team or long-term collaborator —
          for defined objectives, existing contracts or new opportunities.
        </p>
      }
    />

    <Section>
      <Reveal>
        <SectionHeading eyebrow="Partnership models" title="Choose the arrangement that fits your work" intro={<p>Select a model to see how it works.</p>} />
      </Reveal>
      <Explorer
        items={models}
        renderPanel={(m) => {
          const Icon = m.icon;
          return (
            <div className="rounded-3xl bg-linear-to-br from-plum via-plum-soft to-magenta-dark p-7 md:p-10 text-white relative overflow-hidden">
              <Icon size={140} className="absolute -right-6 -bottom-6 text-white/5" />
              <span className="w-12 h-12 rounded-2xl bg-lime text-plum flex items-center justify-center mb-6">
                <Icon size={22} />
              </span>
              <h3 className="text-2xl font-semibold">{m.title}</h3>
              <p className="mt-3 text-white/80 leading-relaxed max-w-lg">{m.text}</p>
              <Link
                to={`/contact?type=${m.pathway}`}
                className="relative mt-8 inline-flex items-center gap-2 bg-lime text-plum font-semibold text-sm px-6 py-3 rounded-full hover:brightness-95 transition"
              >
                Start this conversation <ArrowRight size={15} />
              </Link>
            </div>
          );
        }}
      />
    </Section>

    <Section tone="mist">
      <Reveal>
        <SectionHeading eyebrow="Start the right conversation" title="What do you need?" intro={<p>Choose your situation and we'll show you how to begin.</p>} />
      </Reveal>
      <NeedPicker />
    </Section>

    <Section>
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <Reveal>
          <SectionHeading
            eyebrow="What to include in a partnership enquiry"
            title="Help us assess your opportunity quickly"
            intro={
              <p>
                Tick off what you have ready. All engagements remain subject to feasibility assessment,
                appropriate contracting, and mutual agreement on responsibilities and commercial terms.
              </p>
            }
          />
        </Reveal>
        <Reveal delay={150}>
          <EnquiryChecklist />
        </Reveal>
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
