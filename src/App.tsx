import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Capabilities from "./pages/Capabilities";
import Industries from "./pages/Industries";
import HowWeWork from "./pages/HowWeWork";
import Projects from "./pages/Projects";
import Partner from "./pages/Partner";
import ResearchProgramme from "./pages/ResearchProgramme";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const titles: Record<string, string> = {
  "/": "Genomac Services & Consult — Scientific Research & Consulting",
  "/about": "About GSC — Genomac Services & Consult",
  "/services": "Services — Genomac Services & Consult",
  "/capabilities": "Research & Technical Capabilities — GSC",
  "/industries": "Industries & Partners — GSC",
  "/how-we-work": "How We Work — GSC",
  "/projects": "Projects & Case Studies — GSC",
  "/partner": "Partner With Us — GSC",
  "/research-programme": "Research-to-Publication Programme — GSC",
  "/contact": "Contact & Request a Proposal — GSC",
};

const SITE = "https://www.genomacsc.com";

const descriptions: Record<string, string> = {
  "/": "Your go-to partner for R&D, contract research, scientific consulting and research execution, from multi-omics data to lab-ready solutions.",
  "/about": "About Genomac Services & Consult, the research and scientific consulting arm of Genomac Holdings, and the team behind it.",
  "/services": "Scientific research, bioinformatics, biotechnology consulting, drug discovery support, AI for science and research project management from GSC.",
  "/capabilities": "Genomics, bioinformatics, AMR research, cancer genomics, molecular modelling and AI for biology: the research and technical capabilities of GSC.",
  "/industries": "How GSC supports biotechnology, pharmaceutical, academic, healthcare, agricultural and nonprofit organizations with research and technical execution.",
  "/how-we-work": "GSC's seven-step engagement process, from first consultation to delivery: scope, proposal, contracting, execution, quality review and follow-up.",
  "/projects": "Selected projects and the case study format from Genomac Services & Consult, published as engagements are completed and approved.",
  "/partner": "Partner with GSC for contract research, subcontracting, international collaborations, consulting and long-term research partnerships.",
  "/research-programme": "Bring a research idea to the GSC Research Clinic. We design, analyse and prepare your study for publication, and you pay when the work is done.",
  "/contact": "Send a project enquiry or request a proposal from Genomac Services & Consult, based in Ogbomoso, Nigeria.",
};

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

// Keep the search and link-sharing tags in step with the page being shown
const updateSeoTags = (path: string) => {
  const known = path in titles;
  const title = titles[path] ?? "Genomac Services & Consult";
  const description = descriptions[path] ?? descriptions["/"];
  const url = `${SITE}${path}`;
  setMeta("name", "description", description);
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", url);
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);
  // Unknown addresses show the 404 page but return a normal status, so keep them out of search results
  setMeta("name", "robots", known ? "index, follow" : "noindex");
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
};

// Scroll to the top on page change, or to #section when the link has one
const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
    document.title = titles[path] ?? "Genomac Services & Consult";
    updateSeoTags(path);
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

const App = () => (
  <>
    <ScrollManager />
    <Navbar />
    <main>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/capabilities" element={<Capabilities />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="/how-we-work" element={<HowWeWork />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/partner" element={<Partner />} />
        <Route path="/research-programme" element={<ResearchProgramme />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </>
);

export default App;
