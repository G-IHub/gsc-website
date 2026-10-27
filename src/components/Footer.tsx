import { Link } from "react-router-dom";
import Logo from "./Logo";
import { contact, nav, services } from "../data/site";

const Footer = () => (
  <footer className="bg-plum text-white/70 px-4 sm:px-6 lg:px-8 pt-16 pb-8">
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 text-sm leading-relaxed max-w-xs">
            Scientific Expertise. Research Execution. Measurable Impact.
          </p>
          <p className="mt-2 text-xs text-white/50">{contact.parent}</p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
          <ul className="space-y-2.5 text-sm">
            {nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Services</h4>
          <ul className="space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.id}>
                <Link to={`/services#${s.id}`} className="hover:text-white transition-colors">
                  {s.title.split(" & ")[0]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm mb-4">Get in touch</h4>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link to="/contact?type=proposal" className="hover:text-white transition-colors">
                Request a proposal
              </Link>
            </li>
            <li>
              <Link to="/contact?type=consultation" className="hover:text-white transition-colors">
                Book a consultation
              </Link>
            </li>
            <li>
              <Link to="/partner" className="hover:text-white transition-colors">
                Become a research partner
              </Link>
            </li>
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="hover:text-white transition-colors">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.address && <li className="text-white/50">{contact.address}</li>}
          </ul>
        </div>
      </div>

      <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-2 justify-between text-xs text-white/45">
        <p>
          © {new Date().getFullYear()} {contact.company}. {contact.parent}.
        </p>
        <p>All engagements are subject to feasibility assessment and agreed contract terms.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
