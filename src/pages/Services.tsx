import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CheckList, CtaBand, PageHero, Section, SectionHeading } from "../components/ui";
import { additionalServices, services } from "../data/site";

const Services = () => (
  <>
    <PageHero
      eyebrow="Services"
      title="Scientific research, analysis and technical delivery"
      intro={
        <p>
          From research planning and bioinformatics to scientific software and project management, GSC
          structures each service around agreed scope, methods and deliverables.
        </p>
      }
    >
      <a
        href="#services-list"
        className="bg-teal hover:bg-teal-dark text-white inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors"
      >
        View the service catalogue
      </a>
    </PageHero>

    {/* Quick index */}
    <section className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto py-4 text-sm">
        {services.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 px-4 py-2 rounded-full bg-mist text-muted hover:text-navy hover:bg-teal-tint transition-colors"
          >
            {String.fromCharCode(65 + i)}. {s.title.split(" & ")[0]}
          </a>
        ))}
      </div>
    </section>

    <Section id="services-list">
      <div className="space-y-6">
        {services.map((s, i) => (
          <article
            key={s.id}
            id={s.id}
            className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12 border border-gray-200/80 rounded-3xl p-6 md:p-10"
          >
            <div>
              <span className="inline-flex w-10 h-10 rounded-xl bg-navy text-teal font-semibold items-center justify-center mb-5">
                {String.fromCharCode(65 + i)}
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-navy leading-tight tracking-tight">{s.title}</h2>
              <p className="mt-3 text-muted leading-relaxed">{s.intro}</p>
              <div className="mt-6 bg-teal-tint rounded-2xl p-4">
                <p className="text-xs font-bold tracking-widest uppercase text-teal-dark mb-1">Commercial model</p>
                <p className="text-navy text-sm leading-relaxed">{s.model}</p>
              </div>
            </div>
            <div className="lg:pt-2">
              <CheckList items={s.items} columns={2} />
              <Link
                to={`/contact?service=${encodeURIComponent(s.title)}`}
                className="mt-8 inline-flex items-center gap-1.5 text-teal-dark font-medium text-sm hover:gap-2.5 transition-all"
              >
                Enquire about this service <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </Section>

    <Section tone="mist">
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-12">
        <SectionHeading
          eyebrow="Additional service areas"
          title="Specialist offerings"
          intro={
            <p>
              These areas are offered when the relevant personnel, facilities, and delivery capacity are in
              place for an engagement. We confirm availability during scoping.
            </p>
          }
        />
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8">
          <CheckList items={additionalServices} columns={2} />
        </div>
      </div>
      <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
        {[
          ["Delivered directly", "Services performed by GSC personnel."],
          ["Delivered through specialists", "Services delivered with GSC's network of approved specialists and collaborators."],
          ["In development", "Capabilities GSC is actively building; discussed case by case."],
        ].map(([title, text]) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-200/80 p-5">
            <p className="text-navy font-semibold mb-1">{title}</p>
            <p className="text-muted leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </Section>

    <CtaBand
      title="Not sure which service fits?"
      text={<p>Book a scientific consultation and we will help define the problem before you commit to a larger engagement.</p>}
      primary={{ to: "/contact?type=consultation", label: "Book a Scientific Consultation" }}
      secondary={{ to: "/contact?type=proposal", label: "Request a Proposal" }}
    />
  </>
);

export default Services;
