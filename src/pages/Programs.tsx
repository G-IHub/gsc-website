import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, GraduationCap, Lightbulb } from "lucide-react";
import { CheckList, CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { Reveal } from "../components/motion";

const programs = [
  {
    icon: Lightbulb,
    tag: "Free · one day",
    title: "Research Clinic",
    status: "Dates announced soon",
    text: "A free one-day clinic on publishing genomics and bioinformatics research from public data. Open to all, and designed for researchers in resource-limited settings.",
    points: ["No wet lab needed", "Small-group feedback on your idea", "Optional free feasibility review"],
    primary: { to: "/research-clinic", label: "Visit the clinic" },
    secondary: { to: "/research-clinic#register", label: "Join the list" },
  },
  {
    icon: FlaskConical,
    tag: "For researchers",
    title: "Research-to-Publication Lab",
    status: "Applications open",
    text: "Take a research idea all the way to journal submission. We design the study, run the analysis and prepare the manuscript with you, and you pay when the agreed work is delivered.",
    points: ["Free feasibility review", "Reply within 3–5 working days", "You stay the lead researcher"],
    primary: { to: "/research-to-publication-lab", label: "Visit the Lab" },
    secondary: { to: "/research-to-publication-lab#apply", label: "Submit your research idea" },
  },
  {
    icon: GraduationCap,
    tag: "Internship",
    title: "Internship Programme",
    status: "Enquire for details",
    text: "Gain hands-on experience alongside the GSC team. Get in touch to ask about current openings and how to apply.",
    points: [],
    primary: { to: "/contact", label: "Ask about internships" },
  },
];

const Programs = () => (
  <>
    <PageHero
      eyebrow="Programs"
      title="Programs for researchers and emerging scientists"
      intro={
        <p>
          Beyond client projects, GSC runs programs that help researchers turn ideas into published work and help
          early-career scientists gain practical experience.
        </p>
      }
    />

    <Section>
      <Reveal>
        <SectionHeading eyebrow="Available programs" title="Choose the program that fits you" />
      </Reveal>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={p.title} delay={i * 120}>
              <article className="h-full flex flex-col border border-gray-200/80 rounded-3xl p-6 md:p-8 bg-white hover:border-magenta/30 hover:shadow-xl hover:shadow-plum/5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-plum text-lime flex items-center justify-center">
                    <Icon size={22} />
                  </span>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-magenta-dark bg-magenta-tint px-3 py-1.5 rounded-full">
                    {p.status}
                  </span>
                </div>
                <p className="mt-6 text-xs font-bold tracking-widest uppercase text-muted">{p.tag}</p>
                <h3 className="mt-1 text-xl md:text-2xl font-bold text-plum leading-snug">{p.title}</h3>
                <p className="mt-3 text-muted leading-relaxed">{p.text}</p>
                {p.points.length > 0 && (
                  <div className="mt-5">
                    <CheckList items={p.points} />
                  </div>
                )}
                <div className="mt-auto pt-8">
                  <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                    <Link
                      to={p.primary.to}
                      className="inline-flex items-center justify-center gap-2 bg-magenta hover:bg-magenta-dark text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
                    >
                      {p.primary.label} <ArrowRight size={15} />
                    </Link>
                    {p.secondary && (
                      <Link
                        to={p.secondary.to}
                        className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-plum px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
                      >
                        {p.secondary.label}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-muted">More programs will be added here as they open.</p>
    </Section>

    <CtaBand
      title="Not sure which program fits?"
      text={<p>Tell us about your goals and we will point you to the right place to start.</p>}
      primary={{ to: "/contact?type=consultation", label: "Talk to us" }}
      secondary={{ to: "/research-to-publication-lab", label: "Visit the Lab" }}
    />
  </>
);

export default Programs;
