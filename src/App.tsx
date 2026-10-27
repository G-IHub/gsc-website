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
  "/contact": "Contact & Request a Proposal — GSC",
};

// Scroll to the top on page change, or to #section when the link has one
const ScrollManager = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = titles[pathname] ?? "Genomac Services & Consult";
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
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
  </>
);

export default App;
